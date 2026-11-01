-- Distinguish in-person (حضوری) orders from online orders and allow guest walk-in orders
-- that are not linked to a registered customer account.
ALTER TABLE "Order" ADD COLUMN "orderType" TEXT NOT NULL DEFAULT 'online';
ALTER TABLE "Order" ALTER COLUMN "userId" DROP NOT NULL;
CREATE INDEX "Order_orderType_idx" ON "Order"("orderType");
