# Runbook: Railway deploy failures (2025-12-25)

## Context

On 2025-12-25, the Railway deploys for these services failed:

- `api-backoffice`
- `autentique-service`
- `facebook-capi`
- `evolution-manager`

All four builds share the same monorepo and build the workspace `@wolfgang/contracts` first, so a single TypeScript error there blocks every service.

## Root cause #1 (build): `TS2345` in `@wolfgang/contracts`

**File:** `packages/contracts/src/events/message-sent.ts`

`z.discriminatedUnion("type", ...)` requires each option to be a `ZodObject` (a `ZodDiscriminatedUnionOption`), but `OutboundMediaMessageSchema` had `.refine(...)`, which turns the schema into `ZodEffects<ZodObject<...>>`. TypeScript then reports:

- `TS2345: Argument of type '[ZodObject<...>, ZodEffects<...>]' is not assignable to ... ZodDiscriminatedUnionOption`

### Fix

- Introduce `OutboundMediaMessageBaseSchema` (pure `z.object(...)`) and use it as the media option in the discriminated union.
- Keep the same validation rules (`asset_id || url` and `mime_type` required when `url` is used without `asset_id`) via `OutboundMessageSchema.superRefine(...)`.
- Keep `OutboundMediaMessageSchema` as a refined schema for direct use where a refined schema is acceptable (non-discriminated contexts).

### Regression test

- Added `packages/contracts/src/events/message-sent.spec.ts` to cover:
  - valid text message
  - invalid media message missing `asset_id` and `url`
  - invalid media message with `url` but without `mime_type`

## Root cause #2 (runtime): `evolution-manager` healthcheck `/health` returns 503

The Railway logs show the build succeeds, but the healthcheck repeatedly receives `service unavailable` until it fails.

In `evolution-manager`, `MessagesSubscriber` used to `await` Redis subscription during module init.
Even with a working Redis, connection/DNS/proxy delays during startup can cause the subscription step to block the Nest bootstrap and prevent the HTTP server from becoming ready in time for healthchecks.

### Fix

- Make the Redis subscription fire-and-forget at startup (don’t block the HTTP server from listening).
- Add retry-with-backoff for the subscription so the service becomes healthy quickly and the background subscriber attaches once Redis is reachable.
- Ensure we remove the Redis `"message"` listener if `subscribe(...)` fails, avoiding leaked listeners on repeated retries.

### Railway Redis env vars (reference)

The `evolution-manager` container is expected to have (at least) the following:

- `REDIS_URL` (internal): `redis://default:<password>@redis.railway.internal:6379`
- `REDIS_PUBLIC_URL` (external): `redis://default:<password>@trolley.proxy.rlwy.net:<port>`

The service uses `REDIS_URL` by default.

## Verification checklist

- `@wolfgang/contracts` builds successfully (`npm -w @wolfgang/contracts run build`).
- All services build (`npm -w @wolfgang/<service> run build`).
- `evolution-manager` responds `200` on `GET /health`.
- No repeated `message_sent.redis_subscribe_failed` logs (or if present, they stop once Redis is reachable).

