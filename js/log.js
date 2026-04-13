// ══════════════════════════════════════════════════════
//  LOG SCREEN — Spreadsheet-style week/day navigator
// ══════════════════════════════════════════════════════

const Log = {
  _currentWeek: 1,
  _openDayId: null,
  _sessions: {},   // cache: weekDayKey -> session object
  _saveTimers: {}, // per-exercise debounce timers
  _programme: null,

  // ── Entry point ──
  async render() {
    const container = document.getElementById('screen-log');
    container.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;
    this._programme = await DB.getProgramme();
    this._currentWeek = DB.getCurrentWeek();
    this._buildScreen(container);
  },

  _buildScreen(container) {
    const w = this._currentWeek;
    const totalWeeks = 12;

    container.innerHTML = `
      <!-- Week strip -->
      <div class="week-strip-wrap">
        <div class="week-strip" id="week-strip">
          ${Array.from({length: totalWeeks}, (_,i) => i+1).map(n => `
            <button class="week-tab ${n===w?'active':''}" onclick="Log.switchWeek(${n})">${n===w?'Week '+n:'W'+n}</button>
          `).join('')}
        </div>
      </div>

      <!-- Day list for this week -->
      <div class="day-list" id="day-list">
        ${this._renderDayList(w)}
      </div>`;

    // Scroll active week tab into view
    requestAnimationFrame(() => {
      const activeTab = document.querySelector('.week-tab.active');
      if (activeTab) activeTab.scrollIntoView({ inline: 'center', behavior: 'smooth' });
    });
  },

  _renderDayList(week) {
    return this._programme.map(day => {
      const key = `w${week}_${day.id}`;
      const session = this._sessions[key] || DB.getWeekDaySession(week, day.id);
      const loggedSets = session ? (session.exercises||[]).flatMap(e=>e.sets||[]).filter(s=>s.load&&s.reps).length : 0;
      const isOpen = this._openDayId === day.id;

      return `
        <div class="day-card ${isOpen?'open':''}" id="daycard-${day.id}">
          <div class="day-card-header" onclick="Log.toggleDay('${day.id}')">
            <div class="day-card-left">
              <div class="day-card-name">${day.label}</div>
              <div class="day-card-meta">${day.exercises.length} exercises${loggedSets>0?' · '+loggedSets+' sets logged':''}</div>
            </div>
            <div class="day-card-right">
              ${loggedSets > 0 ? `<span class="badge badge-pr">${loggedSets}</span>` : `<span class="badge badge-same">—</span>`}
              <svg class="day-chevron" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </div>
          ${isOpen ? this._renderDayBody(day, week) : ''}
        </div>`;
    }).join('');
  },

  _renderDayBody(day, week) {
    const key = `w${week}_${day.id}`;
    let session = this._sessions[key];
    if (!session) {
      session = DB.getWeekDaySessionSync(week, day.id, this._programme);
      this._sessions[key] = session;
    }

    let html = `<div class="day-body">`;

    for (const ex of session.exercises) {
      // Get previous week's data for comparison
      const prevSession = this._getPrevSession(week, day.id);
      const prevEx = prevSession ? (prevSession.exercises||[]).find(e=>e.id===ex.id) : null;
      const prevSets = prevEx ? (prevEx.sets||[]).filter(s=>s.load&&s.reps) : [];
      const prevBest = prevSets.length ? Math.max(...prevSets.map(s=>DB.calcE1RM(parseFloat(s.load),parseInt(s.reps)))) : null;

      // Current best e1RM
      const curSets = (ex.sets||[]).filter(s=>s.load&&s.reps);
      const curBest = curSets.length ? Math.max(...curSets.map(s=>DB.calcE1RM(parseFloat(s.load),parseInt(s.reps)))) : null;

      let trendBadge = '';
      if (curBest && prevBest) {
        if (curBest > prevBest*1.005) trendBadge = '<span class="badge badge-pr" style="font-size:10px">↑ PR</span>';
        else if (curBest < prevBest*0.99) trendBadge = '<span class="badge badge-down" style="font-size:10px">↓</span>';
        else trendBadge = '<span class="badge badge-same" style="font-size:10px">→</span>';
      }

      html += `
        <div class="ex-block" id="exblock-${day.id}-${ex.id}">
          <div class="ex-block-header">
            <div>
              <div class="ex-block-name">${ex.name}</div>
              <div class="ex-block-meta">${ex.targetSets} sets · ${ex.reps} · ${ex.rest}s rest</div>
            </div>
            ${trendBadge}
          </div>

          <!-- Column headers -->
          <div class="log-col-heads">
            <div class="lch">Set</div>
            <div class="lch">Load kg</div>
            <div class="lch">Reps</div>
            <div class="lch">RIR</div>
            <div class="lch">e1RM</div>
          </div>

          <!-- Set rows -->
          ${ex.sets.map((set,i) => this._renderSetRow(day.id, ex.id, ex, set, i, prevSets)).join('')}

          <button class="log-add-set" onclick="Log.addSet('${day.id}','${ex.id}')">+ set</button>

          ${prevBest ? `<div class="prev-compare">Prev best e1RM: <strong>${prevBest}kg</strong></div>` : ''}
        </div>`;
    }

    html += `
      <button class="log-save-btn" onclick="Log.saveSession('${day.id}')">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 7L4.5 10L11.5 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Save Week ${week} · ${day.label}
      </button>
    </div>`;

    return html;
  },

  _renderSetRow(dayId, exId, ex, set, i, prevSets) {
    const load = set.load || '';
    const reps = set.reps || '';
    const rir  = set.rir  || '';
    const e1rm = (load && reps) ? DB.calcE1RM(parseFloat(load), parseInt(reps)) : '';
    const prevLoad = prevSets[i] ? prevSets[i].load : '';
    const prevReps = prevSets[i] ? prevSets[i].reps : '';
    const prevRir  = prevSets[i] ? (prevSets[i].rir || '') : '';
    // Show prev e1RM as placeholder in last column when current row is empty
    const prevE1rm = (prevLoad && prevReps) ? DB.calcE1RM(parseFloat(prevLoad), parseInt(prevReps)) : '';

    return `
      <div class="log-set-row ${set.done?'set-done':''}" id="logset-${dayId}-${exId}-${i}">
        <div class="log-set-num">${i+1}</div>
        <input class="log-input ${set.done?'done':''} ${(!load && prevLoad)?'has-prev':''}" type="number" inputmode="decimal"
          placeholder="${prevLoad||''}" value="${load}"
          oninput="Log.onInput('${dayId}','${exId}',${i},'load',this.value)"
          step="0.5" min="0">
        <input class="log-input ${set.done?'done':''} ${(!reps && prevReps)?'has-prev':''}" type="number" inputmode="numeric"
          placeholder="${prevReps||''}" value="${reps}"
          oninput="Log.onInput('${dayId}','${exId}',${i},'reps',this.value)"
          min="1" max="200">
        <input class="log-input ${set.done?'done':''} ${(!rir && prevRir)?'has-prev':''}" type="number" inputmode="decimal"
          placeholder="${prevRir||'—'}" value="${rir}"
          oninput="Log.onInput('${dayId}','${exId}',${i},'rir',this.value)"
          step="0.5" min="0" max="10">
        <div class="log-e1rm ${!e1rm && prevE1rm ? 'prev-val' : ''}">${e1rm || (prevE1rm ? prevE1rm : '—')}</div>
      </div>`;
  },

  // ── INTERACTIONS ──

  switchWeek(week) {
    this._currentWeek = week;
    DB.setCurrentWeek(week);
    this._openDayId = null;
    this._sessions = {}; // clear cache so fresh data loads
    const container = document.getElementById('screen-log');
    this._buildScreen(container);
    // Update header week button
    App._renderScreen('log');
  },

  toggleDay(dayId) {
    if (this._openDayId === dayId) {
      this._openDayId = null;
    } else {
      this._openDayId = dayId;
    }
    const dayList = document.getElementById('day-list');
    if (dayList) dayList.innerHTML = this._renderDayList(this._currentWeek);
    // Scroll the opened card into view
    requestAnimationFrame(() => {
      const card = document.getElementById('daycard-' + dayId);
      if (card && this._openDayId === dayId) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  },

  onInput(dayId, exId, setIdx, field, value) {
    const week = this._currentWeek;
    const key = `w${week}_${dayId}`;
    const session = this._sessions[key];
    if (!session) return;
    const ex = session.exercises.find(e=>e.id===exId);
    if (!ex) return;
    ex.sets[setIdx][field] = value;

    // Update e1RM display live
    const set = ex.sets[setIdx];
    const e1rm = (set.load && set.reps) ? DB.calcE1RM(parseFloat(set.load), parseInt(set.reps)) : '';
    const rowEl = document.getElementById(`logset-${dayId}-${exId}-${setIdx}`);
    if (rowEl) {
      const e1rmEl = rowEl.querySelector('.log-e1rm');
      if (e1rmEl) e1rmEl.textContent = e1rm || '—';
    }

    // Update trend badge
    this._updateTrendBadge(dayId, exId, ex, week);

    // Debounced auto-save
    const timerKey = key + '_' + exId;
    clearTimeout(this._saveTimers[timerKey]);
    this._saveTimers[timerKey] = setTimeout(() => this._autoSave(dayId), 1200);
  },

  _updateTrendBadge(dayId, exId, ex, week) {
    const curSets = (ex.sets||[]).filter(s=>s.load&&s.reps);
    const curBest = curSets.length ? Math.max(...curSets.map(s=>DB.calcE1RM(parseFloat(s.load),parseInt(s.reps)))) : null;
    const prevSession = this._getPrevSession(week, dayId);
    const prevEx = prevSession ? (prevSession.exercises||[]).find(e=>e.id===exId) : null;
    const prevSets = prevEx ? (prevEx.sets||[]).filter(s=>s.load&&s.reps) : [];
    const prevBest = prevSets.length ? Math.max(...prevSets.map(s=>DB.calcE1RM(parseFloat(s.load),parseInt(s.reps)))) : null;
    const block = document.getElementById(`exblock-${dayId}-${exId}`);
    if (!block || !curBest || !prevBest) return;
    const badge = block.querySelector('.ex-block-header .badge');
    if (!badge) return;
    if (curBest > prevBest*1.005)      { badge.className='badge badge-pr'; badge.textContent='↑ PR'; }
    else if (curBest < prevBest*0.99)  { badge.className='badge badge-down'; badge.textContent='↓'; }
    else                                { badge.className='badge badge-same'; badge.textContent='→'; }
  },

  addSet(dayId, exId) {
    const key = `w${this._currentWeek}_${dayId}`;
    const session = this._sessions[key];
    if (!session) return;
    const ex = session.exercises.find(e=>e.id===exId);
    if (!ex) return;
    ex.sets.push({ load:'', reps:'', rir:'', done:false });
    // Re-render the set list within this exercise block
    const block = document.getElementById(`exblock-${dayId}-${exId}`);
    if (!block) return;
    const prevSession = this._getPrevSession(this._currentWeek, dayId);
    const prevEx = prevSession ? (prevSession.exercises||[]).find(e=>e.id===exId) : null;
    const prevSets = prevEx ? (prevEx.sets||[]).filter(s=>s.load&&s.reps) : [];
    // Replace rows + add-set button
    const rows = block.querySelectorAll('.log-set-row, .log-add-set');
    rows.forEach(r => r.remove());
    const refEl = block.querySelector('.prev-compare') || block.querySelector('.log-save-btn');
    ex.sets.forEach((set,i) => {
      const div = document.createElement('div');
      div.outerHTML; // trick
      const tmp = document.createElement('template');
      tmp.innerHTML = this._renderSetRow(dayId, exId, ex, set, i, prevSets);
      block.insertBefore(tmp.content.firstChild, refEl || null);
    });
    // Re-insert add-set button
    const addBtn = document.createElement('button');
    addBtn.className = 'log-add-set';
    addBtn.textContent = '+ set';
    addBtn.onclick = () => Log.addSet(dayId, exId);
    block.insertBefore(addBtn, refEl || null);
  },

  async _autoSave(dayId) {
    const key = `w${this._currentWeek}_${dayId}`;
    const session = this._sessions[key];
    if (!session) return;
    session.saved = true;
    await DB.saveWeekDaySession(session);
    // Update the day card badge silently
    const card = document.getElementById('daycard-' + dayId);
    if (card) {
      const loggedSets = session.exercises.flatMap(e=>e.sets||[]).filter(s=>s.load&&s.reps).length;
      const badge = card.querySelector('.day-card-right .badge');
      if (badge && loggedSets > 0) { badge.className='badge badge-pr'; badge.textContent=loggedSets; }
    }
  },

  async saveSession(dayId) {
    const key = `w${this._currentWeek}_${dayId}`;
    const session = this._sessions[key];
    if (!session) return;
    session.saved = true;
    session.finished = Date.now();
    await DB.saveWeekDaySession(session);
    App.toast('Saved · W'+this._currentWeek+' '+session.dayLabel);
    Screens.renderProgress();
    Screens.renderDeload();
  },

  _getPrevSession(week, dayId) {
    // Find highest week < current with data for this dayId
    const sessions = DB.getSessions();
    const prev = sessions
      .filter(s => s.dayId === dayId && s.week < week && s.saved)
      .sort((a,b) => b.week - a.week)[0];
    return prev || null;
  },
};
