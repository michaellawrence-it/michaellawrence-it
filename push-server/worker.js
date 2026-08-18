/* worker.js — scheduled training reminders for the PPL Tracker PWA.
 *
 * Deliberately knows as little as possible. It stores a push subscription and
 * a weekly schedule; it never sees a weight, a rep, or a session. The app on
 * the phone remains the only place training data exists.
 */

import { sendPush } from './webpush.js';

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABEL = { push: 'Push', pull: 'Pull', legs: 'Legs' };

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors() },
  });

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
  };
}

/* Constant-time-ish compare so the shared token can't be probed by timing. */
function tokenOk(req, env) {
  const given = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const want = env.PUSH_TOKEN || '';
  if (!want || given.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < want.length; i++) diff |= given.charCodeAt(i) ^ want.charCodeAt(i);
  return diff === 0;
}

/* Key subscriptions by a hash of the endpoint: stable, and keeps the raw
   endpoint URL out of the key space. */
async function keyFor(endpoint) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  return 'sub:' + [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* What time is it where the user is? Intl does the DST work. */
function localParts(tz, now) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, weekday: 'short', hour: 'numeric', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    dow: parts.weekday.toLowerCase().slice(0, 3),
    hour: Number(parts.hour) % 24,
    stamp: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors() });

    // Public: the app needs this before it can subscribe at all.
    if (url.pathname === '/key' && req.method === 'GET') {
      return json({ publicKey: env.VAPID_PUBLIC_KEY });
    }

    if (url.pathname === '/health') return json({ ok: true });

    // Everything below changes or uses state, so it needs the shared token.
    if (!tokenOk(req, env)) return json({ error: 'unauthorized' }, 401);

    if (url.pathname === '/subscribe' && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      if (!body || !body.subscription || !body.subscription.endpoint) {
        return json({ error: 'missing subscription' }, 400);
      }
      const prev = JSON.parse((await env.SUBS.get(await keyFor(body.subscription.endpoint))) || '{}');
      const record = {
        ...prev,
        subscription: body.subscription,
        schedule: body.schedule || {},        // { mon: 'push', wed: 'pull', ... }
        hour: Number(body.hour) || 17,
        tz: body.tz || 'UTC',
        // 0 disables the inactivity nudge. lastWorkoutAt is a bare date and is
        // the only thing here that touches training at all.
        nudgeDays: Number(body.nudgeDays) || 0,
        lastWorkoutAt: body.lastWorkoutAt || prev.lastWorkoutAt || null,
        updated: Date.now(),
      };
      await env.SUBS.put(await keyFor(body.subscription.endpoint), JSON.stringify(record));
      return json({ ok: true });
    }

    if (url.pathname === '/subscribe' && req.method === 'DELETE') {
      const body = await req.json().catch(() => null);
      if (!body || !body.endpoint) return json({ error: 'missing endpoint' }, 400);
      await env.SUBS.delete(await keyFor(body.endpoint));
      return json({ ok: true });
    }

    /* Just the date of the most recent session — no movement, set or weight. */
    if (url.pathname === '/activity' && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      if (!body || !body.endpoint) return json({ error: 'missing endpoint' }, 400);
      const k = await keyFor(body.endpoint);
      const raw = await env.SUBS.get(k);
      if (!raw) return json({ error: 'unknown subscription' }, 404);
      const rec = JSON.parse(raw);
      rec.lastWorkoutAt = body.lastWorkoutAt || null;
      if (body.nudgeDays !== undefined) rec.nudgeDays = Number(body.nudgeDays) || 0;
      rec.updated = Date.now();
      await env.SUBS.put(k, JSON.stringify(rec));
      return json({ ok: true });
    }

    if (url.pathname === '/test' && req.method === 'POST') {
      const body = await req.json().catch(() => null);
      if (!body || !body.subscription) return json({ error: 'missing subscription' }, 400);
      const res = await sendPush(body.subscription, {
        title: 'PPL Tracker',
        body: 'Push notifications are working.',
        url: './index.html',
      }, env);
      return json(res, res.ok ? 200 : 502);
    }

    return json({ error: 'not found' }, 404);
  },

  /* Runs hourly. Each subscription fires when the local hour matches, at most
     once per local day. */
  async scheduled(event, env, ctx) {
    const work = (async () => {
      const now = new Date(event.scheduledTime || Date.now());
      let cursor;

      do {
        const page = await env.SUBS.list({ prefix: 'sub:', cursor });
        cursor = page.list_complete ? null : page.cursor;

        for (const entry of page.keys) {
          const raw = await env.SUBS.get(entry.name);
          if (!raw) continue;

          let rec;
          try { rec = JSON.parse(raw); } catch { continue; }

          let local;
          try { local = localParts(rec.tz, now); }
          catch { local = localParts('UTC', now); }

          if (local.hour !== rec.hour) continue;
          if (rec.lastSent === local.stamp) continue;   // already fired today

          const dayType = rec.schedule[local.dow];
          let message = null;

          if (dayType) {
            message = { title: `${DAY_LABEL[dayType] || 'Training'} day`, body: 'Time to train.' };
          } else if (rec.nudgeDays > 0 && rec.lastWorkoutAt) {
            // Only on days with no scheduled reminder, so the two can't stack.
            const days = Math.floor((Date.parse(local.stamp) - Date.parse(rec.lastWorkoutAt)) / 86400000);
            const sinceNudge = rec.lastNudge
              ? Math.floor((Date.parse(local.stamp) - Date.parse(rec.lastNudge)) / 86400000)
              : Infinity;
            // Two days between nudges: a reminder is useful, a daily guilt-trip
            // gets muted.
            if (days >= rec.nudgeDays && sinceNudge >= 2) {
              message = { title: 'Still on the shelf', body: `${days} days since your last session.`, nudge: true };
            }
          }

          if (!message) continue;

          const res = await sendPush(rec.subscription, {
            title: message.title,
            body: message.body,
            url: './index.html#/home',
          }, env);

          if (res.ok) {
            rec.lastSent = local.stamp;
            if (message.nudge) rec.lastNudge = local.stamp;
            await env.SUBS.put(entry.name, JSON.stringify(rec));
          } else if (res.status === 404 || res.status === 410) {
            // The push service says this subscription is dead — stop retrying.
            await env.SUBS.delete(entry.name);
          }
        }
      } while (cursor);
    })();

    // Registered so the runtime keeps us alive, and awaited so the invocation
    // genuinely reflects whether the sends completed.
    ctx.waitUntil(work);
    await work;
  },
};
