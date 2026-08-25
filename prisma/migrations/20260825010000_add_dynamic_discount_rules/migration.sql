CREATE TABLE "DiscountRule" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "audienceType" TEXT NOT NULL,
  "minimumValue" INTEGER NOT NULL DEFAULT 1,
  "lookbackDays" INTEGER NOT NULL DEFAULT 30,
  "discountType" TEXT NOT NULL DEFAULT 'percentage',
  "percent" INTEGER,
  "validDays" INTEGER NOT NULL DEFAULT 30,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastRunAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DiscountCode" ADD COLUMN "ruleId" TEXT;
CREATE UNIQUE INDEX "DiscountCode_ruleId_userId_key" ON "DiscountCode"("ruleId", "userId");
ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "DiscountRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
