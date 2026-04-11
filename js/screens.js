// ── SCREEN RENDERERS ──

const Screens = {

  // ══════════════════════════════════
  // TODAY SCREEN
  // ══════════════════════════════════
  renderToday() {
    const container = document.getElementById('screen-today');
    const active = DB.getActive();
    const programme = DB.getProgramme();
    const week = DB.getCurrentWeek();

    // Header right: week selector
    document.getElementById('header-right').innerHTML = `
      <button class="header-btn" onclick="Screens.changeWeek()">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M4 2v2M10 2v2M2 5v6a1 1 0 001 1h8a1 1 0 001-1V5H2z" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
        Week ${week}
      </button>`;

    if (!active) {
      // No active workout — show day picker
      container.innerHTML = `
        <div class="section-header">
          <div><div class="section-title">Choose today's session</div><div class="section-sub">Week ${week} of 8</div></div>
        </div>
        ${programme.map(day => `
          <div class="card" style="cursor:pointer" onclick="Screens.startWorkout('${day.id}')">
            <div class="card-header">
              <div>
                <div class="card-title">${day.label}</div>
                <div class="card-meta">${day.exercises.length} exercises</div>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 5l5 5-5 5" stroke="#4a7a4a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>`).join('')}
        <div class="card" style="margin-top:4px">
          <div class="pad-card">
            <div class="text-muted text-sm" style="line-height:1.6">
              Week ${week} of 8 · Data-driven deload triggers automatically when progress stalls.
            </div>
          </div>
        </div>`;
      return;
    }

    // Active workout in progress
    const day = programme.find(d => d.id === active.dayId);
    if (!day) { DB.clearActive(); this.renderToday(); return; }

    let html = `
      <div class="section-header">
        <div>
          <div class="section-title">${day.label}</div>
          <div class="section-sub">Week ${week} · ${DB.formatDate(active.date)} · tap set to log</div>
        </div>
        <div class="pill">W${week}</div>
      </div>`;

    for (const ex of active.exercises) {
      const lastEx = DB.getLastSession(active.dayId, ex.id);
      const lastSets = lastEx ? (lastEx.sets || []).filter(s => s.load && s.reps) : [];
      const lastLoad = lastSets.length > 0 ? lastSets[0].load : null;
      const lastReps = lastSets.length > 0 ? lastSets[0].reps : null;
      const lastE1RM = lastSets.length > 0 ? Math.max(...lastSets.map(s => DB.calcE1RM(parseFloat(s.load), parseInt(s.reps)))) : null;

      const status = DB.getProgressionStatus(active.dayId, ex.id, ex.sets);
      const badges = { pr: '<span class="badge badge-pr">↑ PR</span>', same: '<span class="badge badge-same">→ Same</span>', down: '<span class="badge badge-down">↓ Drop</span>', new: '<span class="badge badge-new">New</span>' };
      const badge = status ? (badges[status] || '') : '';

      const completedSets = ex.sets.filter(s => s.done).length;
      const totalSets = ex.sets.length;

      html += `<div class="card" id="ex-${ex.id}">
        <div class="card-header">
          <div style="flex:1">
            <div class="card-title">${ex.name}</div>
            <div class="card-meta">${ex.targetSets} sets · ${ex.reps} reps · ${ex.rest}s rest · ${completedSets}/${totalSets} done</div>
          </div>
          ${badge}
        </div>
        <div class="col-heads">
          <div class="col-head"></div>
          <div class="col-head">Load (kg)</div>
          <div class="col-head">Reps</div>
          <div class="col-head">RIR</div>
          <div class="col-head"></div>
        </div>
        ${ex.sets.map((set, i) => `
          <div class="set-row" id="set-${ex.id}-${i}">
            <div class="set-num">${i+1}</div>
            <input class="set-input ${set.done?'done':''}" type="number" inputmode="decimal" placeholder="${lastLoad || 'kg'}" value="${set.load || ''}" onchange="Screens.updateSet('${ex.id}', ${i}, 'load', this.value)" step="0.5" min="0">
            <input class="set-input ${set.done?'done':''}" type="number" inputmode="numeric" placeholder="${lastReps || 'reps'}" value="${set.reps || ''}" onchange="Screens.updateSet('${ex.id}', ${i}, 'reps', this.value)" min="1" max="100">
            <input class="set-input ${set.done?'done':''}" type="number" inputmode="decimal" placeholder="RIR" value="${set.rir !== undefined ? set.rir : ''}" onchange="Screens.updateSet('${ex.id}', ${i}, 'rir', this.value)" step="0.5" min="0" max="10">
            <button class="tick-btn ${set.done?'done':''}" onclick="Screens.tickSet('${ex.id}', ${i})">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="#4afc7a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>`).join('')}
        <button class="add-set-btn" onclick="Screens.addSet('${ex.id}')">+ Add set</button>
        <div class="prev-row">
          ${lastLoad ? `<span class="prev-item">Last: <strong>${lastLoad}kg × ${lastReps}</strong></span>` : '<span class="prev-item" style="color:var(--text3)">No prior data</span>'}
          ${lastE1RM ? `<span class="prev-item">Best e1RM: <strong>${lastE1RM}kg</strong></span>` : ''}
        </div>
      </div>`;
    }

    html += `
      <button class="btn-primary" onclick="Screens.finishWorkout()">
        Finish Workout
      </button>
      <button class="btn-secondary" onclick="Screens.cancelWorkout()">
        Cancel / Discard
      </button>
      <div style="height:16px"></div>`;

    container.innerHTML = html;
  },

  startWorkout(dayId) {
    const programme = DB.getProgramme();
    const day = programme.find(d => d.id === dayId);
    if (!day) return;
    const workout = {
      id: DB.newId(),
      dayId: day.id,
      dayLabel: day.label,
      date: DB.todayISO(),
      week: DB.getCurrentWeek(),
      started: Date.now(),
      exercises: day.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        targetSets: ex.sets,
        reps: ex.reps,
        rest: ex.rest,
        rir: ex.rir,
        sets: Array.from({ length: ex.sets }, () => ({ load: '', reps: '', rir: '', done: false }))
      }))
    };
    DB.saveActive(workout);
    this.renderToday();
  },

  updateSet(exId, setIdx, field, value) {
    const active = DB.getActive();
    if (!active) return;
    const ex = active.exercises.find(e => e.id === exId);
    if (!ex) return;
    ex.sets[setIdx][field] = value;
    DB.saveActive(active);
    // Update badge live
    const status = DB.getProgressionStatus(active.dayId, exId, ex.sets);
    const card = document.getElementById('ex-' + exId);
    if (!card) return;
    const badgeEl = card.querySelector('.badge');
    if (badgeEl && status) {
      const texts = { pr: '↑ PR', same: '→ Same', down: '↓ Drop', new: 'New' };
      const classes = { pr: 'badge-pr', same: 'badge-same', down: 'badge-down', new: 'badge-new' };
      badgeEl.textContent = texts[status];
      badgeEl.className = 'badge ' + (classes[status] || '');
    }
  },

  tickSet(exId, setIdx) {
    const active = DB.getActive();
    if (!active) return;
    const ex = active.exercises.find(e => e.id === exId);
    if (!ex) return;
    const set = ex.sets[setIdx];
    if (!set.load || !set.reps) { App.toast('Enter load and reps first'); return; }
    set.done = !set.done;
    DB.saveActive(active);
    // Update UI for this row
    const row = document.getElementById('set-' + exId + '-' + setIdx);
    if (!row) return;
    row.querySelectorAll('.set-input').forEach(i => i.classList.toggle('done', set.done));
    const btn = row.querySelector('.tick-btn');
    if (btn) btn.classList.toggle('done', set.done);
    if (set.done) {
      App.toast('Set logged');
      this.updateSet(exId, setIdx, 'done', true);
    }
    // Update meta
    const card = document.getElementById('ex-' + exId);
    if (card) {
      const active2 = DB.getActive();
      const ex2 = active2.exercises.find(e => e.id === exId);
      const done = ex2.sets.filter(s => s.done).length;
      const meta = card.querySelector('.card-meta');
      if (meta) meta.textContent = `${ex2.targetSets} sets · ${ex2.reps} reps · ${ex2.rest}s rest · ${done}/${ex2.sets.length} done`;
    }
  },

  addSet(exId) {
    const active = DB.getActive();
    if (!active) return;
    const ex = active.exercises.find(e => e.id === exId);
    if (!ex) return;
    ex.sets.push({ load: '', reps: '', rir: '', done: false });
    DB.saveActive(active);
    this.renderToday();
  },

  finishWorkout() {
    const active = DB.getActive();
    if (!active) return;
    const loggedSets = active.exercises.flatMap(e => e.sets).filter(s => s.done).length;
    if (loggedSets === 0) { App.toast('Log at least one set first'); return; }
    active.finished = Date.now();
    DB.saveSession(active);
    DB.clearActive();
    App.toast('Workout saved!');
    this.renderToday();
    this.renderProgress();
    this.renderDeload();
    this.renderHistory();
  },

  cancelWorkout() {
    if (!confirm('Discard this workout? No data will be saved.')) return;
    DB.clearActive();
    this.renderToday();
  },

  changeWeek() {
    const week = DB.getCurrentWeek();
    App.showModal('Select week', `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:4px">
        ${Array.from({length:12},(_,i)=>i+1).map(w=>`
          <button onclick="DB.setCurrentWeek(${w});App.closeModal();Screens.renderToday()" style="
            padding:14px;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;border:none;
            background:${w===week?'var(--green2)':'var(--bg3)'};
            color:${w===week?'var(--green)':'var(--text2)'};
            border:1.5px solid ${w===week?'var(--green3)':'var(--border)'};
          ">W${w}</button>`).join('')}
      </div>`);
  },

  // ══════════════════════════════════
  // PROGRESS SCREEN
  // ══════════════════════════════════
  renderProgress() {
    const container = document.getElementById('screen-progress');
    const programme = DB.getProgramme();
    const allExercises = programme.flatMap(d => d.exercises);

    const exWithHistory = allExercises.map(ex => {
      const hist = DB.getE1RMHistory(ex.id);
      return { ...ex, hist };
    }).filter(ex => ex.hist.length > 0);

    if (exWithHistory.length === 0) {
      container.innerHTML = `
        <div class="section-header"><div class="section-title">Progress</div></div>
        <div class="empty-state">
          <div class="empty-icon">📈</div>
          <div class="empty-title">No data yet</div>
          <div class="empty-sub">Complete your first workout to see progress charts</div>
        </div>`;
      return;
    }

    let html = `<div class="section-header"><div class="section-title">Progress</div></div>`;

    for (const ex of exWithHistory) {
      const hist = ex.hist;
      const first = hist[0].e1rm;
      const last  = hist[hist.length-1].e1rm;
      const delta = last - first;
      const deltaPct = Math.round((delta / first) * 100);
      const maxE = Math.max(...hist.map(h=>h.e1rm));

      const barClass = (h) => {
        const pct = h.e1rm / maxE;
        if (pct >= 0.97) return 'peak';
        if (pct >= 0.85) return 'hi';
        if (pct >= 0.65) return 'mid';
        return 'lo';
      };

      const displayHist = hist.slice(-8);

      html += `
        <div class="card" onclick="Screens.toggleProgDetail('${ex.id}')">
          <div class="prog-card">
            <div class="prog-name">${ex.name}</div>
            <div class="mini-chart">
              ${displayHist.map(h=>`<div class="mc-bar ${barClass(h)}" style="height:${Math.round((h.e1rm/maxE)*100)}%"></div>`).join('')}
            </div>
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
    if (!el) return;
    el.classList.toggle('open');
  },

  // ══════════════════════════════════
  // DELOAD SCREEN
  // ══════════════════════════════════
  renderDeload() {
    const container = document.getElementById('screen-deload');
    const analysis = DB.getDeloadAnalysis();
    const { fatigueScore, stalled, status, recommendation, totalPrimary, stalledCount } = analysis;
    const week = DB.getCurrentWeek();

    const statusConfig = {
      good:    { dot: 'dot-green', label: 'Readiness: Good to train',      color: 'var(--green)' },
      monitor: { dot: 'dot-amber', label: 'Readiness: Monitor closely',     color: 'var(--amber)' },
      deload:  { dot: 'dot-red',   label: 'Deload recommended',             color: 'var(--red)'   },
    };
    const sc = statusConfig[status];
    const fatigueColor = fatigueScore < 40 ? 'var(--green2)' : fatigueScore < 65 ? '#5a4a0a' : '#5a1a1a';

    container.innerHTML = `
      <div class="section-header"><div class="section-title">Deload AI</div></div>

      <div class="card">
        <div class="pad-card">
          <div class="status-row">
            <div class="status-dot ${sc.dot}"></div>
            <span class="status-label" style="color:${sc.color}">${sc.label}</span>
          </div>
          <div style="font-size:12px;color:var(--text3);margin-bottom:4px">Accumulated fatigue score</div>
          <div class="fatigue-track">
            <div class="fatigue-fill" style="width:${fatigueScore}%;background:${fatigueColor}"></div>
          </div>
          <div class="fatigue-labels"><span>Recovery</span><span>${fatigueScore}/100</span><span>Overreach</span></div>
          <div style="font-size:13px;color:var(--text2);margin-top:10px;line-height:1.5">Week ${week} of 8. ${stalledCount} of ${totalPrimary} tracked exercises showing plateau.</div>
        </div>
      </div>

      ${stalled.length > 0 ? `
      <div class="card">
        <div class="pad-card">
          <div class="status-row">
            <div class="status-dot dot-amber"></div>
            <span class="status-label" style="color:var(--amber)">Stalls detected — ${stalled.length} exercise${stalled.length>1?'s':''}</span>
          </div>
          <div class="stall-list">
            ${stalled.map(s=>`
              <div class="stall-item">
                <span class="stall-name">${s.name}</span>
                <span class="stall-wks">${s.weeks} sessions flat</span>
              </div>`).join('')}
          </div>
          <div class="rec-box">
            <div class="rec-label">Recommendation</div>
            <div class="rec-text">${recommendation}</div>
          </div>
        </div>
      </div>` : `
      <div class="card">
        <div class="pad-card">
          <div class="rec-box">
            <div class="rec-label">Assessment</div>
            <div class="rec-text">${recommendation}</div>
          </div>
        </div>
      </div>`}

      ${status === 'deload' ? `
      <button class="btn-primary" style="background:#5a1a1a;color:var(--red);border:1px solid #7a2a2a" onclick="Screens.triggerDeload()">
        Trigger Deload Week
      </button>` : ''}

      <div class="card">
        <div class="pad-card">
          <div style="font-size:13px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px">Detection logic</div>
          <div class="algo-steps">
            <div class="algo-step"><span class="algo-n">1.</span><span class="algo-t">Calculate e1RM per set using Epley formula: Load × (1 + reps/30)</span></div>
            <div class="algo-step"><span class="algo-n">2.</span><span class="algo-t">Flag exercise if no e1RM improvement over 3+ consecutive sessions (&lt;2% change)</span></div>
            <div class="algo-step"><span class="algo-n">3.</span><span class="algo-t">Track average RIR — drift below target range signals fatigue accumulation</span></div>
            <div class="algo-step"><span class="algo-n">4.</span><span class="algo-t">If 60%+ of primary lifts stall simultaneously, trigger full programme deload</span></div>
            <div class="algo-step"><span class="algo-n">5.</span><span class="algo-t">Deload = −40% load, −40% volume, same movement patterns for 1 week</span></div>
          </div>
        </div>
      </div>
      <div style="height:12px"></div>`;
  },

  triggerDeload() {
    App.showModal('Trigger deload week?', `
      <div class="rec-text" style="margin-bottom:16px;line-height:1.6">This will log Week ${DB.getCurrentWeek()} as a deload. All loads reduced 40%, volume reduced 40% next session.</div>
      <button class="btn-primary" style="background:#5a1a1a;color:var(--red);border:1px solid #7a2a2a" onclick="App.closeModal();App.toast('Deload week activated')">
        Confirm Deload
      </button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  // ══════════════════════════════════
  // HISTORY SCREEN
  // ══════════════════════════════════
  renderHistory() {
    const container = document.getElementById('screen-history');
    const sessions = DB.getSessions();

    if (sessions.length === 0) {
      container.innerHTML = `
        <div class="section-header"><div class="section-title">History</div></div>
        <div class="empty-state">
          <div class="empty-icon">📋</div>
          <div class="empty-title">No sessions yet</div>
          <div class="empty-sub">Completed workouts appear here</div>
        </div>`;
      return;
    }

    let html = `<div class="section-header"><div class="section-title">History</div><div class="pill">${sessions.length} sessions</div></div>`;

    for (const s of sessions) {
      const exercises = s.exercises || [];
      const totalSets = exercises.flatMap(e=>e.sets).filter(s=>s.done).length;
      const totalVol = exercises.flatMap(e=>e.sets).filter(s=>s.done && s.load && s.reps)
        .reduce((sum,s)=>sum + parseFloat(s.load)*parseInt(s.reps), 0);

      html += `
        <div class="card" onclick="Screens.showSessionDetail('${s.id}')">
          <div class="hist-session">
            <div class="hist-date">
              <span>${DB.formatDate(s.date)}</span>
              <span style="font-size:11px;color:var(--text3)">W${s.week}</span>
            </div>
            <div class="hist-day-label" style="color:var(--green);font-size:13px;font-weight:600;margin-bottom:8px">${s.dayLabel}</div>
            <div class="hist-exercises">
              ${exercises.slice(0,3).map(ex => {
                const done = ex.sets.filter(s=>s.done&&s.load&&s.reps);
                const top = done.length > 0 ? done[0] : null;
                return top ? `<div class="hist-ex">
                  <span class="hist-ex-name">${ex.name}</span>
                  <span class="hist-ex-val">${top.load}kg × ${top.reps}</span>
                </div>` : '';
              }).join('')}
              ${exercises.length > 3 ? `<div style="font-size:11px;color:var(--text3)">+${exercises.length-3} more</div>` : ''}
            </div>
            <div class="hist-volume">Total volume: ${Math.round(totalVol).toLocaleString()} kg · ${totalSets} sets</div>
          </div>
        </div>`;
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
        const done = ex.sets.filter(s=>s.done&&s.load&&s.reps);
        if (done.length===0) return '';
        const maxE = Math.max(...done.map(s=>DB.calcE1RM(parseFloat(s.load),parseInt(s.reps))));
        return `
          <div style="margin-bottom:14px">
            <div style="font-size:13px;font-weight:600;color:var(--text);margin-bottom:6px">${ex.name}</div>
            ${done.map((s,i)=>`
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
  renderProgramme() {
    const container = document.getElementById('screen-programme');
    const programme = DB.getProgramme();

    let html = `
      <div class="section-header">
        <div><div class="section-title">Programme</div><div class="section-sub">Tap exercise to edit</div></div>
        <button class="header-btn" onclick="Screens.addDay()">+ Day</button>
      </div>`;

    for (const day of programme) {
      html += `
        <div class="card">
          <div class="programme-day">
            <div class="prog-day-header">
              ${day.label}
              <button class="edit-btn" onclick="Screens.editDayName('${day.id}')">Rename</button>
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

  editExercise(dayId, exId) {
    const programme = DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    const ex = day ? day.exercises.find(e=>e.id===exId) : null;
    if (!ex) return;
    App.showModal(`Edit: ${ex.name}`, `
      <div class="form-group">
        <label class="form-label">Exercise name</label>
        <input class="form-input" id="edit-name" value="${ex.name}">
      </div>
      <div class="form-group">
        <label class="form-label">Target sets</label>
        <input class="form-input" id="edit-sets" type="number" value="${ex.sets}" min="1" max="10">
      </div>
      <div class="form-group">
        <label class="form-label">Rep range</label>
        <input class="form-input" id="edit-reps" value="${ex.reps}" placeholder="e.g. 8–12">
      </div>
      <div class="form-group">
        <label class="form-label">Rest (seconds)</label>
        <input class="form-input" id="edit-rest" type="number" value="${ex.rest}" min="30" max="600" step="10">
      </div>
      <button class="btn-primary" onclick="Screens.saveExercise('${dayId}','${exId}')">Save</button>
      <button class="btn-secondary" style="color:var(--red);border-color:#5a1a1a" onclick="Screens.deleteExercise('${dayId}','${exId}')">Delete exercise</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  saveExercise(dayId, exId) {
    const programme = DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    const ex = day ? day.exercises.find(e=>e.id===exId) : null;
    if (!ex) return;
    ex.name = document.getElementById('edit-name').value.trim() || ex.name;
    ex.sets = parseInt(document.getElementById('edit-sets').value) || ex.sets;
    ex.reps = document.getElementById('edit-reps').value.trim() || ex.reps;
    ex.rest = parseInt(document.getElementById('edit-rest').value) || ex.rest;
    DB.saveProgramme(programme);
    App.closeModal();
    this.renderProgramme();
    App.toast('Exercise updated');
  },

  deleteExercise(dayId, exId) {
    if (!confirm('Delete this exercise?')) return;
    const programme = DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    if (!day) return;
    day.exercises = day.exercises.filter(e=>e.id!==exId);
    DB.saveProgramme(programme);
    App.closeModal();
    this.renderProgramme();
    App.toast('Exercise deleted');
  },

  addExercise(dayId) {
    App.showModal('Add exercise', `
      <div class="form-group">
        <label class="form-label">Exercise name</label>
        <input class="form-input" id="new-ex-name" placeholder="e.g. Incline DB Press">
      </div>
      <div class="form-group">
        <label class="form-label">Target sets</label>
        <input class="form-input" id="new-ex-sets" type="number" value="3" min="1" max="10">
      </div>
      <div class="form-group">
        <label class="form-label">Rep range</label>
        <input class="form-input" id="new-ex-reps" value="8–12">
      </div>
      <div class="form-group">
        <label class="form-label">Rest (seconds)</label>
        <input class="form-input" id="new-ex-rest" type="number" value="180" min="30" max="600" step="10">
      </div>
      <button class="btn-primary" onclick="Screens.confirmAddExercise('${dayId}')">Add Exercise</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  confirmAddExercise(dayId) {
    const name = document.getElementById('new-ex-name').value.trim();
    if (!name) { App.toast('Enter exercise name'); return; }
    const programme = DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    if (!day) return;
    day.exercises.push({
      id: DB.newId(),
      name,
      sets: parseInt(document.getElementById('new-ex-sets').value) || 3,
      reps: document.getElementById('new-ex-reps').value.trim() || '8–12',
      rir: '1–2',
      rest: parseInt(document.getElementById('new-ex-rest').value) || 180,
    });
    DB.saveProgramme(programme);
    App.closeModal();
    this.renderProgramme();
    App.toast('Exercise added');
  },

  editDayName(dayId) {
    const programme = DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    if (!day) return;
    App.showModal('Rename day', `
      <div class="form-group">
        <label class="form-label">Day label</label>
        <input class="form-input" id="new-day-name" value="${day.label}">
      </div>
      <button class="btn-primary" onclick="Screens.saveDayName('${dayId}')">Save</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  saveDayName(dayId) {
    const name = document.getElementById('new-day-name').value.trim();
    if (!name) return;
    const programme = DB.getProgramme();
    const day = programme.find(d=>d.id===dayId);
    if (!day) return;
    day.label = name;
    DB.saveProgramme(programme);
    App.closeModal();
    this.renderProgramme();
    App.toast('Day renamed');
  },

  addDay() {
    App.showModal('Add training day', `
      <div class="form-group">
        <label class="form-label">Day label</label>
        <input class="form-input" id="new-day-label" placeholder="e.g. Day 6 — Arms">
      </div>
      <button class="btn-primary" onclick="Screens.confirmAddDay()">Add Day</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  confirmAddDay() {
    const label = document.getElementById('new-day-label').value.trim();
    if (!label) { App.toast('Enter a day label'); return; }
    const programme = DB.getProgramme();
    programme.push({ id: DB.newId(), label, type: 'upper', exercises: [] });
    DB.saveProgramme(programme);
    App.closeModal();
    this.renderProgramme();
    App.toast('Day added');
  },
};
