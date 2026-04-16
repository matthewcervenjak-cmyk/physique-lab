const Screens = {

  // ══════════════════════════════════
  // PROGRESS SCREEN
  // ══════════════════════════════════
  async renderProgress() {
    const container = document.getElementById('screen-progress');
    container.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;
    const programme = await DB.getProgramme();
    const allExercises = programme.flatMap(d => d.exercises);
    const exWithHistory = allExercises.map(ex => ({ ...ex, hist: DB.getE1RMHistory(ex.id) })).filter(ex => ex.hist.length > 0);

    if (exWithHistory.length === 0) {
      container.innerHTML = `
        <div class="section-header"><div class="section-title">Progress</div></div>
        <div class="empty-state">
          <div class="empty-icon">📈</div>
          <div class="empty-title">No data yet</div>
          <div class="empty-sub">Save a workout session to see progress charts</div>
        </div>`;
      return;
    }

    let html = `<div class="section-header"><div class="section-title">Progress</div></div>`;
    for (const ex of exWithHistory) {
      const hist = ex.hist;
      const first = hist[0].e1rm, last = hist[hist.length-1].e1rm;
      const delta = last - first, deltaPct = Math.round((delta / first) * 100);
      const maxE = Math.max(...hist.map(h=>h.e1rm));
      const barClass = h => { const p = h.e1rm/maxE; return p>=0.97?'peak':p>=0.85?'hi':p>=0.65?'mid':'lo'; };

      html += `
        <div class="card" onclick="Screens.toggleProgDetail('${ex.id}')">
          <div class="prog-card">
            <div class="prog-name">${ex.name}</div>
            <div class="mini-chart">${hist.slice(-8).map(h=>`<div class="mc-bar ${barClass(h)}" style="height:${Math.round((h.e1rm/maxE)*100)}%"></div>`).join('')}</div>
            <div class="prog-footer">
              <span class="prog-e1rm">e1RM: ${first} → ${last} kg</span>
              <span class="prog-delta ${delta>0.5?'delta-up':delta<-0.5?'delta-dn':'delta-flat'}">${delta>=0?'↑ +':'↓ '}${Math.abs(deltaPct)}%</span>
            </div>
          </div>
          <div class="prog-detail" id="detail-${ex.id}">
            <div class="divider"></div>
            <div class="prog-weeks-row">
              ${hist.slice(-6).map((h,i,arr) => {
                const prev = arr[i-1];
                const arrow = prev ? (h.e1rm > prev.e1rm*1.005 ? '<span class="wk-arrow text-green">↑</span>' : h.e1rm < prev.e1rm*0.995 ? '<span class="wk-arrow" style="color:var(--red)">↓</span>' : '<span class="wk-arrow" style="color:var(--amber)">→</span>') : '';
                return `<div class="wk-item"><div class="wk-num">W${h.week}</div><div class="wk-val">${h.e1rm}</div>${arrow}</div>`;
              }).join('')}
            </div>
            <div class="pad-card" style="padding-top:0">
              <div class="grid-2">
                <div class="stat-tile"><div class="stat-val">${maxE}</div><div class="stat-lbl">Peak e1RM</div></div>
                <div class="stat-tile"><div class="stat-val">${hist.length}</div><div class="stat-lbl">Sessions</div></div>
              </div>
            </div>
          </div>
        </div>`;
    }
    container.innerHTML = html;
  },

  toggleProgDetail(exId) {
    const el = document.getElementById('detail-' + exId);
    if (el) el.classList.toggle('open');
  },

  // ══════════════════════════════════
  // DELOAD SCREEN
  // ══════════════════════════════════
  async renderDeload() {
    const container = document.getElementById('screen-deload');
    const analysis = DB.getDeloadAnalysis();
    const { fatigueScore, stalled, status, recommendation, totalPrimary, stalledCount } = analysis;
    const week = DB.getCurrentWeek();
    const statusConfig = {
      good:    { dot:'dot-green', label:'Readiness: Good to train',  color:'var(--green)' },
      monitor: { dot:'dot-amber', label:'Readiness: Monitor closely', color:'var(--amber)' },
      deload:  { dot:'dot-red',   label:'Deload recommended',         color:'var(--red)'   },
    };
    const sc = statusConfig[status];
    const fatigueColor = fatigueScore < 40 ? 'var(--green2)' : fatigueScore < 65 ? '#5a4a0a' : '#5a1a1a';

    container.innerHTML = `
      <div class="section-header"><div class="section-title">Deload AI</div></div>
      <div class="card"><div class="pad-card">
        <div class="status-row"><div class="status-dot ${sc.dot}"></div><span class="status-label" style="color:${sc.color}">${sc.label}</span></div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:4px">Accumulated fatigue score</div>
        <div class="fatigue-track"><div class="fatigue-fill" style="width:${fatigueScore}%;background:${fatigueColor}"></div></div>
        <div class="fatigue-labels"><span>Recovery</span><span>${fatigueScore}/100</span><span>Overreach</span></div>
        <div style="font-size:13px;color:var(--text2);margin-top:10px;line-height:1.5">Week ${week} of 8. ${stalledCount} of ${totalPrimary} tracked exercises showing plateau.</div>
      </div></div>
      ${stalled.length > 0 ? `
      <div class="card"><div class="pad-card">
        <div class="status-row"><div class="status-dot dot-amber"></div><span class="status-label" style="color:var(--amber)">Stalls detected — ${stalled.length} exercise${stalled.length>1?'s':''}</span></div>
        <div class="stall-list">${stalled.map(s=>`<div class="stall-item"><span class="stall-name">${s.name}</span><span class="stall-wks">${s.weeks} sessions flat</span></div>`).join('')}</div>
        <div class="rec-box"><div class="rec-label">Recommendation</div><div class="rec-text">${recommendation}</div></div>
      </div></div>` : `
      <div class="card"><div class="pad-card">
        <div class="rec-box"><div class="rec-label">Assessment</div><div class="rec-text">${recommendation}</div></div>
      </div></div>`}
      ${status === 'deload' ? `<button class="btn-primary" style="background:#5a1a1a;color:var(--red);border:1px solid #7a2a2a" onclick="Screens.triggerDeload()">Trigger Deload Week</button>` : ''}
      <div class="card"><div class="pad-card">
        <div style="font-size:13px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Detection logic</div>
        <div class="algo-steps">
          <div class="algo-step"><span class="algo-n">1.</span><span class="algo-t">Calculate e1RM per set using Epley formula: Load × (1 + reps/30)</span></div>
          <div class="algo-step"><span class="algo-n">2.</span><span class="algo-t">Flag exercise if no e1RM improvement over 3+ consecutive sessions (&lt;2% change)</span></div>
          <div class="algo-step"><span class="algo-n">3.</span><span class="algo-t">Track average RIR — drift below target range signals fatigue accumulation</span></div>
          <div class="algo-step"><span class="algo-n">4.</span><span class="algo-t">If 60%+ of primary lifts stall simultaneously, trigger full programme deload</span></div>
          <div class="algo-step"><span class="algo-n">5.</span><span class="algo-t">Deload = −40% load, −40% volume, same movement patterns for 1 week</span></div>
        </div>
      </div></div>
      <div class="card"><div class="pad-card">
        <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px">Supabase connection test</div>
        <button class="btn-secondary" style="font-size:13px;padding:10px" onclick="DB._testConnection()">Test sync connection</button>
        <div id="sync-test-result" style="margin-top:10px;font-size:12px;color:var(--text2);line-height:1.6;word-break:break-all"></div>
      </div></div>
      <div style="height:12px"></div>`;
  },

  triggerDeload() {
    App.showModal('Trigger deload week?', `
      <div class="rec-text" style="margin-bottom:16px;line-height:1.6">All loads reduced 40%, volume reduced 40% next session.</div>
      <button class="btn-primary" style="background:#5a1a1a;color:var(--red);border:1px solid #7a2a2a" onclick="App.closeModal();App.toast('Deload week activated')">Confirm Deload</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  // ══════════════════════════════════
  // HISTORY SCREEN
  // ══════════════════════════════════
  async renderHistory() {
    const container = document.getElementById('screen-history');
    container.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;
    const sessions = DB.getSessions().filter(s => s.saved);

    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="section-header"><div class="section-title">History</div></div>
        <div class="empty-state">
          <div class="empty-icon">📋</div><div class="empty-title">No sessions yet</div>
          <div class="empty-sub">Saved workouts appear here</div>
        </div>`;
      return;
    }

    // Group by week for cleaner display
    const byWeek = {};
    for (const s of sessions) {
      if (!byWeek[s.week]) byWeek[s.week] = [];
      byWeek[s.week].push(s);
    }

    let html = `<div class="section-header"><div class="section-title">History</div><div class="pill">${sessions.length} sessions</div></div>`;

    for (const week of Object.keys(byWeek).sort((a,b) => b-a)) {
      html += `<div style="font-size:12px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin:12px 0 6px">Week ${week}</div>`;
      for (const s of byWeek[week]) {
        const exercises = s.exercises || [];
        const totalSets = exercises.flatMap(e=>e.sets||[]).filter(s=>s.done||s.load).length;
        const totalVol = exercises.flatMap(e=>e.sets||[]).filter(s=>s.load&&s.reps).reduce((sum,s)=>sum+parseFloat(s.load)*parseInt(s.reps),0);
        html += `
          <div class="card" onclick="Screens.showSessionDetail('${s.id}')">
            <div class="hist-session">
              <div class="hist-date"><span>${s.dayLabel}</span><span style="font-size:11px;color:var(--text3)">${DB.formatDate(s.date)}</span></div>
              <div class="hist-exercises">
                ${exercises.slice(0,3).map(ex => {
                  const sets = (ex.sets||[]).filter(s=>s.load&&s.reps);
                  const top = sets[0];
                  return top ? `<div class="hist-ex"><span class="hist-ex-name">${ex.name}</span><span class="hist-ex-val">${top.load}kg × ${top.reps}</span></div>` : '';
                }).join('')}
                ${exercises.length > 3 ? `<div style="font-size:11px;color:var(--text3)">+${exercises.length-3} more</div>` : ''}
              </div>
              <div class="hist-volume">${Math.round(totalVol).toLocaleString()} kg total volume · ${totalSets} sets</div>
            </div>
          </div>`;
      }
    }

    container.innerHTML = html + '<div style="height:12px"></div>';
  },

  showSessionDetail(sessionId) {
    const s = DB.getSession(sessionId);
    if (!s) return;
    const exercises = s.exercises || [];
    App.showModal(`${s.dayLabel} — W${s.week}`, `
      <div style="font-size:12px;color:var(--text3);margin-bottom:14px">${DB.formatDate(s.date)}</div>
      ${exercises.map(ex => {
        const sets = (ex.sets||[]).filter(s=>s.load&&s.reps);
        if (!sets.length) return '';
        const maxE = Math.max(...sets.map(s=>DB.calcE1RM(parseFloat(s.load),parseInt(s.reps))));
        return `<div style="margin-bottom:14px">
          <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">${ex.name}</div>
          ${sets.map((s,i)=>`
            <div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0;border-bottom:1px solid var(--border)">
              <span style="color:var(--text3)">Set ${i+1}</span>
              <span style="color:var(--text2)">${s.load}kg × ${s.reps} reps</span>
              <span style="color:var(--text3)">e1RM ${DB.calcE1RM(parseFloat(s.load),parseInt(s.reps))}kg</span>
            </div>`).join('')}
          <div style="font-size:11px;color:var(--green);margin-top:4px">Peak e1RM: ${maxE}kg</div>
        </div>`;
      }).join('')}
      <button class="btn-secondary" onclick="App.closeModal()">Close</button>`);
  },

  // ══════════════════════════════════
  // PROGRAMME SCREEN
  // ══════════════════════════════════
  async renderProgramme() {
    const container = document.getElementById('screen-programme');
    container.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;
    const programme = await DB.getProgramme();

    let html = `<div class="section-header"><div><div class="section-title">Program</div><div class="section-sub">Tap exercise to edit · Use + Day to add</div></div></div>`;
    for (const day of programme) {
      html += `
        <div class="card">
          <div class="programme-day">
            <div class="prog-day-header">
              <span>${day.label}</span>
              <div style="display:flex;gap:6px">
                <button class="edit-btn" onclick="Screens.editDayName('${day.id}')">Rename</button>
                <button class="edit-btn" style="color:var(--red);border-color:#5a1a1a" onclick="Screens.deleteDay('${day.id}')">Delete</button>
              </div>
            </div>
            <div class="prog-exercise-list">
              ${day.exercises.map(ex=>`
                <div class="prog-ex-row" onclick="Screens.editExercise('${day.id}','${ex.id}')">
                  <div>
                    <div class="prog-ex-name">${ex.name}</div>
                    <div class="prog-ex-detail">${ex.sets} sets · ${ex.reps} reps · ${ex.rest}s rest</div>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3l3 3L5 14l-4 1 1-4L10 3z" stroke="var(--text3)" stroke-width="1.3" stroke-linecap="round"/></svg>
                </div>`).join('')}
            </div>
            <button class="add-set-btn" style="margin:10px 0 0" onclick="Screens.addExercise('${day.id}')">+ Add exercise</button>
          </div>
        </div>`;
    }
    container.innerHTML = html + '<div style="height:12px"></div>';
  },

  async editExercise(dayId, exId) {
    const programme = await DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    const ex = day?.exercises.find(e=>e.id===exId);
    if (!ex) return;
    const setRepsInputs = Array.from({length: ex.sets}, (_, i) => {
      const val = (ex.setReps && ex.setReps[i]) || ex.reps;
      return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:12px;color:var(--text3);min-width:40px">Set ${i+1}</span>
        <input class="form-input set-rep-input" value="${val}" style="flex:1">
      </div>`;
    }).join('');
    App.showModal(`Edit: ${ex.name}`, `
      <div class="form-group"><label class="form-label">Exercise name</label><input class="form-input" id="edit-name" value="${ex.name}"></div>
      <div class="form-group"><label class="form-label">Target sets</label><input class="form-input" id="edit-sets" type="number" value="${ex.sets}" min="1" max="10" oninput="Screens._updateSetRepsInputs(this.value)"></div>
      <div class="form-group"><label class="form-label">Rep targets per set</label><div id="set-reps-inputs">${setRepsInputs}</div></div>
      <div class="form-group"><label class="form-label">Rest (seconds)</label><input class="form-input" id="edit-rest" type="number" value="${ex.rest}" min="30" max="600" step="10"></div>
      <button class="btn-primary" onclick="Screens.saveExercise('${dayId}','${exId}')">Save</button>
      <button class="btn-secondary" style="color:var(--red);border-color:#5a1a1a" onclick="Screens.deleteExercise('${dayId}','${exId}')">Delete exercise</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  _updateSetRepsInputs(numSets) {
    const container = document.getElementById('set-reps-inputs');
    if (!container) return;
    const existing = Array.from(container.querySelectorAll('.set-rep-input')).map(i => i.value);
    const fallback = existing[0] || '8–12';
    const n = Math.max(1, Math.min(10, parseInt(numSets) || 1));
    container.innerHTML = Array.from({length: n}, (_, i) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:12px;color:var(--text3);min-width:40px">Set ${i+1}</span>
        <input class="form-input set-rep-input" value="${existing[i] || fallback}" style="flex:1">
      </div>`).join('');
  },

  async saveExercise(dayId, exId) {
    const programme = await DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    const ex = day?.exercises.find(e=>e.id===exId);
    if (!ex) return;
    ex.name = document.getElementById('edit-name').value.trim() || ex.name;
    ex.sets = parseInt(document.getElementById('edit-sets').value) || ex.sets;
    ex.rest = parseInt(document.getElementById('edit-rest').value) || ex.rest;
    const repInputs = Array.from(document.querySelectorAll('.set-rep-input')).map(i => i.value.trim());
    ex.reps = repInputs[0] || ex.reps;
    const allSame = repInputs.every(r => r === repInputs[0]);
    ex.setReps = allSame ? null : repInputs;
    await DB.saveProgramme(programme);
    App.closeModal(); this.renderProgramme(); App.toast('Exercise updated');
  },

  async deleteExercise(dayId, exId) {
    if (!confirm('Delete this exercise?')) return;
    const programme = await DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    if (!day) return;
    day.exercises = day.exercises.filter(e=>e.id!==exId);
    await DB.saveProgramme(programme);
    App.closeModal(); this.renderProgramme(); App.toast('Exercise deleted');
  },

  async addExercise(dayId) {
    App.showModal('Add exercise', `
      <div class="form-group"><label class="form-label">Exercise name</label><input class="form-input" id="new-ex-name" placeholder="e.g. Incline DB Press"></div>
      <div class="form-group"><label class="form-label">Target sets</label><input class="form-input" id="new-ex-sets" type="number" value="3" min="1" max="10"></div>
      <div class="form-group"><label class="form-label">Rep range</label><input class="form-input" id="new-ex-reps" value="8–12"></div>
      <div class="form-group"><label class="form-label">Rest (seconds)</label><input class="form-input" id="new-ex-rest" type="number" value="180" min="30" max="600" step="10"></div>
      <button class="btn-primary" onclick="Screens.confirmAddExercise('${dayId}')">Add Exercise</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  async confirmAddExercise(dayId) {
    const name = document.getElementById('new-ex-name').value.trim();
    if (!name) { App.toast('Enter exercise name'); return; }
    const programme = await DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    if (!day) return;
    day.exercises.push({ id: DB.newId(), name, sets: parseInt(document.getElementById('new-ex-sets').value)||3, reps: document.getElementById('new-ex-reps').value.trim()||'8–12', rir:'1–2', rest: parseInt(document.getElementById('new-ex-rest').value)||180 });
    await DB.saveProgramme(programme);
    App.closeModal(); this.renderProgramme(); App.toast('Exercise added');
  },

  async editDayName(dayId) {
    const programme = await DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    if (!day) return;
    App.showModal('Rename day', `
      <div class="form-group"><label class="form-label">Day label</label><input class="form-input" id="new-day-name" value="${day.label}"></div>
      <button class="btn-primary" onclick="Screens.saveDayName('${dayId}')">Save</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  async saveDayName(dayId) {
    const name = document.getElementById('new-day-name').value.trim();
    if (!name) return;
    const programme = await DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    if (!day) return;
    day.label = name;
    await DB.saveProgramme(programme);
    App.closeModal(); this.renderProgramme(); App.toast('Day renamed');
  },

  async addDay() {
    App.showModal('Add training day', `
      <div class="form-group"><label class="form-label">Day label</label><input class="form-input" id="new-day-label" placeholder="e.g. Day 6 — Arms"></div>
      <button class="btn-primary" onclick="Screens.confirmAddDay()">Add Day</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  async confirmAddDay() {
    const label = document.getElementById('new-day-label').value.trim();
    if (!label) { App.toast('Enter a day label'); return; }
    const programme = await DB.getProgramme();
    programme.push({ id: DB.newId(), label, type:'upper', exercises:[] });
    await DB.saveProgramme(programme);
    App.closeModal(); this.renderProgramme(); App.toast('Day added');
  },

  async deleteDay(dayId) {
    const programme = await DB.getProgramme();
    const day = programme.find(d => d.id === dayId);
    if (!day) return;
    App.showModal(`Delete ${day.label}?`, `
      <div class="rec-text" style="margin-bottom:16px;line-height:1.6">This will remove the day and all its exercises from your program. Logged session data is kept.</div>
      <button class="btn-primary" style="background:#5a1a1a;color:var(--red);border:1px solid #7a2a2a" onclick="Screens._confirmDeleteDay('${dayId}')">Delete Day</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  async _confirmDeleteDay(dayId) {
    const programme = await DB.getProgramme();
    const updated = programme.filter(d => d.id !== dayId);
    await DB.saveProgramme(updated);
    App.closeModal();
    this.renderProgramme();
    Log._sessions = {};
    if (document.getElementById('screen-log').classList.contains('active')) Log.render();
    App.toast('Day deleted');
  },

  async changeWeek() {
    const week = DB.getCurrentWeek();
    App.showModal('Select week', `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:4px">
        ${Array.from({length:12},(_,i)=>i+1).map(w=>`
          <button onclick="DB.setCurrentWeek(${w});App.closeModal();Screens.renderToday();App._renderScreen('today')" style="
            padding:14px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;border:none;
            background:${w===week?'var(--green2)':'var(--bg3)'};
            color:${w===week?'var(--green)':'var(--text2)'};
            border:1.5px solid ${w===week?'var(--green3)':'var(--border)'};
          ">W${w}</button>`).join('')}
      </div>`);
  },
};
