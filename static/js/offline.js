/**
 * Offline Storage & Utilities
 * Handles IndexedDB for location caching and offline state
 */

const DB_NAME = 'pangkor_offline_db';
const DB_VERSION = 1;
const STORES = {
  LOCATIONS: 'locations',
  IMAGES: 'images',
  SESSIONS: 'sessions',
};

let db = null;

export async function initOfflineDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      console.log('[Offline] IndexedDB initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;

      // Locations store
      if (!database.objectStoreNames.contains(STORES.LOCATIONS)) {
        const locStore = database.createObjectStore(STORES.LOCATIONS, { keyPath: 'id' });
        locStore.createIndex('category', 'category', { unique: false });
        locStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Images store
      if (!database.objectStoreNames.contains(STORES.IMAGES)) {
        const imgStore = database.createObjectStore(STORES.IMAGES, { keyPath: 'url' });
        imgStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Sessions store
      if (!database.objectStoreNames.contains(STORES.SESSIONS)) {
        database.createObjectStore(STORES.SESSIONS, { keyPath: 'key' });
      }
    };
  });
}

export async function cacheLocations(locations) {
  if (!db) await initOfflineDb();
  
  const tx = db.transaction(STORES.LOCATIONS, 'readwrite');
  const store = tx.objectStore(STORES.LOCATIONS);
  
  locations.forEach((loc) => {
    store.put({
      ...loc,
      timestamp: Date.now(),
    });
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => {
      console.log(`[Offline] Cached ${locations.length} locations`);
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedLocations() {
  if (!db) await initOfflineDb();
  
  const tx = db.transaction(STORES.LOCATIONS, 'readonly');
  const store = tx.objectStore(STORES.LOCATIONS);
  
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedLocation(id) {
  if (!db) await initOfflineDb();
  
  const tx = db.transaction(STORES.LOCATIONS, 'readonly');
  const store = tx.objectStore(STORES.LOCATIONS);
  
  return new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheImageBlob(url, blob, dominantColor) {
  if (!db) await initOfflineDb();
  
  const tx = db.transaction(STORES.IMAGES, 'readwrite');
  const store = tx.objectStore(STORES.IMAGES);
  
  store.put({
    url,
    blob,
    dominantColor,
    timestamp: Date.now(),
  });

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedImageBlob(url) {
  if (!db) await initOfflineDb();
  
  const tx = db.transaction(STORES.IMAGES, 'readonly');
  const store = tx.objectStore(STORES.IMAGES);
  
  return new Promise((resolve, reject) => {
    const request = store.get(url);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getOfflineStatus() {
  return new Promise((resolve) => {
    const cached = getCachedLocations();
    const hasCache = cached.then((locs) => locs.length > 0);
    
    hasCache.then((has) => {
      resolve({
        isOnline: navigator.onLine,
        hasCache: has,
        timestamp: Date.now(),
      });
    });
  });
}

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch((error) => console.warn('[SW] Gagal membuang service worker lama:', error));

  if ('caches' in window) {
    window.caches.keys()
      .then((names) => Promise.all(names.map((name) => window.caches.delete(name))))
      .catch((error) => console.warn('[SW] Gagal membersihkan cache lama:', error));
  }
}

// Offline/online event listeners
window.addEventListener('online', () => {
  console.log('[Offline] App is back online');
  document.documentElement.dataset.offlineMode = 'false';
  window.dispatchEvent(new CustomEvent('offline-status-changed', { detail: { isOnline: true } }));
});

window.addEventListener('offline', () => {
  console.log('[Offline] App is offline');
  document.documentElement.dataset.offlineMode = 'true';
  window.dispatchEvent(new CustomEvent('offline-status-changed', { detail: { isOnline: false } }));
});

// Set initial offline state
document.documentElement.dataset.offlineMode = String(!navigator.onLine);
