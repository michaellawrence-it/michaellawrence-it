/* program.js — exercise catalog, PPL program definition, weekly wave logic.
   Loaded as a classic script so the app also works straight off the filesystem. */

/* ---------------------------------------------------------------------------
   Exercise catalog
   kind: barbell | dumbbell | machine | cable | bodyweight
   inc:  smallest sensible load jump, in lb (converted for kg)
   bw:   true when the logged weight is *added* load on top of bodyweight
--------------------------------------------------------------------------- */
const EXERCISES = {
  // --- Push ---------------------------------------------------------------
  bb_bench:        { name: 'Flat Barbell Bench Press', kind: 'barbell',    inc: 5 },
  incline_bb:      { name: 'Incline Barbell Press',    kind: 'barbell',    inc: 5 },
  incline_db:      { name: 'Incline Dumbbell Press',   kind: 'dumbbell',   inc: 5 },
  dips:            { name: 'Weighted Dips',            kind: 'bodyweight', inc: 5, bw: true },
  ohp_bb:          { name: 'Overhead Press',           kind: 'barbell',    inc: 5 },
  cable_fly:       { name: 'Cable Chest Fly',          kind: 'cable',      inc: 5 },
  db_fly:          { name: 'Dumbbell Chest Fly',       kind: 'dumbbell',   inc: 5 },
  pec_deck:        { name: 'Pec Deck',                 kind: 'machine',    inc: 5 },
  db_lat_raise:    { name: 'Dumbbell Lateral Raise',   kind: 'dumbbell',   inc: 5 },
  cable_lat_raise: { name: 'Cable Lateral Raise',      kind: 'cable',      inc: 5 },
  machine_lat_raise:{ name:'Machine Lateral Raise',    kind: 'machine',    inc: 5 },
  rope_pushdown:   { name: 'Rope Tricep Pushdown',     kind: 'cable',      inc: 5 },
  bar_pushdown:    { name: 'Straight-Bar Pushdown',    kind: 'cable',      inc: 5 },
  vbar_pushdown:   { name: 'V-Bar Pushdown',           kind: 'cable',      inc: 5 },
  db_oh_ext:       { name: 'DB Overhead Tricep Ext.',  kind: 'dumbbell',   inc: 5 },
  cable_oh_ext:    { name: 'Cable Overhead Tricep Ext.', kind: 'cable',    inc: 5 },
  ez_skullcrusher: { name: 'EZ-Bar Skullcrusher',      kind: 'barbell',    inc: 5 },

  // --- Pull ---------------------------------------------------------------
  deadlift:        { name: 'Deadlift',                 kind: 'barbell',    inc: 10 },
  pullup:          { name: 'Pull-ups (pronated)',      kind: 'bodyweight', inc: 5, bw: true },
  chinup:          { name: 'Chin-ups (supinated)',     kind: 'bodyweight', inc: 5, bw: true },
  neutral_pullup:  { name: 'Neutral-Grip Pull-ups',    kind: 'bodyweight', inc: 5, bw: true },
  bb_row:          { name: 'Barbell Row',              kind: 'barbell',    inc: 5 },
  lat_pulldown:    { name: 'Lat Pulldown (wide)',      kind: 'machine',    inc: 10 },
  close_pulldown:  { name: 'Close-Grip Pulldown',      kind: 'machine',    inc: 10 },
  low_row:         { name: 'Seated Low Row',           kind: 'machine',    inc: 10 },
  chest_supp_row:  { name: 'Chest-Supported Row',      kind: 'machine',    inc: 5 },
  face_pull:       { name: 'Face Pull',                kind: 'cable',      inc: 5 },
  rear_delt_fly:   { name: 'Rear Delt Fly',            kind: 'machine',    inc: 5 },
  bb_curl:         { name: 'Barbell Curl',             kind: 'barbell',    inc: 5 },
  ez_curl:         { name: 'EZ-Bar Curl',              kind: 'barbell',    inc: 5 },
  db_hammer:       { name: 'Dumbbell Hammer Curl',     kind: 'dumbbell',   inc: 5 },
  rope_hammer:     { name: 'Rope Hammer Curl',         kind: 'cable',      inc: 5 },
  incline_db_curl: { name: 'Incline Dumbbell Curl',    kind: 'dumbbell',   inc: 5 },

  // --- Legs ---------------------------------------------------------------
  back_squat:      { name: 'Back Squat',               kind: 'barbell',    inc: 10 },
  leg_press:       { name: 'Leg Press',                kind: 'machine',    inc: 10 },
  hack_squat:      { name: 'Hack Squat',               kind: 'machine',    inc: 10 },
  lying_leg_curl:  { name: 'Lying Leg Curl',           kind: 'machine',    inc: 5 },
  seated_leg_curl: { name: 'Seated Leg Curl',          kind: 'machine',    inc: 5 },
  adductor:        { name: 'Hip Adductor Machine',     kind: 'machine',    inc: 5 },
  abductor:        { name: 'Hip Abductor Machine',     kind: 'machine',    inc: 5 },
  cable_abduction: { name: 'Cable Hip Abduction',      kind: 'cable',      inc: 5 },
  standing_calf:   { name: 'Standing Calf Raise',      kind: 'machine',    inc: 10 },
  seated_calf:     { name: 'Seated Calf Raise',        kind: 'machine',    inc: 5 },
  press_calf:      { name: 'Leg-Press Calf Raise',     kind: 'machine',    inc: 10 },
  hanging_knee:    { name: 'Hanging Knee Raise',       kind: 'bodyweight', inc: 5, bw: true },
  hanging_leg:     { name: 'Hanging Leg Raise',        kind: 'bodyweight', inc: 5, bw: true },
  captains_chair:  { name: "Captain's Chair Knee Raise", kind:'bodyweight',inc: 5, bw: true },
};

/* ---------------------------------------------------------------------------
   Program
   Each slot is a job in the session. `options` is the rotation pool: the first
   entry is the default and the pool advances one step per week, offset per slot
   so the whole session never turns over at once.

   Compound anchors (bench, OHP, deadlift, row, squat) have a single option on
   purpose — you cannot progressively overload a lift you keep swapping. The
   variation lives in the accessories and in the rep/set wave below.
--------------------------------------------------------------------------- */
const PROGRAM = {
  push: {
    name: 'Push',
    accent: 'push',
    slots: [
      { id: 'p1', role: 'Flat Bench Press',          sets: [4, 4], reps: [5, 8],   options: ['bb_bench'], anchor: true },
      { id: 'p2', role: 'Incline Press / Dips',      sets: [3, 3], reps: [8, 10],  options: ['incline_bb', 'dips', 'incline_db'] },
      { id: 'p3', role: 'Overhead Press',            sets: [3, 3], reps: [6, 8],   options: ['ohp_bb'], anchor: true },
      { id: 'p4', role: 'Chest Fly',                 sets: [3, 3], reps: [10, 12], options: ['cable_fly', 'pec_deck', 'db_fly'] },
      { id: 'p5', role: 'Lateral Raises',            sets: [3, 3], reps: [12, 15], options: ['db_lat_raise', 'cable_lat_raise', 'machine_lat_raise'] },
      { id: 'p6', role: 'Tricep Pushdown',           sets: [3, 3], reps: [10, 12], options: ['rope_pushdown', 'bar_pushdown', 'vbar_pushdown'] },
      { id: 'p7', role: 'Overhead Tricep Extension', sets: [3, 3], reps: [10, 12], options: ['db_oh_ext', 'cable_oh_ext', 'ez_skullcrusher'] },
    ],
  },
  pull: {
    name: 'Pull',
    accent: 'pull',
    slots: [
      { id: 'l1', role: 'Deadlift',                  sets: [3, 4], reps: [4, 6],   options: ['deadlift'], anchor: true },
      { id: 'l2', role: 'Pull-ups',                  sets: [3, 4], reps: [6, 10],  options: ['pullup', 'neutral_pullup', 'chinup'] },
      { id: 'l3', role: 'Barbell Rows',              sets: [3, 3], reps: [8, 10],  options: ['bb_row'], anchor: true },
      { id: 'l4', role: 'Lat Pulldown / Low Row',    sets: [3, 3], reps: [8, 12],  options: ['lat_pulldown', 'low_row', 'close_pulldown', 'chest_supp_row'] },
      { id: 'l5', role: 'Face Pulls',                sets: [3, 3], reps: [12, 15], options: ['face_pull', 'rear_delt_fly'] },
      { id: 'l6', role: 'Barbell Curls',             sets: [3, 3], reps: [8, 10],  options: ['bb_curl', 'ez_curl'] },
      { id: 'l7', role: 'Hammer Curls',              sets: [3, 3], reps: [10, 12], options: ['db_hammer', 'rope_hammer', 'incline_db_curl'] },
    ],
  },
  legs: {
    name: 'Legs',
    accent: 'legs',
    slots: [
      { id: 'g1', role: 'Squats',                    sets: [4, 4], reps: [5, 8],   options: ['back_squat'], anchor: true },
      { id: 'g2', role: 'Leg Press',                 sets: [3, 3], reps: [8, 10],  options: ['leg_press', 'hack_squat'] },
      { id: 'g3', role: 'Leg Curl',                  sets: [3, 3], reps: [10, 12], options: ['lying_leg_curl', 'seated_leg_curl'] },
      { id: 'g4', role: 'Hip Adductor',              sets: [3, 3], reps: [12, 15], options: ['adductor'] },
      { id: 'g5', role: 'Hip Abductor',              sets: [3, 3], reps: [12, 15], options: ['abductor', 'cable_abduction'] },
      { id: 'g6', role: 'Calf Raises',               sets: [4, 4], reps: [12, 15], options: ['standing_calf', 'seated_calf', 'press_calf'] },
      { id: 'g7', role: 'Hanging Knee Raises',       sets: [3, 3], reps: [12, 15], options: ['hanging_knee', 'hanging_leg', 'captains_chair'] },
    ],
  },
};

const DAY_KEYS = ['push', 'pull', 'legs'];

/* ---------------------------------------------------------------------------
   The weekly wave

   repPos  0 = bottom of the prescribed rep range (heaviest)
           1 = top of the range (most reps at a lighter load)
   setPos  0 = fewest prescribed sets, 1 = most
   load    multiplier applied to the suggested working weight
--------------------------------------------------------------------------- */
const WAVE = [
  { key: 'volume',    name: 'Volume',    repPos: 1,   setPos: 0, load: 1,
    blurb: 'Top of every rep range. Lighter loads, more total reps.' },
  { key: 'build',     name: 'Build',     repPos: 0.5, setPos: 1, load: 1,
    blurb: 'Middle of the rep ranges, full set count. The bread-and-butter week.' },
  { key: 'intensity', name: 'Intensity', repPos: 0,   setPos: 1, load: 1,
    blurb: 'Bottom of every rep range — heaviest loads of the block.' },
  { key: 'deload',    name: 'Deload',    repPos: 0.5, setPos: 0, load: 0.85,
    blurb: 'Backed-off week: fewer sets at ~85%. Leave reps in the tank.' },
];

/* Monday-anchored week index, so the phase flips over the weekend, not mid-week. */
function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7; // Mon = 0
  x.setDate(x.getDate() - dow);
  return x;
}

function weekNumber(startISO, when) {
  const start = startOfWeek(new Date(startISO + 'T00:00:00'));
  const now = startOfWeek(when ? new Date(when) : new Date());
  const weeks = Math.round((now - start) / (7 * 24 * 3600 * 1000));
  return Math.max(0, weeks);
}

/* cycleLength 4 includes the deload week; 3 skips it. */
function phaseFor(week, cycleLength) {
  return WAVE[week % (cycleLength || 4)];
}

/* Which variation is on deck for this slot this week. */
function optionFor(slot, week) {
  const seed = slot.id.charCodeAt(1) - 48; // slot position, keeps rotations out of lockstep
  return slot.options[(week + seed) % slot.options.length];
}

/* Fully resolved prescription for one slot in one week. */
function prescribe(slot, week, cycleLength) {
  const phase = phaseFor(week, cycleLength);
  const [sMin, sMax] = slot.sets;
  const [rMin, rMax] = slot.reps;
  return {
    slot,
    phase,
    exerciseId: optionFor(slot, week),
    sets: Math.round(sMin + phase.setPos * (sMax - sMin)),
    repMin: rMin,
    repMax: rMax,
    repTarget: Math.round(rMin + phase.repPos * (rMax - rMin)),
    load: phase.load,
  };
}

function buildSession(dayKey, week, cycleLength) {
  return PROGRAM[dayKey].slots.map((slot) => prescribe(slot, week, cycleLength));
}
