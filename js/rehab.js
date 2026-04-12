// ── REHAB SCREEN (Lynny only) ──

const Rehab = {

  async renderRehab() {
    const container = document.getElementById('screen-rehab');
    container.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;

    const exercises = DB.getRehabExercises();
    const rehabSessions = DB.getRehabSessions();

    let html = `
      <div class="section-header">
        <div><div class="section-title">Rehab</div><div class="section-sub">Custom recovery tracking</div></div>
        <button class="header-btn" onclick="Rehab.addExercise()">+ Exercise</button>
      </div>`;

    if (exercises.length === 0) {
      html += `<div class="empty-state">
        <div class="empty-icon" style="font-size:36px">🩺</div>
        <div class="empty-title">No rehab exercises yet</div>
        <div class="empty-sub">Tap "+ Exercise" to add your first rehab movement</div>
      </div>`;
    } else {
      for (const ex of exercises) {
        const lastSession = rehabSessions.find(s => s.exerciseId === ex.id);
        const lastText = lastSession
          ? `Last: ${lastSession.sets.filter(s=>s.reps).map(s=>`${s.reps} reps${s.load?' @ '+s.load+'kg':''}`).join(', ')}`
          : 'No sessions yet';

        html += `
          <div class="card rehab-ex-card">
            <div class="card-header">
              <div style="flex:1">
                <div class="card-title">${ex.name}</div>
                <div class="card-meta">${ex.notes || 'No notes'}</div>
              </div>
              <button class="edit-btn" onclick="Rehab.editExercise('${ex.id}')">Edit</button>
            </div>
            <div style="padding:0 14px 4px">
              <div class="col-heads" style="grid-template-columns:26px 1fr 1fr 36px">
                <div class="col-head"></div>
                <div class="col-head">Reps</div>
                <div class="col-head">Load (opt)</div>
                <div class="col-head"></div>
              </div>
              ${(ex.logSets || [{reps:'',load:''},{reps:'',load:''},{reps:'',load:''}]).map((set,i)=>`
              <div class="set-row rehab-set-row" style="grid-template-columns:26px 1fr 1fr 36px" id="rehab-set-${ex.id}-${i}">
                <div class="set-num">${i+1}</div>
                <input class="set-input ${set.done?'done':''}" type="number" inputmode="numeric" placeholder="reps" value="${set.reps||''}"
                  onchange="Rehab.updateSet('${ex.id}',${i},'reps',this.value)" min="1" max="999">
                <input class="set-input ${set.done?'done':''}" type="number" inputmode="decimal" placeholder="kg" value="${set.load||''}"
                  onchange="Rehab.updateSet('${ex.id}',${i},'load',this.value)" step="0.5" min="0">
                <button class="tick-btn ${set.done?'done':''}" onclick="Rehab.tickSet('${ex.id}',${i})">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </button>
              </div>`).join('')}
            </div>
            <button class="add-set-btn" onclick="Rehab.addSet('${ex.id}')">+ Add set</button>
            <div class="prev-row"><span class="prev-item rehab-note">${lastText}</span></div>
            <div style="padding:10px 14px 14px">
              <button class="btn-primary" style="margin-top:0;font-size:14px;padding:12px" onclick="Rehab.logSession('${ex.id}')">Save Session</button>
            </div>
          </div>`;
      }

      if (rehabSessions.length > 0) {
        html += `<div class="section-header" style="margin-top:8px"><div class="section-title" style="font-size:16px">Recent sessions</div></div>`;
        for (const s of rehabSessions.slice(0,10)) {
          const ex = exercises.find(e => e.id === s.exerciseId);
          html += `
            <div class="card"><div class="pad-card">
              <div class="flex-between" style="margin-bottom:6px">
                <span style="font-size:13px;font-weight:600;color:var(--accent,#fc7ab0)">${ex ? ex.name : s.exerciseName}</span>
                <span class="text-muted text-sm">${DB.formatDate(s.date)}</span>
              </div>
              ${(s.sets||[]).filter(st=>st.reps).map((st,i)=>`
                <div class="flex-between" style="font-size:12px;padding:3px 0;border-bottom:1px solid var(--border)">
                  <span class="text-muted">Set ${i+1}</span>
                  <span style="color:var(--text2,#d8d0d4)">${st.reps} reps${st.load?' @ '+st.load+'kg':''}</span>
                </div>`).join('')}
            </div></div>`;
        }
      }
    }

    container.innerHTML = html + '<div style="height:16px"></div>';
  },

  async updateSet(exId, idx, field, value) {
    const exercises = DB.getRehabExercises();
    const ex = exercises.find(e => e.id === exId);
    if (!ex) return;
    if (!ex.logSets) ex.logSets = [{},{},{}];
    if (!ex.logSets[idx]) ex.logSets[idx] = {};
    ex.logSets[idx][field] = value;
    await DB.saveRehabExercises(exercises);
  },

  async tickSet(exId, idx) {
    const exercises = DB.getRehabExercises();
    const ex = exercises.find(e => e.id === exId);
    if (!ex || !ex.logSets) return;
    const set = ex.logSets[idx] || {};
    if (!set.reps) { App.toast('Enter reps first'); return; }
    set.done = !set.done;
    ex.logSets[idx] = set;
    await DB.saveRehabExercises(exercises);
    const btn = document.querySelector(`#rehab-set-${exId}-${idx} .tick-btn`);
    const inputs = document.querySelectorAll(`#rehab-set-${exId}-${idx} .set-input`);
    if (btn) btn.classList.toggle('done', set.done);
    if (inputs) inputs.forEach(i => i.classList.toggle('done', set.done));
    if (set.done) App.toast('Set logged');
  },

  async addSet(exId) {
    const exercises = DB.getRehabExercises();
    const ex = exercises.find(e => e.id === exId);
    if (!ex) return;
    if (!ex.logSets) ex.logSets = [];
    ex.logSets.push({ reps: '', load: '', done: false });
    await DB.saveRehabExercises(exercises);
    this.renderRehab();
  },

  async logSession(exId) {
    const exercises = DB.getRehabExercises();
    const ex = exercises.find(e => e.id === exId);
    if (!ex) return;
    const doneSets = (ex.logSets || []).filter(s => s.reps);
    if (!doneSets.length) { App.toast('Log at least one set first'); return; }
    await DB.saveRehabSession({ id: DB.newId(), date: DB.todayISO(), exerciseId: exId, exerciseName: ex.name, sets: doneSets });
    ex.logSets = [{ reps:'', load:'' }, { reps:'', load:'' }, { reps:'', load:'' }];
    await DB.saveRehabExercises(exercises);
    App.toast('Rehab session saved!');
    this.renderRehab();
  },

  addExercise() {
    App.showModal('Add rehab exercise', `
      <div class="form-group"><label class="form-label">Exercise name</label><input class="form-input" id="rehab-new-name" placeholder="e.g. Hip flexor stretch"></div>
      <div class="form-group"><label class="form-label">Notes / instructions (optional)</label><input class="form-input" id="rehab-new-notes" placeholder="e.g. Hold 30s each side"></div>
      <button class="btn-primary" onclick="Rehab.confirmAddExercise()" style="margin-top:4px">Add</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  async confirmAddExercise() {
    const name = document.getElementById('rehab-new-name').value.trim();
    if (!name) { App.toast('Enter exercise name'); return; }
    const exercises = DB.getRehabExercises();
    exercises.push({ id: DB.newId(), name, notes: document.getElementById('rehab-new-notes').value.trim(), logSets: [{reps:'',load:''},{reps:'',load:''},{reps:'',load:''}] });
    await DB.saveRehabExercises(exercises);
    App.closeModal(); this.renderRehab(); App.toast('Exercise added');
  },

  async editExercise(exId) {
    const exercises = DB.getRehabExercises();
    const ex = exercises.find(e => e.id === exId);
    if (!ex) return;
    App.showModal(`Edit: ${ex.name}`, `
      <div class="form-group"><label class="form-label">Exercise name</label><input class="form-input" id="rehab-edit-name" value="${ex.name}"></div>
      <div class="form-group"><label class="form-label">Notes</label><input class="form-input" id="rehab-edit-notes" value="${ex.notes||''}"></div>
      <button class="btn-primary" onclick="Rehab.saveExercise('${exId}')">Save</button>
      <button class="btn-secondary" style="color:var(--red);border-color:#5a1a1a" onclick="Rehab.deleteExercise('${exId}')">Delete</button>
      <button class="btn-secondary" onclick="App.closeModal()">Cancel</button>`);
  },

  async saveExercise(exId) {
    const exercises = DB.getRehabExercises();
    const ex = exercises.find(e => e.id === exId);
    if (!ex) return;
    ex.name  = document.getElementById('rehab-edit-name').value.trim() || ex.name;
    ex.notes = document.getElementById('rehab-edit-notes').value.trim();
    await DB.saveRehabExercises(exercises);
    App.closeModal(); this.renderRehab(); App.toast('Updated');
  },

  async deleteExercise(exId) {
    if (!confirm('Delete this rehab exercise?')) return;
    const exercises = DB.getRehabExercises().filter(e => e.id !== exId);
    await DB.saveRehabExercises(exercises);
    App.closeModal(); this.renderRehab(); App.toast('Deleted');
  },
};
