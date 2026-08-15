// app.js – Jurassic Walk controller (Stage 3/4 — with stats page)

let totalDistanceToday = 0;
let amberFoundToday = 0;
let lifetimeAmberFound = 0;
let lifetimeDistance = 0;
let weeklyDistance = 0;
let distanceSinceLastAmber = 0;
let nextAmberThreshold = 100;
let lastSaveTime = 0;
let wakeLock = null;
let wakeLockSupported = false;
let initialPositionSet = false;
let gameActive = false;
let amberPieces = [];          // Analyzed DNA-positive pieces (visible in incubator)
let pendingAmber = [];         // Found today, awaiting lab results
let incubators = [
  { active: false, level: null, species: null, distanceRequired: 0, distanceWalked: 0 }
];
let hatchedDinosaurs = [];
let gpsReady = false;

const SAVE_INTERVAL = 5000;

// Dinosaur lists
const BRONZE = ['Hypsilophodon','Dryosaurus','Lesothosaurus','Iguanodon','Pachycephalosaurus','Gallimimus','Maiasaura','Scelidosaurus','Parasaurolophus'];
const SILVER = ['Allosaurus','Carnotaurus','Ankylosaurus','Stegosaurus','Corythosaurus','Dilophosaurus','Baryonyx','Megalosaurus','Diplodocus','Pteranodon','Brachiosaurus'];
const GOLD = ['Tyrannosaurus rex','Velociraptor','Spinosaurus','Giganotosaurus','Triceratops','Deinonychus','Quetzalcoatlus','Argentinosaurus'];

let amberAudioContext = null;

window.onerror = function(msg, src, lineno) {
  console.error('Error:', msg, 'at', src, lineno);
  if (typeof showError === 'function') showError('Something went wrong. Please refresh.');
  return true;
};

async function initApp() {
  console.log('[App] Starting Jurassic Walk...');
  initUI();
  initIncubatorMenu();
  initStatsPage();

  try { await openDB(); } catch (e) { showError('Storage not available.'); }

  await loadSavedState();
  updateDistanceDisplay(totalDistanceToday);
  updateAmberDisplay(amberFoundToday);

  // Lab results check BEFORE GPS starts (prevents date overwrite)
  if (isNewDay(gameState?.lastDate)) {
    const newPieces = processLabResults();
    if (newPieces.length > 0 || totalAmberYesterday > 0) {
      showLabModal(buildLabHTML(newPieces, totalAmberYesterday));
    }
  }

  // Weekly reset check
  if (isNewWeek(gameState?.lastDate)) {
    weeklyDistance = 0;
    console.log('[App] New week — weekly distance reset');
  }

  // Wake lock
  wakeLockSupported = 'wakeLock' in navigator;
  if (wakeLockSupported) {
    await requestWakeLock();
  }

  // Set callbacks
  onPositionUpdateCallback = handlePositionUpdate;
  onErrorCallback = handleGeoError;

  // Start GPS LAST
  getInitialPosition();
}

let totalAmberYesterday = 0;

function getInitialPosition() {
  const defaultLat = 51.5074;
  const defaultLng = -0.1278;

  initMap(defaultLat, defaultLng);

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;

      console.log('[App] GPS position acquired:', latitude, longitude);

      initMap(latitude, longitude);

      if (gameState && gameState.trailPoints && gameState.trailPoints.length > 0) {
        restoreTrail(gameState.trailPoints);
      }

      const started = startTracking();
      if (!started) showError('Could not start location tracking');

      initialPositionSet = true;
      gpsReady = true;

      if (!gameActive) {
        showStartOverlay();
      }

      hideToast();
      console.log('[App] Ready to walk');
    },
    (err) => {
      console.error('[App] Failed to get initial position:', err);
      showError('Could not get your location. Check GPS and permissions.');
      if (!gameActive) {
        showStartOverlay();
      }
      hideToast();
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
    lifetimeDistance += distance;
    weeklyDistance += distance;
    distanceSinceLastAmber += distance;
    updateDistanceDisplay(totalDistanceToday);

    // Incubator progress
    incubators.forEach(inc => {
      if (inc.active) {
        inc.distanceWalked += distance;
        if (inc.distanceWalked >= inc.distanceRequired) {
          // Hatch!
          const level = inc.level;
          const species = inc.species;

          const existing = hatchedDinosaurs.find(d => d.species === species);
          if (existing) {
            existing.count++;
          } else {
            hatchedDinosaurs.push({ species, count: 1 });
          }

          inc.active = false;
          inc.level = null;
          inc.species = null;
          inc.distanceRequired = 0;
          inc.distanceWalked = 0;

          playAmberDiscovery();
          showHatchModal(level, species);
        }
      }
    });

    // Amber discovery
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
  pendingAmber.push(piece);   // Goes to PENDING, not amberPieces

  distanceSinceLastAmber = 0;
  nextAmberThreshold = generateAmberThreshold();

  playAmberDiscovery();
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
    species,
    incubated: false
  };
}

function processLabResults() {
  const today = new Date().toISOString().split('T')[0];
  const newPositives = [];

  // All pending amber from previous days
  const previousPending = pendingAmber.filter(p => p.dateFound < today);
  totalAmberYesterday = previousPending.length;

  // Process each pending piece
  previousPending.forEach(piece => {
    piece.analyzed = true;
    if (piece.hasDNA) {
      // Move to main amberPieces (visible in incubator)
      amberPieces.push(piece);
      newPositives.push(piece);
    }
    // Non-DNA pieces are discarded
  });

  // Remove processed pieces from pending
  pendingAmber = pendingAmber.filter(p => p.dateFound >= today);

  // Increment lifetime amber found
  lifetimeAmberFound += totalAmberYesterday;

  // Reset lastSaveTime so first GPS update doesn't immediately re-save
  lastSaveTime = Date.now();

  saveCurrentState();
  return newPositives;
}

function buildLabHTML(newPieces, totalAmber) {
  if (totalAmber === 0) {
    return '<p>No amber pieces to test.</p>';
  }

  if (newPieces.length === 0) {
    return `
      <p>${totalAmber} amber piece(s) came back from testing.</p>
      <p>None contained dinosaur DNA.</p>
      <p>Keep walking to increase your chance of finding DNA!</p>
    `;
  }

  let html = `<p>${totalAmber} amber piece(s) tested.</p>`;
  html += `<p>${newPieces.length} contained dinosaur DNA!</p>`;
  html += '<ul style="list-style:none;padding:0;">';
  newPieces.forEach(p => {
    html += `<li class="positive">🟠 ${p.level} level dinosaur DNA detected</li>`;
  });
  html += '</ul>';
  html += '<p>Tap the amber counter to open your incubator and hatch them!</p>';
  return html;
}

function playAmberDiscovery() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;

  if (!AudioContext) {
    console.warn('[Audio] Web Audio API not supported');
    return;
  }

  if (!amberAudioContext) {
    amberAudioContext = new AudioContext();
  }

  const ctx = amberAudioContext;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.gain.linearRampToValueAtTime(0.55, now + 0.015);
  master.gain.setValueAtTime(0.55, now + 1.65);
  master.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
  master.connect(ctx.destination);

  const notes = [
    { frequency: 523.25,  time: 0.00 },
    { frequency: 587.33,  time: 0.12 },
    { frequency: 659.25,  time: 0.24 },
    { frequency: 783.99,  time: 0.36 },
    { frequency: 880.00,  time: 0.48 },
    { frequency: 1046.50, time: 0.62 },
    { frequency: 1174.66, time: 0.76 },
    { frequency: 1318.51, time: 0.90 },
    { frequency: 1567.98, time: 1.04 },
    { frequency: 1760.00, time: 1.18 }
  ];

  notes.forEach(note => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + note.time;

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.frequency, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.22, start + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.65);

    osc.connect(gain);
    gain.connect(master);

    osc.start(start);
    osc.stop(start + 0.7);
  });

  notes.forEach(note => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const start = now + note.time;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(note.frequency * 2, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.linearRampToValueAtTime(0.055, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

    osc.connect(gain);
    gain.connect(master);

    osc.start(start);
    osc.stop(start + 0.5);
  });

  const finalOsc = ctx.createOscillator();
  const finalGain = ctx.createGain();
  const finalStart = now + 1.32;

  finalOsc.type = 'triangle';
  finalOsc.frequency.setValueAtTime(2093.00, finalStart);

  finalGain.gain.setValueAtTime(0.0001, finalStart);
  finalGain.gain.linearRampToValueAtTime(0.18, finalStart + 0.008);
  finalGain.gain.exponentialRampToValueAtTime(0.001, finalStart + 0.65);

  finalOsc.connect(finalGain);
  finalGain.connect(master);

  finalOsc.start(finalStart);
  finalOsc.stop(finalStart + 0.7);
}

function startGame() {
  gameActive = true;
  hideStartOverlay();

  if (gpsReady) {
    showToast('Walk started! 🦕');
  } else {
    showToast('Walk started!\nWaiting for GPS signal...', 4000);
  }
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
      lifetimeAmberFound,
      lifetimeDistance,
      weeklyDistance,
      lastDate: new Date().toISOString(),
      trailPoints: getTrailCoordinates(),
      amberPieces,
      pendingAmber,
      incubators,
      hatchedDinosaurs,
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
      pendingAmber = gameState.pendingAmber || [];
      incubators = gameState.incubators || [
        { active: false, level: null, species: null, distanceRequired: 0, distanceWalked: 0 }
      ];
      hatchedDinosaurs = gameState.hatchedDinosaurs || [];
      lifetimeAmberFound = gameState.lifetimeAmberFound || 0;
      lifetimeDistance = gameState.lifetimeDistance || 0;
      weeklyDistance = gameState.weeklyDistance || 0;
    } else {
      totalDistanceToday = gameState.totalDistanceToday || 0;
      amberFoundToday = gameState.amberFoundToday || 0;
      distanceSinceLastAmber = gameState.distanceSinceLastAmber || 0;
      nextAmberThreshold = gameState.nextAmberThreshold || generateAmberThreshold();
      amberPieces = gameState.amberPieces || [];
      pendingAmber = gameState.pendingAmber || [];
      incubators = gameState.incubators || [
        { active: false, level: null, species: null, distanceRequired: 0, distanceWalked: 0 }
      ];
      hatchedDinosaurs = gameState.hatchedDinosaurs || [];
      lifetimeAmberFound = gameState.lifetimeAmberFound || 0;
      lifetimeDistance = gameState.lifetimeDistance || 0;
      weeklyDistance = gameState.weeklyDistance || 0;
    }
  } catch (e) {
    totalDistanceToday = 0;
    amberFoundToday = 0;
    distanceSinceLastAmber = 0;
    nextAmberThreshold = generateAmberThreshold();
    amberPieces = [];
    pendingAmber = [];
    incubators = [
      { active: false, level: null, species: null, distanceRequired: 0, distanceWalked: 0 }
    ];
    hatchedDinosaurs = [];
    lifetimeAmberFound = 0;
    lifetimeDistance = 0;
    weeklyDistance = 0;
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

// Clean up when page is hidden
window.addEventListener('pagehide', () => {
  if (typeof stopTracking === 'function') {
    stopTracking();
  }
  saveCurrentState();
});

// Handle bfcache restore
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    console.log('[App] Page restored from bfcache, reloading...');
    window.location.reload();
  }
});

// Reload if app was hidden for more than 1 hour
let lastVisibilityTime = Date.now();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    const now = Date.now();
    if (now - lastVisibilityTime > 3600000) {
      console.log('[App] Hidden for > 1 hour, reloading...');
      window.location.reload();
    }
  } else {
    lastVisibilityTime = Date.now();
  }
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/jurassicwalk/sw.js')
      .then(reg => console.log('[App] SW registered'))
      .catch(err => console.error('[App] SW failed:', err));
  });
}

document.addEventListener('DOMContentLoaded', initApp);