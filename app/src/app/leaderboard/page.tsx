'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabase';
import { LeaderboardEntry } from '@/types';
import { Nav } from '@/components/ui/Nav';
import { LeaderboardTable } from '@/components/leaderboard/LeaderboardTable';

export default function LeaderboardPage() {
  const { address } = useAccount();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('leaderboard')
          .select('*')
          .order('total_pnl', { ascending: false })
          .limit(100);
        if (error) throw error;
        setEntries((data || []).map((row: Record<string, unknown>, i: number) => ({
          rank: i + 1,
          address: row.address as string,
          username: row.username as string | null,
          accuracy: row.accuracy as number,
          total_pnl: row.total_pnl as number,
          total_predictions: row.total_predictions as number,
          correct_predictions: row.correct_predictions as number,
        })));
      } catch (err) {
        console.error('Failed to load leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <main className="min-h-screen flex flex-col">
      <Nav />

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 mb-nav sm:mb-0">

        {/* Header */}
        <div className="bg-[--surface] border border-[--border] rounded-2xl p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <h1 className="text-xl font-black tracking-tight">Leaderboard</h1>
              <p className="text-xs text-[--text-muted] mt-0.5">
                Top predictors by profit · Min 5 predictions to qualify
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-[--text-dim]">Loading rankings…</p>
          </div>
        ) : (
          <LeaderboardTable entries={entries} currentAddress={address} />
        )}
      </div>

      <footer className="text-center py-5 border-t border-[--border] text-xs text-[--text-muted] hidden sm:block">
        Verdix © 2026 · Not financial advice · Trade at your own risk
      </footer>
    </main>
  );
}
