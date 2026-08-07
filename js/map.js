// map.js - Map display and user marker management

let map = null;
let userMarker = null;
let trailPolyline = null;
let trailCoordinates = [];

// Map initialisation options
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
  
  // Create map instance
  map = L.map('map', {
    ...MAP_OPTIONS,
    center: [latitude, longitude]
  });

  // Add tile layer - using OpenStreetMap (free, no API key needed)
  // For a more cartoon-like style, you can later swap to:
  // - Stadia Maps Alidade Smooth: https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png
  // - CartoDB Positron (lighter): https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);

  // Create user marker with arrow icon
  userMarker = L.marker([latitude, longitude], {
    icon: createArrowIcon(),
    zIndexOffset: 1000 // Keep arrow on top
  }).addTo(map);

  // Create trail polyline
  trailPolyline = L.polyline([], {
    color: '#FF8F00',       // Amber/orange trail
    weight: 6,
    opacity: 0.7,
    lineCap: 'round',
    lineJoin: 'round',
    smoothFactor: 1
  }).addTo(map);

  // Add a subtle glow effect to the trail
  trailPolyline.setStyle({
    className: 'trail-glow'
  });

  // Force a resize to ensure map renders correctly
  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

/**
 * Create the arrow icon for the user marker
 */
function createArrowIcon() {
  return L.divIcon({
    html: `
      <div class="user-arrow-container">
        <svg width="40" height="40" viewBox="0 0 40 40">
          <!-- Outer glow circle -->
          <circle cx="20" cy="20" r="18" fill="none" stroke="#FF8F00" stroke-width="2" opacity="0.3"/>
          <!-- Arrow shape pointing up (North) -->
          <g transform="translate(20, 20)">
            <path d="M0,-16 L10,8 L4,4 L0,12 L-4,4 L-10,8 Z" 
                  fill="#FF6D00" 
                  stroke="#BF360C" 
                  stroke-width="1.5"
                  stroke-linejoin="round"/>
            <!-- Centre dot -->
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
  if (!map || !userMarker) return;

  // Update marker position
  userMarker.setLatLng([latitude, longitude]);

  // Rotate the arrow to match heading
  const arrowElement = userMarker.getElement();
  if (arrowElement) {
    const svgContainer = arrowElement.querySelector('.user-arrow-container svg');
    if (svgContainer) {
      svgContainer.style.transform = `rotate(${heading}deg)`;
      svgContainer.style.transition = 'transform 0.3s ease-out';
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
}

/**
 * Get the current trail coordinates (for saving state)
 */
function getTrailCoordinates() {
  return [...trailCoordinates];
}

/**
 * Restore trail from saved coordinates
 */
function restoreTrail(coordinates) {
  if (!trailPolyline) return;
  
  trailCoordinates = coordinates || [];
  trailPolyline.setLatLngs(trailCoordinates);
  
  // If there are trail points, pan to the last one
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