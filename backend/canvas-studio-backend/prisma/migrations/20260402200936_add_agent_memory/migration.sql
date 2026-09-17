-- CreateTable
CREATE TABLE "agent_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'memory',
    "metadata" JSONB,
    "embedding" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_memories_userId_idx" ON "agent_memories"("userId");

-- CreateIndex
CREATE INDEX "agent_memories_agentId_idx" ON "agent_memories"("agentId");
