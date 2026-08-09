// geo.js – Geolocation tracking and distance calculation

const EARTH_RADIUS_METRES = 6371000;
const MIN_DISTANCE_THRESHOLD = 1.0;      // min metres to count as movement
const MAX_JUMP_THRESHOLD = 100;          // ignore GPS glitches
const HEADING_UPDATE_MIN_DIST = 2.0;     // only update arrow if moved ≥ 2m

let watchId = null;
let lastPosition = null;
let trackingActive = false;
let lastHeading = 0;                     // smooth bearing memory

// Callbacks (set by app.js)
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
  let bearing = lastHeading; // default to current direction

  if (lastPosition) {
    distance = haversineDistance(
      lastPosition.latitude, lastPosition.longitude,
      latitude, longitude
    );

    // Filter unrealistic jumps
    if (distance > MAX_JUMP_THRESHOLD) {
      return; // throw away this update
    }

    if (distance >= HEADING_UPDATE_MIN_DIST) {
      // Only update bearing when we've actually moved enough
      bearing = calculateBearing(
        lastPosition.latitude, lastPosition.longitude,
        latitude, longitude
      );
      lastHeading = bearing; // remember for when stationary
    }

    if (distance < MIN_DISTANCE_THRESHOLD) {
      distance = 0; // don't add tiny jitter to daily total
    }
  } else {
    // First ever fix – we can't calculate bearing yet
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