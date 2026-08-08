// geo.js - Geolocation tracking and distance calculation

// Constants
const EARTH_RADIUS_METRES = 6371000;
const MIN_DISTANCE_THRESHOLD = 1.0;  // Ignore movements smaller than 1m
const MAX_JUMP_THRESHOLD = 100;      // Ignore GPS jumps larger than 100m

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
 * Geolocation watchPosition success handler
 */
function geoWatchSuccess(position) {
  // Validate we received a proper position object
  if (!position || !position.coords) {
    console.error('[Geo] Received invalid position object');
    return;
  }
  
  const coords = position.coords;
  
  // Extract values
  const latitude = coords.latitude;
  const longitude = coords.longitude;
  const accuracy = coords.accuracy;
  const heading = coords.heading;    // May be null/undefined
  const speed = coords.speed;        // May be null/undefined
  
  // Validate we have the essentials
  if (latitude == null || longitude == null) {
    console.error('[Geo] Missing latitude/longitude in coords');
    return;
  }
  
  // Calculate heading from movement if device doesn't provide it
  let finalHeading = heading;
  if ((finalHeading == null) && lastPosition) {
    finalHeading = calculateBearing(
      lastPosition.latitude,
      lastPosition.longitude,
      latitude,
      longitude
    );
  }
  
  // Default heading to 0 (North) if still unknown
  if (finalHeading == null) {
    finalHeading = 0;
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
    
    // Filter out unrealistic values
    if (distance < MIN_DISTANCE_THRESHOLD) {
      // GPS jitter - position changed but by less than 1 metre
      // We still update the map position but don't count the distance
      distance = 0;
    } else if (distance > MAX_JUMP_THRESHOLD) {
      // GPS glitch - probably a bad position fix
      // Don't update lastPosition so the next good fix will calculate correctly
      return;
    }
  }
  
  // Update last position
  lastPosition = {
    latitude: latitude,
    longitude: longitude,
    timestamp: position.timestamp
  };
  
  // Build the data object to send to the callback
  const positionData = {
    latitude: latitude,
    longitude: longitude,
    heading: finalHeading,
    speed: speed || 0,
    distance: distance,
    accuracy: accuracy || 0,
    timestamp: position.timestamp
  };
  
  // Call the callback if it exists
  if (onPositionUpdateCallback) {
    onPositionUpdateCallback(positionData);
  } else {
    console.error('[Geo] No onPositionUpdateCallback set! Updates are being lost!');
  }
}

/**
 * Geolocation watchPosition error handler
 */
function geoWatchError(error) {
  console.error('[Geo] Watch error - code:', error.code, 'message:', error.message);
  
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
      message = 'Location error (code: ' + error.code + ')';
  }
  
  if (onErrorCallback) {
    onErrorCallback(message);
  }
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