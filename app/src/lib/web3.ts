import { http } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { createConfig } from '@privy-io/wagmi';
import { keccak256, toHex } from 'viem';

// ─── Chain ───────────────────────────────────────────
export const ACTIVE_CHAIN = polygon;

// ─── Wagmi config — use Privy's createConfig so embedded wallets work ──
export const config = createConfig({
  chains: [ACTIVE_CHAIN],
  transports: {
    [ACTIVE_CHAIN.id]: http(),
  },
});

// ─── Stablecoins on Polygon ───────────────────────────
export const STABLECOINS = {
  USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as `0x${string}`, // Tether USDT
  USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359' as `0x${string}`, // Circle USDC (native)
} as const;

export type StablecoinSymbol = keyof typeof STABLECOINS;

// ─── Contract addresses ───────────────────────────────
export const CONTRACTS = {
  escrow: (process.env.NEXT_PUBLIC_ESCROW_CONTRACT ?? '0x0000000000000000000000000000000000000000') as `0x${string}`,
} as const;

// ─── Platform config ──────────────────────────────────
export const PLATFORM_FEE_BPS = 200;    // 2%
export const MIN_POSITION_USDT = 1;
export const MAX_POSITION_USDT = 100;

// ─── Token helpers ─────────────────────────────────────
export const TOKEN_DECIMALS: Record<StablecoinSymbol, number> = {
  USDT: 6,
  USDC: 6,
};

/** Convert human amount (e.g. 10) to on-chain units using 6 decimals */
export function parseStable(amount: number): bigint {
  return BigInt(Math.round(amount * 1_000_000));
}

/** Convert on-chain units (6 decimals) to human-readable number */
export function formatStableUnits(units: bigint): number {
  return Number(units) / 1_000_000;
}

// Keep legacy alias for any code that still imports this
export const USDT_DECIMALS = 6;
export const parseUSDT = parseStable;
export const formatUSDTUnits = formatStableUnits;

/** Convert a Supabase question UUID to bytes32 for the escrow contract */
export function questionIdToBytes32(supabaseQuestionId: string): `0x${string}` {
  return keccak256(toHex(supabaseQuestionId));
}
