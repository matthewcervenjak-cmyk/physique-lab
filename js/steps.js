// ══════════════════════════════════════════════════════
//  STEPS SCREEN — Daily step tracker
// ══════════════════════════════════════════════════════

const Steps = {
  GOAL_KEY: 'steps_goal',
  DATA_KEY: 'steps_data',
  DEFAULT_GOAL: 10000,

  // ── DATA ──
  getGoal() { return LOCAL.get(this.GOAL_KEY, this.DEFAULT_GOAL); },
  async setGoal(val) {
    LOCAL.set(this.GOAL_KEY, val);
    SB.upsert('steps_meta', { profile: CURRENT_PROFILE, goal: val, updated_at: new Date().toISOString() });
  },

  getData() { return LOCAL.get(this.DATA_KEY, {}); },
  async saveData(data) {
    LOCAL.set(this.DATA_KEY, data);
    // Store as a single JSON blob in Supabase
    SB.upsert('steps_data', { profile: CURRENT_PROFILE, data, updated_at: new Date().toISOString() });
  },

  todayKey() { return new Date().toISOString().split('T')[0]; },

  getStepsForDate(dateKey) {
    return this.getData()[dateKey] || null;
  },

  async setStepsForDate(dateKey, steps) {
    const data = this.getData();
    data[dateKey] = steps;
    await this.saveData(data);
  },

  // Sync from Supabase at login
  async syncFromCloud() {
    try {
      const meta = await SB.get('steps_meta', { profile: CURRENT_PROFILE });
      if (meta?.goal) LOCAL.set(this.GOAL_KEY, meta.goal);
      const stepsData = await SB.get('steps_data', { profile: CURRENT_PROFILE });
      if (stepsData?.data) LOCAL.set(this.DATA_KEY, stepsData.data);
    } catch(e) {}
  },

  // ── COMPUTED STATS ──
  getStats() {
    const data = this.getData();
    const goal = this.getGoal();
    const entries = Object.entries(data)
      .filter(([,v]) => v > 0)
      .sort(([a],[b]) => a.localeCompare(b));

    if (!entries.length) return { avg: 0, best: 0, streak: 0, weeklyAvg: 0, goalHitRate: 0, total: 0, entries };

    const values = entries.map(([,v]) => v);
    const avg  = Math.round(values.reduce((a,b)=>a+b,0) / values.length);
    const best = Math.max(...values);
    const total = values.reduce((a,b)=>a+b,0);
    const goalHits = values.filter(v => v >= goal).length;
    const goalHitRate = Math.round((goalHits / values.length) * 100);

    // Current streak — consecutive days up to today meeting goal
    let streak = 0;
    const today = this.todayKey();
    let check = new Date(today);
    while (true) {
      const key = check.toISOString().split('T')[0];
      const val = data[key];
      if (val && val >= goal) { streak++; check.setDate(check.getDate()-1); }
      else break;
    }

    // 7-day avg
    const last7 = [];
    for (let i=0; i<7; i++) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const k = d.toISOString().split('T')[0];
      if (data[k]) last7.push(data[k]);
    }
    const weeklyAvg = last7.length ? Math.round(last7.reduce((a,b)=>a+b,0)/last7.length) : 0;

    return { avg, best, streak, weeklyAvg, goalHitRate, total, entries };
  },

  // ── RENDER ──
  async render() {
    const container = document.getElementById('screen-steps');
    container.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;
    await this.syncFromCloud();
    this._buildScreen(container);
  },

  _buildScreen(container) {
    const goal = this.getGoal();
    const today = this.todayKey();
    const todaySteps = this.getStepsForDate(today) || '';
    const stats = this.getStats();
    const pct = todaySteps ? Math.min(100, Math.round((todaySteps / goal) * 100)) : 0;
    const met = todaySteps >= goal;

    // Last 14 days for mini chart
    const last14 = [];
    for (let i=13; i>=0; i--) {
      const d = new Date(); d.setDate(d.getDate()-i);
      const k = d.toISOString().split('T')[0];
      const label = i===0 ? 'Today' : i===1 ? 'Yest' : d.toLocaleDateString('en-AU',{weekday:'short'});
      last14.push({ key: k, label, steps: this.getData()[k] || 0 });
    }
    const maxSteps = Math.max(...last14.map(d=>d.steps), goal);

    container.innerHTML = `
      <!-- Today input -->
      <div class="steps-hero">
        <div class="steps-hero-label">Today's steps</div>
        <div class="steps-input-wrap">
          <input class="steps-big-input" type="number" inputmode="numeric"
            id="steps-today-input"
            placeholder="0"
            value="${todaySteps}"
            min="0" max="99999"
            oninput="Steps._onTodayInput(this.value)">
          <div class="steps-unit">steps</div>
        </div>
        <!-- Progress ring / bar -->
        <div class="steps-progress-track">
          <div class="steps-progress-fill ${met?'met':''}" style="width:${pct}%"></div>
        </div>
        <div class="steps-progress-label">
          <span>${todaySteps ? parseInt(todaySteps).toLocaleString() : '0'} / ${parseInt(goal).toLocaleString()} goal</span>
          <span class="${met?'steps-met-badge':''}">${met ? '🎯 Goal met!' : pct + '%'}</span>
        </div>
        <button class="steps-log-btn" onclick="Steps._logToday()">Log today's steps</button>
      </div>

      <!-- Stats row -->
      <div class="steps-stats-grid">
        <div class="steps-stat">
          <div class="steps-stat-val">${stats.streak}</div>
          <div class="steps-stat-lbl">Day streak</div>
        </div>
        <div class="steps-stat">
          <div class="steps-stat-val">${stats.weeklyAvg > 0 ? parseInt(stats.weeklyAvg).toLocaleString() : '—'}</div>
          <div class="steps-stat-lbl">7-day avg</div>
        </div>
        <div class="steps-stat">
          <div class="steps-stat-val">${stats.goalHitRate > 0 ? stats.goalHitRate+'%' : '—'}</div>
          <div class="steps-stat-lbl">Goal rate</div>
        </div>
        <div class="steps-stat">
          <div class="steps-stat-val">${stats.best > 0 ? parseInt(stats.best).toLocaleString() : '—'}</div>
          <div class="steps-stat-lbl">Best day</div>
        </div>
      </div>

      <!-- 14-day bar chart -->
      <div class="card" style="padding:14px">
        <div class="steps-chart-label">Last 14 days</div>
        <div class="steps-chart">
          ${last14.map(d => {
            const barPct = d.steps ? Math.max(4, Math.round((d.steps/maxSteps)*100)) : 0;
            const isToday = d.key === today;
            const metGoal = d.steps >= goal;
            return `
              <div class="steps-bar-wrap">
                <div class="steps-bar-track">
                  <div class="steps-bar ${isToday?'today':''} ${metGoal?'met':''}" style="height:${barPct}%"
                    title="${d.steps.toLocaleString()} steps"></div>
                  <!-- Goal line marker -->
                  <div class="steps-goal-line" style="bottom:${Math.round((goal/maxSteps)*100)}%"></div>
                </div>
                <div class="steps-bar-label ${isToday?'today':''}">${d.label}</div>
              </div>`;
          }).join('')}
        </div>
        <div class="steps-chart-legend">
          <span class="legend-dot goal-dot"></span><span>Goal (${parseInt(goal).toLocaleString()})</span>
        </div>
      </div>

      <!-- Goal setting -->
      <div class="card">
        <div class="pad-card">
          <div class="steps-section-title">Daily goal</div>
          <div class="steps-goal-row">
            <input class="form-input" type="number" inputmode="numeric" id="steps-goal-input"
              value="${goal}" min="1000" max="50000" step="500"
              style="flex:1;font-size:16px">
            <button class="steps-set-goal-btn" onclick="Steps._setGoal()">Set</button>
          </div>
          <div class="steps-goal-presets">
            ${[7500, 10000, 12000, 15000].map(g=>`
              <button class="steps-preset ${g===goal?'active':''}" onclick="Steps._applyPreset(${g})">${(g/1000).toFixed(g%1000?1:0)}k</button>
            `).join('')}
          </div>
        </div>
      </div>

      <!-- Manual past-date entry -->
      <div class="card">
        <div class="pad-card">
          <div class="steps-section-title">Log a past date</div>
          <div class="steps-past-row">
            <input class="form-input" type="date" id="steps-past-date"
              value="${today}" max="${today}" style="flex:1">
            <input class="form-input" type="number" inputmode="numeric" id="steps-past-count"
              placeholder="steps" min="0" max="99999" style="width:110px">
            <button class="steps-set-goal-btn" onclick="Steps._logPast()">Log</button>
          </div>
        </div>
      </div>

      <!-- History list -->
      ${stats.entries.length > 0 ? `
      <div class="card">
        <div class="pad-card">
          <div class="steps-section-title">History</div>
          <div class="steps-history-list">
            ${stats.entries.slice().reverse().slice(0,30).map(([date, steps]) => {
              const met = steps >= goal;
              const d = new Date(date + 'T00:00:00');
              const label = d.toLocaleDateString('en-AU', { weekday:'short', day:'numeric', month:'short' });
              const pct = Math.min(100, Math.round((steps/goal)*100));
              return `
                <div class="steps-hist-row">
                  <div class="steps-hist-date">${label}</div>
                  <div class="steps-hist-bar-wrap">
                    <div class="steps-hist-bar ${met?'met':''}" style="width:${pct}%"></div>
                  </div>
                  <div class="steps-hist-val ${met?'met-text':''}">${parseInt(steps).toLocaleString()}</div>
                  <button class="steps-hist-edit" onclick="Steps._editEntry('${date}',${steps})">✎</button>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>` : ''}

      <div style="height:16px"></div>`;
  },

  _todayInputTimer: null,
  _onTodayInput(value) {
    const goal = this.getGoal();
    const steps = parseInt(value) || 0;
    const pct = Math.min(100, Math.round((steps / goal) * 100));
    const met = steps >= goal;
    const fill = document.querySelector('.steps-progress-fill');
    const label = document.querySelector('.steps-progress-label');
    if (fill) { fill.style.width = pct + '%'; fill.classList.toggle('met', met); }
    if (label) label.innerHTML = `<span>${steps.toLocaleString()} / ${parseInt(goal).toLocaleString()} goal</span><span class="${met?'steps-met-badge':''}">${met ? '🎯 Goal met!' : pct + '%'}</span>`;
  },

  async _logToday() {
    const val = document.getElementById('steps-today-input')?.value;
    const steps = parseInt(val);
    if (!steps || steps < 0) { App.toast('Enter a valid step count'); return; }
    await this.setStepsForDate(this.todayKey(), steps);
    App.toast('Steps logged!');
    this._buildScreen(document.getElementById('screen-steps'));
  },

  async _setGoal() {
    const val = parseInt(document.getElementById('steps-goal-input')?.value);
    if (!val || val < 100) { App.toast('Enter a valid goal'); return; }
    await this.setGoal(val);
    App.toast('Goal updated to ' + val.toLocaleString());
    this._buildScreen(document.getElementById('screen-steps'));
  },

  async _applyPreset(val) {
    await this.setGoal(val);
    App.toast('Goal set to ' + val.toLocaleString());
    this._buildScreen(document.getElementById('screen-steps'));
  },

  async _logPast() {
    const date  = document.getElementById('steps-past-date')?.value;
    const steps = parseInt(document.getElementById('steps-past-count')?.value);
    if (!date)  { App.toast('Select a date'); return; }
    if (!steps || steps < 0) { App.toast('Enter a valid step count'); return; }
    await this.setStepsForDate(date, steps);
    App.toast('Logged ' + steps.toLocaleString() + ' steps');
    this._buildScreen(document.getElementById('screen-steps'));
  },

  _editEntry(date, currentSteps) {
    App.showModal('Edit steps — ' + new Date(date+'T00:00:00').toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long'}), `
      <div class="form-group">
        <label class="form-label">Steps</label>
        <input class="form-input" type="number" inputmode="numeric" id="edit-steps-val"
          value="${currentSteps}" min="0" max="99999" style="font-size:20px;text-align:center">
      </div>
      <button class="btn-primary" onclick="Steps._saveEditedEntry('${date}')">Save</button>
      <button class="btn-secondary" style="color:var(--red)" onclick="Steps._deleteEntry('${date}')">Delete entry</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  async _saveEditedEntry(date) {
    const val = parseInt(document.getElementById('edit-steps-val')?.value);
    if (!val && val !== 0) { App.toast('Enter a value'); return; }
    await this.setStepsForDate(date, val);
    App.closeModal();
    App.toast('Updated');
    this._buildScreen(document.getElementById('screen-steps'));
  },

  async _deleteEntry(date) {
    const data = this.getData();
    delete data[date];
    await this.saveData(data);
    App.closeModal();
    App.toast('Entry deleted');
    this._buildScreen(document.getElementById('screen-steps'));
  },
};
