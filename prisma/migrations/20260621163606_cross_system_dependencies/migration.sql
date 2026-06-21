-- CreateTable
CREATE TABLE "Dependency" (
    "id" TEXT NOT NULL,
    "dependentId" TEXT NOT NULL,
    "blockerId" TEXT NOT NULL,
    "systemLabel" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dependency_dependentId_idx" ON "Dependency"("dependentId");

-- CreateIndex
CREATE INDEX "Dependency_blockerId_idx" ON "Dependency"("blockerId");

-- CreateIndex
CREATE UNIQUE INDEX "Dependency_dependentId_blockerId_key" ON "Dependency"("dependentId", "blockerId");

-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_dependentId_fkey" FOREIGN KEY ("dependentId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dependency" ADD CONSTRAINT "Dependency_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "Initiative"("id") ON DELETE CASCADE ON UPDATE CASCADE;
