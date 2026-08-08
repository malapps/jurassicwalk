// ui.js - UI management (clean version, no debug panels)

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
  
  // Create toast element
  toastEl = document.createElement('div');
  toastEl.id = 'toast';
  document.body.appendChild(toastEl);
  
  // Create PWA install prompt
  createPWAPrompt();
  
  console.log('[UI] Initialised');
}

/**
 * Create the "Add to Home Screen" prompt
 */
function createPWAPrompt() {
  const prompt = document.createElement('div');
  prompt.id = 'pwa-prompt';
  prompt.innerHTML = `
    <span id="pwa-prompt-text">📲 Add Dino Walk to your home screen for the best experience</span>
    <button id="pwa-prompt-close">OK</button>
  `;
  document.body.appendChild(prompt);
  
  document.getElementById('pwa-prompt-close').addEventListener('click', () => {
    hidePWAPrompt();
    // Save that user dismissed this
    try {
      localStorage.setItem('dinowalk_pwa_prompt_dismissed', 'true');
    } catch(e) {}
  });
}

/**
 * Show PWA install prompt (only if not installed and not dismissed)
 */
function showPWAPrompt() {
  // Check if already installed (standalone mode)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return;
  }
  
  // Check if user previously dismissed
  try {
    if (localStorage.getItem('dinowalk_pwa_prompt_dismissed') === 'true') {
      return;
    }
  } catch(e) {}
  
  // Show after a delay
  setTimeout(() => {
    const prompt = document.getElementById('pwa-prompt');
    if (prompt) {
      prompt.classList.add('show');
    }
  }, 5000);
}

function hidePWAPrompt() {
  const prompt = document.getElementById('pwa-prompt');
  if (prompt) {
    prompt.classList.remove('show');
  }
}

/**
 * Show a toast message (slides down from top, auto-dismisses)
 */
function showToast(message, duration = 3000) {
  if (!toastEl) return;
  
  if (toastTimeout) clearTimeout(toastTimeout);
  
  toastEl.textContent = message;
  toastEl.classList.add('show');
  
  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, duration);
}

function updateDistanceDisplay(totalMetres) {
  if (!distanceValueEl) return;
  const rounded = Math.round(totalMetres);
  distanceValueEl.textContent = rounded.toLocaleString();
}

function showStatus(message, duration = 3000) {
  if (!statusBarEl || !statusTextEl) return;
  
  if (statusTimeout) clearTimeout(statusTimeout);
  
  statusTextEl.textContent = message;
  statusBarEl.classList.remove('hidden');
  statusBarEl.classList.add('visible');
  
  if (duration > 0) {
    statusTimeout = setTimeout(() => {
      hideStatus();
    }, duration);
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
  
  console.error('[UI]', message);
  
  statusTimeout = setTimeout(() => {
    hideStatus();
  }, 8000);
}