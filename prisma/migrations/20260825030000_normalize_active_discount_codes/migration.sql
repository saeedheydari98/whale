WITH "InvalidActiveCodes" AS (
  SELECT
    "id",
    'A2' || UPPER(SUBSTRING(MD5("id" || "code") FROM 1 FOR 4)) AS "nextCode"
  FROM "DiscountCode"
  WHERE "usedAt" IS NULL
    AND (
      "code" !~ '^[A-Z0-9]{6}$'
      OR "code" !~ '[A-Z]'
      OR "code" !~ '[0-9]'
    )
)
UPDATE "DiscountCode"
SET "code" = "InvalidActiveCodes"."nextCode"
FROM "InvalidActiveCodes"
WHERE "DiscountCode"."id" = "InvalidActiveCodes"."id";
