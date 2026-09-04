-- Add a dedicated, revocable web identity instead of overloading studentIdentifier.
ALTER TABLE "users"
  ALTER COLUMN "telegramId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "passwordHash" TEXT,
  ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "credentialVersion" INTEGER NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users"("email");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_email_normalized_chk'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE "users"
      ADD CONSTRAINT "users_email_normalized_chk"
      CHECK ("email" IS NULL OR "email" = lower(btrim("email")))
      NOT VALID;
  END IF;
END
$$;

ALTER TABLE "users" VALIDATE CONSTRAINT "users_email_normalized_chk";

-- The application uses a direct server-side PostgreSQL connection. Its private
-- tables must not also be reachable through Supabase's public Data API roles.
REVOKE ALL PRIVILEGES ON TABLE
  public.users,
  public.conversations,
  public.messages,
  public.audit_logs
FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLES FROM anon, authenticated;

-- Supabase's RLS auto-enable event trigger does not require public RPC access.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END
$$;
