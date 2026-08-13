// state.js – Game state persistence using localStorage

const STORAGE_PREFIX = 'jwalk_';

function saveValue(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('[State] Error saving', key, e);
    throw e;
  }
}

function loadValue(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('[State] Error loading', key, e);
    return null;
  }
}

async function saveGameState(state) {
  saveValue('totalDistanceToday', state.totalDistanceToday);
  saveValue('pendingAmber', state.pendingAmber);
  saveValue('amberFoundToday', state.amberFoundToday);
  saveValue('lifetimeAmberFound', state.lifetimeAmberFound);
  saveValue('lifetimeDistance', state.lifetimeDistance);
  saveValue('weeklyDistance', state.weeklyDistance);
  saveValue('lastDate', state.lastDate);
  saveValue('trailPoints', state.trailPoints);
  saveValue('amberPieces', state.amberPieces);
  saveValue('incubators', state.incubators);
  saveValue('hatchedDinosaurs', state.hatchedDinosaurs);
  saveValue('distanceSinceLastAmber', state.distanceSinceLastAmber);
  saveValue('nextAmberThreshold', state.nextAmberThreshold);
}

async function loadGameState() {
  const totalDistanceToday = loadValue('totalDistanceToday') || 0;
  const pendingAmber = loadValue('pendingAmber') || [];
  const amberFoundToday = loadValue('amberFoundToday') || 0;
  const lifetimeAmberFound = loadValue('lifetimeAmberFound') || 0;
  const lifetimeDistance = loadValue('lifetimeDistance') || 0;
  const weeklyDistance = loadValue('weeklyDistance') || 0;
  const lastDate = loadValue('lastDate') || null;
  const trailPoints = loadValue('trailPoints') || [];
  const amberPieces = loadValue('amberPieces') || [];
  const incubators = loadValue('incubators') || [
    { active: false, level: null, species: null, distanceRequired: 0, distanceWalked: 0 }
  ];
  const hatchedDinosaurs = loadValue('hatchedDinosaurs') || [];
  const distanceSinceLastAmber = loadValue('distanceSinceLastAmber') || 0;
  const nextAmberThreshold = loadValue('nextAmberThreshold') || generateAmberThreshold();

  return {
    totalDistanceToday,
    amberFoundToday,
    lifetimeAmberFound,
    lifetimeDistance,
    weeklyDistance,
    lastDate,
    trailPoints,
    amberPieces,
    incubators,
    hatchedDinosaurs,
    distanceSinceLastAmber,
    nextAmberThreshold
  };
}

async function openDB() {
  try {
    localStorage.setItem('jwalk_test', '1');
    localStorage.removeItem('jwalk_test');
    console.log('[State] localStorage available');
    return true;
  } catch (e) {
    console.error('[State] localStorage unavailable');
    throw new Error('localStorage not available');
  }
}

function isNewDay(lastDateStr) {
  if (!lastDateStr) return true;
  const last = new Date(lastDateStr);
  const now = new Date();
  return last.toDateString() !== now.toDateString();
}

/**
 * Check if we've crossed a Monday boundary (for weekly reset)
 */
function isNewWeek(lastDateStr) {
  if (!lastDateStr) return true;
  const last = new Date(lastDateStr);
  const now = new Date();
  
  // Get Monday of current week (0 = Sunday, 1 = Monday)
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay(); // 0=Sun, 1=Mon, ...
    const diff = (day === 0 ? 6 : day - 1); // days since Monday
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  
  return getMonday(last).getTime() < getMonday(now).getTime();
}

/**
 * Generate a random distance threshold with exponential distribution (mean 1500 m)
 */
function generateAmberThreshold() {
  const mean = 1000;
  return Math.round(-mean * Math.log(1 - Math.random()));
}