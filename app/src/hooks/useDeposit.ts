'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useReadContract } from 'wagmi';
import { ESCROW_ABI, ERC20_ABI } from '@/lib/abi';
import { CONTRACTS, STABLECOINS, parseStable } from '@/lib/web3';

export type DepositState =
  | 'idle'
  | 'approving'
  | 'waiting-approval'
  | 'depositing'
  | 'waiting-deposit'
  | 'success'
  | 'error';

/**
 * Two-step deposit: approve token → deposit to escrow.
 * Supports USDT or USDC (defaults to USDT).
 */
export function useDeposit(tokenSymbol: 'USDT' | 'USDC' = 'USDT') {
  const { address } = useAccount();
  const tokenAddress = STABLECOINS[tokenSymbol];

  const [state, setState] = useState<DepositState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();

  const { writeContractAsync } = useWriteContract();

  const { data: allowanceRaw, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: address ? [address, CONTRACTS.escrow] : undefined,
    query: { enabled: !!address },
  });

  const deposit = useCallback(async (amount: number) => {
    if (!address) return;
    setError(null);

    const amountUnits = parseStable(amount);
    const currentAllowance = (allowanceRaw as bigint) || 0n;

    try {
      // Step 1: Approve if needed
      if (currentAllowance < amountUnits) {
        setState('approving');
        const approveTx = await writeContractAsync({
          address: tokenAddress,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.escrow, amountUnits],
        });

        setState('waiting-approval');
        await waitForTx(approveTx);
        await refetchAllowance();
      }

      // Step 2: Deposit (new signature: deposit(token, amount))
      setState('depositing');
      const depositTx = await writeContractAsync({
        address: CONTRACTS.escrow,
        abi: ESCROW_ABI,
        functionName: 'deposit',
        args: [tokenAddress, amountUnits],
      });

      setTxHash(depositTx);
      setState('waiting-deposit');
      await waitForTx(depositTx);
      setState('success');
    } catch (err: unknown) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Deposit failed');
    }
  }, [address, allowanceRaw, writeContractAsync, refetchAllowance, tokenAddress]);

  function reset() {
    setState('idle');
    setError(null);
    setTxHash(undefined);
  }

  return { deposit, state, error, txHash, reset };
}

async function waitForTx(hash: `0x${string}`, timeout = 60_000) {
  const start = Date.now();
  const { createPublicClient, http } = await import('viem');
  const { polygon } = await import('viem/chains');
  const client = createPublicClient({ chain: polygon, transport: http() });

  while (Date.now() - start < timeout) {
    try {
      const receipt = await client.getTransactionReceipt({ hash });
      if (receipt.status === 'success') return receipt;
      if (receipt.status === 'reverted') throw new Error('Transaction reverted');
    } catch (err: unknown) {
      if (err instanceof Error && err.message === 'Transaction reverted') throw err;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Transaction timed out');
}
