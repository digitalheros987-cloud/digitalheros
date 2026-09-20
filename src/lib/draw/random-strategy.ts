import { PRNG } from './prng';
import { Participant, ParticipantEvaluation } from './types';

export interface RandomStrategyOutput {
  winningNumbers: number[];
  evaluations: ParticipantEvaluation[];
  tierWinners: {
    tier5: string[]; // userIds
    tier4: string[];
    tier3: string[];
  };
}

/**
 * Standard Lottery-Style Draw Strategy.
 * Generates 5 unique numbers between 1 and 45.
 * Matches each user's latest 5 Stableford scores against the winning numbers.
 * Assigns each user to their highest applicable tier (5, 4, or 3 matches).
 */
export class RandomDrawStrategy {
  static execute(participants: Participant[], prng: PRNG): RandomStrategyOutput {
    // Generate 5 unique numbers in range [1, 45]
    const winningNumbers = prng.drawUnique(5, 1, 45);
    const winningSet = new Set(winningNumbers);

    const evaluations: ParticipantEvaluation[] = [];
    const tier5: string[] = [];
    const tier4: string[] = [];
    const tier3: string[] = [];

    for (const participant of participants) {
      if (participant.scores.length !== 5) {
        evaluations.push({
          userId: participant.userId,
          scores: participant.scores,
          isEligible: false,
          matchCount: 0,
          matchTier: null,
        });
        continue;
      }

      // Count how many of user's scores match winning numbers
      // In lottery matching, each winning number can be matched at most once.
      const availableWinning = new Set(winningNumbers);
      let matchCount = 0;

      for (const score of participant.scores) {
        if (availableWinning.has(score)) {
          matchCount++;
          availableWinning.delete(score); // prevent matching the same winning number twice
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

      evaluations.push({
        userId: participant.userId,
        scores: [...participant.scores],
        isEligible: true,
        matchCount,
        matchTier,
        consistencyMetric: null,
        drawWeight: null,
      });
    }

    return {
      winningNumbers,
      evaluations,
      tierWinners: {
        tier5,
        tier4,
        tier3,
      },
    };
  }
}
