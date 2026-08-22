DELETE FROM "AuthOtp";

DROP INDEX IF EXISTS "AuthOtp_phone_purpose_consumedAt_expiresAt_idx";

ALTER TABLE "AuthOtp"
ADD COLUMN "email" TEXT NOT NULL,
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "AuthOtp_phone_email_purpose_consumedAt_expiresAt_idx"
ON "AuthOtp"("phone", "email", "purpose", "consumedAt", "expiresAt");

ALTER TABLE "User"
DROP COLUMN IF EXISTS "passwordHash",
DROP COLUMN IF EXISTS "resetTokenHash",
DROP COLUMN IF EXISTS "resetTokenExpiresAt";
