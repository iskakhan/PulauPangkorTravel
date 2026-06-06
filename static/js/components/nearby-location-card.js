import {
  getCategoryLabel,
  getDistanceLabel,
  getLocationCategory,
  getLocationId,
  getLocationName,
  isInsideGeofence,
} from '../location-data.js?v=6';

export function buildNearbyLocationCard(location) {
  const id = getLocationId(location);
  const category = getLocationCategory(location);
  const state = location.is_visited ? 'Selesai' : isInsideGeofence(location) ? 'Unlock' : 'Lihat';

  const button = document.createElement('button');
  button.className = `nearby-location-card category-${category}`;
  button.type = 'button';
  button.dataset.locationId = id;
  button.innerHTML = `
    <span class="nearby-card-icon" aria-hidden="true"></span>
    <span class="nearby-card-copy">
      <strong>${escapeHtml(getLocationName(location))}</strong>
      <small>${escapeHtml(getCategoryLabel(location))} · ${escapeHtml(getDistanceLabel(location))}</small>
    </span>
    <span class="nearby-card-state">${state}</span>
  `;

  return button;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
