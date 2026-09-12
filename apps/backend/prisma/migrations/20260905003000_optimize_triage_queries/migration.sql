-- Remove a duplicate index: the unique constraint already indexes telegramId.
DROP INDEX IF EXISTS "users_telegramId_idx";

-- Match the dashboard's most common status-filtered, latest-activity query.
CREATE INDEX IF NOT EXISTS "conversations_status_lastMessageAt_idx"
ON "conversations"("status", "lastMessageAt" DESC);

-- Support chronological conversation reads and first-response aggregation.
CREATE INDEX IF NOT EXISTS "messages_conversationId_senderType_createdAt_idx"
ON "messages"("conversationId", "senderType", "createdAt");
