// app.js - Main application controller (debug mode v2)

// Game state
let totalDistanceToday = 0;
let lastSaveTime = 0;
let wakeLock = null;
let wakeLockSupported = false;
let initialPositionSet = false;
let updateCount = 0;
let lastDebugMsgTime = 0;
let lastLat = null;
let lastLng = null;

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
  console.log('[App] Starting Dino Walk (debug mode v2)...');
  
  initUI();
  initDebugPanel();
  
  try {
    await openDB();
    console.log('[App] Database ready');
  } catch (error) {
    console.error('[App] Failed to open database:', error);
    showError('Storage not available.');
  }
  
  await loadSavedState();
  
  wakeLockSupported = 'wakeLock' in navigator;
  if (wakeLockSupported) {
    console.log('[App] Wake Lock supported');
    await requestWakeLock();
  } else {
    console.log('[App] Wake Lock not supported');
  }
  
  // Set callbacks BEFORE getting position
  onPositionUpdateCallback = handlePositionUpdate;
  onErrorCallback = handleGeoError;
  console.log('[App] Callbacks registered');
  
  getInitialPosition();
}

/**
 * Create debug panel with more info
 */
function initDebugPanel() {
  const debugDiv = document.createElement('div');
  debugDiv.id = 'debug-panel';
  debugDiv.style.cssText = `
    position: fixed;
    bottom: 30px;
    right: 20px;
    background: rgba(0,0,0,0.8);
    color: #0f0;
    padding: 10px 14px;
    border-radius: 12px;
    font-family: monospace;
    font-size: 11px;
    z-index: 2000;
    pointer-events: none;
    line-height: 1.6;
    max-width: 180px;
  `;
  debugDiv.innerHTML = `
    Updates: 0<br>
    Dist: -- m<br>
    Acc: -- m<br>
    Lat: --<br>
    Lng: --
  `;
  document.body.appendChild(debugDiv);
}

function updateDebugPanel(distance, accuracy, lat, lng) {
  const panel = document.getElementById('debug-panel');
  if (panel) {
    const distStr = (distance != null && !isNaN(distance)) ? distance.toFixed(2) : '--';
    const accStr = (accuracy != null && !isNaN(accuracy)) ? Math.round(accuracy) : '--';
    const latStr = (lat != null) ? lat.toFixed(6) : '--';
    const lngStr = (lng != null) ? lng.toFixed(6) : '--';
    
    panel.innerHTML = `
      Updates: ${updateCount}<br>
      Dist: ${distStr} m<br>
      Acc: ${accStr} m<br>
      Lat: ${latStr}<br>
      Lng: ${lngStr}
    `;
  }
}

/**
 * Get the initial position
 */
function getInitialPosition() {
  showStatus('Getting your location...', 0);
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      
      console.log('[App] Initial position:', latitude, longitude, 'accuracy:', accuracy);
      showStatus('Location acquired, starting tracking...', 2000);
      
      initMap(latitude, longitude);
      
      if (gameState && gameState.trailPoints && gameState.trailPoints.length > 0) {
        restoreTrail(gameState.trailPoints);
      }
      
      const trackingStarted = startTracking();
      console.log('[App] Tracking started:', trackingStarted);
      
      if (!trackingStarted) {
        showError('Could not start position tracking');
      }
      
      updateDistanceDisplay(totalDistanceToday);
      initialPositionSet = true;
      
      // Show initial coords in debug
      updateDebugPanel(0, accuracy, latitude, longitude);
      
      showStatus('Ready to walk! 🦕', 4000);
    },
    (error) => {
      console.error('[App] Failed to get initial position:', error);
      showError('Could not get your location.');
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
  if (!data) {
    console.warn('[App] handlePositionUpdate called with no data');
    return;
  }
  
  const { latitude, longitude, heading, distance, accuracy, timestamp } = data;
  
  updateCount++;
  
  // Store for debug
  lastLat = latitude;
  lastLng = longitude;
  
  // Show a debug status message (every 2 seconds)
  const now = Date.now();
  if (now - lastDebugMsgTime > 2000) {
    const distStr = (distance != null) ? distance.toFixed(1) : '0.0';
    const accStr = (accuracy != null) ? Math.round(accuracy) + 'm' : '?m';
    const latStr = (latitude != null) ? latitude.toFixed(5) : '?';
    showStatus(`📍 #${updateCount} | dist:${distStr}m | acc:${accStr} | lat:${latStr}`, 2000);
    lastDebugMsgTime = now;
  }
  
  // Update debug panel with all values
  updateDebugPanel(distance || 0, accuracy, latitude, longitude);
  
  // Update total distance
  if (distance && distance > 0) {
    totalDistanceToday += distance;
    updateDistanceDisplay(totalDistanceToday);
    console.log(`[App] Distance: ${distance.toFixed(2)}m, Total: ${totalDistanceToday.toFixed(2)}m`);
  }
  
  // Update map
  if (initialPositionSet && latitude != null && longitude != null) {
    updateUserPosition(latitude, longitude, heading || 0);
  }
  
  // Save state periodically
  if (now - lastSaveTime > SAVE_INTERVAL) {
    saveCurrentState();
    lastSaveTime = now;
  }
}

function handleGeoError(message) {
  if (typeof showError === 'function') {
    showError('Geo Error: ' + message);
  }
  console.error('[App] Geo error:', message);
}

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

async function loadSavedState() {
  try {
    gameState = await loadGameState();
    if (isNewDay(gameState.lastDate)) {
      console.log('[App] New day, resetting distance');
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

async function requestWakeLock() {
  if (!wakeLockSupported) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    console.log('[App] Wake Lock acquired');
    if (typeof showWakeLockIndicator === 'function') showWakeLockIndicator();
    wakeLock.addEventListener('release', () => {
      console.log('[App] Wake Lock released');
      if (typeof hideWakeLockIndicator === 'function') hideWakeLockIndicator();
      if (document.visibilityState === 'visible') {
        setTimeout(() => requestWakeLock(), 1000);
      }
    });
  } catch (error) {
    console.warn('[App] Wake Lock failed:', error);
    if (typeof hideWakeLockIndicator === 'function') hideWakeLockIndicator();
  }
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && wakeLockSupported) {
    if (!wakeLock || wakeLock.released) {
      console.log('[App] Re-acquiring Wake Lock');
      await requestWakeLock();
    }
  }
});

window.addEventListener('beforeunload', () => {
  saveCurrentState();
  if (wakeLock) wakeLock.release().catch(() => {});
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') saveCurrentState();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/jurassicwalk/sw.js')
      .then(reg => console.log('[App] SW registered:', reg.scope))
      .catch(err => console.error('[App] SW registration failed:', err));
  });
}

document.addEventListener('DOMContentLoaded', initApp);