/* Dinner Fund — budget the day around the dinner you're excited about. */
(() => {
  "use strict";

  const SLICE_KCAL = 285; // large cheese slice, ballpark
  const SLICE_PROT = 12;  // grams of protein per slice
  const LS_KEY = "dinnerfund.v1";
  const API_MODEL = "claude-opus-5";
  const PHOTO_KEEP_DAYS = 14; // photos older than this are pruned; the numbers stay
  const DEFAULTS = { target: 2000, reserve: 900, proteinGoal: 140, apiKey: "", welcomed: false };
  const SLOT_EMOJI = { breakfast: "☕", lunch: "🥪", snack: "🍎", dinner: "🍕" };

  /* Preloaded recipes — per single serving, rounded. cat: basics|cod|salmon|thigh|steak|rice */
  const RECIPES = [
    { cat: "basics", emoji: "🍳", name: "Scrambled eggs & toast", kcal: 350, p: 22,
      ing: "3 eggs · 1 slice whole-grain toast · 1 tsp butter · salt & pepper",
      steps: ["Whisk the eggs with a pinch of salt.", "Scramble low and slow in the butter.", "Pile onto the toast."] },
    { cat: "basics", emoji: "🥣", name: "Overnight oats + whey", kcal: 360, p: 33,
      ing: "½ cup oats · 1 scoop vanilla whey · ¾ cup milk · handful of berries",
      steps: ["Stir oats, whey and milk together in a jar.", "Fridge overnight.", "Top with berries in the morning."] },
    { cat: "basics", emoji: "🥛", name: "Greek yogurt power bowl", kcal: 300, p: 28,
      ing: "1 cup 0% Greek yogurt · 1 tsp honey · 10 almonds · berries",
      steps: ["Spoon the yogurt into a bowl.", "Top with honey, almonds and berries."] },
    { cat: "basics", emoji: "🥪", name: "Tuna salad sandwich", kcal: 330, p: 35,
      ing: "1 can tuna · 2 tbsp Greek yogurt · mustard · celery · 2 slices whole-grain bread",
      steps: ["Mix tuna with the yogurt, mustard and chopped celery.", "Sandwich it."] },
    { cat: "basics", emoji: "🥗", name: "Chicken breast salad", kcal: 370, p: 50,
      ing: "6 oz grilled chicken breast · big handful of greens · tomatoes · cucumber · 1 tbsp light vinaigrette",
      steps: ["Slice the chicken over the vegetables.", "Dress and toss."] },
    { cat: "basics", emoji: "🧀", name: "Cottage cheese plate", kcal: 240, p: 27,
      ing: "1 cup low-fat cottage cheese · pineapple or peach slices · black pepper",
      steps: ["Plate it. That's the recipe."] },

    { cat: "cod", emoji: "🐟", name: "Garlic-lemon baked cod", kcal: 280, p: 43,
      ing: "8 oz cod · 1 tsp olive oil · 2 garlic cloves · ½ lemon · green beans",
      steps: ["Rub the cod with oil, garlic and salt.", "Bake at 400°F for ~12 min with the green beans alongside.", "Squeeze the lemon over everything."] },
    { cat: "cod", emoji: "🌮", name: "Blackened cod tacos", kcal: 320, p: 30,
      ing: "5 oz cod · blackening spice · 2 corn tortillas · cabbage slaw · lime-yogurt drizzle",
      steps: ["Sear the spiced cod 2–3 min per side.", "Flake into warm tortillas with slaw and the drizzle."] },
    { cat: "cod", emoji: "🍚", name: "Miso-glazed cod & rice", kcal: 350, p: 34,
      ing: "6 oz cod · 1 tbsp miso + 1 tsp honey + splash of soy · ¾ cup cooked rice · scallions",
      steps: ["Brush the cod with the miso glaze.", "Broil 8–10 min until lacquered.", "Serve over rice with scallions."] },

    { cat: "salmon", emoji: "🐠", name: "Sheet-pan salmon & veg", kcal: 430, p: 38,
      ing: "6 oz salmon · broccoli + peppers · 1 tsp olive oil · lemon",
      steps: ["Everything on one pan with the oil and salt.", "Roast at 425°F for ~12 min.", "Lemon over the top."] },
    { cat: "salmon", emoji: "🍣", name: "Salmon rice bowl", kcal: 480, p: 36,
      ing: "5 oz salmon · ¾ cup cooked rice · cucumber · sriracha-yogurt · soy",
      steps: ["Roast or air-fry the salmon, then flake it.", "Build the bowl and sauce it."] },
    { cat: "salmon", emoji: "🥯", name: "Smoked salmon toast", kcal: 260, p: 27,
      ing: "3 oz smoked salmon · whole-grain toast · 3 tbsp cottage cheese · capers · dill",
      steps: ["Spread the cottage cheese on the toast.", "Layer salmon, capers and dill."] },

    { cat: "thigh", emoji: "🍗", name: "Crispy baked chicken thighs", kcal: 360, p: 40,
      ing: "2 boneless skinless thighs · paprika + garlic rub · 1 tsp oil",
      steps: ["Rub the thighs all over.", "Bake at 425°F for ~20 min until crisp-edged."] },
    { cat: "thigh", emoji: "🍋", name: "Lemon-garlic thighs & potatoes", kcal: 470, p: 42,
      ing: "2 thighs · baby potatoes · garlic · lemon · 1 tsp oil · oregano",
      steps: ["Toss everything on one tray.", "Roast at 425°F for ~25 min."] },
    { cat: "thigh", emoji: "🍛", name: "Weeknight thigh curry", kcal: 420, p: 34,
      ing: "5 oz thighs · ½ cup light coconut milk · curry paste · tomatoes · spinach",
      steps: ["Brown the thighs.", "Simmer in the curry base for 15 min.", "Wilt in the spinach."] },

    { cat: "steak", emoji: "🥩", name: "Seared sirloin & asparagus", kcal: 410, p: 50,
      ing: "6 oz sirloin · asparagus · 1 tsp butter · salt & coarse pepper",
      steps: ["Hard sear 3–4 min per side; rest 5 min.", "Asparagus in the same pan.", "Butter over both."] },
    { cat: "steak", emoji: "🌶", name: "Steak fajita bowl", kcal: 350, p: 36,
      ing: "5 oz flank steak · peppers + onions · fajita spice · salsa",
      steps: ["Sear the steak, rest it, slice thin.", "Blister the vegetables in the same pan.", "Bowl it with salsa."] },
    { cat: "steak", emoji: "🥔", name: "Steak & baked potato", kcal: 460, p: 46,
      ing: "5 oz sirloin · 1 medium baked potato · dollop of Greek yogurt · chives",
      steps: ["Bake the potato.", "Sear the steak; rest it.", "Yogurt and chives on the spud."] },

    { cat: "rice", emoji: "🍚", name: "Chicken & rice meal-prep bowl", kcal: 480, p: 50,
      ing: "5 oz chicken breast · 1 cup cooked rice · broccoli · soy-ginger sauce",
      steps: ["Grill or pan-cook the chicken.", "Assemble over rice and broccoli; sauce it."] },
    { cat: "rice", emoji: "🍳", name: "Chicken-egg fried rice", kcal: 490, p: 38,
      ing: "1 cup day-old rice · 3 oz chicken · 1 egg · peas + carrots · 1 tsp sesame oil · soy",
      steps: ["Scramble the egg, set aside.", "Fry rice, chicken and veg over high heat.", "Everything back in with the soy."] },
    { cat: "rice", emoji: "🌯", name: "Turkey burrito bowl", kcal: 480, p: 32,
      ing: "4 oz 93% ground turkey · ¾ cup rice · ½ cup black beans · salsa · taco spice",
      steps: ["Brown the spiced turkey.", "Layer rice, beans, turkey and salsa."] },
    { cat: "rice", emoji: "🍤", name: "Garlic shrimp & rice", kcal: 370, p: 39,
      ing: "6 oz shrimp · ¾ cup cooked rice · 3 garlic cloves · 1 tsp olive oil · parsley · lemon",
      steps: ["Sizzle the garlic in oil; shrimp 2 min per side.", "Toss with the rice, lemon and parsley."] },
  ];

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString("en-US");

  /* ---------- storage (with in-memory fallback) ---------- */

  let storageOk = true;
  const store = (() => {
    try {
      localStorage.setItem("__df_probe", "1");
      localStorage.removeItem("__df_probe");
      return localStorage;
    } catch {
      storageOk = false;
      const mem = {};
      return {
        getItem: (k) => (k in mem ? mem[k] : null),
        setItem: (k, v) => { mem[k] = String(v); },
        removeItem: (k) => { delete mem[k]; },
      };
    }
  })();

  function load() {
    try {
      const raw = store.getItem(LS_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object" || !data.settings || !data.days) return null;
      return data;
    } catch {
      return null;
    }
  }

  const state = load() || { settings: { ...DEFAULTS }, days: {} };
  state.settings = { ...DEFAULTS, ...state.settings };

  function save() {
    const write = () => {
      try { store.setItem(LS_KEY, JSON.stringify(state)); return true; } catch { return false; }
    };
    if (write()) return;
    // storage full — drop the oldest photos first (numbers are kept), then retry
    for (const key of Object.keys(state.days).sort()) {
      for (const e of state.days[key].entries) {
        if (e.photo) { delete e.photo; if (write()) return; }
      }
    }
    toast("Storage is full — the latest change may not stick around.");
  }

  /* ---------- dates ---------- */

  const dayKeyOf = (d) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD, local
  const todayKey = () => dayKeyOf(new Date());
  let currentKey = todayKey();

  function getDay(key) {
    if (!state.days[key]) state.days[key] = { entries: [] };
    return state.days[key];
  }

  /* ---------- the math ---------- */

  function calc(key) {
    const day = state.days[key] || { entries: [] };
    const T = state.settings.target;
    const R = Math.min(day.reserve ?? state.settings.reserve, T);
    let D = 0, N = 0, P = 0;
    for (const e of day.entries) {
      e.slot === "dinner" ? (N += e.kcal) : (D += e.kcal);
      P += e.p || 0;
    }
    const B = T - R;            // day budget before dinner
    const L = B - D;            // left before dinner (can be negative = dipped)
    const total = D + N;
    return { T, R, D, N, P, B, L, total, remaining: T - total, entries: day.entries };
  }

  function slicesText(kcal) {
    const s = Math.round((kcal / SLICE_KCAL) * 2) / 2;
    if (s < 0.5) return "less than ½ a slice";
    const whole = Math.floor(s);
    const half = s - whole ? "½" : "";
    const numTxt = whole === 0 ? half : whole + half;
    return `≈ ${numTxt} large slice${s === 1 ? "" : "s"}`;
  }

  /* ---------- rendering ---------- */

  function renderHeader() {
    $("dateLine").textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
  }

  function setStatus(kind, glyph, html) {
    $("statusLine").innerHTML =
      `<span class="status-ico ico-${kind}" aria-hidden="true">${glyph}</span><span>${html}</span>`;
  }

  function renderHero(c) {
    const preDinner = c.N === 0;
    let label, value, sub;

    if (preDinner) {
      if (c.L >= 0) {
        label = "Left before dinner";
        value = c.L;
        sub = "for breakfast, lunch & snacks — dinner is already paid for";
        setStatus("good", "✓", `Dinner is fully funded — <b>${fmt(c.R)}</b> kcal banked for tonight.`);
      } else if (c.T - c.D > 0) {
        const tonight = c.T - c.D;
        label = "Tonight's dinner budget";
        value = tonight;
        sub = `after dipping ${fmt(-c.L)} into the fund`;
        setStatus("warn", "!", `Dipped <b>${fmt(-c.L)}</b> into the dinner fund — tonight's budget is <b>${fmt(tonight)}</b> (${slicesText(tonight)}).`);
      } else {
        label = "Tonight's dinner budget";
        value = 0;
        sub = "day budget and dinner fund are both spent";
        setStatus("serious", "!", "The dinner fund's tapped out. If dinner's still happening, log it anyway — honest days keep the week on track.");
      }
    } else if (c.remaining >= 0) {
      label = "Left today";
      value = c.remaining;
      sub = `target ${fmt(c.T)} · eaten ${fmt(c.total)}`;
      setStatus("good", "✓", c.remaining === 0
        ? "Right on target — cheat dinner and all. 🎉"
        : `Day is <b>${fmt(c.remaining)}</b> under target — cheat dinner and all. 🎉`);
    } else {
      label = "Over target by";
      value = -c.remaining;
      sub = `target ${fmt(c.T)} · eaten ${fmt(c.total)}`;
      setStatus("serious", "!", `Over by <b>${fmt(-c.remaining)}</b> today. One dinner doesn't sink a week — tomorrow's fund starts fresh.`);
    }

    $("heroLabel").textContent = label;
    $("heroValue").textContent = fmt(value);
    $("heroSub").textContent = sub;
  }

  function renderMeter(c) {
    const pct = (v) => Math.max(0, Math.min(100, (v / c.T) * 100));
    const dayW = pct(c.D);
    const dinnerW = pct(Math.min(c.N, Math.max(0, c.T - c.D)));
    const dividerAt = pct(c.B);

    const meter = $("meter");
    meter.style.setProperty("--divider", dividerAt + "%");
    meter.style.setProperty("--divider-label", Math.max(10, Math.min(90, dividerAt)) + "%");

    $("segDay").style.width = dayW + "%";
    const segDinner = $("segDinner");
    segDinner.style.left = dayW + "%";
    segDinner.style.width = dinnerW + "%";
    segDinner.style.display = dinnerW > 0 ? "" : "none";
    $("meterDivider").style.left = `calc(${dividerAt}% - 1px)`;
    $("meterOverCap").hidden = c.total <= c.T;

    $("scaleEnd").textContent = fmt(c.T);
    $("legDay").textContent = fmt(c.D);
    $("legDinner").textContent = fmt(c.N);
    $("legReserve").textContent = fmt(c.R);
    $("meterTrack").setAttribute("aria-label",
      `${fmt(c.total)} of ${fmt(c.T)} kcal eaten today; ${fmt(c.R)} reserved for dinner.`);
  }

  function renderProtein(c) {
    const goal = state.settings.proteinGoal;
    const pct = goal > 0 ? Math.min(100, (c.P / goal) * 100) : 0;
    $("protFill").style.width = pct + "%";
    $("protNow").textContent = fmt(c.P);
    $("protGoalTxt").textContent = `of ${fmt(goal)} g` + (c.P >= goal ? " 💪" : "");
  }

  function renderDinner(c) {
    $("resValue").textContent = fmt(c.R);
    const line = $("dinnerAvailLine");

    if (c.N === 0) {
      if (c.L >= 0) {
        line.innerHTML = `You can spend <b>${fmt(c.R)}</b> tonight — ${slicesText(c.R)}. Keep the rest of the day under <b>${fmt(c.L)}</b> and it holds.`;
      } else if (c.T - c.D > 0) {
        line.innerHTML = `Tonight's budget is down to <b>${fmt(c.T - c.D)}</b> — ${slicesText(c.T - c.D)}.`;
      } else {
        line.innerHTML = `Nothing left in tonight's fund — tomorrow it refills to <b>${fmt(state.settings.reserve)}</b>.`;
      }
    } else if (c.remaining >= 0) {
      line.innerHTML = `Dinner logged: <b>${fmt(c.N)}</b> kcal. There's <b>${fmt(c.remaining)}</b> still left today if dessert calls.`;
    } else {
      line.innerHTML = `Dinner logged: <b>${fmt(c.N)}</b> kcal — day closed <b>${fmt(-c.remaining)}</b> over.`;
    }

    $("sliceCount").textContent = sliceCount;
    $("sliceKcal").textContent = fmt(sliceCount * SLICE_KCAL);
    $("logSlicesBtn").textContent = `Log pizza · ${fmt(sliceCount * SLICE_KCAL)}`;
  }

  function renderSlots() {
    document.querySelectorAll(".slot-chip").forEach((b) => {
      b.setAttribute("aria-checked", String(b.dataset.slot === selectedSlot));
    });
  }

  function renderEntries(c) {
    const card = $("entriesCard");
    const list = $("entriesList");
    card.hidden = c.entries.length === 0;
    $("entriesTotal").textContent = `${fmt(c.total)} kcal · ${fmt(c.P)} g protein`;
    list.innerHTML = c.entries.map((e) => {
      const time = new Date(e.t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const lead = e.photo
        ? `<img class="e-thumb" src="${e.photo}" alt="Photo of ${escapeHtml(e.name)}" data-action="view-photo" data-id="${e.id}">`
        : `<span class="e-emoji" aria-hidden="true">${SLOT_EMOJI[e.slot] || "🍽"}</span>`;
      return `<li>
        ${lead}
        <span class="e-name">${escapeHtml(e.name)}</span>
        <span class="e-time">${time}</span>
        <span class="e-kcal">${fmt(e.kcal)}${e.p ? `<small>${fmt(e.p)} g</small>` : ""}</span>
        <button class="e-del" data-action="del-entry" data-id="${e.id}" aria-label="Remove ${escapeHtml(e.name)}">×</button>
      </li>`;
    }).join("");
  }

  function renderWeek() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = dayKeyOf(d);
      days.push({ key, date: d, c: calc(key), isToday: i === 0 });
    }

    const T = state.settings.target;
    const maxTotal = Math.max(T * 1.08, ...days.map((d) => d.c.total));
    const plotH = 89; // px available for bars inside the chart area

    const chart = $("weekChart");
    chart.innerHTML = days.map((d) => {
      const has = d.c.entries.length > 0;
      const h = has ? Math.max(3, Math.round((d.c.total / maxTotal) * plotH)) : 0;
      const over = has && d.c.total > T;
      const letter = d.date.toLocaleDateString("en-US", { weekday: "narrow" });
      const label = `${d.date.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })}: ` +
        (has ? `${fmt(d.c.total)} kcal, dinner ${fmt(d.c.N)}, target ${fmt(T)}` : "nothing logged");
      return `<div class="wk-col${d.isToday ? " is-today" : ""}" tabindex="0" role="img" aria-label="${label}" data-tip="${label}">
        ${over ? '<span class="wk-flag" aria-hidden="true">▲</span>' : ""}
        <div class="wk-bar${over ? " is-over" : ""}${has ? "" : " is-empty"}" style="height:${has ? h : 10}px"></div>
        <span class="wk-day" aria-hidden="true">${letter}</span>
      </div>`;
    }).join("");

    const targetLine = document.createElement("div");
    targetLine.className = "wk-target";
    targetLine.style.bottom = `${23 + Math.round((T / maxTotal) * plotH)}px`;
    chart.appendChild(targetLine);

    // streak: consecutive on-target days ending today (an unstarted today doesn't break it)
    let streak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const c = calc(dayKeyOf(d));
      if (c.entries.length === 0) { if (i === 0) continue; break; }
      if (c.total <= c.T) streak++; else break;
    }
    $("tileStreak").innerHTML = `${streak}<span class="tile-unit">day${streak === 1 ? "" : "s"}</span>`;

    const withDinner = days.filter((d) => d.c.N > 0);
    const fit = withDinner.filter((d) => d.c.total <= T);
    $("tileFunded").textContent = withDinner.length ? `${fit.length} of ${withDinner.length}` : "—";

    $("weekTableBody").innerHTML = days.map((d) => {
      const has = d.c.entries.length > 0;
      const name = d.isToday ? "Today" : d.date.toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" });
      if (!has) return `<tr><td>${name}</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>`;
      const diff = T - d.c.total;
      const diffTxt = diff >= 0
        ? `<span class="wk-under">−${fmt(diff)}</span>`
        : `<span class="wk-overtxt">+${fmt(-diff)}</span>`;
      return `<tr><td>${name}</td><td>${fmt(d.c.total)}</td><td>${fmt(d.c.N)}</td><td>${fmt(d.c.P)} g</td><td>${diffTxt}</td></tr>`;
    }).join("");
  }

  function renderStrips() {
    $("storageWarn").hidden = storageOk;
    $("welcomeStrip").hidden = state.settings.welcomed;
    $("welcomeNums").textContent =
      `${fmt(state.settings.target)} kcal/day, ${fmt(state.settings.reserve)} reserved for dinner`;
  }

  let recipeCat = "All";

  function renderRecipes() {
    document.querySelectorAll('[data-action="rcat"]').forEach((b) =>
      b.classList.toggle("is-on", b.dataset.cat === recipeCat));
    $("recipeList").innerHTML = RECIPES.map((r, i) => {
      if (recipeCat !== "All" && r.cat !== recipeCat) return "";
      const dense = (r.p * 4) / r.kcal >= 0.35;
      return `<details class="recipe">
        <summary>
          <span class="r-emoji" aria-hidden="true">${r.emoji}</span>
          <span class="r-name">${r.name}${dense ? ' <span class="r-dense" title="35%+ of calories from protein">💪</span>' : ""}</span>
          <span class="r-macros">${fmt(r.kcal)} · ${fmt(r.p)} g</span>
          <button class="r-add" data-action="log-recipe" data-i="${i}" aria-label="Log ${r.name}">+</button>
        </summary>
        <div class="r-body">
          <p class="r-ing">${r.ing}</p>
          <ol class="r-steps">${r.steps.map((s) => `<li>${s}</li>`).join("")}</ol>
          <button class="btn btn-primary btn-sm" data-action="log-recipe" data-i="${i}">Log it · ${fmt(r.kcal)} kcal</button>
        </div>
      </details>`;
    }).join("");
  }

  function renderAll() {
    const c = calc(currentKey);
    renderHeader();
    renderHero(c);
    renderMeter(c);
    renderProtein(c);
    renderDinner(c);
    renderSlots();
    renderEntries(c);
    renderWeek();
    renderStrips();
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[ch]));
  }

  /* ---------- mutations ---------- */

  let selectedSlot = defaultSlot();
  let sliceCount = 3;
  let lastAction = null;

  function defaultSlot() {
    const h = new Date().getHours();
    if (h < 11) return "breakfast";
    if (h < 15) return "lunch";
    if (h < 17) return "snack";
    return "dinner";
  }

  function addEntry(name, kcal, slot, p, photo) {
    kcal = Math.round(Number(kcal));
    if (!Number.isFinite(kcal) || kcal < 1 || kcal > 5000) return;
    p = Math.round(Number(p));
    if (!Number.isFinite(p) || p < 0) p = 0;
    const entry = {
      id: "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      name: String(name || "Food").slice(0, 60),
      kcal,
      p,
      slot,
      t: new Date().toISOString(),
    };
    if (typeof photo === "string" && photo.startsWith("data:image/")) entry.photo = photo;
    getDay(currentKey).entries.push(entry);
    lastAction = { type: "add", key: currentKey, id: entry.id };
    save();
    renderAll();
    toast(`${SLOT_EMOJI[slot] || ""} ${entry.name} · +${fmt(kcal)} kcal${p ? ` · ${fmt(p)} g protein` : ""}`, true);
  }

  function deleteEntry(id) {
    const day = getDay(currentKey);
    const idx = day.entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const [entry] = day.entries.splice(idx, 1);
    lastAction = { type: "del", key: currentKey, entry, idx };
    save();
    renderAll();
    toast(`Removed ${entry.name}`, true);
  }

  function undo() {
    if (!lastAction) return;
    const day = getDay(lastAction.key);
    if (lastAction.type === "add") {
      const i = day.entries.findIndex((e) => e.id === lastAction.id);
      if (i !== -1) day.entries.splice(i, 1);
    } else if (lastAction.type === "del") {
      day.entries.splice(Math.min(lastAction.idx, day.entries.length), 0, lastAction.entry);
    }
    lastAction = null;
    save();
    renderAll();
    hideToast();
  }

  function bumpReserve(delta) {
    const day = getDay(currentKey);
    const cur = Math.min(day.reserve ?? state.settings.reserve, state.settings.target);
    day.reserve = Math.max(0, Math.min(state.settings.target, cur + delta));
    save();
    renderAll();
  }

  /* ---------- toast ---------- */

  let toastTimer = null;
  function toast(text, undoable) {
    $("toastText").textContent = text;
    $("toastUndo").hidden = !undoable;
    $("toast").hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, 4500);
  }
  function hideToast() {
    $("toast").hidden = true;
    clearTimeout(toastTimer);
  }

  /* ---------- photo logging ---------- */

  let pendingPhoto = null; // { api: base64 jpeg for the estimate call, store: small data URL kept on the entry }

  async function processPhotoFile(file) {
    // Prefer createImageBitmap (applies EXIF orientation from phone cameras); fall back to <img>.
    let source = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
    if (!source) {
      source = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("unreadable image"));
        img.src = URL.createObjectURL(file);
      });
    }
    const w = source.naturalWidth || source.width;
    const h = source.naturalHeight || source.height;
    const render = (maxDim, quality) => {
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      canvas.getContext("2d").drawImage(source, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", quality);
    };
    return {
      api: render(1024, 0.85).split(",")[1], // bare base64 for the API
      store: render(320, 0.7),               // small data URL for the journal
    };
  }

  function openPhotoSheet() {
    $("photoPreview").src = "data:image/jpeg;base64," + pendingPhoto.api;
    $("photoName").value = "";
    $("photoKcal").value = "";
    $("photoProt").value = "";
    $("aiNote").hidden = true;
    const hasKey = Boolean((state.settings.apiKey || "").trim());
    $("estimateBtn").hidden = !hasKey;
    $("aiHint").hidden = hasKey;
    $("photoDialog").showModal();
  }

  async function estimateFromPhoto() {
    const btn = $("estimateBtn");
    const note = $("aiNote");
    const prevLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Estimating…";
    note.hidden = false;
    note.textContent = "Asking Claude to look at your plate…";
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": state.settings.apiKey.trim(),
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
          "anthropic-beta": "server-side-fallback-2026-07-01",
        },
        body: JSON.stringify({
          model: API_MODEL,
          max_tokens: 4096,
          fallbacks: "default",
          output_config: {
            effort: "low",
            format: {
              type: "json_schema",
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Short dish name for a food log, max 40 characters" },
                  kcal: { type: "integer", description: "Estimated total calories for the full visible portion" },
                  protein_g: { type: "integer", description: "Estimated grams of protein for the full visible portion" },
                  confidence: { type: "string", enum: ["low", "medium", "high"] },
                  note: { type: "string", description: "One short sentence stating the portion assumption" },
                },
                required: ["name", "kcal", "protein_g", "confidence", "note"],
                additionalProperties: false,
              },
            },
          },
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/jpeg", data: pendingPhoto.api } },
              { type: "text", text: "This is a photo someone took for their calorie-tracking food log. Estimate the nutrition of the full visible portion as one serving. Be realistic about home portion sizes, and total everything on the plate as one meal." },
            ],
          }],
        }),
      });
      if (!res.ok) {
        const msg =
          res.status === 401 ? "That API key was rejected — double-check it in settings." :
          res.status === 429 ? "Rate limited — give it a moment and try again." :
          res.status >= 500 ? "Anthropic's API is having a moment — try again shortly." :
          `The API returned an error (${res.status}).`;
        throw new Error(msg);
      }
      const data = await res.json();
      if (data.stop_reason === "refusal") throw new Error("The model declined this image — enter the numbers manually.");
      const textBlock = (data.content || []).find((b) => b.type === "text");
      const est = JSON.parse(textBlock.text);
      $("photoName").value = String(est.name || "").slice(0, 60);
      $("photoKcal").value = clampInt(est.kcal, 1, 5000, "");
      $("photoProt").value = clampInt(est.protein_g, 0, 400, "");
      const conf = String(est.confidence || "medium");
      note.textContent = `${conf.charAt(0).toUpperCase() + conf.slice(1)} confidence — ${est.note} Tweak before logging.`;
    } catch (err) {
      note.textContent = err instanceof TypeError
        ? "Couldn't reach the API from here (network blocked?). Enter the numbers manually."
        : (err.message || "Something went wrong — enter the numbers manually.");
    } finally {
      btn.disabled = false;
      btn.textContent = prevLabel;
    }
  }

  $("photoInput").addEventListener("change", async (ev) => {
    const file = ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    try {
      pendingPhoto = await processPhotoFile(file);
    } catch {
      toast("Couldn't read that image — try a different photo.");
      return;
    }
    openPhotoSheet();
  });

  $("photoForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!pendingPhoto || !$("photoKcal").value) return;
    addEntry(
      $("photoName").value.trim() || "From photo",
      $("photoKcal").value,
      selectedSlot,
      $("photoProt").value,
      pendingPhoto.store,
    );
    pendingPhoto = null;
    $("photoDialog").close();
  });

  $("closePhoto").addEventListener("click", () => { pendingPhoto = null; $("photoDialog").close(); });
  $("estimateBtn").addEventListener("click", estimateFromPhoto);
  $("lightboxDialog").addEventListener("click", () => $("lightboxDialog").close());

  // photos are a journal, not an archive: drop images (never the numbers) after a couple of weeks
  (function prunePhotos() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PHOTO_KEEP_DAYS);
    const cutKey = dayKeyOf(cutoff);
    let changed = false;
    for (const [key, day] of Object.entries(state.days)) {
      if (key >= cutKey) continue;
      for (const e of day.entries) {
        if (e.photo) { delete e.photo; changed = true; }
      }
    }
    if (changed) save();
  })();

  /* ---------- settings ---------- */

  const dlg = $("settingsDialog");
  let calcSex = "male";

  function openSettings() {
    $("setTarget").value = state.settings.target;
    $("setReserve").value = state.settings.reserve;
    $("setProtein").value = state.settings.proteinGoal;
    $("setApiKey").value = state.settings.apiKey;
    updateTargetNote();
    updateCalc();
    dlg.showModal();
  }

  function saveSettings() {
    const target = clampInt($("setTarget").value, 800, 6000, state.settings.target);
    const reserve = clampInt($("setReserve").value, 0, target, state.settings.reserve);
    const proteinGoal = clampInt($("setProtein").value, 40, 400, state.settings.proteinGoal);
    state.settings.target = target;
    state.settings.reserve = reserve;
    state.settings.proteinGoal = proteinGoal;
    state.settings.apiKey = $("setApiKey").value.trim();
    state.settings.welcomed = true;
    save();
    renderAll();
  }

  function clampInt(v, min, max, fallback) {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
  }

  function updateTargetNote() {
    const v = Number($("setTarget").value);
    $("targetNote").hidden = !(Number.isFinite(v) && v > 0 && v < 1200);
  }

  function suggestedTarget() {
    const age = clampInt($("calcAge").value, 18, 99, 35);
    const inches = clampInt($("calcHeight").value, 48, 90, 70);
    const lb = clampInt($("calcWeight").value, 80, 500, 200);
    const act = Number($("calcActivity").value);
    const goal = Number($("calcGoal").value);
    const kg = lb / 2.2046;
    const cm = inches * 2.54;
    const bmr = 10 * kg + 6.25 * cm - 5 * age + (calcSex === "male" ? 5 : -161);
    return Math.max(1000, Math.round((bmr * act - goal) / 50) * 50);
  }

  function updateCalc() {
    $("calcOut").innerHTML = `Suggested target: <b>${fmt(suggestedTarget())}</b> kcal/day`;
  }

  function exportData() {
    // the API key never leaves this device — strip it from backups
    const data = { ...state, settings: { ...state.settings, apiKey: "" } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dinner-fund-${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== "object" || !data.settings || !data.days) throw new Error("bad shape");
        state.settings = { ...DEFAULTS, ...data.settings, apiKey: state.settings.apiKey, welcomed: true };
        state.days = data.days;
        save();
        renderAll();
        dlg.close("cancel");
        toast("Data imported ✓");
      } catch {
        toast("That file doesn't look like a Dinner Fund export.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------- week chart tooltip ---------- */

  const tip = $("vizTip");
  function showTip(el) {
    tip.textContent = el.dataset.tip;
    tip.hidden = false;
    const r = el.getBoundingClientRect();
    const tr = tip.getBoundingClientRect();
    let x = r.left + r.width / 2 - tr.width / 2;
    x = Math.max(8, Math.min(window.innerWidth - tr.width - 8, x));
    tip.style.left = x + "px";
    tip.style.top = Math.max(8, r.top - tr.height - 8) + "px";
  }
  function hideTip() { tip.hidden = true; }

  /* ---------- events ---------- */

  document.addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-action]");
    if (!btn) return;
    const a = btn.dataset.action;

    if (a === "quick") addEntry(btn.dataset.name, btn.dataset.kcal, selectedSlot, btn.dataset.p);
    else if (a === "quick-dinner") addEntry(btn.dataset.name, btn.dataset.kcal, "dinner", btn.dataset.p);
    else if (a === "slot") { selectedSlot = btn.dataset.slot; renderSlots(); }
    else if (a === "del-entry") deleteEntry(btn.dataset.id);
    else if (a === "slice-minus") { sliceCount = Math.max(1, sliceCount - 1); renderDinner(calc(currentKey)); }
    else if (a === "slice-plus") { sliceCount = Math.min(16, sliceCount + 1); renderDinner(calc(currentKey)); }
    else if (a === "log-slices") addEntry(`Pizza · ${sliceCount} slice${sliceCount === 1 ? "" : "s"}`, sliceCount * SLICE_KCAL, "dinner", sliceCount * SLICE_PROT);
    else if (a === "log-recipe") {
      ev.preventDefault(); // a + button inside <summary> must not toggle the details
      const r = RECIPES[Number(btn.dataset.i)];
      if (r) addEntry(r.name, r.kcal, selectedSlot, r.p);
    }
    else if (a === "rcat") { recipeCat = btn.dataset.cat; renderRecipes(); }
    else if (a === "open-photo") $("photoInput").click();
    else if (a === "view-photo") {
      const entry = getDay(currentKey).entries.find((e) => e.id === btn.dataset.id);
      if (entry && entry.photo) {
        $("lightboxImg").src = entry.photo;
        $("lightboxCap").textContent =
          `${entry.name} · ${fmt(entry.kcal)} kcal${entry.p ? ` · ${fmt(entry.p)} g protein` : ""}`;
        $("lightboxDialog").showModal();
      }
    }
    else if (a === "res-minus") bumpReserve(-50);
    else if (a === "res-plus") bumpReserve(50);
    else if (a === "open-settings") openSettings();
    else if (a === "dismiss-welcome") { state.settings.welcomed = true; save(); renderStrips(); }
  });

  $("settingsBtn").addEventListener("click", openSettings);
  $("closeSettings").addEventListener("click", () => dlg.close("cancel"));
  dlg.addEventListener("close", () => { if (dlg.returnValue === "save") saveSettings(); });

  $("customForm").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const kcal = $("custKcal").value;
    if (!kcal) return;
    addEntry($("custName").value.trim() || "Custom", kcal, selectedSlot, $("custProt").value);
    $("custName").value = "";
    $("custKcal").value = "";
    $("custProt").value = "";
    $("custName").focus();
  });

  $("toastUndo").addEventListener("click", undo);
  $("setTarget").addEventListener("input", updateTargetNote);
  ["calcAge", "calcHeight", "calcWeight", "calcActivity", "calcGoal"].forEach((id) =>
    $(id).addEventListener("input", updateCalc));
  document.querySelectorAll("[data-calc-sex]").forEach((b) =>
    b.addEventListener("click", () => {
      calcSex = b.dataset.calcSex;
      document.querySelectorAll("[data-calc-sex]").forEach((x) =>
        x.classList.toggle("is-on", x === b));
      updateCalc();
    }));
  $("useSuggestion").addEventListener("click", () => {
    $("setTarget").value = suggestedTarget();
    updateTargetNote();
  });
  $("exportBtn").addEventListener("click", exportData);
  $("importFile").addEventListener("change", (ev) => {
    if (ev.target.files[0]) importData(ev.target.files[0]);
    ev.target.value = "";
  });
  $("resetBtn").addEventListener("click", () => {
    if (confirm("Erase all Dinner Fund data on this device?")) {
      state.settings = { ...DEFAULTS };
      state.days = {};
      save();
      renderAll();
      dlg.close("cancel");
    }
  });

  document.addEventListener("mouseover", (ev) => {
    const col = ev.target.closest(".wk-col");
    if (col) showTip(col);
  });
  document.addEventListener("mouseout", (ev) => {
    if (ev.target.closest(".wk-col")) hideTip();
  });
  document.addEventListener("focusin", (ev) => {
    const col = ev.target.closest(".wk-col");
    if (col) showTip(col); else hideTip();
  });

  // midnight rollover: a new day gets a fresh fund
  setInterval(() => {
    if (todayKey() !== currentKey) {
      currentKey = todayKey();
      selectedSlot = defaultSlot();
      renderAll();
    }
  }, 30000);

  /* ---------- boot ---------- */

  renderRecipes();
  renderAll();

  // PWA: only when served over http(s) with the manifest present (skips the artifact/demo build)
  if ("serviceWorker" in navigator && document.querySelector('link[rel="manifest"]') &&
      (location.protocol === "https:" || ["localhost", "127.0.0.1"].includes(location.hostname))) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
})();
