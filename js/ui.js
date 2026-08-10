// ui.js – Jurassic Walk UI management

let distanceValueEl;
let amberCountEl;
let pauseIconEl;
let statusBarEl;
let statusTextEl;
let toastEl;
let startOverlayEl;
let statusTimeout = null;
let toastTimeout = null;

let deferredPrompt = null;

function initUI() {
  distanceValueEl = document.getElementById('distance-value');
  amberCountEl = document.getElementById('amber-count');
  pauseIconEl = document.getElementById('pause-icon');
  statusBarEl = document.getElementById('status-bar');
  statusTextEl = document.getElementById('status-text');
  startOverlayEl = document.getElementById('start-overlay');

  // Toast element
  toastEl = document.createElement('div');
  toastEl.id = 'toast';
  document.body.appendChild(toastEl);

  // PWA install prompt
  createPWAPrompt();

  // Start button
  document.getElementById('start-btn').addEventListener('click', () => {
    if (typeof startGame === 'function') startGame();
  });

  // Pause button (now inside the combined pill)
  document.getElementById('pause-part').addEventListener('click', () => {
    if (typeof togglePause === 'function') togglePause();
  });

  // beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showPWAPrompt();
  });

  // Stats placeholder (tap distance part)
  const distancePart = document.getElementById('distance-part');
  if (distancePart) {
    distancePart.addEventListener('click', () => {
      console.log('Stats tapped – not yet implemented');
    });
  }

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

/**
 * Update distance display – automatically switches to km if ≥10000 m
 */
function updateDistanceDisplay(totalMetres) {
  if (!distanceValueEl) return;
  if (totalMetres >= 10000) {
    const km = (totalMetres / 1000).toFixed(1);
    distanceValueEl.textContent = km + ' km';
  } else {
    distanceValueEl.textContent = Math.round(totalMetres) + ' m';
  }
}

function updateAmberDisplay(count) {
  if (!amberCountEl) return;
  amberCountEl.textContent = count;
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
  updatePauseButton(false); // show play icon
}

function hideStartOverlay() {
  if (startOverlayEl) startOverlayEl.classList.add('hidden');
  updatePauseButton(true); // show pause icon
}

function updatePauseButton(active) {
  if (!pauseIconEl) return;
  pauseIconEl.textContent = active ? '⏸' : '▶';
}