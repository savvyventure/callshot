'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Link from 'next/link';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[--border]">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight">
            CALL<span className="text-[--accent]">SHOT</span>
          </span>
        </div>
        <div className="flex items-center gap-4">
          {isConnected && (
            <Link href="/card" className="text-sm text-[--text-dim] hover:text-[--accent] transition-colors">
              Today&apos;s Card
            </Link>
          )}
          {isConnected && (
            <Link href="/leaderboard" className="text-sm text-[--text-dim] hover:text-[--accent] transition-colors">
              Leaderboard
            </Link>
          )}
          <ConnectButton
            chainStatus="icon"
            showBalance={false}
            accountStatus="address"
          />
        </div>
      </nav>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="font-mono text-[10px] tracking-[3px] uppercase text-[--accent] mb-6 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[--accent] animate-pulse" />
          Live prediction market
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-3">
          Predict. Compete.<br />
          <span className="text-[--accent]">Cash out.</span>
        </h1>

        <p className="text-[--text-dim] text-lg max-w-md mb-10">
          Trade on real-world outcomes with USDT. Daily prediction cards.
          Prove you&apos;re smarter than everyone else.
        </p>

        {!isConnected ? (
          <div className="flex flex-col items-center gap-4">
            <ConnectButton label="Connect Wallet to Start" />
            <p className="text-xs text-[--text-muted]">
              MetaMask · WalletConnect · Coinbase Wallet
            </p>
          </div>
        ) : (
          <Link
            href="/card"
            className="bg-[--accent] text-[--bg] font-semibold px-8 py-3 rounded-full text-base hover:brightness-110 transition-all"
          >
            Play Today&apos;s Card →
          </Link>
        )}

        {/* Stats bar */}
        <div className="flex gap-8 mt-16 font-mono text-sm">
          <div className="text-center">
            <div className="text-2xl font-bold text-[--accent]">—</div>
            <div className="text-[--text-muted] text-xs tracking-wider uppercase">Players today</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[--warm]">—</div>
            <div className="text-[--text-muted] text-xs tracking-wider uppercase">Prize pool</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[--cool]">5</div>
            <div className="text-[--text-muted] text-xs tracking-wider uppercase">Questions</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-[--border] text-xs text-[--text-muted]">
        CALLSHOT © 2026 · Platform only — not financial advice · Trade at your own risk
      </footer>
    </main>
  );
}
