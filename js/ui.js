// ui.js – Jurassic Walk UI management

let distanceValueEl;
let statusBarEl;
let statusTextEl;
let toastEl;
let startOverlayEl;
let pauseBtnEl;
let statusTimeout = null;
let toastTimeout = null;

// PWA install
let deferredPrompt = null;

function initUI() {
  distanceValueEl = document.getElementById('distance-value');
  statusBarEl = document.getElementById('status-bar');
  statusTextEl = document.getElementById('status-text');
  startOverlayEl = document.getElementById('start-overlay');
  pauseBtnEl = document.getElementById('pause-btn');

  // Toast element
  toastEl = document.createElement('div');
  toastEl.id = 'toast';
  document.body.appendChild(toastEl);

  // PWA install prompt
  createPWAPrompt();

  // Start button listener
  document.getElementById('start-btn').addEventListener('click', () => {
    if (typeof startGame === 'function') startGame();
  });

  // Pause button listener
  pauseBtnEl.addEventListener('click', () => {
    if (typeof pauseGame === 'function') pauseGame();
  });

  // Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showPWAPrompt();
  });

  console.log('[UI] Initialised');
}

function createPWAPrompt() {
  const prompt = document.createElement('div');
  prompt.id = 'pwa-prompt';
  prompt.innerHTML = `
    <span id="pwa-prompt-text">📲 Install Jurassic Walk for the best experience</span>
    <button id="pwa-prompt-close">Install</button>
  `;
  document.body.appendChild(prompt);

  document.getElementById('pwa-prompt-close').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('PWA install:', outcome);
      deferredPrompt = null;
    }
    hidePWAPrompt();
  });
}

function showPWAPrompt() {
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  const prompt = document.getElementById('pwa-prompt');
  if (prompt) prompt.classList.add('show');
}

function hidePWAPrompt() {
  const prompt = document.getElementById('pwa-prompt');
  if (prompt) prompt.classList.remove('show');
}

function showToast(message, duration = 3000) {
  if (!toastEl) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastEl.textContent = message;
  toastEl.classList.add('show');
  toastTimeout = setTimeout(() => toastEl.classList.remove('show'), duration);
}

function updateDistanceDisplay(totalMetres) {
  if (!distanceValueEl) return;
  distanceValueEl.textContent = Math.round(totalMetres).toLocaleString();
}

function showStatus(message, duration = 3000) {
  if (!statusBarEl || !statusTextEl) return;
  if (statusTimeout) clearTimeout(statusTimeout);
  statusTextEl.textContent = message;
  statusBarEl.classList.remove('hidden');
  statusBarEl.classList.add('visible');
  if (duration > 0) statusTimeout = setTimeout(() => hideStatus(), duration);
}

function hideStatus() {
  if (!statusBarEl) return;
  statusBarEl.classList.remove('visible');
  statusBarEl.classList.add('hidden');
}

function showError(message) {
  if (!statusBarEl || !statusTextEl) return;
  if (statusTimeout) clearTimeout(statusTimeout);
  statusTextEl.textContent = '⚠️ ' + message;
  statusBarEl.classList.remove('hidden');
  statusBarEl.classList.add('visible');
  statusTimeout = setTimeout(() => hideStatus(), 8000);
}

// Game state UI controls
function showStartOverlay() {
  if (startOverlayEl) startOverlayEl.classList.remove('hidden');
  if (pauseBtnEl) pauseBtnEl.classList.remove('active');
}

function hideStartOverlay() {
  if (startOverlayEl) startOverlayEl.classList.add('hidden');
  if (pauseBtnEl) pauseBtnEl.classList.add('active');
}