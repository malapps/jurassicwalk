// ui.js – Jurassic Walk UI management

let distanceValueEl;
let amberCountEl;
let pauseIconEl;
let statusBarEl;
let statusTextEl;
let toastEl;
let startOverlayEl;
let labModalEl;
let labContentEl;
let labCloseBtnEl;
let hatchModalEl;
let hatchContentEl;
let hatchCloseBtnEl;
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
  labModalEl = document.getElementById('lab-modal');
  labContentEl = document.getElementById('lab-content');
  labCloseBtnEl = document.getElementById('lab-close-btn');
  hatchModalEl = document.getElementById('hatch-modal');
  hatchContentEl = document.getElementById('hatch-content');
  hatchCloseBtnEl = document.getElementById('hatch-close-btn');

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

  // Pause button
  document.getElementById('pause-part').addEventListener('click', () => {
    if (typeof togglePause === 'function') togglePause();
  });

  // Lab close button
  labCloseBtnEl.addEventListener('click', () => {
    hideLabModal();
  });

  // Hatch close button
  hatchCloseBtnEl.addEventListener('click', () => {
    hideHatchModal();
  });

  // Listen for beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showPWAPrompt();
  });

  // Stats placeholder – distance part is tappable later
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

function showToast(message, duration = 15000) {
  if (!toastEl) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  
  // Convert newlines to <br> for multiline
  toastEl.innerHTML = message.replace(/\n/g, '<br>');
  toastEl.classList.add('show');
  
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

function hideToast() {
  if (!toastEl) return;
  if (toastTimeout) clearTimeout(toastTimeout);
  toastEl.classList.remove('show');
}

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

// Lab modal
function showLabModal(htmlContent) {
  if (!labModalEl || !labContentEl) return;
  labContentEl.innerHTML = htmlContent;
  labModalEl.classList.remove('hidden');
}

function hideLabModal() {
  if (!labModalEl) return;
  labModalEl.classList.add('hidden');
  if (typeof gameActive !== 'undefined' && !gameActive) {
    showStartOverlay();
  }
}

// Hatch modal
function showHatchModal(level, species) {
  if (!hatchModalEl || !hatchContentEl) return;
  hatchContentEl.innerHTML = `
    <p style="font-size:1.1em;color:#334086;font-weight:600;">${level} dino DNA 100%</p>
    <p style="font-size:1.3em;margin:12px 0;">🦕 ${species} has hatched!</p>
    <p style="color:#666;">Your island grows!</p>
  `;
  hatchModalEl.classList.remove('hidden');
}

function hideHatchModal() {
  if (!hatchModalEl) return;
  hatchModalEl.classList.add('hidden');
}

// Game state UI controls
function showStartOverlay() {
  if (startOverlayEl) startOverlayEl.classList.remove('hidden');
  updatePauseButton(false);
}

function hideStartOverlay() {
  if (startOverlayEl) startOverlayEl.classList.add('hidden');
  updatePauseButton(true);
}

function updatePauseButton(active) {
  if (!pauseIconEl) return;
  pauseIconEl.textContent = active ? '⏸' : '▶';
}