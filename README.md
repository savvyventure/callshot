# CALLSHOT

**The prediction market for the rest of the world.**

Trade on real-world outcomes with USDT. Daily prediction cards. Peer-to-peer exchange. We're the platform, never the house.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│          Next.js + Tailwind + wagmi              │
│           Hosted on Vercel (CDN)                 │
└──────────────┬──────────────┬────────────────────┘
               │              │
    ┌──────────▼──────┐  ┌────▼────────────────┐
    │    SUPABASE      │  │    BLOCKCHAIN        │
    │                  │  │                      │
    │  • Users         │  │  • Polygon / Base    │
    │  • Questions     │  │  • USDT (ERC-20)     │
    │  • Cards         │  │  • CallShotEscrow    │
    │  • Positions     │  │    - deposit()       │
    │  • Leaderboard   │  │    - takePosition()  │
    │  • Referrals     │  │    - claimPayout()   │
    │                  │  │    - withdraw()       │
    └──────────────────┘  └──────────────────────┘
```

**On-chain:** Money (deposits, positions, settlements, withdrawals)
**Off-chain:** Everything else (questions, leaderboard, profiles, content)

## Project Structure

```
callshot/
├── app/                    # Next.js frontend
│   ├── src/
│   │   ├── app/            # Pages (App Router)
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Config, clients, utils
│   │   └── types/          # TypeScript types
│   ├── supabase/
│   │   └── schema.sql      # Database schema
│   └── .env.local.example  # Environment variables template
│
└── contracts/              # Solidity smart contracts
    ├── src/
    │   └── CallShotEscrow.sol
    └── test/
```

## Getting Started

### Prerequisites
- Node.js 18+
- A wallet (MetaMask, etc.)
- Supabase account (free tier)
- WalletConnect Cloud project ID

### Setup

```bash
# 1. Install dependencies
cd app && npm install

# 2. Copy env template and fill in values
cp .env.local.example .env.local

# 3. Run database migration
# → Go to Supabase Dashboard → SQL Editor → Paste supabase/schema.sql → Run

# 4. Start dev server
npm run dev
```

### Smart Contract Deployment

```bash
# Using Hardhat (setup separately)
cd contracts
# Deploy to Polygon Mumbai testnet first, then mainnet
```

## Team

- **Mo** — Product & Tech
- **Casper** — Payments, Business Model & Finance

## Status

🟡 **Week 1** — Foundation & scaffolding
