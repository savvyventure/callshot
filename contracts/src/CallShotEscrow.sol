// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CallShotEscrow v2
 * @notice Holds USDT or USDC for prediction positions and settles payouts.
 *         Accepts any whitelisted stablecoin (6 decimals assumed — USDT, USDC on Polygon).
 *         Positions on a question all use the same token (set by the first bettor).
 */
contract CallShotEscrow is Ownable, ReentrancyGuard {

    // ─── Token whitelist ────────────────────────────────
    mapping(address => bool) public allowedTokens;
    address[] public tokenList;   // for enumeration

    // ─── Platform fee ───────────────────────────────────
    uint256 public feeBps = 200;  // 200 = 2%
    address public treasury;

    // ─── Balances: user → token → amount ────────────────
    mapping(address => mapping(address => uint256)) public balances;

    // ─── Question pools: questionId → token → pool ──────
    mapping(bytes32 => address) public questionToken;     // token locked for this question
    mapping(bytes32 => uint256) public yesPool;
    mapping(bytes32 => uint256) public noPool;

    // ─── Positions: questionId → user → side/amount ─────
    mapping(bytes32 => mapping(address => uint8))   public userSide;    // 1=YES 2=NO 0=none
    mapping(bytes32 => mapping(address => uint256)) public userAmount;

    // ─── Resolution ─────────────────────────────────────
    mapping(bytes32 => bool)   public resolved;
    mapping(bytes32 => uint8)  public outcome;  // 1=YES 2=NO

    // ─── Fee accounting per token ────────────────────────
    mapping(address => uint256) public feesCollected;

    // ─── Events ─────────────────────────────────────────
    event TokenAllowed(address indexed token, bool allowed);
    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event PositionTaken(address indexed user, bytes32 indexed questionId, uint8 side, uint256 amount, address token);
    event QuestionResolved(bytes32 indexed questionId, uint8 outcome, address token);
    event PayoutClaimed(address indexed user, bytes32 indexed questionId, uint256 payout, address token);

    constructor(address _treasury) Ownable(msg.sender) {
        treasury = _treasury;
    }

    // ──────────────────────────────────────────────────────
    // TOKEN MANAGEMENT
    // ──────────────────────────────────────────────────────

    /// @notice Owner adds or removes an accepted stablecoin
    function setTokenAllowed(address token, bool allowed) external onlyOwner {
        require(token != address(0), "Zero address");
        if (allowed && !allowedTokens[token]) {
            tokenList.push(token);
        }
        allowedTokens[token] = allowed;
        emit TokenAllowed(token, allowed);
    }

    // ──────────────────────────────────────────────────────
    // DEPOSITS & WITHDRAWALS
    // ──────────────────────────────────────────────────────

    /// @notice Deposit a whitelisted stablecoin. Caller must approve first.
    function deposit(address token, uint256 amount) external nonReentrant {
        require(allowedTokens[token], "Token not allowed");
        require(amount > 0, "Amount must be > 0");
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Transfer failed");
        balances[msg.sender][token] += amount;
        emit Deposited(msg.sender, token, amount);
    }

    /// @notice Withdraw available balance of a stablecoin.
    function withdraw(address token, uint256 amount) external nonReentrant {
        require(balances[msg.sender][token] >= amount, "Insufficient balance");
        balances[msg.sender][token] -= amount;
        require(IERC20(token).transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, token, amount);
    }

    // ──────────────────────────────────────────────────────
    // POSITIONS
    // ──────────────────────────────────────────────────────

    /**
     * @notice Take a YES/NO position on a question.
     * @param questionId  keccak256 of the Supabase question UUID
     * @param side        1 = YES, 2 = NO
     * @param amount      Amount of stablecoin to commit (6 decimal units)
     * @param token       Token to use — must be whitelisted and match question's token
     */
    function takePosition(bytes32 questionId, uint8 side, uint256 amount, address token)
        external
        nonReentrant
    {
        require(allowedTokens[token], "Token not allowed");
        require(side == 1 || side == 2, "Invalid side");
        require(amount >= 1e6,   "Min 1 USDT/USDC");
        require(amount <= 100e6, "Max 100 USDT/USDC");
        require(!resolved[questionId], "Already resolved");
        require(userSide[questionId][msg.sender] == 0, "Already positioned");
        require(balances[msg.sender][token] >= amount, "Insufficient balance");

        // Lock this question to a single token (set by first bettor)
        if (questionToken[questionId] == address(0)) {
            questionToken[questionId] = token;
        } else {
            require(questionToken[questionId] == token, "Question uses different token");
        }

        balances[msg.sender][token] -= amount;
        userSide[questionId][msg.sender]   = side;
        userAmount[questionId][msg.sender] = amount;

        if (side == 1) {
            yesPool[questionId] += amount;
        } else {
            noPool[questionId]  += amount;
        }

        emit PositionTaken(msg.sender, questionId, side, amount, token);
    }

    // ──────────────────────────────────────────────────────
    // RESOLUTION (admin only — oracle in Phase 2)
    // ──────────────────────────────────────────────────────

    function resolveQuestion(bytes32 questionId, uint8 _outcome) external onlyOwner {
        require(_outcome == 1 || _outcome == 2, "Invalid outcome");
        require(!resolved[questionId], "Already resolved");
        resolved[questionId] = true;
        outcome[questionId]  = _outcome;
        emit QuestionResolved(questionId, _outcome, questionToken[questionId]);
    }

    // ──────────────────────────────────────────────────────
    // CLAIMS
    // ──────────────────────────────────────────────────────

    /// @notice Winners call this after resolution to receive their payout.
    function claimPayout(bytes32 questionId) external nonReentrant {
        require(resolved[questionId], "Not resolved");
        uint8 pos = userSide[questionId][msg.sender];
        require(pos != 0, "No position");
        uint256 amt = userAmount[questionId][msg.sender];
        require(amt > 0, "Already claimed");

        userAmount[questionId][msg.sender] = 0; // CEI: clear before transfer

        address token = questionToken[questionId];

        if (pos == outcome[questionId]) {
            uint256 totalPool   = yesPool[questionId] + noPool[questionId];
            uint256 winningPool = (outcome[questionId] == 1) ? yesPool[questionId] : noPool[questionId];

            uint256 gross  = (amt * totalPool) / winningPool;
            uint256 fee    = (gross * feeBps) / 10_000;
            uint256 net    = gross - fee;

            feesCollected[token]     += fee;
            balances[msg.sender][token] += net;

            emit PayoutClaimed(msg.sender, questionId, net, token);
        } else {
            emit PayoutClaimed(msg.sender, questionId, 0, token);
        }
    }

    // ──────────────────────────────────────────────────────
    // ADMIN
    // ──────────────────────────────────────────────────────

    function withdrawFees(address token) external onlyOwner {
        uint256 amount = feesCollected[token];
        feesCollected[token] = 0;
        require(IERC20(token).transfer(treasury, amount), "Transfer failed");
    }

    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Max 5%");
        feeBps = _feeBps;
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Zero address");
        treasury = _treasury;
    }

    // ──────────────────────────────────────────────────────
    // VIEW HELPERS
    // ──────────────────────────────────────────────────────

    function getQuestionPool(bytes32 questionId)
        external view
        returns (uint256 yes, uint256 no, address token)
    {
        return (yesPool[questionId], noPool[questionId], questionToken[questionId]);
    }

    function getUserPosition(bytes32 questionId, address user)
        external view
        returns (uint8 side, uint256 amount, address token)
    {
        return (userSide[questionId][user], userAmount[questionId][user], questionToken[questionId]);
    }

    function getBalance(address user, address token)
        external view
        returns (uint256)
    {
        return balances[user][token];
    }
}
