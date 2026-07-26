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
| Incline Press — 4×5–8 | Deadlift — 3–4×4–6 | Squats — 4×5–8 |
| Flat Bench Press — 3×8–10 | Pull-ups — 3–4 sets | Leg Press — 3×8–10 |
| Dips — 3×8–10 | Barbell Rows — 3×8–10 | Leg Curl — 3×10–12 |
| Overhead Press — 3×6–8 | Lat Pulldown / Low Row — 3×8–12 | Hip Adductor — 3×12–15 |
| Chest Fly — 3×10–12 | Face Pulls — 3×12–15 | Hip Abductor — 3×12–15 |
| Lateral Raises — 3×12–15 | Barbell Curls — 3×8–10 | Calf Raises — 4×12–15 |
| Overhead Tricep Ext. — 3×10–12 | Hammer Curls — 3×10–12 | Hanging Knee Raises — 3×12–15 |

Push notes: incline leads as the heavy press with flat bench behind it as a
volume slot, dips are a fixed weekly movement rather than an alternate, and
there is one tricep isolation rather than two — dips already supply heavy elbow
extension, so the overhead extension (long head, under stretch) is what's worth
adding on top. Tricep pushdowns are retired from the program but stay in the
exercise catalog, so any logged pushdown history is still readable under
Progress → *No longer in the program*.

One deliberate change to the original prescription: the pulldown/row slot is
stored as a **range** (3×8–12) rather than a flat 3×10. Double progression needs
a range to climb, so a fixed rep target has nowhere to go.

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

**2. Accessory rotation.** Accessory slots cycle through their variations week
to week — cable fly → pec deck → dumbbell, pull-up grips, and so on. The
rotations are staggered so the whole session never turns over at once. The
compound anchors don't rotate: you cannot progressively overload a lift that
keeps changing, so the variation belongs in the accessories.

**The rotation suggests; it never locks you in.** The movement name on each card
is a picker offering *every* movement for that day — 17 on Push, 16 on Pull, 14
on Legs — grouped by pattern, each labelled with when you last did it
(`Dips · 3d ago`). If you want to chase a lift this week, pick it,
whatever the rotation had planned.

Choosing a movement brings its own prescription with it: a programmed movement
keeps its slot's waved numbers, anything else takes its pattern group's, so
lateral raises in a 4×5–8 slot become 3×12–15 rather than inheriting a target
that makes no sense. Sets you've already logged survive the swap.

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

## Notifications

Two kinds, and they're independent — the first needs nothing, the second needs
a server.

**Rest timer alerts.** Settings → *Notify when rest ends*. Shows on the lock
screen alongside the beep and vibration. No backend; nothing leaves the device.
The catch is iOS: if you fully switch away from the app mid-set, it suspends the
page and the alert may not fire. The screen wake-lock during a session means
this mostly doesn't come up in practice.

**Training reminders.** Settings → *Training reminders*. Real scheduled push —
"Legs day" at 5pm on the days you choose — from your own Cloudflare Worker in
`../push-server/`. iOS has no local scheduling API, so a future-dated
notification genuinely requires a server; there is no way around it.

That Worker stores a push subscription, your weekly day map, an hour, and a
timezone. **No workout data is sent to it**, which is asserted by a test rather
than merely intended. Deploy instructions are in `push-server/README.md`.

Both require the app to be installed to the Home Screen — iOS only permits Web
Push for installed PWAs, never for a Safari tab.

## After a session

Finishing drops you straight into a summary of what just happened, compared
against the last time you trained that day:

- **Volume** with the percentage change on the previous session of that day type
- **Duration** — start to when you tapped Finish
- **Typical rest** between sets
- **PRs** — any movement beating its best estimated 1RM, flagged in the header
  and against the row
- Per-movement sets, top set, volume and Δ

The same screen is what you get tapping any past session in History, so the
comparison is there later too, not only in the moment.

### How rest is measured

From when each set is ticked off with the checkmark, and deliberately
conservative:

- Only gaps **within one movement** count. Walking to the next machine is setup,
  not rest.
- It reports the **median**, not the mean, and drops anything over **10 minutes**.
  If you forget to tick a set until later the timer keeps running, but that gap
  is a lapse in logging rather than a real rest — one 22-minute outlier
  shouldn't rewrite the number. The line underneath says how many gaps were
  ignored.

Sessions logged before this existed show "—" rather than a fabricated figure.

## Inactivity nudge

Optional, and opt-in separately from the scheduled reminders, because it is the
one feature that tells the server anything about training: the **date** of your
last session. No movement, set, weight or rep.

Default threshold is **4 days**, not 3. On a Mon/Wed/Fri split, Friday to Monday
*is* three days — a 3-day threshold would fire every Monday having missed
nothing, which is how a notification earns itself being ignored.

It only fires on days with no scheduled reminder, so the two never stack, and it
waits two days between nudges rather than repeating daily.
