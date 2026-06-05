import {
  getCategoryLabel,
  getDistanceLabel,
  getLocationCategory,
  getLocationId,
  getLocationName,
} from '../location-data.js';

const CATEGORY_GLYPHS = {
  beach: 'B',
  historical: 'H',
  temple: 'T',
  jetty: 'J',
  food: 'F',
  activity: 'A',
  other: 'P',
};

export function createLocationPinElement(location, { onClick } = {}) {
  const category = getLocationCategory(location);
  const stateClasses = [
    location.is_navigation_target ? 'is-navigation-target' : '',
    location.is_unlockable ? 'is-unlockable' : '',
    location.is_visited ? 'is-visited' : '',
  ].filter(Boolean).join(' ');
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `location-pin-icon category-${category} ${stateClasses}`;
  element.title = buildPlainTooltip(location);
  element.setAttribute('aria-label', `${getLocationName(location)}. ${buildPlainTooltip(location)}`);
  element.innerHTML = `
    <span class="location-pin-shadow" aria-hidden="true"></span>
    <span class="location-pin-orbit" aria-hidden="true"></span>
    <span class="location-pin-column" aria-hidden="true"></span>
    <span class="location-pin-pulse" aria-hidden="true"></span>
    <span class="location-pin-shell">
      <span class="location-pin-glyph">${CATEGORY_GLYPHS[category] || CATEGORY_GLYPHS.other}</span>
    </span>
    <span class="location-pin-check" aria-hidden="true"></span>
  `;

  element.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.(location);
  });

  return element;
}

export function buildLocationPopupHtml(location) {
  const category = getCategoryLabel(location);
  const distance = getDistanceLabel(location);
  const id = getLocationId(location);
  const state = location.is_visited ? 'Selesai' : location.is_unlockable ? 'Dalam radius' : 'Lokasi';

  return `
    <div class="pin-tooltip" data-location-id="${escapeHtml(id)}">
      <strong>${escapeHtml(getLocationName(location))}</strong>
      <span>${escapeHtml(category)} · ${escapeHtml(distance)} · ${state}</span>
    </div>
  `;
}

function buildPlainTooltip(location) {
  const category = getCategoryLabel(location);
  const distance = getDistanceLabel(location);
  const state = location.is_visited ? 'selesai' : location.is_unlockable ? 'dalam radius' : 'lokasi';
  return `${category}, ${distance}, ${state}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
