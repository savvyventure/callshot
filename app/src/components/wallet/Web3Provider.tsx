'use client';

import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { WagmiProvider, useSetActiveWallet } from '@privy-io/wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { config } from '@/lib/web3';
import { useAutoCreateUser } from '@/hooks/useAutoCreateUser';

const queryClient = new QueryClient();

/**
 * Syncs the Privy embedded wallet (created on email/social login)
 * as the active wagmi account, so useAccount().address is populated.
 */
function SyncPrivyWallet() {
  const { ready, authenticated } = usePrivy();
  const { wallets } = useWallets();
  const { setActiveWallet } = useSetActiveWallet();

  useEffect(() => {
    if (!ready || !authenticated || wallets.length === 0) return;
    // Prefer the embedded wallet (privy type) so email users have a wallet address
    const embedded = wallets.find((w) => w.walletClientType === 'privy');
    const wallet = embedded ?? wallets[0];
    if (wallet) setActiveWallet(wallet);
  }, [ready, authenticated, wallets, setActiveWallet]);

  return null;
}

function AutoCreateUser() {
  useAutoCreateUser();
  return null;
}

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const isConfigured = privyAppId && privyAppId !== 'placeholder-replace-me';

  if (!isConfigured) {
    return (
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ['email', 'google', 'apple', 'wallet'],
        appearance: {
          theme: 'dark',
          accentColor: '#00e87b',
          logo: '',
          landingHeader: 'Sign in to Verdix',
          loginMessage: 'Predict. Compete. Cash out.',
          walletList: ['metamask', 'coinbase_wallet', 'okx_wallet', 'cryptocom', 'rainbow'],
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: 'users-without-wallets',
          },
        },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={config}>
          <SyncPrivyWallet />
          <AutoCreateUser />
          {children}
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
