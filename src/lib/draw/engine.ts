import { PRNG } from './prng';
import { RandomDrawStrategy } from './random-strategy';
import { WeightedDrawStrategy } from './weighted-strategy';
import { PrizePoolCalculator } from './prize-pool';
import { DrawEngineConfig, DrawSimulationResult } from './types';

export class DrawEngine {
  /**
   * Executes a draw simulation or calculation with complete reproducibility.
   * Pure function: does not interact with database or external state.
   */
  static execute(config: DrawEngineConfig): DrawSimulationResult {
    const {
      drawPeriod,
      drawMode,
      seed = `dh_${drawPeriod}_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      participants,
      activeSubscriberCount,
      previousRolloverCents = 0,
      algorithmVersion = 'v1',
    } = config;

    const prng = new PRNG(seed);

    // Filter eligible participants (must have exactly 5 scores)
    const eligibleCount = participants.filter((p) => p.scores && p.scores.length === 5).length;

    // Execute selected draw strategy
    let winningNumbers: number[];
    let evaluations;
    let tierWinners;
    let strategyMetadata: Record<string, unknown> = {};

    if (drawMode === 'random') {
      const result = RandomDrawStrategy.execute(participants, prng);
      winningNumbers = result.winningNumbers;
      evaluations = result.evaluations;
      tierWinners = result.tierWinners;
      strategyMetadata = { strategy: 'random' };
    } else if (drawMode === 'algorithmic') {
      const result = WeightedDrawStrategy.execute(participants, prng);
      winningNumbers = result.winningNumbers;
      evaluations = result.evaluations;
      tierWinners = result.tierWinners;
      strategyMetadata = {
        strategy: 'algorithmic',
        alpha: result.alpha,
      };
    } else {
      throw new Error(`Unsupported draw mode: ${drawMode}`);
    }

    // Calculate prize pool allocations & rollover
    const prizePool = PrizePoolCalculator.calculate({
      activeSubscriberCount,
      previousRolloverCents,
      tierWinners,
    });

    return {
      drawPeriod,
      drawMode,
      algorithmVersion,
      seed,
      totalSubscribers: activeSubscriberCount,
      eligibleParticipantCount: eligibleCount,
      totalPoolCents: prizePool.totalPoolCents,
      winningNumbers,
      tiers: {
        tier5: prizePool.tier5,
        tier4: prizePool.tier4,
        tier3: prizePool.tier3,
      },
      rolloverToNextJackpotCents: prizePool.rolloverToNextJackpotCents,
      evaluations,
      metadata: {
        ...strategyMetadata,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
