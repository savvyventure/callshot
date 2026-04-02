import type { Metadata } from 'next';
import { JetBrains_Mono, DM_Sans } from 'next/font/google';
import { Web3Provider } from '@/components/wallet/Web3Provider';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'CALLSHOT — Predict. Compete. Cash Out.',
  description: 'The prediction market for the rest of the world. Trade on real-world outcomes with USDT.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${dmSans.variable} ${jetbrains.variable}`}>
      <body className="bg-[#08080e] text-[#e4e4ee] font-sans antialiased">
        <Web3Provider>
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
