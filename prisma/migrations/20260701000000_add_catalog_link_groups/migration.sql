CREATE TABLE IF NOT EXISTS "CategoryGroup" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CategoryGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "BrandGroup" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BrandGroup_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "groupId" TEXT;
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "groupId" TEXT;

INSERT INTO "CategoryGroup" ("id", "title", "active", "sortOrder")
VALUES ('default-categories', 'دسته بندی ها', true, 1)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "BrandGroup" ("id", "title", "active", "sortOrder")
VALUES ('default-brands', 'برندها', true, 1)
ON CONFLICT ("id") DO NOTHING;

UPDATE "Category" SET "groupId" = 'default-categories' WHERE "groupId" IS NULL;
UPDATE "Brand" SET "groupId" = 'default-brands' WHERE "groupId" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Category_groupId_fkey'
  ) THEN
    ALTER TABLE "Category"
    ADD CONSTRAINT "Category_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CategoryGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Brand_groupId_fkey'
  ) THEN
    ALTER TABLE "Brand"
    ADD CONSTRAINT "Brand_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "BrandGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
