// app.js – Jurassic Walk controller

let totalDistanceToday = 0;
let lastSaveTime = 0;
let wakeLock = null;
let wakeLockSupported = false;
let initialPositionSet = false;
let gameActive = false;          // NEW: distance only accumulates when true

const SAVE_INTERVAL = 5000;

window.onerror = function(msg, src, lineno) {
  console.error('Error:', msg, 'at', src, lineno);
  if (typeof showError === 'function') showError('Something went wrong. Please refresh.');
  return true;
};

async function initApp() {
  console.log('[App] Starting Jurassic Walk...');
  initUI();

  try {
    await openDB();
  } catch (e) {
    showError('Storage not available. Progress won\'t be saved.');
  }

  await loadSavedState();
  updateDistanceDisplay(totalDistanceToday);

  wakeLockSupported = 'wakeLock' in navigator;
  if (wakeLockSupported) {
    await requestWakeLock();
    showToast('🔆 Screen will stay awake while you walk');
  }

  onPositionUpdateCallback = handlePositionUpdate;
  onErrorCallback = handleGeoError;

  getInitialPosition();
  // Don't show PWA prompt immediately; it will appear via beforeinstallprompt
}

function getInitialPosition() {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      initMap(latitude, longitude);

      if (gameState && gameState.trailPoints && gameState.trailPoints.length > 0) {
        restoreTrail(gameState.trailPoints);
      }

      const started = startTracking();
      if (!started) showError('Could not start location tracking');

      // Show start overlay – game is not active yet
      showStartOverlay();
      initialPositionSet = true;
    },
    (err) => {
      showError('Could not get your location.');
      console.error(err);
    },
    { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
  );
}

let gameState = null;

function handlePositionUpdate(data) {
  if (!data) return;
  const { latitude, longitude, heading, distance } = data;

  // Always update map position (arrow, trail)
  if (initialPositionSet && latitude != null && longitude != null) {
    updateUserPosition(latitude, longitude, heading);
  }

  // Only accumulate distance when game is active
  if (gameActive && distance > 0) {
    totalDistanceToday += distance;
    updateDistanceDisplay(totalDistanceToday);
  }

  const now = Date.now();
  if (now - lastSaveTime > SAVE_INTERVAL) {
    saveCurrentState();
    lastSaveTime = now;
  }
}

// Called when START WALK button is pressed
function startGame() {
  gameActive = true;
  hideStartOverlay();
  showToast('Walk started! 🦕');
  console.log('[App] Game active');
}

// Called when pause button is pressed
function pauseGame() {
  gameActive = false;
  showStartOverlay();
  showToast('Walk paused');
  console.log('[App] Game paused');
}

function handleGeoError(msg) {
  showError(msg);
}

async function saveCurrentState() {
  try {
    const state = {
      totalDistanceToday,
      lastDate: new Date().toISOString(),
      trailPoints: getTrailCoordinates()
    };
    await saveGameState(state);
    gameState = state;
  } catch (e) {
    console.error('[App] Save failed:', e);
  }
}

async function loadSavedState() {
  try {
    gameState = await loadGameState();
    if (isNewDay(gameState.lastDate)) {
      totalDistanceToday = 0;
    } else {
      totalDistanceToday = gameState.totalDistanceToday || 0;
    }
  } catch (e) {
    totalDistanceToday = 0;
  }
}

async function requestWakeLock() {
  if (!wakeLockSupported) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
    wakeLock.addEventListener('release', () => {
      if (document.visibilityState === 'visible') setTimeout(() => requestWakeLock(), 1000);
    });
  } catch (e) {}
}

document.addEventListener('visibilitychange', async () => {
  if (document.visibilityState === 'visible' && wakeLockSupported) {
    if (!wakeLock || wakeLock.released) await requestWakeLock();
  }
  if (document.visibilityState === 'hidden') saveCurrentState();
});

window.addEventListener('beforeunload', () => {
  saveCurrentState();
  if (wakeLock) wakeLock.release().catch(() => {});
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/jurassicwalk/sw.js')
      .then(reg => console.log('[App] SW registered'))
      .catch(err => console.error('[App] SW failed:', err));
  });
}

document.addEventListener('DOMContentLoaded', initApp);