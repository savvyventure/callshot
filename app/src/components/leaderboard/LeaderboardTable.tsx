'use client';

import { LeaderboardEntry } from '@/types';
import { formatUSDT, formatAccuracy, shortenAddress } from '@/lib/utils';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  currentAddress?: string;
}

function rankBadge(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}

export function LeaderboardTable({ entries, currentAddress }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-3xl mb-3">🏆</div>
        <p className="text-[--text-dim] text-sm">No one on the board yet. Be the first.</p>
      </div>
    );
  }

  return (
    <div className="border border-[--border] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[3rem_1fr_5rem_5rem_6rem] sm:grid-cols-[3rem_1fr_6rem_6rem_7rem] gap-2 px-4 py-3 bg-[--surface-2] text-xs font-mono text-[--text-muted] uppercase tracking-wider">
        <span>#</span>
        <span>Player</span>
        <span className="text-right">Acc.</span>
        <span className="text-right">Trades</span>
        <span className="text-right">PnL</span>
      </div>

      {/* Rows */}
      {entries.map((entry) => {
        const isYou = currentAddress?.toLowerCase() === entry.address.toLowerCase();
        return (
          <div
            key={entry.address}
            className={`grid grid-cols-[3rem_1fr_5rem_5rem_6rem] sm:grid-cols-[3rem_1fr_6rem_6rem_7rem] gap-2 px-4 py-3.5 border-t border-[--border] items-center transition-colors ${
              isYou ? 'bg-[--accent]/5' : 'hover:bg-[--surface-2]/50'
            }`}
          >
            <span className="text-sm font-mono">{rankBadge(entry.rank)}</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate">
                {entry.username || shortenAddress(entry.address)}
              </span>
              {isYou && (
                <span className="text-[10px] font-mono text-[--accent] bg-[--accent]/10 px-1.5 py-0.5 rounded-full shrink-0">
                  YOU
                </span>
              )}
            </div>
            <span className="text-sm font-mono text-right text-[--text-dim]">
              {entry.accuracy > 0 ? `${Math.round(entry.accuracy)}%` : '—'}
            </span>
            <span className="text-sm font-mono text-right text-[--text-dim]">
              {entry.total_predictions}
            </span>
            <span className={`text-sm font-mono text-right font-bold ${
              entry.total_pnl >= 0 ? 'text-[--accent]' : 'text-[--hot]'
            }`}>
              {entry.total_pnl >= 0 ? '+' : ''}{formatUSDT(entry.total_pnl)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
