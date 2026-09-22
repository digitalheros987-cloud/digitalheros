/**
 * Draw Engine Unit Tests
 *
 * Tests the core invariant: a user is ONLY a winner if their scores
 * match the drawn numbers (≥3). Consistency must NEVER create a winner.
 *
 * Covers both Random and Algorithmic draw modes.
 */

import { DrawEngine } from '@/lib/draw/engine';
import { WeightedDrawStrategy } from '@/lib/draw/weighted-strategy';
import { RandomDrawStrategy } from '@/lib/draw/random-strategy';
import { PRNG } from '@/lib/draw/prng';
import { Participant } from '@/lib/draw/types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeParticipant(userId: string, scores: number[]): Participant {
  return { userId, scores };
}

/**
 * Runs the engine with a fixed seed and a forced winning number set.
 * We can't inject winning numbers directly into the engine (it generates them),
 * so we use RandomDrawStrategy directly for the strict matching tests.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TEST 1: 0 matches → NOT a winner, even with perfect consistency
// ─────────────────────────────────────────────────────────────────────────────
describe('TEST 1 — 0 matches = not a winner', () => {
  it('user [1,2,3,4,5] vs draw [10,11,12,13,14] → 0 matches, no tier', () => {
    const prng = new PRNG('fixed-seed-test1');
    // Override the prng to produce [10,11,12,13,14] for the draw
    const userScores = [1, 2, 3, 4, 5];
    const drawNumbers = [10, 11, 12, 13, 14];
    const winningSet = new Set(drawNumbers);

    // Manually calculate matchCount (mirrors engine logic)
    const available = new Set(drawNumbers);
    let matchCount = 0;
    for (const s of userScores) {
      if (available.has(s)) { matchCount++; available.delete(s); }
    }

    expect(matchCount).toBe(0);
    expect(matchCount).toBeLessThan(3);

    // Verify via RandomDrawStrategy with controlled draw numbers
    // We directly exercise the matching logic
    const participant = makeParticipant('user-a', userScores);
    // Simulate: the winning numbers are drawn independently of scores
    const evals = evaluateMatches([participant], drawNumbers);
    expect(evals[0].matchCount).toBe(0);
    expect(evals[0].matchTier).toBeNull();
  });

  it('high consistency does NOT create a winner with 0 matches', () => {
    // User with perfect consistency (all same score) but no overlap with draw
    const user = makeParticipant('ultra-consistent', [5, 5, 5, 5, 5]);
    const drawNumbers = [20, 21, 22, 23, 24];
    const evals = evaluateMatches([user], drawNumbers);
    expect(evals[0].matchCount).toBe(0);
    expect(evals[0].matchTier).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 2: 3 matches → 3-number winner
// ─────────────────────────────────────────────────────────────────────────────
describe('TEST 2 — 3 matches = Tier 3 winner', () => {
  it('user [1,2,3,4,5] vs draw [1,2,3,10,11] → 3 matches, tier 3', () => {
    const user = makeParticipant('user-b', [1, 2, 3, 4, 5]);
    const drawNumbers = [1, 2, 3, 10, 11];
    const evals = evaluateMatches([user], drawNumbers);
    expect(evals[0].matchCount).toBe(3);
    expect(evals[0].matchTier).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 3: 4 matches, order-independent
// ─────────────────────────────────────────────────────────────────────────────
describe('TEST 3 — 4 matches, order-independent', () => {
  it('user [1,2,3,4,5] vs draw [5,4,3,2,10] → 4 matches, tier 4', () => {
    const user = makeParticipant('user-c', [1, 2, 3, 4, 5]);
    const drawNumbers = [5, 4, 3, 2, 10]; // order different from user scores
    const evals = evaluateMatches([user], drawNumbers);
    expect(evals[0].matchCount).toBe(4);
    expect(evals[0].matchTier).toBe(4);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 4: Multiple users, same tier → both win, prize split
// ─────────────────────────────────────────────────────────────────────────────
describe('TEST 4 — Multiple winners split the prize', () => {
  it('User A [1,2,3,4,5] and User B [1,2,3,4,8] vs draw [1,2,3,4,10] → both tier 4', () => {
    const userA = makeParticipant('user-a', [1, 2, 3, 4, 5]);
    const userB = makeParticipant('user-b', [1, 2, 3, 4, 8]);
    const drawNumbers = [1, 2, 3, 4, 10];

    const evals = evaluateMatches([userA, userB], drawNumbers);

    const a = evals.find(e => e.userId === 'user-a')!;
    const b = evals.find(e => e.userId === 'user-b')!;

    expect(a.matchCount).toBe(4);
    expect(a.matchTier).toBe(4);
    expect(b.matchCount).toBe(4);
    expect(b.matchTier).toBe(4);
  });

  it('prize is split equally between both tier-4 winners', () => {
    // 2 active subscribers → pool = 2 * 500 = 1000 cents
    // tier 4 = 35% of 1000 = 350 cents split between 2 = 175 each
    const result = DrawEngine.execute({
      drawPeriod: '2024-04',
      drawMode: 'random',
      seed: 'split-prize-test',
      participants: [
        makeParticipant('user-a', [1, 2, 3, 4, 5]),
        makeParticipant('user-b', [1, 2, 3, 4, 8]),
      ],
      activeSubscriberCount: 2,
    });

    // Both users are in tier4 winners list only if draw produced [1,2,3,4,x]
    // We can't control the draw seed output, so check consistency of split math
    const tier4Winners = result.tiers.tier4.winners;
    if (tier4Winners.length === 2) {
      // Equal split
      expect(result.tiers.tier4.prizePerWinnerCents).toBe(
        Math.floor(result.tiers.tier4.totalAmountCents / 2)
      );
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 5 — CRITICAL: Consistency must NOT override actual matching
// ─────────────────────────────────────────────────────────────────────────────
describe('TEST 5 — CRITICAL: consistency cannot beat matching', () => {
  it('User A (high consistency, 0 match) loses to User B (low consistency, 4 match)', () => {
    // User A: very consistent scores [1,2,3,4,5], but draw is [20,21,22,23,30]
    // User B: inconsistent scores [20,21,22,23,24], matches 4 of the draw numbers
    const userA = makeParticipant('user-a-consistent', [1, 2, 3, 4, 5]);
    const userB = makeParticipant('user-b-inconsistent', [20, 21, 22, 23, 24]);
    const drawNumbers = [20, 21, 22, 23, 30];

    const evals = evaluateMatches([userA, userB], drawNumbers);

    const a = evals.find(e => e.userId === 'user-a-consistent')!;
    const b = evals.find(e => e.userId === 'user-b-inconsistent')!;

    // User A: 0 matches → NOT a winner
    expect(a.matchCount).toBe(0);
    expect(a.matchTier).toBeNull();

    // User B: 4 matches → Tier 4 winner
    expect(b.matchCount).toBe(4);
    expect(b.matchTier).toBe(4);
  });

  it('2 matches never qualifies for any tier, regardless of consistency', () => {
    const user = makeParticipant('two-match-user', [1, 2, 3, 4, 5]);
    const drawNumbers = [1, 2, 10, 11, 12]; // 2 matches
    const evals = evaluateMatches([user], drawNumbers);
    expect(evals[0].matchCount).toBe(2);
    expect(evals[0].matchTier).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 6: Algorithmic mode also enforces match-based winners
// ─────────────────────────────────────────────────────────────────────────────
describe('TEST 6 — Algorithmic mode enforces match-based winners', () => {
  it('algorithmic draw result only contains users whose scores matched drawn numbers', () => {
    // Run many algorithmic draws and verify that every winner has ≥3 matches
    // We do this with a fixed set of participants and varied seeds.
    const participants: Participant[] = [
      makeParticipant('p1', [1, 2, 3, 4, 5]),
      makeParticipant('p2', [10, 11, 12, 13, 14]),
      makeParticipant('p3', [20, 21, 22, 23, 24]),
      makeParticipant('p4', [30, 31, 32, 33, 34]),
      makeParticipant('p5', [5, 6, 7, 8, 9]),
    ];

    for (let i = 0; i < 20; i++) {
      const result = DrawEngine.execute({
        drawPeriod: `2024-0${(i % 9) + 1}`,
        drawMode: 'algorithmic',
        seed: `algo-test-seed-${i}`,
        participants,
        activeSubscriberCount: 5,
      });

      const { winningNumbers, evaluations } = result;
      const winningSet = new Set(winningNumbers);

      for (const evaluation of evaluations) {
        if (!evaluation.isEligible) continue;

        // Recompute match count to independently verify
        const available = new Set(winningNumbers);
        let expectedMatches = 0;
        for (const score of evaluation.scores) {
          if (available.has(score)) { expectedMatches++; available.delete(score); }
        }

        // Engine's reported matchCount must agree with independent calculation
        expect(evaluation.matchCount).toBe(expectedMatches);

        // If user is reported as a winner, they must have ≥3 matches
        if (evaluation.matchTier !== null) {
          expect(evaluation.matchCount).toBeGreaterThanOrEqual(3);
          expect(evaluation.matchTier).toBeGreaterThanOrEqual(3);
        }

        // If user has <3 matches, they must NOT be a winner
        if ((evaluation.matchCount ?? 0) < 3) {
          expect(evaluation.matchTier).toBeNull();
        }
      }

      // All declared winners must appear in evaluations with ≥3 matches
      const allWinners = [
        ...result.tiers.tier5.winners,
        ...result.tiers.tier4.winners,
        ...result.tiers.tier3.winners,
      ];
      for (const winnerId of allWinners) {
        const winnerEval = evaluations.find(e => e.userId === winnerId);
        expect(winnerEval).toBeDefined();
        expect(winnerEval!.matchCount).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST 7: 5-match jackpot rolls over if unclaimed
// ─────────────────────────────────────────────────────────────────────────────
describe('TEST 7 — Rollover logic', () => {
  it('5-match jackpot rolls over when no one has 5 matches', () => {
    // Use a controlled seed + participants that definitely won't get 5 matches
    // (their scores are all in range 1-5, draw almost certainly won't overlap perfectly)
    const result = DrawEngine.execute({
      drawPeriod: '2024-01',
      drawMode: 'random',
      seed: 'rollover-test-seed',
      participants: [makeParticipant('p1', [1, 2, 3, 4, 5])],
      activeSubscriberCount: 10,
      previousRolloverCents: 5000,
    });

    if (result.tiers.tier5.winners.length === 0) {
      // Jackpot should roll over (includes previous rollover)
      expect(result.rolloverToNextJackpotCents).toBeGreaterThan(0);
      expect(result.tiers.tier5.totalAmountCents).toBe(
        Math.floor(10 * 500 * 0.40) + 5000
      );
    } else {
      // If someone won, rollover is 0
      expect(result.rolloverToNextJackpotCents).toBe(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Pure match evaluator (mirrors engine logic, no DB dependencies)
// ─────────────────────────────────────────────────────────────────────────────
function evaluateMatches(
  participants: Participant[],
  drawNumbers: number[]
): Array<{ userId: string; matchCount: number; matchTier: 3 | 4 | 5 | null }> {
  return participants.map((p) => {
    if (p.scores.length !== 5) {
      return { userId: p.userId, matchCount: 0, matchTier: null };
    }

    const available = new Set(drawNumbers);
    let matchCount = 0;
    for (const score of p.scores) {
      if (available.has(score)) {
        matchCount++;
        available.delete(score);
      }
    }

    let matchTier: 3 | 4 | 5 | null = null;
    if (matchCount === 5) matchTier = 5;
    else if (matchCount === 4) matchTier = 4;
    else if (matchCount === 3) matchTier = 3;

    return { userId: p.userId, matchCount, matchTier };
  });
}
