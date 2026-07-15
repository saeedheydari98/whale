ALTER TABLE "Order"
ADD COLUMN "fulfillmentStatus" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN "trackingCode" TEXT,
ADD COLUMN "shippedAt" TIMESTAMP(3);

CREATE INDEX "Order_fulfillmentStatus_idx" ON "Order"("fulfillmentStatus");
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
