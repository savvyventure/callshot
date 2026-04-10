import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack(config) {
    // Privy v3 optionally imports Farcaster/Solana packages we don't use.
    // Stub them out so webpack doesn't error.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@farcaster/mini-app-solana': false,
      '@farcaster/miniapp-sdk': false,
      '@solana/wallet-adapter-react': false,
      '@solana-program/memo': false,
      '@solana-program/system': false,
      '@solana-program/token': false,
      '@solana/kit': false,
      '@coinbase/wallet-sdk': false,
      '@metamask/connect-evm': false,
      '@walletconnect/ethereum-provider': false,
    };
    return config;
  },
};

export default nextConfig;
