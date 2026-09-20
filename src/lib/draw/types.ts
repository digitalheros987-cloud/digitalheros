/**
 * Types for the Digital Heroes Draw & Reward Engine.
 * Pure TypeScript definitions with zero runtime dependencies.
 */

export type DrawMode = 'random' | 'algorithmic';
export type AlgorithmVersion = 'v1';

export interface Participant {
  userId: string;
  /** Exactly 5 Stableford scores */
  scores: number[];
}

export interface ParticipantEvaluation {
  userId: string;
  scores: number[];
  isEligible: boolean;
  matchCount?: number;
  matchTier?: 3 | 4 | 5 | null;
  consistencyMetric?: number | null; // e.g. Standard deviation
  drawWeight?: number | null;        // Calculated probability weight
}

export interface PrizeTierSplit {
  matchTier: 3 | 4 | 5;
  percentageAllocation: number; // 40, 35, or 25
  totalAmountCents: number;
  rolloverAmountCents: number;
  winners: string[]; // userIds of winners in this tier
  prizePerWinnerCents: number;
  isClaimed: boolean;
}

export interface DrawSimulationResult {
  drawPeriod: string;
  drawMode: DrawMode;
  algorithmVersion: AlgorithmVersion;
  seed: string;
  totalSubscribers: number;
  eligibleParticipantCount: number;
  totalPoolCents: number;
  winningNumbers: number[];
  tiers: {
    tier5: PrizeTierSplit;
    tier4: PrizeTierSplit;
    tier3: PrizeTierSplit;
  };
  rolloverToNextJackpotCents: number;
  evaluations: ParticipantEvaluation[];
  metadata: Record<string, unknown>;
}

export interface DrawEngineConfig {
  drawPeriod: string;
  drawMode: DrawMode;
  seed?: string;
  participants: Participant[];
  activeSubscriberCount: number;
  previousRolloverCents?: number;
  algorithmVersion?: AlgorithmVersion;
}
