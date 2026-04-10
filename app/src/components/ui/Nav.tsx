'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';

/* ── Top-right avatar — taps go to Profile, never auto-logout ── */
function AuthButton() {
  const { ready, authenticated, login, user } = usePrivy();
  const { address } = useAccount();
  const router = useRouter();

  if (!ready) return <div className="w-8 h-8 rounded-full bg-[--surface-2] animate-pulse" />;

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className="px-4 py-2 bg-[--accent] text-[--bg] font-bold text-sm rounded-xl active:scale-95 transition-transform"
        style={{ boxShadow: '0 0 20px rgba(0,232,123,0.3)' }}
      >
        Sign in
      </button>
    );
  }

  /* Avatar — first letter of email or wallet short */
  const initials = user?.email?.address
    ? user.email.address[0].toUpperCase()
    : address
      ? address.slice(2, 4).toUpperCase()
      : '?';

  return (
    <button
      onClick={() => router.push('/profile')}
      aria-label="Profile"
      className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm text-[--bg] active:scale-95 transition-transform"
      style={{ background: 'var(--accent)', boxShadow: '0 0 16px rgba(0,232,123,0.35)' }}
    >
      {initials}
    </button>
  );
}

/* ── Bottom tab item ── */
function Tab({ href, label, active, icon }: {
  href: string; label: string; active: boolean; icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="relative flex-1 flex flex-col items-center justify-center gap-[3px] py-3 transition-colors"
      style={{ color: active ? 'var(--accent)' : 'var(--text-muted)' }}
    >
      {/* Active pill background */}
      {active && (
        <span
          className="absolute inset-x-3 top-1.5 bottom-1.5 rounded-2xl"
          style={{ background: 'rgba(0,232,123,0.08)' }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      <span className="relative z-10 text-[10px] font-semibold tracking-wide">{label}</span>
    </Link>
  );
}

export function Nav() {
  const { authenticated } = usePrivy();
  const pathname = usePathname();

  const tabs = [
    {
      href: '/card',
      label: 'Play',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="4"/>
          <path d="M12 8v8M8 12h8"/>
        </svg>
      ),
    },
    {
      href: '/leaderboard',
      label: 'Ranks',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 18v-6M12 18V6M16 18v-9"/>
        </svg>
      ),
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.7} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="3.5"/>
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* ── Top nav ────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-3"
        style={{
          background: 'rgba(6,6,15,0.8)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Logo */}
        <Link href="/" className="text-[22px] font-black tracking-[-0.04em] leading-none select-none">
          VERD<span style={{ color: 'var(--accent)' }}>IX</span>
        </Link>

        {/* Desktop links */}
        {authenticated && (
          <div className="hidden sm:flex items-center gap-7">
            {tabs.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="text-sm font-medium transition-colors"
                style={{ color: pathname === href ? 'var(--accent)' : 'var(--text-dim)' }}
              >
                {label}
              </Link>
            ))}
          </div>
        )}

        <AuthButton />
      </nav>

      {/* ── Mobile bottom tab bar ───────────────────────────── */}
      {authenticated && (
        <div
          className="sm:hidden fixed bottom-0 left-0 right-0 z-40 flex"
          style={{
            background: 'rgba(13,13,28,0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            paddingBottom: 'env(safe-area-inset-bottom, 12px)',
          }}
        >
          {tabs.map(({ href, label, icon }) => (
            <Tab
              key={href}
              href={href}
              label={label}
              active={pathname === href}
              icon={icon(pathname === href)}
            />
          ))}
        </div>
      )}
    </>
  );
}
