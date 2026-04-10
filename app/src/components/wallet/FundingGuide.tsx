'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import Link from 'next/link';

export function FundingGuide() {
  const { address } = useAccount();
  const [copied, setCopied] = useState(false);

  function copy() {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const short = address
    ? `${address.slice(0, 8)}...${address.slice(-6)}`
    : '—';

  return (
    <div className="bg-[--surface] border border-[--accent]/30 rounded-2xl overflow-hidden">

      {/* Header */}
      <div className="bg-[--accent]/10 border-b border-[--accent]/20 px-5 py-4 flex items-center gap-3">
        <span className="text-2xl">🚀</span>
        <div>
          <p className="font-black text-sm text-[--text]">Welcome to Verdix!</p>
          <p className="text-xs text-[--text-dim] mt-0.5">Fund your wallet to start predicting</p>
        </div>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">

        {/* Wallet address */}
        <div className="bg-[--surface-2] rounded-xl p-4 flex flex-col gap-2">
          <p className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider">Your Verdix Wallet Address</p>
          <div className="flex items-center gap-3">
            <p className="font-mono text-sm text-[--text] flex-1 truncate">{address ?? 'Loading...'}</p>
            <button
              onClick={copy}
              disabled={!address}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border"
              style={copied
                ? { background: 'var(--accent)', color: 'var(--bg)', borderColor: 'var(--accent)' }
                : { background: 'transparent', color: 'var(--accent)', borderColor: 'var(--accent)' }}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <p className="text-[10px] text-[--text-muted]">
            This is your personal wallet — only you control it.
          </p>
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-mono text-[--text-muted] uppercase tracking-wider">How to add funds</p>

          {[
            {
              n: '1',
              title: 'Copy your wallet address above',
              desc: 'This is where your USDT or USDC will be sent.',
            },
            {
              n: '2',
              title: 'Open Binance, OKX, or Crypto.com',
              desc: 'Go to Withdraw → choose USDT or USDC → select Polygon (MATIC) network.',
            },
            {
              n: '3',
              title: 'Paste your address & send',
              desc: 'Double-check the network is Polygon. Minimum $5 recommended.',
            },
            {
              n: '4',
              title: 'Deposit into Verdix',
              desc: 'Once it arrives (1–2 min), go to Profile → tap Deposit → you\'re ready to predict!',
            },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-3 bg-[--surface-2] rounded-xl px-4 py-3">
              <span className="w-5 h-5 rounded-full bg-[--accent]/20 text-[--accent] text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">
                {step.n}
              </span>
              <div>
                <p className="text-xs font-bold text-[--text]">{step.title}</p>
                <p className="text-[11px] text-[--text-dim] mt-0.5 leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 bg-[--hot]/10 border border-[--hot]/20 rounded-xl px-4 py-3">
          <span className="text-[--hot] text-sm shrink-0 mt-0.5">⚠</span>
          <p className="text-[11px] text-[--text-dim] leading-relaxed">
            <strong className="text-[--text]">Always use Polygon network</strong> — not Ethereum, BSC, or others. Sending on the wrong network will result in lost funds.
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/profile"
          className="w-full py-3 rounded-xl bg-[--accent] text-[--bg] font-black text-sm text-center hover:brightness-110 active:scale-[0.97] transition-all"
        >
          Go to Deposit →
        </Link>
      </div>
    </div>
  );
}
