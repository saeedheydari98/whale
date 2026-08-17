ALTER TABLE "Order"
ALTER COLUMN "fulfillmentStatus" SET DEFAULT 'pending_approval';

UPDATE "Order"
SET "fulfillmentStatus" = CASE
  WHEN "fulfillmentStatus" = 'posted' THEN 'shipped'
  WHEN "fulfillmentStatus" = 'pending' THEN 'pending_approval'
  ELSE "fulfillmentStatus"
END;

CREATE TABLE "OrderStatusEvent" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderStatusEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrderStatusEvent_orderId_createdAt_idx"
ON "OrderStatusEvent"("orderId", "createdAt");

ALTER TABLE "OrderStatusEvent"
ADD CONSTRAINT "OrderStatusEvent_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "OrderStatusEvent" ("id", "orderId", "status", "createdAt")
SELECT CONCAT('legacy-', "id", '-pending'), "id", 'pending_approval', "createdAt"
FROM "Order";

INSERT INTO "OrderStatusEvent" ("id", "orderId", "status", "createdAt")
SELECT CONCAT('legacy-', "id", '-shipped'), "id", 'shipped', COALESCE("shippedAt", "updatedAt")
FROM "Order"
WHERE "fulfillmentStatus" IN ('shipped', 'delivered');

INSERT INTO "OrderStatusEvent" ("id", "orderId", "status", "createdAt")
SELECT CONCAT('legacy-', "id", '-delivered'), "id", 'delivered', "updatedAt"
FROM "Order"
WHERE "fulfillmentStatus" = 'delivered';
