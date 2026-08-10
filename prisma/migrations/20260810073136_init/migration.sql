-- CreateTable
CREATE TABLE "Response" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "organization" TEXT NOT NULL,
    "functionRole" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationSec" INTEGER,
    "personalScore" REAL NOT NULL,
    "organizationalScore" REAL NOT NULL,
    "overallScore" REAL NOT NULL,
    "band" TEXT NOT NULL,
    "scoresJson" TEXT NOT NULL,
    "straightLined" BOOLEAN NOT NULL DEFAULT false,
    "isDemo" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "responseId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    CONSTRAINT "Answer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "Response" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Response_organization_idx" ON "Response"("organization");

-- CreateIndex
CREATE INDEX "Response_functionRole_idx" ON "Response"("functionRole");

-- CreateIndex
CREATE INDEX "Response_createdAt_idx" ON "Response"("createdAt");

-- CreateIndex
CREATE INDEX "Answer_itemId_idx" ON "Answer"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_responseId_itemId_key" ON "Answer"("responseId", "itemId");
