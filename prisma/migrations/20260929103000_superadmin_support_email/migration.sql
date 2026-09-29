-- Canonical superadmin inbox (idempotent; matches manual Neon/console updates).
UPDATE "users"
SET
  "email" = 'whalestoresupport@gmail.com',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  "username" = '09176991556'
  AND "role" = 'superadmin'
  AND "email" IS DISTINCT FROM 'whalestoresupport@gmail.com';

UPDATE "CustomerProfile" AS cp
SET
  "email" = 'whalestoresupport@gmail.com',
  "updatedAt" = CURRENT_TIMESTAMP
FROM "users" AS u
WHERE
  cp."userId" = u."id"
  AND u."username" = '09176991556'
  AND u."role" = 'superadmin'
  AND cp."email" IS DISTINCT FROM 'whalestoresupport@gmail.com';
