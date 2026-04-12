// ── SUPABASE CONFIG ──
const SUPA_URL = 'https://tsepbubklqotddklxvwn.supabase.co';
const SUPA_KEY = 'sb_publishable_tASOM-SBT9Yr1h-UOE8O7w_V520kPD5';

const PROFILES = {
  matt:  { password: 'Brissy1996!',    theme: 'matt',  label: 'Matt',  hasRehab: false },
  lynny: { password: 'mcdonalds2017!', theme: 'lynny', label: 'Lynny', hasRehab: true  },
  guest: { password: null,             theme: 'matt',  label: 'Guest', hasRehab: false },
};

let CURRENT_PROFILE = null;

// ── SUPABASE HELPERS ──
const SB = {
  h() {
    return {
      'Content-Type': 'application/json',
      'apikey': SUPA_KEY,
      'Authorization': 'Bearer ' + SUPA_KEY,
    };
  },

  async get(table, match) {
    try {
      const q = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${q}&limit=1`, { headers: this.h() });
      if (!r.ok) { console.warn('SB.get failed', table, r.status, await r.text()); return null; }
      const d = await r.json();
      return d.length > 0 ? d[0] : null;
    } catch(e) { console.warn('SB.get error', table, e); return null; }
  },

  async getAll(table, match, order = 'created_at.desc') {
    try {
      const q = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${q}&order=${order}`, { headers: this.h() });
      if (!r.ok) { console.warn('SB.getAll failed', table, r.status, await r.text()); return null; }
      return await r.json();
    } catch(e) { console.warn('SB.getAll error', table, e); return null; }
  },

  async upsert(table, data) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...this.h(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(data),
      });
      if (!r.ok) console.warn('SB.upsert failed', table, r.status, await r.text());
      return r.ok;
    } catch(e) { console.warn('SB.upsert error', table, e); return false; }
  },

  async insert(table, data) {
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...this.h(), 'Prefer': 'return=minimal' },
        body: JSON.stringify(data),
      });
      if (!r.ok) console.warn('SB.insert failed', table, r.status, await r.text());
      return r.ok;
    } catch(e) { console.warn('SB.insert error', table, e); return false; }
  },

  async delete(table, match) {
    try {
      const q = Object.entries(match).map(([k,v]) => `${k}=eq.${encodeURIComponent(v)}`).join('&');
      const r = await fetch(`${SUPA_URL}/rest/v1/${table}?${q}`, { method: 'DELETE', headers: this.h() });
      return r.ok;
    } catch(e) { return false; }
  },
};

// ── LOCAL CACHE (always used for speed, Supabase is source of truth) ──
const LOCAL = {
  k(key) { return `mpl_${CURRENT_PROFILE}_${key}`; },
  set(key, val) { try { localStorage.setItem(this.k(key), JSON.stringify(val)); } catch(e) {} },
  get(key, fallback = null) {
    try { const v = localStorage.getItem(this.k(key)); return v !== null ? JSON.parse(v) : fallback; }
    catch(e) { return fallback; }
  },
  del(key) { try { localStorage.removeItem(this.k(key)); } catch(e) {} },
};

// ── DEFAULT PROGRAMME ──
const DEFAULT_PROGRAMME = [
  { id:'day1', label:'Day 1 — Upper A', type:'upper', exercises:[
    { id:'flat_db_press',    name:'Flat DB Chest Press',          sets:3, reps:'8–10',  rir:'1.5–2', rest:240 },
    { id:'incline_hammer',   name:'Incline Hammer Chest Press',   sets:2, reps:'12–15', rir:'1–2',   rest:180 },
    { id:'tbar_row',         name:'Chest-Supported T-Bar Row',    sets:3, reps:'6–10',  rir:'1–2',   rest:240 },
    { id:'sa_lat_pull',      name:'Single-Arm Lat Pulldown',      sets:2, reps:'12–15', rir:'1–2',   rest:180 },
    { id:'cable_lateral',    name:'Lying Cable Lateral Raises',   sets:3, reps:'12–20', rir:'1',     rest:180 },
    { id:'ez_curl',          name:'EZ Bar Bicep Curls',           sets:3, reps:'10–12', rir:'1',     rest:180 },
    { id:'ab_crunch',        name:'Ab Crunch Machine',            sets:3, reps:'12–15', rir:'1',     rest:150 },
  ]},
  { id:'day2', label:'Day 2 — Lower A', type:'lower', exercises:[
    { id:'smith_squat',      name:'Smith Machine Squat',          sets:3, reps:'8–10',  rir:'1.5–2', rest:240 },
    { id:'leg_press',        name:'Leg Press (Descending)',        sets:2, reps:'10+',   rir:'1',     rest:240 },
    { id:'db_rdl',           name:'DB RDL',                       sets:3, reps:'10–12', rir:'1.5–2', rest:240 },
    { id:'seated_ham_curl',  name:'Seated Hamstring Curls',       sets:3, reps:'12–15', rir:'1',     rest:180 },
    { id:'adductor',         name:'Seated Adductor/Abductor',     sets:2, reps:'15–20', rir:'1',     rest:180 },
    { id:'standing_calf',    name:'Standing Calf Raises',         sets:3, reps:'10–12', rir:'1',     rest:180 },
  ]},
  { id:'day3', label:'Day 3 — Upper B', type:'upper', exercises:[
    { id:'lat_pull_neutral', name:'Lat Pulldown (Neutral Grip)',  sets:3, reps:'12–15', rir:'1–2',   rest:240 },
    { id:'sa_iso_row',       name:'Single-Arm ISO Hammer Row',    sets:2, reps:'10–12', rir:'1–2',   rest:210 },
    { id:'smith_incline',    name:'Smith Machine Incline Press',  sets:2, reps:'8–12',  rir:'1–2',   rest:240 },
    { id:'smith_shoulder',   name:'Smith Machine Shoulder Press', sets:2, reps:'10–12', rir:'1–2',   rest:180 },
    { id:'cuffed_fly',       name:'Cuffed Flyes',                 sets:2, reps:'15–20', rir:'1',     rest:180 },
    { id:'oh_tricep',        name:'Overhead Tricep Extensions',   sets:3, reps:'12–15', rir:'1',     rest:180 },
    { id:'rear_delt',        name:'Rear Delt Fly Machine',        sets:3, reps:'15–20', rir:'1',     rest:180 },
  ]},
  { id:'day4', label:'Day 4 — Lower B', type:'lower', exercises:[
    { id:'barbell_rdl',      name:'Barbell RDL',                  sets:2, reps:'8–10',  rir:'1.5–2', rest:240 },
    { id:'hack_squat',       name:'Hack Squat',                   sets:2, reps:'6–12',  rir:'1–2',   rest:240 },
    { id:'bulgarian',        name:'DB Bulgarian Split Squat',     sets:2, reps:'10–12', rir:'1–2',   rest:210 },
    { id:'leg_ext',          name:'Leg Extensions',               sets:2, reps:'12–15', rir:'1',     rest:180 },
    { id:'glute_hyper',      name:'Glute Hyperextensions',        sets:2, reps:'12–15', rir:'1',     rest:180 },
    { id:'lying_ham_curl',   name:'Lying Hamstring Curls (HS)',   sets:3, reps:'12–20', rir:'1',     rest:150 },
    { id:'calf_seated',      name:'Standing Calf Raises (B)',     sets:3, reps:'15–20', rir:'1',     rest:150 },
  ]},
  { id:'day5', label:'Day 5 — Upper C', type:'upper', exercises:[
    { id:'incline_bb',        name:'Incline Barbell Bench Press', sets:2, reps:'6–8',   rir:'1–2',   rest:240 },
    { id:'cable_fly_press',   name:'Cable Fly/Press Hybrid',      sets:2, reps:'12–15', rir:'1',     rest:180 },
    { id:'cable_row_neutral', name:'Seated Neutral Grip Cable Row',sets:2,reps:'12–15', rir:'1–2',   rest:210 },
    { id:'sa_cable_row',      name:'Single-Arm Cable Row (Lat)',  sets:2, reps:'15–20', rir:'1',     rest:180 },
    { id:'db_lateral',        name:'DB Lateral Raises',           sets:3, reps:'10–12', rir:'1',     rest:180 },
    { id:'db_hammer',         name:'DB Hammer Curl',              sets:3, reps:'10–12', rir:'1',     rest:180 },
    { id:'rope_tricep',       name:'Rope Tricep Extensions',      sets:3, reps:'15–20', rir:'1',     rest:150 },
  ]},
];

// ── DB — hybrid local+supabase ──
const DB = {

  // ── PROGRAMME ──
  async getProgramme() {
    const cached = LOCAL.get('programme');
    if (cached) return cached;
    const row = await SB.get('programme', { profile: CURRENT_PROFILE });
    if (row && row.data) { LOCAL.set('programme', row.data); return row.data; }
    return JSON.parse(JSON.stringify(DEFAULT_PROGRAMME));
  },
  async saveProgramme(data) {
    LOCAL.set('programme', data);
    SB.upsert('programme', { profile: CURRENT_PROFILE, data, updated_at: new Date().toISOString() });
  },

  // ── SESSIONS — always use local cache as source of truth ──
  getSessions() {
    // Synchronous — reads from local cache which is populated at login sync
    return LOCAL.get('sessions', []);
  },

  async saveSession(session) {
    // 1. Save to local immediately so UI updates instantly
    const sessions = LOCAL.get('sessions', []);
    const idx = sessions.findIndex(s => s.id === session.id);
    if (idx >= 0) sessions[idx] = session; else sessions.unshift(session);
    LOCAL.set('sessions', sessions);

    // 2. Push to Supabase in background
    SB.upsert('sessions', {
      id:        session.id,
      profile:   CURRENT_PROFILE,
      day_id:    session.dayId,
      day_label: session.dayLabel,
      date:      session.date,
      week:      session.week,
      started:   session.started,
      finished:  session.finished,
      exercises: session.exercises,
    });
  },

  getSession(id) {
    return this.getSessions().find(s => s.id === id) || null;
  },

  // ── ACTIVE WORKOUT — local only (fast, short-lived) ──
  getActive() {
    return LOCAL.get('active', null);
  },
  async saveActive(data) {
    LOCAL.set('active', data);
    SB.upsert('active_workout', { profile: CURRENT_PROFILE, data, updated_at: new Date().toISOString() });
  },
  async clearActive() {
    LOCAL.del('active');
    SB.delete('active_workout', { profile: CURRENT_PROFILE });
  },

  // ── CURRENT WEEK ──
  getCurrentWeek() {
    return LOCAL.get('currentWeek', 1);
  },
  async setCurrentWeek(w) {
    LOCAL.set('currentWeek', w);
    SB.upsert('current_week', { profile: CURRENT_PROFILE, week: w, updated_at: new Date().toISOString() });
  },

  // ── REHAB ──
  getRehabExercises() {
    return LOCAL.get('rehab_exercises', []);
  },
  async saveRehabExercises(list) {
    LOCAL.set('rehab_exercises', list);
    SB.upsert('rehab_exercises', { profile: CURRENT_PROFILE, exercises: list, updated_at: new Date().toISOString() });
  },
  getRehabSessions() {
    return LOCAL.get('rehab_sessions', []);
  },
  async saveRehabSession(session) {
    const list = LOCAL.get('rehab_sessions', []);
    list.unshift(session);
    LOCAL.set('rehab_sessions', list.slice(0, 100));
    SB.insert('rehab_sessions', {
      id:            session.id,
      profile:       CURRENT_PROFILE,
      date:          session.date,
      exercise_id:   session.exerciseId,
      exercise_name: session.exerciseName,
      sets:          session.sets,
      note:          session.note || null,
    });
  },

  // ── SYNC: pull everything from Supabase into local cache at login ──
  async syncFromCloud() {
    console.log('Syncing from Supabase for profile:', CURRENT_PROFILE);
    try {
      // Programme
      const prog = await SB.get('programme', { profile: CURRENT_PROFILE });
      if (prog?.data) { LOCAL.set('programme', prog.data); console.log('✓ programme synced'); }

      // Sessions — map DB column names back to app field names
      const rows = await SB.getAll('sessions', { profile: CURRENT_PROFILE }, 'created_at.desc');
      if (rows && rows.length > 0) {
        const sessions = rows.map(r => ({
          id:       r.id,
          dayId:    r.day_id,
          dayLabel: r.day_label,
          date:     r.date,
          week:     r.week,
          started:  r.started,
          finished: r.finished,
          exercises: r.exercises,
        }));
        LOCAL.set('sessions', sessions);
        console.log('✓ sessions synced:', sessions.length);
      } else {
        console.log('No sessions in Supabase yet');
      }

      // Current week
      const wk = await SB.get('current_week', { profile: CURRENT_PROFILE });
      if (wk) { LOCAL.set('currentWeek', wk.week); console.log('✓ week synced:', wk.week); }

      // Active workout
      const active = await SB.get('active_workout', { profile: CURRENT_PROFILE });
      if (active?.data) { LOCAL.set('active', active.data); console.log('✓ active workout synced'); }
      else { LOCAL.del('active'); }

      // Rehab exercises
      const rehab = await SB.get('rehab_exercises', { profile: CURRENT_PROFILE });
      if (rehab?.exercises) { LOCAL.set('rehab_exercises', rehab.exercises); console.log('✓ rehab exercises synced'); }

      // Rehab sessions
      const rehabRows = await SB.getAll('rehab_sessions', { profile: CURRENT_PROFILE }, 'created_at.desc');
      if (rehabRows && rehabRows.length > 0) {
        const rehabSessions = rehabRows.map(r => ({
          id:           r.id,
          date:         r.date,
          exerciseId:   r.exercise_id,
          exerciseName: r.exercise_name,
          sets:         r.sets,
          note:         r.note,
        }));
        LOCAL.set('rehab_sessions', rehabSessions);
        console.log('✓ rehab sessions synced:', rehabSessions.length);
      }

      console.log('Sync complete');
    } catch(e) {
      console.error('Sync error:', e);
    }
  },

  // ── CALCULATIONS (synchronous, use local cache) ──
  calcE1RM(load, reps) {
    if (!load || !reps || reps <= 0) return 0;
    if (reps === 1) return load;
    return Math.round((load * (1 + reps / 30)) * 10) / 10;
  },

  getLastSession(dayId, exerciseId) {
    const sessions = this.getSessions();
    const past = sessions.filter(s => s.dayId === dayId);
    if (!past.length) return null;
    return (past[0].exercises || []).find(e => e.id === exerciseId) || null;
  },

  getE1RMHistory(exerciseId) {
    return this.getSessions().slice().reverse().reduce((hist, s) => {
      const ex = (s.exercises || []).find(e => e.id === exerciseId);
      if (!ex) return hist;
      const sets = (ex.sets || []).filter(set => set.load && set.reps);
      if (!sets.length) return hist;
      const maxE1RM = Math.max(...sets.map(set => this.calcE1RM(parseFloat(set.load), parseInt(set.reps))));
      if (maxE1RM > 0) hist.push({ date: s.date, week: s.week, e1rm: maxE1RM });
      return hist;
    }, []);
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
    const programme = LOCAL.get('programme', DEFAULT_PROGRAMME);
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
    const avgRIR = sessions.slice(0,12).flatMap(s => s.exercises||[]).flatMap(e => e.sets||[])
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

  async _testConnection() {
    const el = document.getElementById('sync-test-result');
    if (el) el.textContent = 'Testing...';
    const results = [];
    // Test 1: basic fetch to Supabase
    try {
      const r = await fetch(`${SUPA_URL}/rest/v1/sessions?limit=1&profile=eq.${CURRENT_PROFILE}`, { headers: SB.h() });
      const text = await r.text();
      results.push(`Status: ${r.status}`);
      results.push(`Response: ${text.slice(0, 200)}`);
    } catch(e) {
      results.push(`Fetch error: ${e.message}`);
    }
    // Test 2: try insert
    try {
      const r2 = await fetch(`${SUPA_URL}/rest/v1/current_week`, {
        method: 'POST',
        headers: { ...SB.h(), 'Prefer': 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ profile: CURRENT_PROFILE, week: DB.getCurrentWeek(), updated_at: new Date().toISOString() }),
      });
      results.push(`Upsert status: ${r2.status}`);
      if (!r2.ok) results.push(`Upsert error: ${await r2.text()}`);
    } catch(e) {
      results.push(`Upsert error: ${e.message}`);
    }
    if (el) el.innerHTML = results.map(r => `<div>${r}</div>`).join('');
  },

  formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });
  },
  todayISO() { return new Date().toISOString().split('T')[0]; },
  newId()    { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); },
};
