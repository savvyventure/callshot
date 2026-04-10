'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { ESCROW_ABI } from '@/lib/abi';
import { CONTRACTS, STABLECOINS, parseStable, questionIdToBytes32 } from '@/lib/web3';
import { supabase } from '@/lib/supabase';
import { PositionSide } from '@/types';

export type TakePositionState = 'idle' | 'sending' | 'confirming' | 'saving' | 'success' | 'error';

const SIDE_MAP: Record<PositionSide, number> = { YES: 1, NO: 2 };
const CONTRACT_DEPLOYED = CONTRACTS.escrow !== '0x0000000000000000000000000000000000000000';

export function useTakePosition(tokenSymbol: 'USDT' | 'USDC' = 'USDT') {
  const { address } = useAccount();
  const tokenAddress = STABLECOINS[tokenSymbol];

  const [state, setState] = useState<TakePositionState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();

  const takePosition = useCallback(async (
    questionId: string,
    side: PositionSide,
    amount: number,
    entryPrice: number,
  ) => {
    if (!address) return;
    setError(null);
    setTxHash(null);

    try {
      let hash = '0x0';

      if (CONTRACT_DEPLOYED) {
        // On-chain flow — new signature: takePosition(questionId, side, amount, token)
        const bytes32Id = questionIdToBytes32(questionId);
        const amountUnits = parseStable(amount);

        setState('sending');
        const txResult = await writeContractAsync({
          address: CONTRACTS.escrow,
          abi: ESCROW_ABI,
          functionName: 'takePosition',
          args: [bytes32Id, SIDE_MAP[side], amountUnits, tokenAddress],
        });

        hash = txResult;
        setTxHash(hash);

        setState('confirming');
        const { createPublicClient, http } = await import('viem');
        const { polygon } = await import('viem/chains');
        const client = createPublicClient({ chain: polygon, transport: http() });

        const start = Date.now();
        while (Date.now() - start < 60_000) {
          try {
            const receipt = await client.getTransactionReceipt({ hash: txResult });
            if (receipt.status === 'success') break;
            if (receipt.status === 'reverted') throw new Error('Transaction reverted');
          } catch (err: unknown) {
            if (err instanceof Error && err.message === 'Transaction reverted') throw err;
          }
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      // Save position to Supabase
      setState('saving');
      const { error: insertErr } = await supabase.from('positions').insert({
        user_address: address.toLowerCase(),
        question_id: questionId,
        side,
        amount,
        entry_price: entryPrice,
        tx_hash: hash,
      });

      if (insertErr) throw new Error(insertErr.message);

      setState('success');
    } catch (err: unknown) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Position failed');
    }
  }, [address, writeContractAsync, tokenAddress]);

  function reset() {
    setState('idle');
    setError(null);
    setTxHash(null);
  }

  return { takePosition, state, error, txHash, reset };
}
