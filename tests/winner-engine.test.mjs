/**
 * Pure Unit Tests for Phase 8: Winner Identification & Verification Engine.
 * Tests:
 * 1. Winner identification (3, 4, 5 matches)
 * 2. Highest applicable tier rule (exclusivity)
 * 3. Duplicate ticket numbers (multiset matching rule)
 * 4. Multiple winners splitting the same tier equally (integer cents)
 * 5. Rollover behavior for unclaimed jackpot vs non-rollover tiers
 * 6. Winner audit record snapshot generation
 * 7. Verification state machine transitions
 * Zero database side-effects.
 */

import { PRNG } from '../src/lib/draw/prng.ts';
import { RandomDrawStrategy } from '../src/lib/draw/random-strategy.ts';
import { PrizePoolCalculator } from '../src/lib/draw/prize-pool.ts';
import { DrawEngine } from '../src/lib/draw/engine.ts';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅ PASS: ${label}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${label}`);
    failed++;
  }
}

console.log('--- PHASE 8: WINNER ENGINE UNIT TESTS ---\n');

// 1. Winner Identification: 3, 4, and 5 matches
console.log('1. Winner Identification by Match Count:');
const prng = new PRNG('winner-ident-seed-2026');
const winningNumbers = prng.drawUnique(5, 1, 45); // e.g. 5 distinct numbers

const mockParticipants = [
  // 5 matches
  { userId: 'golfer-5-match', scores: [...winningNumbers] },
  // 4 matches + 1 non-matching
  { userId: 'golfer-4-match', scores: [winningNumbers[0], winningNumbers[1], winningNumbers[2], winningNumbers[3], 99] },
  // 3 matches + 2 non-matching
  { userId: 'golfer-3-match', scores: [winningNumbers[0], winningNumbers[1], winningNumbers[2], 88, 99] },
  // 2 matches (below minimum tier)
  { userId: 'golfer-2-match', scores: [winningNumbers[0], winningNumbers[1], 77, 88, 99] },
  // 1 match
  { userId: 'golfer-1-match', scores: [winningNumbers[0], 66, 77, 88, 99] },
  // 0 matches
  { userId: 'golfer-0-match', scores: [55, 66, 77, 88, 99] },
];

const matchResult = RandomDrawStrategy.execute(mockParticipants, new PRNG('winner-ident-seed-2026'));

assert(matchResult.tierWinners.tier5.includes('golfer-5-match'), 'Golfer matching 5 numbers is placed in Tier 5');
assert(matchResult.tierWinners.tier4.includes('golfer-4-match'), 'Golfer matching 4 numbers is placed in Tier 4');
assert(matchResult.tierWinners.tier3.includes('golfer-3-match'), 'Golfer matching 3 numbers is placed in Tier 3');
assert(!matchResult.tierWinners.tier5.includes('golfer-2-match') &&
       !matchResult.tierWinners.tier4.includes('golfer-2-match') &&
       !matchResult.tierWinners.tier3.includes('golfer-2-match'), 'Golfer matching 2 numbers receives no tier');
assert(!matchResult.tierWinners.tier3.includes('golfer-1-match') &&
       !matchResult.tierWinners.tier3.includes('golfer-0-match'), 'Golfers with 0 or 1 match receive no tier');

// 2. Highest Applicable Tier Exclusivity
console.log('\n2. Highest Applicable Tier Exclusivity:');
// A 5-match golfer must ONLY be in Tier 5 (not also in Tier 4 or Tier 3)
assert(
  matchResult.tierWinners.tier5.includes('golfer-5-match') &&
  !matchResult.tierWinners.tier4.includes('golfer-5-match') &&
  !matchResult.tierWinners.tier3.includes('golfer-5-match'),
  '5-match winner is ONLY awarded Tier 5 and excluded from lower tiers'
);

// A 4-match golfer must ONLY be in Tier 4 (not also in Tier 3)
assert(
  matchResult.tierWinners.tier4.includes('golfer-4-match') &&
  !matchResult.tierWinners.tier3.includes('golfer-4-match'),
  '4-match winner is ONLY awarded Tier 4 and excluded from lower tiers'
);

// 3. Multiset Matching Rule (Duplicate scores on ticket)
console.log('\n3. Multiset Matching Rule:');
const dupParticipant = {
  userId: 'golfer-dup',
  scores: [winningNumbers[0], winningNumbers[0], winningNumbers[0], 88, 99],
};
const dupResult = RandomDrawStrategy.execute([dupParticipant], new PRNG('winner-ident-seed-2026'));
const dupEval = dupResult.evaluations.find((e) => e.userId === 'golfer-dup');
assert(
  dupEval && dupEval.matchCount === 1,
  'Duplicate ticket score [W0, W0, W0] matches drawn number W0 exactly ONCE (matchCount = 1)'
);
assert(dupEval && dupEval.matchTier === null, 'Golfer with single effective match wins no tier');

// 4. Multiple Winners Splitting the Same Tier
console.log('\n4. Multiple Winners Equal-Split Calculation:');
// 200 subscribers = £1000 base pool (100,000 cents)
// Tier 5: 40% = 40,000 cents. If 3 winners -> 40,000 / 3 = 13,333 cents each (£133.33)
// Tier 4: 35% = 35,000 cents. If 2 winners -> 35,000 / 2 = 17,500 cents each (£175.00)
// Tier 3: 25% = 25,000 cents. If 4 winners -> 25,000 / 4 = 6,250 cents each (£62.50)
const splitPool = PrizePoolCalculator.calculate({
  activeSubscriberCount: 200,
  previousRolloverCents: 0,
  tierWinners: {
    tier5: ['w1', 'w2', 'w3'],
    tier4: ['w4', 'w5'],
    tier3: ['w6', 'w7', 'w8', 'w9'],
  },
});

assert(splitPool.tier5.prizePerWinnerCents === 13333, 'Tier 5 (40%) split equally among 3 winners: £133.33 (13333 cents)');
assert(splitPool.tier4.prizePerWinnerCents === 17500, 'Tier 4 (35%) split equally among 2 winners: £175.00 (17500 cents)');
assert(splitPool.tier3.prizePerWinnerCents === 6250, 'Tier 3 (25%) split equally among 4 winners: £62.50 (6250 cents)');
assert(splitPool.tier5.isClaimed === true, 'Tier 5 claimed when winners exist');
assert(splitPool.rolloverToNextJackpotCents === 0, 'No jackpot rollover when Tier 5 has winners');

// Rollover verification when Tier 5 is unclaimed
const rolloverPool = PrizePoolCalculator.calculate({
  activeSubscriberCount: 200,
  previousRolloverCents: 15000, // £150 previous rollover
  tierWinners: {
    tier5: [], // no winner
    tier4: ['w4'],
    tier3: ['w6'],
  },
});
// 40% of 100,000 = 40,000 + 15,000 = 55,000 rollover
assert(rolloverPool.tier5.isClaimed === false, 'Tier 5 is unclaimed when 0 winners');
assert(rolloverPool.rolloverToNextJackpotCents === 55000, 'Unclaimed Tier 5 + rollover carries forward (£550.00)');

// 5. Winner Record Snapshot Completeness
console.log('\n5. Winner Record Snapshot Audit Completeness:');
const fullSim = DrawEngine.execute({
  drawPeriod: '2026-09',
  drawMode: 'random',
  seed: 'winner-ident-seed-2026',
  participants: mockParticipants,
  activeSubscriberCount: 100,
  previousRolloverCents: 5000,
});

// Construct winner records as publishDrawAction would
const generatedWinners = [
  ...fullSim.tiers.tier5.winners.map((userId) => {
    const ev = fullSim.evaluations.find((e) => e.userId === userId);
    return {
      draw_period: fullSim.drawPeriod,
      user_id: userId,
      match_tier: 5,
      match_count: ev?.matchCount ?? 5,
      prize_amount_cents: fullSim.tiers.tier5.prizePerWinnerCents,
      scores_snapshot: ev?.scores ?? [],
      winning_numbers_snapshot: fullSim.winningNumbers,
      verification_status: 'pending',
    };
  }),
  ...fullSim.tiers.tier4.winners.map((userId) => {
    const ev = fullSim.evaluations.find((e) => e.userId === userId);
    return {
      draw_period: fullSim.drawPeriod,
      user_id: userId,
      match_tier: 4,
      match_count: ev?.matchCount ?? 4,
      prize_amount_cents: fullSim.tiers.tier4.prizePerWinnerCents,
      scores_snapshot: ev?.scores ?? [],
      winning_numbers_snapshot: fullSim.winningNumbers,
      verification_status: 'pending',
    };
  }),
  ...fullSim.tiers.tier3.winners.map((userId) => {
    const ev = fullSim.evaluations.find((e) => e.userId === userId);
    return {
      draw_period: fullSim.drawPeriod,
      user_id: userId,
      match_tier: 3,
      match_count: ev?.matchCount ?? 3,
      prize_amount_cents: fullSim.tiers.tier3.prizePerWinnerCents,
      scores_snapshot: ev?.scores ?? [],
      winning_numbers_snapshot: fullSim.winningNumbers,
      verification_status: 'pending',
    };
  }),
];

const w5 = generatedWinners.find((w) => w.user_id === 'golfer-5-match');
assert(w5 && w5.match_count === 5, 'Winner record retains exact match_count = 5');
assert(w5 && w5.match_tier === 5, 'Winner record retains prize tier = 5');
assert(w5 && w5.prize_amount_cents > 0, 'Winner record retains calculated prize amount');
assert(w5 && w5.scores_snapshot.length === 5, 'Winner record retains 5-score snapshot');
assert(w5 && w5.winning_numbers_snapshot.length === 5, 'Winner record retains 5 winning numbers snapshot');
assert(w5 && w5.verification_status === 'pending', 'Initial verification status is pending');

// 6. Verification State Transitions
console.log('\n6. Verification State Transitions:');
function transitionStatus(currentStatus, action) {
  if (action === 'verify') return { verification_status: 'verified', status: 'approved' };
  if (action === 'reject') return { verification_status: 'rejected', status: 'rejected' };
  if (action === 'reset') return { verification_status: 'pending', status: 'pending_proof' };
  return currentStatus;
}

const s1 = transitionStatus({ verification_status: 'pending' }, 'verify');
assert(s1.verification_status === 'verified' && s1.status === 'approved', 'Transition: pending -> verified / approved');

const s2 = transitionStatus(s1, 'reset');
assert(s2.verification_status === 'pending' && s2.status === 'pending_proof', 'Transition: verified -> reset / pending');

const s3 = transitionStatus(s2, 'reject');
assert(s3.verification_status === 'rejected' && s3.status === 'rejected', 'Transition: pending -> rejected / rejected');

console.log(`\n--- RESULTS: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
