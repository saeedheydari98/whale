-- Legacy codes were created before DiscountCode.name existed. When the admin has
-- exactly one named discount, use that unambiguous name instead of the old label.
UPDATE "DiscountCode"
SET "name" = (
  SELECT "name"
  FROM "DiscountRule"
  ORDER BY "createdAt" DESC
  LIMIT 1
)
WHERE "name" = 'کد تخفیف'
  AND (SELECT COUNT(*) FROM "DiscountRule") = 1;
