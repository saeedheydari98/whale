UPDATE "CustomerProfile"
SET "firstName" = ''
WHERE "firstName" = 'User'
  AND BTRIM("lastName") = '';
