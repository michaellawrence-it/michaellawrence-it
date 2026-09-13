import { workflow, node, trigger, sticky, merge, languageModel, outputParser, newCredential, expr } from '@n8n/workflow-sdk';


const weeklyTrigger = trigger({
  type: 'n8n-nodes-base.scheduleTrigger',
  version: 1.3,
  config: {
    name: 'Thursday 5 PM Trigger',
    position: [0, 640],
    parameters: {
      rule: { interval: [{ field: 'weeks', weeksInterval: 1, triggerAtDay: [4], triggerAtHour: 17, triggerAtMinute: 0 }] }
    }
  },
  output: [{}]
});


const feedHobokenGirl = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: "Hoboken Girl",
    position: [280, -260],
    onError: 'continueRegularOutput',
    parameters: { url: "https://www.hobokengirl.com/feed/", options: {} }
  },
  output: [{ title: 'Sample post title', link: 'https://example.com/post', isoDate: '2026-09-09T12:00:00.000Z', contentSnippet: 'Sample summary text.' }]
});


const feedHobokenGirlEvents = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: "Hoboken Girl Events",
    position: [280, -70],
    onError: 'continueRegularOutput',
    parameters: { url: "https://www.hobokengirl.com/tag/hoboken-events/feed/", options: {} }
  },
  output: [{ title: 'Sample post title', link: 'https://example.com/post', isoDate: '2026-09-09T12:00:00.000Z', contentSnippet: 'Sample summary text.' }]
});


const feedLocalGirl = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: "The Local Girl",
    position: [280, 120],
    onError: 'continueRegularOutput',
    parameters: { url: "https://thelocalgirl.com/feed/", options: {} }
  },
  output: [{ title: 'Sample post title', link: 'https://example.com/post', isoDate: '2026-09-09T12:00:00.000Z', contentSnippet: 'Sample summary text.' }]
});


const feedHudsonReporter = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: "Hudson Reporter",
    position: [280, 310],
    onError: 'continueRegularOutput',
    parameters: { url: "https://hudsonreporter.com/feed/", options: {} }
  },
  output: [{ title: 'Sample post title', link: 'https://example.com/post', isoDate: '2026-09-09T12:00:00.000Z', contentSnippet: 'Sample summary text.' }]
});


const feedHudsonCountyView = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: "Hudson County View",
    position: [280, 500],
    onError: 'continueRegularOutput',
    parameters: { url: "https://hudsoncountyview.com/feed/", options: {} }
  },
  output: [{ title: 'Sample post title', link: 'https://example.com/post', isoDate: '2026-09-09T12:00:00.000Z', contentSnippet: 'Sample summary text.' }]
});


const feedTimeOut = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: "Time Out New York",
    position: [280, 690],
    onError: 'continueRegularOutput',
    parameters: { url: "https://www.timeout.com/newyork/feed.rss", options: {} }
  },
  output: [{ title: 'Sample post title', link: 'https://example.com/post', isoDate: '2026-09-09T12:00:00.000Z', contentSnippet: 'Sample summary text.' }]
});


const feedSecretNYC = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: "Secret NYC",
    position: [280, 880],
    onError: 'continueRegularOutput',
    parameters: { url: "https://secretnyc.co/feed/", options: {} }
  },
  output: [{ title: 'Sample post title', link: 'https://example.com/post', isoDate: '2026-09-09T12:00:00.000Z', contentSnippet: 'Sample summary text.' }]
});


const feedGothamist = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: "Gothamist",
    position: [280, 1070],
    onError: 'continueRegularOutput',
    parameters: { url: "https://gothamist.com/feed", options: {} }
  },
  output: [{ title: 'Sample post title', link: 'https://example.com/post', isoDate: '2026-09-09T12:00:00.000Z', contentSnippet: 'Sample summary text.' }]
});


const feedAmNewYork = node({
  type: 'n8n-nodes-base.rssFeedRead',
  version: 1.2,
  config: {
    name: "amNewYork",
    position: [280, 1260],
    onError: 'continueRegularOutput',
    parameters: { url: "https://www.amny.com/feed/", options: {} }
  },
  output: [{ title: 'Sample post title', link: 'https://example.com/post', isoDate: '2026-09-09T12:00:00.000Z', contentSnippet: 'Sample summary text.' }]
});


const jcCalendar = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'JC Families Calendar',
    position: [280, 1450],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'https://jcfamilies.com/wp-json/tribe/events/v1/events',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
          { name: 'Accept', value: 'application/json' }
        ]
      },
      sendQuery: true,
      specifyQuery: 'keypair',
      queryParameters: {
        parameters: [
          { name: 'per_page', value: '50' },
          { name: 'start_date', value: expr('{{ $now.toFormat("yyyy-MM-dd") }}') },
          { name: 'end_date', value: expr('{{ $now.plus(30, "days").toFormat("yyyy-MM-dd") }}') }
        ]
      },
      options: { timeout: 20000 }
    }
  },
  output: [{ events: [{ title: 'Sample dated event', url: 'https://jcfamilies.com/event/sample/', start_date: '2026-09-13 11:00:00', all_day: false, cost: 'Free', venue: { venue: 'Hamilton Park', city: 'Jersey City' } }] }]
});


const hobokenCalendar = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.3,
  config: {
    name: 'Visit Hoboken Calendar',
    position: [280, 1640],
    onError: 'continueRegularOutput',
    parameters: {
      method: 'GET',
      url: 'https://hobokenbusinessalliance.com/wp-json/tribe/events/v1/events',
      sendHeaders: true,
      specifyHeaders: 'keypair',
      headerParameters: {
        parameters: [
          { name: 'User-Agent', value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36' },
          { name: 'Accept', value: 'application/json' }
        ]
      },
      sendQuery: true,
      specifyQuery: 'keypair',
      queryParameters: {
        parameters: [
          { name: 'per_page', value: '50' },
          { name: 'start_date', value: expr('{{ $now.toFormat("yyyy-MM-dd") }}') },
          { name: 'end_date', value: expr('{{ $now.plus(30, "days").toFormat("yyyy-MM-dd") }}') }
        ]
      },
      options: { timeout: 20000 }
    }
  },
  output: [{ events: [{ title: 'Hoboken Restaurant Week', url: 'https://visithoboken.com/event/hoboken-restaurant-week/', start_date: '2026-11-09 00:00:00', all_day: true, cost: '', venue: { venue: 'Washington Street', city: 'Hoboken' } }] }]
});


const mergeSources = merge({
  version: 3.2,
  config: { name: 'Merge All Sources', position: [560, 640], parameters: { mode: 'append', numberInputs: 11 } },
  output: [{ title: 'Sample post title', link: 'https://example.com/post' }]
});


const shortlist = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Build Events Shortlist',
    position: [800, 640],
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "// ---------------------------------------------------------------------------\n// TUNING \u2014 edit these, nothing else, to change what shows up.\n// ---------------------------------------------------------------------------\nconst PICKS = 8;             // editorial picks the email recommends\nconst RUNNERS_UP = 8;        // extra bare links under \"also floating around\"\nconst WINDOW_DAYS = 12;      // how recent a blog/news post must be\nconst CAL_DAYS = 30;         // how far ahead to pull hard-dated calendar events\nconst POOL = 45;             // candidates handed to the model each week\nconst AVOID = '';            // e.g. 'kids stuff, brunch'\nconst LEAN_TOWARD = 'things worth leaving the apartment for this weekend \u2014 live music, food and drink, waterfront and outdoor stuff, markets, festivals, comedy, art openings and neighborhood happenings';\n// ---------------------------------------------------------------------------\n\nconst FEEDS = [\n  { node: 'Hoboken Girl', source: 'Hoboken Girl', area: 'Hoboken' },\n  { node: 'Hoboken Girl Events', source: 'Hoboken Girl', area: 'Hoboken' },\n  { node: 'The Local Girl', source: 'The Local Girl', area: 'Hoboken' },\n  { node: 'Hudson Reporter', source: 'Hudson Reporter', area: 'Hoboken' },\n  { node: 'Hudson County View', source: 'Hudson County View', area: 'Jersey City' },\n  { node: 'Time Out New York', source: 'Time Out New York', area: 'NYC' },\n  { node: 'Secret NYC', source: 'Secret NYC', area: 'NYC' },\n  { node: 'Gothamist', source: 'Gothamist', area: 'NYC' },\n  { node: 'amNewYork', source: 'amNewYork', area: 'NYC' }\n];\n\nconst CALENDARS = [\n  { node: 'JC Families Calendar', source: 'JC Families', area: 'Jersey City' },\n  { node: 'Visit Hoboken Calendar', source: 'Visit Hoboken', area: 'Hoboken' }\n];\n\n// Posts that are clearly not something you can go to.\nconst NOT_EVENT = /(arrest|police|shooting|stabb|homicide|indict|lawsuit|sentenc|council (meeting|vote|approv)|zoning|planning board|school board|election|campaign|endorse|obituary|passed away|for rent|for sale|real estate|housing market|rent report|listing of the|nj transit (delay|advisory)|traffic alert|road clos|snow (emergency|removal)|subscribe|newsletter signup|gift guide|best of 20|sponsored content)/i;\n\n// Signals that a post is actually about something happening.\nconst EVENTY = /(event|things to do|what to do|this weekend|weekend (guide|round.?up|plans)|calendar|festival|fair|market|concert|live music|dj\\b|show|comedy|opening|opens|pop.?up|parade|tour|tasting|happy hour|restaurant week|screening|exhibit|museum|gallery|party|nightlife|street fair|block party|5k|\\brun\\b|race|flea|farmers|craft|holiday|halloween|oktoberfest|christmas|new year|rooftop|brunch|trivia|karaoke|workshop|class\\b|meetup|pier|waterfront|park)/i;\n\nfunction clean(s) {\n  return String(s == null ? '' : s)\n    .replace(/<[^>]*>/g, ' ')\n    .replace(/The post .*? appeared first on .*/i, ' ')\n    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')\n    .replace(/&quot;/g, '\"').replace(/&#8217;|&rsquo;/g, '\u2019')\n    .replace(/&#8216;|&lsquo;/g, '\u2018')\n    .replace(/&#8220;|&ldquo;/g, '\u201c').replace(/&#8221;|&rdquo;/g, '\u201d')\n    .replace(/&nbsp;/g, ' ').replace(/&hellip;|&#8230;/g, '\u2026')\n    .replace(/&#8211;|&ndash;/g, '\u2013').replace(/&#8212;|&mdash;/g, '\u2014')\n    .replace(/&#0?39;|&apos;/g, \"'\")\n    .replace(/\\s+/g, ' ')\n    .trim();\n}\n\nfunction normTitle(t) {\n  return clean(t).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();\n}\n\n// Where is this actually happening? Text wins over the feed's home turf.\nfunction detectArea(text, fallback) {\n  const t = String(text || '');\n  if (/\\bhoboken\\b/i.test(t)) return 'Hoboken';\n  if (/jersey city|journal square|newport|grove street|exchange place|paulus hook|the heights|downtown jc|\\bjc\\b|bayonne|weehawken|union city/i.test(t)) return 'Jersey City';\n  if (/manhattan|brooklyn|\\bqueens\\b|the bronx|staten island|new york city|\\bnyc\\b|west village|east village|soho|chelsea|harlem|williamsburg|bushwick|astoria|coney island|central park|prospect park/i.test(t)) return 'NYC';\n  return fallback;\n}\n\nconst AREA_ORDER = { Hoboken: 0, 'Jersey City': 1, NYC: 2 };\nconst now = Date.now();\nconst cutoff = now - WINDOW_DAYS * 24 * 60 * 60 * 1000;\nconst calHorizon = now + CAL_DAYS * 24 * 60 * 60 * 1000;\n\n// --- Hard-dated calendar events -------------------------------------------\nconst calendar = [];\nconst calSeen = {};\n\nfor (const c of CALENDARS) {\n  let rows = [];\n  try { rows = $(c.node).all().map(function (i) { return i.json; }); } catch (e) { rows = []; }\n  for (const row of rows) {\n    const evs = (row && Array.isArray(row.events)) ? row.events : [];\n    for (const ev of evs) {\n      if (!ev) continue;\n      const title = clean(ev.title);\n      const link = ev.url || '';\n      if (!title || !link) continue;\n\n      const startStr = String(ev.start_date || '').replace(' ', 'T');\n      const ts = startStr ? new Date(startStr).getTime() : NaN;\n      if (isNaN(ts) || ts > calHorizon || ts < now - 12 * 60 * 60 * 1000) continue;\n\n      const key = normTitle(title) + '|' + startStr.slice(0, 10);\n      if (calSeen[key]) continue;\n      calSeen[key] = true;\n\n      const venue = (ev.venue && ev.venue.venue) ? clean(ev.venue.venue) : '';\n      const city = (ev.venue && ev.venue.city) ? clean(ev.venue.city) : '';\n      const cost = ev.cost ? clean(ev.cost) : '';\n      let blurb = clean(ev.excerpt || ev.description || '');\n      if (blurb.length > 220) blurb = blurb.slice(0, 220).trim() + '\u2026';\n\n      const d = new Date(ts);\n      const when = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });\n      const timeLabel = ev.all_day ? 'all day' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });\n\n      calendar.push({\n        title: title,\n        link: link,\n        source: c.source,\n        area: detectArea(title + ' ' + venue + ' ' + city + ' ' + blurb, c.area),\n        ts: ts,\n        when: when,\n        timeLabel: timeLabel,\n        venue: venue || city,\n        cost: cost,\n        blurb: blurb\n      });\n    }\n  }\n}\n\ncalendar.sort(function (a, b) { return a.ts - b.ts; });\n\n// --- Editorial candidates from the feeds -----------------------------------\nconst seen = {};\nconst candidates = [];\nlet rawCount = 0;\n\nfor (const f of FEEDS) {\n  let items = [];\n  try { items = $(f.node).all().map(function (i) { return i.json; }); } catch (e) { items = []; }\n  for (const it of items) {\n    if (!it) continue;\n    rawCount++;\n    const title = clean(it.title);\n    const link = it.link || it.guid || it.id || '';\n    if (!title || !link) continue;\n\n    const dateStr = it.isoDate || it.pubDate || it.published || it.date || it.updated || '';\n    const ts = dateStr ? new Date(dateStr).getTime() : NaN;\n    if (isNaN(ts) || ts < cutoff) continue;\n\n    const cats = Array.isArray(it.categories)\n      ? it.categories.map(function (c) { return clean(typeof c === 'string' ? c : (c && c._ ? c._ : '')); }).join(', ')\n      : '';\n    let snippet = clean(it.contentSnippet || it.description || it.summary || it.content || '');\n    if (snippet.length > 340) snippet = snippet.slice(0, 340).trim() + '\u2026';\n\n    const haystack = title + ' ' + cats + ' ' + snippet;\n    if (NOT_EVENT.test(title + ' ' + cats)) continue;\n    if (!EVENTY.test(haystack)) continue;\n\n    const key = normTitle(title);\n    if (!key || seen[key]) continue;\n    seen[key] = true;\n\n    candidates.push({\n      title: title,\n      link: link,\n      source: f.source,\n      area: detectArea(haystack, f.area),\n      ts: ts,\n      snippet: snippet,\n      cats: cats.slice(0, 200)\n    });\n  }\n}\n\n// Freshest first, but keep Hoboken/JC ahead of NYC so the local stuff survives\n// the cut to POOL even in a heavy Time Out week.\ncandidates.sort(function (a, b) {\n  const ao = AREA_ORDER[a.area] == null ? 3 : AREA_ORDER[a.area];\n  const bo = AREA_ORDER[b.area] == null ? 3 : AREA_ORDER[b.area];\n  if (ao !== bo) return ao - bo;\n  return b.ts - a.ts;\n});\n\nconst pool = candidates.slice(0, POOL);\npool.forEach(function (e, idx) { e.id = idx; });\n\nconst NL = String.fromCharCode(10);\nconst lines = pool.map(function (e) {\n  const base = '[' + e.id + '] (' + e.area + ' \u00b7 ' + e.source + ') ' + e.title;\n  const tail = [];\n  if (e.cats) tail.push('tags: ' + e.cats);\n  if (e.snippet) tail.push(e.snippet);\n  return tail.length ? base + ' :: ' + tail.join(' :: ') : base;\n});\n\nconst dateLabel = new Date(now).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });\n\nlet promptText = 'You are putting together a short \"what is going on around here\" email for one person who lives in Hoboken, NJ. He can walk or PATH to Jersey City in minutes and to Manhattan in about fifteen, so Hoboken and Jersey City matter most and New York City is a bonus.' + NL + NL;\npromptText += 'Below is a numbered list of recent posts from local blogs and city papers. Pick exactly ' + PICKS + ' of them as this week\\'s highlights. Rules:' + NL;\npromptText += '- Every pick must be something he could actually show up to or do soon. Skip pure news, real estate, crime, politics and listicles with no place attached.' + NL;\npromptText += '- Weight the list toward Hoboken and Jersey City: aim for roughly five of the ' + PICKS + ' on the New Jersey side and the rest in NYC.' + NL;\npromptText += '- Spread it out. Do not pick two of the same kind of thing (two bar openings, two food festivals).' + NL;\npromptText += '- Lean toward ' + LEAN_TOWARD + '.' + (AVOID ? ' Avoid: ' + AVOID + '.' : '') + NL + NL;\npromptText += 'For each pick return:' + NL;\npromptText += '- \"id\": the bracket number, exactly as given.' + NL;\npromptText += '- \"name\": what it is, in plain words, cleaned up (no site name, no clickbait).' + NL;\npromptText += '- \"area\": exactly one of \"Hoboken\", \"Jersey City\", \"NYC\".' + NL;\npromptText += '- \"when\": when it happens if the text says so (e.g. \"Sat Sep 13\", \"through October\"). If the text does not say, use \"see link\".' + NL;\npromptText += '- \"where\": the venue, street or neighborhood if the text says so, otherwise \"\".' + NL;\npromptText += '- \"why\": 2 sentences, concrete and unhyped, on what it actually is and why it is worth the trip. No exclamation marks.' + NL;\npromptText += '- \"tag\": two or three words categorizing it, e.g. \"live music\", \"food + drink\", \"outdoors\", \"art\".' + NL + NL;\npromptText += 'Also return \"note\": one friendly sentence introducing the week. Do not invent anything that is not in the list. Use only the ids given.' + NL + NL;\npromptText += lines.join(NL);\n\nreturn [{\n  json: {\n    now: now,\n    dateLabel: dateLabel,\n    picks: PICKS,\n    runnersUp: RUNNERS_UP,\n    pool: pool,\n    poolCount: pool.length,\n    calendar: calendar,\n    calendarCount: calendar.length,\n    candidateCount: candidates.length,\n    rawCount: rawCount,\n    promptText: promptText\n  }\n}];\n" }
  },
  output: [{ dateLabel: 'Thursday, September 10, 2026', picks: 8, runnersUp: 8, pool: [], poolCount: 0, calendar: [], calendarCount: 0, candidateCount: 0, rawCount: 0, promptText: 'Sample prompt text' }]
});


const curatorModel = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
  version: 1.3,
  config: {
    name: 'OpenAI Chat Model',
    position: [1000, 880],
    parameters: {
      model: { __rl: true, mode: 'list', value: 'gpt-5-mini', cachedResultName: 'gpt-5-mini' },
      responsesApiEnabled: false,
      options: { reasoningEffort: 'low', timeout: 120000 }
    },
    credentials: { openAiApi: newCredential('n8n free OpenAI API credits') }
  }
});

const picksParser = outputParser({
  type: '@n8n/n8n-nodes-langchain.outputParserStructured',
  version: 1.3,
  config: {
    name: 'Weekly Picks Parser',
    position: [1200, 880],
    parameters: {
      schemaType: 'fromJson',
      jsonSchemaExample: '{"note": "A short friendly line introducing the week.", "picks": [{"id": 0, "name": "Hoboken Arts and Music Festival", "area": "Hoboken", "when": "Sun Sep 21", "where": "Washington Street", "why": "A full day of the main drag closed to cars, with four stages and a hundred-odd food and craft vendors. It is the one weekend a year the whole town is outside at once.", "tag": "festival"}]}',
      autoFix: false
    }
  }
});

const curate = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: {
    name: 'Curate The Week',
    position: [1040, 640],
    executeOnce: true,
    parameters: { promptType: 'define', text: expr('{{ $json.promptText }}'), hasOutputParser: true },
    subnodes: { model: curatorModel, outputParser: picksParser }
  },
  output: [{ output: { note: 'A quiet week on this side of the river, but a good one.', picks: [{ id: 0, name: 'Sample pick', area: 'Hoboken', when: 'Sat Sep 12', where: 'Pier A Park', why: 'Sample reason.', tag: 'outdoors' }] } }]
});


const composeEmail = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Compose Events Email',
    position: [1300, 640],
    executeOnce: true,
    parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: "const prep = $('Build Events Shortlist').first().json;\nconst pool = prep.pool || [];\nconst calendar = prep.calendar || [];\nconst dateLabel = prep.dateLabel || '';\nconst wantPicks = prep.picks || 8;\nconst wantRunners = prep.runnersUp || 8;\n\nlet picked = [];\nlet note = '';\ntry {\n  const s = $('Curate The Week').first().json;\n  const out = (s && s.output) ? s.output : s;\n  if (out) {\n    if (Array.isArray(out.picks)) picked = out.picks;\n    else if (Array.isArray(out)) picked = out;\n    if (out.note) note = String(out.note).trim();\n  }\n} catch (e) { picked = []; }\n\nfunction esc(s) {\n  return String(s == null ? '' : s)\n    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;');\n}\n\nconst byId = {};\npool.forEach(function (p) { byId[p.id] = p; });\n\nconst AREAS = ['Hoboken', 'Jersey City', 'NYC'];\n\n// Resolve the model's picks back onto real posts. Anything invented is dropped.\nconst cards = [];\nconst usedIds = {};\nfor (const p of picked) {\n  if (!p) continue;\n  const id = Number(p.id);\n  const src = byId[id];\n  if (!src || usedIds[id]) continue;\n  usedIds[id] = true;\n  const area = AREAS.indexOf(String(p.area)) >= 0 ? String(p.area) : src.area;\n  cards.push({\n    name: (p.name && String(p.name).trim()) || src.title,\n    link: src.link,\n    source: src.source,\n    area: area,\n    when: p.when ? String(p.when).trim() : '',\n    where: p.where ? String(p.where).trim() : '',\n    why: p.why ? String(p.why).trim() : (src.snippet || ''),\n    tag: p.tag ? String(p.tag).trim() : ''\n  });\n  if (cards.length >= wantPicks) break;\n}\n\n// If the model came back empty, fall back to the freshest candidates so the\n// email still lands with real links instead of an empty shell.\nif (!cards.length) {\n  for (const src of pool.slice(0, wantPicks)) {\n    usedIds[src.id] = true;\n    cards.push({ name: src.title, link: src.link, source: src.source, area: src.area, when: '', where: '', why: src.snippet || '', tag: '' });\n  }\n  if (!note) note = 'Straight from the feeds this week \u2014 here is what turned up.';\n}\n\nconst runners = pool.filter(function (p) { return !usedIds[p.id]; }).slice(0, wantRunners);\n\nconst BG = '#f4f6f8';\nconst INK = '#16202b';\nconst ACCENT = '#1f6f8b';\nconst MUTED = '#7d8b98';\nconst LINE = '#e2e8ee';\nconst AREA_COLOR = { Hoboken: '#1f6f8b', 'Jersey City': '#3f7d52', NYC: '#8a5a2b' };\n\nfunction areaColor(a) { return AREA_COLOR[a] || ACCENT; }\n\nlet html = '<!DOCTYPE html><html><body style=\"margin:0;padding:0;background:' + BG + ';\">';\nhtml += '<div style=\"max-width:640px;margin:0 auto;padding:24px 20px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:' + INK + ';\">';\n\nhtml += '<div style=\"background:' + ACCENT + ';border-radius:12px 12px 0 0;padding:22px 24px;\">';\nhtml += '<div style=\"color:#fff;font-size:20px;font-weight:700;letter-spacing:-.2px;\">What&rsquo;s on around here</div>';\nhtml += '<div style=\"color:#cfe3ea;font-size:13px;margin-top:4px;\">' + esc(dateLabel) + ' &middot; Hoboken, Jersey City &amp; NYC</div>';\nhtml += '</div>';\n\nhtml += '<div style=\"background:#fff;border-radius:0 0 12px 12px;padding:20px 24px 24px;\">';\n\nif (note) {\n  html += '<div style=\"font-size:14px;color:#42505e;line-height:1.55;margin:2px 0 18px;font-style:italic;\">' + esc(note) + '</div>';\n}\n\n// --- Hard-dated calendar events, printed as-is (no model in the loop) ------\nif (calendar.length) {\n  html += '<h2 style=\"font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:' + MUTED + ';margin:0 0 10px;\">On the calendar</h2>';\n  html += '<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;margin-bottom:22px;\">';\n  calendar.slice(0, 12).forEach(function (c) {\n    html += '<tr><td style=\"padding:10px 0;border-bottom:1px solid ' + LINE + ';\">';\n    html += '<div style=\"font-size:12px;font-weight:700;color:' + areaColor(c.area) + ';\">' + esc(c.when) + ' &middot; ' + esc(c.timeLabel) + '</div>';\n    html += '<a href=\"' + esc(c.link) + '\" style=\"font-size:15px;font-weight:600;color:' + INK + ';text-decoration:none;line-height:1.35;\">' + esc(c.title) + '</a>';\n    const bits = [];\n    if (c.venue) bits.push(c.venue);\n    if (c.cost) bits.push(c.cost);\n    bits.push(c.area);\n    html += '<div style=\"font-size:12px;color:' + MUTED + ';margin-top:3px;\">' + esc(bits.join(' \u00b7 ')) + '</div>';\n    html += '</td></tr>';\n  });\n  html += '</table>';\n}\n\n// --- Editorial picks, grouped by area -------------------------------------\nAREAS.forEach(function (area) {\n  const inArea = cards.filter(function (c) { return c.area === area; });\n  if (!inArea.length) return;\n\n  html += '<h2 style=\"font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:' + areaColor(area) + ';margin:22px 0 6px;\">' + esc(area) + '</h2>';\n  html += '<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;\">';\n  inArea.forEach(function (c) {\n    html += '<tr><td style=\"padding:14px 0;border-bottom:1px solid ' + LINE + ';\">';\n    html += '<a href=\"' + esc(c.link) + '\" style=\"font-size:17px;font-weight:700;color:' + INK + ';text-decoration:none;line-height:1.3;\">' + esc(c.name) + '</a>';\n\n    const chips = [];\n    if (c.when) chips.push(c.when);\n    if (c.where) chips.push(c.where);\n    if (c.tag) chips.push(c.tag);\n    if (chips.length) {\n      html += '<div style=\"margin-top:8px;\">';\n      chips.forEach(function (t) {\n        html += '<span style=\"display:inline-block;background:#eef3f7;color:#54646f;font-size:11px;font-weight:600;border-radius:999px;padding:3px 10px;margin-right:6px;\">' + esc(t) + '</span>';\n      });\n      html += '</div>';\n    }\n\n    if (c.why) html += '<div style=\"font-size:14px;color:#3c4956;margin-top:9px;line-height:1.55;\">' + esc(c.why) + '</div>';\n\n    html += '<div style=\"font-size:12px;color:' + MUTED + ';margin-top:9px;\">';\n    html += '<a href=\"' + esc(c.link) + '\" style=\"color:' + areaColor(area) + ';text-decoration:none;font-weight:600;\">Read more &rarr;</a>';\n    html += ' &middot; ' + esc(c.source) + '</div>';\n    html += '</td></tr>';\n  });\n  html += '</table>';\n});\n\nif (runners.length) {\n  html += '<h2 style=\"font-size:12px;text-transform:uppercase;letter-spacing:.8px;color:' + MUTED + ';margin:24px 0 10px;\">Also floating around</h2>';\n  html += '<table width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" style=\"border-collapse:collapse;\">';\n  runners.forEach(function (r) {\n    html += '<tr><td style=\"padding:6px 0;font-size:13px;line-height:1.45;\">';\n    html += '<a href=\"' + esc(r.link) + '\" style=\"color:#2c3945;text-decoration:none;\">' + esc(r.title) + '</a>';\n    html += '<span style=\"color:' + MUTED + ';\"> &middot; ' + esc(r.area) + ' &middot; ' + esc(r.source) + '</span>';\n    html += '</td></tr>';\n  });\n  html += '</table>';\n}\n\nhtml += '<div style=\"margin-top:26px;font-size:11px;color:#a3b0bb;text-align:center;line-height:1.6;\">Sent weekly by n8n &middot; ' + prep.candidateCount + ' posts and ' + calendar.length + ' dated events scanned from Hoboken Girl, The Local Girl, Hudson Reporter, Hudson County View, Time Out New York, Secret NYC, Gothamist, amNewYork, the JC Families calendar and Visit Hoboken</div>';\nhtml += '</div></div></body></html>';\n\nconst lead = cards.slice(0, 2).map(function (c) { return c.name; }).join(', ');\nconst extra = cards.length > 2 ? ' + ' + (cards.length - 2) + ' more' : '';\nconst subject = 'Around Hoboken, JC & NYC: ' + (lead || 'this week\\'s picks') + extra;\n\nreturn [{ json: { subject: subject, html: html, cardCount: cards.length, calendarCount: calendar.length, runnerCount: runners.length } }];\n" }
  },
  output: [{ subject: 'Around Hoboken, JC & NYC: sample, sample + 6 more', html: '<html>...</html>', cardCount: 8, calendarCount: 3, runnerCount: 8 }]
});

const sendEmail = node({
  type: 'n8n-nodes-base.gmail',
  version: 2.2,
  config: {
    name: 'Send Events Email',
    position: [1560, 640],
    executeOnce: true,
    parameters: {
      resource: 'message',
      operation: 'send',
      sendTo: 'mikeylaw23@gmail.com',
      subject: expr('{{ $json.subject }}'),
      emailType: 'html',
      message: expr('{{ $json.html }}'),
      options: { appendAttribution: false }
    },
    credentials: { gmailOAuth2: newCredential('Gmail OAuth2 API') }
  },
  output: [{ id: '19a0f0c2b1', threadId: '19a0f0c2b1', labelIds: ['SENT'] }]
});


const tuningNote = sticky(
  '## Retune this digest here\n\nOpen **Build Events Shortlist** and edit the TUNING block at the very top:\n\n- `PICKS` / `RUNNERS_UP` — how many highlights and how many bare links\n- `WINDOW_DAYS` — how recent a blog post has to be\n- `CAL_DAYS` — how far ahead the two real event calendars look\n- `AVOID` — things to steer away from, e.g. `kids stuff, brunch`\n- `LEAN_TOWARD` — the vibe of the picks\n\nTo add a source: add an RSS Read node, wire it into **Merge All Sources** (raise `numberInputs`), and add it to the `FEEDS` list in the same Code node.\n\nSchedule lives in **Thursday 5 PM Trigger**.',
  [shortlist],
  { color: 4 }
);

const sourcesNote = sticky(
  '## Where this comes from\n\n**Hoboken / Jersey City:** Hoboken Girl (plus its events tag), The Local Girl, Hudson Reporter, Hudson County View.\n\n**NYC:** Time Out New York, Secret NYC, Gothamist, amNewYork.\n\n**Real dated events** come from two public event calendars (JC Families and Visit Hoboken). Those go into the email exactly as published — the model never touches them.\n\nEvery source is a free public feed. No API keys.',
  [],
  { color: 7 }
);


export default workflow('hoboken-jc-nyc-events-digest', 'Around Town — Hoboken, JC & NYC Events (Weekly)')
  .add(weeklyTrigger)
  .to(feedHobokenGirl.to(mergeSources.input(0)))
  .add(weeklyTrigger)
  .to(feedHobokenGirlEvents.to(mergeSources.input(1)))
  .add(weeklyTrigger)
  .to(feedLocalGirl.to(mergeSources.input(2)))
  .add(weeklyTrigger)
  .to(feedHudsonReporter.to(mergeSources.input(3)))
  .add(weeklyTrigger)
  .to(feedHudsonCountyView.to(mergeSources.input(4)))
  .add(weeklyTrigger)
  .to(feedTimeOut.to(mergeSources.input(5)))
  .add(weeklyTrigger)
  .to(feedSecretNYC.to(mergeSources.input(6)))
  .add(weeklyTrigger)
  .to(feedGothamist.to(mergeSources.input(7)))
  .add(weeklyTrigger)
  .to(feedAmNewYork.to(mergeSources.input(8)))
  .add(weeklyTrigger)
  .to(jcCalendar.to(mergeSources.input(9)))
  .add(weeklyTrigger)
  .to(hobokenCalendar.to(mergeSources.input(10)))
  .add(mergeSources)
  .to(shortlist)
  .to(curate)
  .to(composeEmail)
  .to(sendEmail)
  .add(tuningNote)
  .add(sourcesNote);
