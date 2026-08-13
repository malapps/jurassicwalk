// incubator.js – Incubator menu logic

let incubatorMenuEl;
let incubatorContentEl;

function initIncubatorMenu() {
  incubatorMenuEl = document.getElementById('incubator-menu');
  incubatorContentEl = document.getElementById('incubator-content');

  // Close button
  document.getElementById('incubator-close-btn').addEventListener('click', () => {
    hideIncubatorMenu();
  });

  // Amber panel tap opens menu
  document.getElementById('amber-panel').addEventListener('click', () => {
    showIncubatorMenu();
  });

  console.log('[Incubator] Menu initialised');
}

function showIncubatorMenu() {
  if (!incubatorMenuEl) return;
  renderIncubatorMenu();
  incubatorMenuEl.classList.remove('hidden');
  incubatorMenuEl.classList.add('visible');
}

function hideIncubatorMenu() {
  if (!incubatorMenuEl) return;
  incubatorMenuEl.classList.remove('visible');
  incubatorMenuEl.classList.add('hidden');
}

function renderIncubatorMenu() {
  if (!incubatorContentEl) return;
  
  let html = '';
  
  // --- Incubators Section ---
  html += '<div class="incubator-section">';
  html += '<div class="incubator-title">Your Incubators</div>';
  
  // Use global incubators array (defined in app.js)
  incubators.forEach((inc, index) => {
    if (inc.active) {
      // Active incubator
      const progressKm = (inc.distanceWalked / 1000).toFixed(1);
      const requiredKm = (inc.distanceRequired / 1000).toFixed(1);
      const progressPercent = Math.min(100, (inc.distanceWalked / inc.distanceRequired) * 100);
      
      html += `
        <div class="incubator-card active">
          <div class="incubator-title">Incubator #${index + 1}</div>
          <div class="incubator-status">${inc.level} dino DNA</div>
          <div style="font-size:0.9em;color:#555;">${progressKm} / ${requiredKm} km</div>
          <div class="progress-bar">
            <div class="progress-fill" style="width:${progressPercent}%"></div>
          </div>
        </div>
      `;
    } else {
      // Empty incubator
      html += `
        <div class="incubator-card empty">
          <div class="incubator-title">Incubator #${index + 1}</div>
          <div class="incubator-status">Empty — ready for DNA</div>
        </div>
      `;
    }
  });
  
  // Buy extra incubator placeholder
  html += `
    <button class="buy-incubator-btn" disabled>
      🔒 Buy extra incubator (coming soon)
    </button>
  `;
  html += '</div>';
  
  // --- Unincubated Amber Section ---
  html += '<div class="amber-list-section">';
  html += '<div class="incubator-title" style="margin-bottom:8px;">Unincubated Amber</div>';
  
  // Get unincubated DNA-positive amber pieces
  const unincubated = amberPieces.filter(p => p.hasDNA && !p.incubated);
  
  if (unincubated.length === 0) {
    html += '<div class="no-amber-msg">No unincubated DNA available. Walk to find more amber!</div>';
  } else {
    // Sort by level: Gold > Silver > Bronze
    const levelOrder = { 'Gold': 1, 'Silver': 2, 'Bronze': 3 };
    unincubated.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
    
    // Group and render
    let currentLevel = null;
    
    unincubated.forEach(piece => {
      // Level header
      if (piece.level !== currentLevel) {
        currentLevel = piece.level;
        const hatchDistance = piece.level === 'Gold' ? '10 km' : piece.level === 'Silver' ? '5 km' : '2 km';
        const levelClass = piece.level.toLowerCase();
        html += `<div class="level-header ${levelClass}">${piece.level} level — hatch in ${hatchDistance}</div>`;
      }
      
      // Amber DNA item
      html += `
        <div class="amber-dna-item" data-amber-id="${piece.id}">
          <span class="dna-icon">🧬</span>
          <span class="dna-level">${piece.level} dino DNA</span>
          <span class="dna-hatch-distance">Tap to incubate</span>
        </div>
      `;
    });
  }
  
  html += '</div>';
  
  incubatorContentEl.innerHTML = html;
  
  // Add click handlers to amber DNA items
  document.querySelectorAll('.amber-dna-item').forEach(item => {
    item.addEventListener('click', () => {
      const amberId = item.getAttribute('data-amber-id');
      startIncubation(amberId);
    });
  });
}

function startIncubation(amberId) {
  // Find the amber piece
  const pieceIndex = amberPieces.findIndex(p => p.id === amberId);
  if (pieceIndex === -1) return;
  
  const piece = amberPieces[pieceIndex];
  
  // Find an empty incubator
  const emptyIncubator = incubators.find(inc => !inc.active);
  if (!emptyIncubator) {
    showToast('No empty incubators available!', 4000);
    return;
  }
  
  // Set hatch distance based on level
  const hatchDistance = piece.level === 'Gold' ? 10000 : piece.level === 'Silver' ? 5000 : 2000;
  
  // Activate incubator
  emptyIncubator.active = true;
  emptyIncubator.level = piece.level;
  emptyIncubator.species = piece.species; // Secret until hatched
  emptyIncubator.distanceRequired = hatchDistance;
  emptyIncubator.distanceWalked = 0;
  
  // Mark amber piece as incubated
  amberPieces[pieceIndex].incubated = true;
  
  // Save state
  saveCurrentState();
  
  // Show confirmation toast
  showToast(`🧬 ${piece.level} DNA placed in incubator!\nWalk ${(hatchDistance / 1000).toFixed(0)} km to hatch.`, 5000);
  
  // Re-render menu
  renderIncubatorMenu();
}