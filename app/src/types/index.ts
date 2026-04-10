// Core domain types for Verdix

export type QuestionStatus = 'open' | 'closed' | 'resolved';
export type QuestionOutcome = 'YES' | 'NO' | null;
export type PositionSide = 'YES' | 'NO';

export interface Question {
  id: string;
  card_id: string;
  text: string;
  category: QuestionCategory;
  status: QuestionStatus;
  outcome: QuestionOutcome;
  resolution_source: string; // URL or description of source of truth
  closes_at: string; // ISO datetime
  resolves_at: string; // ISO datetime
  created_at: string;
  yes_count: number; // number of YES positions
  no_count: number; // number of NO positions
  yes_volume: number; // total USDT on YES
  no_volume: number; // total USDT on NO
}

export type QuestionCategory = 
  | 'crypto' 
  | 'sport' 
  | 'culture' 
  | 'economy' 
  | 'tech' 
  | 'politics'
  | 'real_estate';

export interface DailyCard {
  id: string;
  date: string; // YYYY-MM-DD
  questions: Question[];
  total_volume: number;
  total_players: number;
  closes_at: string;
  is_active: boolean;
  created_at: string;
}

export interface Position {
  id: string;
  user_address: string;
  question_id: string;
  side: PositionSide;
  amount: number; // USDT
  entry_price: number; // 0-1 probability at time of entry
  settled: boolean;
  payout: number | null;
  created_at: string;
  tx_hash: string; // on-chain transaction
}

export interface UserProfile {
  address: string;
  username: string | null;
  total_predictions: number;
  correct_predictions: number;
  accuracy: number; // percentage
  total_pnl: number; // profit & loss in USDT
  total_volume: number;
  streak: number; // consecutive days played
  best_streak: number;
  referral_code: string;
  referred_by: string | null;
  joined_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  username: string | null;
  accuracy: number;
  total_pnl: number;
  total_predictions: number;
}

export interface ShareCard {
  card_id: string;
  user_address: string;
  date: string;
  correct: number;
  total: number;
  pnl: number;
  rank: number;
}

// Wallet & blockchain types
export interface WalletState {
  address: string | null;
  chain_id: number | null;
  balance: number; // USDT balance in wallet
  platform_balance: number; // USDT deposited to platform
  is_connected: boolean;
}

// Admin types
export interface ResolveQuestionPayload {
  question_id: string;
  outcome: 'YES' | 'NO';
  resolution_source: string;
}
