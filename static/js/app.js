import {
  checkInLocation,
  getActiveLocations,
  getAppConfig,
  getCurrentWeather,
  getLocationDetail,
  getNearbyLocations,
  submitVisitFeedback,
  validateSession,
  verifyAccessKey,
} from './api.js?v=7';
import { PANGKOR_BOUNDS, PANGKOR_SYSTEM_BUFFER_M } from './config.js?v=7';
import { getDomElements, refreshIcons } from './dom.js?v=7';
import { formatTime } from './formatters.js?v=7';
import {
  getLocationId,
  getLocationName,
  getDistanceMeters,
  getDistanceLabel,
  isInsideGeofence,
  mergeLocationData,
  calculateDistanceMeters,
  sortLocationsByDistance,
} from './location-data.js?v=7';
import { createMapView } from './map-view.js?v=7';
import { clearSession, loadSession, saveSession } from './session.js?v=7';
import { createUi } from './ui/index.js?v=7';
import { setLocale, getLocale, t, updateDomTranslations } from './i18n.js?v=7';
import { initChatWidget } from './chat-widget.js?v=7';

const NEARBY_RADIUS_M = 1000;
const AUTO_POPUP_RADIUS_M = 50;
const WEATHER_REFRESH_MS = 10 * 60 * 1000;
const WEATHER_MOVE_REFRESH_M = 150;
const VISITED_LOCATION_IDS_KEY = 'visited_location_ids';
const GPS_HIGH_ACCURACY_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 10000,
  timeout: 25000,
};
const GPS_FALLBACK_OPTIONS = {
  enableHighAccuracy: false,
  maximumAge: 60000,
  timeout: 30000,
};
const GPS_WATCH_OPTIONS = {
  enableHighAccuracy: true,
  maximumAge: 1000,
  timeout: 30000,
};
const GPS_RETRY_MS = 8000;

const dom = getDomElements();

let activeLocations = [];
let nearbyLocations = [];
let locationsById = new Map();
let nearbyById = new Map();
let autoPopupLocationIds = new Set();
let visitedLocationIds = loadVisitedLocationIds();
let currentLocation = null;
let navigationLocation = null;
let navigationLocationId = null;
let isCheckingNearby = false;
let isLoadingDetail = false;
let isLoadingWeather = false;
let isMap3dMode = false;
let hasLoadedLocations = false;
let lastPosition = null;
let lastWeatherPosition = null;
let lastWeatherRequestAt = 0;
let isOutsidePangkorArea = false;
let hasDismissedOutsideAreaWarning = false;
let hasReceivedGpsFix = false;
let isRequestingGpsFix = false;
let gpsRetryTimer = null;
let hasMapboxToken = false;
let hasInitializedMap = false;
let sessionTimer = null;
let watchId = null;

const session = loadSession();
let sessionToken = session.sessionToken;
let sessionExpiresAt = session.sessionExpiresAt;
let visitorName = session.visitorName;

let ui;
const mapView = createMapView({
  onLocationClick: (location) => openLocationDetail(location, { source: 'pin' }),
  onMapReady: ({ hasReal3d, isFallback } = {}) => {
    ui.hideMapLoading();
    if (isFallback && !hasReal3d) {
      ui.setLocationStatus('Peta 2D Pulau Pangkor aktif.');
    }
  },
  onMapFallback: (message) => {
    ui.setMapLoading(message);
    ui.showToast(message);
  },
  onMapLoadSlow: (message) => {
    ui.setMapLoading(message);
  },
  onMapError: (message) => {
    ui.setMapLoading(message);
  },
});
ui = createUi(dom, mapView, {
  onLocationClick: (location) => {
    openLocationDetail(location, { source: 'list' });
  },
  onTabChange: (tabName) => {
    if (tabName === 'map') {
      mapView.invalidateSize();
    }
  },
});

function getSessionToken() {
  if (sessionToken) {
    return sessionToken;
  }

  const storedSession = loadSession();
  sessionToken = storedSession.sessionToken;
  sessionExpiresAt = storedSession.sessionExpiresAt;
  visitorName = storedSession.visitorName;
  return sessionToken;
}

async function loadConfig() {
  try {
    const result = await getAppConfig();
    if (result.ok) {
      ui.showDemoKey(result.data.demo_access_key);
      hasMapboxToken = Boolean(result.data.mapbox_access_token);
      mapView.configure({
        mapboxAccessToken: result.data.mapbox_access_token,
        mapboxStyleUrl: result.data.mapbox_style_url,
      });
    }
  } catch (error) {
    console.info('Konfigurasi dev tidak tersedia:', error);
  }
}

async function hydrateStoredSession() {
  const token = getSessionToken();
  if (!token) {
    return false;
  }

  try {
    const result = await validateSession(token);
    if (!result.ok || !result.data.authenticated) {
      clearStoredSessionState();
      return false;
    }

    const savedSession = saveSession({
      ...result.data,
      session_token: token,
    });
    sessionToken = savedSession.sessionToken;
    sessionExpiresAt = savedSession.sessionExpiresAt;
    visitorName = savedSession.visitorName;
    return true;
  } catch (error) {
    console.error('Gagal menyemak sesi:', error);
    clearStoredSessionState();
    return false;
  }
}

function clearStoredSessionState() {
  clearSession();
  sessionToken = null;
  sessionExpiresAt = null;
  visitorName = '';
}

async function loadLocations() {
  try {
    const result = await getActiveLocations();
    if (!result.ok) {
      ui.setSummary('Lokasi', 'Senarai belum tersedia', result.data.error || 'Semak sambungan server lokasi.');
      ui.renderNearbyLocations([], { mode: 'all' });
      return;
    }

    activeLocations = result.data.locations || [];
    locationsById = new Map(activeLocations.map((location) => [getLocationId(location), location]));
    mapView.setLocations(activeLocations);
    if (ui.setListLocations) {
      ui.setListLocations(activeLocations);
    }
    syncLocationStates();
    hasLoadedLocations = true;
    ui.updateGameStatus({
      position: lastPosition,
      nearbyCount: activeLocations.length,
      unlockedCount: visitedLocationIds.size,
    });
    renderAreaList(lastPosition, { mode: 'all' });
    ui.setSummary('Peta aktif', 'Jelajah Pangkor', `${activeLocations.length} kawasan dan lokasi menarik dimuat.`);
  } catch (error) {
    console.error(error);
    ui.setSummary('Ralat rangkaian', 'Lokasi gagal dimuat', 'Sambungan ke API tidak berjaya.');
    ui.renderNearbyLocations([], { mode: 'all' });
  }
}

function getAreaList(position = lastPosition, { maxDistanceM = null } = {}) {
  const locations = activeLocations.map((location) => (
    withLiveLocationState(mergeLocationData(location), position)
  ));
  const sortedLocations = sortLocationsByDistance(locations, position);

  if (!Number.isFinite(maxDistanceM)) {
    return sortedLocations;
  }

  return sortedLocations.filter((location) => {
    const distance = getDistanceMeters(location);
    return Number.isFinite(distance) && distance <= maxDistanceM;
  });
}

function renderAreaList(position = lastPosition, { mode = 'all' } = {}) {
  ui.renderNearbyLocations(getAreaList(position), { mode });
}

async function handleLogin() {
  ui.hideLoginError();
  const nextVisitorName = dom.visitorNameInput.value.trim();
  const accessKey = dom.accessKeyInput.value.trim();

  if (nextVisitorName.length < 2) {
    ui.showLoginError(ui.getLoginMessage('nameRequired'));
    ui.updateLoginButtonState();
    return;
  }

  if (!accessKey) {
    ui.showLoginError(ui.getLoginMessage('keyRequired'));
    ui.updateLoginButtonState();
    return;
  }

  ui.setLoginLoading(true);

  try {
    const result = await verifyAccessKey(accessKey, nextVisitorName);

    if (!result.ok) {
      ui.showLoginError(result.data.error || ui.getLoginMessage('invalidKey'));
      return;
    }

    const savedSession = saveSession(result.data);
    sessionToken = savedSession.sessionToken;
    sessionExpiresAt = savedSession.sessionExpiresAt;
    visitorName = savedSession.visitorName;

    dom.visitorNameInput.value = '';
    dom.accessKeyInput.value = '';
    ui.updateLoginButtonState();
    if (ui.resetTabs) ui.resetTabs();
    ui.showScreen('map');
    ui.setAuthState(true, visitorName);
    await enterMapScreen();
    ui.showToast('Sesi lawatan aktif.');

    if (lastPosition) {
      await refreshNearby(lastPosition);
      maybeRefreshWeather(lastPosition, { force: true });
    }
  } catch (error) {
    console.error(error);
    ui.showLoginError(ui.getLoginMessage('apiFailed'));
  } finally {
    ui.setLoginLoading(false);
  }
}

async function refreshNearby(position) {
  if (isCheckingNearby) {
    return;
  }

  isCheckingNearby = true;
  ui.setLoadingNearby();

  try {
    const result = await getNearbyLocations({
      longitude: position.longitude,
      latitude: position.latitude,
      maxDistanceM: NEARBY_RADIUS_M,
    });

    if (!result.ok) {
      nearbyLocations = getAreaList(position, { maxDistanceM: NEARBY_RADIUS_M });
      nearbyById = new Map(nearbyLocations.map((location) => [getLocationId(location), location]));
      syncLocationStates();
      ui.updateGameStatus({
        position,
        nearbyCount: nearbyLocations.length,
        unlockedCount: visitedLocationIds.size,
      });
      const displayLocations = getAreaList(position);
      currentLocation = displayLocations[0] || null;
      ui.renderNearbyLocations(displayLocations, { mode: 'all' });
      ui.setSummary('Radar fallback', 'Kawasan sekitar', result.data.error || 'Senarai lokasi disusun terus dari peta.');
      return;
    }

    const records = result.data.locations || [];
    nearbyById = new Map();
    nearbyLocations = records.map((record) => {
      const id = getLocationId(record);
      const merged = withLiveLocationState(
        mergeLocationData(locationsById.get(id) || record, record),
        position,
      );
      nearbyById.set(id, merged);
      return merged;
    });
    nearbyLocations = sortLocationsByDistance(nearbyLocations, position);

    syncLocationStates();
    ui.updateGameStatus({
      position,
      nearbyCount: nearbyLocations.length,
      unlockedCount: visitedLocationIds.size,
    });
    const displayLocations = nearbyLocations.length ? nearbyLocations : getAreaList(position);
    ui.renderNearbyLocations(displayLocations, { mode: nearbyLocations.length ? 'nearby' : 'all' });
    if (navigationLocationId) {
      updateNavigationProgress(position);
    } else {
      currentLocation = displayLocations[0] || null;
      ui.updateNearestSummary(currentLocation);
      maybeAutoOpenUnlockableLocation(position);
    }
  } catch (error) {
    console.error('Gagal hubungi backend:', error);
    ui.setLocationStatus('Sambungan API gagal.');
    const displayLocations = getAreaList(position);
    nearbyLocations = getAreaList(position, { maxDistanceM: NEARBY_RADIUS_M });
    nearbyById = new Map(nearbyLocations.map((location) => [getLocationId(location), location]));
    syncLocationStates();
    ui.updateGameStatus({
      position,
      nearbyCount: nearbyLocations.length,
      unlockedCount: visitedLocationIds.size,
    });
    ui.renderNearbyLocations(displayLocations, { mode: 'all' });
    if (navigationLocationId) {
      updateNavigationProgress(position);
    } else {
      currentLocation = displayLocations[0] || null;
      ui.updateNearestSummary(currentLocation);
      ui.setSummary('Radar fallback', 'Kawasan sekitar', 'API nearby tidak dapat dicapai, senarai peta masih boleh digunakan.');
    }
  } finally {
    isCheckingNearby = false;
  }
}

function syncLocationStates() {
  mapView.updateLocationStates(nearbyById, visitedLocationIds);
}

function withLiveLocationState(location, position) {
  const distance = getLiveDistanceMeters(location, position);
  const isUnlockable = isWithinAutoPopupRadius(location, position);
  const hasLiveDistance = Number.isFinite(distance);

  return {
    ...location,
    ...(hasLiveDistance ? { distance_m: distance } : {}),
    is_unlockable: isUnlockable,
    is_inside_geofence: hasLiveDistance ? isUnlockable : Boolean(location.is_inside_geofence || isUnlockable),
  };
}

function getLiveDistanceMeters(location, position) {
  const liveDistance = calculateDistanceMeters(position, location);
  if (Number.isFinite(liveDistance)) {
    return liveDistance;
  }

  const distance = getDistanceMeters(location);
  if (Number.isFinite(distance)) {
    return distance;
  }

  return null;
}

function isWithinAutoPopupRadius(location, position) {
  const distance = getLiveDistanceMeters(location, position);
  if (Number.isFinite(distance)) {
    return distance <= AUTO_POPUP_RADIUS_M;
  }

  return Boolean(location?.is_inside_geofence || location?.inside_geofence || (!position && isInsideGeofence(location)));
}

function maybeAutoOpenUnlockableLocation(position = lastPosition) {
  const insideLocations = nearbyLocations.filter((location) => isWithinAutoPopupRadius(location, position));
  const insideLocationIds = new Set(insideLocations.map(getLocationId).filter(Boolean));

  autoPopupLocationIds.forEach((locationId) => {
    if (!insideLocationIds.has(locationId)) {
      autoPopupLocationIds.delete(locationId);
    }
  });

  const unlockableLocation = insideLocations.find((location) => {
    const id = getLocationId(location);
    return id && !autoPopupLocationIds.has(id);
  });

  if (!unlockableLocation) {
    return;
  }

  autoPopupLocationIds.add(getLocationId(unlockableLocation));
  openLocationDetail(unlockableLocation, { source: 'auto' });
}

function startNavigationToLocation(locationOrId) {
  const locationId = typeof locationOrId === 'string' ? locationOrId : getLocationId(locationOrId);
  if (!locationId) {
    return;
  }

  const baseLocation = locationsById.get(locationId) || (typeof locationOrId === 'object' ? locationOrId : {});
  if (!getLocationId(baseLocation)) {
    ui.showToast('Lokasi ini belum dimuat.');
    return;
  }

  const target = withLiveLocationState(
    mergeLocationData(baseLocation, nearbyById.get(locationId) || {}),
    lastPosition,
  );

  mapView.setFollowUser(true);
  if (!mapView.setNavigationTarget(target, lastPosition, { focus: false })) {
    ui.showToast('Koordinat lokasi ini belum tersedia.');
    return;
  }

  navigationLocation = target;
  navigationLocationId = locationId;
  currentLocation = target;
  ui.hideDestinationModal();
  setMap3dMode(true, { showToast: false });
  mapView.centerOnPosition(lastPosition);
  updateNavigationProgress(lastPosition);
  ui.showToast(`Paparan GO 3D aktif ke ${getLocationName(target)}.`);
}

function updateNavigationProgress(position = lastPosition) {
  if (!navigationLocationId) {
    return;
  }

  const baseLocation = locationsById.get(navigationLocationId) || navigationLocation || {};
  navigationLocation = withLiveLocationState(
    mergeLocationData(baseLocation, nearbyById.get(navigationLocationId) || {}),
    position,
  );
  currentLocation = navigationLocation;
  mapView.setNavigationTarget(navigationLocation, position, { focus: false });

  const description = position
    ? `${getDistanceLabel(navigationLocation)} lagi. Ikut garisan laluan ke pin destinasi.`
    : 'GPS belum aktif. Peta akan follow bila lokasi diterima.';
  ui.setSummary('Navigasi aktif', getLocationName(navigationLocation), description);
  dom.openDestinationButton.classList.remove('hidden');
  maybeAutoOpenNavigationTarget(position);
}

function maybeAutoOpenNavigationTarget(position = lastPosition) {
  if (!navigationLocationId || !navigationLocation) {
    return;
  }

  if (!isWithinAutoPopupRadius(navigationLocation, position)) {
    autoPopupLocationIds.delete(navigationLocationId);
    return;
  }

  if (autoPopupLocationIds.has(navigationLocationId)) {
    return;
  }

  autoPopupLocationIds.add(navigationLocationId);
  openLocationDetail(navigationLocation, { source: 'auto' });
}

async function openLocationDetail(locationOrId, { source = 'manual' } = {}) {
  if (isLoadingDetail) {
    return;
  }

  const locationId = typeof locationOrId === 'string' ? locationOrId : getLocationId(locationOrId);
  if (!locationId) {
    return;
  }

  isLoadingDetail = true;

  const baseLocation = locationsById.get(locationId) || (typeof locationOrId === 'object' ? locationOrId : {});
  const nearbyLocation = nearbyById.get(locationId) || {};
  const mergedLocation = withLiveLocationState(mergeLocationData(baseLocation, nearbyLocation), lastPosition);
  const isInside = isWithinAutoPopupRadius(mergedLocation, lastPosition);
  let isVisited = visitedLocationIds.has(locationId);
  let detail = {};
  let visit = null;
  const token = getSessionToken();

  try {
    const detailResult = await getLocationDetail({ locationId });
    if (detailResult.ok) {
      detail = detailResult.data;
    } else {
      ui.showToast(detailResult.data.error || 'Butiran lokasi gagal dimuat.');
    }

    if (isInside && !isVisited && lastPosition) {
      if (token) {
        const checkInResult = await checkInLocation({
          locationId,
          latitude: lastPosition.latitude,
          longitude: lastPosition.longitude,
          sessionToken: token,
        });

        if (checkInResult.ok) {
          visit = checkInResult.data.visit;
          isVisited = true;
          visitedLocationIds.add(locationId);
          saveVisitedLocationIds();
          syncLocationStates();
          ui.updateGameStatus({
            position: lastPosition,
            nearbyCount: nearbyLocations.length,
            unlockedCount: visitedLocationIds.size,
          });
          ui.showUnlockAnimation(getUnlockCopy(detail, mergedLocation));
        } else if (checkInResult.status === 403 || checkInResult.status === 401) {
          ui.showToast('Log masuk untuk unlock lokasi ini.');
        } else {
          ui.showToast(checkInResult.data.error || 'Check-in gagal.');
        }
      } else if (source === 'auto') {
        ui.showToast('Anda berada dalam radius. Log masuk untuk unlock reward.');
      }
    }

    ui.openDestinationModal({
      location: mergeLocationData(mergedLocation, detail.location || {}),
      detail,
      isAuthenticated: Boolean(token),
      isInside,
      isVisited,
      visit,
    });
  } catch (error) {
    console.error(error);
    ui.showToast('Butiran lokasi tidak dapat dimuat.');
  } finally {
    isLoadingDetail = false;
  }
}

function getUnlockCopy(detail, location) {
  const card = detail.card || {};
  return {
    title: card.card_title || card.title || getLocationName(location),
    message: card.unlock_message || `Anda unlock ${getLocationName(location)}.`,
  };
}

function handlePosition(position) {
  const { latitude, longitude, accuracy, heading, speed } = position.coords;
  const receivedPosition = { latitude, longitude, accuracy, heading, speed };
  const isInsideSystemArea = isWithinPangkorSystemArea(receivedPosition);
  const wasOutsidePangkorArea = isOutsidePangkorArea;
  hasReceivedGpsFix = true;
  isRequestingGpsFix = false;
  window.clearTimeout(gpsRetryTimer);

  ui.setAccuracy(accuracy);
  ui.updateGameStatus({
    position: isInsideSystemArea ? lastPosition : null,
    nearbyCount: nearbyLocations.length,
    unlockedCount: visitedLocationIds.size,
  });

  if (!isInsideSystemArea) {
    lastPosition = null;
    if (!wasOutsidePangkorArea) {
      hasDismissedOutsideAreaWarning = false;
      navigationLocation = null;
      navigationLocationId = null;
      currentLocation = null;
      autoPopupLocationIds.clear();
      mapView.clearNavigationTarget();
      setMap3dMode(false, { showToast: false });
      mapView.showPangkorOverview({ animate: true });
    }
    isOutsidePangkorArea = true;
    mapView.setFollowUser(false);
    mapView.clearUserPosition();
    nearbyLocations = [];
    nearbyById = new Map();
    syncLocationStates();
    ui.updateGameStatus({
      position: null,
      nearbyCount: activeLocations.length,
      unlockedCount: visitedLocationIds.size,
    });
    ui.setLocationStatus('GPS diterima, tetapi di luar Pangkor.');
    ui.setSummary(
      'Pulau Pangkor',
      "You're not in Pangkor.",
      'Peta kekal memaparkan Pulau Pangkor. Lokasi live akan aktif apabila anda berada dalam kawasan Pangkor.',
    );
    renderAreaList(null, { mode: 'all' });
    if (!hasDismissedOutsideAreaWarning) {
      ui.showAreaWarning('Peta kekal di Pulau Pangkor. Lokasi live hanya aktif apabila anda berada dalam kawasan Pangkor.');
    }
    return;
  }

  isOutsidePangkorArea = false;
  hasDismissedOutsideAreaWarning = false;
  lastPosition = receivedPosition;
  ui.hidePermissionError();
  ui.setLocationStatus(`GPS aktif · ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
  mapView.updatePositionMarker(latitude, longitude, accuracy, { heading, speed });
  updateNavigationProgress(lastPosition);
  refreshNearby(lastPosition);
  maybeRefreshWeather(lastPosition);
}

function isWithinPangkorSystemArea(position) {
  if (!position) {
    return false;
  }

  const latitude = Number(position.latitude);
  const longitude = Number(position.longitude);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return false;
  }

  if (
    latitude >= PANGKOR_BOUNDS.south &&
    latitude <= PANGKOR_BOUNDS.north &&
    longitude >= PANGKOR_BOUNDS.west &&
    longitude <= PANGKOR_BOUNDS.east
  ) {
    return true;
  }

  const nearestPoint = {
    latitude: clamp(latitude, PANGKOR_BOUNDS.south, PANGKOR_BOUNDS.north),
    longitude: clamp(longitude, PANGKOR_BOUNDS.west, PANGKOR_BOUNDS.east),
  };
  const distanceToPangkorMap = calculateDistanceMeters(position, nearestPoint);
  return Number.isFinite(distanceToPangkorMap) && distanceToPangkorMap <= PANGKOR_SYSTEM_BUFFER_M;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

async function maybeRefreshWeather(position, { force = false } = {}) {
  if (!position || isLoadingWeather) {
    return;
  }

  const now = Date.now();
  const movedDistance = lastWeatherPosition
    ? calculateDistanceMeters(lastWeatherPosition, {
      latitude: position.latitude,
      longitude: position.longitude,
    })
    : Number.POSITIVE_INFINITY;

  if (
    !force &&
    lastWeatherRequestAt &&
    now - lastWeatherRequestAt < WEATHER_REFRESH_MS &&
    movedDistance < WEATHER_MOVE_REFRESH_M
  ) {
    return;
  }

  isLoadingWeather = true;
  lastWeatherRequestAt = now;
  ui.setWeatherLoading();

  try {
    const result = await getCurrentWeather({
      latitude: position.latitude,
      longitude: position.longitude,
    });

    if (result.ok) {
      lastWeatherPosition = {
        latitude: position.latitude,
        longitude: position.longitude,
      };
      ui.setWeather(result.data);
    } else {
      ui.setWeatherUnavailable(result.data.error || 'Cuaca semasa gagal dimuat.');
    }
  } catch (error) {
    console.error('Cuaca gagal dimuat:', error);
    ui.setWeatherUnavailable('Cuaca real time tidak dapat dicapai.');
  } finally {
    isLoadingWeather = false;
  }
}

function handlePositionError(error, { allowFallback = true } = {}) {
  const messageByCode = {
    1: 'Kebenaran lokasi ditolak.',
    2: 'Lokasi belum dapat dikesan.',
    3: 'GPS mengambil masa terlalu lama.',
  };
  const message = messageByCode[error.code] || error.message || 'GPS gagal dikesan.';
  isRequestingGpsFix = false;
  console.warn('GPS belum tersedia:', error);

  if (!isGeolocationSecureContext()) {
    ui.showPermissionError(
      'GPS memerlukan HTTPS atau localhost. Buka melalui https:// atau http://localhost:5001 supaya Safari/Chrome boleh beri lokasi.',
    );
    ui.setSummary('GPS disekat', 'Perlu HTTPS', 'Browser menyekat geolokasi pada alamat HTTP biasa.');
    return;
  }

  if (error.code === 0) {
    ui.showPermissionError(message);
    ui.setSummary('GPS tidak tersedia', 'Semak browser', 'Browser ini tidak menyediakan Geolocation API.');
    return;
  }

  if (error.code === 1) {
    ui.showPermissionError('Kebenaran lokasi ditolak. Benarkan Location Services untuk Safari/Chrome, kemudian tekan Cuba lagi.');
    ui.setSummary('GPS ditolak', 'Benarkan lokasi', 'Permission lokasi diperlukan untuk radar.');
    return;
  }

  ui.setLocationStatus(`${message}. Masih mencuba...`);

  if (!hasReceivedGpsFix) {
    ui.setSummary(
      'GPS',
      'Mencari lokasi',
      'Pastikan Location Services aktif dan browser dibenarkan akses lokasi.',
    );
  }

  if (allowFallback) {
    requestGpsFix(GPS_FALLBACK_OPTIONS, { allowFallback: false });
  }
  scheduleGpsRetry();
}

function startTracking({ force = false } = {}) {
  if (!navigator.geolocation) {
    handlePositionError({ code: 0, message: 'Geolokasi tidak disokong pada pelayar ini.' });
    return;
  }

  if (!isGeolocationSecureContext()) {
    handlePositionError({ code: 1, message: 'Geolokasi disekat kerana alamat tidak selamat.' });
    return;
  }

  if (watchId !== null && !force) {
    return;
  }

  if (force) {
    stopTracking();
  }

  ui.setLocationStatus('Mengaktifkan GPS...');
  ui.setSummary('GPS', 'Mencari lokasi', 'Menunggu isyarat lokasi semasa.');
  requestGpsFix(GPS_HIGH_ACCURACY_OPTIONS);
  watchId = navigator.geolocation.watchPosition(
    handlePosition,
    (error) => handlePositionError(error, { allowFallback: !hasReceivedGpsFix }),
    GPS_WATCH_OPTIONS,
  );
}

function stopTracking() {
  window.clearTimeout(gpsRetryTimer);
  gpsRetryTimer = null;
  isRequestingGpsFix = false;
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function requestGpsFix(options = GPS_HIGH_ACCURACY_OPTIONS, { allowFallback = true } = {}) {
  if (isRequestingGpsFix || !navigator.geolocation) {
    return;
  }

  isRequestingGpsFix = true;
  navigator.geolocation.getCurrentPosition(
    handlePosition,
    (error) => handlePositionError(error, { allowFallback }),
    options,
  );
}

function scheduleGpsRetry() {
  window.clearTimeout(gpsRetryTimer);
  gpsRetryTimer = window.setTimeout(() => {
    if (watchId !== null) {
      requestGpsFix(hasReceivedGpsFix ? GPS_HIGH_ACCURACY_OPTIONS : GPS_FALLBACK_OPTIONS, {
        allowFallback: false,
      });
    }
  }, GPS_RETRY_MS);
}

function isGeolocationSecureContext() {
  const hostname = window.location.hostname;
  return (
    window.isSecureContext ||
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '::1'
  );
}

function startSessionTimer() {
  window.clearInterval(sessionTimer);
  updateSessionStatus();
  sessionTimer = window.setInterval(updateSessionStatus, 1000);
}

function updateSessionStatus() {
  if (!sessionExpiresAt) {
    ui.setSessionStatus('Log masuk diperlukan');
    return;
  }

  const remaining = sessionExpiresAt - Date.now();
  if (remaining <= 0) {
    performLogout('Sesi tamat. Sila log masuk semula.');
    return;
  }
  ui.setSessionStatus(`Sesi ${formatTime(remaining)}`);
}

function requestLogout() {
  if (sessionToken) {
    ui.openFeedbackModal();
    return;
  }

  performLogout('Sila log masuk untuk melihat peta.');
}

function performLogout(message) {
  clearStoredSessionState();
  window.clearInterval(sessionTimer);
  hasReceivedGpsFix = false;
  hasLoadedLocations = false;
  lastPosition = null;
  lastWeatherPosition = null;
  isOutsidePangkorArea = false;
  hasDismissedOutsideAreaWarning = false;
  nearbyLocations = [];
  nearbyById = new Map();
  currentLocation = null;
  navigationLocation = null;
  navigationLocationId = null;
  autoPopupLocationIds.clear();
  mapView.clearNavigationTarget();
  mapView.clearUserPosition();
  syncLocationStates();
  stopTracking();
  ui.setAuthState(false);
  ui.setSessionStatus('Log masuk diperlukan');
  ui.showScreen('login');
  if (!hasReceivedGpsFix) {
    ui.setWeatherUnavailable('Menunggu lokasi untuk cuaca semasa.');
  }
  ui.updateGameStatus({
    position: lastPosition,
    nearbyCount: nearbyLocations.length,
    unlockedCount: visitedLocationIds.size,
  });
  if (ui.resetTabs) ui.resetTabs();
  renderAreaList(lastPosition, { mode: 'all' });
  mapView.setFollowUser(false);
  ui.hideLoginError();
  if (message && /sesi tamat|sila log masuk|log masuk/i.test(message)) {
    ui.showLoginError(message);
  }
}

async function handleFeedbackSubmit(event) {
  event.preventDefault();

  const visitComment = dom.feedbackVisitComment.value.trim();
  const systemComment = dom.feedbackSystemComment.value.trim();
  if (!visitComment && !systemComment) {
    ui.showFeedbackError('Sila isi sekurang-kurangnya satu komen, atau pilih log keluar tanpa komen.');
    return;
  }

  ui.hideFeedbackError();
  ui.setFeedbackLoading(true);

  try {
    const result = await submitVisitFeedback({
      sessionToken,
      visitComment,
      systemComment,
    });

    if (!result.ok) {
      ui.showFeedbackError(result.data.error || 'Maklum balas gagal dihantar.');
      return;
    }

    ui.hideFeedbackModal();
    ui.resetFeedbackForm();
    performLogout('Terima kasih atas maklum balas anda.');
  } catch (error) {
    console.error('Maklum balas gagal dihantar:', error);
    ui.showFeedbackError('Sambungan API gagal. Cuba lagi atau log keluar tanpa komen.');
  } finally {
    ui.setFeedbackLoading(false);
  }
}

function skipFeedbackAndLogout() {
  ui.hideFeedbackModal();
  ui.resetFeedbackForm();
  performLogout('Sesi ditamatkan. Sila log masuk semula.');
}

function showLoginPrompt() {
  ui.showScreen('login');
  dom.accessKeyInput.focus();
}

async function enterMapScreen() {
  ui.showScreen('map');
  ui.setAuthState(Boolean(sessionToken), visitorName);
  if (!hasInitializedMap) {
    ui.setMapLoading(
      hasMapboxToken
        ? 'Memuat peta Pulau Pangkor...'
        : 'Memuat peta 2D Pulau Pangkor...',
    );
  }
  if (!hasReceivedGpsFix) {
    ui.setWeatherUnavailable('Menunggu lokasi untuk cuaca semasa.');
  }
  mapView.initMap();
  hasInitializedMap = true;
  mapView.setFollowUser(true);
  mapView.focusPangkor({ animate: false });
  setMap3dMode(isMap3dMode, { showToast: false });
  mapView.invalidateSize();
  startTracking();

  if (!hasLoadedLocations || activeLocations.length === 0) {
    ui.setLoadingNearby();
    await loadLocations();
  } else {
    mapView.setLocations(activeLocations);
    syncLocationStates();
    renderAreaList(lastPosition, { mode: 'all' });
  }

  if (sessionToken) {
    startSessionTimer();
  }
}

function toggleMapMode() {
  setMap3dMode(!isMap3dMode);
}

function setMap3dMode(isEnabled, { showToast = true } = {}) {
  isMap3dMode = Boolean(isEnabled);
  mapView.setPerspectiveMode(isMap3dMode);
  dom.mapModeButton.classList.toggle('is-active', isMap3dMode);
  dom.mapModeButton.setAttribute('aria-pressed', String(isMap3dMode));
  if (showToast) {
    ui.showToast(isMap3dMode ? 'Paparan GO 3D aktif.' : 'Paparan 2D aktif.');
  }
}

function loadVisitedLocationIds() {
  try {
    const stored = JSON.parse(window.localStorage.getItem(VISITED_LOCATION_IDS_KEY) || '[]');
    return new Set(Array.isArray(stored) ? stored.map(String) : []);
  } catch (error) {
    return new Set();
  }
}

function saveVisitedLocationIds() {
  window.localStorage.setItem(VISITED_LOCATION_IDS_KEY, JSON.stringify([...visitedLocationIds]));
}

function bindEvents() {
  dom.loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleLogin();
  });

  dom.languageSelect.addEventListener('change', () => {
    ui.setLoginLanguage(dom.languageSelect.value);
  });

  dom.accessKeyInput.addEventListener('input', () => {
    ui.hideLoginError();
    ui.updateLoginButtonState();
  });

  dom.visitorNameInput.addEventListener('input', () => {
    ui.hideLoginError();
    ui.updateLoginButtonState();
  });

  dom.clearKeyButton.addEventListener('click', () => {
    dom.accessKeyInput.value = '';
    dom.accessKeyInput.focus();
    ui.hideLoginError();
    ui.updateLoginButtonState();
  });

  dom.useTestKeyButton.addEventListener('click', () => {
    dom.accessKeyInput.value = dom.demoKeyValue.textContent.trim();
    dom.accessKeyInput.focus();
    ui.hideLoginError();
    ui.updateLoginButtonState();
  });

  dom.loginPromptButton.addEventListener('click', showLoginPrompt);
  dom.logoutButton.addEventListener('click', requestLogout);
  dom.feedbackForm.addEventListener('submit', handleFeedbackSubmit);
  dom.feedbackCloseButton.addEventListener('click', ui.hideFeedbackModal);
  dom.feedbackSkipButton.addEventListener('click', skipFeedbackAndLogout);
  dom.feedbackModal.addEventListener('click', (event) => {
    if (event.target === dom.feedbackModal) {
      ui.hideFeedbackModal();
    }
  });
  dom.retryLocationButton.addEventListener('click', () => {
    ui.hidePermissionError();
    stopTracking();
    startTracking();
  });
  dom.permissionCloseButton.addEventListener('click', () => {
    if (isOutsidePangkorArea) {
      hasDismissedOutsideAreaWarning = true;
    }
    ui.hidePermissionError();
  });
  dom.overviewButton.addEventListener('click', () => {
    setMap3dMode(false, { showToast: false });
    if (mapView.showPangkorOverview()) {
      ui.showToast('Paparan seluruh Pulau Pangkor.');
    }
  });
  dom.recenterButton.addEventListener('click', () => {
    if (isOutsidePangkorArea || (lastPosition && !isWithinPangkorSystemArea(lastPosition))) {
      isOutsidePangkorArea = true;
      hasDismissedOutsideAreaWarning = false;
      setMap3dMode(false, { showToast: false });
      mapView.setFollowUser(false);
      mapView.clearUserPosition();
      mapView.showPangkorOverview({ animate: true });
      ui.showAreaWarning('Peta kekal di Pulau Pangkor. Lokasi live hanya aktif apabila anda berada dalam kawasan Pangkor.');
      return;
    }

    if (!mapView.centerOnPosition(lastPosition)) {
      ui.showToast('Lokasi belum tersedia.');
    }
  });
  dom.mapModeButton.addEventListener('click', toggleMapMode);
  dom.modalClose.addEventListener('click', ui.hideDestinationModal);
  dom.openDestinationButton.addEventListener('click', () => {
    if (currentLocation) {
      openLocationDetail(currentLocation, { source: 'summary' });
    }
  });
  dom.nearbyLocationList.addEventListener('click', (event) => {
    const card = event.target.closest('[data-location-id]');
    if (card) {
      openLocationDetail(card.dataset.locationId, { source: 'nearby-card' });
    }
  });
  dom.destinationModal.addEventListener('click', (event) => {
    if (event.target === dom.destinationModal) {
      ui.hideDestinationModal();
      return;
    }

    const viewButton = event.target.closest('[data-view-location-id]');
    if (viewButton) {
      startNavigationToLocation(viewButton.dataset.viewLocationId);
      return;
    }

    if (event.target.closest('#modal-login-button')) {
      ui.hideDestinationModal();
      showLoginPrompt();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      ui.hideDestinationModal();
      ui.hideFeedbackModal();
    }
  });

  const langBtn = document.getElementById('lang-toggle-button');
  if (langBtn) {
    langBtn.addEventListener('click', () => {
      const newLoc = getLocale() === 'ms' ? 'en' : 'ms';
      setLocale(newLoc);
      langBtn.querySelector('.lang-text').textContent = newLoc === 'ms' ? 'EN' : 'MS';
    });
  }
}

async function boot() {
  if (sessionExpiresAt && sessionExpiresAt <= Date.now()) {
    clearStoredSessionState();
  }

  refreshIcons();
  ui.initLoginLanguage();
  ui.updateLoginButtonState();
  ui.setAuthState(Boolean(sessionToken), visitorName);
  ui.updateGameStatus({
    position: null,
    nearbyCount: 0,
    unlockedCount: visitedLocationIds.size,
  });
  ui.setWeatherUnavailable('Menunggu lokasi.');
  bindEvents();
  await loadConfig();

  const hasValidSession = await hydrateStoredSession();
  ui.setAuthState(hasValidSession, visitorName);

  // Initialise the AI chat widget on the map screen
  const mapScreen = document.getElementById('map-screen');
  initChatWidget(mapScreen);

  if (hasValidSession) {
    await enterMapScreen();
  } else {
    ui.showScreen('login');
    ui.setSessionStatus('Log masuk diperlukan');
  }
}

boot().catch((error) => {
  console.error('Aplikasi gagal dimulakan:', error);
});
