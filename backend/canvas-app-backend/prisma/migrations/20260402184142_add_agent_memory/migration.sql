-- CreateTable
CREATE TABLE "agent_memories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "memories" JSONB NOT NULL DEFAULT '[]',
    "summary" TEXT,
    "totalMemories" INTEGER NOT NULL DEFAULT 0,
    "lastAccessed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_memories_userId_idx" ON "agent_memories"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "agent_memories_agentId_userId_key" ON "agent_memories"("agentId", "userId");
