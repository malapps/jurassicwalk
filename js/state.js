// state.js - Local persistence using IndexedDB
const DB_NAME = 'DinoWalkDB';
const DB_VERSION = 1;
const STORE_NAME = 'gameState';

let db = null;

/**
 * Open and initialise the IndexedDB database
 */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      // Create object store if it doesn't exist
      if (!db.objectStores.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        console.log('[State] Database store created');
      }
    };

    request.onsuccess = (event) => {
      db = event.target.result;
      console.log('[State] Database opened');
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('[State] Database error:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Save a value to the store
 */
function saveValue(key, value) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not open'));
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put({ key, value, updatedAt: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Load a value from the store
 */
function loadValue(key) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('Database not open'));
      return;
    }

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(key);

    request.onsuccess = (event) => {
      const result = event.target.result;
      resolve(result ? result.value : null);
    };
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Save the full game state
 */
async function saveGameState(state) {
  await saveValue('totalDistanceToday', state.totalDistanceToday);
  await saveValue('lastDate', state.lastDate);
  await saveValue('trailPoints', state.trailPoints);
}

/**
 * Load the full game state
 */
async function loadGameState() {
  const totalDistanceToday = await loadValue('totalDistanceToday') || 0;
  const lastDate = await loadValue('lastDate') || null;
  const trailPoints = await loadValue('trailPoints') || [];
  
  return {
    totalDistanceToday,
    lastDate,
    trailPoints
  };
}

/**
 * Check if it's a new day (reset distance)
 */
function isNewDay(lastDateStr) {
  if (!lastDateStr) return true;
  
  const last = new Date(lastDateStr);
  const now = new Date();
  
  // Compare date strings (ignoring time)
  return last.toDateString() !== now.toDateString();
}