-- CALLSHOT Database Schema
-- Run this in Supabase SQL Editor to create all tables

-- ============================================
-- USERS (wallet-based, no email/password)
-- ============================================
CREATE TABLE users (
  address TEXT PRIMARY KEY, -- wallet address (lowercase)
  username TEXT UNIQUE,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT REFERENCES users(address),
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  total_pnl DECIMAL(18, 6) DEFAULT 0,
  total_volume DECIMAL(18, 6) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_played_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_referral ON users(referral_code);
CREATE INDEX idx_users_pnl ON users(total_pnl DESC);

-- ============================================
-- DAILY CARDS
-- ============================================
CREATE TABLE daily_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL, -- one card per day
  closes_at TIMESTAMPTZ NOT NULL,
  total_volume DECIMAL(18, 6) DEFAULT 0,
  total_players INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cards_date ON daily_cards(date DESC);

-- ============================================
-- QUESTIONS
-- ============================================
CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES daily_cards(id),
  text TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('crypto', 'sport', 'culture', 'economy', 'tech', 'politics', 'real_estate')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  outcome TEXT CHECK (outcome IN ('YES', 'NO')),
  resolution_source TEXT, -- URL or description
  closes_at TIMESTAMPTZ NOT NULL,
  resolves_at TIMESTAMPTZ,
  yes_count INTEGER DEFAULT 0,
  no_count INTEGER DEFAULT 0,
  yes_volume DECIMAL(18, 6) DEFAULT 0,
  no_volume DECIMAL(18, 6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_questions_card ON questions(card_id);
CREATE INDEX idx_questions_status ON questions(status);

-- ============================================
-- POSITIONS (user bets on questions)
-- ============================================
CREATE TABLE positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL REFERENCES users(address),
  question_id UUID NOT NULL REFERENCES questions(id),
  side TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
  amount DECIMAL(18, 6) NOT NULL CHECK (amount >= 1 AND amount <= 100),
  entry_price DECIMAL(10, 6) NOT NULL, -- probability at time of entry
  settled BOOLEAN DEFAULT false,
  payout DECIMAL(18, 6),
  tx_hash TEXT, -- on-chain deposit tx
  settlement_tx_hash TEXT, -- on-chain payout tx
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One position per user per question
  UNIQUE(user_address, question_id)
);

CREATE INDEX idx_positions_user ON positions(user_address);
CREATE INDEX idx_positions_question ON positions(question_id);
CREATE INDEX idx_positions_unsettled ON positions(settled) WHERE settled = false;

-- ============================================
-- REFERRAL EARNINGS
-- ============================================
CREATE TABLE referral_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_address TEXT NOT NULL REFERENCES users(address),
  referee_address TEXT NOT NULL REFERENCES users(address),
  position_id UUID NOT NULL REFERENCES positions(id),
  earning DECIMAL(18, 6) NOT NULL, -- referrer's cut
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referral_referrer ON referral_earnings(referrer_address);

-- ============================================
-- VIEWS: Leaderboard
-- ============================================
CREATE OR REPLACE VIEW leaderboard AS
SELECT
  address,
  username,
  total_predictions,
  correct_predictions,
  CASE WHEN total_predictions > 0
    THEN ROUND((correct_predictions::DECIMAL / total_predictions) * 100, 1)
    ELSE 0
  END AS accuracy,
  total_pnl,
  total_volume,
  current_streak,
  RANK() OVER (ORDER BY total_pnl DESC) AS rank
FROM users
WHERE total_predictions >= 5 -- minimum 5 predictions to appear on leaderboard
ORDER BY total_pnl DESC;

-- ============================================
-- RLS (Row Level Security) - basic policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_earnings ENABLE ROW LEVEL SECURITY;

-- Public read access for cards, questions, leaderboard
CREATE POLICY "Anyone can read cards" ON daily_cards FOR SELECT USING (true);
CREATE POLICY "Anyone can read questions" ON questions FOR SELECT USING (true);
CREATE POLICY "Anyone can read users" ON users FOR SELECT USING (true);

-- Positions: users can read all (for sentiment), create their own
CREATE POLICY "Anyone can read positions" ON positions FOR SELECT USING (true);

-- Note: Write policies will use service role key from backend,
-- so we don't need RLS write policies for MVP. 
-- The backend API validates and inserts on behalf of users.
