export const translations = {
  ms: {
    // Map screen
    'map.loading': 'Memuat peta Pulau Pangkor',
    'map.preparing': 'Menyediakan peta dan lokasi sekitar...',
    'map.status.active': 'Peta 2D Pulau Pangkor aktif.',
    'map.status.fallback': 'Token Mapbox tidak sah. Memuat peta fallback.',
    'map.status.slow': 'Peta 2D sedang dimuat. Semak sambungan internet.',
    'map.overview': 'Jelajah Pangkor',
    'map.overview.desc': '{count} kawasan dan lokasi menarik dimuat.',
    'map.offline.title': 'Ralat rangkaian',
    'map.offline.desc': 'Sambungan ke API tidak berjaya.',
    
    // GPS & Navigation
    'gps.active': 'GPS aktif',
    'gps.blocked': 'GPS disekat',
    'gps.denied': 'GPS ditolak',
    'gps.denied.desc': 'Permission lokasi diperlukan untuk radar.',
    'gps.searching': 'Mencari lokasi',
    'gps.searching.desc': 'Pastikan Location Services aktif dan browser dibenarkan akses lokasi.',
    'gps.out_of_bounds': 'GPS diterima, tetapi di luar Pangkor.',
    'gps.out_of_bounds.desc': 'Peta kekal memaparkan Pulau Pangkor. Lokasi live akan aktif apabila anda berada dalam kawasan Pangkor.',
    'gps.need_https': 'Perlu HTTPS',
    'nav.active': 'Navigasi aktif',
    'nav.distance': '{distance} lagi. Ikut garisan laluan ke pin destinasi.',
    
    // UI Elements
    'ui.search.placeholder': 'Cari lokasi...',
    'ui.button.map': 'Peta',
    'ui.button.list': 'Senarai',
    'ui.button.login': 'Log Masuk',
    'ui.button.close': 'Tutup',
    'ui.button.directions': 'Arah Tujuan',
    'ui.button.checkin': 'Check-in Sekarang',
    'ui.nav.map': 'Peta',
    'ui.nav.location': 'Lokasi',
    'ui.nav.social': 'Sosial',
    'ui.empty_list': 'Tiada lokasi dijumpai.',
    
    // Location Details
    'loc.unlock.title': 'Anda unlock {name}.',
    'loc.unlock.login': 'Log masuk untuk unlock lokasi ini.',
    'loc.status.visited': 'Telah dilawati',
    'loc.status.nearby': 'Berdekatan',
    'loc.status.far': 'Jauh',
    
    // Login
    'login.name_required': 'Sila masukkan nama anda (minimum 2 huruf).',
    'login.key_required': 'Sila masukkan Kunci Akses (Access Key).',
    'login.invalid_key': 'Kunci Akses tidak sah atau telah tamat tempoh.',
    'login.success': 'Sesi lawatan aktif.',
    
    // Fallback/Generic
    'error.general': 'Ralat tidak dijangka berlaku.',
  },
  en: {
    // Map screen
    'map.loading': 'Loading Pangkor Island map',
    'map.preparing': 'Preparing map and nearby locations...',
    'map.status.active': 'Pangkor Island 2D Map is active.',
    'map.status.fallback': 'Invalid map token. Loading fallback map.',
    'map.status.slow': '2D Map is loading. Check internet connection.',
    'map.overview': 'Explore Pangkor',
    'map.overview.desc': '{count} areas and interesting locations loaded.',
    'map.offline.title': 'Network error',
    'map.offline.desc': 'Failed to connect to API.',
    
    // GPS & Navigation
    'gps.active': 'GPS Active',
    'gps.blocked': 'GPS Blocked',
    'gps.denied': 'GPS Denied',
    'gps.denied.desc': 'Location permission is required for the radar.',
    'gps.searching': 'Searching location',
    'gps.searching.desc': 'Ensure Location Services are active and browser has permission.',
    'gps.out_of_bounds': 'GPS received, but out of Pangkor bounds.',
    'gps.out_of_bounds.desc': 'Map stays in Pangkor. Live location will be active once you enter Pangkor area.',
    'gps.need_https': 'HTTPS Required',
    'nav.active': 'Navigation active',
    'nav.distance': '{distance} away. Follow the route to the destination pin.',
    
    // UI Elements
    'ui.search.placeholder': 'Search locations...',
    'ui.button.map': 'Map',
    'ui.button.list': 'List',
    'ui.button.login': 'Login',
    'ui.button.close': 'Close',
    'ui.button.directions': 'Directions',
    'ui.button.checkin': 'Check-in Now',
    'ui.nav.map': 'Map',
    'ui.nav.location': 'Locations',
    'ui.nav.social': 'Social',
    'ui.empty_list': 'No locations found.',
    
    // Location Details
    'loc.unlock.title': 'You unlocked {name}.',
    'loc.unlock.login': 'Login to unlock this location.',
    'loc.status.visited': 'Visited',
    'loc.status.nearby': 'Nearby',
    'loc.status.far': 'Far',
    
    // Login
    'login.name_required': 'Please enter your name (min 2 characters).',
    'login.key_required': 'Please enter Access Key.',
    'login.invalid_key': 'Invalid or expired Access Key.',
    'login.success': 'Visit session active.',
    
    // Fallback/Generic
    'error.general': 'An unexpected error occurred.',
  }
};

let currentLocale = localStorage.getItem('app_locale') || 'ms';

export function setLocale(locale) {
  if (translations[locale]) {
    currentLocale = locale;
    localStorage.setItem('app_locale', locale);
    updateDomTranslations();
  }
}

export function getLocale() {
  return currentLocale;
}

export function t(key, params = {}) {
  const dict = translations[currentLocale] || translations['ms'];
  let str = dict[key] || translations['ms'][key] || key;
  
  for (const [k, v] of Object.entries(params)) {
    str = str.replace(new RegExp(`{${k}}`, 'g'), v);
  }
  
  return str;
}

export function updateDomTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      el.textContent = t(key);
    }
  });
  
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (key) {
      el.setAttribute('placeholder', t(key));
    }
  });
}

// Initial setup
document.addEventListener('DOMContentLoaded', updateDomTranslations);
