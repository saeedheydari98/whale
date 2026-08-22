UPDATE "Order"
SET "fulfillmentStatus" = 'processing'
WHERE "fulfillmentStatus" = 'in_transit';

UPDATE "OrderStatusEvent"
SET "status" = 'processing'
WHERE "status" = 'in_transit';
