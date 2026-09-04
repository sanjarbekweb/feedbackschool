-- The unique email index already supports credential lookups; a second plain
-- email index only adds write/storage overhead.
DROP INDEX IF EXISTS "users_email_idx";

-- Cover the Message -> User foreign key for role changes and retention work.
CREATE INDEX IF NOT EXISTS "messages_senderId_idx" ON "messages"("senderId");
