// geo.js - Geolocation tracking and distance calculation

// Constants
const EARTH_RADIUS_METRES = 6371000;
const MIN_DISTANCE_THRESHOLD = 0.5; // Ignore GPS jumps smaller than 0.5m
const MAX_JUMP_THRESHOLD = 50; // Ignore GPS jumps larger than 50m (probably errors)

// State
let watchId = null;
let lastPosition = null;
let trackingActive = false;

// Callbacks (set by app.js)
let onPositionUpdateCallback = null;
let onErrorCallback = null;

/**
 * Start watching the user's position
 */
function startTracking() {
  if (!navigator.geolocation) {
    console.error('[Geo] Geolocation not supported');
    if (onErrorCallback) onErrorCallback('Geolocation not supported on this device');
    return false;
  }

  console.log('[Geo] Starting position tracking...');
  trackingActive = true;

  watchId = navigator.geolocation.watchPosition(
    handlePositionUpdate,
    handlePositionError,
    {
      enableHighAccuracy: true,
      maximumAge: 2000,        // Accept positions up to 2 seconds old
      timeout: 15000           // Timeout after 15 seconds
    }
  );

  return true;
}

/**
 * Stop watching the position
 */
function stopTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    trackingActive = false;
    console.log('[Geo] Tracking stopped');
  }
}

/**
 * Handle position updates
 */
function handlePositionUpdate(position) {
  const coords = position.coords;
  const timestamp = position.timestamp;
  
  let heading = coords.heading; // May be null
  const speed = coords.speed;   // m/s, may be null
  
  // Calculate heading from movement if device doesn't provide it
  if (heading === null && lastPosition) {
    heading = calculateBearing(
      lastPosition.latitude,
      lastPosition.longitude,
      coords.latitude,
      coords.longitude
    );
  }
  
  // Default heading to 0 (North) if still unknown
  if (heading === null) {
    heading = 0;
  }
  
  // Calculate distance from last position
  let distance = 0;
  if (lastPosition) {
    distance = haversineDistance(
      lastPosition.latitude,
      lastPosition.longitude,
      coords.latitude,
      coords.longitude
    );
    
    // Filter out unrealistic jumps
    if (distance < MIN_DISTANCE_THRESHOLD) {
      distance = 0; // Too small, probably GPS drift
    } else if (distance > MAX_JUMP_THRESHOLD) {
      console.warn('[Geo] Large jump detected, ignoring:', distance.toFixed(1) + 'm');
      distance = 0; // Probably a GPS error
    }
  }
  
  // Update last position
  lastPosition = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    timestamp: timestamp
  };
  
  // Call the callback
  if (onPositionUpdateCallback) {
    onPositionUpdateCallback({
      latitude: coords.latitude,
      longitude: coords.longitude,
      heading: heading,
      speed: speed,
      distance: distance,
      accuracy: coords.accuracy,
      timestamp: timestamp
    });
  }
}

/**
 * Handle position errors
 */
function handlePositionError(error) {
  console.error('[Geo] Position error:', error.code, error.message);
  
  let message = 'Location error';
  switch (error.code) {
    case error.PERMISSION_DENIED:
      message = 'Location permission denied. Please enable location access.';
      break;
    case error.POSITION_UNAVAILABLE:
      message = 'Location unavailable. Check your GPS signal.';
      break;
    case error.TIMEOUT:
      message = 'Location request timed out. Trying again...';
      break;
  }
  
  if (onErrorCallback) onErrorCallback(message);
}

/**
 * Calculate distance between two points using Haversine formula
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);
  
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return EARTH_RADIUS_METRES * c;
}

/**
 * Calculate bearing between two points
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaLambda = toRadians(lon2 - lon1);
  
  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) -
            Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  
  let bearing = toDegrees(Math.atan2(y, x));
  // Normalise to 0-360
  return (bearing + 360) % 360;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Check if tracking is currently active
 */
function isTracking() {
  return trackingActive;
}