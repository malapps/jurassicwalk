// geo.js – Geolocation tracking and distance calculation

const EARTH_RADIUS_METRES = 6371000;
const MIN_DISTANCE_THRESHOLD = 0.5;      // Anti-jitter
const MAX_JUMP_THRESHOLD = 30;           // Anti-drift: max sudden jump in metres
const MAX_WALKING_SPEED = 27.0;           // m/s — brisk walking pace
const HEADING_UPDATE_MIN_DIST = 0.8;     // Anti-spin

let watchId = null;
let lastPosition = null;
let trackingActive = false;
let lastHeading = 0;

let onPositionUpdateCallback = null;
let onErrorCallback = null;

function startTracking() {
  if (!navigator.geolocation) {
    console.error('[Geo] Geolocation not supported');
    if (onErrorCallback) onErrorCallback('Geolocation not supported');
    return false;
  }

  console.log('[Geo] Starting tracking...');
  trackingActive = true;

  watchId = navigator.geolocation.watchPosition(
    geoWatchSuccess,
    geoWatchError,
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000
    }
  );

  return true;
}

function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    trackingActive = false;
    console.log('[Geo] Tracking stopped');
  }
}

function geoWatchSuccess(position) {
  if (!position || !position.coords) return;

  const { latitude, longitude, accuracy } = position.coords;
  if (latitude == null || longitude == null) return;

  let distance = 0;
  let bearing = lastHeading;

  if (lastPosition) {
    distance = haversineDistance(
      lastPosition.latitude, lastPosition.longitude,
      latitude, longitude
    );

    // Time-aware anti-drift
    const timeGap = (position.timestamp - lastPosition.timestamp) / 1000; // seconds
    const maxAcceptableDistance = Math.max(
      MAX_JUMP_THRESHOLD,                          // At least 30m
      timeGap * MAX_WALKING_SPEED                  // Plus distance walkable in the time gap
    );

    if (distance > maxAcceptableDistance) {
      console.warn('[Geo] Rejecting jump:', distance.toFixed(1), 'm in', timeGap.toFixed(1), 's (max:', maxAcceptableDistance.toFixed(1), 'm)');
      return;
    }

    // Anti-spin: only update bearing when we've moved at least 0.8m
    if (distance >= HEADING_UPDATE_MIN_DIST) {
      bearing = calculateBearing(
        lastPosition.latitude, lastPosition.longitude,
        latitude, longitude
      );
      lastHeading = bearing;
    }

    // Anti-jitter: don't count movements under 0.5m
    if (distance < MIN_DISTANCE_THRESHOLD) {
      distance = 0;
    }
  } else {
    bearing = 0;
  }

  lastPosition = {
    latitude,
    longitude,
    timestamp: position.timestamp
  };

  if (onPositionUpdateCallback) {
    onPositionUpdateCallback({
      latitude,
      longitude,
      heading: bearing,
      speed: position.coords.speed || 0,
      distance,
      accuracy: accuracy || 0,
      timestamp: position.timestamp
    });
  }
}

function geoWatchError(error) {
  console.error('[Geo] Watch error:', error.code, error.message);
  let message = 'Location error';
  switch (error.code) {
    case 1: message = 'Location permission denied.'; break;
    case 2: message = 'Location unavailable. Check GPS.'; break;
    case 3: message = 'Location timed out. Retrying...'; break;
  }
  if (onErrorCallback) onErrorCallback(message);
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const φ1 = toRadians(lat1), φ2 = toRadians(lat2);
  const Δφ = toRadians(lat2 - lat1), Δλ = toRadians(lon2 - lon1);
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return EARTH_RADIUS_METRES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function calculateBearing(lat1, lon1, lat2, lon2) {
  const φ1 = toRadians(lat1), φ2 = toRadians(lat2);
  const Δλ = toRadians(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

function toRadians(deg) { return deg * Math.PI / 180; }
function toDegrees(rad) { return rad * 180 / Math.PI; }
function isTracking() { return trackingActive; }

// Clean up when page is hidden
window.addEventListener('pagehide', () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    trackingActive = false;
    console.log('[Geo] Watcher stopped on pagehide');
  }
});