// app.js - Main application controller

// Game state
let totalDistanceToday = 0;
let lastSaveTime = 0;
let wakeLock = null;
let wakeLockSupported = false;
let initialPositionSet = false;

// Save interval (milliseconds)
const SAVE_INTERVAL = 5000; // Save state every 5 seconds

/**
 * Initialise the application
 */
async function initApp() {
  console.log('[App] Starting Dino Walk...');
  
  // Initialise UI elements
  initUI();
  
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
  
  // Set up geolocation callbacks
  onPositionUpdateCallback = handlePositionUpdate;
  onErrorCallback = handleGeoError;
  
  // Get initial position to set up the map
  getInitialPosition();
}

/**
 * Get the initial position and set up the map
 */
function getInitialPosition() {
  showStatus('Getting your location...', 0);
  
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      
      console.log('[App] Initial position:', latitude, longitude);
      
      // Initialise the map
      initMap(latitude, longitude);
      
      // Restore trail if we have saved coordinates
      if (gameState && gameState.trailPoints && gameState.trailPoints.length > 0) {
        restoreTrail(gameState.trailPoints);
      }
      
      // Start tracking
      startTracking();
      
      // Update display
      updateDistanceDisplay(totalDistanceToday);
      
      // Set initial position flag
      initialPositionSet = true;
      
      showStatus('Ready to walk! 🦕', 3000);
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

/**
 * Handle position updates from geo.js
 */
let gameState = null;

function handlePositionUpdate(data) {
  const { latitude, longitude, heading, distance, accuracy } = data;
  
  // Update total distance for today
  if (distance > 0) {
    totalDistanceToday += distance;
    updateDistanceDisplay(totalDistanceToday);
  }
  
  // Update map
  if (initialPositionSet) {
    updateUserPosition(latitude, longitude, heading);
  }
  
  // Update GPS accuracy display periodically
  if (Math.random() < 0.1) { // ~10% chance each update
    showGPSAccuracy(accuracy);
  }
  
  // Save state periodically
  const now = Date.now();
  if (now - lastSaveTime > SAVE_INTERVAL) {
    saveCurrentState();
    lastSaveTime = now;
  }
}

/**
 * Handle geolocation errors
 */
function handleGeoError(message) {
  showError(message);
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
    
    // Check if it's a new day
    if (isNewDay(gameState.lastDate)) {
      console.log('[App] New day detected, resetting distance');
      totalDistanceToday = 0;
      // Keep trailPoints for Stage 2 (amber discovery)
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
    showWakeLockIndicator();
    
    // Handle Wake Lock release
    wakeLock.addEventListener('release', () => {
      console.log('[App] Wake Lock released');
      hideWakeLockIndicator();
      
      // Try to re-acquire if the page is still visible
      if (document.visibilityState === 'visible') {
        setTimeout(() => requestWakeLock(), 1000);
      }
    });
  } catch (error) {
    console.warn('[App] Wake Lock request failed:', error);
    hideWakeLockIndicator();
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
 * Save state when the page is hidden (app goes to background)
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