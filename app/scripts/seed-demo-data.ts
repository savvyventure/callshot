/**
 * Seeds demo data: fake users + positions to make the app look alive.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your_key \
 *   npx tsx scripts/seed-demo-data.ts
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Fake wallet addresses
const FAKE_USERS = [
  { address: '0xdead0001000000000000000000000000000000a1', username: 'whale_trader', referral_code: 'DEAD0001' },
  { address: '0xdead0002000000000000000000000000000000b2', username: 'crypto_sam', referral_code: 'DEAD0002' },
  { address: '0xdead0003000000000000000000000000000000c3', username: 'degen_queen', referral_code: 'DEAD0003' },
  { address: '0xdead0004000000000000000000000000000000d4', username: 'alpha_hunter', referral_code: 'DEAD0004' },
  { address: '0xdead0005000000000000000000000000000000e5', username: 'moon_boy', referral_code: 'DEAD0005' },
  { address: '0xdead0006000000000000000000000000000000f6', username: 'chart_wizard', referral_code: 'DEAD0006' },
  { address: '0xdead0007000000000000000000000000000007a', username: 'macro_mike', referral_code: 'DEAD0007' },
  { address: '0xdead0008000000000000000000000000000008b', username: 'profit_panda', referral_code: 'DEAD0008' },
];

// Positions to create — spread across questions with varied amounts
// index 0-4 maps to the 5 seeded questions
const POSITION_TEMPLATES = [
  // Q1: BTC > 100k — bullish bias
  { questionIndex: 0, positions: [
    { userIndex: 0, side: 'YES', amount: 100 },
    { userIndex: 1, side: 'YES', amount: 50 },
    { userIndex: 2, side: 'YES', amount: 75 },
    { userIndex: 3, side: 'NO', amount: 40 },
    { userIndex: 4, side: 'YES', amount: 25 },
    { userIndex: 5, side: 'NO', amount: 60 },
  ]},
  // Q2: ETH > 4k — mixed
  { questionIndex: 1, positions: [
    { userIndex: 0, side: 'NO', amount: 80 },
    { userIndex: 1, side: 'YES', amount: 45 },
    { userIndex: 2, side: 'YES', amount: 30 },
    { userIndex: 3, side: 'YES', amount: 55 },
    { userIndex: 6, side: 'NO', amount: 70 },
  ]},
  // Q3: S&P green — bearish bias
  { questionIndex: 2, positions: [
    { userIndex: 0, side: 'NO', amount: 90 },
    { userIndex: 2, side: 'NO', amount: 50 },
    { userIndex: 4, side: 'YES', amount: 35 },
    { userIndex: 5, side: 'NO', amount: 65 },
    { userIndex: 7, side: 'YES', amount: 20 },
  ]},
  // Q4: NVDA > 150 — bullish
  { questionIndex: 3, positions: [
    { userIndex: 1, side: 'YES', amount: 60 },
    { userIndex: 3, side: 'YES', amount: 85 },
    { userIndex: 5, side: 'NO', amount: 30 },
    { userIndex: 6, side: 'YES', amount: 45 },
    { userIndex: 7, side: 'NO', amount: 25 },
  ]},
  // Q5: AI trending — heavily yes
  { questionIndex: 4, positions: [
    { userIndex: 0, side: 'YES', amount: 50 },
    { userIndex: 1, side: 'YES', amount: 40 },
    { userIndex: 2, side: 'NO', amount: 15 },
    { userIndex: 4, side: 'YES', amount: 70 },
    { userIndex: 6, side: 'YES', amount: 55 },
    { userIndex: 7, side: 'YES', amount: 30 },
  ]},
];

async function seed() {
  const today = new Date().toISOString().split('T')[0];

  // Get today's card
  const { data: card, error: cardErr } = await supabase
    .from('daily_cards')
    .select('id')
    .eq('date', today)
    .single();

  if (cardErr || !card) {
    console.error('No card for today. Run seed-cards.ts first.');
    process.exit(1);
  }

  // Get questions
  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select('id, text')
    .eq('card_id', card.id)
    .order('created_at', { ascending: true });

  if (qErr || !questions || questions.length === 0) {
    console.error('No questions found for today\'s card.');
    process.exit(1);
  }

  console.log(`Found ${questions.length} questions for ${today}\n`);

  // Create fake users (upsert to avoid duplicates)
  for (const user of FAKE_USERS) {
    const { error } = await supabase
      .from('users')
      .upsert(user, { onConflict: 'address' });
    if (error) console.error(`Failed to create user ${user.username}:`, error.message);
  }
  console.log(`Created/updated ${FAKE_USERS.length} demo users`);

  // Create positions
  let posCount = 0;
  for (const template of POSITION_TEMPLATES) {
    const question = questions[template.questionIndex];
    if (!question) continue;

    for (const pos of template.positions) {
      const user = FAKE_USERS[pos.userIndex];
      const entryPrice = pos.side === 'YES' ? 0.5 : 0.5;

      const { error } = await supabase
        .from('positions')
        .upsert({
          user_address: user.address,
          question_id: question.id,
          side: pos.side,
          amount: pos.amount,
          entry_price: entryPrice,
          tx_hash: '0x0',
        }, { onConflict: 'user_address,question_id' });

      if (error) {
        console.error(`Failed: ${user.username} ${pos.side} $${pos.amount} on Q${template.questionIndex + 1}:`, error.message);
      } else {
        posCount++;
      }
    }
  }

  console.log(`Created ${posCount} demo positions\n`);

  // Print summary
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const { data: updated } = await supabase
      .from('questions')
      .select('yes_count, no_count, yes_volume, no_volume')
      .eq('id', q.id)
      .single();

    if (updated) {
      const total = Number(updated.yes_volume) + Number(updated.no_volume);
      const yesPct = total > 0 ? Math.round((Number(updated.yes_volume) / total) * 100) : 50;
      console.log(`Q${i + 1}: ${q.text}`);
      console.log(`    YES ${yesPct}% ($${updated.yes_volume}) | NO ${100 - yesPct}% ($${updated.no_volume}) | ${updated.yes_count + updated.no_count} bets\n`);
    }
  }

  // Check card stats
  const { data: cardUpdated } = await supabase
    .from('daily_cards')
    .select('total_volume, total_players')
    .eq('id', card.id)
    .single();

  if (cardUpdated) {
    console.log(`Card stats: $${cardUpdated.total_volume} volume, ${cardUpdated.total_players} players`);
  }

  console.log('\nDone! Refresh /card to see live odds.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
