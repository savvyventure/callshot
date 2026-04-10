'use client';

import { Question, PositionSide } from '@/types';
import { CATEGORY_CONFIG, formatUSDT, getYesProbability } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  index: number;
  userPosition?: { side: PositionSide; amount: number } | null;
  onTakePosition: (questionId: string, side: PositionSide) => void;
  onChangePosition?: (questionId: string) => void;
  disabled?: boolean;
}

function estimateWin(amount: number, sideVolume: number, totalVolume: number): number {
  if (amount <= 0) return 0;
  const newSide = sideVolume + amount;
  const newTotal = totalVolume + amount;
  return (amount / newSide) * newTotal * 0.98;
}

const PREVIEW = 10;

export function QuestionCard({ question, index, userPosition, onTakePosition, onChangePosition, disabled }: QuestionCardProps) {
  const category = CATEGORY_CONFIG[question.category];
  const yesPct = Math.round(getYesProbability(question.yes_volume, question.no_volume) * 100);
  const noPct = 100 - yesPct;
  const total = question.yes_volume + question.no_volume;
  const isResolved = question.status === 'resolved';
  const isClosed = question.status === 'closed';
  const hasPosition = !!userPosition;

  const yesWin = estimateWin(PREVIEW, question.yes_volume, total);
  const noWin  = estimateWin(PREVIEW, question.no_volume, total);

  const posWin = hasPosition
    ? estimateWin(
        userPosition!.amount,
        userPosition!.side === 'YES' ? question.yes_volume : question.no_volume,
        total,
      )
    : 0;
  const isWinner = isResolved && hasPosition && question.outcome === userPosition!.side;

  return (
    <div className="bg-[--surface] border border-[--border] rounded-2xl overflow-hidden card-lift">

      {/* Top accent line for resolved */}
      {isResolved && (
        <div className={`h-0.5 w-full ${question.outcome === 'YES' ? 'bg-[--accent]' : 'bg-[--hot]'}`} />
      )}

      <div className="p-5 flex flex-col gap-4">

        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-mono font-bold text-[--text-muted]">#{index}</span>
            <span
              className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ background: `${category.color}14`, color: category.color }}
            >
              {category.emoji} {category.label}
            </span>
          </div>
          <div className="shrink-0">
            {isResolved && (
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                question.outcome === 'YES'
                  ? 'bg-[--accent]/15 text-[--accent]'
                  : 'bg-[--hot]/15 text-[--hot]'
              }`}>
                ✓ {question.outcome}
              </span>
            )}
            {isClosed && !isResolved && (
              <span className="text-xs font-mono text-[--warm] bg-[--warm]/12 px-2.5 py-1 rounded-full">
                Closed
              </span>
            )}
            {!isResolved && !isClosed && total > 0 && (
              <span className="text-[10px] font-mono text-[--text-muted]">
                {formatUSDT(total)} pool
              </span>
            )}
          </div>
        </div>

        {/* Question */}
        <p className="text-base sm:text-lg font-bold leading-snug">{question.text}</p>

        {/* Probability bar */}
        <div>
          <div className="flex h-3 rounded-full overflow-hidden gap-px">
            <div
              className="transition-all duration-700"
              style={{
                width: `${yesPct}%`,
                background: 'linear-gradient(90deg, #00b860, #00e87b)',
                borderRadius: noPct > 2 ? '99px 0 0 99px' : '99px',
              }}
            />
            <div
              className="transition-all duration-700"
              style={{
                width: `${noPct}%`,
                background: 'linear-gradient(90deg, #cc1f40, #ff2d55)',
                borderRadius: yesPct > 2 ? '0 99px 99px 0' : '99px',
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs font-mono font-bold">
            <span className="text-[--accent]">YES {yesPct}%</span>
            <span className="text-[--text-muted] font-normal text-[10px]">
              {question.yes_count + question.no_count} bets
            </span>
            <span className="text-[--hot]">NO {noPct}%</span>
          </div>
        </div>

        {/* User position */}
        {hasPosition && (
          <div className={`rounded-xl px-4 py-3 border flex items-center justify-between ${
            userPosition!.side === 'YES'
              ? 'bg-[--accent]/8 border-[--accent]/20'
              : 'bg-[--hot]/8 border-[--hot]/20'
          }`}>
            <div className="flex items-center gap-2.5">
              <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                userPosition!.side === 'YES'
                  ? 'bg-[--accent]/20 text-[--accent]'
                  : 'bg-[--hot]/20 text-[--hot]'
              }`}>
                {userPosition!.side}
              </span>
              <span className="text-xs font-mono text-[--text-dim]">{formatUSDT(userPosition!.amount)}</span>
            </div>
            {isResolved ? (
              <span className={`text-sm font-black font-mono ${isWinner ? 'text-[--accent]' : 'text-[--text-muted]'}`}>
                {isWinner ? `+${formatUSDT(posWin - userPosition!.amount)} 🎉` : 'Lost'}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-[--text-dim]">win ~{formatUSDT(posWin)}</span>
                {onChangePosition && !isClosed && (
                  <button
                    onClick={() => onChangePosition(question.id)}
                    disabled={disabled}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-lg border border-[--border-2] text-[--text-muted] hover:text-[--text] hover:border-[--text-muted] transition-all disabled:opacity-40"
                  >
                    ✏️ Change
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* YES / NO action buttons */}
        {!hasPosition && !isResolved && !isClosed && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onTakePosition(question.id, 'YES')}
              disabled={disabled}
              className="group py-4 rounded-xl font-black text-sm border transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex flex-col items-center gap-1
                bg-[--accent]/10 text-[--accent] border-[--accent]/20
                hover:bg-[--accent]/20 hover:border-[--accent]/50 hover:shadow-[0_0_20px_rgba(0,232,123,0.15)]"
            >
              <span className="text-base">YES ↑</span>
              <span className="text-[10px] font-mono font-normal opacity-60">
                $10 → ~{formatUSDT(yesWin)}
              </span>
            </button>
            <button
              onClick={() => onTakePosition(question.id, 'NO')}
              disabled={disabled}
              className="group py-4 rounded-xl font-black text-sm border transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed flex flex-col items-center gap-1
                bg-[--hot]/10 text-[--hot] border-[--hot]/20
                hover:bg-[--hot]/20 hover:border-[--hot]/50 hover:shadow-[0_0_20px_rgba(255,45,85,0.15)]"
            >
              <span className="text-base">NO ↓</span>
              <span className="text-[10px] font-mono font-normal opacity-60">
                $10 → ~{formatUSDT(noWin)}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
