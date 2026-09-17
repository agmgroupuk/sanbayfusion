/**
 * Debate - Prisma Types
 */
export type { Debate } from '@prisma/client';

export interface IDebate {
  id: string;
  topic: string;
  model1: string;
  model2: string;
  rounds: Array<{
    roundNumber: number;
    model1Response: string;
    model2Response: string;
    timestamp: Date;
  }>;
  votes: {
    model1: number;
    model2: number;
  };
  status: 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface IDebateVote {
  id: string;
  debateId: string;
  visitorId: string;
  votedFor: 'model1' | 'model2';
  timestamp: Date;
}
