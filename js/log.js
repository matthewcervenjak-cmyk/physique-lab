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

    // Get most recent SAVED session for this day from any prior week
    const prevSession = this._getPrevSession(week, day.id);

    let html = `<div class="day-body">`;

    for (const ex of session.exercises) {
      const prevEx = prevSession ? (prevSession.exercises||[]).find(e=>e.id===ex.id) : null;
      const prevSets = prevEx ? (prevEx.sets||[]).filter(s=>s.load&&s.reps) : [];
      const prevBest = prevSets.length ? Math.max(...prevSets.map(s=>DB.calcE1RM(s.load,s.reps))) : null;
      const prevWeekNum = prevSession ? prevSession.week : null;

      const curSets = (ex.sets||[]).filter(s=>s.load&&s.reps);
      const curBest = curSets.length ? Math.max(...curSets.map(s=>DB.calcE1RM(s.load,s.reps))) : null;

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
          <div class="log-col-heads">
            <div class="lch">Set</div>
            <div class="lch">Load kg</div>
            <div class="lch">Reps</div>
            <div class="lch">RIR</div>
            <div class="lch">e1RM</div>
          </div>
          ${ex.sets.map((set,i) => this._renderSetRow(day.id, ex.id, ex, set, i, prevSets)).join('')}
          ${prevBest ? `<div class="prev-compare">W${prevWeekNum} best e1RM: <strong>${prevBest}kg</strong> &nbsp;·&nbsp; grey = last saved</div>` : '<div class="prev-compare" style="color:var(--text3)">No prior data — enter your numbers</div>'}
        </div>`;
    }

    html += `
      <button class="log-save-btn" onclick="Log.saveSession('${day.id}')">
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1.5 7L4.5 10L11.5 3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Save Week ${week} · ${day.label}
      </button>
      <button class="log-clear-btn" onclick="Log.clearSession('${day.id}')">Clear session</button>
    </div>`;

    return html;
  },

  _renderSetRow(dayId, exId, ex, set, i, prevSets) {
    const load = set.load || '';
    const reps = set.reps || '';
    const rir  = set.rir  || '';
    const e1rm = (load && reps) ? DB.calcE1RM(load, reps) : '';
    const prevLoad = prevSets[i] ? prevSets[i].load : '';
    const prevReps = prevSets[i] ? prevSets[i].reps : '';
    const prevRir  = prevSets[i] ? (prevSets[i].rir || '') : '';
    // Show prev e1RM as placeholder in last column when current row is empty
    const prevE1rm = (prevLoad && prevReps) ? DB.calcE1RM(prevLoad, prevReps) : '';
    const repTarget = (ex.setReps && ex.setReps[i]) ? ex.setReps[i] : ex.reps;
    const isEachSide = load && /[eE]$/.test(String(load).trim());
    const resolvedLoadKg = isEachSide ? DB.resolveLoad(load) : null;
    const e1rmInner = e1rm
      ? (isEachSide ? `${e1rm}<span class="e1rm-each-hint">${resolvedLoadKg}kg</span>` : `${e1rm}`)
      : (prevE1rm ? prevE1rm : '—');

    return `
      <div class="log-set-row ${set.done?'set-done':''}" id="logset-${dayId}-${exId}-${i}">
        <div class="log-set-num">${i+1}<div class="set-rep-target">${repTarget}</div></div>
        <input class="log-input ${set.done?'done':''} ${(!load && prevLoad)?'has-prev':''}" type="text" inputmode="decimal"
          placeholder="${prevLoad||''}" value="${load}"
          oninput="Log.onInput('${dayId}','${exId}',${i},'load',this.value)"
          autocomplete="off" autocorrect="off" spellcheck="false">
        <input class="log-input ${set.done?'done':''} ${(!reps && prevReps)?'has-prev':''}" type="text" inputmode="text"
          placeholder="${prevReps||''}" value="${reps}"
          oninput="Log.onInput('${dayId}','${exId}',${i},'reps',this.value)"
          autocomplete="off" autocorrect="off" spellcheck="false">
        <input class="log-input ${set.done?'done':''} ${(!rir && prevRir)?'has-prev':''}" type="number" inputmode="decimal"
          placeholder="${prevRir||'—'}" value="${rir}"
          oninput="Log.onInput('${dayId}','${exId}',${i},'rir',this.value)"
          step="0.5" min="0" max="10">
        <div class="log-e1rm ${!e1rm && prevE1rm ? 'prev-val' : ''}">${e1rmInner}</div>
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
    const e1rm = (set.load && set.reps) ? DB.calcE1RM(set.load, set.reps) : '';
    const rowEl = document.getElementById(`logset-${dayId}-${exId}-${setIdx}`);
    if (rowEl) {
      const e1rmEl = rowEl.querySelector('.log-e1rm');
      if (e1rmEl) {
        const isEachSide = set.load && /[eE]$/.test(String(set.load).trim());
        const resolvedKg = isEachSide ? DB.resolveLoad(set.load) : null;
        e1rmEl.innerHTML = e1rm
          ? (isEachSide ? `${e1rm}<span class="e1rm-each-hint">${resolvedKg}kg</span>` : `${e1rm}`)
          : '—';
      }
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
    const curBest = curSets.length ? Math.max(...curSets.map(s=>DB.calcE1RM(s.load,s.reps))) : null;
    const prevSession = this._getPrevSession(week, dayId);
    const prevEx = prevSession ? (prevSession.exercises||[]).find(e=>e.id===exId) : null;
    const prevSets = prevEx ? (prevEx.sets||[]).filter(s=>s.load&&s.reps) : [];
    const prevBest = prevSets.length ? Math.max(...prevSets.map(s=>DB.calcE1RM(s.load,s.reps))) : null;
    const block = document.getElementById(`exblock-${dayId}-${exId}`);
    if (!block || !curBest || !prevBest) return;
    const badge = block.querySelector('.ex-block-header .badge');
    if (!badge) return;
    if (curBest > prevBest*1.005)      { badge.className='badge badge-pr'; badge.textContent='↑ PR'; }
    else if (curBest < prevBest*0.99)  { badge.className='badge badge-down'; badge.textContent='↓'; }
    else                                { badge.className='badge badge-same'; badge.textContent='→'; }
  },

  _hasData(session) {
    return (session.exercises || []).some(ex =>
      (ex.sets || []).some(s => s.load && s.reps)
    );
  },

  async _autoSave(dayId) {
    const key = `w${this._currentWeek}_${dayId}`;
    const session = this._sessions[key];
    if (!session) return;
    if (this._hasData(session)) {
      session.saved = true;
      await DB.saveWeekDaySession(session);
    } else {
      session.saved = false;
      await DB.deleteWeekDaySession(session);
    }
    // Update the day card badge silently
    const card = document.getElementById('daycard-' + dayId);
    if (card) {
      const loggedSets = session.exercises.flatMap(e=>e.sets||[]).filter(s=>s.load&&s.reps).length;
      const badge = card.querySelector('.day-card-right .badge');
      if (badge) {
        if (loggedSets > 0) { badge.className='badge badge-pr'; badge.textContent=loggedSets; }
        else { badge.className='badge badge-same'; badge.textContent='—'; }
      }
    }
    Screens.renderProgress();
    Screens.renderDeload();
  },

  async saveSession(dayId) {
    const key = `w${this._currentWeek}_${dayId}`;
    const session = this._sessions[key];
    if (!session) return;
    if (this._hasData(session)) {
      session.saved = true;
      session.finished = Date.now();
      await DB.saveWeekDaySession(session);
      App.toast('Saved · W'+this._currentWeek+' '+session.dayLabel);
    } else {
      session.saved = false;
      await DB.deleteWeekDaySession(session);
      App.toast('Cleared · W'+this._currentWeek+' '+session.dayLabel);
    }
    Screens.renderProgress();
    Screens.renderDeload();
  },

  async clearSession(dayId) {
    if (!confirm('Clear all logged data for this session?')) return;
    const key = `w${this._currentWeek}_${dayId}`;
    const session = this._sessions[key];
    if (!session) return;
    for (const ex of session.exercises) {
      for (const set of ex.sets) {
        set.load = ''; set.reps = ''; set.rir = ''; set.done = false;
      }
    }
    session.saved = false;
    await DB.deleteWeekDaySession(session);
    const dayList = document.getElementById('day-list');
    if (dayList) dayList.innerHTML = this._renderDayList(this._currentWeek);
    Screens.renderProgress();
    Screens.renderDeload();
    App.toast('Session cleared');
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
