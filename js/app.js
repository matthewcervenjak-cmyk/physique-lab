const Auth = {
  _pending: null,

  selectProfile(profileId) {
    this._pending = profileId;
    const profile = PROFILES[profileId];
    if (profile.password === null) { this._login(profileId); return; }
    const modal = document.getElementById('auth-modal');
    modal.querySelector('.auth-box').className = 'auth-box ' + profileId + '-auth';
    document.getElementById('auth-avatar').className = 'auth-avatar ' + profileId;
    document.getElementById('auth-avatar').textContent = profileId === 'matt' ? '💪' : '🌸';
    document.getElementById('auth-name').textContent = profile.label;
    document.getElementById('auth-input').value = '';
    document.getElementById('auth-error').classList.add('hidden');
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('auth-input').focus(), 150);
  },

  submitPassword() {
    const input = document.getElementById('auth-input').value;
    const profile = PROFILES[this._pending];
    if (!profile) return;
    if (input === profile.password) {
      this._login(this._pending);
    } else {
      document.getElementById('auth-error').classList.remove('hidden');
      document.getElementById('auth-input').value = '';
      document.getElementById('auth-input').focus();
      const box = document.querySelector('.auth-box');
      box.style.animation = 'none'; void box.offsetHeight; box.style.animation = 'shake 0.4s ease';
    }
  },

  async _login(profileId) {
    CURRENT_PROFILE = profileId;
    const profile = PROFILES[profileId];
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('auth-modal').classList.add('hidden');
    document.body.className = 'theme-' + profile.theme;
    document.getElementById('header-profile-name').textContent = profile.label + "'s Physique Lab";
    document.querySelector('.nav-btn-rehab').classList.toggle('hidden', !profile.hasRehab);
    document.getElementById('app').classList.remove('hidden');
    App.toast('Syncing...');
    await DB.syncFromCloud();
    App._boot();
  },

  cancel() {
    document.getElementById('auth-modal').classList.add('hidden');
    this._pending = null;
  },

  logout() {
    if (!confirm('Switch profile? Your data is saved.')) return;
    CURRENT_PROFILE = null;
    document.body.className = '';
    document.getElementById('app').classList.add('hidden');
    document.getElementById('landing').classList.remove('hidden');
    document.querySelectorAll('.screen').forEach(s => { s.innerHTML=''; s.classList.remove('active'); });
    document.getElementById('screen-log').classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-screen="log"]').classList.add('active');
    App._navListenersAttached = false;
    Log._sessions = {};
    Log._openDayId = null;
  },
};

const App = {
  _navListenersAttached: false,

  _domReady() {
    const pc = document.getElementById('particles');
    if (pc) {
      for (let i = 0; i < 28; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `left:${Math.random()*100}%;bottom:${-Math.random()*10}%;--dur:${6+Math.random()*8}s;--delay:${-Math.random()*10}s;width:${1+Math.random()*2}px;height:${1+Math.random()*2}px;`;
        pc.appendChild(p);
      }
    }
    document.getElementById('modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') App.closeModal();
    });
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  },

  _boot() {
    if (!this._navListenersAttached) {
      document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => App.navigate(btn.dataset.screen));
      });
      this._navListenersAttached = true;
    }
    document.querySelectorAll('.screen').forEach(s => { s.innerHTML=''; s.classList.remove('active'); });
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('screen-log').classList.add('active');
    document.querySelector('[data-screen="log"]').classList.add('active');
    this._renderScreen('log');
  },

  navigate(screenId) {
    if (!screenId) return;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const screen = document.getElementById('screen-' + screenId);
    const btn    = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
    if (screen) { screen.classList.add('active'); screen.scrollTop = 0; }
    if (btn)    btn.classList.add('active');
    this._renderScreen(screenId);
  },

  _renderScreen(screenId) {
    const hr = document.getElementById('header-right');
    if (screenId === 'programme') {
      hr.innerHTML = `<button class="header-btn" onclick="Screens.addDay()">+ Day</button>`;
    } else {
      hr.innerHTML = `<button class="header-btn" onclick="Auth.logout()">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 2H2a1 1 0 00-1 1v8a1 1 0 001 1h3M9 10l3-3-3-3M13 7H5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Switch
      </button>`;
    }
    if (screenId === 'log')       Log.render();
    if (screenId === 'progress')  Screens.renderProgress();
    if (screenId === 'deload')    Screens.renderDeload();
    if (screenId === 'programme') Screens.renderProgramme();
    if (screenId === 'rehab')     Rehab.renderRehab();
  },

  showModal(title, contentHTML) {
    document.getElementById('modal-box').innerHTML = `
      <div class="modal-title">${title}<button class="modal-close" onclick="App.closeModal()">×</button></div>
      ${contentHTML}`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-box').innerHTML = '';
  },

  _toastTimer: null,
  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    if (this._toastTimer) clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
  },
};

const _shakeStyle = document.createElement('style');
_shakeStyle.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`;
document.head.appendChild(_shakeStyle);

document.addEventListener('DOMContentLoaded', () => App._domReady());
