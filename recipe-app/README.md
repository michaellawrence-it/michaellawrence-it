# Mike's Kitchen 🍳

A recipe app built for an iPad mounted on the kitchen wall. Tap a recipe and the
ingredients are right there in front of you; tell it how many people you're
cooking for and every quantity rescales itself.

No build step, no server, no accounts — it's one HTML file plus icons. Recipes
are stored on the device itself (browser localStorage), so it works fully
offline once loaded.

## Features

- **Summary at the top** — each recipe opens with a banner saying what the dish
  is, prep/cook time, and tags.
- **Cook for any number of people** — big − / + buttons scale every ingredient
  (`500g mince` → `750g`, `½ cup wine` → `¾ cup`), with proper cooking
  fractions, `2–3` ranges, and pluralised units (`1 cup` → `2 cups`).
  Lines with no amount ("Salt, to taste") are left alone.
- **Kitchen-friendly** — huge touch targets, tap ingredients to tick them off,
  tap steps to dim them as you go, and a *Keep screen on* button so the iPad
  doesn't sleep mid-recipe.
- **Easy to add recipes** — one form; type or paste ingredients one per line
  and a live preview shows how they'll scale. Lines ending in `:` become
  section headings ("For the sauce:").
- **Search + tag filters**, JSON export/import for backup, light & dark mode,
  installable as a home-screen app.

## Linked with Dinner Fund 🍕

This app and [Dinner Fund](../dinner-fund/) (the calorie-budget app) are one
linked pair — same site, shared browser storage:

- The 🍕 button in the header jumps to Dinner Fund; its 🍳 button jumps back.
  Both apps share a PWA scope, so the hop stays inside the installed
  home-screen app.
- Give a recipe optional **kcal / protein per serving** (in the add/edit form)
  and two things happen: a **Log 1 serving to Dinner Fund** button appears in
  the cook view (it writes into today's food log, picking the meal slot by
  time of day), and the recipe shows up in Dinner Fund's recipe list under
  **🍳 My kitchen**, loggable from there with a link back to the full recipe.
- Starter recipes ship with per-serving estimates already filled in.

## Putting it on the kitchen iPad

1. **Host it with GitHub Pages** (easiest):
   - In this repo: *Settings → Pages → Source: Deploy from a branch*, pick the
     main branch and `/ (root)`, save.
   - After a minute the app is live at
     `https://<username>.github.io/<repo>/recipe-app/`.
2. On the iPad, open that URL in **Safari**.
3. Tap **Share → Add to Home Screen**. It installs as a full-screen app with
   the skillet icon and works offline from then on.

(It also runs fine by just opening `index.html` in any browser — offline
caching and home-screen install are the only extras that need hosting.)

## Adding recipes

Tap **＋ Add recipe**. For ingredients, start each line with an amount and it
will scale automatically:

```
400g spaghetti
2 tbsp olive oil
1½ cups plain flour
2-3 carrots, chopped
For the sauce:
Salt and pepper, to taste
```

Steps go one per line — numbering is automatic. The "What is it?" box is the
summary shown at the top while you cook.

## Backups & moving recipes between devices

Recipes live in the browser's storage on each device. Tap **⇅** on the home
screen to **Export** a JSON backup, and **Import** it on the iPad (or after
clearing the browser). Importing merges by recipe id: existing recipes are
updated, new ones added.

## Tweaks

- **Rename the app**: edit `APP_NAME` at the top of the `<script>` in
  `index.html` (and the names in `manifest.webmanifest`).
- **After changing app files**: bump `VERSION` in `sw.js` so installed iPads
  pick up the new version promptly.
