import { QuestionCategory } from '@/types';

export const CATEGORY_CONFIG: Record<QuestionCategory, { label: string; color: string; emoji: string }> = {
  crypto: { label: 'Crypto', color: '#ff9500', emoji: '₿' },
  sport: { label: 'Sport', color: '#00e87b', emoji: '⚽' },
  culture: { label: 'Culture', color: '#ff2d55', emoji: '🎬' },
  economy: { label: 'Economy', color: '#5e5ce6', emoji: '📊' },
  tech: { label: 'Tech', color: '#30d5c8', emoji: '💻' },
  politics: { label: 'Politics', color: '#ff6b35', emoji: '🏛️' },
  real_estate: { label: 'Real Estate', color: '#a855f7', emoji: '🏗️' },
};

export function formatUSDT(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatAccuracy(correct: number, total: number): string {
  if (total === 0) return '—';
  return `${Math.round((correct / total) * 100)}%`;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function generateReferralCode(address: string): string {
  return address.slice(2, 10).toUpperCase();
}

export function getYesProbability(yesVolume: number, noVolume: number): number {
  const total = yesVolume + noVolume;
  if (total === 0) return 0.5;
  return yesVolume / total;
}
