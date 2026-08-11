// map.js – Map display and user marker management (with trail smoothing)

let map = null;
let userMarker = null;
let trailPolyline = null;
let trailCoordinates = [];       // Raw points (for saving state)
let smoothTrailCoordinates = []; // Smoothed points (for display)
let recentRawPoints = [];        // Buffer for moving average

const SMOOTHING_WINDOW = 4;      // Number of raw points to average

const MAP_OPTIONS = {
  zoom: 18,
  maxZoom: 20,
  minZoom: 14,
  zoomControl: true,
  attributionControl: true
};

function initMap(latitude, longitude) {
  if (map) {
    updateUserPosition(latitude, longitude, 0);
    return;
  }

  map = L.map('map', {
    ...MAP_OPTIONS,
    center: [latitude, longitude]
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  userMarker = L.marker([latitude, longitude], {
    icon: createArrowIcon(),
    zIndexOffset: 1000
  }).addTo(map);

  // Solid trail (smoothed)
  trailPolyline = L.polyline([], {
    color: '#D35400',
    weight: 3,
    opacity: 0.7,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 1
  }).addTo(map);

  setTimeout(() => map.invalidateSize(), 100);
}

function createArrowIcon() {
  return L.divIcon({
    html: `
      <div class="user-arrow-container" style="width:40px;height:40px;">
        <svg width="40" height="40" viewBox="0 0 40 40" style="display:block;">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#FF8F00" stroke-width="2" opacity="0.3"/>
          <g transform="translate(20, 20)">
            <path d="M0,-16 L10,8 L4,4 L0,12 L-4,4 L-10,8 Z"
                  fill="#FF6D00" stroke="#BF360C" stroke-width="1.5" stroke-linejoin="round"/>
            <circle cx="0" cy="-2" r="3" fill="#FFAB00" stroke="#BF360C" stroke-width="1"/>
          </g>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: 'user-arrow-marker'
  });
}

/**
 * Update the user's position and add smoothed trail point
 */
function updateUserPosition(latitude, longitude, heading) {
  if (!map || !userMarker) return;
  try {
    // Update arrow marker (always uses raw position for accuracy)
    userMarker.setLatLng([latitude, longitude]);

    const arrowElement = userMarker.getElement();
    if (arrowElement) {
      const svg = arrowElement.querySelector('svg');
      if (svg) {
        svg.style.transform = `rotate(${heading}deg)`;
      }
    }

    // Store raw point
    trailCoordinates.push([latitude, longitude]);

    // Smoothing: moving average of recent raw points
    recentRawPoints.push({ lat: latitude, lng: longitude });

    // Keep buffer size limited
    if (recentRawPoints.length > SMOOTHING_WINDOW) {
      recentRawPoints.shift();
    }

    // Calculate smoothed position
    const sumLat = recentRawPoints.reduce((s, p) => s + p.lat, 0);
    const sumLng = recentRawPoints.reduce((s, p) => s + p.lng, 0);
    const smoothLat = sumLat / recentRawPoints.length;
    const smoothLng = sumLng / recentRawPoints.length;

    smoothTrailCoordinates.push([smoothLat, smoothLng]);

    // Update displayed trail with smoothed points
    trailPolyline.setLatLngs(smoothTrailCoordinates);

    // Pan map to raw position (so arrow is centred)
    map.panTo([latitude, longitude], { animate: true, duration: 0.5 });
  } catch (e) {
    console.error('[Map] Error:', e);
  }
}

/**
 * Return the RAW trail coordinates (for saving state accurately)
 */
function getTrailCoordinates() {
  return [...trailCoordinates];
}

/**
 * Restore trail from saved raw coordinates — rebuild smoothed version
 */
function restoreTrail(coordinates) {
  if (!trailPolyline || !map) return;

  trailCoordinates = coordinates || [];
  smoothTrailCoordinates = [];
  recentRawPoints = [];

  // Rebuild smoothed trail from saved raw coordinates
  for (let i = 0; i < trailCoordinates.length; i++) {
    const [lat, lng] = trailCoordinates[i];
    recentRawPoints.push({ lat, lng });
    if (recentRawPoints.length > SMOOTHING_WINDOW) {
      recentRawPoints.shift();
    }
    const sumLat = recentRawPoints.reduce((s, p) => s + p.lat, 0);
    const sumLng = recentRawPoints.reduce((s, p) => s + p.lng, 0);
    smoothTrailCoordinates.push([
      sumLat / recentRawPoints.length,
      sumLng / recentRawPoints.length
    ]);
  }

  trailPolyline.setLatLngs(smoothTrailCoordinates);

  if (trailCoordinates.length > 0) {
    const last = trailCoordinates[trailCoordinates.length - 1];
    map.panTo(last);
  }
}

window.addEventListener('resize', () => {
  if (map) map.invalidateSize();
});