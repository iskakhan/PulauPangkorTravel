import { API_BASE } from './config.js';
import { getSupabaseAccessToken } from './auth.js';

const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_FIELDS = [
  'temperature_2m',
  'relative_humidity_2m',
  'apparent_temperature',
  'precipitation',
  'weather_code',
  'cloud_cover',
  'wind_speed_10m',
  'wind_direction_10m',
];
const WEATHER_LABELS = new Map([
  [0, 'Langit cerah'],
  [1, 'Kebanyakannya cerah'],
  [2, 'Sebahagian berawan'],
  [3, 'Berawan'],
  [45, 'Berkabus'],
  [48, 'Kabus tebal'],
  [51, 'Renyai ringan'],
  [53, 'Renyai sederhana'],
  [55, 'Renyai lebat'],
  [61, 'Hujan ringan'],
  [63, 'Hujan sederhana'],
  [65, 'Hujan lebat'],
  [80, 'Hujan sekejap'],
  [81, 'Hujan sekejap sederhana'],
  [82, 'Hujan sekejap lebat'],
  [95, 'Ribut petir'],
  [96, 'Ribut petir berhujan batu'],
  [99, 'Ribut petir kuat'],
]);

async function readJson(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return {};
  }
  return response.json();
}

export async function getAppConfig() {
  const response = await fetch(`${API_BASE}/app-config`);
  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

export async function verifyAccessKey(accessKey, visitorName) {
  const response = await fetch(`${API_BASE}/verify-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_key: accessKey, visitor_name: visitorName }),
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

export async function submitVisitFeedback({ sessionToken, visitComment, systemComment }) {
  const response = await fetch(`${API_BASE}/visitor-feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_token: sessionToken,
      visit_comment: visitComment,
      system_comment: systemComment,
    }),
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

export async function checkLocation({ longitude, latitude, sessionToken }) {
  const response = await fetch(`${API_BASE}/check-location`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ longitude, latitude, session_token: sessionToken }),
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

export async function getActiveLocations() {
  const response = await fetch(`${API_BASE}/locations`);
  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

export async function getNearbyLocations({ longitude, latitude, maxDistanceM = 1000 }) {
  const response = await fetch(`${API_BASE}/nearby-locations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      longitude,
      latitude,
      max_distance_m: maxDistanceM,
    }),
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

export async function getLocationDetail({ locationId }) {
  const response = await fetch(`${API_BASE}/location-detail`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location_id: locationId }),
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

export async function checkInLocation({ locationId, latitude, longitude, sessionToken }) {
  const accessToken = getSupabaseAccessToken();
  const response = await fetch(`${API_BASE}/check-in-location`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      p_location_id: locationId,
      p_user_lat: latitude,
      p_user_lng: longitude,
      session_token: sessionToken,
    }),
  });

  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

export async function getCurrentWeather({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
  });

  try {
    const directResponse = await fetch(buildOpenMeteoUrl({ latitude, longitude }));
    if (directResponse.ok) {
      return {
        ok: true,
        status: directResponse.status,
        data: normalizeOpenMeteoWeather(await directResponse.json()),
      };
    }
  } catch (error) {
    console.info('Cuaca direct gagal, cuba proxy Flask:', error);
  }

  const response = await fetch(`${API_BASE}/weather?${params.toString()}`);

  return {
    ok: response.ok,
    status: response.status,
    data: await readJson(response),
  };
}

function buildOpenMeteoUrl({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: WEATHER_FIELDS.join(','),
    timezone: 'auto',
    forecast_days: '1',
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

function normalizeOpenMeteoWeather(payload) {
  const current = payload.current || {};
  const weatherCode = toInt(current.weather_code);

  return {
    time: current.time,
    temperature_c: toFloat(current.temperature_2m),
    apparent_temperature_c: toFloat(current.apparent_temperature),
    humidity_percent: toInt(current.relative_humidity_2m),
    precipitation_mm: toFloat(current.precipitation),
    cloud_cover_percent: toInt(current.cloud_cover),
    wind_speed_kmh: toFloat(current.wind_speed_10m),
    wind_direction_deg: toInt(current.wind_direction_10m),
    weather_code: weatherCode,
    summary: WEATHER_LABELS.get(weatherCode) || 'Cuaca semasa',
    units: payload.current_units || {},
  };
}

function toFloat(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 10) / 10 : null;
}

function toInt(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}
