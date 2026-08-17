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
  saveValue('lifetimeAmberFound', state.lifetimeAmberFound);
  saveValue('lifetimeDistance', state.lifetimeDistance);
  saveValue('weeklyDistance', state.weeklyDistance);
  saveValue('welcomeAmberClaimed', state.welcomeAmberClaimed);
  saveValue('welcomeAmber1Given', state.welcomeAmber1Given);
  saveValue('welcomeAmber2Given', state.welcomeAmber2Given);
  saveValue('lastDate', state.lastDate);
  saveValue('trailPoints', state.trailPoints);
  saveValue('amberPieces', state.amberPieces);
  saveValue('pendingAmber', state.pendingAmber);
  saveValue('incubators', state.incubators);
  saveValue('hatchedDinosaurs', state.hatchedDinosaurs);
  saveValue('distanceSinceLastAmber', state.distanceSinceLastAmber);
  saveValue('nextAmberThreshold', state.nextAmberThreshold);
}

async function loadGameState() {
  const totalDistanceToday = loadValue('totalDistanceToday') || 0;
  const amberFoundToday = loadValue('amberFoundToday') || 0;
  const lifetimeAmberFound = loadValue('lifetimeAmberFound') || 0;
  const lifetimeDistance = loadValue('lifetimeDistance') || 0;
  const weeklyDistance = loadValue('weeklyDistance') || 0;
  const welcomeAmberClaimed = loadValue('welcomeAmberClaimed') || false;
  const welcomeAmber1Given = loadValue('welcomeAmber1Given') || false;
  const welcomeAmber2Given = loadValue('welcomeAmber2Given') || false;
  const lastDate = loadValue('lastDate') || null;
  const trailPoints = loadValue('trailPoints') || [];
  const amberPieces = loadValue('amberPieces') || [];
  const pendingAmber = loadValue('pendingAmber') || [];
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
    welcomeAmberClaimed,
    welcomeAmber1Given,
    welcomeAmber2Given,
    lastDate,
    trailPoints,
    amberPieces,
    pendingAmber,
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

function isNewWeek(lastDateStr) {
  if (!lastDateStr) return true;
  const last = new Date(lastDateStr);
  const now = new Date();
  
  const getMonday = (d) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = (day === 0 ? 6 : day - 1);
    date.setDate(date.getDate() - diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };
  
  return getMonday(last).getTime() < getMonday(now).getTime();
}

function generateAmberThreshold() {
  const mean = 10;
  return Math.round(-mean * Math.log(1 - Math.random()));
}