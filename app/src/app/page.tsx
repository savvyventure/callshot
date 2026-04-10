'use client';

import { usePrivy } from '@privy-io/react-auth';
import Link from 'next/link';
import { Nav } from '@/components/ui/Nav';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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

const STEPS = [
  { icon: '✉️', title: 'Sign in — takes 10 seconds', desc: 'Use email, Google, or Apple. We create your wallet automatically — no setup needed.' },
  { icon: '🎯', title: 'Pick YES or NO', desc: 'Five fresh questions every day on crypto, markets & culture. Bet what you know.' },
  { icon: '💸', title: 'Win the pool', desc: 'Right side takes the whole pot. Winnings land directly in your wallet — withdraw anytime.' },
];

export default function Home() {
  const { ready, authenticated, login } = usePrivy();
  const stats = useLiveStats();

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden">
      <Nav />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative flex flex-col items-center justify-center text-center px-5 pt-14 pb-10">

        {/* Glow backdrop */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-[--accent]/6 blur-[100px]" />
          <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-[--cool]/5 blur-[80px]" />
          <div className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-[--hot]/4 blur-[80px]" />
        </div>

        {/* Live pill */}
        <div className="relative inline-flex items-center gap-2 bg-[--surface] border border-[--border-2] rounded-full px-4 py-1.5 mb-7">
          <span className="w-2 h-2 rounded-full bg-[--accent] animate-pulse-glow" />
          <span className="text-[--accent] text-xs font-mono font-semibold tracking-[0.15em] uppercase">Live Now</span>
        </div>

        {/* Headline */}
        <h1 className="relative text-5xl sm:text-7xl font-black tracking-tight leading-[1.0] mb-5">
          Make your<br />
          <span className="gradient-text">verdict.</span>
        </h1>

        <p className="relative text-[--text-dim] text-base sm:text-lg max-w-sm leading-relaxed mb-9">
          Five daily YES/NO predictions on crypto,<br className="hidden sm:block" /> markets & culture.
          Stake USDT or USDC. Win the pool.
        </p>

        {/* CTA */}
        <div className="relative flex flex-col items-center gap-3 w-full max-w-sm">
          {!authenticated ? (
            <>
              <button
                onClick={login}
                disabled={!ready}
                className="w-full bg-[--accent] text-[--bg] font-black text-base py-4 rounded-2xl hover:brightness-110 active:scale-[0.97] transition-all glow-accent disabled:opacity-50"
              >
                Get Started — Free →
              </button>
              <p className="text-xs text-[--text-muted]">Email · Google · Apple · or your existing wallet</p>
            </>
          ) : (
            <Link
              href="/card"
              className="w-full bg-[--accent] text-[--bg] font-black text-base py-4 rounded-2xl hover:brightness-110 active:scale-[0.97] transition-all glow-accent text-center"
            >
              Play Today's Card →
            </Link>
          )}
        </div>

        {/* Live stats bar */}
        <div className="relative mt-10 flex items-center divide-x divide-[--border] bg-[--surface] border border-[--border-2] rounded-2xl overflow-hidden">
          <Stat n={stats.players || '—'} label="Players today" color="var(--accent)" />
          <Stat n={stats.volume ? `$${Math.round(stats.volume).toLocaleString()}` : '—'} label="Prize pool" color="var(--warm)" />
          <Stat n={stats.questions || 5} label="Open questions" color="var(--cool)" />
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────── */}
      <section className="px-5 pb-8 max-w-lg mx-auto w-full">
        <p className="text-center text-[10px] font-mono text-[--text-muted] uppercase tracking-[0.2em] mb-5">
          How it works
        </p>
        <div className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-start gap-4 bg-[--surface] border border-[--border] rounded-2xl p-5 card-lift">
              <span className="text-2xl shrink-0 mt-0.5">{s.icon}</span>
              <div>
                <p className="font-bold text-sm">{s.title}</p>
                <p className="text-xs text-[--text-dim] mt-1 leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CEX education */}
        <div className="mt-4 bg-[--surface] border border-[--border-2] rounded-2xl p-5 space-y-3">
          <p className="font-bold text-sm">💡 Have crypto on Binance, OKX, or Crypto.com?</p>
          <p className="text-xs text-[--text-dim] leading-relaxed">
            Those are <strong className="text-[--text]">exchanges</strong>, not wallets — you can&apos;t connect them directly here.
          </p>
          <div className="space-y-2">
            {[
              { arrow: true, text: <><strong className="text-[--text]">Easiest:</strong> Sign in with email above — we handle the wallet for you.</> },
              { arrow: true, text: <><strong className="text-[--text]">OKX / Binance user?</strong> Download OKX Wallet or Trust Wallet, then connect.</> },
              { arrow: true, text: <><strong className="text-[--text]">Already have MetaMask?</strong> Tap Sign in → choose Wallet.</> },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[--text-dim]">
                <span className="text-[--accent] mt-0.5 shrink-0">›</span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Token badges */}
        <div className="mt-5 flex items-center justify-center gap-2">
          <span className="text-xs text-[--text-muted]">Accepts</span>
          {['USDT', 'USDC'].map((t) => (
            <span key={t} className="text-xs font-mono font-bold px-3 py-1 bg-[--surface] border border-[--border-2] rounded-full text-[--text-dim]">
              {t}
            </span>
          ))}
          <span className="text-xs text-[--text-muted]">on Polygon</span>
        </div>
      </section>

      <footer className="mt-auto text-center py-5 border-t border-[--border] text-xs text-[--text-muted] mb-nav sm:mb-0">
        Verdix © 2026 · Not financial advice · Trade at your own risk
      </footer>
    </main>
  );
}

function Stat({ n, label, color }: { n: string | number; label: string; color: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-4">
      <span className="text-2xl font-black font-mono" style={{ color }}>{n}</span>
      <span className="text-[10px] text-[--text-muted] uppercase tracking-wider mt-0.5 whitespace-nowrap">{label}</span>
    </div>
  );
}
