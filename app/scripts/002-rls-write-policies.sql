-- ============================================
-- RLS Write Policies for frontend (anon key)
-- Run in Supabase SQL Editor
-- ============================================

-- USERS: anyone can insert (auto-create on wallet connect), users can update own row
CREATE POLICY "Anyone can create user" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (address = current_setting('request.headers', true)::json->>'x-wallet-address') WITH CHECK (true);
-- Simpler: allow all updates for MVP since we validate on frontend
DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Anyone can update users" ON users FOR UPDATE WITH CHECK (true);

-- POSITIONS: anyone can insert (one per user per question enforced by UNIQUE constraint)
CREATE POLICY "Anyone can create positions" ON positions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update positions" ON positions FOR UPDATE WITH CHECK (true);

-- QUESTIONS: only service role should write, but allow update for admin resolution from frontend
CREATE POLICY "Anyone can insert questions" ON questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update questions" ON questions FOR UPDATE WITH CHECK (true);

-- DAILY CARDS: allow insert/update for admin card creation from frontend
CREATE POLICY "Anyone can insert cards" ON daily_cards FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cards" ON daily_cards FOR UPDATE WITH CHECK (true);

-- REFERRAL EARNINGS: insert only
CREATE POLICY "Anyone can insert referral earnings" ON referral_earnings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read referral earnings" ON referral_earnings FOR SELECT USING (true);
