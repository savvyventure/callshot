'use client';

import { useAccount, useReadContract } from 'wagmi';
import { ESCROW_ABI, ERC20_ABI } from '@/lib/abi';
import { CONTRACTS, STABLECOINS, formatStableUnits } from '@/lib/web3';

/**
 * Reads the user's platform balance (deposited in escrow) and wallet balances
 * for both USDT and USDC.
 */
export function useEscrowBalance(tokenSymbol: 'USDT' | 'USDC' = 'USDT') {
  const { address } = useAccount();
  const tokenAddress = STABLECOINS[tokenSymbol];

  // Platform (escrow) balance — new signature: getBalance(user, token)
  const { data: platformRaw, refetch: refetchPlatform, isLoading: loadingPlatform } = useReadContract({
    address: CONTRACTS.escrow,
    abi: ESCROW_ABI,
    functionName: 'getBalance',
    args: address ? [address, tokenAddress] : undefined,
    query: {
      enabled: !!address && CONTRACTS.escrow !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Wallet balance of the selected token
  const { data: walletRaw, refetch: refetchWallet, isLoading: loadingWallet } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const platformBalance = platformRaw ? formatStableUnits(platformRaw as bigint) : 0;
  const walletBalance   = walletRaw   ? formatStableUnits(walletRaw   as bigint) : 0;

  function refetch() {
    refetchPlatform();
    refetchWallet();
  }

  return {
    platformBalance,
    walletBalance,
    isLoading: loadingPlatform || loadingWallet,
    refetch,
  };
}
