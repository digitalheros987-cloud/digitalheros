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
 * Implements the mathematical specification from docs/DRAW_ALGORITHM.md:
 * - Calculates standard deviation of the latest 5 Stableford scores.
 * - Converts variance into probability weights: W_i = 1 / (sigma_i + 1).
 * - Blends with uniform probability using alpha = 0.8 to ensure probabilistic selection.
 * - Selects winners without replacement for Tier 5 (40%), Tier 4 (35%), and Tier 3 (25%).
 */
export class WeightedDrawStrategy {
  static ALPHA = 0.8; // Tuning parameter for consistency vs randomness

  /**
   * Calculates population mean and standard deviation of 5 numbers
   */
  static calculateStats(scores: number[]): { mean: number; stdDev: number } {
    if (scores.length === 0) return { mean: 0, stdDev: 0 };
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    return { mean, stdDev };
  }

  static execute(
    participants: Participant[],
    prng: PRNG,
    alpha = WeightedDrawStrategy.ALPHA
  ): WeightedStrategyOutput {
    const eligible: Array<{ participant: Participant; stdDev: number; baseWeight: number }> = [];
    const ineligibleEvaluations: ParticipantEvaluation[] = [];

    // Step 1: Filter and compute consistency metric for eligible participants
    for (const p of participants) {
      if (p.scores.length !== 5) {
        ineligibleEvaluations.push({
          userId: p.userId,
          scores: p.scores,
          isEligible: false,
          matchTier: null,
          consistencyMetric: null,
          drawWeight: null,
        });
        continue;
      }

      const { stdDev } = this.calculateStats(p.scores);
      // Step 2: Inverted weight with smoothing constant + 1
      const baseWeight = 1 / (stdDev + 1);

      eligible.push({
        participant: p,
        stdDev,
        baseWeight,
      });
    }

    const N = eligible.length;
    const tier5: string[] = [];
    const tier4: string[] = [];
    const tier3: string[] = [];
    const evaluations: ParticipantEvaluation[] = [...ineligibleEvaluations];

    if (N === 0) {
      return {
        winningNumbers: prng.drawUnique(5, 1, 45),
        evaluations,
        tierWinners: { tier5, tier4, tier3 },
        alpha,
      };
    }

    // Step 3: Normalization and blending
    const sumWeights = eligible.reduce((acc, curr) => acc + curr.baseWeight, 0);

    const candidates = eligible.map((item) => {
      const pBase = sumWeights > 0 ? item.baseWeight / sumWeights : 1 / N;
      const finalWeight = alpha * pBase + (1 - alpha) * (1 / N);
      return {
        ...item,
        finalWeight,
      };
    });

    // Step 4: Weighted random selection without replacement
    // Slots: 1 winner for Tier 5, 1 for Tier 4, 1 for Tier 3 (as available)
    const available = [...candidates];

    function drawWinner(): string | null {
      if (available.length === 0) return null;
      const currentSum = available.reduce((acc, c) => acc + c.finalWeight, 0);
      let rand = prng.next() * currentSum;

      for (let i = 0; i < available.length; i++) {
        rand -= available[i].finalWeight;
        if (rand <= 0 || i === available.length - 1) {
          const selected = available.splice(i, 1)[0];
          return selected.participant.userId;
        }
      }
      return null;
    }

    const t5Winner = drawWinner();
    if (t5Winner) tier5.push(t5Winner);

    const t4Winner = drawWinner();
    if (t4Winner) tier4.push(t4Winner);

    const t3Winner = drawWinner();
    if (t3Winner) tier3.push(t3Winner);

    // Build evaluations for auditing
    const tier5Set = new Set(tier5);
    const tier4Set = new Set(tier4);
    const tier3Set = new Set(tier3);

    for (const c of candidates) {
      let matchTier: 3 | 4 | 5 | null = null;
      if (tier5Set.has(c.participant.userId)) matchTier = 5;
      else if (tier4Set.has(c.participant.userId)) matchTier = 4;
      else if (tier3Set.has(c.participant.userId)) matchTier = 3;

      evaluations.push({
        userId: c.participant.userId,
        scores: [...c.participant.scores],
        isEligible: true,
        matchCount: matchTier ? matchTier : 0,
        matchTier,
        consistencyMetric: parseFloat(c.stdDev.toFixed(4)),
        drawWeight: parseFloat(c.finalWeight.toFixed(6)),
      });
    }

    // Determine 5 representative winning numbers to satisfy schema
    // If a Tier 5 winner exists, use their sorted scores as the winning numbers
    let winningNumbers: number[];
    if (t5Winner) {
      const winnerCandidate = candidates.find((c) => c.participant.userId === t5Winner);
      winningNumbers = winnerCandidate ? [...winnerCandidate.participant.scores].sort((a, b) => a - b) : prng.drawUnique(5, 1, 45);
    } else {
      winningNumbers = prng.drawUnique(5, 1, 45);
    }

    return {
      winningNumbers,
      evaluations,
      tierWinners: {
        tier5,
        tier4,
        tier3,
      },
      alpha,
    };
  }
}
