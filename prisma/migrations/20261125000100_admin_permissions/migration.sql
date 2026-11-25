ALTER TABLE "users" ADD COLUMN "adminPermissions" JSONB NOT NULL DEFAULT '{}';
CREATE TABLE "AdminPermissionAudit" ("id" SERIAL PRIMARY KEY, "actorId" INTEGER NOT NULL, "userId" INTEGER NOT NULL, "action" TEXT NOT NULL, "before" JSONB NOT NULL, "after" JSONB NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "AdminPermissionAudit_userId_createdAt_idx" ON "AdminPermissionAudit"("userId", "createdAt");
