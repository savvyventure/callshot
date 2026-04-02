import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { polygon, base } from 'wagmi/chains';

// Use Polygon as default — switch to Base if crypto enabler recommends it
const ACTIVE_CHAIN = polygon;

export const config = getDefaultConfig({
  appName: 'CALLSHOT',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'placeholder',
  chains: [ACTIVE_CHAIN],
  ssr: true,
});

// Contract addresses — deploy and update these
export const CONTRACTS = {
  escrow: process.env.NEXT_PUBLIC_ESCROW_CONTRACT as `0x${string}` || '0x0000000000000000000000000000000000000000',
  usdt: ACTIVE_CHAIN.id === polygon.id
    ? '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}` // USDT on Polygon
    : '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as `0x${string}`, // USDC on Base (USDT less common on Base)
} as const;

// Platform fee: 2% of winning payout
export const PLATFORM_FEE_BPS = 200; // basis points

// Position limits
export const MIN_POSITION_USDT = 1;
export const MAX_POSITION_USDT = 100;

export { ACTIVE_CHAIN };
