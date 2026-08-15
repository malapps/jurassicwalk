// stats.js – Stats page and Island logic

let statsPageEl;
let statsContentEl;

function initStatsPage() {
  statsPageEl = document.getElementById('stats-page');
  statsContentEl = document.getElementById('stats-content');

  // Close button
  document.getElementById('stats-close-btn').addEventListener('click', () => {
    hideStatsPage();
  });

  // Distance button opens stats page
  document.getElementById('distance-part').addEventListener('click', () => {
    showStatsPage();
  });

  console.log('[Stats] Page initialised');
}

function showStatsPage() {
  if (!statsPageEl) return;
  renderStatsPage();
  statsPageEl.classList.remove('hidden');
  statsPageEl.classList.add('visible');
}

function hideStatsPage() {
  if (!statsPageEl) return;
  statsPageEl.classList.remove('visible');
  statsPageEl.classList.add('hidden');
}

function renderStatsPage() {
  if (!statsContentEl) return;

  let html = '';

  // --- Stats Section ---
  html += '<div class="stats-section">';

  // Distance today
  html += `
    <div class="stats-row">
      <span class="stats-label">Today</span>
      <span class="stats-value">${formatDistance(totalDistanceToday)}</span>
    </div>
  `;

  // Distance this week
  html += `
    <div class="stats-row">
      <span class="stats-label">This Week</span>
      <span class="stats-value">${formatDistance(weeklyDistance)}</span>
    </div>
  `;

  // Distance lifetime
  html += `
    <div class="stats-row">
      <span class="stats-label">Lifetime</span>
      <span class="stats-value">${formatDistance(lifetimeDistance)}</span>
    </div>
  `;

  // Amber found lifetime
  html += `
    <div class="stats-row">
      <span class="stats-label">Amber Found</span>
      <span class="stats-value">${lifetimeAmberFound}</span>
    </div>
  `;

  html += '</div>';

  // --- Island Section ---
  html += '<div class="island-section">';
  html += '<div class="island-title">🦕 Your Island</div>';

  if (hatchedDinosaurs.length === 0) {
    html += '<div class="no-dinos-msg">No dinosaurs hatched yet. Walk to find amber and start incubating!</div>';
  } else {
    // Sort by level: Gold > Silver > Bronze
    const levelOrder = { 'Gold': 1, 'Silver': 2, 'Bronze': 3 };
    
    hatchedDinosaurs.forEach(dino => {
      // Determine level from species name
      const level = getDinoLevel(dino.species);
      const levelClass = level.toLowerCase();
      
      html += `
        <div class="dino-item">
          <span class="dino-level-badge ${levelClass}">${level}</span>
          <span class="dino-name">${dino.species}</span>
          <span class="dino-count">x${dino.count}</span>
        </div>
      `;
    });
  }

  // Species progress
  const totalSpecies = 28; // Total species in game
  const discoveredSpecies = hatchedDinosaurs.length;
  const progressPercent = Math.round((discoveredSpecies / totalSpecies) * 100);

  html += `
    <div class="species-progress">
      <div class="species-progress-text">${discoveredSpecies} / ${totalSpecies} species discovered</div>
      <div class="progress-bar">
        <div class="progress-fill" style="width:${progressPercent}%"></div>
      </div>
    </div>
  `;

  html += '</div>';

  statsContentEl.innerHTML = html;
}

/**
 * Format distance in metres or km
 */
function formatDistance(metres) {
  if (metres >= 10000) {
    return (metres / 1000).toFixed(1) + ' km';
  } else if (metres >= 1000) {
    return (metres / 1000).toFixed(2) + ' km';
  } else {
    return Math.round(metres) + ' m';
  }
}

/**
 * Determine dinosaur level from species name
 */
function getDinoLevel(species) {
  // Check against known lists
  if (BRONZE.includes(species)) return 'Bronze';
  if (SILVER.includes(species)) return 'Silver';
  if (GOLD.includes(species)) return 'Gold';
  
  // Fallback (shouldn't happen)
  return 'Bronze';
}