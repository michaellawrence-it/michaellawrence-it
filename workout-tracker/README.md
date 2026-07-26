# PPL Tracker

A Push / Pull / Legs training log built for one job: **make progressive overload
obvious**. Open the app at the rack, see exactly what you did last time and what
you have to beat, punch in weight × reps, move on.

No accounts, no backend, no dependencies, no build step. Four static files and
`localStorage`. It installs to a phone home screen and works with the gym Wi-Fi
off.

---

## The program

The three sessions are the ones you already run:

| Push | Pull | Legs |
|---|---|---|
| Flat Bench Press — 4×5–8 | Deadlift — 3–4×4–6 | Squats — 4×5–8 |
| Incline Press / Dips — 3×8–10 | Pull-ups — 3–4 sets | Leg Press — 3×8–10 |
| Overhead Press — 3×6–8 | Barbell Rows — 3×8–10 | Leg Curl — 3×10–12 |
| Chest Fly — 3×10–12 | Lat Pulldown / Low Row — 3×8–12 | Hip Adductor — 3×12–15 |
| Lateral Raises — 3×12–15 | Face Pulls — 3×12–15 | Hip Abductor — 3×12–15 |
| Tricep Pushdown — 3×10–12 | Barbell Curls — 3×8–10 | Calf Raises — 4×12–15 |
| Overhead Tricep Ext. — 3×10–12 | Hammer Curls — 3×10–12 | Hanging Knee Raises — 3×12–15 |

One deliberate change: the pulldown/row slot is stored as a **range** (3×8–12)
rather than a flat 3×10. Double progression needs a range to climb, so a fixed
rep target has nowhere to go.

## How the weekly variation works

Two independent knobs, both automatic:

**1. The rep/set wave.** Every week the whole program shifts to a different
position *inside* your prescribed ranges. Nothing is invented — 4×5–8 stays
4×5–8, the app just tells you which end to live at:

| Week | Phase | What changes |
|---|---|---|
| 1 | **Volume** | Top of every rep range, fewest sets. Lighter, more reps. |
| 2 | **Build** | Middle of the ranges, full set count. |
| 3 | **Intensity** | Bottom of every rep range, full set count. Heaviest week. |
| 4 | **Deload** | Fewer sets at ~85% load. Optional — switch to a 3-week cycle in Settings. |

**2. Accessory rotation.** Slots with more than one sensible variation cycle
through them week to week — incline barbell → dips → incline dumbbell, rope
pushdown → straight bar → V-bar, pull-up grips, cable fly → pec deck → dumbbell,
and so on. The rotations are staggered so the whole session never turns over at
once, and you can override any of them from the dropdown mid-workout.

**The five compound anchors never rotate**: bench, overhead press, deadlift,
barbell row, squat. You cannot progressively overload a lift you keep swapping —
the variation belongs in the accessories.

The week number comes from the calendar (Monday-anchored) against the program
start date in Settings, so the phase flips over the weekend rather than
mid-week. There's a phase-nudge setting if you need to skip or repeat a week.

## Progression

Each movement uses **double progression**:

> Hit the **top of the rep range on every working set** at a given load → the app
> adds one plate jump next time. Fall short → same load, chase the reps.

Before your first set the card already shows:

- the exact sets you did last time (`175×8, 175×8, 175×8, 175×8`)
- whether you **earned** the increase, and by how much
- the suggested starting weight, pre-loaded as the input placeholder — tap the
  checkmark and it fills itself in

Bodyweight movements (pull-ups, dips, hanging raises) log *added* weight; your
bodyweight from Settings is folded into the volume and 1RM math.

## Tracking and comparison

- **Today** — the current week and phase, plus this week's sessions/volume/sets against last week's.
- **Session** — per-set weight and reps, tap-to-complete, auto-starting rest timer, PR flag when a set beats your best estimated 1RM, per-movement notes.
- **History** — grouped by week, with each session's per-movement volume delta against the previous time you ran that day.
- **Progress** — pick any movement and chart estimated 1RM, top set, or total volume over time, with a full table underneath and a week-over-week Δ column.

Estimated 1RM uses Epley (`weight × (1 + reps ÷ 30)`). It drifts above ~12 reps,
so read the high-rep accessory numbers as a trend line, not a max.

## Getting it on your phone

One-time setup, in the repo's **Settings → Pages**:

1. Source: **Deploy from a branch**
2. Branch: the branch this folder is on, folder `/ (root)`
3. Save, wait a minute, then open `https://<user>.github.io/workout-tracker/`

Then **Share → Add to Home Screen** (iOS) or **Install app** (Android). It runs
full-screen with its own icon, and works with the gym Wi-Fi off.

Locally, any static server does:

```bash
cd workout-tracker
python3 -m http.server 8777      # then open http://localhost:8777
```

Opening `index.html` off the filesystem works too — you just lose the service
worker, which only matters for offline installs.

## Updating the app without touching your data

Push to the branch Pages serves and it's live. Your phone picks it up on the
next load — the service worker is network-first, so it reaches for the new files
first and only falls back to the cache when offline. If a version ever seems
stuck, **Settings → Force update from server** clears the code cache and
reloads. *That button does not touch your logged workouts.*

**Settings → App version** shows the running build and data-format version, so
you can confirm an edit actually landed.

The stored data has its own version number, independent of the app. Four things
protect it across edits:

| Situation | What happens |
|---|---|
| A new version changes the data shape | A migration converts your data forward, and the pre-upgrade copy is snapshotted first |
| Your phone has a stale copy of the app and newer data | The app **refuses to write anything** and shows a red banner until it updates — a stale build can't downgrade good data |
| Saved data is somehow unreadable | It's copied aside intact before anything else, and offered as a download |
| A finished session | Written to a separate auto-backup, restorable from Settings |

Movement IDs are treated as permanent, so history never detaches from a lift
when the app changes. The rules are written down in `CLAUDE.md` at the repo root.

## Your data

It lives in `localStorage` on the one device. Clearing site data wipes it, so
use **Settings → Export backup (.json)** now and then; **Restore from a file**
reads it back. There's also a **.csv** export (one row per set, with date, week,
phase, movement, weight, reps, and estimated 1RM) for slicing in a spreadsheet.

Switching lb ↔ kg converts every stored weight in place, rounded to the nearest
half unit.

## Files

| File | Role |
|---|---|
| `index.html` | Shell: header, view container, rest bar, tab bar |
| `program.js` | Exercise catalog, PPL definitions, wave + rotation logic |
| `app.js` | State, progression math, views, rest timer, chart |
| `styles.css` | Design tokens, dark/light themes, layout |
| `sw.js` | Offline cache (network-first, cache fallback) |
| `manifest.webmanifest`, `icon.svg`, `icon-*.png`, `apple-touch-icon.png` | Home-screen install |

To change the program — add a movement, retune a rep range, add a rotation
option — edit `PROGRAM` and `EXERCISES` in `program.js`. That's data, not stored
shape, so nothing else needs to know and no migration is involved.
