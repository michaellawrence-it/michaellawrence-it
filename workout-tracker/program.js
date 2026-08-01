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
  dips:            { name: 'Dips',                     kind: 'bodyweight', inc: 5, bw: true },
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
  db_bench:        { name: 'Flat Dumbbell Bench Press', kind: 'dumbbell',  inc: 5 },
  decline_bb:      { name: 'Decline Barbell Press',    kind: 'barbell',    inc: 5 },
  machine_press:   { name: 'Machine Chest Press',      kind: 'machine',    inc: 5 },
  pushup:          { name: 'Push-ups',                 kind: 'bodyweight', inc: 5, bw: true },
  cg_bench:        { name: 'Close-Grip Bench Press',   kind: 'barbell',    inc: 5 },
  incline_db_fly:  { name: 'Incline Dumbbell Fly',     kind: 'dumbbell',   inc: 5 },
  db_ohp:          { name: 'Seated Dumbbell Press',    kind: 'dumbbell',   inc: 5 },
  arnold_press:    { name: 'Arnold Press',             kind: 'dumbbell',   inc: 5 },
  machine_ohp:     { name: 'Machine Shoulder Press',   kind: 'machine',    inc: 5 },
  db_front_raise:  { name: 'Dumbbell Front Raise',     kind: 'dumbbell',   inc: 5 },
  bench_dip:       { name: 'Bench Dip',                kind: 'bodyweight', inc: 5, bw: true },

  // --- Pull ---------------------------------------------------------------
  // Both are the conventional pull. Romanian is a separate key over on Legs;
  // sumo and trap-bar are absent. Any variant goes in as a NEW key, never by
  // repurposing these — that would silently rewrite what past sessions mean.
  deadlift:        { name: 'Conventional Deadlift (Barbell)',  kind: 'barbell',  inc: 10 },
  db_deadlift:     { name: 'Conventional Deadlift (Dumbbell)', kind: 'dumbbell', inc: 5 },
  pullup:          { name: 'Pull-ups (pronated)',      kind: 'bodyweight', inc: 5, bw: true },
  chinup:          { name: 'Chin-ups (supinated)',     kind: 'bodyweight', inc: 5, bw: true },
  neutral_pullup:  { name: 'Neutral-Grip Pull-ups',    kind: 'bodyweight', inc: 5, bw: true },
  bb_row:          { name: 'Barbell Bent-Over Row',    kind: 'barbell',    inc: 5 },
  db_row:          { name: 'Dumbbell Bent-Over Row',   kind: 'dumbbell',   inc: 5 },
  lat_pulldown:    { name: 'Lat Pulldown (wide)',      kind: 'machine',    inc: 10 },
  close_pulldown:  { name: 'Close-Grip Pulldown',      kind: 'machine',    inc: 10 },
  low_row:         { name: 'Seated Low Row',           kind: 'machine',    inc: 10 },
  chest_supp_row:  { name: 'Chest-Supported Row',      kind: 'machine',    inc: 5 },
  face_pull:       { name: 'Face Pull',                kind: 'cable',      inc: 5 },
  rear_delt_fly:   { name: 'Rear Delt Fly',            kind: 'machine',    inc: 5 },
  bb_curl:         { name: 'Barbell Curl',             kind: 'barbell',    inc: 5 },
  // Supinated, both arms — the unqualified 'dumbbell curl'. The hammer
  // curls below are the neutral-grip version.
  db_curl:         { name: 'Dumbbell Curl',            kind: 'dumbbell',   inc: 5 },
  db_curl_alt:     { name: 'Alternating Dumbbell Curl', kind: 'dumbbell',  inc: 5 },
  ez_curl:         { name: 'EZ-Bar Curl',              kind: 'barbell',    inc: 5 },
  db_hammer:       { name: 'Dumbbell Hammer Curl',     kind: 'dumbbell',   inc: 5 },
  rope_hammer:     { name: 'Rope Hammer Curl',         kind: 'cable',      inc: 5 },
  incline_db_curl: { name: 'Incline Dumbbell Curl',    kind: 'dumbbell',   inc: 5 },
  db_row_1arm:     { name: 'One-Arm Dumbbell Row',     kind: 'dumbbell',   inc: 5 },
  db_row_alt:      { name: 'Alternating Dumbbell Row', kind: 'dumbbell',   inc: 5 },
  tbar_row:        { name: 'T-Bar Row',                kind: 'barbell',    inc: 10 },
  straight_arm_pd: { name: 'Straight-Arm Pulldown',    kind: 'cable',      inc: 5 },
  bb_shrug:        { name: 'Barbell Shrug',            kind: 'barbell',    inc: 10 },
  db_shrug:        { name: 'Dumbbell Shrug',           kind: 'dumbbell',   inc: 5 },
  preacher_curl:   { name: 'Preacher Curl',            kind: 'barbell',    inc: 5 },
  cable_curl:      { name: 'Cable Curl',               kind: 'cable',      inc: 5 },
  conc_curl:       { name: 'Concentration Curl',       kind: 'dumbbell',   inc: 5 },
  reverse_curl:    { name: 'Reverse Curl',             kind: 'barbell',    inc: 5 },

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
  front_squat:     { name: 'Front Squat',              kind: 'barbell',    inc: 10 },
  goblet_squat:    { name: 'Goblet Squat',             kind: 'dumbbell',   inc: 5 },
  bulgarian_split: { name: 'Bulgarian Split Squat',    kind: 'dumbbell',   inc: 5 },
  walking_lunge:   { name: 'Walking Lunge',            kind: 'dumbbell',   inc: 5 },
  step_up:         { name: 'Dumbbell Step-Up',         kind: 'dumbbell',   inc: 5 },
  leg_ext:         { name: 'Leg Extension',            kind: 'machine',    inc: 5 },
  rdl:             { name: 'Romanian Deadlift (Barbell)',  kind: 'barbell',  inc: 10 },
  db_rdl:          { name: 'Romanian Deadlift (Dumbbell)', kind: 'dumbbell', inc: 5 },
  good_morning:    { name: 'Good Morning',             kind: 'barbell',    inc: 5 },
  hip_thrust:      { name: 'Barbell Hip Thrust',       kind: 'barbell',    inc: 10 },
  cable_crunch:    { name: 'Cable Crunch',             kind: 'cable',      inc: 5 },
  ab_wheel:        { name: 'Ab Wheel Rollout',         kind: 'bodyweight', inc: 5, bw: true },
  decline_situp:   { name: 'Decline Sit-Up',           kind: 'bodyweight', inc: 5, bw: true },
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
      // Incline leads as the heavy press; flat bench drops to a secondary
      // volume slot behind it. Dips are now a fixed weekly movement rather
      // than an alternate for incline.
      { id: 'p1', role: 'Incline Press',             sets: [4, 4], reps: [5, 8],   options: ['incline_bb'], anchor: true },
      { id: 'p2', role: 'Flat Bench Press',          sets: [3, 3], reps: [8, 10],  options: ['bb_bench'], anchor: true },
      { id: 'p3', role: 'Dips',                      sets: [3, 3], reps: [8, 10],  options: ['dips'], anchor: true },
      { id: 'p4', role: 'Overhead Press',            sets: [3, 3], reps: [6, 8],   options: ['ohp_bb'], anchor: true },
      { id: 'p5', role: 'Chest Fly',                 sets: [3, 3], reps: [10, 12], options: ['cable_fly', 'pec_deck', 'db_fly'] },
      { id: 'p6', role: 'Lateral Raises',            sets: [3, 3], reps: [12, 15], options: ['db_lat_raise', 'cable_lat_raise', 'machine_lat_raise'] },
      // One tricep movement, not two: dips already supply heavy elbow
      // extension, so the long-head-under-stretch work is what's left to add.
      // (Pushdown ids stay in the catalog above so old logs still resolve.)
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
   Day pools

   Every movement that belongs on a day, grouped by pattern. Any slot can be
   swapped to any movement in its day's pool — the weekly rotation only picks
   the default, it never locks you in. If you want to chase a lift this week,
   pick it.

   `sets`/`reps` on a group are the fallback prescription, used only for
   movements that no slot programs (retired or alternate variations). A
   movement that does have a home slot keeps that slot's prescription, wave
   and all.
--------------------------------------------------------------------------- */
const DAY_POOL = {
  push: [
    { group: 'Chest press',       sets: 3, reps: [6, 10],  ids: ['incline_bb', 'incline_db', 'bb_bench', 'db_bench', 'decline_bb', 'machine_press', 'dips', 'pushup', 'cg_bench'] },
    { group: 'Chest isolation',   sets: 3, reps: [10, 12], ids: ['cable_fly', 'pec_deck', 'db_fly', 'incline_db_fly'] },
    { group: 'Shoulder press',    sets: 3, reps: [6, 10],  ids: ['ohp_bb', 'db_ohp', 'arnold_press', 'machine_ohp'] },
    { group: 'Delts',             sets: 3, reps: [12, 15], ids: ['db_lat_raise', 'cable_lat_raise', 'machine_lat_raise', 'db_front_raise'] },
    { group: 'Triceps',           sets: 3, reps: [10, 12], ids: ['db_oh_ext', 'cable_oh_ext', 'ez_skullcrusher', 'rope_pushdown', 'bar_pushdown', 'vbar_pushdown', 'bench_dip'] },
  ],
  pull: [
    { group: 'Hinge',             sets: 3, reps: [6, 10],  ids: ['deadlift', 'db_deadlift'] },
    { group: 'Vertical pull',     sets: 3, reps: [6, 10],  ids: ['pullup', 'neutral_pullup', 'chinup', 'lat_pulldown', 'close_pulldown'] },
    { group: 'Rows',              sets: 3, reps: [8, 10],  ids: ['bb_row', 'db_row', 'db_row_alt', 'db_row_1arm', 'tbar_row', 'low_row', 'chest_supp_row'] },
    { group: 'Rear delts / lats', sets: 3, reps: [12, 15], ids: ['face_pull', 'rear_delt_fly', 'straight_arm_pd'] },
    { group: 'Traps',             sets: 3, reps: [10, 15], ids: ['bb_shrug', 'db_shrug'] },
    { group: 'Biceps',            sets: 3, reps: [8, 12],  ids: ['bb_curl', 'ez_curl', 'db_curl', 'db_curl_alt', 'db_hammer', 'rope_hammer', 'incline_db_curl', 'preacher_curl', 'cable_curl', 'conc_curl', 'reverse_curl'] },
  ],
  legs: [
    { group: 'Squat / press',     sets: 3, reps: [8, 10],  ids: ['back_squat', 'front_squat', 'goblet_squat', 'leg_press', 'hack_squat'] },
    { group: 'Lunges & split squats', sets: 3, reps: [8, 12], ids: ['bulgarian_split', 'walking_lunge', 'step_up'] },
    { group: 'Quads',             sets: 3, reps: [10, 15], ids: ['leg_ext'] },
    { group: 'Hamstrings & hinge', sets: 3, reps: [8, 12], ids: ['lying_leg_curl', 'seated_leg_curl', 'rdl', 'db_rdl', 'good_morning'] },
    { group: 'Glutes',            sets: 3, reps: [8, 12],  ids: ['hip_thrust'] },
    { group: 'Hips',              sets: 3, reps: [12, 15], ids: ['adductor', 'abductor', 'cable_abduction'] },
    { group: 'Calves',            sets: 4, reps: [12, 15], ids: ['standing_calf', 'seated_calf', 'press_calf'] },
    { group: 'Core',              sets: 3, reps: [12, 15], ids: ['hanging_knee', 'hanging_leg', 'captains_chair', 'cable_crunch', 'ab_wheel', 'decline_situp'] },
  ],
};

/* Which day a movement belongs to (first match wins). */
function dayOfExercise(exId) {
  const id = resolveExerciseId(exId);
  return DAY_KEYS.find((d) => DAY_POOL[d].some((g) => g.ids.includes(id))) || null;
}

function poolGroupOf(dayKey, exId) {
  const id = resolveExerciseId(exId);
  return (DAY_POOL[dayKey] || []).find((g) => g.ids.includes(id)) || null;
}

/* The slot that programs this movement, if any. */
function homeSlotOf(dayKey, exId) {
  const id = resolveExerciseId(exId);
  return PROGRAM[dayKey].slots.find((s) => s.options.includes(id)) || null;
}

/* Prescription to use when a movement is chosen by hand. Programmed movements
   keep their own slot's numbers; everything else falls back to its group. */
function prescriptionFor(dayKey, exId, week, cycleLength) {
  const home = homeSlotOf(dayKey, exId);
  if (home) {
    const rx = prescribe(home, week, cycleLength);
    return { sets: rx.sets, repMin: rx.repMin, repMax: rx.repMax, repTarget: rx.repTarget, load: rx.load };
  }
  const phase = phaseFor(week, cycleLength);
  const g = poolGroupOf(dayKey, exId);
  const [rMin, rMax] = g ? g.reps : [8, 12];
  return {
    sets: g ? g.sets : 3,
    repMin: rMin,
    repMax: rMax,
    repTarget: Math.round(rMin + phase.repPos * (rMax - rMin)),
    load: phase.load,
  };
}

/* ---------------------------------------------------------------------------
   Exercise IDs are a storage contract
   ---------------------------------------------------------------------------
   Every logged set references its movement by the key above. Change a key and
   the matching history detaches — no progression suggestion, no trend line.

   So: keys are append-only. Never rename, never delete, never reuse. If a
   movement genuinely has to be renamed, add the old key here pointing at the
   new one and the old sessions follow it across.
--------------------------------------------------------------------------- */
const EXERCISE_ALIASES = {
  // 'old_key': 'new_key',
};

function resolveExerciseId(id) {
  const seen = new Set();
  let cur = id;
  while (EXERCISE_ALIASES[cur] && !seen.has(cur)) { seen.add(cur); cur = EXERCISE_ALIASES[cur]; }
  return cur;
}

/* Never throws. An unknown id (older backup, retired movement) still renders
   with its raw key rather than taking the whole view down. */
function exOf(id) {
  return EXERCISES[resolveExerciseId(id)] || { name: String(id), kind: 'machine', inc: 5, unknown: true };
}

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
