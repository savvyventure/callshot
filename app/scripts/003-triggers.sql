-- ============================================
-- Triggers: auto-update volumes, counts, and stats
-- Run in Supabase SQL Editor
-- ============================================

-- 1. When a position is inserted, update question volumes + counts
CREATE OR REPLACE FUNCTION update_question_on_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.side = 'YES' THEN
    UPDATE questions
    SET yes_count = yes_count + 1,
        yes_volume = yes_volume + NEW.amount
    WHERE id = NEW.question_id;
  ELSE
    UPDATE questions
    SET no_count = no_count + 1,
        no_volume = no_volume + NEW.amount
    WHERE id = NEW.question_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_position_update_question ON positions;
CREATE TRIGGER trg_position_update_question
  AFTER INSERT ON positions
  FOR EACH ROW
  EXECUTE FUNCTION update_question_on_position();

-- 2. When a position is inserted, update card total_volume + total_players
CREATE OR REPLACE FUNCTION update_card_on_position()
RETURNS TRIGGER AS $$
DECLARE
  v_card_id UUID;
  v_player_count INTEGER;
BEGIN
  -- Get the card_id from the question
  SELECT card_id INTO v_card_id FROM questions WHERE id = NEW.question_id;

  -- Update volume
  UPDATE daily_cards
  SET total_volume = total_volume + NEW.amount
  WHERE id = v_card_id;

  -- Count distinct players for this card
  SELECT COUNT(DISTINCT p.user_address) INTO v_player_count
  FROM positions p
  JOIN questions q ON q.id = p.question_id
  WHERE q.card_id = v_card_id;

  UPDATE daily_cards
  SET total_players = v_player_count
  WHERE id = v_card_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_position_update_card ON positions;
CREATE TRIGGER trg_position_update_card
  AFTER INSERT ON positions
  FOR EACH ROW
  EXECUTE FUNCTION update_card_on_position();

-- 3. When a position is inserted, update user total_predictions + last_played_date
CREATE OR REPLACE FUNCTION update_user_on_position()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users
  SET total_predictions = total_predictions + 1,
      total_volume = total_volume + NEW.amount,
      last_played_date = CURRENT_DATE
  WHERE address = NEW.user_address;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_position_update_user ON positions;
CREATE TRIGGER trg_position_update_user
  AFTER INSERT ON positions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_on_position();

-- 4. Settlement function: call after resolving a question
-- Settles all positions, calculates payouts, updates user stats
CREATE OR REPLACE FUNCTION settle_question(p_question_id UUID)
RETURNS void AS $$
DECLARE
  v_outcome TEXT;
  v_yes_pool DECIMAL;
  v_no_pool DECIMAL;
  v_total_pool DECIMAL;
  v_winning_pool DECIMAL;
  v_fee_rate DECIMAL := 0.02; -- 2% platform fee
  pos RECORD;
  v_gross_payout DECIMAL;
  v_net_payout DECIMAL;
BEGIN
  -- Get question outcome and pools
  SELECT outcome, yes_volume, no_volume
  INTO v_outcome, v_yes_pool, v_no_pool
  FROM questions
  WHERE id = p_question_id AND status = 'resolved';

  IF v_outcome IS NULL THEN
    RAISE EXCEPTION 'Question not resolved or not found';
  END IF;

  v_total_pool := v_yes_pool + v_no_pool;

  IF v_outcome = 'YES' THEN
    v_winning_pool := v_yes_pool;
  ELSE
    v_winning_pool := v_no_pool;
  END IF;

  -- Settle each position
  FOR pos IN
    SELECT id, user_address, side, amount
    FROM positions
    WHERE question_id = p_question_id AND settled = false
  LOOP
    IF pos.side = v_outcome THEN
      -- Winner: proportional share of total pool minus fee
      IF v_winning_pool > 0 THEN
        v_gross_payout := (pos.amount / v_winning_pool) * v_total_pool;
      ELSE
        v_gross_payout := pos.amount; -- edge case: no one on winning side
      END IF;
      v_net_payout := v_gross_payout * (1 - v_fee_rate);

      UPDATE positions
      SET settled = true, payout = v_net_payout
      WHERE id = pos.id;

      -- Update user stats: correct prediction + PnL
      UPDATE users
      SET correct_predictions = correct_predictions + 1,
          total_pnl = total_pnl + (v_net_payout - pos.amount)
      WHERE address = pos.user_address;
    ELSE
      -- Loser: payout = 0
      UPDATE positions
      SET settled = true, payout = 0
      WHERE id = pos.id;

      -- Update user PnL (loss)
      UPDATE users
      SET total_pnl = total_pnl - pos.amount
      WHERE address = pos.user_address;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
