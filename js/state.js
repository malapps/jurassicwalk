// state.js – Game state persistence using localStorage

const STORAGE_PREFIX = 'jwalk_';

/**
 * Save a single value to localStorage
 */
function saveValue(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('[State] Error saving', key, e);
    throw e;
  }
}

/**
 * Load a single value from localStorage
 */
function loadValue(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error('[State] Error loading', key, e);
    return null;
  }
}

/**
 * Save the full game state
 */
async function saveGameState(state) {
  saveValue('totalDistanceToday', state.totalDistanceToday);
  saveValue('lastDate', state.lastDate);
  saveValue('trailPoints', state.trailPoints);
}

/**
 * Load the full game state
 */
async function loadGameState() {
  const totalDistanceToday = loadValue('totalDistanceToday') || 0;
  const lastDate = loadValue('lastDate') || null;
  const trailPoints = loadValue('trailPoints') || [];
  
  return {
    totalDistanceToday,
    lastDate,
    trailPoints
  };
}

/**
 * Initialise storage – now just a compatibility check
 */
async function openDB() {
  // localStorage is always available; just test it
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

/**
 * Check if it's a new day
 */
function isNewDay(lastDateStr) {
  if (!lastDateStr) return true;
  
  const last = new Date(lastDateStr);
  const now = new Date();
  
  return last.toDateString() !== now.toDateString();
}