'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';

function AuthButton() {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { address } = useAccount();

  if (!ready) return <div className="w-20 h-9 rounded-xl bg-[--surface] animate-pulse" />;

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-5 py-2 bg-[--accent] text-[--bg] font-bold text-sm rounded-xl active:scale-95 transition-transform glow-accent"
      >
        Sign in
      </button>
    );
  }

  const label = user?.email?.address
    ? user.email.address.split('@')[0]
    : address
      ? `${address.slice(0, 6)}…${address.slice(-4)}`
      : 'You';

  return (
    <button
      onClick={logout}
      className="flex items-center gap-2 px-3 py-1.5 border border-[--border-2] rounded-xl text-xs font-mono text-[--text-dim] hover:border-[--accent]/40 hover:text-[--text] transition-all"
    >
      <span className="w-2 h-2 rounded-full bg-[--accent] animate-pulse-glow flex-shrink-0" />
      {label}
    </button>
  );
}

export function Nav() {
  const { authenticated } = usePrivy();
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* ── Top nav ── */}
      <nav className="flex items-center justify-between px-4 sm:px-8 py-3 border-b border-[--border] bg-[--bg]/85 backdrop-blur-xl sticky top-0 z-40">

        {/* Logo */}
        <Link href="/" className="text-xl font-black tracking-tight leading-none">
          VERD<span className="text-[--accent]">IX</span>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          {authenticated && (
            <div className="hidden sm:flex items-center gap-6">
              {[
                { href: '/card', label: "Today's Card" },
                { href: '/leaderboard', label: 'Leaderboard' },
                { href: '/profile', label: 'Profile' },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`text-sm font-medium transition-colors ${
                    isActive(href)
                      ? 'text-[--accent]'
                      : 'text-[--text-dim] hover:text-[--text]'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          )}
          <AuthButton />
        </div>
      </nav>

      {/* ── Mobile bottom nav ── */}
      {authenticated && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[--surface]/95 backdrop-blur-xl border-t border-[--border] pb-safe">
          <div className="flex items-stretch justify-around">
            <BottomTab href="/card" label="Play" active={isActive('/card')}>
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8}>
                <rect x="3" y="3" width="18" height="18" rx="3.5"/>
                <path d="M9 12h6M12 9v6"/>
              </svg>
            </BottomTab>
            <BottomTab href="/leaderboard" label="Ranks" active={isActive('/leaderboard')}>
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8}>
                <path d="M8 18v-5M12 18V6M16 18v-9"/>
              </svg>
            </BottomTab>
            <BottomTab href="/profile" label="Profile" active={isActive('/profile')}>
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" stroke="currentColor" strokeWidth={1.8}>
                <circle cx="12" cy="8" r="3.5"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
            </BottomTab>
          </div>
        </div>
      )}
    </>
  );
}

function BottomTab({ href, label, active, children }: {
  href: string; label: string; active: boolean; children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
        active ? 'text-[--accent]' : 'text-[--text-muted]'
      }`}
    >
      {children}
      <span className="text-[10px] font-semibold tracking-wide">{label}</span>
      {active && <span className="absolute bottom-1.5 w-4 h-0.5 rounded-full bg-[--accent]" />}
    </Link>
  );
}
