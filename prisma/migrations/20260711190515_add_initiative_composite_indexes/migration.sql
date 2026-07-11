-- CreateIndex
CREATE INDEX "Initiative_organizationId_classification_idx" ON "Initiative"("organizationId", "classification");

-- CreateIndex
CREATE INDEX "Initiative_organizationId_isRegulatory_idx" ON "Initiative"("organizationId", "isRegulatory");

-- CreateIndex
CREATE INDEX "Initiative_organizationId_businessUnit_idx" ON "Initiative"("organizationId", "businessUnit");

-- CreateIndex
CREATE INDEX "Initiative_organizationId_businessHeadName_idx" ON "Initiative"("organizationId", "businessHeadName");

-- CreateIndex
CREATE INDEX "Initiative_organizationId_programHeadName_idx" ON "Initiative"("organizationId", "programHeadName");

-- CreateIndex
CREATE INDEX "Initiative_organizationId_programManagerName_idx" ON "Initiative"("organizationId", "programManagerName");
