// app.js - Main application controller (clean version)

// Game state
let totalDistanceToday = 0;
let lastSaveTime = 0;
let wakeLock = null;
let wakeLockSupported = false;
let initialPositionSet = false;

// Save interval (milliseconds)
const SAVE_INTERVAL = 5000;

/**
 * Global error handler
 */
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Error:', message, 'at', source, lineno);
  if (typeof showError === 'function') {
    showError('Something went wrong. Please refresh the page.');
  }
  return true;
};

/**
 * Initialise the application
 */
async function initApp() {
  console.log('[App] Starting Dino Walk...');
  
  initUI();
  
  try {
    await openDB();
    console.log('[App] Database ready');
  } catch (error) {
    console.error('[App] Failed to open database:', error);
    showError('Storage not available. Progress won\'t be saved.');
  }
  
  await loadSavedState();
  
  // Wake Lock setup
  wakeLockSupported = 'wakeLock' in navigator;
  if (wakeLockSupported) {
    await requestWakeLock();
    // Show a brief toast to let user know the screen will stay on
    showToast('🔆 Screen will stay awake while you walk');
  }
  
  // Set callbacks BEFORE getting position
  onPositionUpdateCallback = handlePositionUpdate;
  onErrorCallback = handleGeoError;
  
  getInitialPosition();
  
  // Show PWA install prompt after a delay (if applicable)
  showPWAPrompt();
}

function getInitialPosition() {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      
      console.log('[App] Initial position:', latitude, longitude);
      
      initMap(latitude, longitude);
      
      if (gameState && gameState.trailPoints && gameState.trailPoints.length > 0) {
        restoreTrail(gameState.trailPoints);
      }
      
      const trackingStarted = startTracking();
      if (!trackingStarted) {
        showError('Could not start location tracking');
      }
      
      updateDistanceDisplay(totalDistanceToday);
      initialPositionSet = true;
      
      console.log('[App] Ready');
    },
    (error) => {
      console.error('[App] Failed to get initial position:', error);
      showError('Could not get your location. Please check GPS and permissions.');
    },
    {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 60000
    }
  );
}

let gameState = null;

function handlePositionUpdate(data) {
  if (!data) return;
  
  const { latitude, longitude, heading, distance } = data;
  
  // Update total distance
  if (distance && distance > 0) {
    totalDistanceToday += distance;
    updateDistanceDisplay(totalDistanceToday);
  }
  
  // Update map
  if (initialPositionSet && latitude != null && longitude != null) {
    updateUserPosition(latitude, longitude, heading || 0);
  }
  
  // Save state periodically
  const now = Date.now();
  if (now - lastSaveTime > SAVE_INTERVAL) {
    saveCurrentState();
    lastSaveTime = now;
  }
}

function handleGeoError(message) {
  showError(message);
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
  } catch (error) {
    console.error('[App] Failed to save state:', error);
  }
}

async function loadSavedState() {
  try {
    gameState = await loadGameState();
    
    if (isNewDay(gameState.lastDate)) {
      console.log('[App] New day - resetting distance');
      totalDistanceToday = 0;
    } else {
      totalDistanceToday = gameState.totalDistanceToday || 0;
      console.log('[App] Loaded distance:', Math.round(totalDistanceToday), 'm');
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
    console.log('[App] Wake Lock active');
    
    wakeLock.addEventListener('release', () => {
      console.log('[App] Wake Lock released');
      if (document.visibilityState === 'visible') {
        setTimeout(() => requestWakeLock(), 1000);
      }
    });
  } catch (error) {
    console.warn('[App] Wake Lock not available:', error);
  }
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && wakeLockSupported) {
    if (!wakeLock || wakeLock.released) {
      await requestWakeLock();
    }
  }
  if (document.visibilityState === 'hidden') {
    saveCurrentState();
  }
});

window.addEventListener('beforeunload', () => {
  saveCurrentState();
  if (wakeLock) wakeLock.release().catch(() => {});
});

// Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/jurassicwalk/sw.js')
      .then(reg => console.log('[App] SW registered'))
      .catch(err => console.error('[App] SW registration failed:', err));
  });
}

document.addEventListener('DOMContentLoaded', initApp);