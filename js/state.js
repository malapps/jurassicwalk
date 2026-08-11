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
  saveValue('amberFoundToday', state.amberFoundToday);
  saveValue('lastDate', state.lastDate);
  saveValue('trailPoints', state.trailPoints);
  saveValue('amberPieces', state.amberPieces);
  saveValue('distanceSinceLastAmber', state.distanceSinceLastAmber);
  saveValue('nextAmberThreshold', state.nextAmberThreshold);
}

async function loadGameState() {
  const totalDistanceToday = loadValue('totalDistanceToday') || 0;
  const amberFoundToday = loadValue('amberFoundToday') || 0;
  const lastDate = loadValue('lastDate') || null;
  const trailPoints = loadValue('trailPoints') || [];
  const amberPieces = loadValue('amberPieces') || [];
  const distanceSinceLastAmber = loadValue('distanceSinceLastAmber') || 0;
  const nextAmberThreshold = loadValue('nextAmberThreshold') || generateAmberThreshold();

  return {
    totalDistanceToday,
    amberFoundToday,
    lastDate,
    trailPoints,
    amberPieces,
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

/** Generate a random distance threshold with exponential distribution (mean 1500 m) */
function generateAmberThreshold() {
  // Exponential: -mean * ln(1 - random)
  const mean = 10;
  return Math.round(-mean * Math.log(1 - Math.random()));
}