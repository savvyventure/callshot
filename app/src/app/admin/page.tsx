'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { supabase } from '@/lib/supabase';
import { DailyCard, Question, QuestionCategory } from '@/types';
import { Nav } from '@/components/ui/Nav';
import { CATEGORY_CONFIG, formatUSDT } from '@/lib/utils';

const CATEGORIES = Object.keys(CATEGORY_CONFIG) as QuestionCategory[];

// Hardcode admin addresses — replace with your own
const ADMIN_ADDRESSES = [
  '0x1B3368418e43D8Ff1F307fdeC243Ba494e5DD3d6',
];

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const [cards, setCards] = useState<DailyCard[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'cards' | 'resolve'>('cards');

  // New card form
  const [newCardDate, setNewCardDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCardClosesAt, setNewCardClosesAt] = useState('');

  // New question form
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newQuestionCategory, setNewQuestionCategory] = useState<QuestionCategory>('crypto');
  const [newQuestionResolution, setNewQuestionResolution] = useState('');

  const isAdmin = address && ADMIN_ADDRESSES.some(
    (a) => a.toLowerCase() === address.toLowerCase()
  );

  const fetchCards = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('daily_cards')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);

      setCards((data || []) as DailyCard[]);
    } catch (err) {
      console.error('Failed to load cards:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQuestions = useCallback(async (cardId: string) => {
    try {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('card_id', cardId)
        .order('created_at', { ascending: true });

      setQuestions((data || []) as Question[]);
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  }, []);

  useEffect(() => {
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    if (selectedCard) fetchQuestions(selectedCard);
  }, [selectedCard, fetchQuestions]);

  async function createCard() {
    if (!newCardDate || !newCardClosesAt) return;

    try {
      const { data, error } = await supabase
        .from('daily_cards')
        .insert({
          date: newCardDate,
          closes_at: newCardClosesAt,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      setCards((prev) => [data as DailyCard, ...prev]);
      setSelectedCard((data as DailyCard).id);
      setNewCardDate('');
      setNewCardClosesAt('');
    } catch (err) {
      console.error('Failed to create card:', err);
      alert('Failed to create card. Check console.');
    }
  }

  async function addQuestion() {
    if (!selectedCard || !newQuestionText.trim()) return;

    const card = cards.find((c) => c.id === selectedCard);

    try {
      const { data, error } = await supabase
        .from('questions')
        .insert({
          card_id: selectedCard,
          text: newQuestionText.trim(),
          category: newQuestionCategory,
          resolution_source: newQuestionResolution.trim() || 'TBD',
          closes_at: card?.closes_at || new Date().toISOString(),
          resolves_at: card?.closes_at || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      setQuestions((prev) => [...prev, data as Question]);
      setNewQuestionText('');
      setNewQuestionResolution('');
    } catch (err) {
      console.error('Failed to add question:', err);
      alert('Failed to add question. Check console.');
    }
  }

  async function resolveQuestion(questionId: string, outcome: 'YES' | 'NO') {
    try {
      // 1. Mark question as resolved
      const { error } = await supabase
        .from('questions')
        .update({ status: 'resolved', outcome })
        .eq('id', questionId);

      if (error) throw error;

      // 2. Auto-settle all positions (calls the DB function)
      const { error: settleErr } = await supabase.rpc('settle_question', {
        p_question_id: questionId,
      });

      if (settleErr) {
        console.error('Settlement failed (question still resolved):', settleErr);
        alert('Question resolved but settlement failed. Run settle manually.');
      }

      setQuestions((prev) =>
        prev.map((q) => q.id === questionId ? { ...q, status: 'resolved' as const, outcome } : q)
      );
    } catch (err) {
      console.error('Failed to resolve question:', err);
      alert('Failed to resolve. Check console.');
    }
  }

  async function toggleCardActive(cardId: string, isActive: boolean) {
    try {
      await supabase.from('daily_cards').update({ is_active: !isActive }).eq('id', cardId);
      setCards((prev) => prev.map((c) => c.id === cardId ? { ...c, is_active: !isActive } : c));
    } catch (err) {
      console.error(err);
    }
  }

  // --- Render ---

  if (!isConnected) {
    return (
      <main className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <p className="text-[--text-dim] text-sm">Connect wallet to access admin.</p>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
          <div className="text-4xl mb-2">🚫</div>
          <h2 className="text-xl font-bold">Not authorized</h2>
          <p className="text-sm text-[--text-dim] max-w-xs">
            This page is restricted to platform admins.
          </p>
          <p className="text-xs font-mono text-[--text-muted] mt-2">{address}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col">
      <Nav />

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
          <div className="flex gap-1 bg-[--surface-2] rounded-xl p-1">
            <button
              onClick={() => setTab('cards')}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                tab === 'cards' ? 'bg-[--accent] text-[--bg]' : 'text-[--text-dim] hover:text-[--text]'
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setTab('resolve')}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                tab === 'resolve' ? 'bg-[--accent] text-[--bg]' : 'text-[--text-dim] hover:text-[--text]'
              }`}
            >
              Resolve
            </button>
          </div>
        </div>

        {tab === 'cards' && (
          <div className="flex flex-col gap-6">
            {/* Create Card */}
            <div className="bg-[--surface] border border-[--border] rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[--text-muted]">Create Daily Card</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[--text-muted] mb-1 block">Date</label>
                  <input
                    type="date"
                    value={newCardDate}
                    onChange={(e) => setNewCardDate(e.target.value)}
                    className="w-full bg-[--surface-2] border border-[--border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[--accent]"
                  />
                </div>
                <div>
                  <label className="text-xs text-[--text-muted] mb-1 block">Closes at</label>
                  <input
                    type="datetime-local"
                    value={newCardClosesAt}
                    onChange={(e) => setNewCardClosesAt(new Date(e.target.value).toISOString())}
                    className="w-full bg-[--surface-2] border border-[--border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[--accent]"
                  />
                </div>
              </div>
              <button
                onClick={createCard}
                disabled={!newCardDate || !newCardClosesAt}
                className="bg-[--accent] text-[--bg] font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
              >
                Create Card
              </button>
            </div>

            {/* Card List */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {cards.map((card) => (
                  <div
                    key={card.id}
                    onClick={() => setSelectedCard(card.id)}
                    className={`bg-[--surface] border rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer transition-colors ${
                      selectedCard === card.id ? 'border-[--accent]' : 'border-[--border] hover:border-[--text-muted]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold">{card.date}</span>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        card.is_active ? 'bg-[--accent]/10 text-[--accent]' : 'bg-[--hot]/10 text-[--hot]'
                      }`}>
                        {card.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-[--text-muted]">{formatUSDT(card.total_volume)} vol</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleCardActive(card.id, card.is_active ?? false); }}
                        className="text-[10px] text-[--text-dim] hover:text-[--accent] transition-colors"
                      >
                        {card.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Questions to Selected Card */}
            {selectedCard && (
              <div className="bg-[--surface] border border-[--border] rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-[--text-muted]">
                  Questions for {cards.find((c) => c.id === selectedCard)?.date}
                </h3>

                {/* Existing questions */}
                {questions.map((q, i) => (
                  <div key={q.id} className="flex items-start gap-3 bg-[--surface-2] rounded-xl px-4 py-3">
                    <span className="font-mono text-xs text-[--text-muted] mt-0.5">#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{q.text}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono" style={{ color: CATEGORY_CONFIG[q.category]?.color }}>
                          {CATEGORY_CONFIG[q.category]?.emoji} {q.category}
                        </span>
                        <span className={`text-[10px] font-mono ${
                          q.status === 'resolved' ? 'text-[--accent]' : 'text-[--text-muted]'
                        }`}>
                          {q.status}{q.outcome ? `: ${q.outcome}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* New question form */}
                <div className="border-t border-[--border] pt-4 flex flex-col gap-3">
                  <textarea
                    value={newQuestionText}
                    onChange={(e) => setNewQuestionText(e.target.value)}
                    placeholder="Will BTC close above $100k today?"
                    rows={2}
                    className="w-full bg-[--surface-2] border border-[--border] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[--accent]"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <select
                      value={newQuestionCategory}
                      onChange={(e) => setNewQuestionCategory(e.target.value as QuestionCategory)}
                      className="bg-[--surface-2] border border-[--border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[--accent]"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{CATEGORY_CONFIG[cat].emoji} {CATEGORY_CONFIG[cat].label}</option>
                      ))}
                    </select>
                    <input
                      value={newQuestionResolution}
                      onChange={(e) => setNewQuestionResolution(e.target.value)}
                      placeholder="Resolution source URL"
                      className="bg-[--surface-2] border border-[--border] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[--accent]"
                    />
                  </div>
                  <button
                    onClick={addQuestion}
                    disabled={!newQuestionText.trim()}
                    className="bg-[--cool] text-white font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 transition-all"
                  >
                    Add Question
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'resolve' && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[--text-dim]">Select a card above, then resolve open questions.</p>

            {/* Card selector */}
            <select
              value={selectedCard || ''}
              onChange={(e) => setSelectedCard(e.target.value || null)}
              className="bg-[--surface-2] border border-[--border] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[--accent]"
            >
              <option value="">Select a card...</option>
              {cards.map((c) => (
                <option key={c.id} value={c.id}>{c.date}</option>
              ))}
            </select>

            {selectedCard && questions.filter((q) => q.status !== 'resolved').length === 0 && (
              <div className="text-center py-12 bg-[--surface] border border-[--border] rounded-2xl">
                <p className="text-[--text-dim] text-sm">All questions for this card are resolved.</p>
              </div>
            )}

            {selectedCard && questions.filter((q) => q.status !== 'resolved').map((q) => (
              <div key={q.id} className="bg-[--surface] border border-[--border] rounded-xl p-4 flex flex-col gap-3">
                <p className="text-sm font-medium">{q.text}</p>
                <div className="flex items-center gap-2 text-xs font-mono text-[--text-muted]">
                  <span>{CATEGORY_CONFIG[q.category]?.emoji} {q.category}</span>
                  <span>·</span>
                  <span>YES: {q.yes_count} ({formatUSDT(q.yes_volume)})</span>
                  <span>·</span>
                  <span>NO: {q.no_count} ({formatUSDT(q.no_volume)})</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => resolveQuestion(q.id, 'YES')}
                    className="py-2.5 rounded-xl font-semibold text-sm bg-[--accent]/12 text-[--accent] border border-[--accent]/20 hover:bg-[--accent]/20 transition-all"
                  >
                    Resolve YES ✓
                  </button>
                  <button
                    onClick={() => resolveQuestion(q.id, 'NO')}
                    className="py-2.5 rounded-xl font-semibold text-sm bg-[--hot]/12 text-[--hot] border border-[--hot]/20 hover:bg-[--hot]/20 transition-all"
                  >
                    Resolve NO ✗
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <footer className="text-center py-6 border-t border-[--border] text-xs text-[--text-muted]">
        Verdix © 2026 · Admin Panel
      </footer>
    </main>
  );
}
