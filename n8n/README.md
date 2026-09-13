# n8n workflow sources

Reference copies of n8n workflows that live on the cloud instance. These are
written with the n8n Workflow SDK; the instance is the source of truth, these
files are here so the logic is readable and diffable outside the n8n editor.

## around-town-events-digest.ts

**"Around Town — Hoboken, JC & NYC Events (Weekly)"** — Thursday 5:00 PM
Eastern, emails a digest of what's happening nearby to mikeylaw23@gmail.com.

Shape: schedule trigger fans out to 11 sources → Merge (append) → one Code node
that filters and area-tags everything → gpt-5-mini picks 8 highlights behind a
structured output parser → a Code node builds the HTML → Gmail sends it.

### Sources

Hoboken / Jersey City
- Hoboken Girl — `hobokengirl.com/feed/`
- Hoboken Girl, events tag — `hobokengirl.com/tag/hoboken-events/feed/`
- The Local Girl — `thelocalgirl.com/feed/`
- Hudson Reporter — `hudsonreporter.com/feed/`
- Hudson County View — `hudsoncountyview.com/feed/`

NYC
- Time Out New York — `timeout.com/newyork/feed.rss`
- Secret NYC — `secretnyc.co/feed/`
- Gothamist — `gothamist.com/feed`
- amNewYork — `amny.com/feed/`

Hard-dated event calendars (The Events Calendar REST API)
- JC Families — `jcfamilies.com/wp-json/tribe/events/v1/events`
- Visit Hoboken — `hobokenbusinessalliance.com/wp-json/tribe/events/v1/events`

All free and public. No API keys.


### Google Calendar sync

A second branch hangs off the email and pushes anything with a **real date**
into a dedicated calendar, **Around Town — Hoboken / JC / NYC**, which the
workflow creates on its first successful run and reuses afterwards.

Two classes of event, trusted differently:

- **Event-calendar feed entries** keep their exact start time, venue and cost,
  straight from the feed.
- **Blog picks** are synced as all-day events *only when the article itself
  stated a date*. The model is instructed to return an empty string rather than
  infer one, and anything empty is dropped. Each entry links back to its article
  and says in the description that the date was read out of the post.

Google event ids are derived from `hash(link) + hash(date)`, which is valid
base32hex, so a re-run inserts the same id and Google rejects it as a duplicate
rather than creating a second copy. Nothing is ever updated or deleted — if an
organiser moves a date, the new date shows up as a new entry.

The Google Calendar credential is connected and the calendar exists. All three
Google nodes are `continueRegularOutput`, so an expired Google credential can
never take the digest down with it — the branch just emits nothing that week.

Verified on a live run: the calendar was created under mikeylaw23@gmail.com, two
dated picks were inserted, and an immediate second run returned `409 duplicate`
for both instead of creating copies.

### Notes

- Every source node is `onError: continueRegularOutput`, so one dead feed never
  kills the run.
- Events from the two calendar APIs are printed into the email **verbatim** —
  title, date, time, venue, cost straight from the feed. The model never sees or
  rewrites them. Only the blog/news posts go through the model, and every pick is
  resolved back to a real post by id, so anything invented is dropped.
- If the model returns nothing usable, the email falls back to the freshest
  candidates rather than sending an empty shell.
- Tuning lives in one block at the top of **Build Events Shortlist**: `PICKS`,
  `RUNNERS_UP`, `WINDOW_DAYS`, `CAL_DAYS`, `AVOID`, `LEAN_TOWARD`.
- Known issue: `jcfamilies.com` sits behind Cloudflare and returns a 403
  challenge to requests from the n8n Cloud IP, even with a browser User-Agent.
  The node degrades to zero events rather than failing, so the "On the calendar"
  section is currently fed by Visit Hoboken only.
