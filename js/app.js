// app.js – Jurassic Walk controller (Stage 2)

let totalDistanceToday = 0;
let amberFoundToday = 0;
let distanceSinceLastAmber = 0;
let nextAmberThreshold = 10;
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

// Audio context for amber found sound
let amberAudioCtx = null;

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

  playAmberSound();
  showToast('🟠 Amber found!\n-\nSent to lab for analysis.\n-\nResults announced tomorrow..', 15000);

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

/**
 * Retro 8-bit victory jingle for amber discovery
 */
function playAmberSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    console.warn('[Audio] Web Audio API not supported');
    return;
  }

  if (!amberAudioCtx) {
    amberAudioCtx = new AudioContext();
  }

  const ctx = amberAudioCtx;

  // Resume if suspended (browsers require user gesture)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;

  // Master output
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0, now);
  master.gain.linearRampToValueAtTime(0.65, now + 0.008);
  master.gain.setValueAtTime(0.65, now + 0.52);
  master.gain.exponentialRampToValueAtTime(0.001, now + 0.66);
  master.connect(ctx.destination);

  // Note sequence: C5 → E5 → G5 → A5 → C6 → A5 → G5 → C6
  const notes = [
    { frequency: 523.25, duration: 0.070 },   // C5
    { frequency: 659.25, duration: 0.070 },   // E5
    { frequency: 783.99, duration: 0.070 },   // G5
    { frequency: 880.00, duration: 0.070 },   // A5
    { frequency: 1046.50, duration: 0.070 },  // C6
    { frequency: 880.00, duration: 0.070 },   // A5
    { frequency: 783.99, duration: 0.070 },   // G5
    { frequency: 1046.50, duration: 0.120 }   // C6 (held longer)
  ];

  let t = now;

  for (const note of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    // 8-bit square wave
    osc.type = 'square';
    osc.frequency.setValueAtTime(note.frequency, t);

    // Per-note envelope
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(0.24, t + 0.004);
    gain.gain.setValueAtTime(0.24, t + note.duration * 0.72);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + note.duration);

    osc.connect(gain);
    gain.connect(master);

    osc.start(t);
    osc.stop(t + note.duration + 0.005);

    t += note.duration;
  }
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
      nextAmberThreshold = gameState.nextAmberThreshold || generateAmberThreshold();
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