import { formatDistance } from './formatters.js';

const CATEGORY_ALIASES = {
  pantai: 'beach',
  beach: 'beach',
  historical: 'historical',
  history: 'historical',
  sejarah: 'historical',
  temple: 'temple',
  tokong: 'temple',
  jetty: 'jetty',
  jeti: 'jetty',
  food: 'food',
  makan: 'food',
  restaurant: 'food',
  activity: 'activity',
  aktiviti: 'activity',
};

export const CATEGORY_LABELS = {
  beach: 'Pantai',
  historical: 'Sejarah',
  temple: 'Tokong',
  jetty: 'Jetty',
  food: 'Makan',
  activity: 'Aktiviti',
  other: 'Lokasi',
};

export function getLocationId(location) {
  return String(location?.location_id ?? location?.id ?? '');
}

export function getLocationName(location) {
  return location?.name || location?.nama || location?.title || 'Lokasi Pangkor';
}

export function getLocationDescription(location) {
  return location?.description || location?.penerangan || location?.subtitle || 'Maklumat lokasi tersedia apabila anda menghampiri pin ini.';
}

export function getLocationCategory(location) {
  const rawCategory = String(location?.category || location?.kategori || location?.destinasi_type || 'other')
    .trim()
    .toLowerCase();
  const category = CATEGORY_ALIASES[rawCategory] || rawCategory || 'other';
  return CATEGORY_LABELS[category] ? category : 'other';
}

export function getCategoryLabel(location) {
  return CATEGORY_LABELS[getLocationCategory(location)] || CATEGORY_LABELS.other;
}

export function getLocationLatitude(location) {
  return parseCoordinate(location?.latitude ?? location?.lat);
}

export function getLocationLongitude(location) {
  return parseCoordinate(location?.longitude ?? location?.lng ?? location?.long);
}

export function getDistanceMeters(location) {
  const value = Number(
    location?.distance_m ??
    location?.distance_meter ??
    location?.jarak_meter ??
    location?.distance,
  );
  return Number.isFinite(value) ? value : null;
}

export function getDistanceLabel(location) {
  const distance = getDistanceMeters(location);
  return Number.isFinite(distance) ? formatDistance(distance) : 'Pulau Pangkor';
}

export function isInsideGeofence(location) {
  return Boolean(location?.is_inside_geofence || location?.inside_geofence || location?.is_unlockable);
}

export function mergeLocationData(location, nearbyLocation = {}) {
  return {
    ...location,
    ...nearbyLocation,
    id: getLocationId(nearbyLocation) || getLocationId(location),
    location_id: getLocationId(nearbyLocation) || getLocationId(location),
    name: getLocationName({ ...location, ...nearbyLocation }),
    category: getLocationCategory({ ...location, ...nearbyLocation }),
  };
}

export function enrichLocationsWithNearby(locations, nearbyById, visitedLocationIds) {
  return locations.map((location) => {
    const id = getLocationId(location);
    const nearbyLocation = nearbyById.get(id) || {};
    return {
      ...mergeLocationData(location, nearbyLocation),
      is_visited: visitedLocationIds.has(id) || Boolean(location.is_visited || nearbyLocation.is_visited),
      is_unlockable: isInsideGeofence(nearbyLocation),
    };
  });
}

export function calculateDistanceMeters(fromPosition, location) {
  if (!fromPosition) {
    return null;
  }

  const latitude = getLocationLatitude(location);
  const longitude = getLocationLongitude(location);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  const radius = 6371000;
  const lat1 = toRadians(fromPosition.latitude);
  const lat2 = toRadians(latitude);
  const deltaLat = toRadians(latitude - fromPosition.latitude);
  const deltaLng = toRadians(longitude - fromPosition.longitude);
  const a = Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function sortLocationsByDistance(locations, userPosition) {
  return [...locations].sort((first, second) => {
    const firstDistance = getDistanceMeters(first) ?? calculateDistanceMeters(userPosition, first) ?? Number.POSITIVE_INFINITY;
    const secondDistance = getDistanceMeters(second) ?? calculateDistanceMeters(userPosition, second) ?? Number.POSITIVE_INFINITY;
    return firstDistance - secondDistance;
  });
}

function parseCoordinate(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toRadians(value) {
  return value * Math.PI / 180;
}
