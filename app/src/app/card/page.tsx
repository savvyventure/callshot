'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/lib/supabase';
import { DailyCard, Question, PositionSide, Position } from '@/types';
import { Nav } from '@/components/ui/Nav';
import { CardHeader } from '@/components/cards/CardHeader';
import { QuestionCard } from '@/components/cards/QuestionCard';
import { PositionModal } from '@/components/cards/PositionModal';
import { getYesProbability } from '@/lib/utils';
import { useTakePosition, TakePositionState } from '@/hooks/useTakePosition';
import { useEscrowBalance } from '@/hooks/useEscrowBalance';
import { FundingGuide } from '@/components/wallet/FundingGuide';

interface PendingPosition {
  questionId: string;
  questionText: string;
  side: PositionSide;
  yesVolume: number;
  noVolume: number;
  isChanging?: boolean;
  previousSide?: PositionSide;
  previousAmount?: number;
}

const POSITION_STATE_LABELS: Record<TakePositionState, string> = {
  idle: 'Confirm',
  sending: 'Sign in wallet...',
  confirming: 'Confirming on-chain...',
  saving: 'Saving...',
  success: 'Done!',
  error: 'Try again',
};

export default function CardPage() {
  const { address, isConnected } = useAccount();
  const { ready, authenticated, login } = usePrivy();
  const [card, setCard] = useState<DailyCard | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [positions, setPositions] = useState<Record<string, { side: PositionSide; amount: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingPosition | null>(null);

  const { takePosition, state: positionState, error: positionError, reset: resetPosition } = useTakePosition();
  const { platformBalance, refetch: refetchBalance } = useEscrowBalance();

  const submitting = !['idle', 'success', 'error'].includes(positionState);

  // Fetch today's card + questions
  const fetchCard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: cardData, error: cardErr } = await supabase
        .from('daily_cards')
        .select('*')
        .eq('date', today)
        .eq('is_active', true)
        .single();

      if (cardErr || !cardData) {
        setCard(null);
        setLoading(false);
        return;
      }

      setCard(cardData as DailyCard);

      const { data: questionsData, error: qErr } = await supabase
        .from('questions')
        .select('*')
        .eq('card_id', cardData.id)
        .order('created_at', { ascending: true });

      if (qErr) throw qErr;
      setQuestions((questionsData as Question[]) || []);
    } catch (err) {
      setError('Failed to load today\'s card. Try refreshing.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user's existing positions for this card
  const fetchPositions = useCallback(async () => {
    if (!address || !questions.length) return;

    try {
      const questionIds = questions.map((q) => q.id);
      const { data, error: posErr } = await supabase
        .from('positions')
        .select('question_id, side, amount')
        .eq('user_address', address.toLowerCase())
        .in('question_id', questionIds);

      if (posErr) throw posErr;

      const map: Record<string, { side: PositionSide; amount: number }> = {};
      (data as Pick<Position, 'question_id' | 'side' | 'amount'>[])?.forEach((p) => {
        map[p.question_id] = { side: p.side as PositionSide, amount: p.amount };
      });
      setPositions(map);
    } catch (err) {
      console.error('Failed to load positions:', err);
    }
  }, [address, questions]);

  useEffect(() => { fetchCard(); }, [fetchCard]);
  useEffect(() => { fetchPositions(); }, [fetchPositions]);

  // Handle take position
  function handleTakePosition(questionId: string, side: PositionSide) {
    const q = questions.find((q) => q.id === questionId);
    if (!q) return;
    resetPosition();
    setPending({ questionId, questionText: q.text, side, yesVolume: q.yes_volume, noVolume: q.no_volume });
  }

  function handleChangePosition(questionId: string) {
    const q = questions.find((q) => q.id === questionId);
    const current = positions[questionId];
    if (!q || !current) return;
    resetPosition();
    // Default to the opposite side so it's clear something is changing
    const oppositeSide: PositionSide = current.side === 'YES' ? 'NO' : 'YES';
    setPending({
      questionId,
      questionText: q.text,
      side: oppositeSide,
      yesVolume: q.yes_volume,
      noVolume: q.no_volume,
      isChanging: true,
      previousSide: current.side,
      previousAmount: current.amount,
    });
  }

  async function handleConfirmPosition(amount: number, newSide: PositionSide) {
    if (!pending || !address) return;

    const question = questions.find((q) => q.id === pending.questionId);
    if (!question) return;

    if (pending.isChanging) {
      // ── Update existing position ──────────────────────────────
      const { previousSide, previousAmount } = pending;
      const entryPrice = newSide === 'YES'
        ? getYesProbability(question.yes_volume, question.no_volume)
        : 1 - getYesProbability(question.yes_volume, question.no_volume);

      const { error: updateErr } = await supabase
        .from('positions')
        .update({ side: newSide, amount, entry_price: entryPrice })
        .eq('user_address', address.toLowerCase())
        .eq('question_id', pending.questionId);

      if (updateErr) {
        console.error('Failed to update position:', updateErr);
        return;
      }

      // Update local positions state
      setPositions((prev) => ({
        ...prev,
        [pending.questionId]: { side: newSide, amount },
      }));

      // Adjust question volumes optimistically
      setQuestions((prev) =>
        prev.map((q) => {
          if (q.id !== pending.questionId) return q;
          const updated = { ...q };
          // Reverse old position
          if (previousSide === 'YES') {
            updated.yes_volume = Math.max(0, updated.yes_volume - (previousAmount ?? 0));
            updated.yes_count = Math.max(0, updated.yes_count - 1);
          } else {
            updated.no_volume = Math.max(0, updated.no_volume - (previousAmount ?? 0));
            updated.no_count = Math.max(0, updated.no_count - 1);
          }
          // Apply new position
          if (newSide === 'YES') {
            updated.yes_volume += amount;
            updated.yes_count += 1;
          } else {
            updated.no_volume += amount;
            updated.no_count += 1;
          }
          return updated;
        })
      );
    } else {
      // ── New position ──────────────────────────────────────────
      const entryPrice = newSide === 'YES'
        ? getYesProbability(question.yes_volume, question.no_volume)
        : 1 - getYesProbability(question.yes_volume, question.no_volume);

      await takePosition(pending.questionId, newSide, amount, entryPrice);

      setPositions((prev) => ({
        ...prev,
        [pending.questionId]: { side: newSide, amount },
      }));

      setQuestions((prev) =>
        prev.map((q) =>
          q.id === pending.questionId
            ? {
                ...q,
                [`${newSide.toLowerCase()}_count`]: (newSide === 'YES' ? q.yes_count : q.no_count) + 1,
                [`${newSide.toLowerCase()}_volume`]: (newSide === 'YES' ? q.yes_volume : q.no_volume) + amount,
              }
            : q
        )
      );
    }

    refetchBalance();
    setPending(null);
  }

  // --- Render ---

  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-5 mb-nav sm:mb-0">
          <div className="text-5xl">🎯</div>
          <h2 className="text-2xl font-bold">Ready to play?</h2>
          <p className="text-sm text-[--text-dim] max-w-xs leading-relaxed">
            Sign in to access today&apos;s prediction card. Takes 10 seconds.
          </p>
          <button
            onClick={login}
            disabled={!ready}
            className="mt-2 px-8 py-3.5 bg-[--accent] text-[--bg] font-bold rounded-2xl text-base hover:brightness-110 active:scale-[0.98] transition-all glow-accent disabled:opacity-50"
          >
            Sign in to Play
          </button>
          <p className="text-xs text-[--text-muted]">Email · Google · or your wallet</p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <div className="w-6 h-6 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[--text-dim]">Loading today&apos;s card...</p>
        </div>
      </main>
    );
  }

  if (!card) {
    return (
      <main className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
          <div className="text-4xl mb-2">📭</div>
          <h2 className="text-xl font-bold">No card today</h2>
          <p className="text-sm text-[--text-dim] max-w-xs">
            Today&apos;s prediction card hasn&apos;t been published yet. Check back soon.
          </p>
          <button onClick={fetchCard} className="mt-2 text-sm text-[--accent] hover:underline font-medium">
            Refresh
          </button>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-sm text-[--hot]">{error}</p>
          <button onClick={fetchCard} className="mt-2 text-sm text-[--accent] hover:underline font-medium">
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Nav />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 mb-nav sm:mb-0">
        <CardHeader
          date={card.date}
          closesAt={card.closes_at}
          totalVolume={card.total_volume}
          totalPlayers={card.total_players}
          questionCount={questions.length}
        />

        {/* Balance / Onboarding */}
        {platformBalance === 0 ? (
          <FundingGuide />
        ) : (
          <div className="flex items-center justify-between bg-[--surface] border border-[--border] rounded-xl px-4 py-3">
            <div>
              <p className="text-xs text-[--text-muted]">Available to bet</p>
              <p className="text-lg font-mono font-bold text-[--accent]">${platformBalance.toFixed(2)}</p>
            </div>
            <div className="text-xs text-[--text-muted] text-right">
              <p>USDT · USDC</p>
              <p className="text-[10px]">platform balance</p>
            </div>
          </div>
        )}

        {/* Questions */}
        <div className="flex flex-col gap-4">
          {questions.map((q, i) => (
            <QuestionCard
              key={q.id}
              question={q}
              index={i + 1}
              userPosition={positions[q.id] || null}
              onTakePosition={handleTakePosition}
              onChangePosition={handleChangePosition}
              disabled={submitting}
            />
          ))}
        </div>

        {/* Position count summary */}
        {Object.keys(positions).length > 0 && (
          <div className="text-center text-xs font-mono text-[--text-muted] py-4 border-t border-[--border]">
            {Object.keys(positions).length} / {questions.length} positions taken
          </div>
        )}
      </div>

      <footer className="text-center py-5 border-t border-[--border] text-xs text-[--text-muted] hidden sm:block">
        Verdix © 2026 · Not financial advice · Trade at your own risk
      </footer>

      {/* Position Modal */}
      {pending && (
        <PositionModal
          questionText={pending.questionText}
          side={pending.side}
          onConfirm={handleConfirmPosition}
          onCancel={() => { setPending(null); resetPosition(); }}
          loading={submitting}
          loadingLabel={POSITION_STATE_LABELS[positionState]}
          platformBalance={platformBalance}
          yesVolume={pending.yesVolume}
          noVolume={pending.noVolume}
          isChanging={pending.isChanging}
          currentSide={pending.previousSide}
          currentAmount={pending.previousAmount}
        />
      )}

      {/* Position error toast */}
      {positionError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[--hot] text-white text-sm font-medium px-5 py-2.5 rounded-xl shadow-lg z-50">
          {positionError}
        </div>
      )}
    </main>
  );
}
