import { PRNG } from './prng';
import { Participant, ParticipantEvaluation } from './types';

export interface WeightedStrategyOutput {
  winningNumbers: number[];
  evaluations: ParticipantEvaluation[];
  tierWinners: {
    tier5: string[]; // userIds
    tier4: string[];
    tier3: string[];
  };
  alpha: number;
}

/**
 * Consistency-Based Algorithmic Draw Strategy.
 *
 * TWO-STAGE PROCESS (PRD-compliant):
 *
 * STAGE 1 — WEIGHTED DRAW NUMBER GENERATION
 *   Consistency (score standard deviation) influences which 5 numbers are
 *   drawn by biasing the random pool toward numbers that appear most
 *   frequently across all eligible users' scores.
 *   The result of Stage 1 is simply: drawNumbers[5].
 *
 * STAGE 2 — MATCH-BASED WINNER DETERMINATION
 *   Every eligible user's 5 scores are compared, order-independently, against
 *   the 5 draw numbers. Only actual matches (≥3) create winners.
 *   Consistency has NO influence in Stage 2.
 *
 * This ensures: "A user is NEVER a winner unless their numbers matched."
 */
export class WeightedDrawStrategy {
  static ALPHA = 0.8; // Tuning parameter for consistency vs uniform randomness

  /**
   * Calculates population mean and standard deviation of an array of numbers.
   */
  static calculateStats(scores: number[]): { mean: number; stdDev: number } {
    if (scores.length === 0) return { mean: 0, stdDev: 0 };
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev };
  }

  /**
   * STAGE 1: Generate 5 draw numbers biased by score frequency/consistency.
   *
   * The pool of numbers [1-45] is weighted so that numbers which appear more
   * frequently across all eligible users' scores are more likely to be drawn.
   * Additionally, users with higher consistency (lower stdDev) contribute
   * their number frequencies with a heavier weight.
   *
   * This satisfies the PRD's requirement that the algorithmic draw be
   * "weighted by score frequency", while keeping Stage 2 purely match-based.
   */
  static generateWeightedDrawNumbers(
    eligibleParticipants: Array<{ participant: Participant; stdDev: number; consistencyWeight: number }>,
    prng: PRNG,
    alpha: number
  ): number[] {
    // Build a frequency map for numbers 1–45, weighted by each user's consistency
    const numberWeights = new Array(46).fill(0); // index 0 unused, 1-45 used

    const N = eligibleParticipants.length;
    const uniformWeight = 1 / N;

    for (const { participant, consistencyWeight } of eligibleParticipants) {
      // Each participant contributes their score frequencies, weighted by their consistency
      for (const score of participant.scores) {
        if (score >= 1 && score <= 45) {
          numberWeights[score] += consistencyWeight;
        }
      }
    }

    // Blend consistency-weighted frequencies with uniform distribution (alpha parameter)
    // Uniform weight for each number is total_weight / 45
    const totalConsistencyWeight = numberWeights.reduce((a, b) => a + b, 0);
    const uniformNumberWeight = totalConsistencyWeight / 45; // per number

    const finalWeights = numberWeights.map((w) =>
      alpha * w + (1 - alpha) * uniformNumberWeight
    );

    // Weighted draw without replacement (Fisher-Yates weighted variant)
    const drawn: number[] = [];
    const remainingWeights = [...finalWeights]; // index 0 is 0, 1-45 active

    for (let pick = 0; pick < 5; pick++) {
      const totalWeight = remainingWeights.reduce((a, b) => a + b, 0);
      let rand = prng.next() * totalWeight;

      for (let num = 1; num <= 45; num++) {
        rand -= remainingWeights[num];
        if (rand <= 0) {
          drawn.push(num);
          remainingWeights[num] = 0; // remove from pool
          break;
        }
      }
    }

    // Fallback: if draw somehow produced fewer than 5 (edge case with all weights 0)
    if (drawn.length < 5) {
      const fallback = prng.drawUnique(5 - drawn.length, 1, 45);
      const drawnSet = new Set(drawn);
      for (const n of fallback) {
        if (!drawnSet.has(n)) {
          drawn.push(n);
          drawnSet.add(n);
          if (drawn.length === 5) break;
        }
      }
    }

    return drawn.sort((a, b) => a - b);
  }

  static execute(
    participants: Participant[],
    prng: PRNG,
    alpha = WeightedDrawStrategy.ALPHA
  ): WeightedStrategyOutput {
    const eligible: Array<{ participant: Participant; stdDev: number; consistencyWeight: number }> = [];
    const ineligibleEvaluations: ParticipantEvaluation[] = [];

    // Step 1: Filter to participants with exactly 5 scores and compute consistency weights
    for (const p of participants) {
      if (p.scores.length !== 5) {
        ineligibleEvaluations.push({
          userId: p.userId,
          scores: p.scores,
          isEligible: false,
          matchCount: 0,
          matchTier: null,
          consistencyMetric: null,
          drawWeight: null,
        });
        continue;
      }

      const { stdDev } = this.calculateStats(p.scores);
      // W_i = 1 / (sigma_i + 1) — lower stdDev → higher weight
      const consistencyWeight = 1 / (stdDev + 1);

      eligible.push({ participant: p, stdDev, consistencyWeight });
    }

    // ──────────────────────────────────────────────────────────────────
    // STAGE 1: Generate draw numbers
    // ──────────────────────────────────────────────────────────────────
    let winningNumbers: number[];

    if (eligible.length === 0) {
      // No eligible participants — pure random draw
      winningNumbers = prng.drawUnique(5, 1, 45);
    } else {
      winningNumbers = this.generateWeightedDrawNumbers(eligible, prng, alpha);
    }

    const winningSet = new Set(winningNumbers);

    // ──────────────────────────────────────────────────────────────────
    // STAGE 2: Match-based winner determination
    // Every eligible user's scores are compared against winningNumbers.
    // Only actual matches (≥3) qualify for a prize tier.
    // Consistency has NO influence here.
    // ──────────────────────────────────────────────────────────────────
    const tier5: string[] = [];
    const tier4: string[] = [];
    const tier3: string[] = [];
    const evaluations: ParticipantEvaluation[] = [...ineligibleEvaluations];

    // Pre-compute normalised consistency weight for audit display
    const totalConsistencyWeight = eligible.reduce((acc, e) => acc + e.consistencyWeight, 0);
    const N = eligible.length;

    for (const { participant, stdDev, consistencyWeight } of eligible) {
      // Count order-independent matches
      const availableWinning = new Set(winningNumbers);
      let matchCount = 0;

      for (const score of participant.scores) {
        if (availableWinning.has(score)) {
          matchCount++;
          availableWinning.delete(score);
        }
      }

      let matchTier: 3 | 4 | 5 | null = null;
      if (matchCount === 5) {
        matchTier = 5;
        tier5.push(participant.userId);
      } else if (matchCount === 4) {
        matchTier = 4;
        tier4.push(participant.userId);
      } else if (matchCount === 3) {
        matchTier = 3;
        tier3.push(participant.userId);
      }

      // Compute final blended weight for audit purposes only
      const pBase = totalConsistencyWeight > 0 ? consistencyWeight / totalConsistencyWeight : 1 / N;
      const finalWeight = alpha * pBase + (1 - alpha) * (1 / N);

      evaluations.push({
        userId: participant.userId,
        scores: [...participant.scores],
        isEligible: true,
        matchCount,
        matchTier,
        consistencyMetric: parseFloat(stdDev.toFixed(4)),
        drawWeight: parseFloat(finalWeight.toFixed(6)),
      });
    }

    return {
      winningNumbers,
      evaluations,
      tierWinners: { tier5, tier4, tier3 },
      alpha,
    };
  }
}
