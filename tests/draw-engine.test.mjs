/**
 * Pure Unit Tests for Draw & Reward Engine.
 * Tests mathematical logic, PRNG determinism, strategy outcomes, and prize pool math.
 * Zero database side-effects.
 */

import { PRNG } from '../src/lib/draw/prng.ts';
import { RandomDrawStrategy } from '../src/lib/draw/random-strategy.ts';
import { WeightedDrawStrategy } from '../src/lib/draw/weighted-strategy.ts';
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

console.log('--- DRAW ENGINE UNIT TESTS ---\n');

// 1. PRNG Determinism & Reproducibility
console.log('1. PRNG Determinism:');
const prng1 = new PRNG('test-seed-12345');
const prng2 = new PRNG('test-seed-12345');
const numbers1 = prng1.drawUnique(5, 1, 45);
const numbers2 = prng2.drawUnique(5, 1, 45);
assert(
  JSON.stringify(numbers1) === JSON.stringify(numbers2),
  'Same seed produces identical drawn numbers'
);
assert(numbers1.length === 5, 'Drawn numbers count is exactly 5');
assert(
  numbers1.every((n) => n >= 1 && n <= 45),
  'All numbers within range [1, 45]'
);
assert(
  new Set(numbers1).size === 5,
  'All 5 numbers are distinct'
);

// 2. Random Draw Strategy & Match Tiers
console.log('\n2. Random Draw Strategy Matching:');
const mockParticipants = [
  // Matches all 5 numbers
  { userId: 'user-5-match', scores: [...numbers1] },
  // Matches 4 numbers
  { userId: 'user-4-match', scores: [numbers1[0], numbers1[1], numbers1[2], numbers1[3], 999] },
  // Matches 3 numbers
  { userId: 'user-3-match', scores: [numbers1[0], numbers1[1], numbers1[2], 888, 999] },
  // Matches 2 numbers (no tier)
  { userId: 'user-2-match', scores: [numbers1[0], numbers1[1], 777, 888, 999] },
  // Duplicate score handling: score contains [n1, n1, ...]
  { userId: 'user-dup-scores', scores: [numbers1[0], numbers1[0], numbers1[1], 888, 999] },
];

const randomOutput = RandomDrawStrategy.execute(mockParticipants, new PRNG('test-seed-12345'));
assert(randomOutput.tierWinners.tier5.includes('user-5-match'), '5-match placed in tier 5');
assert(randomOutput.tierWinners.tier4.includes('user-4-match'), '4-match placed in tier 4');
assert(randomOutput.tierWinners.tier3.includes('user-3-match'), '3-match placed in tier 3');
assert(!randomOutput.tierWinners.tier5.includes('user-2-match') &&
       !randomOutput.tierWinners.tier4.includes('user-2-match') &&
       !randomOutput.tierWinners.tier3.includes('user-2-match'), '2-match user wins no tier');

// Multiset matching: duplicates in ticket cannot double-match single drawn number
const dupEval = randomOutput.evaluations.find((e) => e.userId === 'user-dup-scores');
assert(dupEval && dupEval.matchCount === 2, 'Duplicate score in entry matches drawn number only once (matchCount=2)');

// 3. Weighted Draw Strategy (Score Consistency)
console.log('\n3. Weighted Draw Strategy:');
const consistentUserScores = [36, 36, 36, 36, 36]; // stdDev = 0
const erraticUserScores = [10, 20, 30, 40, 45];   // high stdDev

const statsConsistent = WeightedDrawStrategy.calculateStats(consistentUserScores);
assert(statsConsistent.stdDev === 0, 'Identical scores yield standard deviation of 0');

const statsErratic = WeightedDrawStrategy.calculateStats(erraticUserScores);
assert(statsErratic.stdDev > 10, 'Erratic scores yield large standard deviation');

// Weight test
const weightedOutput = WeightedDrawStrategy.execute(
  [
    { userId: 'consistent', scores: consistentUserScores },
    { userId: 'erratic', scores: erraticUserScores },
  ],
  new PRNG('seed-consistency')
);

const evalConsistent = weightedOutput.evaluations.find((e) => e.userId === 'consistent');
const evalErratic = weightedOutput.evaluations.find((e) => e.userId === 'erratic');
assert(
  evalConsistent.drawWeight > evalErratic.drawWeight,
  'Consistent golfer receives higher draw weight than erratic golfer'
);
assert(
  evalConsistent.drawWeight > 0 && evalErratic.drawWeight > 0,
  'All draw weights are strictly non-negative'
);

// 4. Prize Pool Calculation & Rollover
console.log('\n4. Prize Pool & Rollover Math:');
const prizeOutput = PrizePoolCalculator.calculate({
  activeSubscriberCount: 100, // 100 * £5.00 = £500 (50,000 cents)
  previousRolloverCents: 10000, // £100 rollover
  tierWinners: {
    tier5: ['w1', 'w2'], // 2 winners
    tier4: ['w3'],       // 1 winner
    tier3: [],           // 0 winners (unclaimed)
  },
});

assert(prizeOutput.totalPoolCents === 50000, 'Base prize pool correctly calculated (£500 / 50,000 cents)');
// 40% of 50,000 = 20,000 + 10,000 rollover = 30,000
assert(prizeOutput.tier5.totalAmountCents === 30000, 'Tier 5 pool includes 40% (£200) + £100 rollover (£300 total)');
assert(prizeOutput.tier5.prizePerWinnerCents === 15000, 'Tier 5 split equally between 2 winners (£150 each)');
assert(prizeOutput.tier5.isClaimed === true, 'Tier 5 marked as claimed');
assert(prizeOutput.rolloverToNextJackpotCents === 0, 'Jackpot was claimed so next rollover is £0');

// 35% of 50,000 = 17,500
assert(prizeOutput.tier4.totalAmountCents === 17500, 'Tier 4 gets exactly 35% (£175)');
assert(prizeOutput.tier4.prizePerWinnerCents === 17500, 'Tier 4 single winner gets full amount');

// 25% of 50,000 = 12,500, no winners
assert(prizeOutput.tier3.totalAmountCents === 12500, 'Tier 3 gets exactly 25% (£125)');
assert(prizeOutput.tier3.isClaimed === false, 'Tier 3 marked as unclaimed');

// Test Rollover when Tier 5 is unclaimed
const rolloverOutput = PrizePoolCalculator.calculate({
  activeSubscriberCount: 50, // £250 pool
  previousRolloverCents: 5000, // £50 rollover
  tierWinners: {
    tier5: [], // no winners
    tier4: ['w1'],
    tier3: ['w2'],
  },
});
// 40% of 25,000 = 10,000 + 5,000 = 15,000
assert(
  rolloverOutput.rolloverToNextJackpotCents === 15000,
  'Unclaimed Tier 5 rolls over completely (£150 / 15,000 cents) to next draw'
);

// 5. Complete DrawEngine Execution
console.log('\n5. Full DrawEngine Simulation:');
const engineResult = DrawEngine.execute({
  drawPeriod: '2026-03',
  drawMode: 'random',
  seed: 'test-seed-12345',
  participants: mockParticipants,
  activeSubscriberCount: 10,
  previousRolloverCents: 2000,
});

assert(engineResult.drawPeriod === '2026-03', 'Draw period correctly set');
assert(engineResult.winningNumbers.length === 5, 'Engine outputs 5 winning numbers');
assert(engineResult.tiers.tier5.winners.length > 0, 'Tier 5 winners present in result');
assert(engineResult.evaluations.length === mockParticipants.length, 'All participants evaluated');

console.log(`\n--- RESULTS: ${passed} passed, ${failed} failed ---`);
if (failed > 0) process.exit(1);
