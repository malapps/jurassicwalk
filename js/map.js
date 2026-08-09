// map.js – Map display and user marker management

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

  // Perforated (dashed) trail
  trailPolyline = L.polyline([], {
    color: '#D35400',
    weight: 3,
    opacity: 0.7,
    dashArray: '10 10',
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

function updateUserPosition(latitude, longitude, heading) {
  if (!map || !userMarker) return;
  try {
    userMarker.setLatLng([latitude, longitude]);

    const arrowElement = userMarker.getElement();
    if (arrowElement) {
      const svg = arrowElement.querySelector('svg');
      if (svg) {
        svg.style.transform = `rotate(${heading}deg)`;
      }
    }

    trailCoordinates.push([latitude, longitude]);
    trailPolyline.setLatLngs(trailCoordinates);

    map.panTo([latitude, longitude], { animate: true, duration: 0.5 });
  } catch (e) {
    console.error('[Map] Error:', e);
  }
}

function getTrailCoordinates() {
  return [...trailCoordinates];
}

function restoreTrail(coordinates) {
  if (!trailPolyline || !map) return;
  trailCoordinates = coordinates || [];
  trailPolyline.setLatLngs(trailCoordinates);
  if (trailCoordinates.length > 0) {
    map.panTo(trailCoordinates[trailCoordinates.length - 1]);
  }
}

window.addEventListener('resize', () => {
  if (map) map.invalidateSize();
});