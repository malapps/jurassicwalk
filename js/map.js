// map.js - Map display and user marker management

let map = null;
let userMarker = null;
let trailPolyline = null;
let trailCoordinates = [];

const MAP_OPTIONS = {
  zoom: 18,
  maxZoom: 20,
  minZoom: 14,
  zoomControl: true,
  attributionControl: true
};

/**
 * Initialise the map centred on user's position
 */
function initMap(latitude, longitude) {
  console.log('[Map] Initialising map at:', latitude, longitude);
  
  // Only create map if it doesn't exist
  if (map) {
    console.log('[Map] Map already exists, updating position');
    updateUserPosition(latitude, longitude, 0);
    return;
  }
  
  // Create map instance
  map = L.map('map', {
    ...MAP_OPTIONS,
    center: [latitude, longitude]
  });

  // Add tile layer
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // Create user marker with arrow icon
  userMarker = L.marker([latitude, longitude], {
    icon: createArrowIcon(),
    zIndexOffset: 1000
  }).addTo(map);

  // Create trail polyline
  trailPolyline = L.polyline([], {
    color: '#FF8F00',
    weight: 6,
    opacity: 0.7,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 1
  }).addTo(map);

  // Force a resize to ensure map renders correctly
  setTimeout(() => {
    map.invalidateSize();
  }, 100);
  
  console.log('[Map] Map initialised successfully');
}

/**
 * Create the arrow icon for the user marker
 */
function createArrowIcon() {
  return L.divIcon({
    html: `
      <div class="user-arrow-container" style="width:40px;height:40px;">
        <svg width="40" height="40" viewBox="0 0 40 40" style="display:block;">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#FF8F00" stroke-width="2" opacity="0.3"/>
          <g transform="translate(20, 20)">
            <path d="M0,-16 L10,8 L4,4 L0,12 L-4,4 L-10,8 Z" 
                  fill="#FF6D00" 
                  stroke="#BF360C" 
                  stroke-width="1.5"
                  stroke-linejoin="round"/>
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
 * Update the user's position on the map
 */
function updateUserPosition(latitude, longitude, heading) {
  if (!map || !userMarker) {
    console.warn('[Map] Cannot update position - map or marker not ready');
    return;
  }

  try {
    // Update marker position
    userMarker.setLatLng([latitude, longitude]);

    // Rotate the arrow to match heading
    const arrowElement = userMarker.getElement();
    if (arrowElement) {
      const svgElement = arrowElement.querySelector('svg');
      if (svgElement) {
        svgElement.style.transform = `rotate(${heading}deg)`;
        svgElement.style.transition = 'transform 0.3s ease-out';
      }
    }

    // Add point to trail
    trailCoordinates.push([latitude, longitude]);
    trailPolyline.setLatLngs(trailCoordinates);

    // Smooth pan to new position
    map.panTo([latitude, longitude], {
      animate: true,
      duration: 0.5
    });
  } catch (error) {
    console.error('[Map] Error updating position:', error);
  }
}

/**
 * Get the current trail coordinates
 */
function getTrailCoordinates() {
  return [...trailCoordinates];
}

/**
 * Restore trail from saved coordinates
 */
function restoreTrail(coordinates) {
  if (!trailPolyline || !map) return;
  
  trailCoordinates = coordinates || [];
  trailPolyline.setLatLngs(trailCoordinates);
  
  if (trailCoordinates.length > 0) {
    const lastPoint = trailCoordinates[trailCoordinates.length - 1];
    map.panTo(lastPoint);
  }
}

/**
 * Handle window resize
 */
window.addEventListener('resize', () => {
  if (map) {
    map.invalidateSize();
  }
});