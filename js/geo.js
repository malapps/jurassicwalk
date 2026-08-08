// geo.js - Geolocation tracking and distance calculation (debug mode)

// Constants
const EARTH_RADIUS_METRES = 6371000;
const MIN_DISTANCE_THRESHOLD = 0.5;
const MAX_JUMP_THRESHOLD = 50;

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
      maximumAge: 2000,
      timeout: 15000
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
 * Handle position updates - DEBUG: log raw position object
 */
function handlePositionUpdate(position) {
  // Log the raw position object to console (visible via remote debugging)
  console.log('[Geo] Raw position object:', JSON.stringify({
    timestamp: position.timestamp,
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      altitude: position.coords.altitude,
      accuracy: position.coords.accuracy,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed
    }
  }, null, 2));
  
  const coords = position.coords;
  const timestamp = position.timestamp;
  
  // Extract values with fallbacks
  const latitude = coords.latitude;
  const longitude = coords.longitude;
  const accuracy = coords.accuracy; // metres
  let heading = coords.heading;     // degrees, may be null
  const speed = coords.speed;       // m/s, may be null
  
  console.log('[Geo] Parsed coords:', { latitude, longitude, accuracy, heading, speed });
  
  // Calculate heading from movement if device doesn't provide it
  if ((heading === null || heading === undefined) && lastPosition) {
    heading = calculateBearing(
      lastPosition.latitude,
      lastPosition.longitude,
      latitude,
      longitude
    );
    console.log('[Geo] Calculated heading from movement:', heading);
  }
  
  // Default heading to 0 (North) if still unknown
  if (heading === null || heading === undefined) {
    heading = 0;
  }
  
  // Calculate distance from last position
  let distance = 0;
  if (lastPosition) {
    distance = haversineDistance(
      lastPosition.latitude,
      lastPosition.longitude,
      latitude,
      longitude
    );
    
    console.log('[Geo] Raw distance calculated:', distance.toFixed(4), 'm');
    
    // Filter out unrealistic jumps
    if (distance < MIN_DISTANCE_THRESHOLD) {
      console.log('[Geo] Distance below threshold (' + MIN_DISTANCE_THRESHOLD + 'm), ignoring');
      distance = 0;
    } else if (distance > MAX_JUMP_THRESHOLD) {
      console.warn('[Geo] Large jump detected (' + distance.toFixed(1) + 'm), ignoring');
      distance = 0;
    }
  } else {
    console.log('[Geo] First position fix, no distance calculated');
  }
  
  // Update last position
  lastPosition = {
    latitude: latitude,
    longitude: longitude,
    timestamp: timestamp
  };
  
  console.log('[Geo] Calling onPositionUpdateCallback with:', {
    latitude, longitude, heading, speed, distance, accuracy, timestamp
  });
  
  // Call the callback
  if (onPositionUpdateCallback) {
    onPositionUpdateCallback({
      latitude: latitude,
      longitude: longitude,
      heading: heading,
      speed: speed,
      distance: distance,
      accuracy: accuracy,
      timestamp: timestamp
    });
  } else {
    console.error('[Geo] No onPositionUpdateCallback set!');
  }
}

/**
 * Handle position errors
 */
function handlePositionError(error) {
  console.error('[Geo] Position error code:', error.code, 'message:', error.message);
  
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
    default:
      message = 'Unknown location error (code: ' + error.code + ')';
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