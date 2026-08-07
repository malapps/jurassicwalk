// ui.js - UI management and display updates

let distanceValueEl;
let wakelockIndicatorEl;
let statusBarEl;
let statusTextEl;
let statusTimeout = null;

function initUI() {
  distanceValueEl = document.getElementById('distance-value');
  wakelockIndicatorEl = document.getElementById('wakelock-indicator');
  statusBarEl = document.getElementById('status-bar');
  statusTextEl = document.getElementById('status-text');
  
  console.log('[UI] Initialised');
}

function updateDistanceDisplay(totalMetres) {
  if (!distanceValueEl) return;
  const rounded = Math.round(totalMetres);
  distanceValueEl.textContent = rounded.toLocaleString();
}

function showWakeLockIndicator() {
  if (!wakelockIndicatorEl) return;
  wakelockIndicatorEl.classList.add('active', 'pulse');
}

function hideWakeLockIndicator() {
  if (!wakelockIndicatorEl) return;
  wakelockIndicatorEl.classList.remove('active', 'pulse');
}

function showStatus(message, duration = 3000) {
  if (!statusBarEl || !statusTextEl) return;
  
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }
  
  // Remove error class for normal messages
  statusBarEl.classList.remove('error');
  
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
  
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }
  
  // Add error class for red background
  statusBarEl.classList.add('error');
  
  statusTextEl.textContent = '❌ ' + message;
  statusBarEl.classList.remove('hidden');
  statusBarEl.classList.add('visible');
  
  console.error('[UI]', message);
  
  // Errors stay longer
  statusTimeout = setTimeout(() => {
    statusBarEl.classList.remove('error');
    hideStatus();
  }, 8000);
}

function showGPSAccuracy(accuracy) {
  if (accuracy < 10) {
    showStatus('📍 GPS: Excellent (' + Math.round(accuracy) + 'm)', 2000);
  } else if (accuracy < 20) {
    showStatus('📍 GPS: Good (' + Math.round(accuracy) + 'm)', 2000);
  } else if (accuracy < 50) {
    showStatus('📍 GPS: Fair (' + Math.round(accuracy) + 'm) - move to open area', 3000);
  } else {
    showStatus('📍 GPS: Poor (' + Math.round(accuracy) + 'm) - check your location', 4000);
  }
}