-- CreateTable
CREATE TABLE "user_history" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_history_userId_kind_createdAt_idx" ON "user_history"("userId", "kind", "createdAt");
