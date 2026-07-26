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

## Running it

**On your phone (recommended).** Serve the folder over HTTPS and open it, then
*Share → Add to Home Screen* (iOS) or *Install app* (Android). It runs
full-screen and offline from then on. Enabling GitHub Pages on this repo puts it
at `https://<user>.github.io/workout-tracker/`.

**Locally.** Any static server works:

```bash
cd workout-tracker
python3 -m http.server 8777      # then open http://localhost:8777
```

Opening `index.html` directly off the filesystem also works — you just lose the
service worker (which only matters for offline installs).

## Your data

Everything lives in `localStorage` on the one device. Clearing site data wipes
it, so use **Settings → Export backup (.json)** now and then; **Restore from
backup** reads it back. There's also a **.csv** export (one row per set, with
date, week, phase, movement, weight, reps, and estimated 1RM) for when you want
to slice it in a spreadsheet.

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
| `manifest.webmanifest`, `icon.svg` | Home-screen install |

To change the program — add a movement, retune a rep range, add a rotation
option — edit `PROGRAM` and `EXERCISES` in `program.js`. Nothing else needs to
know.
