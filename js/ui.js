// ui.js – Jurassic Walk UI management

let distanceValueEl;
let statusBarEl;
let statusTextEl;
let toastEl;
let statusTimeout = null;
let toastTimeout = null;

function initUI() {
  distanceValueEl = document.getElementById('distance-value');
  statusBarEl = document.getElementById('status-bar');
  statusTextEl = document.getElementById('status-text');

  toastEl = document.createElement('div');
  toastEl.id = 'toast';
  document.body.appendChild(toastEl);

  createPWAPrompt();
  console.log('[UI] Initialised');
}

function createPWAPrompt() {
  const prompt = document.createElement('div');
  prompt.id = 'pwa-prompt';
  prompt.innerHTML = `
    <span id="pwa-prompt-text">📲 Add Jurassic Walk to your home screen for the best experience</span>
    <button id="pwa-prompt-close">OK</button>
  `;
  document.body.appendChild(prompt);

  document.getElementById('pwa-prompt-close').addEventListener('click', () => {
    hidePWAPrompt();
    try { localStorage.setItem('jwalk_pwa_prompt_dismissed', 'true'); } catch(e) {}
  });
}

function showPWAPrompt() {
  if (window.matchMedia('(display-mode: standalone)').matches) return;
  try { if (localStorage.getItem('jwalk_pwa_prompt_dismissed') === 'true') return; } catch(e) {}
  setTimeout(() => {
    const prompt = document.getElementById('pwa-prompt');
    if (prompt) prompt.classList.add('show');
  }, 5000);
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
  if (duration > 0) {
    statusTimeout = setTimeout(() => hideStatus(), duration);
  }
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