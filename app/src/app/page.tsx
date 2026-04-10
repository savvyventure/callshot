'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { Nav } from '@/components/ui/Nav';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/* ── Live stats ─────────────────────────────────────────────── */
function useLiveStats() {
  const [stats, setStats] = useState({ players: 0, volume: 0, questions: 0 });
  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0];
      const { data } = await supabase
        .from('daily_cards')
        .select('total_players, total_volume')
        .eq('date', today).eq('is_active', true).single();
      const { count } = await supabase
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open');
      if (data) setStats({ players: data.total_players, volume: data.total_volume, questions: count || 5 });
    }
    load();
  }, []);
  return stats;
}

/* ── Trust pillars ──────────────────────────────────────────── */
const TRUST = [
  {
    icon: '🔐',
    color: 'var(--accent)',
    bg: 'rgba(0,229,122,0.07)',
    border: 'rgba(0,229,122,0.15)',
    title: 'Non-Custodial',
    body: 'Your funds never touch our accounts. They are locked in an auditable smart contract on Polygon. Verdix has zero ability to freeze, move, or access your money — only you can withdraw.',
  },
  {
    icon: '🔗',
    color: 'var(--cool)',
    bg: 'rgba(110,110,245,0.07)',
    border: 'rgba(110,110,245,0.15)',
    title: 'On-Chain & Transparent',
    body: 'Every position, every payout, every fee — permanently recorded on the Polygon blockchain. Anyone can verify the math. No hidden rules, no manual overrides.',
  },
  {
    icon: '⚡',
    color: 'var(--warm)',
    bg: 'rgba(255,149,0,0.07)',
    border: 'rgba(255,149,0,0.15)',
    title: 'Instant, Automatic Payouts',
    body: 'When a question resolves, the smart contract distributes winnings directly to winners\' wallets — no approval needed, no waiting, no middleman.',
  },
  {
    icon: '🧠',
    color: 'var(--sky)',
    bg: 'rgba(47,215,196,0.07)',
    border: 'rgba(47,215,196,0.15)',
    title: 'Knowledge, Not Luck',
    body: 'Verdix is a prediction market — a tool for aggregating informed opinions on real-world outcomes. You win because your analysis was right, not because of chance. This is fundamentally different from gambling.',
  },
];

/* ── How it works steps ─────────────────────────────────────── */
const STEPS = [
  {
    n: '01',
    title: 'Create your account',
    desc: 'Sign in with email or Google. A secure, non-custodial wallet is created for you automatically — no seed phrases, no crypto knowledge required.',
  },
  {
    n: '02',
    title: 'Fund your wallet',
    desc: 'Transfer USDT or USDC from any exchange (Binance, OKX, Crypto.com) to your Verdix wallet address on the Polygon network.',
  },
  {
    n: '03',
    title: 'Make your verdicts',
    desc: 'Five fresh YES/NO questions every day. Pick your side, set your amount, and confirm. Your position is locked on-chain instantly.',
  },
  {
    n: '04',
    title: 'Collect your winnings',
    desc: 'Winners split the full pool (minus 2% platform fee). Funds land in your wallet automatically when the question resolves. Withdraw anytime.',
  },
];

/* ═══════════════════════════════════════════════════════════ */
export default function Home() {
  const { ready, authenticated, login } = usePrivy();
  const stats = useLiveStats();

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden">
      <Nav />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center text-center px-5 pt-12 pb-12">

        {/* Ambient glows */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 left-0 w-64 h-64 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, var(--cool) 0%, transparent 70%)' }} />
          <div className="absolute top-1/2 right-0 w-64 h-64 rounded-full opacity-8"
            style={{ background: 'radial-gradient(circle, var(--hot) 0%, transparent 70%)' }} />
        </div>

        {/* Animated LIVE pill */}
        <div className="relative mb-8 inline-flex items-center gap-2.5 rounded-full px-4 py-1.5"
          style={{
            background: 'rgba(0,229,122,0.08)',
            border: '1px solid rgba(0,229,122,0.2)',
          }}>
          {/* Ripple rings */}
          <span className="relative flex w-2.5 h-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping"
              style={{ background: 'var(--accent)' }} />
            <span className="relative inline-flex rounded-full w-2.5 h-2.5"
              style={{ background: 'var(--accent)' }} />
          </span>
          <span className="text-xs font-bold tracking-[0.18em] uppercase"
            style={{ color: 'var(--accent)' }}>
            Live Now
          </span>
        </div>

        {/* Headline */}
        <h1 className="relative text-[2.8rem] sm:text-7xl font-black leading-[1.0] tracking-[-0.03em] mb-5">
          Make your<br />
          <span className="gradient-text">verdict.</span>
        </h1>

        <p className="relative text-base leading-relaxed mb-8 max-w-xs" style={{ color: 'var(--text-dim)' }}>
          Five daily YES/NO questions on crypto, markets & culture.
          Stake USDT or USDC. Best analysis wins the pool.
        </p>

        {/* CTA */}
        <div className="relative w-full max-w-xs flex flex-col gap-2.5">
          {!authenticated ? (
            <>
              <button
                onClick={login}
                disabled={!ready}
                className="w-full font-black text-base py-4 rounded-2xl active:scale-[0.97] transition-all disabled:opacity-50"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--bg)',
                  boxShadow: '0 0 32px rgba(0,229,122,0.3), 0 4px 16px rgba(0,0,0,0.4)',
                }}
              >
                Get Started — Free →
              </button>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Email · Google · or connect your wallet
              </p>
            </>
          ) : (
            <Link
              href="/card"
              className="w-full font-black text-base py-4 rounded-2xl active:scale-[0.97] transition-all text-center"
              style={{
                background: 'var(--accent)',
                color: 'var(--bg)',
                boxShadow: '0 0 32px rgba(0,229,122,0.3), 0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              Play Today's Card →
            </Link>
          )}
        </div>

        {/* Live stats — clean inline row */}
        <div className="relative mt-10 flex items-center gap-4 flex-wrap justify-center">
          {[
            { value: stats.players || '—', label: 'players today', color: 'var(--accent)' },
            { value: stats.volume ? `$${Math.round(stats.volume).toLocaleString()}` : '—', label: 'prize pool', color: 'var(--warm)' },
            { value: stats.questions || 5, label: 'open questions', color: 'var(--cool)' },
          ].map((s, i) => (
            <div key={i} className="flex items-baseline gap-1.5">
              <span className="text-xl font-black font-mono" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
              {i < 2 && <span className="ml-2 text-[--text-muted] opacity-30 text-xs">·</span>}
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────── */}
      <section className="px-5 pb-10 max-w-lg mx-auto w-full">
        <SectionLabel>How it works</SectionLabel>
        <div className="flex flex-col gap-3">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="flex items-start gap-4 rounded-2xl p-5 card-lift"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              <span
                className="text-xs font-black font-mono shrink-0 mt-0.5 w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ background: 'var(--surface-2)', color: 'var(--accent)' }}
              >
                {s.n}
              </span>
              <div>
                <p className="font-bold text-sm leading-snug">{s.title}</p>
                <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-dim)' }}>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Trust & Security ─────────────────────────────────── */}
      <section className="px-5 pb-10 max-w-lg mx-auto w-full">
        <SectionLabel>Your money. Your control.</SectionLabel>

        {/* Non-custodial banner */}
        <div
          className="rounded-2xl p-5 mb-4 text-center"
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,122,0.08) 0%, rgba(110,110,245,0.06) 100%)',
            border: '1px solid rgba(0,229,122,0.2)',
          }}
        >
          <p className="text-2xl mb-2">🛡️</p>
          <p className="font-black text-base leading-snug mb-1.5">Verdix is not a custodian</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>
            We never hold your funds. Your USDT and USDC are locked in a
            publicly-auditable smart contract on Polygon — a blockchain that
            processes millions of transactions daily. Only your wallet key
            can trigger a withdrawal. Not us. Not anyone else.
          </p>
        </div>

        {/* Trust pillars grid */}
        <div className="flex flex-col gap-3">
          {TRUST.map((t) => (
            <div
              key={t.title}
              className="rounded-2xl p-5 card-lift"
              style={{ background: t.bg, border: `1px solid ${t.border}` }}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{t.icon}</span>
                <div>
                  <p className="font-bold text-sm leading-snug" style={{ color: t.color }}>{t.title}</p>
                  <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-dim)' }}>{t.body}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Prediction market, not gambling ──────────────────── */}
      <section className="px-5 pb-10 max-w-lg mx-auto w-full">
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-2)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📊</span>
            <p className="font-black text-sm">This is a prediction market — not gambling</p>
          </div>
          <div className="flex flex-col gap-2.5">
            {[
              'Outcomes are based on verifiable real-world events — not randomness or house odds.',
              'You win because your analysis was more accurate than others, not because of luck.',
              'Prediction markets are a legitimate tool used globally for price discovery and forecasting.',
              'Verdix does not operate a house position. The platform earns a fixed 2% fee only when a question resolves — we never bet against you.',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 text-xs shrink-0" style={{ color: 'var(--accent)' }}>✓</span>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-dim)' }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CEX / Wallet note ────────────────────────────────── */}
      <section className="px-5 pb-10 max-w-lg mx-auto w-full">
        <div
          className="rounded-2xl p-5"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p className="font-bold text-sm mb-3">💡 Have crypto on Binance, OKX, or Crypto.com?</p>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-dim)' }}>
            Those are <strong className="text-[--text]">exchanges</strong> — you can&apos;t connect them directly. Withdraw your USDT or USDC to your Verdix wallet address on the <strong className="text-[--text]">Polygon network</strong>.
          </p>
          <div className="flex flex-col gap-2">
            {[
              <><strong className="text-[--text]">Easiest start:</strong> Sign in with email — wallet created in seconds.</>,
              <><strong className="text-[--text]">Already have MetaMask?</strong> Tap Sign in → Connect Wallet.</>,
              <><strong className="text-[--text]">Using Binance/OKX?</strong> Withdraw USDT → Polygon → your Verdix address.</>,
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs" style={{ color: 'var(--text-dim)' }}>
                <span className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }}>›</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Token badges */}
        <div className="mt-5 flex items-center justify-center gap-2.5 flex-wrap">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Accepts</span>
          {['USDT', 'USDC'].map((t) => (
            <span
              key={t}
              className="text-xs font-mono font-bold px-3 py-1 rounded-full"
              style={{ background: 'var(--surface-2)', border: '1px solid var(--border-2)', color: 'var(--text-dim)' }}
            >
              {t}
            </span>
          ))}
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>on Polygon</span>
          <span
            className="text-xs font-mono font-bold px-3 py-1 rounded-full"
            style={{ background: 'rgba(110,110,245,0.1)', border: '1px solid rgba(110,110,245,0.2)', color: 'var(--cool)' }}
          >
            2% fee only on resolve
          </span>
        </div>
      </section>

      <footer className="mt-auto text-center py-6 text-xs mb-nav sm:mb-0 px-5"
        style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        <p>Verdix © 2026 — Prediction markets platform</p>
        <p className="mt-1 max-w-sm mx-auto leading-relaxed" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
          Not financial advice. Verdix does not hold or custody user funds.
          All positions settle via smart contract. Participate at your own discretion.
        </p>
      </footer>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-[10px] font-mono font-semibold uppercase tracking-[0.22em] mb-5"
      style={{ color: 'var(--text-muted)' }}>
      {children}
    </p>
  );
}
