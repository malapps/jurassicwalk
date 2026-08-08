// app.js - Main application controller (debug mode, fixed)

// Game state
let totalDistanceToday = 0;
let lastSaveTime = 0;
let wakeLock = null;
let wakeLockSupported = false;
let initialPositionSet = false;
let updateCount = 0;
let lastDebugMsgTime = 0;

// Save interval (milliseconds)
const SAVE_INTERVAL = 5000;

/**
 * Global error handler
 */
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', message, 'at', source, lineno);
  if (typeof showError === 'function') {
    showError('JS Error: ' + message);
  }
  return true;
};

/**
 * Initialise the application
 */
async function initApp() {
  console.log('[App] Starting Dino Walk (debug mode)...');
  
  // Initialise UI elements
  initUI();
  initDebugPanel();
  
  // Open database
  try {
    await openDB();
    console.log('[App] Database ready');
  } catch (error) {
    console.error('[App] Failed to open database:', error);
    showError('Storage not available. Progress won\'t be saved.');
  }
  
  // Load saved state
  await loadSavedState();
  
  // Check for Wake Lock support
  wakeLockSupported = 'wakeLock' in navigator;
  if (wakeLockSupported) {
    console.log('[App] Wake Lock supported');
    await requestWakeLock();
  } else {
    console.log('[App] Wake Lock not supported');
  }
  
  // Set up geolocation callbacks BEFORE getting initial position
  onPositionUpdateCallback = handlePositionUpdate;
  onErrorCallback = handleGeoError;
  console.log('[App] Geolocation callbacks registered');
  
  // Get initial position to set up the map
  getInitialPosition();
}

/**
 * Create a small debug panel
 */
function initDebugPanel() {
  const debugDiv = document.createElement('div');
  debugDiv.id = 'debug-panel';
  debugDiv.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 20px;
    background: rgba(0,0,0,0.75);
    color: #0f0;
    padding: 8px 12px;
    border-radius: 12px;
    font-family: monospace;
    font-size: 11px;
    z-index: 2000;
    pointer-events: none;
    line-height: 1.4;
  `;
  debugDiv.innerHTML = 'Updates: 0<br>Last dist: -- m';
  document.body.appendChild(debugDiv);
}

/**
 * Update debug panel - FIXED: handle undefined/null distance
 */
function updateDebugPanel(distance) {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    const distStr = (distance != null && !isNaN(distance)) 
      ? distance.toFixed(2) + ' m' 
      : '-- m';
    panel.innerHTML = `Updates: ${updateCount}<br>Last dist: ${distStr}`;
  }
}

/**
 * Get the initial position and set up the map
 */
function getInitialPosition() {
  showStatus('Getting your location...', 0);
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      console.log('[App] Initial position:', latitude, longitude, 'accuracy:', accuracy);
      showStatus('Location acquired, starting tracking...', 2000);
      
      // Initialise the map
      initMap(latitude, longitude);
      
      // Restore trail if we have saved coordinates
      if (gameState && gameState.trailPoints && gameState.trailPoints.length > 0) {
        restoreTrail(gameState.trailPoints);
      }
      
      // Start tracking (callbacks are already set)
      const trackingStarted = startTracking();
      console.log('[App] Tracking started:', trackingStarted);
      
      if (!trackingStarted) {
        showError('Could not start position tracking');
      }
      
      // Update display
      updateDistanceDisplay(totalDistanceToday);
      
      // Set initial position flag
      initialPositionSet = true;
      
      showStatus('Ready to walk! 🦕', 4000);
    },
    (error) => {
      console.error('[App] Failed to get initial position:', error);
      showError('Could not get your location. Check GPS and permissions.');
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000
    }
  );
}

/**
 * Handle position updates from geo.js
 */
let gameState = null;

function handlePositionUpdate(data) {
  // Safety check - if data is undefined, return early
  if (!data) {
    console.warn('[App] handlePositionUpdate called with no data');
    return;
  }
  
  const { latitude, longitude, heading, distance, accuracy, timestamp } = data;
  
  updateCount++;
  
  // Show a debug status message (throttled to every 2 seconds max)
  const now = Date.now();
  if (now - lastDebugMsgTime > 2000) {
    const distStr = (distance != null) ? distance.toFixed(1) : '0.0';
    const accStr = (accuracy != null) ? Math.round(accuracy) : '?';
    showStatus(`📍 Update #${updateCount} | dist: ${distStr}m | acc: ${accStr}m`, 2000);
    lastDebugMsgTime = now;
  }
  
  // Update debug panel - FIXED: pass distance safely
  updateDebugPanel(distance || 0);
  
  // Update total distance for today
  if (distance && distance > 0) {
    totalDistanceToday += distance;
    updateDistanceDisplay(totalDistanceToday);
    console.log(`[App] Distance added: ${distance.toFixed(2)}m, total: ${totalDistanceToday.toFixed(2)}m`);
  }
  
  // Update map (arrow position and trail)
  if (initialPositionSet && latitude != null && longitude != null) {
    updateUserPosition(latitude, longitude, heading || 0);
  }
  
  // Save state periodically
  if (now - lastSaveTime > SAVE_INTERVAL) {
    saveCurrentState();
    lastSaveTime = now;
  }
}

/**
 * Handle geolocation errors
 */
function handleGeoError(message) {
  if (typeof showError === 'function') {
    showError('Geo Error: ' + message);
  }
  console.error('[App] Geo error:', message);
}

/**
 * Save the current game state
 */
async function saveCurrentState() {
  try {
    const state = {
      totalDistanceToday: totalDistanceToday,
      lastDate: new Date().toISOString(),
      trailPoints: getTrailCoordinates()
    };
    
    await saveGameState(state);
    gameState = state;
    console.log('[App] State saved:', Math.round(totalDistanceToday), 'm');
  } catch (error) {
    console.error('[App] Failed to save state:', error);
  }
}

/**
 * Load saved game state
 */
async function loadSavedState() {
  try {
    gameState = await loadGameState();
    
    if (isNewDay(gameState.lastDate)) {
      console.log('[App] New day detected, resetting distance');
      totalDistanceToday = 0;
    } else {
      totalDistanceToday = gameState.totalDistanceToday || 0;
      console.log('[App] Loaded state:', Math.round(totalDistanceToday), 'm');
    }
  } catch (error) {
    console.error('[App] Failed to load state:', error);
    totalDistanceToday = 0;
  }
}

/**
 * Request Wake Lock to keep screen on
 */
async function requestWakeLock() {
  if (!wakeLockSupported) return;
  
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    console.log('[App] Wake Lock acquired');
    if (typeof showWakeLockIndicator === 'function') {
      showWakeLockIndicator();
    }
    
    wakeLock.addEventListener('release', () => {
      console.log('[App] Wake Lock released');
      if (typeof hideWakeLockIndicator === 'function') {
        hideWakeLockIndicator();
      }
      
      if (document.visibilityState === 'visible') {
        setTimeout(() => requestWakeLock(), 1000);
      }
    });
  } catch (error) {
    console.warn('[App] Wake Lock request failed:', error);
    if (typeof hideWakeLockIndicator === 'function') {
      hideWakeLockIndicator();
    }
  }
}

/**
 * Re-acquire Wake Lock when visibility changes
 */
document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && wakeLockSupported) {
    if (!wakeLock || wakeLock.released) {
      console.log('[App] Visibility restored, re-acquiring Wake Lock');
      await requestWakeLock();
    }
  }
});

/**
 * Save state before the page is unloaded
 */
window.addEventListener('beforeunload', () => {
  saveCurrentState();
  if (wakeLock) {
    wakeLock.release().catch(() => {});
  }
});

/**
 * Save state when the page is hidden
 */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    saveCurrentState();
  }
});

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/jurassicwalk/sw.js')
      .then((registration) => {
        console.log('[App] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.error('[App] Service Worker registration failed:', error);
      });
  });
}

// Start the app when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);