'use client';

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabase';

/**
 * Automatically creates a user row in Supabase when a wallet connects.
 * Safe to call multiple times — upserts on conflict.
 */
export function useAutoCreateUser() {
  const { address, isConnected } = useAccount();
  const created = useRef<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address || created.current === address) return;

    async function ensureUser() {
      const addr = address!.toLowerCase();

      const { data, error } = await supabase
        .from('users')
        .select('address')
        .eq('address', addr)
        .single();

      if (error && error.code === 'PGRST116') {
        // Not found — create
        const referralCode = address!.slice(2, 10).toUpperCase();
        await supabase.from('users').insert({
          address: addr,
          referral_code: referralCode,
        });
      }

      created.current = address!;
    }

    ensureUser().catch(console.error);
  }, [address, isConnected]);
}
