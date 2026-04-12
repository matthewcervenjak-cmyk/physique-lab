// ── DATA LAYER — PROFILE-SCOPED ──

const PROFILES = {
  matt:  { password: 'Brissy1996!',    theme: 'matt',  label: 'Matt',  hasRehab: false },
  lynny: { password: 'mcdonalds2017!', theme: 'lynny', label: 'Lynny', hasRehab: true  },
  guest: { password: null,             theme: 'matt',  label: 'Guest', hasRehab: false },
};

let CURRENT_PROFILE = null; // set at login

const DB = {
  // ── PROFILE KEY PREFIX ──
  _key(k) { return `mpl_${CURRENT_PROFILE}_${k}`; },

  save(key, val) { try { localStorage.setItem(this._key(key), JSON.stringify(val)); } catch(e) {} },
  load(key, fallback = null) {
    try { const v = localStorage.getItem(this._key(key)); return v !== null ? JSON.parse(v) : fallback; }
    catch(e) { return fallback; }
  },

  // ── PROFILE ──
  getProfile() { return PROFILES[CURRENT_PROFILE] || null; },

  // ── DEFAULT PROGRAMME ──
  defaultProgramme: [
    {
      id: 'day1', label: 'Day 1 — Upper A', type: 'upper',
      exercises: [
        { id: 'flat_db_press',    name: 'Flat DB Chest Press',          sets: 3, reps: '8–10',  rir: '1.5–2', rest: 240 },
        { id: 'incline_hammer',   name: 'Incline Hammer Chest Press',   sets: 2, reps: '12–15', rir: '1–2',   rest: 180 },
        { id: 'tbar_row',         name: 'Chest-Supported T-Bar Row',    sets: 3, reps: '6–10',  rir: '1–2',   rest: 240 },
        { id: 'sa_lat_pull',      name: 'Single-Arm Lat Pulldown',      sets: 2, reps: '12–15', rir: '1–2',   rest: 180 },
        { id: 'cable_lateral',    name: 'Lying Cable Lateral Raises',   sets: 3, reps: '12–20', rir: '1',     rest: 180 },
        { id: 'ez_curl',          name: 'EZ Bar Bicep Curls',           sets: 3, reps: '10–12', rir: '1',     rest: 180 },
        { id: 'ab_crunch',        name: 'Ab Crunch Machine',            sets: 3, reps: '12–15', rir: '1',     rest: 150 },
      ]
    },
    {
      id: 'day2', label: 'Day 2 — Lower A', type: 'lower',
      exercises: [
        { id: 'smith_squat',      name: 'Smith Machine Squat',          sets: 3, reps: '8–10',  rir: '1.5–2', rest: 240 },
        { id: 'leg_press',        name: 'Leg Press (Descending)',        sets: 2, reps: '10+',   rir: '1',     rest: 240 },
        { id: 'db_rdl',           name: 'DB RDL',                       sets: 3, reps: '10–12', rir: '1.5–2', rest: 240 },
        { id: 'seated_ham_curl',  name: 'Seated Hamstring Curls',       sets: 3, reps: '12–15', rir: '1',     rest: 180 },
        { id: 'adductor',         name: 'Seated Adductor/Abductor',     sets: 2, reps: '15–20', rir: '1',     rest: 180 },
        { id: 'standing_calf',    name: 'Standing Calf Raises',         sets: 3, reps: '10–12', rir: '1',     rest: 180 },
      ]
    },
    {
      id: 'day3', label: 'Day 3 — Upper B', type: 'upper',
      exercises: [
        { id: 'lat_pull_neutral', name: 'Lat Pulldown (Neutral Grip)',  sets: 3, reps: '12–15', rir: '1–2',   rest: 240 },
        { id: 'sa_iso_row',       name: 'Single-Arm ISO Hammer Row',    sets: 2, reps: '10–12', rir: '1–2',   rest: 210 },
        { id: 'smith_incline',    name: 'Smith Machine Incline Press',  sets: 2, reps: '8–12',  rir: '1–2',   rest: 240 },
        { id: 'smith_shoulder',   name: 'Smith Machine Shoulder Press', sets: 2, reps: '10–12', rir: '1–2',   rest: 180 },
        { id: 'cuffed_fly',       name: 'Cuffed Flyes',                 sets: 2, reps: '15–20', rir: '1',     rest: 180 },
        { id: 'oh_tricep',        name: 'Overhead Tricep Extensions',   sets: 3, reps: '12–15', rir: '1',     rest: 180 },
        { id: 'rear_delt',        name: 'Rear Delt Fly Machine',        sets: 3, reps: '15–20', rir: '1',     rest: 180 },
      ]
    },
    {
      id: 'day4', label: 'Day 4 — Lower B', type: 'lower',
      exercises: [
        { id: 'barbell_rdl',      name: 'Barbell RDL',                  sets: 2, reps: '8–10',  rir: '1.5–2', rest: 240 },
        { id: 'hack_squat',       name: 'Hack Squat',                   sets: 2, reps: '6–12',  rir: '1–2',   rest: 240 },
        { id: 'bulgarian',        name: 'DB Bulgarian Split Squat',     sets: 2, reps: '10–12', rir: '1–2',   rest: 210 },
        { id: 'leg_ext',          name: 'Leg Extensions',               sets: 2, reps: '12–15', rir: '1',     rest: 180 },
        { id: 'glute_hyper',      name: 'Glute Hyperextensions',        sets: 2, reps: '12–15', rir: '1',     rest: 180 },
        { id: 'lying_ham_curl',   name: 'Lying Hamstring Curls (HS)',   sets: 3, reps: '12–20', rir: '1',     rest: 150 },
        { id: 'calf_seated',      name: 'Standing Calf Raises (B)',     sets: 3, reps: '15–20', rir: '1',     rest: 150 },
      ]
    },
    {
      id: 'day5', label: 'Day 5 — Upper C', type: 'upper',
      exercises: [
        { id: 'incline_bb',        name: 'Incline Barbell Bench Press', sets: 2, reps: '6–8',   rir: '1–2',   rest: 240 },
        { id: 'cable_fly_press',   name: 'Cable Fly/Press Hybrid',      sets: 2, reps: '12–15', rir: '1',     rest: 180 },
        { id: 'cable_row_neutral', name: 'Seated Neutral Grip Cable Row',sets: 2, reps: '12–15', rir: '1–2',  rest: 210 },
        { id: 'sa_cable_row',      name: 'Single-Arm Cable Row (Lat)',  sets: 2, reps: '15–20', rir: '1',     rest: 180 },
        { id: 'db_lateral',        name: 'DB Lateral Raises',           sets: 3, reps: '10–12', rir: '1',     rest: 180 },
        { id: 'db_hammer',         name: 'DB Hammer Curl',              sets: 3, reps: '10–12', rir: '1',     rest: 180 },
        { id: 'rope_tricep',       name: 'Rope Tricep Extensions',      sets: 3, reps: '15–20', rir: '1',     rest: 180 },
      ]
    },
  ],

  getProgramme() { return this.load('programme', JSON.parse(JSON.stringify(this.defaultProgramme))); },
  saveProgramme(p) { this.save('programme', p); },

  getSessions() { return this.load('sessions', []); },
  saveSession(session) {
    const sessions = this.getSessions();
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session; else sessions.unshift(session);
    this.save('sessions', sessions);
  },
  getSession(id) { return this.getSessions().find(s => s.id === id) || null; },

  getActive() { return this.load('active', null); },
  saveActive(w) { this.save('active', w); },
  clearActive() { try { localStorage.removeItem(this._key('active')); } catch(e) {} },

  getCurrentWeek() { return this.load('currentWeek', 1); },
  setCurrentWeek(w) { this.save('currentWeek', w); },

  // ── REHAB (Lynny only) ──
  getRehabExercises() { return this.load('rehab_exercises', []); },
  saveRehabExercises(list) { this.save('rehab_exercises', list); },
  getRehabSessions() { return this.load('rehab_sessions', []); },
  saveRehabSession(session) {
    const list = this.getRehabSessions();
    list.unshift(session);
    this.save('rehab_sessions', list.slice(0, 100));
  },

  // ── CALCULATIONS ──
  calcE1RM(load, reps) {
    if (!load || !reps || reps <= 0) return 0;
    if (reps === 1) return load;
    return Math.round((load * (1 + reps / 30)) * 10) / 10;
  },

  getLastSession(dayId, exerciseId) {
    const sessions = this.getSessions();
    const past = sessions.filter(s => s.dayId === dayId);
    if (past.length === 0) return null;
    return (past[0].exercises || []).find(e => e.id === exerciseId) || null;
  },

  getE1RMHistory(exerciseId) {
    const sessions = this.getSessions().slice().reverse();
    const hist = [];
    for (const s of sessions) {
      const ex = (s.exercises || []).find(e => e.id === exerciseId);
      if (!ex) continue;
      const sets = (ex.sets || []).filter(set => set.load && set.reps);
      if (!sets.length) continue;
      const maxE1RM = Math.max(...sets.map(set => this.calcE1RM(parseFloat(set.load), parseInt(set.reps))));
      if (maxE1RM > 0) hist.push({ date: s.date, week: s.week, e1rm: maxE1RM });
    }
    return hist;
  },

  getProgressionStatus(dayId, exerciseId, currentSets) {
    const last = this.getLastSession(dayId, exerciseId);
    if (!last) return 'new';
    const lastSets = (last.sets || []).filter(s => s.load && s.reps);
    if (!lastSets.length) return 'new';
    const lastMaxE = Math.max(...lastSets.map(s => this.calcE1RM(parseFloat(s.load), parseInt(s.reps))));
    const curSets = (currentSets || []).filter(s => s.load && s.reps);
    if (!curSets.length) return null;
    const curMaxE = Math.max(...curSets.map(s => this.calcE1RM(parseFloat(s.load), parseInt(s.reps))));
    if (curMaxE > lastMaxE * 1.005) return 'pr';
    if (curMaxE < lastMaxE * 0.99) return 'down';
    return 'same';
  },

  getDeloadAnalysis() {
    const programme = this.getProgramme();
    const allExercises = programme.flatMap(d => d.exercises);
    const stalled = [];
    let totalPrimary = 0, stalledCount = 0;
    for (const ex of allExercises) {
      const hist = this.getE1RMHistory(ex.id);
      if (hist.length < 2) continue;
      totalPrimary++;
      const recent = hist.slice(-3);
      const isStalled = recent.length >= 2 && recent.every(h => Math.abs(h.e1rm - recent[0].e1rm) / recent[0].e1rm < 0.02);
      if (isStalled) { stalledCount++; stalled.push({ name: ex.name, weeks: recent.length, e1rm: recent[recent.length-1].e1rm }); }
    }
    const sessions = this.getSessions();
    const avgRIR = sessions.slice(0,12).flatMap(s => s.exercises || []).flatMap(e => e.sets || [])
      .filter(s => s.rir !== '' && s.rir !== undefined).map(s => parseFloat(s.rir)).filter(v => !isNaN(v));
    const meanRIR = avgRIR.length > 0 ? avgRIR.reduce((a,b)=>a+b,0)/avgRIR.length : 2;
    const fatigueScore = Math.min(100, Math.round(
      (stalledCount / Math.max(totalPrimary,1)) * 50 +
      Math.max(0, (2 - meanRIR)) * 25 +
      (sessions.length > 8 ? 15 : 0)
    ));
    const stallPct = totalPrimary > 0 ? stalledCount / totalPrimary : 0;
    let status = 'good', recommendation = '';
    if (fatigueScore >= 70 || stallPct >= 0.6) {
      status = 'deload';
      recommendation = 'Deload recommended. Reduce all loads by 40%, reduce volume by 40%, maintain movement patterns for 1 week.';
    } else if (fatigueScore >= 40 || stalled.length >= 2) {
      status = 'monitor';
      recommendation = 'Some stalls detected. Consider a technique reset on flagged exercises before triggering a full deload.';
    } else {
      recommendation = 'Progress is on track. Continue current program. Reassess after next 2 sessions.';
    }
    return { fatigueScore, stalled, status, recommendation, totalPrimary, stalledCount };
  },

  formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
  },
  todayISO() { return new Date().toISOString().split('T')[0]; },
  newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); },
};
