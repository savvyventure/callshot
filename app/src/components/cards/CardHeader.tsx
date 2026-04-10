'use client';

import { useEffect, useState } from 'react';
import { formatUSDT } from '@/lib/utils';

interface CardHeaderProps {
  date: string;
  closesAt: string;
  totalVolume: number;
  totalPlayers: number;
  questionCount: number;
}

function useCountdown(target: string) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    function calc() {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) return setTimeLeft('Closed');
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    }
    calc();
    const id = setInterval(calc, 1_000);
    return () => clearInterval(id);
  }, [target]);
  return timeLeft;
}

export function CardHeader({ date, closesAt, totalVolume, totalPlayers, questionCount }: CardHeaderProps) {
  const countdown = useCountdown(closesAt);
  const isClosed = countdown === 'Closed';

  const formatted = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="bg-[--surface] border border-[--border] rounded-2xl overflow-hidden">

      {/* Accent top strip */}
      <div className={`h-0.5 ${isClosed ? 'bg-[--hot]' : 'bg-[--accent]'}`} />

      <div className="p-5 flex flex-col gap-4">
        {/* Date + countdown */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-black tracking-tight">Today&apos;s Card</h1>
            <p className="text-xs text-[--text-muted] mt-0.5 font-mono">{formatted}</p>
          </div>
          <div className={`font-mono font-bold text-sm px-4 py-2 rounded-xl border shrink-0 ${
            isClosed
              ? 'border-[--hot]/30 text-[--hot] bg-[--hot]/8'
              : 'border-[--accent]/30 text-[--accent] bg-[--accent]/8'
          }`}>
            {isClosed ? '🔒 Closed' : countdown}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: totalPlayers, label: 'Players', color: 'var(--accent)' },
            { value: formatUSDT(totalVolume), label: 'Prize Pool', color: 'var(--warm)' },
            { value: questionCount, label: 'Questions', color: 'var(--cool)' },
          ].map(({ value, label, color }) => (
            <div key={label} className="bg-[--surface-2] rounded-xl py-3 text-center">
              <div className="text-lg font-black font-mono" style={{ color }}>{value}</div>
              <div className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wide mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
