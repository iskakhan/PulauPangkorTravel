import { DEFAULT_CENTER, PANGKOR_BOUNDS } from './config.js?v=9';
import { buildLocationPopupHtml, createLocationPinElement } from './components/location-pin.js?v=9';
import { createUserMarkerElement } from './components/user-marker.js?v=9';
import {
  enrichLocationsWithNearby,
  getLocationCategory,
  getLocationId,
  getLocationLatitude,
  getLocationLongitude,
  getLocationName,
} from './location-data.js?v=9';
import { getThemeColor } from './theme.js?v=9';

const DEFAULT_MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';
const POKEMON_CAMERA = {
  pitch: 65,
  zoom: 17.5,
  offset: [0, 108],
  easeDurationMs: 520,
  bearingThrottleMs: 90,
  positionThrottleMs: 240,
  relockMs: 3000,
};
const BUILDINGS_LAYER_ID = 'pangkor-3d-buildings';
const BUILDINGS_GLOW_LAYER_ID = 'pangkor-3d-building-glow';
const TERRAIN_SOURCE_ID = 'pangkor-3d-terrain';
const LOCATION_3D_SOURCE_ID = 'pangkor-location-3d-pins';
const USER_3D_SOURCE_ID = 'pangkor-user-3d-pin';
const LOCATION_3D_HALO_LAYER_ID = 'pangkor-location-3d-halo';
const LOCATION_3D_COLUMN_LAYER_ID = 'pangkor-location-3d-column';
const USER_3D_HALO_LAYER_ID = 'pangkor-user-3d-halo';
const USER_3D_COLUMN_LAYER_ID = 'pangkor-user-3d-column';
const NAVIGATION_ROUTE_SOURCE_ID = 'pangkor-navigation-route';
const ARRIVAL_RADIUS_SOURCE_ID = 'pangkor-arrival-radius';
const ACCURACY_SOURCE_ID = 'pangkor-accuracy-circle';
const EMPTY_FEATURE_COLLECTION = {
  type: 'FeatureCollection',
  features: [],
};
const FALLBACK_RASTER_STYLE = {
  version: 8,
  sources: {
    'pangkor-raster-map': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
        'https://d.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
      ],
      tileSize: 256,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    'pangkor-local': {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Pulau Pangkor' },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [100.535, 4.247],
                [100.555, 4.253],
                [100.578, 4.239],
                [100.586, 4.215],
                [100.575, 4.188],
                [100.552, 4.170],
                [100.529, 4.176],
                [100.518, 4.200],
                [100.521, 4.226],
                [100.535, 4.247],
              ]],
            },
          },
          {
            type: 'Feature',
            properties: { name: 'Pangkor Laut' },
            geometry: {
              type: 'Polygon',
              coordinates: [[
                [100.532, 4.206],
                [100.546, 4.202],
                [100.548, 4.192],
                [100.539, 4.186],
                [100.528, 4.193],
                [100.532, 4.206],
              ]],
            },
          },
        ],
      },
    },
    'pangkor-local-roads': {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [100.536, 4.238],
                [100.552, 4.231],
                [100.567, 4.218],
                [100.568, 4.197],
                [100.552, 4.180],
              ],
            },
          },
          {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [
                [100.525, 4.202],
                [100.540, 4.212],
                [100.556, 4.219],
                [100.579, 4.221],
              ],
            },
          },
        ],
      },
    },
  },
  layers: [
    {
      id: 'pangkor-water',
      type: 'background',
      paint: {
        'background-color': '#d8f4f2',
      },
    },
    {
      id: 'pangkor-raster-map',
      type: 'raster',
      source: 'pangkor-raster-map',
      paint: {
        'raster-opacity': 1,
        'raster-saturation': 0.08,
        'raster-contrast': 0.06,
      },
    },
    {
      id: 'pangkor-local-land',
      type: 'fill',
      source: 'pangkor-local',
      paint: {
        'fill-color': '#16c7bd',
        'fill-opacity': 0.08,
      },
    },
    {
      id: 'pangkor-local-shore',
      type: 'line',
      source: 'pangkor-local',
      paint: {
        'line-color': '#087a7a',
        'line-width': 2.2,
        'line-opacity': 0.78,
      },
    },
    {
      id: 'pangkor-local-roads',
      type: 'line',
      source: 'pangkor-local-roads',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#ffffff',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 0.8, 16, 3],
        'line-opacity': 0.45,
      },
    },
    {
      id: 'pangkor-local-road-glow',
      type: 'line',
      source: 'pangkor-local-roads',
      layout: {
        'line-cap': 'round',
        'line-join': 'round',
      },
      paint: {
        'line-color': '#16c7bd',
        'line-width': ['interpolate', ['linear'], ['zoom'], 12, 2, 16, 6],
        'line-opacity': 0.14,
        'line-blur': 1.4,
      },
    },
  ],
};
const MAP_LOAD_TIMEOUT_MS = 4500;

export function createMapView({
  onLocationClick,
  onMapReady,
  onMapFallback,
  onMapLoadSlow,
  onMapError,
} = {}) {
  let map;
  let mapboxAccessToken = '';
  let mapboxStyleUrl = DEFAULT_MAPBOX_STYLE;
  let hasUsedRasterFallback = false;
  let hasReportedMapReady = false;
  let mapLoadTimeout = null;
  let userMarker;
  let userMarkerElement;
  let activeLocations = [];
  let nearbyById = new Map();
  let visitedLocationIds = new Set();
  let locationMarkers = new Map();
  let navigationTarget = null;
  let isPerspectiveMode = false;
  let isFollowingUser = true;
  let isBearingLocked = true;
  let lastPosition = null;
  let rawMotionHeading = null;
  let activeBearing = 0;
  let targetBearing = null;
  let relockTimer = null;
  let cameraFrame = null;
  let cameraTimer = null;
  let lastCameraAt = 0;
  let lastCameraCenter = null;
  let lastCameraBearing = null;
  let orientationAbortController = null;
  let hasRequestedOrientationPermission = false;

  function configure({ mapboxAccessToken: accessToken, mapboxStyleUrl: styleUrl } = {}) {
    mapboxAccessToken = accessToken || mapboxAccessToken;
    mapboxStyleUrl = styleUrl || mapboxStyleUrl;
  }

  function initMap() {
    if (map) {
      return;
    }

    if (!window.maplibregl) {
      showMapError('Mapbox GL JS tidak dimuat. Semak sambungan CDN.');
      onMapError?.('Mapbox GL JS tidak dimuat. Semak internet/CDN atau gunakan sambungan yang membenarkan api.mapbox.com.');
      return;
    }

    window.maplibregl.accessToken = mapboxAccessToken || '';
    map = new window.maplibregl.Map({
      container: 'map',
      style: mapboxAccessToken ? mapboxStyleUrl : FALLBACK_RASTER_STYLE,
      center: toLngLat(DEFAULT_CENTER),
      zoom: 14,
      minZoom: 12.3,
      maxZoom: 19,
      pitch: 0,
      bearing: 0,
      antialias: true,
      attributionControl: true,
      fadeDuration: 0,
      logoPosition: 'bottom-left',
      renderWorldCopies: false,
    });

    getMapScreen()?.classList.toggle('is-mapbox-fallback', !mapboxAccessToken);
    getMapScreen()?.classList.toggle('has-real-3d', Boolean(mapboxAccessToken));
    map.dragPan?.enable();
    map.scrollZoom?.enable();
    map.touchZoomRotate?.enable();
    map.addControl(new window.maplibregl.NavigationControl({ showCompass: true, visualizePitch: true }), 'bottom-right');

    userMarkerElement = createUserMarkerElement();
    userMarker = new window.maplibregl.Marker({
      element: userMarkerElement,
      anchor: 'center',
      rotationAlignment: 'viewport',
      pitchAlignment: 'viewport',
    })
      .setLngLat(toLngLat(DEFAULT_CENTER))
      .addTo(map);
    setUserMarkerVisible(false);

    map.on('load', handleStyleReady);
    map.on('style.load', handleStyleReady);
    map.on('idle', markMapReady);
    map.on('rotate', updateUserMarkerScreenHeading);
    map.on('dragstart', handleMapDragStart);
    map.on('rotatestart', handleManualRotateStart);
    map.on('rotateend', handleManualRotateEnd);
    map.on('error', handleMapError);
    if (!mapboxAccessToken) {
      map.once('styledata', () => window.setTimeout(markMapReady, 180));
    }

    mapLoadTimeout = window.setTimeout(() => {
      if (hasReportedMapReady) {
        return;
      }

      if (mapboxAccessToken) {
        useRasterFallback('Mapbox mengambil masa terlalu lama. Memuat peta fallback yang lebih ringan.');
      } else {
        onMapLoadSlow?.('Peta 2D sedang dimuat. Semak sambungan internet jika tile lambat muncul.');
      }
    }, MAP_LOAD_TIMEOUT_MS);
  }

  function invalidateSize() {
    map?.resize();
  }

  function setLocations(locations) {
    activeLocations = Array.isArray(locations) ? locations : [];
    renderLocationMarkers();
  }

  function updateLocationStates(nextNearbyById, nextVisitedLocationIds) {
    nearbyById = nextNearbyById || new Map();
    visitedLocationIds = nextVisitedLocationIds || new Set();
    renderLocationMarkers();
  }

  function renderLocationMarkers() {
    if (!map || !window.maplibregl) {
      return;
    }

    locationMarkers.forEach((marker) => marker.remove());
    locationMarkers = new Map();

    const enrichedLocations = enrichLocationsWithNearby(activeLocations, nearbyById, visitedLocationIds);
    const navigationTargetId = getLocationId(navigationTarget);
    updateLocation3dPins(enrichedLocations);

    enrichedLocations.forEach((location) => {
      const lngLat = getLocationLngLat(location);
      if (!lngLat) {
        return;
      }

      const markerLocation = {
        ...location,
        is_navigation_target: Boolean(navigationTargetId && getLocationId(location) === navigationTargetId),
      };
      const element = createLocationPinElement(markerLocation, { onClick: onLocationClick });
      const popup = new window.maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 18,
        className: 'pin-popup',
      }).setHTML(buildLocationPopupHtml(markerLocation));

      element.addEventListener('mouseenter', () => popup.setLngLat(lngLat).addTo(map));
      element.addEventListener('mouseleave', () => popup.remove());
      element.addEventListener('focus', () => popup.setLngLat(lngLat).addTo(map));
      element.addEventListener('blur', () => popup.remove());

      const marker = new window.maplibregl.Marker({
        element,
        anchor: 'bottom',
        offset: [0, 8],
        rotationAlignment: 'viewport',
        pitchAlignment: 'viewport',
      })
        .setLngLat(lngLat)
        .addTo(map);

      const id = getLocationId(markerLocation);
      if (id) {
        locationMarkers.set(String(id), marker);
      }
    });
  }

  function updatePositionMarker(latitude, longitude, accuracy, motion = {}) {
    if (!map || !userMarker) {
      return;
    }

    const lngLat = [Number(longitude), Number(latitude)];
    if (!isLngLat(lngLat)) {
      return;
    }

    lastPosition = {
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy,
      heading: motion.heading,
      speed: motion.speed,
    };

    setUserMarkerVisible(true);
    userMarker.setLngLat(lngLat);
    updateUserMotion(motion);
    updateAccuracyCircle(lngLat, accuracy);
    updateUser3dPin(lngLat);
    renderNavigationOverlay(lastPosition);
    followUserPosition(lngLat);
  }

  function clearUserPosition() {
    lastPosition = null;
    rawMotionHeading = null;
    targetBearing = null;
    lastCameraCenter = null;
    lastCameraBearing = null;
    userMarkerElement?.classList.remove('has-heading');
    setUserMarkerVisible(false);
    setGeoJsonSourceData(ACCURACY_SOURCE_ID, EMPTY_FEATURE_COLLECTION);
    setGeoJsonSourceData(USER_3D_SOURCE_ID, EMPTY_FEATURE_COLLECTION);
    renderNavigationOverlay(null);
  }

  function setUserMarkerVisible(isVisible) {
    userMarkerElement?.classList.toggle('is-hidden', !isVisible);
  }

  function updateUserMotion({ heading, speed } = {}) {
    if (!userMarkerElement) {
      return;
    }

    if (isValidHeading(heading) && (Number(speed) > 0.2 || !isValidHeading(targetBearing))) {
      setCameraHeading(Number(heading), 'geolocation');
    }

    if (isValidHeading(heading)) {
      rawMotionHeading = normalizeBearing(heading);
      userMarkerElement.classList.add('has-heading');
    } else if (isValidHeading(targetBearing)) {
      rawMotionHeading = targetBearing;
      userMarkerElement.classList.add('has-heading');
    } else {
      rawMotionHeading = null;
      userMarkerElement.classList.remove('has-heading');
    }

    if (Number.isFinite(speed)) {
      userMarkerElement.style.setProperty('--user-speed', String(Math.max(speed, 0)));
    }

    updateUserMarkerScreenHeading();
  }

  function centerOnPosition(position) {
    if (!position || !map) {
      return false;
    }

    const lngLat = getPositionLngLat(position);
    if (!lngLat) {
      return false;
    }

    isFollowingUser = true;
    getMapScreen()?.classList.remove('is-exploring', 'is-overview');
    lastPosition = {
      ...lastPosition,
      ...position,
    };

    if (isPerspectiveMode) {
      schedulePokemonCamera({ force: true, reason: 'position' });
    } else {
      map.easeTo({
        center: lngLat,
        zoom: Math.max(map.getZoom(), navigationTarget ? 18 : 17),
        pitch: 0,
        duration: 420,
        essential: true,
      });
    }

    return true;
  }

  function setPerspectiveMode(isEnabled) {
    isPerspectiveMode = Boolean(isEnabled);
    getMapScreen()?.classList.toggle('is-3d', isPerspectiveMode);
    if (isPerspectiveMode) {
      getMapScreen()?.classList.remove('is-overview');
    }

    if (!map) {
      return;
    }

    if (isPerspectiveMode) {
      enterPokemonCameraMode();
    } else {
      exitPokemonCameraMode();
    }

    invalidateSize();
  }

  function setNavigationTarget(location, position, { focus = true } = {}) {
    const targetLngLat = getLocationLngLat(location);
    if (!targetLngLat) {
      return false;
    }

    navigationTarget = location;
    getMapScreen()?.classList.add('is-navigation');
    renderNavigationOverlay(position);
    renderLocationMarkers();

    if (focus) {
      focusNavigationRoute(position);
    }

    return true;
  }

  function clearNavigationTarget() {
    navigationTarget = null;
    setGeoJsonSourceData(NAVIGATION_ROUTE_SOURCE_ID, EMPTY_FEATURE_COLLECTION);
    setGeoJsonSourceData(ARRIVAL_RADIUS_SOURCE_ID, EMPTY_FEATURE_COLLECTION);
    getMapScreen()?.classList.remove('is-navigation');
    renderLocationMarkers();
  }

  function setFollowUser(isEnabled) {
    isFollowingUser = Boolean(isEnabled);
    getMapScreen()?.classList.toggle('is-exploring', !isFollowingUser);

    if (isFollowingUser && lastPosition) {
      getMapScreen()?.classList.remove('is-overview');
      schedulePokemonCamera({ force: true, reason: 'position' });
    }
  }

  function focusPangkor({ animate = true } = {}) {
    if (!map) {
      return false;
    }

    map.fitBounds(toMapboxBounds(PANGKOR_BOUNDS), {
      padding: 26,
      duration: animate ? 420 : 0,
      maxZoom: isPerspectiveMode ? 15.8 : 14.2,
      pitch: isPerspectiveMode ? POKEMON_CAMERA.pitch : 0,
      bearing: isPerspectiveMode ? normalizeBearing(map.getBearing()) : 0,
      essential: true,
    });
    return true;
  }

  function showPangkorOverview({ animate = true } = {}) {
    if (!map) {
      return false;
    }

    isFollowingUser = false;
    getMapScreen()?.classList.add('is-exploring', 'is-overview');
    map.fitBounds(toMapboxBounds(PANGKOR_BOUNDS), {
      padding: { top: 118, right: 28, bottom: 168, left: 28 },
      duration: animate ? 520 : 0,
      maxZoom: 13.35,
      pitch: 0,
      bearing: 0,
      essential: true,
    });
    return true;
  }

  function handleStyleReady() {
    ensureMapSourcesAndLayers();
    updateLocation3dPins(enrichLocationsWithNearby(activeLocations, nearbyById, visitedLocationIds));
    renderNavigationOverlay(lastPosition);
    if (lastPosition) {
      const positionLngLat = getPositionLngLat(lastPosition);
      updateAccuracyCircle(positionLngLat, lastPosition.accuracy);
      updateUser3dPin(positionLngLat);
    }
    update3dBuildingsLayer();
    update3dTerrain();
    renderLocationMarkers();
    setPerspectiveMode(isPerspectiveMode);
    if (!mapboxAccessToken || hasUsedRasterFallback) {
      window.setTimeout(markMapReady, 350);
    }
  }

  function handleMapError(event) {
    const message = String(event?.error?.message || '');
    if (
      !hasUsedRasterFallback &&
      mapboxAccessToken &&
      /401|403|unauthorized|forbidden|token|not authorized/i.test(message)
    ) {
      useRasterFallback('Token Mapbox tidak sah atau disekat. Memuat peta fallback.');
      return;
    }

    if (!hasReportedMapReady) {
      onMapError?.(message || 'Peta mengambil masa untuk dimuat.');
    }
    console.warn('Mapbox GL error:', event.error || event);
  }

  function useRasterFallback(message) {
    if (!map || hasUsedRasterFallback) {
      return;
    }

    hasUsedRasterFallback = true;
    mapboxAccessToken = '';
    window.maplibregl.accessToken = '';
    getMapScreen()?.classList.add('is-mapbox-fallback');
    getMapScreen()?.classList.remove('has-real-3d');
    onMapFallback?.(message);
    map.setStyle(FALLBACK_RASTER_STYLE);
  }

  function markMapReady() {
    if (hasReportedMapReady) {
      return;
    }

    hasReportedMapReady = true;
    window.clearTimeout(mapLoadTimeout);
    onMapReady?.({
      hasReal3d: Boolean(mapboxAccessToken),
      isFallback: !mapboxAccessToken || hasUsedRasterFallback,
    });
  }

  // Camera Mengikut Kompas: deviceorientation memberi bearing real-time,
  // manakala Geolocation heading menjadi fallback semasa pengguna bergerak.
  function startDeviceOrientationTracking() {
    if (orientationAbortController || !window.DeviceOrientationEvent) {
      return;
    }

    const attachListeners = () => {
      if (orientationAbortController) {
        return;
      }
      orientationAbortController = new AbortController();
      const options = { passive: true, signal: orientationAbortController.signal };
      window.addEventListener('deviceorientationabsolute', handleDeviceOrientation, options);
      window.addEventListener('deviceorientation', handleDeviceOrientation, options);
    };

    if (
      typeof window.DeviceOrientationEvent.requestPermission === 'function' &&
      !hasRequestedOrientationPermission
    ) {
      hasRequestedOrientationPermission = true;
      window.DeviceOrientationEvent.requestPermission()
        .then((permission) => {
          if (permission === 'granted') {
            attachListeners();
          }
        })
        .catch(() => {
          hasRequestedOrientationPermission = false;
        });
      return;
    }

    attachListeners();
  }

  function stopDeviceOrientationTracking() {
    orientationAbortController?.abort();
    orientationAbortController = null;
  }

  function handleDeviceOrientation(event) {
    const heading = getCompassHeading(event);
    if (!isValidHeading(heading)) {
      return;
    }

    rawMotionHeading = normalizeBearing(heading);
    userMarkerElement?.classList.add('has-heading');
    setCameraHeading(rawMotionHeading, 'deviceorientation');
    updateUserMarkerScreenHeading();
  }

  // Kesan Kamera Pokemon GO: pitch 65, zoom 17.5, dan easeTo yang dithrottle
  // supaya bearing/center tidak melompat ketika GPS menghantar data rapat-rapat.
  function enterPokemonCameraMode() {
    map.dragPitch?.disable();
    map.touchPitch?.disable?.();
    map.dragRotate?.enable();
    map.touchZoomRotate?.enableRotation?.();
    isBearingLocked = true;
    getMapScreen()?.classList.remove('is-free-rotate');
    startDeviceOrientationTracking();
    update3dBuildingsLayer();
    update3dTerrain();
    update3dPinVisibility();
    schedulePokemonCamera({ force: true, reason: 'position' });
  }

  function exitPokemonCameraMode() {
    stopDeviceOrientationTracking();
    window.clearTimeout(relockTimer);
    isBearingLocked = true;
    getMapScreen()?.classList.remove('is-free-rotate');
    setLayerVisibility(BUILDINGS_LAYER_ID, 'none');
    setLayerVisibility(BUILDINGS_GLOW_LAYER_ID, 'none');
    setLayerVisibility(LOCATION_3D_HALO_LAYER_ID, 'none');
    setLayerVisibility(LOCATION_3D_COLUMN_LAYER_ID, 'none');
    setLayerVisibility(USER_3D_HALO_LAYER_ID, 'none');
    setLayerVisibility(USER_3D_COLUMN_LAYER_ID, 'none');
    map.setTerrain?.(null);
    map.dragPitch?.enable();
    map.easeTo({
      pitch: 0,
      bearing: 0,
      zoom: Math.min(Math.max(map.getZoom(), 14), 17),
      offset: [0, 0],
      duration: 480,
      essential: true,
    });
  }

  function setCameraHeading(nextHeading, source = 'deviceorientation') {
    const normalizedHeading = normalizeBearing(nextHeading);
    if (!isValidHeading(normalizedHeading)) {
      return;
    }

    const isFirstHeading = !isValidHeading(targetBearing);
    targetBearing = normalizedHeading;
    activeBearing = isFirstHeading
      ? normalizedHeading
      : normalizeBearing(activeBearing + shortestBearingDelta(activeBearing, normalizedHeading) * 0.28);

    if (isPerspectiveMode && isFollowingUser && isBearingLocked) {
      schedulePokemonCamera({ reason: source === 'geolocation' ? 'position' : 'bearing' });
    }
  }

  function schedulePokemonCamera({ force = false, reason = 'position' } = {}) {
    if (!map || !isFollowingUser || !isPerspectiveMode) {
      return;
    }

    if (cameraFrame) {
      return;
    }

    cameraFrame = window.requestAnimationFrame(() => {
      cameraFrame = null;
      syncPokemonCamera({ force, reason });
    });
  }

  function syncPokemonCamera({ force = false, reason = 'position' } = {}) {
    const center = getPositionLngLat(lastPosition);
    if (!map || !center) {
      map?.easeTo({
        pitch: POKEMON_CAMERA.pitch,
        zoom: Math.max(map.getZoom(), POKEMON_CAMERA.zoom),
        duration: 520,
        essential: true,
      });
      return;
    }

    const now = performance.now();
    const throttleMs = reason === 'bearing' ? POKEMON_CAMERA.bearingThrottleMs : POKEMON_CAMERA.positionThrottleMs;
    if (!force && now - lastCameraAt < throttleMs) {
      window.clearTimeout(cameraTimer);
      cameraTimer = window.setTimeout(() => syncPokemonCamera({ force, reason }), throttleMs);
      return;
    }

    const desiredBearing = isBearingLocked && isValidHeading(targetBearing)
      ? activeBearing
      : normalizeBearing(map.getBearing());
    const movedMeters = distanceBetweenLngLat(lastCameraCenter, center);
    const bearingChanged = Math.abs(shortestBearingDelta(lastCameraBearing ?? desiredBearing, desiredBearing));

    if (!force && movedMeters < 0.8 && bearingChanged < 1.2) {
      return;
    }

    lastCameraAt = now;
    lastCameraCenter = center;
    lastCameraBearing = desiredBearing;

    map.easeTo({
      center,
      bearing: desiredBearing,
      pitch: POKEMON_CAMERA.pitch,
      zoom: POKEMON_CAMERA.zoom,
      offset: POKEMON_CAMERA.offset,
      duration: POKEMON_CAMERA.easeDurationMs,
      easing: easeOutCubic,
      essential: true,
    });
  }

  function followUserPosition(lngLat) {
    if (!map || !isFollowingUser) {
      return;
    }

    if (isPerspectiveMode) {
      schedulePokemonCamera({ reason: 'position' });
      return;
    }

    map.easeTo({
      center: lngLat,
      zoom: Math.max(map.getZoom(), navigationTarget ? 18 : 17),
      pitch: 0,
      duration: navigationTarget ? 420 : 300,
      easing: easeOutCubic,
      essential: true,
    });
  }

  // Kawalan Gestur: pitch manual dimatikan dalam 3D, tetapi rotate manual
  // dibenarkan. Selepas 3 saat tanpa sentuhan, bearing dikunci semula ke avatar.
  function handleManualRotateStart(event) {
    if (!isPerspectiveMode || !event.originalEvent) {
      return;
    }

    isBearingLocked = false;
    getMapScreen()?.classList.add('is-free-rotate');
    window.clearTimeout(relockTimer);
  }

  function handleManualRotateEnd(event) {
    if (!isPerspectiveMode || !event.originalEvent) {
      return;
    }

    window.clearTimeout(relockTimer);
    relockTimer = window.setTimeout(() => {
      isBearingLocked = true;
      getMapScreen()?.classList.remove('is-free-rotate');
      schedulePokemonCamera({ force: true, reason: 'bearing' });
    }, POKEMON_CAMERA.relockMs);
  }

  function handleMapDragStart(event) {
    if (!event.originalEvent) {
      return;
    }

    isFollowingUser = false;
    getMapScreen()?.classList.add('is-exploring');
  }

  // Gaya Bangunan 3D Semi-Telus: layer fill-extrusion biru mutiara
  // dengan opacity 0.6 dan footprint glow untuk rasa hologram digital.
  function update3dBuildingsLayer() {
    if (!map || !isStyleReady()) {
      return;
    }

    const source = map.getSource('composite');
    if (!source) {
      setLayerVisibility(BUILDINGS_LAYER_ID, 'none');
      setLayerVisibility(BUILDINGS_GLOW_LAYER_ID, 'none');
      return;
    }

    const beforeLayerId = findFirstSymbolLayerId();
    if (!map.getLayer(BUILDINGS_LAYER_ID)) {
      map.addLayer(
        {
          id: BUILDINGS_LAYER_ID,
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', ['get', 'extrude'], 'true'],
          type: 'fill-extrusion',
          minzoom: 15,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['to-number', ['get', 'height'], 0],
              0,
              '#f8fbff',
              40,
              '#b9e7ff',
              120,
              '#7dd3fc',
            ],
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['to-number', ['get', 'height'], 0],
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['to-number', ['get', 'min_height'], 0],
            ],
            'fill-extrusion-opacity': 0.6,
            'fill-extrusion-vertical-gradient': true,
          },
          layout: {
            visibility: isPerspectiveMode ? 'visible' : 'none',
          },
        },
        beforeLayerId,
      );
    }

    if (!map.getLayer(BUILDINGS_GLOW_LAYER_ID)) {
      map.addLayer(
        {
          id: BUILDINGS_GLOW_LAYER_ID,
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', ['get', 'extrude'], 'true'],
          type: 'line',
          minzoom: 15,
          paint: {
            'line-color': '#e0f7ff',
            'line-width': ['interpolate', ['linear'], ['zoom'], 15, 0.35, 18, 1.4],
            'line-opacity': isPerspectiveMode ? 0.5 : 0,
            'line-blur': 1.2,
          },
          layout: {
            visibility: isPerspectiveMode ? 'visible' : 'none',
          },
        },
        beforeLayerId,
      );
    }

    setLayerVisibility(BUILDINGS_LAYER_ID, isPerspectiveMode ? 'visible' : 'none');
    setLayerVisibility(BUILDINGS_GLOW_LAYER_ID, isPerspectiveMode ? 'visible' : 'none');
  }

  function update3dTerrain() {
    if (!map || !isStyleReady() || !mapboxAccessToken) {
      return;
    }

    if (!map.getSource(TERRAIN_SOURCE_ID)) {
      map.addSource(TERRAIN_SOURCE_ID, {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      });
    }

    map.setTerrain?.(isPerspectiveMode ? { source: TERRAIN_SOURCE_ID, exaggeration: 1.35 } : null);
  }

  function ensureMapSourcesAndLayers() {
    if (!map || !isStyleReady()) {
      return;
    }

    addGeoJsonSource(NAVIGATION_ROUTE_SOURCE_ID);
    addGeoJsonSource(ARRIVAL_RADIUS_SOURCE_ID);
    addGeoJsonSource(ACCURACY_SOURCE_ID);
    addGeoJsonSource(LOCATION_3D_SOURCE_ID);
    addGeoJsonSource(USER_3D_SOURCE_ID);
    addRouteLayers();
    addRadiusLayers();
    addAccuracyLayers();
    addLocation3dLayers();
    addUser3dLayers();
    update3dPinVisibility();
  }

  function addGeoJsonSource(id) {
    if (!map.getSource(id)) {
      map.addSource(id, {
        type: 'geojson',
        data: EMPTY_FEATURE_COLLECTION,
      });
    }
  }

  function addRouteLayers() {
    const routeColor = getThemeColor('--map-navigation-route', '#06a7b8');
    const routeSoft = getThemeColor('--map-navigation-route-soft', '#fbcfe8');

    if (!map.getLayer('pangkor-navigation-route-halo')) {
      map.addLayer({
        id: 'pangkor-navigation-route-halo',
        type: 'line',
        source: NAVIGATION_ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': routeSoft,
          'line-width': 14,
          'line-opacity': 0.38,
          'line-blur': 0.6,
        },
      });
    }

    if (!map.getLayer('pangkor-navigation-route-line')) {
      map.addLayer({
        id: 'pangkor-navigation-route-line',
        type: 'line',
        source: NAVIGATION_ROUTE_SOURCE_ID,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': routeColor,
          'line-width': 6,
          'line-opacity': 0.92,
        },
      });
    }
  }

  function addRadiusLayers() {
    const routeColor = getThemeColor('--map-navigation-route', '#06a7b8');
    const routeSoft = getThemeColor('--map-navigation-route-soft', '#fbcfe8');

    if (!map.getLayer('pangkor-arrival-radius-fill')) {
      map.addLayer({
        id: 'pangkor-arrival-radius-fill',
        type: 'fill',
        source: ARRIVAL_RADIUS_SOURCE_ID,
        paint: {
          'fill-color': routeSoft,
          'fill-opacity': 0.22,
        },
      });
    }

    if (!map.getLayer('pangkor-arrival-radius-line')) {
      map.addLayer({
        id: 'pangkor-arrival-radius-line',
        type: 'line',
        source: ARRIVAL_RADIUS_SOURCE_ID,
        paint: {
          'line-color': routeColor,
          'line-width': 2,
          'line-opacity': 0.9,
        },
      });
    }
  }

  function addAccuracyLayers() {
    const stroke = getThemeColor('--map-accuracy-stroke', '#0d9488');
    const fill = getThemeColor('--map-accuracy-fill', '#2dd4bf');

    if (!map.getLayer('pangkor-accuracy-fill')) {
      map.addLayer({
        id: 'pangkor-accuracy-fill',
        type: 'fill',
        source: ACCURACY_SOURCE_ID,
        paint: {
          'fill-color': fill,
          'fill-opacity': 0.14,
        },
      });
    }

    if (!map.getLayer('pangkor-accuracy-line')) {
      map.addLayer({
        id: 'pangkor-accuracy-line',
        type: 'line',
        source: ACCURACY_SOURCE_ID,
        paint: {
          'line-color': stroke,
          'line-width': 2,
          'line-opacity': 0.92,
        },
      });
    }
  }

  function addLocation3dLayers() {
    const beforeLayerId = findFirstSymbolLayerId();

    if (!map.getLayer(LOCATION_3D_HALO_LAYER_ID)) {
      map.addLayer(
        {
          id: LOCATION_3D_HALO_LAYER_ID,
          type: 'fill',
          source: LOCATION_3D_SOURCE_ID,
          paint: {
            'fill-color': ['to-color', ['get', 'softColor'], '#e0f7ff'],
            'fill-opacity': ['case', ['boolean', ['get', 'target'], false], 0.34, 0.18],
          },
          layout: {
            visibility: isPerspectiveMode ? 'visible' : 'none',
          },
        },
        beforeLayerId,
      );
    }

    if (!map.getLayer(LOCATION_3D_COLUMN_LAYER_ID)) {
      map.addLayer(
        {
          id: LOCATION_3D_COLUMN_LAYER_ID,
          type: 'fill-extrusion',
          source: LOCATION_3D_SOURCE_ID,
          paint: {
            'fill-extrusion-color': ['to-color', ['get', 'color'], '#14b8a6'],
            'fill-extrusion-height': ['to-number', ['get', 'height'], 70],
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.76,
            'fill-extrusion-vertical-gradient': true,
          },
          layout: {
            visibility: isPerspectiveMode ? 'visible' : 'none',
          },
        },
        beforeLayerId,
      );
    }
  }

  function addUser3dLayers() {
    const beforeLayerId = findFirstSymbolLayerId();

    if (!map.getLayer(USER_3D_HALO_LAYER_ID)) {
      map.addLayer(
        {
          id: USER_3D_HALO_LAYER_ID,
          type: 'fill',
          source: USER_3D_SOURCE_ID,
          paint: {
            'fill-color': '#5eead4',
            'fill-opacity': 0.22,
          },
          layout: {
            visibility: isPerspectiveMode ? 'visible' : 'none',
          },
        },
        beforeLayerId,
      );
    }

    if (!map.getLayer(USER_3D_COLUMN_LAYER_ID)) {
      map.addLayer(
        {
          id: USER_3D_COLUMN_LAYER_ID,
          type: 'fill-extrusion',
          source: USER_3D_SOURCE_ID,
          paint: {
            'fill-extrusion-color': '#14b8a6',
            'fill-extrusion-height': 58,
            'fill-extrusion-base': 0,
            'fill-extrusion-opacity': 0.82,
            'fill-extrusion-vertical-gradient': true,
          },
          layout: {
            visibility: isPerspectiveMode ? 'visible' : 'none',
          },
        },
        beforeLayerId,
      );
    }
  }

  function updateLocation3dPins(locations) {
    if (!map || !isStyleReady()) {
      return;
    }

    const navigationTargetId = getLocationId(navigationTarget);
    const features = (Array.isArray(locations) ? locations : []).map((location) => {
      const lngLat = getLocationLngLat(location);
      if (!lngLat) {
        return null;
      }

      const locationId = getLocationId(location);
      const isTarget = Boolean(navigationTargetId && locationId === navigationTargetId);
      const isUnlockable = Boolean(location.is_unlockable);
      const isVisited = Boolean(location.is_visited);
      const color = getLocation3dColor(location);
      const radius = isTarget ? 38 : isUnlockable ? 30 : 23;
      const height = isTarget ? 135 : isUnlockable ? 96 : isVisited ? 54 : 72;

      return createCircleFeature(lngLat, radius, 40, {
        id: locationId,
        target: isTarget,
        color,
        softColor: isTarget ? '#bff4f0' : '#e0f7ff',
        height,
      });
    }).filter(Boolean);

    setGeoJsonSourceData(LOCATION_3D_SOURCE_ID, featureCollection(features));
  }

  function updateUser3dPin(lngLat) {
    if (!isLngLat(lngLat)) {
      return;
    }

    setGeoJsonSourceData(
      USER_3D_SOURCE_ID,
      featureCollection([
        createCircleFeature(lngLat, 18, 36, {
          id: 'user',
        }),
      ]),
    );
  }

  function update3dPinVisibility() {
    const visibility = isPerspectiveMode ? 'visible' : 'none';
    setLayerVisibility(LOCATION_3D_HALO_LAYER_ID, visibility);
    setLayerVisibility(LOCATION_3D_COLUMN_LAYER_ID, visibility);
    setLayerVisibility(USER_3D_HALO_LAYER_ID, visibility);
    setLayerVisibility(USER_3D_COLUMN_LAYER_ID, visibility);
  }

  function updateAccuracyCircle(lngLat, accuracy) {
    if (!isLngLat(lngLat)) {
      return;
    }

    const radius = Math.max(Number(accuracy) || 50, 50);
    setGeoJsonSourceData(ACCURACY_SOURCE_ID, featureCollection([createCircleFeature(lngLat, radius)]));
  }

  function renderNavigationOverlay(position) {
    if (!map || !navigationTarget) {
      return;
    }

    const targetLngLat = getLocationLngLat(navigationTarget);
    if (!targetLngLat) {
      return;
    }

    const positionLngLat = getPositionLngLat(position);
    const routeFeatures = positionLngLat
      ? [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [positionLngLat, targetLngLat],
          },
          properties: {},
        },
      ]
      : [];

    setGeoJsonSourceData(NAVIGATION_ROUTE_SOURCE_ID, featureCollection(routeFeatures));
    setGeoJsonSourceData(ARRIVAL_RADIUS_SOURCE_ID, featureCollection([createCircleFeature(targetLngLat, 50)]));
  }

  function focusNavigationRoute(position) {
    if (!map || !navigationTarget || !window.maplibregl) {
      return;
    }

    const targetLngLat = getLocationLngLat(navigationTarget);
    const positionLngLat = getPositionLngLat(position);
    if (!targetLngLat) {
      return;
    }

    if (!positionLngLat) {
      map.flyTo({
        center: targetLngLat,
        zoom: Math.max(map.getZoom(), 17),
        pitch: isPerspectiveMode ? POKEMON_CAMERA.pitch : 0,
        bearing: isPerspectiveMode ? activeBearing : map.getBearing(),
        duration: 600,
        essential: true,
      });
      return;
    }

    const bounds = new window.maplibregl.LngLatBounds(positionLngLat, positionLngLat);
    bounds.extend(targetLngLat);
    map.fitBounds(bounds, {
      padding: { top: 118, right: 52, bottom: 178, left: 52 },
      maxZoom: isPerspectiveMode ? POKEMON_CAMERA.zoom : 18,
      duration: 600,
      pitch: isPerspectiveMode ? POKEMON_CAMERA.pitch : 0,
      bearing: isPerspectiveMode ? activeBearing : map.getBearing(),
      essential: true,
    });
  }

  function updateUserMarkerScreenHeading() {
    if (!userMarkerElement) {
      return;
    }

    const heading = isValidHeading(rawMotionHeading)
      ? rawMotionHeading
      : isValidHeading(targetBearing)
        ? targetBearing
        : null;

    if (!isValidHeading(heading)) {
      userMarkerElement.classList.remove('has-heading');
      return;
    }

    const screenHeading = normalizeBearing(heading - (map?.getBearing() || 0));
    userMarkerElement.style.setProperty('--user-heading', `${screenHeading}deg`);
    userMarkerElement.classList.add('has-heading');
  }

  function setGeoJsonSourceData(sourceId, data) {
    if (!map || !isStyleReady()) {
      return;
    }

    const source = map.getSource(sourceId);
    if (source?.setData) {
      source.setData(data);
    }
  }

  function setLayerVisibility(layerId, visibility) {
    if (!map || !map.getLayer(layerId)) {
      return;
    }
    map.setLayoutProperty(layerId, 'visibility', visibility);
  }

  function findFirstSymbolLayerId() {
    return map.getStyle().layers?.find((layer) => layer.type === 'symbol' && layer.layout?.['text-field'])?.id;
  }

  function isStyleReady() {
    return Boolean(map?.isStyleLoaded?.());
  }

  function getLocationLngLat(location) {
    const latitude = getLocationLatitude(location);
    const longitude = getLocationLongitude(location);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      console.warn('Koordinat lokasi tidak sah:', getLocationName(location));
      return null;
    }
    return [longitude, latitude];
  }

  function getPositionLngLat(position) {
    if (!position) {
      return null;
    }

    const latitude = Number(position.latitude);
    const longitude = Number(position.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude) ? [longitude, latitude] : null;
  }

  return {
    configure,
    initMap,
    invalidateSize,
    setLocations,
    updateLocationStates,
    updatePositionMarker,
    clearUserPosition,
    centerOnPosition,
    setPerspectiveMode,
    setNavigationTarget,
    clearNavigationTarget,
    setFollowUser,
    focusPangkor,
    showPangkorOverview,
  };
}

function toLngLat(latLng) {
  return [latLng[1], latLng[0]];
}

function toMapboxBounds(bounds) {
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.north],
  ];
}

function isLngLat(lngLat) {
  return Array.isArray(lngLat) && Number.isFinite(lngLat[0]) && Number.isFinite(lngLat[1]);
}

function isValidHeading(value) {
  if (value === null || value === undefined || value === '') {
    return false;
  }
  return Number.isFinite(Number(value));
}

function normalizeBearing(value) {
  return ((Number(value) % 360) + 360) % 360;
}

function shortestBearingDelta(from, to) {
  if (!isValidHeading(from) || !isValidHeading(to)) {
    return 0;
  }
  return ((normalizeBearing(to) - normalizeBearing(from) + 540) % 360) - 180;
}

function getCompassHeading(event) {
  if (Number.isFinite(event.webkitCompassHeading)) {
    return event.webkitCompassHeading;
  }

  if (Number.isFinite(event.alpha)) {
    return normalizeBearing(360 - event.alpha);
  }

  return null;
}

function createCircleFeature(centerLngLat, radiusMeters, steps = 72, properties = {}) {
  const [lng, lat] = centerLngLat;
  const earthRadius = 6378137;
  const latRad = degreesToRadians(lat);
  const coordinates = [];

  for (let i = 0; i <= steps; i += 1) {
    const angle = (i / steps) * Math.PI * 2;
    const dx = radiusMeters * Math.cos(angle);
    const dy = radiusMeters * Math.sin(angle);
    const pointLat = lat + radiansToDegrees(dy / earthRadius);
    const pointLng = lng + radiansToDegrees(dx / (earthRadius * Math.cos(latRad)));
    coordinates.push([pointLng, pointLat]);
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coordinates],
    },
    properties,
  };
}

function featureCollection(features) {
  return {
    type: 'FeatureCollection',
    features,
  };
}

function distanceBetweenLngLat(from, to) {
  if (!isLngLat(from) || !isLngLat(to)) {
    return Number.POSITIVE_INFINITY;
  }

  const earthRadius = 6371000;
  const fromLat = degreesToRadians(from[1]);
  const toLat = degreesToRadians(to[1]);
  const deltaLat = degreesToRadians(to[1] - from[1]);
  const deltaLng = degreesToRadians(to[0] - from[0]);
  const a = Math.sin(deltaLat / 2) ** 2
    + Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;
  return 2 * earthRadius * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getLocation3dColor(location) {
  const category = getLocationCategory(location);
  const fallbackColors = {
    beach: '#0891b2',
    historical: '#3f7f8f',
    temple: '#dc2626',
    jetty: '#2563eb',
    food: '#c99a2e',
    activity: '#16a34a',
    other: '#475569',
  };
  return getThemeColor(`--category-${category}`, fallbackColors[category] || fallbackColors.other);
}

function degreesToRadians(value) {
  return (value * Math.PI) / 180;
}

function radiansToDegrees(value) {
  return (value * 180) / Math.PI;
}

function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

function getMapScreen() {
  return document.getElementById('map-screen');
}

function showMapError(message) {
  const mapElement = document.getElementById('map');
  if (!mapElement) {
    return;
  }

  mapElement.innerHTML = `
    <div class="map-error" role="alert">
      <strong>Peta tidak dapat dimuat</strong>
      <span>${message}</span>
    </div>
  `;
}
