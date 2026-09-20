---
name: update-ppl-tracker
description: Use when asked to change anything about the PPL Tracker (workout-tracker/) — adding, renaming, or splitting a movement, changing the program/rotation/rep ranges, changing the stored data shape, or generally "update the workout app" / "update the ppo app". Walks the change through the repo's hard rules (CLAUDE.md), verification, build bump, and — the step it's easy to forget — actually getting it live on the phone.
---

# Updating the PPL Tracker

This app holds someone's real, irreplaceable training history in `localStorage`
on their phone. Read `CLAUDE.md` at the repo root in full before touching
`workout-tracker/` — it has the hard rules (never change `KEY`, `EXERCISES`
keys are append-only, any stored-shape change needs a `SCHEMA` bump + a
migration, etc). This skill is the workflow around those rules, not a
replacement for them.

## 1. Classify the change

- **New movement, new rotation option, retuned reps/sets** → catalog/program
  data only. Safe, no `SCHEMA` bump. This is the common case (dip grip splits,
  alternating variants, cross-day pool additions).
- **Renaming/removing an `EXERCISES` key** → don't. Add an alias in
  `EXERCISE_ALIASES` instead, per CLAUDE.md.
- **Adding/renaming/retyping a field on a stored session or entry** → requires
  bumping `SCHEMA` in `app.js` by exactly one and adding a matching
  `MIGRATIONS[<n>]` entry. This is rare — most requests don't need it.

If genuinely unsure which bucket a request falls in, that's worth asking
about before writing code — it decides whether a migration is required.

## 2. Make the change

- New exercise catalog entries go in `EXERCISES` (`program.js`), each with a
  short comment if the reasoning isn't obvious (why it's a separate key, why
  it's `uni: true`, etc — match the existing style).
- If a movement should appear on more than one day (like `db_shrug` on Pull
  and Legs, or dip grips on Push and Pull), add the *same id* to another
  day's `DAY_POOL` group rather than duplicating the key — that's what keeps
  one progression line no matter which day it's logged under.
- Update `README.md` if it documents the thing you changed (the program
  table, the per-day picker counts, cross-day notes). The picker counts drift
  easily — recompute them rather than eyeballing:
  ```bash
  cd workout-tracker && node -e "
  const src=require('fs').readFileSync('program.js','utf8');
  const f=new Function(src+'; return {DAY_KEYS, DAY_POOL};');
  const m=f();
  for (const d of m.DAY_KEYS) {
    const s = new Set(); m.DAY_POOL[d].forEach(g => g.ids.forEach(i => s.add(i)));
    console.log(d, s.size);
  }"
  ```
- Bump `BUILD` in `app.js` and `CACHE` in `sw.js` together, on every
  user-visible change — pick a value like `YYYY-MM-DD.n` (increment `n` for a
  same-day second edit).

## 3. Verify before pushing

There's no test runner. Verify with Playwright against a local static
server — this is the same setup CLAUDE.md describes:

```bash
cd workout-tracker && python3 -m http.server 8777
```

Chromium is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`); use `playwright-core` if
`playwright` isn't installed locally — `npm i playwright-core` in the
scratchpad directory works fine and doesn't touch the repo.

At minimum, script a check (in the scratchpad, not the repo) that:

- opens the day(s) affected, confirms new/changed movements appear in the
  right picker(s) with the expected prescription;
- logs a full session and finishes it — confirm it's stored under the
  correct id and, for a shared-id cross-day movement, that it extends one
  progression line rather than starting a new one;
- for a `SCHEMA` bump specifically: seeds data at the *previous* schema
  version, reloads, and confirms every session survives the migration and a
  `ppl-tracker-snapshot-v<old>` was written;
- checks the console is clean at phone width (390px) in both
  `light` and `dark` `colorScheme`.

Re-run any earlier verification scripts left in the scratchpad from the same
session — cheap, and catches a change stepping on an earlier one.

## 4. Ship it

Follow the repo's git branch/attribution instructions for the commit itself.
Then — the step it's easy to stop short of — **get it live**:

1. Check what branch GitHub Pages actually serves (repo Settings → Pages, or
   ask if unknown — often `main`, sometimes the working branch).
2. If the work isn't already on that branch, merge it in and push. A
   fast-forward is normal here since this is usually a single-purpose
   session; use `--ff-only` and fall back to a merge commit only if that
   fails.
3. Pushing to a branch other than the one you were told to develop on needs
   the person's OK first — ask, don't assume, even when the reason (Pages
   won't serve it otherwise) is this obvious.
4. Tell them what build number to look for in Settings → App version, and
   mention **Force update from server** if the service worker might be
   holding a stale copy.

A change that's committed and pushed to a feature branch but never reaches
the Pages branch is not "done" — the phone never sees it. That's the
failure mode this step exists to catch.
