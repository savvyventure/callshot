// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CallShotEscrow
 * @notice Holds USDT for prediction positions and settles payouts.
 * @dev MVP contract — intentionally simple. Owner (admin) resolves questions.
 *      Upgrade to oracle-based resolution (UMA/Chainlink) in Phase 2.
 */
contract CallShotEscrow is Ownable, ReentrancyGuard {

    IERC20 public immutable usdt;

    // Platform fee in basis points (200 = 2%)
    uint256 public feeBps = 200;

    // Treasury address for collected fees
    address public treasury;

    // User deposits (available balance not locked in positions)
    mapping(address => uint256) public balances;

    // Question ID => total pool per side
    mapping(bytes32 => uint256) public yesPool;
    mapping(bytes32 => uint256) public noPool;

    // Question ID => user => side (1=YES, 2=NO, 0=none)
    mapping(bytes32 => mapping(address => uint8)) public userSide;
    // Question ID => user => amount
    mapping(bytes32 => mapping(address => uint256)) public userAmount;

    // Question ID => resolved (true/false)
    mapping(bytes32 => bool) public resolved;
    // Question ID => outcome (1=YES, 2=NO)
    mapping(bytes32 => uint8) public outcome;

    // Total fees collected (withdrawable by treasury)
    uint256 public feesCollected;

    // Events
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event PositionTaken(address indexed user, bytes32 indexed questionId, uint8 side, uint256 amount);
    event QuestionResolved(bytes32 indexed questionId, uint8 outcome);
    event PayoutClaimed(address indexed user, bytes32 indexed questionId, uint256 payout);

    constructor(address _usdt, address _treasury) Ownable(msg.sender) {
        usdt = IERC20(_usdt);
        treasury = _treasury;
    }

    // ──────────────────────────────────
    // DEPOSITS & WITHDRAWALS
    // ──────────────────────────────────

    /// @notice Deposit USDT to platform balance. Must approve first.
    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(usdt.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        balances[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
    }

    /// @notice Withdraw available USDT balance to wallet.
    function withdraw(uint256 amount) external nonReentrant {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        require(usdt.transfer(msg.sender, amount), "Transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    // ──────────────────────────────────
    // POSITIONS
    // ──────────────────────────────────

    /// @notice Take a position on a question. Locks USDT from balance.
    /// @param questionId Unique question identifier (hash of card_date + question_index)
    /// @param side 1 = YES, 2 = NO
    /// @param amount USDT to commit
    function takePosition(bytes32 questionId, uint8 side, uint256 amount) external nonReentrant {
        require(side == 1 || side == 2, "Invalid side");
        require(amount >= 1e6, "Min 1 USDT"); // USDT has 6 decimals
        require(amount <= 100e6, "Max 100 USDT");
        require(!resolved[questionId], "Question already resolved");
        require(userSide[questionId][msg.sender] == 0, "Already positioned");
        require(balances[msg.sender] >= amount, "Insufficient balance");

        balances[msg.sender] -= amount;
        userSide[questionId][msg.sender] = side;
        userAmount[questionId][msg.sender] = amount;

        if (side == 1) {
            yesPool[questionId] += amount;
        } else {
            noPool[questionId] += amount;
        }

        emit PositionTaken(msg.sender, questionId, side, amount);
    }

    // ──────────────────────────────────
    // RESOLUTION (Admin only at MVP)
    // ──────────────────────────────────

    /// @notice Resolve a question. Only owner (admin).
    /// @param questionId The question to resolve
    /// @param _outcome 1 = YES won, 2 = NO won
    function resolveQuestion(bytes32 questionId, uint8 _outcome) external onlyOwner {
        require(_outcome == 1 || _outcome == 2, "Invalid outcome");
        require(!resolved[questionId], "Already resolved");

        resolved[questionId] = true;
        outcome[questionId] = _outcome;

        emit QuestionResolved(questionId, _outcome);
    }

    // ──────────────────────────────────
    // CLAIMS
    // ──────────────────────────────────

    /// @notice Winners claim their payout after resolution.
    function claimPayout(bytes32 questionId) external nonReentrant {
        require(resolved[questionId], "Not resolved yet");
        uint8 userPos = userSide[questionId][msg.sender];
        require(userPos != 0, "No position");
        uint256 userAmt = userAmount[questionId][msg.sender];
        require(userAmt > 0, "Already claimed");

        // Clear position (prevent double claim)
        userAmount[questionId][msg.sender] = 0;

        if (userPos == outcome[questionId]) {
            // Winner: gets proportional share of total pool
            uint256 totalPool = yesPool[questionId] + noPool[questionId];
            uint256 winningPool = (outcome[questionId] == 1) ? yesPool[questionId] : noPool[questionId];

            // Payout = (userAmount / winningPool) * totalPool
            uint256 grossPayout = (userAmt * totalPool) / winningPool;

            // Deduct platform fee
            uint256 fee = (grossPayout * feeBps) / 10000;
            uint256 netPayout = grossPayout - fee;

            feesCollected += fee;
            balances[msg.sender] += netPayout;

            emit PayoutClaimed(msg.sender, questionId, netPayout);
        } else {
            // Loser: gets nothing, amount already deducted
            emit PayoutClaimed(msg.sender, questionId, 0);
        }
    }

    // ──────────────────────────────────
    // ADMIN
    // ──────────────────────────────────

    /// @notice Withdraw collected fees to treasury.
    function withdrawFees() external onlyOwner {
        uint256 amount = feesCollected;
        feesCollected = 0;
        require(usdt.transfer(treasury, amount), "Transfer failed");
    }

    /// @notice Update fee (max 5%)
    function setFeeBps(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 500, "Max 5%");
        feeBps = _feeBps;
    }

    /// @notice Update treasury address
    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    // ──────────────────────────────────
    // VIEW HELPERS
    // ──────────────────────────────────

    function getQuestionPool(bytes32 questionId) external view returns (uint256 yes, uint256 no) {
        return (yesPool[questionId], noPool[questionId]);
    }

    function getUserPosition(bytes32 questionId, address user) external view returns (uint8 side, uint256 amount) {
        return (userSide[questionId][user], userAmount[questionId][user]);
    }
}
