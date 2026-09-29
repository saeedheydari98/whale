ALTER TABLE "CustomerProfile"
ADD COLUMN IF NOT EXISTS "email" TEXT;

ALTER TABLE "CustomerProfile"
DROP COLUMN IF EXISTS "themeMode";

CREATE TABLE IF NOT EXISTS "AuthOtp" (
  "id" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "purpose" TEXT NOT NULL DEFAULT 'login',
  "consumedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuthOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuthOtp_phone_purpose_consumedAt_expiresAt_idx"
ON "AuthOtp"("phone", "purpose", "consumedAt", "expiresAt");

DO $$
DECLARE
  old_superadmin_id INTEGER;
  phone_superadmin_id INTEGER;
BEGIN
  SELECT "id" INTO old_superadmin_id FROM "User" WHERE "username" = 'saeedheydari98' LIMIT 1;
  SELECT "id" INTO phone_superadmin_id FROM "User" WHERE "username" = '09176991556' LIMIT 1;

  IF old_superadmin_id IS NOT NULL AND phone_superadmin_id IS NULL THEN
    UPDATE "User"
    SET
      "username" = '09176991556',
      "email" = '09176991556@local.user',
      "role" = 'superadmin',
      "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = old_superadmin_id;
  ELSIF phone_superadmin_id IS NOT NULL THEN
    UPDATE "User"
    SET "role" = 'superadmin', "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = phone_superadmin_id;

    IF old_superadmin_id IS NOT NULL AND old_superadmin_id <> phone_superadmin_id THEN
      UPDATE "User"
      SET "role" = 'user', "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = old_superadmin_id;
    END IF;
  END IF;
END $$;
