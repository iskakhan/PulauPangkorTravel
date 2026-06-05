import { formatDistance } from '../formatters.js';
import { buildNearbyLocationCard } from '../components/nearby-location-card.js';
import { showUnlockAnimation as playUnlockAnimation } from '../components/unlock-animation.js';
import { getLocationName } from '../location-data.js';

export function createMapPanelUi(dom) {
  function setSummary(kicker, title, description) {
    dom.summaryKicker.textContent = kicker;
    dom.summaryTitle.textContent = title;
    dom.summaryDescription.textContent = description;
  }

  function setLocationStatus(message) {
    dom.locationStatus.textContent = message;
  }

  function setMapLoading(message) {
    dom.mapLoadingMessage.textContent = message;
    dom.mapLoading.classList.remove('hidden');
  }

  function hideMapLoading() {
    dom.mapLoading.classList.add('hidden');
  }

  function setSessionStatus(message) {
    dom.sessionStatus.textContent = message;
  }

  function setAccuracy(accuracy) {
    const roundedAccuracy = Math.round(Number(accuracy) || 0);
    dom.accuracyPill.textContent = roundedAccuracy > 0 ? `Ketepatan +/-${roundedAccuracy} m` : 'Ketepatan tersedia';
  }

  function showPermissionError(message) {
    dom.permissionTitle.textContent = 'GPS tidak tersedia';
    dom.permissionMessage.textContent = message;
    dom.retryLocationButton.classList.remove('hidden');
    dom.permissionCard.classList.remove('hidden');
    setLocationStatus(message);
  }

  function hidePermissionError() {
    dom.permissionCard.classList.add('hidden');
  }

  function showAreaWarning(message) {
    dom.permissionTitle.textContent = "You're not in Pangkor.";
    dom.permissionMessage.textContent = message;
    dom.retryLocationButton.classList.add('hidden');
    dom.permissionCard.classList.remove('hidden');
  }

  function updateDestinationSummary(destination) {
    const distance = formatDistance(destination.jarak_meter);
    setSummary(distance, destination.nama || 'Destinasi berdekatan', destination.penerangan || 'Maklumat destinasi tersedia.');
    dom.openDestinationButton.classList.remove('hidden');
  }

  function updateEmptyDestinationSummary() {
    dom.openDestinationButton.classList.add('hidden');
    setSummary('Tiada destinasi dekat', 'Teruskan jelajah', 'Belum ada lokasi menarik dalam radius 50 m.');
  }

  function setAuthState(isAuthenticated, visitorName = '') {
    dom.authStatus.textContent = isAuthenticated ? visitorName || 'Pelawat aktif' : 'Log masuk diperlukan';
    dom.logoutButton.classList.toggle('hidden', !isAuthenticated);
    dom.loginPromptButton.classList.toggle('hidden', isAuthenticated);
  }

  function updateGameStatus({ position, nearbyCount, unlockedCount }) {
    if (position) {
      dom.userCoordinates.textContent = `${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`;
    } else {
      dom.userCoordinates.textContent = 'Mencari GPS';
    }

    dom.nearbyCount.textContent = String(nearbyCount || 0);
    dom.unlockedCount.textContent = String(unlockedCount || 0);
  }

  function setWeatherLoading() {
    dom.weatherTemperature.textContent = 'Cuaca --';
    dom.weatherSummary.textContent = 'Mengemas kini cuaca semasa';
    dom.weatherWind.textContent = 'Angin --';
  }

  function setWeather(weather) {
    const temperature = formatWeatherNumber(weather.temperature_c);
    const feelsLike = formatWeatherNumber(weather.apparent_temperature_c);
    const windSpeed = formatWeatherNumber(weather.wind_speed_kmh);
    const humidity = Number.isFinite(weather.humidity_percent) ? `${weather.humidity_percent}% lembap` : '';
    const rain = Number(weather.precipitation_mm) > 0 ? ` · Hujan ${weather.precipitation_mm} mm` : '';

    dom.weatherTemperature.textContent = temperature === null ? 'Cuaca semasa' : `${temperature}°C`;
    dom.weatherSummary.textContent = [
      weather.summary || 'Cuaca semasa',
      feelsLike === null ? '' : `rasa ${feelsLike}°C`,
      humidity,
    ].filter(Boolean).join(' · ') + rain;
    dom.weatherWind.textContent = windSpeed === null ? 'Angin --' : `Angin ${windSpeed} km/j`;
  }

  function setWeatherUnavailable(message = 'Cuaca tidak tersedia') {
    dom.weatherTemperature.textContent = 'Cuaca --';
    dom.weatherSummary.textContent = message;
    dom.weatherWind.textContent = 'Angin --';
  }

  function renderNearbyLocations(locations, { mode = 'nearby' } = {}) {
    dom.nearbyLocationList.innerHTML = '';
    const visibleLocations = Array.isArray(locations) ? locations : [];

    if (visibleLocations.length === 0) {
      dom.nearbyLocationList.innerHTML = '<p class="nearby-empty">Lokasi belum dimuat. Cuba semula selepas peta stabil.</p>';
      dom.nearbyHeading.textContent = mode === 'all' ? 'Kawasan sekitar' : 'Tiada lokasi dekat';
      return;
    }

    dom.nearbyHeading.textContent = mode === 'all'
      ? `${visibleLocations.length} kawasan pilihan`
      : `${visibleLocations.length} lokasi terdekat`;
    visibleLocations.forEach((location) => {
      dom.nearbyLocationList.appendChild(buildNearbyLocationCard(location));
    });
  }

  function setLoadingNearby() {
    dom.nearbyHeading.textContent = 'Memuat kawasan';
    dom.nearbyLocationList.innerHTML = '<p class="nearby-empty">Menyediakan senarai pantai, jeti dan tarikan sekitar...</p>';
  }

  function showUnlockAnimation({ title, message }) {
    playUnlockAnimation(dom, { title, message });
  }

  function updateNearestSummary(location) {
    if (!location) {
      updateEmptyDestinationSummary();
      return;
    }

    const distance = formatDistance(location.jarak_meter || location.distance_m || location.distance);
    setSummary(distance, getLocationName(location), location.description || location.penerangan || 'Pin berada dalam radar.');
    dom.openDestinationButton.classList.remove('hidden');
  }

  return {
    setSummary,
    setLocationStatus,
    setMapLoading,
    hideMapLoading,
    setSessionStatus,
    setAccuracy,
    showPermissionError,
    hidePermissionError,
    showAreaWarning,
    updateDestinationSummary,
    updateEmptyDestinationSummary,
    setAuthState,
    updateGameStatus,
    setWeatherLoading,
    setWeather,
    setWeatherUnavailable,
    renderNearbyLocations,
    setLoadingNearby,
    showUnlockAnimation,
    updateNearestSummary,
  };
}

function formatWeatherNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}
