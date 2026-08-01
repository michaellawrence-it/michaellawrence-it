# 🍕 Dinner Fund

**A calorie budget that protects your cheat dinner.** Eat light by day, feast at night, stay on track.

Most calorie apps hand you one big daily number, you spend it as the day goes, and by 6pm the pizza you were looking forward to "doesn't fit." Dinner Fund flips that: you decide up front how many calories tonight's dinner gets, the app sets that money aside, and your day runs on what's left. Make the pizza. It was budgeted before breakfast.

## How it works

- **Set two numbers** — a daily calorie target (e.g. 2,000) and a dinner reserve (e.g. 900). There's a built-in Mifflin–St Jeor calculator if you want help picking the target.
- **Log your day** with quick-pick foods or custom entries. The headline number is *"left before dinner"* — your day budget with dinner already paid for.
- **Watch the meter.** Blue is what you've eaten, the 🍕 line marks where the dinner fund starts. Cross the line and the app tells you exactly what tonight's budget shrinks to — in calories *and* pizza slices (≈285 kcal per large slice).
- **Log the dinner.** A slice stepper for pizza nights, presets for burger/burrito/pasta nights, and an honest end-of-day verdict. Under target with a cheat dinner included is the whole point. 🎉
- **Keep the week honest.** A 7-day chart with your target line, an on-target streak, and a "dinners that fit" count. Missed days and over days are shown, never shamed.

A per-night override lets you grow or shrink tonight's reserve (±50) without touching your defaults — big pizza Friday, lighter Sunday.

## Running it

It's a dependency-free static site (vanilla HTML/CSS/JS — no build step).

```bash
cd dinner-fund
python3 -m http.server 8000
# open http://localhost:8000
```

Or deploy the folder anywhere static (GitHub Pages, Netlify, …). Served over HTTPS it's an installable PWA — "Add to Home Screen" gives you an offline-capable app with the pizza icon.

All data stays in your browser's `localStorage`. Settings has export/import (JSON) for backups or moving devices, and a full reset.

## Files

| File | What it is |
|---|---|
| `index.html` | Markup: hero meter, dinner card, food log, week view, settings dialog |
| `styles.css` | Design tokens (light + dark mode), mobile-first layout |
| `app.js` | State, budget math, rendering, undo, import/export |
| `sw.js` + `manifest.webmanifest` | Offline support + installability |
| `icons/` | App icon (SVG source + generated PNGs) |

## Honest fine print

Calorie figures for quick-pick foods and slices are ballpark estimates. This is a budgeting toy for people who find "save room for pizza" motivating — it is not medical or nutrition advice, and very low calorie targets deserve a clinician's input, not an app's.
