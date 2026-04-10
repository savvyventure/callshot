import type { Metadata } from 'next';
import { JetBrains_Mono, Inter } from 'next/font/google';
import { Web3Provider } from '@/components/wallet/Web3Provider';
import './globals.css';

export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  weight: ['400', '500', '600', '700', '800', '900'],
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'Verdix — Make Your Verdict.',
  description: 'Five daily YES/NO predictions on crypto, markets & culture. Stake USDT or USDC. Win the pool.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="bg-[#06060f] text-[#f0f0ff] font-sans antialiased">
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
