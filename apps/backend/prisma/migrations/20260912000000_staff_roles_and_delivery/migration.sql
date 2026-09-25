CREATE TABLE "staff_roles" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "staff_roles" ("id", "name") VALUES ('psychologist', 'Psixolog'), ('principal', 'Direktor');
ALTER TABLE "users" ADD COLUMN "staffRoleId" TEXT, ADD COLUMN "displayName" TEXT;
UPDATE "users" SET "staffRoleId" = 'psychologist' WHERE "role" = 'STAFF';
ALTER TABLE "users" ADD CONSTRAINT "users_staffRoleId_fkey" FOREIGN KEY ("staffRoleId") REFERENCES "staff_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "conversations" ADD COLUMN "recipientRoleId" TEXT NOT NULL DEFAULT 'psychologist';
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_recipientRoleId_fkey" FOREIGN KEY ("recipientRoleId") REFERENCES "staff_roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "conversations_recipientRoleId_status_lastMessageAt_idx" ON "conversations"("recipientRoleId", "status", "lastMessageAt" DESC);
CREATE INDEX "conversations_studentId_lastMessageAt_idx" ON "conversations"("studentId", "lastMessageAt" DESC);
CREATE INDEX "messages_conversationId_createdAt_id_idx" ON "messages"("conversationId", "createdAt", "id");
CREATE TABLE "notification_jobs" (
  "id" TEXT PRIMARY KEY,
  "kind" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "notification_jobs_availableAt_createdAt_idx" ON "notification_jobs"("availableAt", "createdAt");

CREATE TABLE "bot_sessions" ("id" TEXT PRIMARY KEY, "data" JSONB NOT NULL, "expiresAt" TIMESTAMP(3) NOT NULL);
CREATE INDEX "bot_sessions_expiresAt_idx" ON "bot_sessions"("expiresAt");

ALTER TABLE "messages" ADD COLUMN "sourceKey" TEXT;
CREATE UNIQUE INDEX "messages_sourceKey_key" ON "messages"("sourceKey");
CREATE INDEX "users_staffRoleId_role_isActive_idx" ON "users"("staffRoleId", "role", "isActive");
