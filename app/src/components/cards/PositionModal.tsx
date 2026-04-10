'use client';

import { useState } from 'react';
import { PositionSide } from '@/types';
import { formatUSDT } from '@/lib/utils';
import { MIN_POSITION_USDT, MAX_POSITION_USDT } from '@/lib/web3';

interface PositionModalProps {
  questionText: string;
  side: PositionSide;
  onConfirm: (amount: number, newSide: PositionSide) => void;
  onCancel: () => void;
  loading?: boolean;
  loadingLabel?: string;
  platformBalance?: number;
  yesVolume?: number;
  noVolume?: number;
  /** Change mode: show side-switcher and "Update Prediction" UI */
  isChanging?: boolean;
  currentSide?: PositionSide;
  currentAmount?: number;
}

function estimateWin(amount: number, sideVolume: number, totalVolume: number): number {
  if (amount <= 0) return 0;
  const newSideVol = sideVolume + amount;
  const newTotalVol = totalVolume + amount;
  return (amount / newSideVol) * newTotalVol * 0.98;
}

const QUICK_AMOUNTS = [5, 10, 25, 50, 100];

export function PositionModal({
  questionText,
  side: initialSide,
  onConfirm,
  onCancel,
  loading,
  loadingLabel,
  platformBalance,
  yesVolume,
  noVolume,
  isChanging,
  currentSide,
  currentAmount,
}: PositionModalProps) {
  const [amount, setAmount] = useState(currentAmount ?? 10);
  // In change mode, user can pick either side
  const [selectedSide, setSelectedSide] = useState<PositionSide>(initialSide);

  const isYes = selectedSide === 'YES';
  const accentColor = isYes ? 'var(--accent)' : 'var(--hot)';
  const hasBalance = platformBalance !== undefined && platformBalance > 0;
  const insufficientBalance = hasBalance && amount > platformBalance;

  // Live win estimate
  const hasPoolData = yesVolume !== undefined && noVolume !== undefined;
  const totalVolume = (yesVolume ?? 0) + (noVolume ?? 0);
  const sideVolume = isYes ? (yesVolume ?? 0) : (noVolume ?? 0);
  const estimatedWin = hasPoolData && amount >= MIN_POSITION_USDT
    ? estimateWin(amount, sideVolume, totalVolume)
    : null;
  const estimatedProfit = estimatedWin !== null ? estimatedWin - amount : null;
  const returnPct = estimatedWin !== null && amount > 0
    ? Math.round((estimatedWin / amount - 1) * 100)
    : null;

  function handleAmountChange(value: string) {
    const num = Number(value);
    if (isNaN(num)) return;
    setAmount(Math.min(MAX_POSITION_USDT, Math.max(0, num)));
  }

  const isValid = amount >= MIN_POSITION_USDT && amount <= MAX_POSITION_USDT && !insufficientBalance;
  const sideChanged = isChanging && selectedSide !== currentSide;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />

      {/* Sheet */}
      <div className="relative bg-[--surface] border border-[--border] rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 flex flex-col gap-5 animate-slide-up">

        {/* Handle bar */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-1 bg-[--border] rounded-full sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pt-2 sm:pt-0">
          <div>
            <h2 className="text-lg font-bold">
              {isChanging ? 'Change Prediction' : 'Take Position'}
            </h2>
            {isChanging && currentSide && (
              <p className="text-xs text-[--text-muted] mt-0.5">
                Currently: <span className={currentSide === 'YES' ? 'text-[--accent]' : 'text-[--hot]'}>{currentSide}</span> · {formatUSDT(currentAmount ?? 0)}
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full text-[--text-muted] hover:text-[--text] hover:bg-[--surface-2] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Question text */}
        <p className="text-sm text-[--text-dim] leading-relaxed">{questionText}</p>

        {/* Side selector — always shown in change mode, locked in normal mode */}
        {isChanging ? (
          <div className="grid grid-cols-2 gap-2">
            {(['YES', 'NO'] as PositionSide[]).map((s) => {
              const active = selectedSide === s;
              const color = s === 'YES' ? 'var(--accent)' : 'var(--hot)';
              return (
                <button
                  key={s}
                  onClick={() => setSelectedSide(s)}
                  className="py-3 rounded-xl font-bold text-sm border transition-all"
                  style={{
                    background: active ? `color-mix(in srgb, ${color} 15%, transparent)` : 'transparent',
                    borderColor: active ? `color-mix(in srgb, ${color} 40%, transparent)` : 'var(--border)',
                    color: active ? color : 'var(--text-muted)',
                  }}
                >
                  {s} {s === 'YES' ? '↑' : '↓'}
                  {currentSide === s && <span className="ml-1 text-[10px] opacity-60">(current)</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <div
            className="text-center py-2.5 rounded-xl font-bold text-sm border"
            style={{
              background: `color-mix(in srgb, ${accentColor} 12%, transparent)`,
              borderColor: `color-mix(in srgb, ${accentColor} 25%, transparent)`,
              color: accentColor,
            }}
          >
            {selectedSide} {isYes ? '↑' : '↓'}
          </div>
        )}

        {/* Amount input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-[--text-muted] font-mono uppercase tracking-wider">
              Amount (USDT)
            </label>
            {hasBalance && (
              <span className="text-xs font-mono text-[--text-dim]">
                Balance: <span className="text-[--accent]">{formatUSDT(platformBalance)}</span>
              </span>
            )}
          </div>
          <input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            min={MIN_POSITION_USDT}
            max={MAX_POSITION_USDT}
            className="w-full bg-[--surface-2] border border-[--border] rounded-xl px-4 py-3 text-lg font-mono font-bold text-center focus:outline-none focus:border-[--text-muted] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <div className="flex gap-2 mt-3">
            {QUICK_AMOUNTS.map((q) => (
              <button
                key={q}
                onClick={() => setAmount(q)}
                className="flex-1 py-2 text-xs font-mono rounded-lg border transition-colors"
                style={{
                  background: amount === q ? `color-mix(in srgb, ${accentColor} 15%, transparent)` : 'transparent',
                  borderColor: amount === q ? `color-mix(in srgb, ${accentColor} 30%, transparent)` : 'var(--border)',
                  color: amount === q ? accentColor : 'var(--text-muted)',
                }}
              >
                ${q}
              </button>
            ))}
          </div>
        </div>

        {/* Win estimate */}
        {estimatedWin !== null && (
          <div
            className="rounded-xl px-4 py-4 border text-center"
            style={{
              background: `color-mix(in srgb, ${accentColor} 8%, transparent)`,
              borderColor: `color-mix(in srgb, ${accentColor} 20%, transparent)`,
            }}
          >
            <p className="text-xs text-[--text-muted] mb-1 uppercase tracking-wider font-mono">If you win</p>
            <p className="text-2xl font-bold font-mono" style={{ color: accentColor }}>
              ~{formatUSDT(estimatedWin)}
            </p>
            {estimatedProfit !== null && returnPct !== null && (
              <p className="text-xs text-[--text-dim] mt-1">
                +{formatUSDT(estimatedProfit)} profit · {returnPct > 0 ? '+' : ''}{returnPct}% return
              </p>
            )}
          </div>
        )}

        {/* Change summary — what is actually changing */}
        {isChanging && (sideChanged || amount !== currentAmount) && (
          <div className="bg-[--surface-2] rounded-xl px-4 py-3 text-xs text-[--text-dim] space-y-1">
            {sideChanged && (
              <div className="flex items-center gap-2">
                <span>Side:</span>
                <span className={currentSide === 'YES' ? 'text-[--accent]' : 'text-[--hot]'}>{currentSide}</span>
                <span>→</span>
                <span className={selectedSide === 'YES' ? 'text-[--accent]' : 'text-[--hot]'}>{selectedSide}</span>
              </div>
            )}
            {amount !== currentAmount && (
              <div className="flex items-center gap-2">
                <span>Amount:</span>
                <span>{formatUSDT(currentAmount ?? 0)}</span>
                <span>→</span>
                <span className="text-[--text]">{formatUSDT(amount)}</span>
              </div>
            )}
          </div>
        )}

        {/* Confirm button */}
        <button
          onClick={() => isValid && onConfirm(amount, selectedSide)}
          disabled={!isValid || loading}
          className="w-full py-4 rounded-xl font-bold text-sm transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: accentColor, color: 'var(--bg)' }}
        >
          {loading
            ? (loadingLabel ?? 'Confirming...')
            : insufficientBalance
              ? 'Insufficient Balance'
              : isChanging
                ? `Update Prediction · ${formatUSDT(amount)}`
                : `Confirm ${selectedSide} · ${formatUSDT(amount)}`}
        </button>

        <p className="text-[10px] text-[--text-muted] text-center">
          Min {formatUSDT(MIN_POSITION_USDT)} · Max {formatUSDT(MAX_POSITION_USDT)} · 2% fee on winnings
        </p>
      </div>
    </div>
  );
}
