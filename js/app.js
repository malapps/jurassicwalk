// app.js – Jurassic Walk controller (Stage 2 - with amber test override)

let totalDistanceToday = 0;
let amberFoundToday = 0;
let distanceSinceLastAmber = 0;
let nextAmberThreshold = 100;
let lastSaveTime = 0;
let wakeLock = null;
let wakeLockSupported = false;
let initialPositionSet = false;
let gameActive = false;
let amberPieces = [];

const SAVE_INTERVAL = 5000;

// Dinosaur lists
const BRONZE = ['Hypsilophodon','Dryosaurus','Lesothosaurus','Iguanodon','Pachycephalosaurus','Gallimimus','Maiasaura','Scelidosaurus','Parasaurolophus'];
const SILVER = ['Allosaurus','Carnotaurus','Ankylosaurus','Stegosaurus','Corythosaurus','Dilophosaurus','Baryonyx','Megalosaurus','Diplodocus','Pteranodon','Brachiosaurus'];
const GOLD = ['Tyrannosaurus rex','Velociraptor','Spinosaurus','Giganotosaurus','Triceratops','Deinonychus','Quetzalcoatlus','Argentinosaurus'];

let audioCtx = null;

window.onerror = function(msg, src, lineno) {
  console.error('Error:', msg, 'at', src, lineno);
  if (typeof showError === 'function') showError('Something went wrong. Please refresh.');
  return true;
};

async function initApp() {
  console.log('[App] Starting Jurassic Walk...');
  initUI();

  try { await openDB(); } catch (e) { showError('Storage not available.'); }

  await loadSavedState();
  updateDistanceDisplay(totalDistanceToday);
  updateAmberDisplay(amberFoundToday);

  wakeLockSupported = 'wakeLock' in navigator;
  if (wakeLockSupported) {
    await requestWakeLock();
    showToast('🔆 Screen will stay awake while you walk');
  }

  onPositionUpdateCallback = handlePositionUpdate;
  onErrorCallback = handleGeoError;

  if (isNewDay(gameState?.lastDate)) {
    const newPieces = processLabResults();
    if (newPieces.length > 0) {
      showLabModal(buildLabHTML(newPieces));
    } else {
      showStartOverlay();
    }
  } else {
    showStartOverlay();
  }

  getInitialPosition();
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

      gameActive = false;
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

  if (initialPositionSet && latitude != null && longitude != null) {
    updateUserPosition(latitude, longitude, heading);
  }

  if (gameActive && distance > 0) {
    totalDistanceToday += distance;
    distanceSinceLastAmber += distance;
    updateDistanceDisplay(totalDistanceToday);

    if (distanceSinceLastAmber >= nextAmberThreshold) {
      discoverAmber();
    }
  }

  const now = Date.now();
  if (now - lastSaveTime > SAVE_INTERVAL) {
    saveCurrentState();
    lastSaveTime = now;
  }
}

function discoverAmber() {
  amberFoundToday++;
  updateAmberDisplay(amberFoundToday);

  const piece = createAmberPiece();
  amberPieces.push(piece);

  distanceSinceLastAmber = 0;
  nextAmberThreshold = generateAmberThreshold();

  playPing();
  showToast('🟠 Amber found! Sent to lab. Results tomorrow.', 5000);

  saveCurrentState();
}

function createAmberPiece() {
  const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const today = new Date().toISOString().split('T')[0];

  const hasDNA = Math.random() < 0.3;
  let level = null;
  let species = null;

  if (hasDNA) {
    const rand = Math.random();
    if (rand < 0.342) {
      level = 'Bronze';
      species = BRONZE[Math.floor(Math.random() * BRONZE.length)];
    } else if (rand < 0.76) {
      level = 'Silver';
      species = SILVER[Math.floor(Math.random() * SILVER.length)];
    } else {
      level = 'Gold';
      species = GOLD[Math.floor(Math.random() * GOLD.length)];
    }
  }

  return {
    id,
    dateFound: today,
    analyzed: false,
    hasDNA,
    level,
    species
  };
}

function processLabResults() {
  const today = new Date().toISOString().split('T')[0];
  const newPositives = [];

  amberPieces.forEach(piece => {
    if (!piece.analyzed && piece.dateFound < today) {
      piece.analyzed = true;
      if (piece.hasDNA) {
        newPositives.push(piece);
      }
    }
  });

  saveCurrentState();
  return newPositives;
}

function buildLabHTML(newPieces) {
  if (newPieces.length === 0) {
    return '<p>No new dinosaur DNA found.</p>';
  }

  let html = `<p>${newPieces.length} amber piece(s) contained DNA!</p>`;
  html += '<ul style="list-style:none;padding:0;">';
  newPieces.forEach(p => {
    html += `<li class="positive">🟠 ${p.level} level dinosaur DNA detected</li>`;
  });
  html += '</ul>';
  html += '<p>Incubate them to discover the exact species!</p>';
  return html;
}

function playPing() {
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('Audio not available');
      return;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(800, now);
  osc.frequency.linearRampToValueAtTime(1000, now + 0.15);
  osc.frequency.linearRampToValueAtTime(600, now + 0.3);

  gain.gain.setValueAtTime(0.3, now);
  gain.gain.linearRampToValueAtTime(0, now + 0.35);

  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start(now);
  osc.stop(now + 0.35);
}

function startGame() {
  gameActive = true;
  hideStartOverlay();
  showToast('Walk started! 🦕');
}

function togglePause() {
  if (gameActive) {
    gameActive = false;
    showStartOverlay();
    showToast('Walk paused');
  } else {
    gameActive = true;
    hideStartOverlay();
    showToast('Walk resumed 🦕');
  }
}

function handleGeoError(msg) {
  showError(msg);
}

async function saveCurrentState() {
  try {
    const state = {
      totalDistanceToday,
      amberFoundToday,
      lastDate: new Date().toISOString(),
      trailPoints: getTrailCoordinates(),
      amberPieces,
      distanceSinceLastAmber,
      nextAmberThreshold
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
      amberFoundToday = 0;
      distanceSinceLastAmber = 0;
      nextAmberThreshold = generateAmberThreshold();
      amberPieces = gameState.amberPieces || [];
    } else {
      totalDistanceToday = gameState.totalDistanceToday || 0;
      amberFoundToday = gameState.amberFoundToday || 0;
      distanceSinceLastAmber = gameState.distanceSinceLastAmber || 0;
      
      // TEMPORARY: Force low threshold for testing amber discovery
      nextAmberThreshold = 20;
      // ORIGINAL: nextAmberThreshold = gameState.nextAmberThreshold || generateAmberThreshold();
      
      amberPieces = gameState.amberPieces || [];
    }
  } catch (e) {
    totalDistanceToday = 0;
    amberFoundToday = 0;
    distanceSinceLastAmber = 0;
    nextAmberThreshold = generateAmberThreshold();
    amberPieces = [];
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