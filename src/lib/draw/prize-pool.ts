import { PrizeTierSplit } from './types';

export interface PrizePoolInput {
  activeSubscriberCount: number;
  previousRolloverCents?: number;
  tierWinners: {
    tier5: string[];
    tier4: string[];
    tier3: string[];
  };
}

export interface PrizePoolOutput {
  totalPoolCents: number;
  tier5: PrizeTierSplit;
  tier4: PrizeTierSplit;
  tier3: PrizeTierSplit;
  rolloverToNextJackpotCents: number;
}

export class PrizePoolCalculator {
  /**
   * Fixed contribution per active subscription in pence/cents (£5.00).
   * Represents the fixed portion of each subscription that contributes to the prize pool (PRD §07).
   */
  static CONTRIBUTION_PER_SUBSCRIBER_CENTS = 500;

  static calculate(input: PrizePoolInput): PrizePoolOutput {
    const { activeSubscriberCount, previousRolloverCents = 0, tierWinners } = input;

    // Total base prize pool generated from active subscribers
    const totalPoolCents = Math.max(0, activeSubscriberCount * this.CONTRIBUTION_PER_SUBSCRIBER_CENTS);

    // Allocations: 40% / 35% / 25%
    const baseTier5 = Math.floor(totalPoolCents * 0.40);
    const baseTier4 = Math.floor(totalPoolCents * 0.35);
    const baseTier3 = Math.floor(totalPoolCents * 0.25);

    // Tier 5 includes previous rollover jackpot
    const totalTier5 = baseTier5 + previousRolloverCents;
    const totalTier4 = baseTier4;
    const totalTier3 = baseTier3;

    // Equal splitting among multiple winners
    const winners5 = tierWinners.tier5;
    const winners4 = tierWinners.tier4;
    const winners3 = tierWinners.tier3;

    const prizePerWinner5 = winners5.length > 0 ? Math.floor(totalTier5 / winners5.length) : 0;
    const prizePerWinner4 = winners4.length > 0 ? Math.floor(totalTier4 / winners4.length) : 0;
    const prizePerWinner3 = winners3.length > 0 ? Math.floor(totalTier3 / winners3.length) : 0;

    // Rollover rule: Only the 5-number jackpot carries forward if unclaimed
    const rolloverToNextJackpotCents = winners5.length === 0 ? totalTier5 : 0;

    return {
      totalPoolCents,
      tier5: {
        matchTier: 5,
        percentageAllocation: 40,
        totalAmountCents: totalTier5,
        rolloverAmountCents: previousRolloverCents,
        winners: winners5,
        prizePerWinnerCents: prizePerWinner5,
        isClaimed: winners5.length > 0,
      },
      tier4: {
        matchTier: 4,
        percentageAllocation: 35,
        totalAmountCents: totalTier4,
        rolloverAmountCents: 0,
        winners: winners4,
        prizePerWinnerCents: prizePerWinner4,
        isClaimed: winners4.length > 0,
      },
      tier3: {
        matchTier: 3,
        percentageAllocation: 25,
        totalAmountCents: totalTier3,
        rolloverAmountCents: 0,
        winners: winners3,
        prizePerWinnerCents: prizePerWinner3,
        isClaimed: winners3.length > 0,
      },
      rolloverToNextJackpotCents,
    };
  }
}
