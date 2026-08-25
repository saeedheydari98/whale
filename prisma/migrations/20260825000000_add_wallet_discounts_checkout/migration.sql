ALTER TABLE "User" ADD COLUMN "walletBalance" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "CommerceSetting" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "cashbackPercent" INTEGER NOT NULL DEFAULT 0,
  "postalShippingFee" INTEGER NOT NULL DEFAULT 30000,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CommerceSetting_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DiscountCode" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'percentage',
  "percent" INTEGER,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DiscountCode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "userId" INTEGER NOT NULL,
  "orderId" TEXT,
  "amount" INTEGER NOT NULL,
  "type" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Order"
  ADD COLUMN "subtotal" TEXT NOT NULL DEFAULT '0',
  ADD COLUMN "discountAmount" TEXT NOT NULL DEFAULT '0',
  ADD COLUMN "walletAmount" TEXT NOT NULL DEFAULT '0',
  ADD COLUMN "shippingAmount" TEXT NOT NULL DEFAULT '0',
  ADD COLUMN "shippingMethod" TEXT NOT NULL DEFAULT 'pickup',
  ADD COLUMN "discountCode" TEXT,
  ADD COLUMN "cashbackEarned" TEXT NOT NULL DEFAULT '0';

CREATE UNIQUE INDEX "DiscountCode_code_key" ON "DiscountCode"("code");
CREATE INDEX "DiscountCode_userId_expiresAt_idx" ON "DiscountCode"("userId", "expiresAt");
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX "WalletTransaction_orderId_idx" ON "WalletTransaction"("orderId");

ALTER TABLE "DiscountCode" ADD CONSTRAINT "DiscountCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CommerceSetting" ("id", "cashbackPercent", "postalShippingFee", "updatedAt")
VALUES (1, 0, 30000, CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
