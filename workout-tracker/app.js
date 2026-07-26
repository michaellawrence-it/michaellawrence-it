/* app.js — state, progression logic, views, rest timer, charts. No build step,
   no dependencies, no network. Everything lives in localStorage. */

(function () {
  'use strict';

  /* Shown in Settings so you can confirm your phone picked up an edit. */
  const BUILD = '2026-07-26.3';

  /* ---------------------------------------------------------------------
     Storage contract — read this before changing anything below.

     KEY is permanent. Change it and every logged workout on the device
     becomes unreachable.

     SCHEMA is the shape of what's stored. Any change to that shape means:
     bump SCHEMA by one AND add the matching entry to MIGRATIONS. The old
     copy is snapshotted first, so a bad migration is recoverable.
  --------------------------------------------------------------------- */
  const KEY = 'ppl-tracker-v1';
  const SCHEMA = 2;
  const SNAPSHOT_PREFIX = 'ppl-tracker-snapshot-v';
  const QUARANTINE_PREFIX = 'ppl-tracker-unreadable-';
  const AUTOBACKUP_KEY = 'ppl-tracker-autobackup';

  const LB_PER_KG = 2.2046226218;

  /* =======================================================================
     State
  ======================================================================= */

  function todayISO(d) {
    const x = d || new Date();
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  }

  const DEFAULTS = {
    version: SCHEMA,
    unit: 'lb',
    bodyweight: 180,
    restSeconds: 120,
    cycleLength: 4,     // 4 = deload every 4th week, 3 = no deload
    weekOffset: 0,      // nudge the phase without moving the start date
    startDate: todayISO(),
    theme: 'system',
    sessions: [],
    active: null,
  };

  /* Coerce a stored session into the current shape. Type-only — it never
     invents or discards a logged set. */
  function normalizeSession(s) {
    if (!s || !Array.isArray(s.entries)) return s;
    s.entries.forEach((e) => {
      e.exerciseId = resolveExerciseId(e.exerciseId);
      if (!Array.isArray(e.options) || !e.options.length) e.options = [e.exerciseId];
      e.sets = (Array.isArray(e.sets) ? e.sets : []).map((x) => ({
        w: x.w === null || x.w === undefined || x.w === '' ? null : Number(x.w),
        r: x.r === null || x.r === undefined || x.r === '' ? null : Math.round(Number(x.r)),
        done: !!x.done,
      }));
      e.targetSets = Number(e.targetSets) || e.sets.length;
      e.repMin = Number(e.repMin) || 1;
      e.repMax = Number(e.repMax) || e.repMin;
      e.repTarget = Number(e.repTarget) || e.repMax;
      e.load = Number(e.load) || 1;
      e.note = typeof e.note === 'string' ? e.note : '';
    });
    return s;
  }

  /* Keyed by the version they produce. MIGRATIONS[n] turns v(n-1) into v(n). */
  const MIGRATIONS = {
    2(d) {
      d.sessions = (Array.isArray(d.sessions) ? d.sessions : []).filter((s) => s && Array.isArray(s.entries));
      d.sessions.forEach(normalizeSession);
      if (d.active) normalizeSession(d.active);
      return d;
    },
  };

  /* Set when the stored data is NEWER than this code — i.e. a stale copy of
     the app loaded from cache. Writing would silently downgrade real data, so
     we refuse to write at all until the app is updated. */
  let readOnlyReason = null;
  let recoveryNotice = null;

  let state = load();

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (err) {
      readOnlyReason = 'This browser is blocking local storage, so nothing can be saved. Private/incognito mode usually causes this.';
      return { ...DEFAULTS };
    }
    if (!raw) return { ...DEFAULTS };

    let parsed;
    try {
      parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') throw new Error('not an object');
    } catch (err) {
      // Never overwrite data we failed to understand — set it aside intact so
      // it can still be exported and repaired by hand.
      const stash = QUARANTINE_PREFIX + Date.now();
      try { localStorage.setItem(stash, raw); } catch (e) { /* nothing more we can do */ }
      recoveryNotice = { kind: 'unreadable', stash };
      console.error('Saved data could not be parsed; quarantined at ' + stash, err);
      return { ...DEFAULTS };
    }

    const stored = Number(parsed.version) || 1;

    if (stored > SCHEMA) {
      readOnlyReason = `This device has newer workout data (v${stored}) than the app currently loaded (v${SCHEMA}). ` +
        'Nothing will be saved until the app updates, so your history stays intact.';
      return { ...DEFAULTS, ...parsed };
    }

    if (stored < SCHEMA) {
      // One snapshot per source version, and never overwrite an existing one.
      const snapKey = SNAPSHOT_PREFIX + stored;
      try { if (!localStorage.getItem(snapKey)) localStorage.setItem(snapKey, raw); } catch (e) { /* best effort */ }

      let data = parsed;
      try {
        for (let v = stored + 1; v <= SCHEMA; v++) {
          if (!MIGRATIONS[v]) throw new Error('missing migration to v' + v);
          data = MIGRATIONS[v](data);
          data.version = v;
        }
      } catch (err) {
        console.error('Migration failed:', err);
        readOnlyReason = `Your data is v${stored} and could not be upgraded to v${SCHEMA}. ` +
          'Nothing will be saved. Export a backup from Settings before doing anything else.';
        return { ...DEFAULTS, ...parsed };
      }
      recoveryNotice = { kind: 'migrated', from: stored, to: SCHEMA };
      return { ...DEFAULTS, ...data, version: SCHEMA };
    }

    return { ...DEFAULTS, ...parsed, version: SCHEMA };
  }

  let saveTimer = null;
  function writeNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (readOnlyReason) return; // refuse to clobber data we can't safely handle
    try {
      state.version = SCHEMA;
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (err) {
      toast('Could not save — storage may be full');
      console.error(err);
    }
  }
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(writeNow, 120);
  }
  /* A backgrounded phone can be killed without warning — flush before that. */
  function flushSave() { if (saveTimer) writeNow(); }

  /* A second copy, rewritten only when a session is banked. If a later edit
     corrupts the live record, this is the fallback that isn't mid-workout. */
  function writeAutoBackup() {
    if (readOnlyReason) return;
    try {
      localStorage.setItem(AUTOBACKUP_KEY, JSON.stringify({ savedAt: Date.now(), state }));
    } catch (err) { /* backup is best effort; never block finishing a workout */ }
  }

  /* =======================================================================
     Small helpers
  ======================================================================= */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  function num(v) {
    if (v === '' || v === null || v === undefined) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  function fmtW(n) {
    if (n === null || n === undefined) return '—';
    return (Math.round(n * 10) / 10).toString().replace(/\.0$/, '');
  }

  function fmtInt(n) {
    return Math.round(n).toLocaleString();
  }

  function unitLabel() {
    return state.unit;
  }

  /* Smallest plate jump for the current unit. */
  function stepSize() {
    return state.unit === 'kg' ? 2.5 : 5;
  }

  function incFor(exId) {
    const lb = exOf(exId).inc || 5;
    if (state.unit === 'kg') return lb === 10 ? 5 : 2.5;
    return lb;
  }

  function roundToStep(x) {
    const s = stepSize();
    return Math.round(x / s) * s;
  }

  function fmtDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function fmtDateLong(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  }

  function daysAgo(iso) {
    const a = new Date(iso + 'T12:00:00');
    const b = new Date(todayISO() + 'T12:00:00');
    return Math.round((b - a) / 86400000);
  }

  function relDate(iso) {
    const d = daysAgo(iso);
    if (d === 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 14) return `${d}d ago`;
    return fmtDate(iso);
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* =======================================================================
     Week / phase
  ======================================================================= */

  function currentWeek(when) {
    return weekNumber(state.startDate, when) + (state.weekOffset || 0);
  }

  function currentPhase(when) {
    return phaseFor(currentWeek(when), state.cycleLength);
  }

  /* =======================================================================
     Lift math
  ======================================================================= */

  /* Bodyweight movements log *added* load; the bar for them is you. */
  function effectiveWeight(exId, w) {
    const ex = exOf(exId);
    if (ex.bw) return (Number(state.bodyweight) || 0) + (w || 0);
    return w || 0;
  }

  function e1rm(exId, w, r) {
    if (!r || r <= 0) return 0;
    const load = effectiveWeight(exId, w);
    if (!load) return 0;
    return load * (1 + r / 30); // Epley
  }

  function entryVolume(entry) {
    return entry.sets.reduce((sum, s) => {
      if (!s.r) return sum;
      return sum + effectiveWeight(entry.exerciseId, s.w) * s.r;
    }, 0);
  }

  function sessionVolume(session) {
    return session.entries.reduce((sum, e) => sum + entryVolume(e), 0);
  }

  function workingSets(entry) {
    return entry.sets.filter((s) => s.r && s.r > 0);
  }

  function topSet(entry) {
    const done = workingSets(entry);
    if (!done.length) return null;
    return done.reduce((best, s) => {
      const a = e1rm(entry.exerciseId, s.w, s.r);
      const b = best ? e1rm(entry.exerciseId, best.w, best.r) : -1;
      return a > b ? s : best;
    }, null);
  }

  /* Sessions, newest first. */
  function sortedSessions() {
    return state.sessions.slice().sort((a, b) => (a.ts === b.ts ? 0 : a.ts < b.ts ? 1 : -1));
  }

  function historyFor(exId) {
    const out = [];
    sortedSessions()
      .slice()
      .reverse()
      .forEach((s) => {
        s.entries.forEach((e) => {
          if (e.exerciseId === exId && workingSets(e).length) out.push({ session: s, entry: e });
        });
      });
    return out; // oldest first
  }

  function lastEntryFor(exId) {
    const h = historyFor(exId);
    return h.length ? h[h.length - 1] : null;
  }

  function bestE1RM(exId) {
    let best = 0;
    historyFor(exId).forEach(({ entry }) => {
      workingSets(entry).forEach((s) => {
        best = Math.max(best, e1rm(exId, s.w, s.r));
      });
    });
    return best;
  }

  /* Double progression: clear the top of the rep range on every working set at a
     given load, and the load goes up next time. Otherwise chase reps. */
  function suggestFor(rx) {
    const prev = lastEntryFor(rx.exerciseId);
    if (!prev) return null;

    const done = workingSets(prev.entry);
    if (!done.length) return null;

    const top = Math.max(...done.map((s) => s.w || 0));
    const atTop = done.filter((s) => (s.w || 0) === top);
    const minReps = Math.min(...atTop.map((s) => s.r));
    const earned = atTop.length >= prev.entry.targetSets && minReps >= rx.repMax;

    const base = earned ? top + incFor(rx.exerciseId) : top;
    const weight = rx.load === 1 ? base : Math.max(0, roundToStep(base * rx.load));

    return {
      weight,
      earned,
      lastWeight: top,
      lastDate: prev.session.date,
      lastSets: done.map((s) => `${fmtW(s.w)}×${s.r}`),
    };
  }

  /* =======================================================================
     Session drafts
  ======================================================================= */

  function newSession(dayKey) {
    const week = currentWeek();
    const phase = currentPhase();
    const rx = buildSession(dayKey, week, state.cycleLength);
    return {
      id: uid(),
      date: todayISO(),
      ts: Date.now(),
      day: dayKey,
      week,
      phase: phase.key,
      entries: rx.map((r) => ({
        slotId: r.slot.id,
        role: r.slot.role,
        exerciseId: r.exerciseId,
        options: r.slot.options,
        targetSets: r.sets,
        repMin: r.repMin,
        repMax: r.repMax,
        repTarget: r.repTarget,
        load: r.load,
        sets: Array.from({ length: r.sets }, () => ({ w: null, r: null, done: false })),
        note: '',
      })),
    };
  }

  function findEntry(slotId) {
    return state.active ? state.active.entries.find((e) => e.slotId === slotId) : null;
  }

  /* =======================================================================
     Rest timer
  ======================================================================= */

  const rest = { endsAt: 0, total: 0, raf: null };

  function startRest(seconds) {
    rest.total = seconds;
    rest.endsAt = Date.now() + seconds * 1000;
    $('#rest-bar').hidden = false;
    tickRest();
  }

  function stopRest() {
    rest.endsAt = 0;
    cancelAnimationFrame(rest.raf);
    $('#rest-bar').hidden = true;
  }

  function tickRest() {
    if (!rest.endsAt) return;
    const leftMs = rest.endsAt - Date.now();
    const left = Math.ceil(leftMs / 1000);
    const bar = $('#rest-bar');
    const over = left <= 0;
    const shown = Math.abs(left);
    $('#rest-time').textContent = `${over ? '+' : ''}${Math.floor(shown / 60)}:${String(shown % 60).padStart(2, '0')}`;
    bar.classList.toggle('over', over);
    const pct = over ? 100 : Math.max(0, 100 - (leftMs / (rest.total * 1000)) * 100);
    $('#rest-fill').style.width = pct + '%';

    if (over && !rest.beeped) {
      rest.beeped = true;
      beep();
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
    }
    if (!over) rest.beeped = false;

    rest.raf = requestAnimationFrame(tickRest);
  }

  function beep() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = (beep.ctx = beep.ctx || new Ctx());
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.36);
    } catch (err) {
      /* audio is a nicety, never a failure */
    }
  }

  /* Keep the screen awake mid-session where the browser allows it. */
  let wakeLock = null;
  async function requestWakeLock() {
    try {
      if ('wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
    } catch (err) { /* ignore */ }
  }
  function releaseWakeLock() {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (state.active) requestWakeLock();
    } else {
      flushSave();
    }
  });
  window.addEventListener('pagehide', flushSave);

  /* =======================================================================
     Chart — single series, one axis, crosshair + tooltip, table view below
  ======================================================================= */

  function niceTicks(min, max, count) {
    if (min === max) { min -= 1; max += 1; }
    const raw = (max - min) / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
    return ticks;
  }

  /* Charts hand their geometry to wireCharts() through here rather than
     round-tripping JSON through the DOM. */
  const chartRegistry = new Map();
  let chartSeq = 0;

  function lineChart(points, opts) {
    // points: [{ label, value, sub }]
    const W = 660, H = 250;
    const pad = { t: 14, r: 18, b: 26, l: 46 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;

    const vals = points.map((p) => p.value);
    const ticks = niceTicks(Math.min(...vals), Math.max(...vals), 4);
    const yMin = ticks[0];
    const yMax = ticks[ticks.length - 1];

    const x = (i) => (points.length === 1 ? pad.l + iw / 2 : pad.l + (i / (points.length - 1)) * iw);
    const y = (v) => pad.t + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;

    const grid = ticks
      .map((t) => `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="var(--line-soft)" stroke-width="1"/>
        <text x="${pad.l - 8}" y="${(y(t) + 4).toFixed(1)}" text-anchor="end" font-size="11" fill="var(--text-muted)">${fmtInt(t)}</text>`)
      .join('');

    const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`).join(' ');

    const dots = points
      .map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="4"
        fill="var(--series-1)" stroke="var(--surface-1)" stroke-width="2"/>`)
      .join('');

    // Date labels: first, last, and a middle one — never every point.
    const labelIdx = new Set([0, points.length - 1]);
    if (points.length > 4) labelIdx.add(Math.floor((points.length - 1) / 2));
    const xLabels = Array.from(labelIdx)
      .map((i) => {
        const anchor = i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle';
        return `<text x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="${anchor}" font-size="11" fill="var(--text-muted)">${esc(points[i].label)}</text>`;
      })
      .join('');

    // Direct label on the latest point only.
    const li = points.length - 1;
    const lastLabel = `<text x="${(x(li) - 8).toFixed(1)}" y="${(y(points[li].value) - 12).toFixed(1)}"
      text-anchor="end" font-size="12.5" font-weight="650" fill="var(--text-primary)">${fmtInt(points[li].value)}</text>`;

    const id = 'c' + ++chartSeq;
    chartRegistry.set(id, { points, W, H, pad, iw, ih, x, y, suffix: opts.suffix || '' });

    return `<div class="chart-wrap" data-chart="${id}">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.title)}">
        ${grid}
        <path d="${path}" fill="none" stroke="var(--series-1)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
        ${dots}
        ${xLabels}
        ${lastLabel}
        <g class="crosshair" hidden>
          <line y1="${pad.t}" y2="${pad.t + ih}" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="3 3"/>
          <circle r="6" fill="var(--series-1)" stroke="var(--surface-1)" stroke-width="2"/>
        </g>
      </svg>
      <div class="chart-tip" hidden></div>
    </div>`;
  }

  function wireCharts(root) {
    $$('[data-chart]', root).forEach((wrap) => {
      const g = chartRegistry.get(wrap.dataset.chart);
      if (!g || !g.points.length) return;
      const svg = $('svg', wrap);
      const tip = $('.chart-tip', wrap);
      const cross = $('.crosshair', wrap);
      const line = $('line', cross);
      const dot = $('circle', cross);
      const pts = g.points;

      function move(ev) {
        const rect = svg.getBoundingClientRect();
        const vx = ((ev.clientX - rect.left) / rect.width) * g.W;
        let idx = pts.length === 1 ? 0 : Math.round(((vx - g.pad.l) / g.iw) * (pts.length - 1));
        idx = Math.max(0, Math.min(pts.length - 1, idx));
        const p = pts[idx];
        cross.hidden = false;
        line.setAttribute('x1', g.x(idx));
        line.setAttribute('x2', g.x(idx));
        dot.setAttribute('cx', g.x(idx));
        dot.setAttribute('cy', g.y(p.value));
        tip.hidden = false;
        tip.innerHTML = `<div class="t-date">${esc(p.label)}</div><div><b>${fmtInt(p.value)}</b> ${esc(g.suffix)}${
          p.sub ? ` <span class="t-date">${esc(p.sub)}</span>` : ''
        }</div>`;
        const px = Math.min(rect.width - 8, Math.max(8, (g.x(idx) / g.W) * rect.width));
        tip.style.left = px + 'px';
        tip.style.top = (g.y(p.value) / g.H) * rect.height + 'px';
      }
      function leave() { cross.hidden = true; tip.hidden = true; }

      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerdown', move);
      svg.addEventListener('pointerleave', leave);
      svg.addEventListener('pointercancel', leave);
    });
  }

  /* =======================================================================
     Views
  ======================================================================= */

  const ICON_EMPTY = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M4 12h16M7 8v8M17 8v8M3 10v4M21 10v4"/></svg>`;

  function phasePill(phase) {
    return `<span class="pill phase-${phase.key}">${esc(phase.name)}</span>`;
  }

  function setHeader(title, sub, actionsHtml) {
    $('#page-title').textContent = title;
    $('#page-sub').innerHTML = sub || '';
    $('#page-actions').innerHTML = actionsHtml || '';
  }

  /* ---------- Home ---------- */

  function viewHome() {
    const week = currentWeek();
    const phase = currentPhase();
    setHeader('Today', `${fmtDateLong(todayISO())}`);

    let html = '';

    html += `<div class="card">
      <div class="spread">
        <div>
          <h2 style="font-size:15px">Week ${week + 1} · ${esc(phase.name)}</h2>
          <div class="small muted" style="margin-top:4px;max-width:46ch">${esc(phase.blurb)}</div>
        </div>
        ${phasePill(phase)}
      </div>
      <div class="row" style="margin-top:12px;gap:5px">
        ${WAVE.slice(0, state.cycleLength)
          .map((w, i) => `<div title="${esc(w.name)}" style="flex:1;height:4px;border-radius:2px;background:${
            i === week % state.cycleLength ? 'var(--series-1)' : 'var(--surface-3)'
          }"></div>`)
          .join('')}
      </div>
    </div>`;

    if (state.active) {
      const day = PROGRAM[state.active.day];
      const logged = state.active.entries.reduce((n, e) => n + workingSets(e).length, 0);
      html += `<div class="card" style="border-color:var(--series-1)">
        <div class="spread">
          <div>
            <div class="small muted">In progress</div>
            <h2 style="font-size:16px;margin-top:2px">${esc(day.name)} · ${logged} set${logged === 1 ? '' : 's'} logged</h2>
          </div>
          <button class="btn primary" data-action="resume">Resume</button>
        </div>
      </div>`;
    }

    html += `<div class="day-grid">` + DAY_KEYS.map(dayCard).join('') + `</div>`;

    html += weekCompareCard();

    $('#view').innerHTML = html;
  }

  function dayCard(dayKey) {
    const day = PROGRAM[dayKey];
    const last = sortedSessions().find((s) => s.day === dayKey);
    const week = currentWeek();
    const rx = buildSession(dayKey, week, state.cycleLength);
    const prevRx = week > 0 ? buildSession(dayKey, week - 1, state.cycleLength) : null;
    const swapped = prevRx ? rx.filter((r, i) => r.exerciseId !== prevRx[i].exerciseId).length : 0;

    const meta = last
      ? `Last ${relDate(last.date)} · ${fmtInt(sessionVolume(last))} ${unitLabel()} volume`
      : 'Not logged yet';

    return `<button class="day-btn" data-day="${dayKey}" data-action="start" data-arg="${dayKey}">
      <span class="dot"></span>
      <span style="flex:1;min-width:0">
        <span class="name">${esc(day.name)}</span>
        <span class="meta" style="display:block">${esc(meta)}</span>
        <span class="meta" style="display:block">${rx.length} movements${swapped ? ` · ${swapped} swapped vs last week` : ''}</span>
      </span>
      <span class="chev">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>
      </span>
    </button>`;
  }

  function weekKeyOf(iso) {
    const d = new Date(iso + 'T12:00:00');
    return todayISO(startOfWeek(d));
  }

  function weekCompareCard() {
    if (!state.sessions.length) {
      return `<div class="card empty">${ICON_EMPTY}<div>Log your first session and week-over-week numbers show up here.</div></div>`;
    }
    const thisWeek = weekKeyOf(todayISO());
    const lastWeekDate = new Date(thisWeek + 'T12:00:00');
    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
    const lastWeek = todayISO(lastWeekDate);

    const bucket = (wk) => state.sessions.filter((s) => weekKeyOf(s.date) === wk);
    const cur = bucket(thisWeek);
    const prev = bucket(lastWeek);

    const curVol = cur.reduce((n, s) => n + sessionVolume(s), 0);
    const prevVol = prev.reduce((n, s) => n + sessionVolume(s), 0);
    const curSets = cur.reduce((n, s) => n + s.entries.reduce((m, e) => m + workingSets(e).length, 0), 0);

    return `<div class="card">
      <div class="spread" style="margin-bottom:10px">
        <h2 style="font-size:15px">This week</h2>
        <span class="small muted">vs. last week</span>
      </div>
      <div class="stat-row">
        <div class="stat"><div class="k">Sessions</div><div class="v">${cur.length}${deltaSpan(cur.length, prev.length, 0)}</div></div>
        <div class="stat"><div class="k">Volume</div><div class="v">${fmtInt(curVol)}${deltaSpan(curVol, prevVol, 0, true)}</div></div>
        <div class="stat"><div class="k">Sets</div><div class="v">${curSets}</div></div>
      </div>
    </div>`;
  }

  function deltaSpan(cur, prev, digits, pct) {
    if (!prev) return '';
    const d = cur - prev;
    if (!d) return ` <span class="delta flat small">±0</span>`;
    const cls = d > 0 ? 'up' : 'down';
    const txt = pct ? `${d > 0 ? '+' : ''}${Math.round((d / prev) * 100)}%` : `${d > 0 ? '+' : ''}${d.toFixed(digits || 0)}`;
    return ` <span class="delta ${cls} small">${txt}</span>`;
  }

  /* ---------- Session ---------- */

  function viewSession() {
    const s = state.active;
    if (!s) { location.hash = '#/home'; return; }
    const day = PROGRAM[s.day];
    const phase = WAVE.find((w) => w.key === s.phase) || WAVE[0];

    setHeader(
      day.name,
      `Week ${s.week + 1} · ${esc(phase.name)} · ${esc(fmtDate(s.date))}`,
      `<button class="btn sm ghost" data-action="finish">Finish</button>`
    );

    const body = s.entries.map((e, i) => exerciseCard(e, i)).join('');

    $('#view').innerHTML = `
      <div class="card small" style="display:flex;gap:9px;align-items:flex-start">
        ${phasePill(phase)}
        <span class="muted" style="flex:1">${esc(phase.blurb)}</span>
      </div>
      ${body}
      <div class="stack" style="margin-top:16px">
        <button class="btn primary block" data-action="finish">Finish workout</button>
        <button class="btn ghost block danger" data-action="discard">Discard session</button>
      </div>`;
    requestWakeLock();
  }

  function exerciseCard(entry, i) {
    const ex = exOf(entry.exerciseId);
    const rx = {
      exerciseId: entry.exerciseId,
      repMax: entry.repMax,
      load: entry.load,
    };
    const sug = suggestFor(rx);
    const best = bestE1RM(entry.exerciseId);

    const targetTxt = `${entry.targetSets} × ${entry.repMin}–${entry.repMax}` +
      (entry.repTarget ? ` &nbsp;<span class="muted">aim ${entry.repTarget}</span>` : '');

    const swap = entry.options && entry.options.length > 1
      ? `<select class="swap" data-field="swap" data-slot="${entry.slotId}" aria-label="Swap variation" style="width:auto;min-height:34px;padding:5px 26px 5px 9px;font-size:12.5px">
          ${entry.options.map((o) => `<option value="${o}"${o === entry.exerciseId ? ' selected' : ''}>${esc(exOf(o).name)}</option>`).join('')}
        </select>`
      : '';

    const prevLine = sug
      ? `<div class="prev-line">Last ${esc(relDate(sug.lastDate))}: <b>${esc(sug.lastSets.join(', '))}</b>${
          sug.earned ? ` · <span class="delta up">earned +${fmtW(incFor(entry.exerciseId))}</span>` : ''
        }</div>`
      : `<div class="prev-line">No history yet — this becomes your baseline.</div>`;

    const sugW = sug ? sug.weight : null;

    const rows = entry.sets
      .map(
        (s, idx) => `<div class="set-row${s.done ? ' done' : ''}" data-slot="${entry.slotId}" data-set="${idx}">
          <div class="n">${idx + 1}</div>
          <input type="number" inputmode="decimal" step="any" data-field="w" data-slot="${entry.slotId}" data-set="${idx}"
                 value="${s.w === null ? '' : s.w}" placeholder="${sugW !== null ? fmtW(sugW) : (ex.bw ? '0' : '')}"
                 aria-label="Set ${idx + 1} weight">
          <input type="number" inputmode="numeric" step="1" data-field="r" data-slot="${entry.slotId}" data-set="${idx}"
                 value="${s.r === null ? '' : s.r}" placeholder="${entry.repTarget}"
                 aria-label="Set ${idx + 1} reps">
          <button class="check" data-action="toggle-set" data-slot="${entry.slotId}" data-set="${idx}" aria-label="Mark set ${idx + 1} complete">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
          </button>
        </div>`
      )
      .join('');

    return `<section class="card ex-card" data-ex="${entry.slotId}">
      <header class="ex-head">
        <span class="idx">${i + 1}</span>
        <span style="flex:1;min-width:0">
          <span class="role" style="display:block">${esc(entry.role)}</span>
          <span class="name" style="display:block">${esc(ex.name)}</span>
          <span class="target" style="display:block">${targetTxt}${
            sugW !== null ? ` &nbsp;·&nbsp; start <b>${fmtW(sugW)} ${esc(unitLabel())}</b>` : ''
          }</span>
        </span>
        ${swap}
      </header>

      <div class="set-list">
        <div class="set-head"><span>#</span><span>${esc(ex.bw ? 'added ' + unitLabel() : unitLabel())}</span><span>reps</span><span></span></div>
        ${rows}
      </div>
      ${prevLine}
      <footer class="ex-foot">
        <button class="btn sm ghost" data-action="fill" data-slot="${entry.slotId}">Fill target</button>
        <button class="btn sm ghost" data-action="add-set" data-slot="${entry.slotId}">+ Set</button>
        ${entry.sets.length > 1 ? `<button class="btn sm ghost" data-action="del-set" data-slot="${entry.slotId}">− Set</button>` : ''}
        ${entry.note ? '' : `<button class="btn sm ghost" data-action="show-note" data-slot="${entry.slotId}">+ Note</button>`}
        <span class="vol" data-vol="${entry.slotId}">${volLine(entry, best)}</span>
      </footer>
      <input class="note-input" type="text" data-field="note" data-slot="${entry.slotId}" ${entry.note ? '' : 'hidden'}
             value="${esc(entry.note || '')}" placeholder="Form cue, pain, machine setting…">
    </section>`;
  }

  function volLine(entry, best) {
    const v = entryVolume(entry);
    if (!v) return '';
    const top = topSet(entry);
    const cur = top ? e1rm(entry.exerciseId, top.w, top.r) : 0;
    const isPR = cur > 0 && cur >= (best || 0) - 0.01;
    return `${fmtInt(v)} ${unitLabel()}${isPR ? ' <span class="pill pr">PR</span>' : ''}`;
  }

  function refreshVol(slotId) {
    const entry = findEntry(slotId);
    if (!entry) return;
    const el = $(`[data-vol="${slotId}"]`);
    if (el) el.innerHTML = volLine(entry, bestE1RM(entry.exerciseId));
  }

  /* ---------- History ---------- */

  function viewHistory() {
    setHeader('History', `${state.sessions.length} session${state.sessions.length === 1 ? '' : 's'} logged`);
    const sessions = sortedSessions();
    if (!sessions.length) {
      $('#view').innerHTML = `<div class="card empty">${ICON_EMPTY}<div>Nothing logged yet.</div></div>`;
      return;
    }

    const groups = new Map();
    sessions.forEach((s) => {
      const k = weekKeyOf(s.date);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(s);
    });

    let html = '';
    groups.forEach((list, wk) => {
      const vol = list.reduce((n, s) => n + sessionVolume(s), 0);
      const ph = WAVE.find((w) => w.key === list[0].phase) || WAVE[0];
      html += `<div class="spread" style="margin:16px 2px 8px">
        <h2 style="font-size:13px;color:var(--text-secondary)">Week of ${esc(fmtDate(wk))}</h2>
        <span class="small muted">${phasePill(ph)} ${fmtInt(vol)} ${esc(unitLabel())}</span>
      </div>`;
      html += list
        .map((s) => {
          const sets = s.entries.reduce((n, e) => n + workingSets(e).length, 0);
          return `<button class="hist-item" data-day="${s.day}" data-action="open-session" data-arg="${s.id}">
            <span class="dot"></span>
            <span style="flex:1">
              <span style="display:block;font-weight:600">${esc(PROGRAM[s.day].name)}</span>
              <span class="small muted">${esc(fmtDate(s.date))} · ${sets} sets · ${fmtInt(sessionVolume(s))} ${esc(unitLabel())}</span>
            </span>
            <span class="muted"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></span>
          </button>`;
        })
        .join('');
    });

    $('#view').innerHTML = html;
  }

  function viewSessionDetail(id) {
    const s = state.sessions.find((x) => x.id === id);
    if (!s) { location.hash = '#/history'; return; }
    const ph = WAVE.find((w) => w.key === s.phase) || WAVE[0];
    setHeader(PROGRAM[s.day].name, `${esc(fmtDateLong(s.date))} · Week ${s.week + 1}`,
      `<button class="btn sm danger" data-action="delete-session" data-arg="${s.id}">Delete</button>`);

    // The same day, one session earlier — the natural comparison.
    const prior = sortedSessions().filter((x) => x.day === s.day && x.ts < s.ts)[0];

    let html = `<div class="card small row" style="gap:9px">${phasePill(ph)}
      <span class="muted">${fmtInt(sessionVolume(s))} ${esc(unitLabel())} total volume${
        prior ? ` · ${deltaSpan(Math.round(sessionVolume(s)), Math.round(sessionVolume(prior)), 0, true).trim()} vs ${esc(fmtDate(prior.date))}` : ''
      }</span></div>`;

    html += `<div class="card"><div class="scroll-x"><table class="data">
      <thead><tr><th>Movement</th><th>Sets</th><th>Top set</th><th>Volume</th><th>Δ</th></tr></thead><tbody>`;

    s.entries.forEach((e) => {
      const done = workingSets(e);
      if (!done.length) return;
      const top = topSet(e);
      const vol = entryVolume(e);
      const pe = prior && prior.entries.find((x) => x.exerciseId === e.exerciseId);
      const pVol = pe ? entryVolume(pe) : 0;
      const d = pVol ? Math.round(((vol - pVol) / pVol) * 100) : null;
      html += `<tr>
        <td>${esc(exOf(e.exerciseId).name)}${e.note ? `<div class="small muted">${esc(e.note)}</div>` : ''}</td>
        <td>${done.map((x) => `${fmtW(x.w)}×${x.r}`).join('<br>')}</td>
        <td>${top ? `${fmtW(top.w)} × ${top.r}` : '—'}</td>
        <td>${fmtInt(vol)}</td>
        <td class="delta ${d === null ? 'flat' : d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}">${d === null ? '—' : (d > 0 ? '+' : '') + d + '%'}</td>
      </tr>`;
    });

    html += `</tbody></table></div></div>`;
    html += `<button class="btn ghost block" data-action="repeat" data-arg="${s.id}">Start this workout again</button>`;
    $('#view').innerHTML = html;
  }

  /* ---------- Progress ---------- */

  const METRICS = [
    { key: 'e1rm', name: 'Est. 1RM', unitful: true },
    { key: 'top', name: 'Top set', unitful: true },
    { key: 'vol', name: 'Volume', unitful: true },
  ];

  let progressEx = null;
  let progressMetric = 'e1rm';

  function loggedExerciseIds() {
    const ids = new Set();
    state.sessions.forEach((s) => s.entries.forEach((e) => { if (workingSets(e).length) ids.add(e.exerciseId); }));
    return Array.from(ids);
  }

  function viewProgress() {
    setHeader('Progress', 'Week over week, per movement');
    const ids = loggedExerciseIds();
    if (!ids.length) {
      $('#view').innerHTML = `<div class="card empty">${ICON_EMPTY}<div>Log a couple of sessions and your trend lines appear here.</div></div>`;
      return;
    }
    if (!progressEx || !ids.includes(progressEx)) progressEx = ids[0];

    // Group the picker by day so it reads like the program.
    const byDay = DAY_KEYS.map((dk) => {
      const inDay = ids.filter((id) => PROGRAM[dk].slots.some((sl) => sl.options.includes(id)));
      if (!inDay.length) return '';
      return `<optgroup label="${esc(PROGRAM[dk].name)}">${inDay
        .map((id) => `<option value="${id}"${id === progressEx ? ' selected' : ''}>${esc(exOf(id).name)}</option>`)
        .join('')}</optgroup>`;
    }).join('');

    const hist = historyFor(progressEx);
    const metric = METRICS.find((m) => m.key === progressMetric);

    const points = hist.map(({ session, entry }) => {
      const top = topSet(entry);
      let value;
      if (progressMetric === 'e1rm') value = Math.round(e1rm(entry.exerciseId, top.w, top.r));
      else if (progressMetric === 'top') value = effectiveWeight(entry.exerciseId, top.w);
      else value = Math.round(entryVolume(entry));
      return { label: fmtDate(session.date), value, sub: `${fmtW(top.w)} × ${top.r}` };
    });

    const best = Math.round(bestE1RM(progressEx));
    const first = points[0], last = points[points.length - 1];
    const gain = points.length > 1 && first.value ? Math.round(((last.value - first.value) / first.value) * 100) : null;

    let html = `<div class="field"><select data-field="progress-ex" aria-label="Movement">${byDay}</select></div>`;

    html += `<div class="stat-row" style="margin-bottom:12px">
      <div class="stat"><div class="k">Best est. 1RM</div><div class="v">${best ? fmtInt(best) : '—'}</div></div>
      <div class="stat"><div class="k">Sessions</div><div class="v">${points.length}</div></div>
      <div class="stat"><div class="k">Since start</div><div class="v">${gain === null ? '—' : (gain > 0 ? '+' : '') + gain + '%'}</div></div>
    </div>`;

    html += `<div class="card">
      <div class="spread" style="margin-bottom:10px;gap:8px;flex-wrap:wrap">
        <h2 style="font-size:14px">${esc(metric.name)} <span class="muted" style="font-weight:400">(${esc(unitLabel())})</span></h2>
        <div class="seg">${METRICS.map((m) => `<button data-action="metric" data-arg="${m.key}" aria-pressed="${m.key === progressMetric}">${esc(m.name)}</button>`).join('')}</div>
      </div>
      ${points.length > 1
        ? lineChart(points, { title: `${metric.name} over time for ${exOf(progressEx).name}`, suffix: unitLabel() })
        : `<div class="empty small">One session logged — the trend line needs at least two.</div>`}
    </div>`;

    html += `<div class="card"><div class="scroll-x"><table class="data">
      <thead><tr><th>Date</th><th>Sets</th><th>Top set</th><th>Est. 1RM</th><th>Volume</th><th>Δ vol</th></tr></thead><tbody>`;
    hist
      .slice()
      .reverse()
      .forEach(({ session, entry }, i, arr) => {
        const top = topSet(entry);
        const vol = entryVolume(entry);
        const nextOlder = arr[i + 1];
        const pv = nextOlder ? entryVolume(nextOlder.entry) : 0;
        const d = pv ? Math.round(((vol - pv) / pv) * 100) : null;
        html += `<tr>
          <td>${esc(fmtDate(session.date))}</td>
          <td>${workingSets(entry).map((x) => `${fmtW(x.w)}×${x.r}`).join(', ')}</td>
          <td>${fmtW(top.w)} × ${top.r}</td>
          <td>${fmtInt(e1rm(entry.exerciseId, top.w, top.r))}</td>
          <td>${fmtInt(vol)}</td>
          <td class="delta ${d === null ? 'flat' : d > 0 ? 'up' : d < 0 ? 'down' : 'flat'}">${d === null ? '—' : (d > 0 ? '+' : '') + d + '%'}</td>
        </tr>`;
      });
    html += `</tbody></table></div></div>`;

    $('#view').innerHTML = html;
    wireCharts($('#view'));
  }

  /* ---------- Settings ---------- */

  function viewSettings() {
    setHeader('Settings', 'Program, units, and your data');
    $('#view').innerHTML = `
      <div class="card">
        <h2 style="font-size:14px;margin-bottom:10px">Program</h2>
        <label class="field"><span class="label">Program start (week 1 begins this week)</span>
          <input type="date" data-field="startDate" value="${esc(state.startDate)}"></label>
        <label class="field"><span class="label">Cycle</span>
          <select data-field="cycleLength">
            <option value="4"${state.cycleLength === 4 ? ' selected' : ''}>4 weeks — Volume · Build · Intensity · Deload</option>
            <option value="3"${state.cycleLength === 3 ? ' selected' : ''}>3 weeks — no deload</option>
          </select></label>
        <label class="field"><span class="label">Phase nudge (skip ahead / back a week)</span>
          <input type="number" step="1" data-field="weekOffset" value="${state.weekOffset}"></label>
        <div class="small muted">Currently week ${currentWeek() + 1} · ${esc(currentPhase().name)}</div>
      </div>

      <div class="card">
        <h2 style="font-size:14px;margin-bottom:10px">Lifting</h2>
        <label class="field"><span class="label">Units</span>
          <select data-field="unit">
            <option value="lb"${state.unit === 'lb' ? ' selected' : ''}>Pounds (lb)</option>
            <option value="kg"${state.unit === 'kg' ? ' selected' : ''}>Kilograms (kg)</option>
          </select></label>
        <div class="small muted" style="margin:-6px 0 12px">Switching converts every logged weight.</div>
        <label class="field"><span class="label">Bodyweight (${esc(unitLabel())}) — used for pull-up and dip volume</span>
          <input type="number" step="any" inputmode="decimal" data-field="bodyweight" value="${state.bodyweight}"></label>
        <label class="field"><span class="label">Rest timer (seconds)</span>
          <input type="number" step="15" inputmode="numeric" data-field="restSeconds" value="${state.restSeconds}"></label>
        <label class="field"><span class="label">Theme</span>
          <select data-field="theme">
            <option value="system"${state.theme === 'system' ? ' selected' : ''}>Match device</option>
            <option value="dark"${state.theme === 'dark' ? ' selected' : ''}>Dark</option>
            <option value="light"${state.theme === 'light' ? ' selected' : ''}>Light</option>
          </select></label>
      </div>

      <div class="card">
        <h2 style="font-size:14px;margin-bottom:10px">Your data</h2>
        <div class="small muted" style="margin-bottom:11px">Everything is stored on this device only. Back it up now and then.</div>
        <div class="stack">
          <button class="btn block" data-action="export-json">Export backup (.json)</button>
          <button class="btn block" data-action="export-csv">Export for spreadsheets (.csv)</button>
          <button class="btn block ghost" data-action="import">Restore from a file</button>
          <button class="btn block ghost" data-action="restore-autobackup">Restore last auto-backup</button>
          <button class="btn block danger" data-action="wipe">Erase all data</button>
        </div>
        <div class="small muted" style="margin-top:11px">${autoBackupLine()}</div>
        <input type="file" accept="application/json,.json" id="import-file" hidden>
      </div>

      <div class="card">
        <h2 style="font-size:14px;margin-bottom:10px">App version</h2>
        <table class="data"><tbody>
          <tr><td>Build</td><td class="tabular">${esc(BUILD)}</td></tr>
          <tr><td>Data format</td><td class="tabular">v${SCHEMA}</td></tr>
          <tr><td>Sessions stored</td><td class="tabular">${state.sessions.length}</td></tr>
        </tbody></table>
        <button class="btn block ghost" style="margin-top:11px" data-action="hard-refresh">Force update from server</button>
        <div class="small muted" style="margin-top:8px">
          Clears the offline cache and reloads the code. Your logged workouts are not touched.
        </div>
      </div>

      <div class="card small muted">
        Estimated 1RM uses the Epley formula (weight × (1 + reps ÷ 30)); it drifts above ~12 reps,
        so treat the high-rep accessory numbers as a trend, not a max.
      </div>`;
  }

  function autoBackupLine() {
    let b;
    try { b = JSON.parse(localStorage.getItem(AUTOBACKUP_KEY)); } catch (err) { b = null; }
    if (!b || !b.savedAt) return 'No auto-backup yet — one is written every time you finish a session.';
    const n = b.state && Array.isArray(b.state.sessions) ? b.state.sessions.length : 0;
    return `Auto-backup: ${n} sessions, saved ${new Date(b.savedAt).toLocaleString()}.`;
  }

  /* =======================================================================
     Actions
  ======================================================================= */

  const actions = {
    start(dayKey) {
      if (state.active && state.active.day !== dayKey) {
        if (!confirm(`You have an unfinished ${PROGRAM[state.active.day].name} session. Discard it?`)) return;
      }
      if (!state.active || state.active.day !== dayKey) state.active = newSession(dayKey);
      save();
      location.hash = '#/session';
    },

    resume() { location.hash = '#/session'; },

    'toggle-set'(_, el) {
      const slotId = el.dataset.slot;
      const idx = Number(el.dataset.set);
      const entry = findEntry(slotId);
      if (!entry) return;
      const set = entry.sets[idx];
      const row = el.closest('.set-row');

      if (!set.done) {
        // Adopt the suggested numbers if the lifter just taps through.
        const wInput = $(`input[data-field="w"][data-slot="${slotId}"][data-set="${idx}"]`);
        const rInput = $(`input[data-field="r"][data-slot="${slotId}"][data-set="${idx}"]`);
        if (set.w === null && wInput && wInput.placeholder !== '') { set.w = num(wInput.placeholder); wInput.value = set.w; }
        if (set.r === null && rInput && rInput.placeholder !== '') { set.r = num(rInput.placeholder); rInput.value = set.r; }
        if (set.r === null) { toast('Enter reps first'); return; }
        set.done = true;
        startRest(Number(state.restSeconds) || 120);
      } else {
        set.done = false;
      }
      row.classList.toggle('done', set.done);
      refreshVol(slotId);
      save();
    },

    fill(slotId) {
      const entry = findEntry(slotId);
      if (!entry) return;
      const sug = suggestFor({ exerciseId: entry.exerciseId, repMax: entry.repMax, load: entry.load });
      entry.sets.forEach((s) => {
        if (s.w === null && sug) s.w = sug.weight;
        if (s.r === null) s.r = entry.repTarget;
      });
      save();
      render();
    },

    'add-set'(slotId) {
      const entry = findEntry(slotId);
      if (!entry) return;
      entry.sets.push({ w: null, r: null, done: false });
      save();
      render();
    },

    'show-note'(slotId, el) {
      const input = $(`input[data-field="note"][data-slot="${slotId}"]`);
      if (!input) return;
      input.hidden = false;
      input.focus();
      el.remove();
    },

    'del-set'(slotId) {
      const entry = findEntry(slotId);
      if (!entry || entry.sets.length < 2) return;
      entry.sets.pop();
      save();
      render();
    },

    finish() {
      const s = state.active;
      if (!s) return;
      const logged = s.entries.reduce((n, e) => n + workingSets(e).length, 0);
      if (!logged) { toast('Nothing logged yet'); return; }
      if (!confirm(`Finish and save this ${PROGRAM[s.day].name} session? (${logged} sets)`)) return;

      // Drop empty sets so history stays honest.
      s.entries.forEach((e) => { e.sets = e.sets.filter((x) => x.r && x.r > 0); });
      s.entries = s.entries.filter((e) => e.sets.length);
      s.ts = Date.now();
      state.sessions.push(s);
      state.active = null;
      stopRest();
      releaseWakeLock();
      writeNow();          // bank it immediately, not on the debounce
      writeAutoBackup();
      toast('Session saved');
      location.hash = '#/home';
    },

    discard() {
      if (!confirm('Discard this session? Nothing will be saved.')) return;
      state.active = null;
      stopRest();
      releaseWakeLock();
      save();
      location.hash = '#/home';
    },

    'hard-refresh'() { hardRefresh(); },

    'dismiss-banner'() {
      recoveryNotice = null;
      updateWaiting = false;
      renderBanner();
    },

    'export-quarantine'() {
      if (!recoveryNotice || !recoveryNotice.stash) return;
      const raw = localStorage.getItem(recoveryNotice.stash);
      if (!raw) { toast('Nothing to export'); return; }
      download(`ppl-unreadable-${todayISO()}.json`, raw, 'application/json');
    },

    'restore-autobackup'() {
      let backup;
      try { backup = JSON.parse(localStorage.getItem(AUTOBACKUP_KEY)); } catch (err) { backup = null; }
      if (!backup || !backup.state || !Array.isArray(backup.state.sessions)) {
        toast('No auto-backup on this device');
        return;
      }
      const when = new Date(backup.savedAt).toLocaleString();
      const n = backup.state.sessions.length;
      if (!confirm(`Replace current data with the auto-backup from ${when} (${n} sessions)?`)) return;
      state = { ...DEFAULTS, ...backup.state, version: SCHEMA };
      recoveryNotice = null;
      writeNow();
      applyTheme();
      renderBanner();
      render();
      toast(`Restored ${n} sessions`);
    },

    'open-session'(id) { location.hash = '#/session/' + id; },

    'delete-session'(id) {
      if (!confirm('Delete this session permanently?')) return;
      state.sessions = state.sessions.filter((s) => s.id !== id);
      save();
      location.hash = '#/history';
    },

    repeat(id) {
      const s = state.sessions.find((x) => x.id === id);
      if (!s) return;
      actions.start(s.day);
    },

    metric(key) { progressMetric = key; render(); },

    'rest-add'() {
      if (!rest.endsAt) return startRest(30);
      rest.endsAt += 30000;
      rest.total += 30;
    },
    'rest-stop'() { stopRest(); },

    'export-json'() {
      download(`ppl-backup-${todayISO()}.json`, JSON.stringify(state, null, 2), 'application/json');
    },

    'export-csv'() {
      const rows = [['date', 'day', 'week', 'phase', 'movement', 'set', 'weight', 'unit', 'reps', 'est_1rm', 'note']];
      sortedSessions().slice().reverse().forEach((s) => {
        s.entries.forEach((e) => {
          e.sets.forEach((set, i) => {
            if (!set.r) return;
            rows.push([
              s.date, PROGRAM[s.day].name, s.week + 1, s.phase,
              exOf(e.exerciseId).name,
              i + 1, set.w === null ? '' : set.w, state.unit, set.r,
              Math.round(e1rm(e.exerciseId, set.w, set.r)), e.note || '',
            ]);
          });
        });
      });
      const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
      download(`ppl-log-${todayISO()}.csv`, csv, 'text/csv');
    },

    import() { $('#import-file').click(); },

    wipe() {
      if (!confirm('Erase every logged session and setting on this device? This cannot be undone.')) return;
      if (!confirm('Really erase everything?')) return;
      state = { ...DEFAULTS, startDate: todayISO() };
      localStorage.removeItem(KEY);
      save();
      location.hash = '#/home';
      render();
      toast('All data erased');
    },
  };

  function download(name, text, type) {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Exported');
  }

  /* =======================================================================
     Field handlers
  ======================================================================= */

  function onFieldInput(el) {
    const f = el.dataset.field;

    if (f === 'w' || f === 'r') {
      const entry = findEntry(el.dataset.slot);
      if (!entry) return;
      const set = entry.sets[Number(el.dataset.set)];
      const v = num(el.value);
      set[f] = f === 'r' && v !== null ? Math.round(v) : v;
      refreshVol(el.dataset.slot);
      save();
      return;
    }

    if (f === 'note') {
      const entry = findEntry(el.dataset.slot);
      if (entry) { entry.note = el.value; save(); }
      return;
    }

    if (f === 'swap') {
      const entry = findEntry(el.dataset.slot);
      if (entry) { entry.exerciseId = el.value; save(); render(); }
      return;
    }

    if (f === 'progress-ex') { progressEx = el.value; render(); return; }

    // ---- settings ----
    if (f === 'unit') {
      const to = el.value;
      if (to !== state.unit) convertUnits(state.unit, to);
      return;
    }
    if (f === 'theme') {
      state.theme = el.value;
      applyTheme();
      save();
      return;
    }
    if (f === 'startDate') { state.startDate = el.value || todayISO(); save(); render(); return; }
    if (f === 'cycleLength') { state.cycleLength = Number(el.value); save(); render(); return; }
    if (f === 'weekOffset') { state.weekOffset = Math.round(num(el.value) || 0); save(); render(); return; }
    if (f === 'bodyweight') { state.bodyweight = num(el.value) || 0; save(); return; }
    if (f === 'restSeconds') { state.restSeconds = Math.max(10, num(el.value) || 120); save(); return; }
  }

  function convertUnits(from, to) {
    const f = to === 'kg' ? 1 / LB_PER_KG : LB_PER_KG;
    const conv = (n) => (n === null || n === undefined ? n : Math.round(n * f * 2) / 2);
    const walk = (session) => session.entries.forEach((e) => e.sets.forEach((s) => { s.w = conv(s.w); }));
    state.sessions.forEach(walk);
    if (state.active) walk(state.active);
    state.bodyweight = conv(state.bodyweight);
    state.unit = to;
    save();
    render();
    toast(`Converted to ${to}`);
  }

  /* =======================================================================
     Theme + routing
  ======================================================================= */

  /* =======================================================================
     Banners — the loud states: read-only, recovered, update waiting
  ======================================================================= */

  let updateWaiting = false;

  function renderBanner() {
    const el = $('#banner');
    let html = '';
    let kind = '';

    if (readOnlyReason) {
      kind = 'bad';
      html = `<div><b>Not saving.</b> ${esc(readOnlyReason)}</div>
        <div class="row" style="gap:7px;margin-top:8px">
          <button class="btn sm" data-action="hard-refresh">Update app</button>
          <button class="btn sm ghost" data-action="export-json">Export backup</button>
        </div>`;
    } else if (recoveryNotice && recoveryNotice.kind === 'unreadable') {
      kind = 'bad';
      html = `<div><b>Saved data could not be read.</b> The unreadable copy has been set aside untouched —
        download it before logging anything new.</div>
        <div class="row" style="gap:7px;margin-top:8px">
          <button class="btn sm" data-action="export-quarantine">Download it</button>
          <button class="btn sm ghost" data-action="restore-autobackup">Restore last backup</button>
          <button class="btn sm ghost" data-action="dismiss-banner">Dismiss</button>
        </div>`;
    } else if (recoveryNotice && recoveryNotice.kind === 'migrated') {
      kind = 'ok';
      html = `<div>Your data was upgraded from v${recoveryNotice.from} to v${recoveryNotice.to}.
        The pre-upgrade copy is kept on this device.</div>
        <div class="row" style="gap:7px;margin-top:8px">
          <button class="btn sm ghost" data-action="dismiss-banner">OK</button>
        </div>`;
    } else if (updateWaiting) {
      kind = 'ok';
      html = `<div>A new version of the app is ready.${state.active ? ' Finish your session first — your data is untouched either way.' : ''}</div>
        <div class="row" style="gap:7px;margin-top:8px">
          <button class="btn sm" data-action="hard-refresh">Reload</button>
          <button class="btn sm ghost" data-action="dismiss-banner">Later</button>
        </div>`;
    }

    el.hidden = !html;
    el.className = 'banner ' + kind;
    el.innerHTML = html;
  }

  /* Clears code caches only. Never touches localStorage. */
  async function hardRefresh() {
    flushSave();
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } catch (err) { /* fall through to the reload regardless */ }
    location.reload();
  }

  function applyTheme() {
    const root = document.documentElement;
    if (state.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', state.theme);
  }

  let lastRoute = null;

  function render() {
    const hash = location.hash || '#/home';
    const [, route, arg] = hash.split('/');
    const routeKey = `${route || 'home'}/${arg || ''}`;
    const keepScroll = routeKey === lastRoute;
    const scrollY = window.scrollY;
    chartRegistry.clear();

    $$('.tabbar a').forEach((a) => a.classList.remove('active'));
    const tabFor = { home: 'home', session: arg ? 'history' : 'home', history: 'history', progress: 'progress', settings: 'settings' };
    const tab = $(`.tabbar a[data-tab="${tabFor[route] || 'home'}"]`);
    if (tab) tab.classList.add('active');

    if (route === 'session' && arg) viewSessionDetail(arg);
    else if (route === 'session') viewSession();
    else if (route === 'history') viewHistory();
    else if (route === 'progress') viewProgress();
    else if (route === 'settings') viewSettings();
    else viewHome();

    lastRoute = routeKey;
    // Re-rendering mid-session (adding a set, swapping a lift) shouldn't fling
    // you back to the top of the page.
    window.scrollTo({ top: keepScroll ? scrollY : 0 });
  }

  /* =======================================================================
     Wiring
  ======================================================================= */

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el) return;
    const fn = actions[el.dataset.action];
    if (!fn) return;
    ev.preventDefault();
    fn(el.dataset.arg || el.dataset.slot, el);
  });

  // Selects and date pickers are handled on `change` only — they fire both.
  const changeOnly = (el) => el.tagName === 'SELECT' || el.type === 'date';

  document.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t.dataset && t.dataset.field && !changeOnly(t)) onFieldInput(t);
  });
  document.addEventListener('change', (ev) => {
    const t = ev.target;
    if (t.id === 'import-file' && t.files && t.files[0]) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data || !Array.isArray(data.sessions)) throw new Error('Not a PPL backup');
          state = { ...DEFAULTS, ...data };
          save();
          applyTheme();
          render();
          toast(`Restored ${data.sessions.length} sessions`);
        } catch (err) {
          alert('That file is not a valid PPL Tracker backup.');
        }
      };
      reader.readAsText(t.files[0]);
      t.value = '';
      return;
    }
    if (t.dataset && t.dataset.field && changeOnly(t)) onFieldInput(t);
  });

  window.addEventListener('hashchange', render);

  // Don't lose a session to an accidental swipe-back / tab close.
  window.addEventListener('beforeunload', (ev) => {
    flushSave();
    if (state.active && (location.hash === '#/session')) {
      const logged = state.active.entries.reduce((n, e) => n + workingSets(e).length, 0);
      if (logged) { ev.preventDefault(); ev.returnValue = ''; }
    }
  });

  // Persist the upgraded shape straight away, so the next load reads v2
  // directly and the pre-upgrade snapshot stays the one true "before" copy.
  if (recoveryNotice && recoveryNotice.kind === 'migrated') writeNow();

  applyTheme();
  renderBanner();
  render();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        // Surface a pushed edit instead of swapping code under a live session.
        reg.addEventListener('updatefound', () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener('statechange', () => {
            if (sw.state === 'installed' && navigator.serviceWorker.controller) {
              updateWaiting = true;
              renderBanner();
            }
          });
        });
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') reg.update().catch(() => {});
        });
      }).catch(() => {});
    });
  }
})();
