# Performance and Integration Notes

Updated: 2026-09-05

## Primary-source findings

- NestJS documents Fastify as a faster HTTP adapter, but also warns that
  Express-specific middleware and recipes must be replaced. This project still
  depends on Express request/response APIs for cookies and grammY webhooks, so an
  adapter migration should follow profiling and an integration test, not precede
  them: <https://docs.nestjs.com/techniques/performance>.
- NestJS response caching is useful for repeatable public reads, but this system's
  case and message responses contain sensitive, user-specific data. Global server
  caching would create privacy and invalidation risk:
  <https://docs.nestjs.com/techniques/caching>.
- TanStack Query uses `staleTime` to avoid unnecessary refetches and `gcTime` to
  control inactive cache retention:
  <https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults>.
- Supabase recommends aligning indexes with `WHERE`, join, and `ORDER BY` patterns
  and validating them with real query plans:
  <https://supabase.com/docs/guides/database/query-optimization>.
- Supabase recommends direct or session-pooled connections for long-running
  backends and session mode for migrations when direct IPv6 is unavailable:
  <https://supabase.com/docs/guides/database/connecting-to-postgres>.
- Telegram documents webhook retries, `update_id` duplicate detection, webhook
  secrets, and the pending-update retention window:
  <https://core.telegram.org/bots/api#setwebhook>.
- grammY requires choosing polling or webhooks and supports Express and Fastify
  adapters: <https://grammy.dev/guide/deployment-types>.

## Implemented decisions

- Keep NestJS on Express for this increment. Payload minimization, pagination,
  query selection, and indexes address demonstrated issues without destabilizing
  cookie and Telegram webhook behavior.
- Return only fields used by clients. Message reads no longer join sender records,
  and conversation responses no longer expose internal student IDs.
- Add composite indexes for status-ordered triage and chronological/response-time
  message queries. Keep index usage under observation as production data grows.
- Use a 15-second authenticated, in-memory TanStack Query freshness window and a
  two-minute inactive cache lifetime. SSE invalidates changed resources and logout
  clears the per-session cache.
- Send `Cache-Control: private, no-store` for backend responses. Sensitive message
  content is never placed in a shared server, proxy, or CDN cache.
- Preserve Telegram pending updates on deployment, require URL + secret in webhook
  mode, request only message/callback updates, and split long histories below
  Telegram's message-size limit using plain text.
- Keep website and bot writes on the same application services. Student follow-ups
  reopen the case as `UNANSWERED`, notify staff with metadata only, and emit
  dashboard events.
- Send named SSE events with a 25-second heartbeat; the browser listens to each
  named event and reconnects with bounded exponential backoff.

## Follow-up performance work

- Capture p50/p95 API and database latency before considering Fastify.
- Add durable Telegram `update_id` idempotency before enabling concurrent webhook
  processing or multiple backend replicas.
- Replace in-process Telegram session maps and SSE subjects before horizontal
  scaling. A single backend replica remains the supported topology for now.
- Review Supabase Query Performance and unused-index advisors after representative
  production traffic; newly created indexes cannot show usage immediately.
