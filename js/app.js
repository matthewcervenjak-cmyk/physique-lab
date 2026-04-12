// ── AUTH LAYER ──

const Auth = {
  _pending: null,

  selectProfile(profileId) {
    this._pending = profileId;
    const profile = PROFILES[profileId];
    const modal = document.getElementById('auth-modal');
    const box   = modal.querySelector('.auth-box');

    // Style the modal for the profile
    box.className = 'auth-box ' + profileId + '-auth';

    // Avatar emoji
    document.getElementById('auth-avatar').className = 'auth-avatar ' + profileId;
    document.getElementById('auth-avatar').textContent = profileId === 'matt' ? '💪' : '🌸';
    document.getElementById('auth-name').textContent = profile.label;

    document.getElementById('auth-input').value = '';
    document.getElementById('auth-error').classList.add('hidden');
    modal.classList.remove('hidden');
    setTimeout(() => document.getElementById('auth-input').focus(), 100);
  },

  submitPassword() {
    const input   = document.getElementById('auth-input').value;
    const profile = PROFILES[this._pending];
    if (!profile) return;

    if (input === profile.password) {
      this._login(this._pending);
    } else {
      document.getElementById('auth-error').classList.remove('hidden');
      document.getElementById('auth-input').value = '';
      document.getElementById('auth-input').focus();
      // Shake animation
      const box = document.querySelector('.auth-box');
      box.style.animation = 'none';
      box.offsetHeight;
      box.style.animation = 'shake 0.4s ease';
    }
  },

  _login(profileId) {
    CURRENT_PROFILE = profileId;
    const profile = PROFILES[profileId];

    // Hide landing & auth
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('auth-modal').classList.add('hidden');

    // Apply theme
    document.body.className = 'theme-' + profile.theme;

    // Update header
    document.getElementById('header-profile-name').textContent = profile.label + "'s Physique Lab";

    // Show/hide Rehab tab
    const rehabBtn = document.querySelector('.nav-btn-rehab');
    if (profile.hasRehab) {
      rehabBtn.classList.remove('hidden');
    } else {
      rehabBtn.classList.add('hidden');
    }

    // Show app
    document.getElementById('app').classList.remove('hidden');

    // Render all screens
    App.init();
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
    // Reset nav
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-screen="today"]').classList.add('active');
    document.querySelectorAll('.screen').forEach(s => { s.classList.remove('active'); s.innerHTML = ''; });
    document.getElementById('screen-today').classList.add('active');
  },
};

// ── APP CONTROLLER ──

const App = {
  currentScreen: 'today',

  init() {
    // Nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => this.navigate(btn.dataset.screen));
    });

    // Modal backdrop
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.closeModal();
    });

    // Render screens
    Screens.renderToday();
    Screens.renderProgress();
    Screens.renderDeload();
    Screens.renderHistory();
    Screens.renderProgramme();
    if (PROFILES[CURRENT_PROFILE] && PROFILES[CURRENT_PROFILE].hasRehab) {
      Rehab.renderRehab();
    }

    // SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  navigate(screenId) {
    if (!screenId) return;
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const screen = document.getElementById('screen-' + screenId);
    const btn    = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
    if (screen) { screen.classList.add('active'); screen.scrollTop = 0; }
    if (btn)    btn.classList.add('active');
    this.currentScreen = screenId;

    if (screenId === 'today')     Screens.renderToday();
    if (screenId === 'progress')  Screens.renderProgress();
    if (screenId === 'deload')    Screens.renderDeload();
    if (screenId === 'history')   Screens.renderHistory();
    if (screenId === 'programme') Screens.renderProgramme();
    if (screenId === 'rehab')     Rehab.renderRehab();
  },

  showModal(title, contentHTML) {
    document.getElementById('modal-box').innerHTML = `
      <div class="modal-title">
        ${title}
        <button class="modal-close" onclick="App.closeModal()">×</button>
      </div>
      ${contentHTML}`;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-box').innerHTML = '';
  },

  toastTimer: null,
  toast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.remove('hidden');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), 2200);
  },
};

// ── LANDING PARTICLES ──
document.addEventListener('DOMContentLoaded', () => {
  // Generate floating particles
  const container = document.getElementById('particles');
  for (let i = 0; i < 28; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `
      left: ${Math.random()*100}%;
      bottom: ${-Math.random()*20}%;
      --dur: ${6 + Math.random()*8}s;
      --delay: ${-Math.random()*10}s;
      opacity: ${0.2 + Math.random()*0.5};
      width: ${1 + Math.random()*2}px;
      height: ${1 + Math.random()*2}px;
    `;
    container.appendChild(p);
  }

  // Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});

// Auth modal shake keyframe
const style = document.createElement('style');
style.textContent = `@keyframes shake {
  0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)}
  60%{transform:translateX(-6px)} 80%{transform:translateX(6px)}
}`;
document.head.appendChild(style);
