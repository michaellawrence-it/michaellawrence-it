# 🍕 Dinner Fund

**A calorie budget that protects your cheat dinner.** Eat light by day, feast at night, stay on track.

Most calorie apps hand you one big daily number, you spend it as the day goes, and by 6pm the pizza you were looking forward to "doesn't fit." Dinner Fund flips that: you decide up front how many calories tonight's dinner gets, the app sets that money aside, and your day runs on what's left. Make the pizza. It was budgeted before breakfast.

## How it works

- **Set two numbers** — a daily calorie target (e.g. 2,000) and a dinner reserve (e.g. 900). There's a built-in Mifflin–St Jeor calculator if you want help picking the target.
- **Log your day** with quick-pick foods or custom entries. The headline number is *"left before dinner"* — your day budget with dinner already paid for.
- **Or just photograph your plate.** The 📷 button opens your camera or photo library, compresses the shot on-device, and attaches it to the entry — a visual food journal with thumbnails in the log (tap to enlarge). Add your Anthropic API key in settings and an ✨ *Estimate with AI* button appears: Claude looks at the photo and pre-fills the dish name, calories, and protein (with its portion assumption stated) for you to tweak before logging. The key lives only in your browser, is sent only to Anthropic, and is stripped from data exports; without a key, photos still attach and you type the numbers. Photos are pruned after 14 days (the numbers stay) to keep browser storage lean.
- **Watch the meter.** Blue is what you've eaten, the 🍕 line marks where the dinner fund starts. Cross the line and the app tells you exactly what tonight's budget shrinks to — in calories *and* pizza slices (≈285 kcal per large slice).
- **Log the dinner.** A slice stepper for pizza nights, presets for burger/burrito/pasta nights, and an honest end-of-day verdict. Under target with a cheat dinner included is the whole point. 🎉
- **Cook from the built-in recipes.** 22 preloaded high-protein recipes — basics (eggs, oats, yogurt bowls, tuna salad) plus cod, salmon, chicken thigh, steak, and rice bowls — each with ingredients, a 2–3 step method, calories, and protein. Filter by category, expand for the method, log with one tap. Recipes where 35%+ of calories come from protein wear a 💪 badge.
- **Build protein, not just a deficit.** Every food carries protein grams, a slim green bar under the calorie meter tracks your daily protein goal (default 140 g, adjustable), and the week table shows protein per day. Cheat dinner at night, muscle-conscious all day.
- **Keep the week honest.** A 7-day chart with your target line, an on-target streak, and a "dinners that fit" count. Missed days and over days are shown, never shamed.

A per-night override lets you grow or shrink tonight's reserve (±50) without touching your defaults — big pizza Friday, lighter Sunday.

## Linked with Mike's Kitchen 🍳

Dinner Fund and the wall-iPad cookbook next door ([`../recipe-app/`](../recipe-app/)) share the same browser storage, so they act as one app:

- The 🍳 button in the header jumps to the recipe book (and its 🍕 button jumps back). Both manifests share a scope, so the hop stays inside the installed home-screen app.
- Any Kitchen recipe with a per-serving kcal figure appears here under **🍳 My kitchen** in the recipe list — loggable with one tap, with a link to the full cooking view.
- Cooking from the Kitchen app? Its **Log 1 serving to Dinner Fund** button writes straight into today's log here, in the right meal slot for the time of day.

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
| `app.js` | State, budget math, recipe library, rendering, undo, import/export |
| `sw.js` + `manifest.webmanifest` | Offline support + installability |
| `icons/` | App icon (SVG source + generated PNGs) |

## Honest fine print

Calorie figures for quick-pick foods and slices are ballpark estimates. This is a budgeting toy for people who find "save room for pizza" motivating — it is not medical or nutrition advice, and very low calorie targets deserve a clinician's input, not an app's.
