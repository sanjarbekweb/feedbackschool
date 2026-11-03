-- Remove all previous test messages, conversations, and student records
-- This leaves the 5 standard staff roles and administrative accounts intact.

DELETE FROM "messages";
DELETE FROM "conversations";
DELETE FROM "notification_jobs";
DELETE FROM "bot_sessions";
DELETE FROM "audit_logs" WHERE "targetType" = 'CONVERSATION';
DELETE FROM "users" WHERE "role" = 'STUDENT';
