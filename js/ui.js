// ui.js - UI management and display updates

// DOM element references
let distanceValueEl;
let wakelockIndicatorEl;
let statusBarEl;
let statusTextEl;

// Status bar timeout
let statusTimeout = null;

/**
 * Initialise UI elements
 */
function initUI() {
  distanceValueEl = document.getElementById('distance-value');
  wakelockIndicatorEl = document.getElementById('wakelock-indicator');
  statusBarEl = document.getElementById('status-bar');
  statusTextEl = document.getElementById('status-text');
  
  console.log('[UI] Initialised');
}

/**
 * Update the distance display
 */
function updateDistanceDisplay(totalMetres) {
  if (!distanceValueEl) return;
  
  const rounded = Math.round(totalMetres);
  distanceValueEl.textContent = rounded.toLocaleString();
}

/**
 * Show the Wake Lock indicator
 */
function showWakeLockIndicator() {
  if (!wakelockIndicatorEl) return;
  wakelockIndicatorEl.classList.add('active', 'pulse');
}

/**
 * Hide the Wake Lock indicator
 */
function hideWakeLockIndicator() {
  if (!wakelockIndicatorEl) return;
  wakelockIndicatorEl.classList.remove('active', 'pulse');
}

/**
 * Show a status message
 */
function showStatus(message, duration = 3000) {
  if (!statusBarEl || !statusTextEl) return;
  
  // Clear any existing timeout
  if (statusTimeout) {
    clearTimeout(statusTimeout);
  }
  
  statusTextEl.textContent = message;
  statusBarEl.classList.remove('hidden');
  statusBarEl.classList.add('visible');
  
  // Auto-hide after duration
  if (duration > 0) {
    statusTimeout = setTimeout(() => {
      hideStatus();
    }, duration);
  }
}

/**
 * Hide the status message
 */
function hideStatus() {
  if (!statusBarEl) return;
  statusBarEl.classList.remove('visible');
  statusBarEl.classList.add('hidden');
}

/**
 * Show an error message (stays longer)
 */
function showError(message) {
  showStatus('⚠️ ' + message, 6000);
  console.error('[UI]', message);
}

/**
 * Show GPS accuracy indicator in status
 */
function showGPSAccuracy(accuracy) {
  if (accuracy < 10) {
    showStatus('📍 GPS: Excellent', 2000);
  } else if (accuracy < 20) {
    showStatus('📍 GPS: Good', 2000);
  } else if (accuracy < 50) {
    showStatus('📍 GPS: Fair - move to open area', 3000);
  } else {
    showStatus('📍 GPS: Poor - check your location', 4000);
  }
}