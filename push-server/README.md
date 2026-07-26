# PPL push server

A Cloudflare Worker that sends scheduled training reminders to the PPL Tracker
PWA. About 200 lines, no dependencies, free tier.

**It never sees your training data.** All it stores is a push subscription, a
weekly day map (`mon: push`, `wed: pull`, …), an hour, and a timezone. Weights,
reps, and sessions stay in `localStorage` on your phone, exactly as before.

## Why a server is needed at all

iOS has no way to schedule a local notification for a future date from a web
app — the Notification Triggers spec was never shipped. So "remind me at 5pm on
Monday" has to come from outside the phone, which means Web Push, which means
something holding a VAPID key and running on a schedule.

Rest-timer alerts are different: those fire while the app is running and need no
server at all. They work whether or not you deploy this.

## Deploy

```bash
cd push-server
npm run keys                       # generate VAPID keys + a shared token
```

Copy the three values it prints somewhere safe, then:

```bash
npx wrangler kv namespace create SUBS
```

Edit `wrangler.toml`: paste the KV `id`, and the **public** key into
`VAPID_PUBLIC_KEY`. Then set the two secrets (these never touch git):

```bash
npx wrangler secret put VAPID_PRIVATE_KEY   # paste the private key
npx wrangler secret put PUSH_TOKEN          # paste the token
npx wrangler deploy
```

Wrangler prints a URL like `https://ppl-push.<you>.workers.dev`. In the app:
**Settings → Training reminders** → paste that URL and the token, pick your
days and time, then **Turn reminders on**. Use **Send a test now** to confirm.

## Endpoints

| Route | Auth | Purpose |
|---|---|---|
| `GET /key` | none | VAPID public key, so the app can subscribe |
| `GET /health` | none | liveness |
| `POST /subscribe` | bearer | store/refresh a subscription + schedule |
| `DELETE /subscribe` | bearer | forget a subscription |
| `POST /test` | bearer | send one push immediately |

`GET /key` is deliberately open — the public key is not a secret and the app
needs it before it can subscribe. Everything that touches stored state requires
the bearer token, so the Worker can't be used as an open relay.

## Scheduling

The cron runs hourly. Each subscription stores its own IANA timezone, so the
Worker resolves *your* local weekday and hour via `Intl` — DST included — and
sends when they match. A `lastSent` stamp keyed to the local date means a
duplicate cron firing can't double-notify you.

A `404` or `410` from the push service means the subscription is dead, and the
record is deleted. Any other failure is left alone and retried next hour.

## Tests

```bash
npm test
```

Covers the parts that fail silently if they're wrong:

- **Payload encryption (RFC 8291)** — encrypts, then decrypts from the
  *receiving* side per spec and checks the plaintext round-trips. Also that a
  different subscription cannot decrypt it, and that every send uses a fresh
  salt and ephemeral key.
- **VAPID (RFC 8292)** — the JWT verifies against the published key, `aud` is
  the push origin, `exp` is inside the permitted 24h, and a tampered audience
  fails verification.

The scheduling logic (timezone resolution, once-per-day, rest days, pruning
dead subscriptions) is covered by the app's test suite, which drives this
Worker's real handlers against a stub KV.

What cannot be tested here is the last hop — Apple's push service accepting the
request. That only proves itself on the phone, which is what **Send a test now**
is for.

## Cost

Free tier: 100k Worker requests/day, 1k KV writes/day, cron included. This uses
24 cron invocations a day and a handful of KV reads. It will not cost anything.
