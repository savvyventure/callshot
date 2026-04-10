'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { ESCROW_ABI } from '@/lib/abi';
import { CONTRACTS, STABLECOINS, parseStable } from '@/lib/web3';

export type WithdrawState = 'idle' | 'withdrawing' | 'confirming' | 'success' | 'error';

export function useWithdraw(tokenSymbol: 'USDT' | 'USDC' = 'USDT') {
  const { address } = useAccount();
  const tokenAddress = STABLECOINS[tokenSymbol];

  const [state, setState] = useState<WithdrawState>('idle');
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const withdraw = useCallback(async (amount: number) => {
    if (!address) return;
    setError(null);

    try {
      setState('withdrawing');
      // New signature: withdraw(token, amount)
      const hash = await writeContractAsync({
        address: CONTRACTS.escrow,
        abi: ESCROW_ABI,
        functionName: 'withdraw',
        args: [tokenAddress, parseStable(amount)],
      });

      setState('confirming');
      const { createPublicClient, http } = await import('viem');
      const { polygon } = await import('viem/chains');
      const client = createPublicClient({ chain: polygon, transport: http() });

      const start = Date.now();
      while (Date.now() - start < 60_000) {
        try {
          const receipt = await client.getTransactionReceipt({ hash });
          if (receipt.status === 'success') { setState('success'); return; }
          if (receipt.status === 'reverted') throw new Error('Transaction reverted');
        } catch (err: unknown) {
          if (err instanceof Error && err.message === 'Transaction reverted') throw err;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      throw new Error('Transaction timed out');
    } catch (err: unknown) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Withdraw failed');
    }
  }, [address, writeContractAsync, tokenAddress]);

  function reset() {
    setState('idle');
    setError(null);
  }

  return { withdraw, state, error, reset };
}
