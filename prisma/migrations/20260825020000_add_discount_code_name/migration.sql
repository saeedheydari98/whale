ALTER TABLE "DiscountCode" ADD COLUMN "name" TEXT;

UPDATE "DiscountCode"
SET "name" = COALESCE(
  (SELECT "DiscountRule"."name" FROM "DiscountRule" WHERE "DiscountRule"."id" = "DiscountCode"."ruleId"),
  'کد تخفیف'
);

ALTER TABLE "DiscountCode" ALTER COLUMN "name" SET NOT NULL;
