'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { usePrivy } from '@privy-io/react-auth';
import { supabase } from '@/lib/supabase';
import { UserProfile, Position } from '@/types';
import { Nav } from '@/components/ui/Nav';
import { BalanceManager } from '@/components/wallet/BalanceManager';
import { formatUSDT, formatAccuracy, shortenAddress } from '@/lib/utils';

interface PositionWithQuestion extends Position {
  question?: { text: string; status: string; outcome: string | null };
}

export default function ProfilePage() {
  const { authenticated, login, ready } = usePrivy();
  const { address } = useAccount();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [positions, setPositions] = useState<PositionWithQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchProfile = useCallback(async () => {
    if (!address) return;
    setLoading(true);
    try {
      const { data: user, error: userErr } = await supabase
        .from('users').select('*').eq('address', address.toLowerCase()).single();

      if (userErr?.code === 'PGRST116') {
        const { data: newUser, error: createErr } = await supabase
          .from('users')
          .insert({ address: address.toLowerCase(), referral_code: address.slice(2, 10).toUpperCase() })
          .select().single();
        if (createErr) throw createErr;
        setProfile(newUser as unknown as UserProfile);
        setUsername(newUser?.username || '');
      } else if (userErr) {
        throw userErr;
      } else {
        setProfile(user as unknown as UserProfile);
        setUsername(user?.username || '');
      }

      const { data: posData } = await supabase
        .from('positions')
        .select('*, questions(text, status, outcome)')
        .eq('user_address', address.toLowerCase())
        .order('created_at', { ascending: false })
        .limit(50);

      setPositions((posData || []).map((p: Record<string, unknown>) => ({
        ...p,
        question: p.questions as PositionWithQuestion['question'],
      })) as PositionWithQuestion[]);
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  async function saveUsername() {
    if (!address || !username.trim()) return;
    await supabase.from('users').update({ username: username.trim() }).eq('address', address.toLowerCase());
    setProfile((p) => p ? { ...p, username: username.trim() } : p);
    setEditing(false);
  }

  function copyReferral() {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(profile.referral_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  /* ── Auth gate ── */
  if (!authenticated) {
    return (
      <main className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-5 mb-nav sm:mb-0">
          <div className="text-5xl">👤</div>
          <h2 className="text-2xl font-black">Your Profile</h2>
          <p className="text-sm text-[--text-dim] max-w-xs">Sign in to view your stats, positions, and balance.</p>
          <button
            onClick={login}
            disabled={!ready}
            className="px-8 py-3.5 bg-[--accent] text-[--bg] font-black rounded-2xl glow-accent disabled:opacity-50"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col">
        <Nav />
        <div className="flex-1 flex items-center justify-center gap-3">
          <div className="w-5 h-5 border-2 border-[--accent] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-[--text-dim]">Loading profile…</p>
        </div>
      </main>
    );
  }

  const pnl = profile?.total_pnl || 0;
  const pnlPositive = pnl >= 0;

  return (
    <main className="min-h-screen flex flex-col">
      <Nav />

      <div className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-6 flex flex-col gap-5 mb-nav sm:mb-0">

        {/* ── Identity card ── */}
        <div className="bg-[--surface] border border-[--border] rounded-2xl p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[--accent]/15 border border-[--accent]/20 flex items-center justify-center text-xl font-black text-[--accent]">
                {(profile?.username || address || '?')[0].toUpperCase()}
              </div>
              <div>
                {editing ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      maxLength={20}
                      autoFocus
                      className="bg-[--surface-2] border border-[--border-2] rounded-lg px-3 py-1.5 text-sm font-bold focus:outline-none focus:border-[--accent] transition-colors w-36"
                    />
                    <button onClick={saveUsername} className="text-xs text-[--accent] font-bold">Save</button>
                    <button onClick={() => setEditing(false)} className="text-xs text-[--text-muted]">×</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black">{profile?.username || shortenAddress(address!)}</h2>
                    <button onClick={() => setEditing(true)} className="text-xs text-[--text-muted] hover:text-[--accent] transition-colors">
                      edit
                    </button>
                  </div>
                )}
                <p className="text-[10px] font-mono text-[--text-muted] mt-0.5 truncate max-w-[200px]">{address}</p>
              </div>
            </div>
          </div>

          {/* Referral */}
          {profile?.referral_code && (
            <div className="flex items-center gap-3 bg-[--surface-2] rounded-xl px-4 py-3">
              <span className="text-xs text-[--text-muted]">Referral</span>
              <span className="font-mono text-sm font-bold text-[--accent] flex-1">{profile.referral_code}</span>
              <button onClick={copyReferral} className="text-xs font-mono text-[--text-dim] hover:text-[--accent] transition-colors">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard value={String(profile?.total_predictions || 0)} label="Predictions" color="var(--text)" />
          <StatCard
            value={formatAccuracy(profile?.correct_predictions || 0, profile?.total_predictions || 0)}
            label="Accuracy"
            color="var(--cool)"
          />
          <StatCard
            value={`${pnlPositive ? '+' : ''}${formatUSDT(pnl)}`}
            label="Total PnL"
            color={pnlPositive ? 'var(--accent)' : 'var(--hot)'}
          />
          <StatCard
            value={`${profile?.streak || 0}🔥`}
            label="Day Streak"
            sub={`Best: ${profile?.best_streak || 0}d`}
            color="var(--warm)"
          />
        </div>

        {/* ── Balance manager ── */}
        <BalanceManager />

        {/* ── Position history ── */}
        <div>
          <h3 className="text-lg font-black mb-3">Prediction History</h3>
          {positions.length === 0 ? (
            <div className="text-center py-14 bg-[--surface] border border-[--border] rounded-2xl">
              <p className="text-4xl mb-3">🎯</p>
              <p className="text-sm text-[--text-dim]">No predictions yet.</p>
              <p className="text-xs text-[--text-muted] mt-1">Play today&apos;s card to get started.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {positions.map((pos) => (
                <div
                  key={pos.id}
                  className="bg-[--surface] border border-[--border] rounded-xl px-4 py-3.5 flex items-center gap-3 hover:border-[--border-2] transition-colors"
                >
                  {/* Side badge */}
                  <span className={`text-xs font-black px-2.5 py-1 rounded-lg shrink-0 ${
                    pos.side === 'YES' ? 'bg-[--accent]/15 text-[--accent]' : 'bg-[--hot]/15 text-[--hot]'
                  }`}>
                    {pos.side}
                  </span>

                  {/* Question */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{pos.question?.text || '—'}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-mono text-[--text-muted]">{formatUSDT(pos.amount)}</span>
                      {pos.settled && pos.payout !== null && (
                        <span className={`text-xs font-mono font-bold ${
                          pos.payout > pos.amount ? 'text-[--accent]' : 'text-[--hot]'
                        }`}>
                          {pos.payout > pos.amount ? `+${formatUSDT(pos.payout - pos.amount)}` : `-${formatUSDT(pos.amount)}`}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full shrink-0 ${
                    !pos.settled
                      ? 'bg-[--warm]/12 text-[--warm]'
                      : pos.payout && pos.payout > 0
                        ? 'bg-[--accent]/12 text-[--accent]'
                        : 'bg-[--hot]/12 text-[--hot]'
                  }`}>
                    {!pos.settled ? 'Open' : pos.payout && pos.payout > 0 ? 'Won' : 'Lost'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <footer className="text-center py-5 border-t border-[--border] text-xs text-[--text-muted] hidden sm:block">
        Verdix © 2026 · Not financial advice · Trade at your own risk
      </footer>
    </main>
  );
}

function StatCard({ value, label, sub, color }: { value: string; label: string; sub?: string; color: string }) {
  return (
    <div className="bg-[--surface] border border-[--border] rounded-xl p-4 text-center">
      <div className="text-xl font-black font-mono" style={{ color }}>{value}</div>
      <div className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider mt-1">{label}</div>
      {sub && <div className="text-[10px] text-[--text-muted] mt-0.5">{sub}</div>}
    </div>
  );
}
