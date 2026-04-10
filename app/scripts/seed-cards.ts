/**
 * Seed script for CALLSHOT daily cards + questions.
 *
 * Usage:
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=your_key \
 *   npx tsx scripts/seed-cards.ts
 *
 * Or create a .env file in the project root with those vars.
 */

import { createClient } from '@supabase/supabase-js';

// --- Config ---

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// --- Today's questions ---

interface SeedQuestion {
  text: string;
  category: string;
  resolution_source: string;
}

const QUESTIONS: SeedQuestion[] = [
  {
    text: 'Will BTC close above $100,000 today?',
    category: 'crypto',
    resolution_source: 'CoinGecko BTC/USD daily close',
  },
  {
    text: 'Will ETH close above $4,000 today?',
    category: 'crypto',
    resolution_source: 'CoinGecko ETH/USD daily close',
  },
  {
    text: 'Will the S&P 500 close green today?',
    category: 'economy',
    resolution_source: 'Yahoo Finance SPX daily close',
  },
  {
    text: 'Will NVDA close above $150 today?',
    category: 'tech',
    resolution_source: 'Yahoo Finance NVDA daily close',
  },
  {
    text: 'Will the #1 trending topic on X be about AI?',
    category: 'culture',
    resolution_source: 'X/Twitter trending page at 23:59 UTC',
  },
];

// --- Seed ---

async function seed() {
  const today = new Date().toISOString().split('T')[0];

  // Set close time to 23:59 UTC today
  const closesAt = new Date(`${today}T23:59:00Z`).toISOString();

  console.log(`Seeding card for ${today}...`);

  // Check if card already exists
  const { data: existing } = await supabase
    .from('daily_cards')
    .select('id')
    .eq('date', today)
    .single();

  if (existing) {
    console.log(`Card already exists for ${today} (id: ${existing.id}). Skipping.`);
    console.log('To re-seed, delete the existing card first.');
    return;
  }

  // Create card
  const { data: card, error: cardErr } = await supabase
    .from('daily_cards')
    .insert({
      date: today,
      closes_at: closesAt,
      is_active: true,
    })
    .select()
    .single();

  if (cardErr || !card) {
    console.error('Failed to create card:', cardErr);
    process.exit(1);
  }

  console.log(`Created card: ${card.id}`);

  // Create questions
  const questionsToInsert = QUESTIONS.map((q) => ({
    card_id: card.id,
    text: q.text,
    category: q.category,
    resolution_source: q.resolution_source,
    closes_at: closesAt,
    resolves_at: closesAt,
    status: 'open',
  }));

  const { data: insertedQuestions, error: qErr } = await supabase
    .from('questions')
    .insert(questionsToInsert)
    .select('id, text, category');

  if (qErr) {
    console.error('Failed to create questions:', qErr);
    process.exit(1);
  }

  console.log(`\nCreated ${insertedQuestions?.length} questions:`);
  insertedQuestions?.forEach((q, i) => {
    console.log(`  ${i + 1}. [${q.category}] ${q.text} (${q.id})`);
  });

  console.log('\nDone! Card is live at /card');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
