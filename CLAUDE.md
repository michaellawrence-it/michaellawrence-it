# Repo notes for Claude

This repo is Michael's GitHub profile README plus `workout-tracker/`, a live
Push/Pull/Legs training log that runs on his phone.

## workout-tracker/ — read this before editing

**The app holds the only copy of real training history.** It lives in
`localStorage` on his phone. There is no server, no sync, and no way for me to
see it or get it back. A careless edit destroys months of logged work.

### Hard rules

1. **Never change `KEY`** (`'ppl-tracker-v1'` in `app.js`). It is the address of
   all saved data. Changing it makes every logged workout unreachable. It is
   permanent even though it says `v1` — the `v1` is historical, the schema
   version is tracked separately in `SCHEMA`.

2. **Never rename or delete a key in `EXERCISES`** (`program.js`). Every logged
   set stores its movement by that key. Renaming detaches the history: no
   progression suggestion, no trend line. Keys are append-only. If a rename is
   genuinely required, add `old_key: 'new_key'` to `EXERCISE_ALIASES` and the
   old sessions follow it across.

3. **Any change to the stored shape requires a migration.** If you add, rename,
   remove, or retype a field inside a stored session or entry:
   - bump `SCHEMA` by exactly one, and
   - add `MIGRATIONS[<new number>]` that converts the previous shape forward.

   `load()` snapshots the pre-migration blob to `ppl-tracker-snapshot-v<old>`
   before running anything, so a bad migration stays recoverable. If a migration
   throws, the app goes read-only rather than writing a half-converted record.

4. **Bump `BUILD` in `app.js` and `CACHE` in `sw.js` on every user-visible
   change.** `BUILD` shows in Settings → App version, which is how he confirms
   his phone actually picked up the edit. `CACHE` invalidates the offline copy.

5. **Adding a movement, retuning a rep range, or adding a rotation option is
   safe** and needs none of the above — that is data in `PROGRAM`/`EXERCISES`,
   not stored shape. Adding a *new* `EXERCISES` key is always safe.

### Protections already in place — don't remove them

- `readOnlyReason` — if stored data is a newer `SCHEMA` than the loaded code (a
  stale cached app), the app refuses to write at all and shows a red banner.
  This is what stops an out-of-date phone from silently downgrading good data.
- Unparseable data is copied to `ppl-tracker-unreadable-<ts>` **before**
  anything else happens, and never overwritten.
- `writeAutoBackup()` snapshots to `ppl-tracker-autobackup` every time a session
  is finished. Settings → Restore last auto-backup reads it.
- `exOf(id)` resolves aliases and falls back to a stub for unknown ids, so a
  retired movement degrades to its raw key instead of throwing and taking the
  whole view down. Use it — never index `EXERCISES[...]` directly.
- `hardRefresh()` clears service-worker caches only. It must never touch
  `localStorage`.

### Verifying a change

There is no test runner in the repo. Verify with Playwright against a local
server before pushing — Chromium is at
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`:

```bash
cd workout-tracker && python3 -m http.server 8777
```

At minimum, confirm: a full session logs and finishes; seeded history still
produces the right progression suggestion; the migration path from the previous
`SCHEMA` preserves every session; and the console is clean at phone width in
both themes.

### push-server/ — the reminder Worker

`push-server/` is a Cloudflare Worker sending scheduled reminders. It stores a
push subscription, a weekday map, an hour, and a timezone — **never workout
data**, and there is a test asserting that. Keep it that way: if a change would
send anything about sessions, sets, or movements to the Worker, it needs saying
out loud first, because it breaks the promise the rest of this app is built on.

Secrets (`VAPID_PRIVATE_KEY`, `PUSH_TOKEN`) live in `wrangler secret`, never in
the repo. `npm test` in that folder checks the RFC 8291 encryption by decrypting
from the receiving side, and the VAPID JWT by verifying its signature — both
fail silently on a real phone if wrong, so don't skip them.

### Deploying

`main` (or whichever branch GitHub Pages is pointed at) is live on his phone.
Pushing there ships it. The service worker is network-first, so a reload picks
up the new build; Settings → Force update from server clears the cache
explicitly.
