import { getLocationId, getLocationName, getLocationCategory, getDistanceLabel, getDistanceMeters } from '../location-data.js';

export function createListViewUi(dom, callbacks = {}) {
  let currentLocations = [];
  
  const listViewContainer = document.getElementById('list-view-container');
  const listViewGrid = document.getElementById('list-view-grid');
  const searchInput = document.getElementById('list-search-input');
  
  const btnViewMap = document.getElementById('btn-view-map');
  const btnViewList = document.getElementById('btn-view-list');
  const mapElement = document.getElementById('map');
  const nearbyTray = document.getElementById('nearby-tray');

  function renderList(locations) {
    if (!listViewGrid) return;
    
    listViewGrid.innerHTML = '';
    
    if (!locations || locations.length === 0) {
      listViewGrid.innerHTML = `<div class="empty-list" data-i18n="ui.empty_list" style="text-align:center; grid-column: 1 / -1; padding: 40px; color: #666;">Tiada lokasi dijumpai.</div>`;
      return;
    }
    
    locations.forEach(location => {
      const card = document.createElement('div');
      card.className = 'list-card';
      
      const distance = getDistanceMeters(location);
      const distanceLabel = Number.isFinite(distance) ? getDistanceLabel(location) : '';
      const category = getLocationCategory(location) || 'Tarikan';
      
      card.innerHTML = `
        <div class="list-card-image" style="background-image: url('${location.image_url || ''}')"></div>
        <div class="list-card-content">
          <div class="list-card-title">${getLocationName(location)}</div>
          <div class="list-card-category">${category}</div>
          <div class="list-card-distance">${distanceLabel}</div>
        </div>
      `;
      
      card.addEventListener('click', () => {
        if (callbacks.onLocationClick) {
          callbacks.onLocationClick(location);
        }
      });
      
      listViewGrid.appendChild(card);
    });
  }

  function handleSearch(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = currentLocations.filter(loc => {
      const name = getLocationName(loc).toLowerCase();
      const category = (getLocationCategory(loc) || '').toLowerCase();
      return name.includes(lowerQuery) || category.includes(lowerQuery);
    });
    renderList(filtered);
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });
  }

  if (btnViewMap && btnViewList && listViewContainer) {
    btnViewMap.addEventListener('click', () => {
      btnViewMap.classList.add('active');
      btnViewList.classList.remove('active');
      listViewContainer.classList.add('hidden');
      if (mapElement) mapElement.style.visibility = 'visible';
      if (nearbyTray) nearbyTray.style.display = '';
    });
    
    btnViewList.addEventListener('click', () => {
      btnViewList.classList.add('active');
      btnViewMap.classList.remove('active');
      listViewContainer.classList.remove('hidden');
      if (mapElement) mapElement.style.visibility = 'hidden';
      if (nearbyTray) nearbyTray.style.display = 'none';
      
      renderList(currentLocations);
      if (searchInput) {
        handleSearch(searchInput.value);
      }
    });
  }

  return {
    setListLocations(locations) {
      currentLocations = locations;
      if (btnViewList && btnViewList.classList.contains('active')) {
        renderList(currentLocations);
        if (searchInput) handleSearch(searchInput.value);
      }
    }
  };
}
