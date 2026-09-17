/**
 * ensureAgent — Upsert an Agent row from the agentRegistry so subscriptions
 * can satisfy the `subscriptions_agentId_fkey` foreign-key constraint.
 */
import prisma from '@/lib/prisma';
import { getAgentConfig } from '@/lib/agentRegistry';

export async function ensureAgent(agentId: string, fallbackName?: string) {
  if (!agentId) return;
  const cfg = getAgentConfig(agentId);
  await prisma.agent.upsert({
    where: { agentId },
    update: {},
    create: {
      agentId,
      name: cfg?.name || fallbackName || agentId,
      specialty: cfg?.specialty || null,
      description: cfg?.description || null,
      avatarUrl: cfg?.avatarUrl || null,
      color: cfg?.color || null,
      tags: cfg?.tags || [],
      specialties: cfg?.personality?.specialties || [],
      systemPrompt: '',
      welcomeMessage: cfg?.welcomeMessage || `Welcome to ${cfg?.name || fallbackName || agentId}`,
    },
  });
}
