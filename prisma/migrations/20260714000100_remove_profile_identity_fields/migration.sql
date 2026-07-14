ALTER TABLE "CustomerProfile"
DROP COLUMN IF EXISTS "nationalId",
DROP COLUMN IF EXISTS "birthDate";

CREATE INDEX IF NOT EXISTS "CustomerProfile_userId_idx"
ON "CustomerProfile"("userId");

CREATE INDEX IF NOT EXISTS "CustomerProfile_phone_idx"
ON "CustomerProfile"("phone");
