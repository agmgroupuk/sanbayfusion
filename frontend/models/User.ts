/**
 * User - Prisma Types
 */
export type { User } from '@prisma/client';

export interface IUser {
  id: string;
  email: string;
  name?: string | null;
  password?: string | null;
  avatar?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
