// ── APP CONTROLLER ──

const App = {
  currentScreen: 'today',
  deferredInstallPrompt: null,

  init() {
    // Nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        this.navigate(screen);
      });
    });

    // Modal overlay close on backdrop tap
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) this.closeModal();
    });

    // PWA install
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.showInstallBanner();
    });

    // Render all screens
    Screens.renderToday();
    Screens.renderProgress();
    Screens.renderDeload();
    Screens.renderHistory();
    Screens.renderProgramme();

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  },

  navigate(screenId) {
    if (screenId === this.currentScreen) return;

    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const screen = document.getElementById('screen-' + screenId);
    const btn = document.querySelector(`.nav-btn[data-screen="${screenId}"]`);
    if (screen) { screen.classList.add('active'); screen.scrollTop = 0; }
    if (btn) btn.classList.add('active');

    this.currentScreen = screenId;

    // Reset header right on navigate away from today
    if (screenId !== 'today') document.getElementById('header-right').innerHTML = '';
    if (screenId === 'today') Screens.renderToday();
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
    this.toastTimer = setTimeout(() => el.classList.add('hidden'), 2000);
  },

  showInstallBanner() {
    // Only show on first visit and not in standalone mode
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (DB.load('installDismissed', false)) return;
    const banner = document.getElementById('install-banner');
    if (banner) banner.classList.remove('hidden');
  },
};

// Install banner actions (called from HTML)
function installApp() {
  if (App.deferredInstallPrompt) {
    App.deferredInstallPrompt.prompt();
    App.deferredInstallPrompt.userChoice.then(() => { App.deferredInstallPrompt = null; });
  }
  dismissInstallBanner();
}

function dismissInstallBanner() {
  const banner = document.getElementById('install-banner');
  if (banner) banner.classList.add('hidden');
  DB.save('installDismissed', true);
}

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
