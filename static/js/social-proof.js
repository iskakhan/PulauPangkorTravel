/**
 * Social Proof & Stats Display
 * Shows visitor count, ratings, and social engagement metrics
 */

const SOCIAL_PROOF_KEY = 'pangkor_social_proof';
const SOCIAL_PROOF_CACHE_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function fetchSocialProofStats() {
  try {
    // In production, fetch from your API
    // For now, return mock data for demo
    const cached = getSocialProofFromCache();
    if (cached && !isCacheExpired(cached)) {
      return cached;
    }

    // Mock social proof data - replace with real API in production
    const stats = {
      totalVisitors: 2847,
      monthlyVisitors: 486,
      topLocations: ['Teluk Nipah', 'Pasir Bogak', 'Kuala Sepetang'],
      averageRating: 4.8,
      reviewCount: 342,
      unlocksThisMonth: 1263,
      timestamp: Date.now(),
    };

    saveSocialProofCache(stats);
    return stats;
  } catch (error) {
    console.warn('[Social Proof] Failed to fetch:', error);
    return getSocialProofFromCache() || getDefaultStats();
  }
}

function getSocialProofFromCache() {
  try {
    const cached = window.localStorage.getItem(SOCIAL_PROOF_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    return null;
  }
}

function saveSocialProofCache(stats) {
  try {
    window.localStorage.setItem(SOCIAL_PROOF_KEY, JSON.stringify(stats));
  } catch (error) {
    console.warn('[Social Proof] Failed to cache:', error);
  }
}

function isCacheExpired(cached) {
  return Date.now() - (cached.timestamp || 0) > SOCIAL_PROOF_CACHE_MS;
}

function getDefaultStats() {
  return {
    totalVisitors: 2000,
    monthlyVisitors: 400,
    topLocations: ['Pulau Pangkor', 'Pantai Pasir Bogak'],
    averageRating: 4.7,
    reviewCount: 300,
    unlocksThisMonth: 1000,
    timestamp: Date.now(),
  };
}

export function buildSocialProofHtml(stats) {
  if (!stats) {
    stats = getDefaultStats();
  }

  return `
    <section class="social-proof-section glass-panel">
      <div class="proof-header">
        <h4>Bergabung dengan jutaan penjelajah</h4>
        <p class="proof-subtitle">Temukan destinasi tersembunyi di Pulau Pangkor</p>
      </div>

      <div class="proof-stats">
        <div class="proof-stat">
          <div class="stat-value">${formatNumber(stats.totalVisitors)}</div>
          <div class="stat-label">Pengunjung Total</div>
        </div>
        <div class="proof-stat">
          <div class="stat-value">${formatNumber(stats.unlocksThisMonth)}</div>
          <div class="stat-label">Unlocks Bulan Ini</div>
        </div>
        <div class="proof-stat">
          <div class="stat-value">${stats.averageRating.toFixed(1)}★</div>
          <div class="stat-label">${stats.reviewCount} Reviews</div>
        </div>
      </div>

      <div class="proof-destinations">
        <div class="proof-label">Destinasi Populer:</div>
        <div class="destination-tags">
          ${stats.topLocations.map(loc => `
            <span class="destination-tag">📍 ${escapeHtml(loc)}</span>
          `).join('')}
        </div>
      </div>

      <div class="proof-cta">
        <p>Mulai petualangan anda sekarang dan unlock ganjaran eksklusif!</p>
      </div>
    </section>
  `;
}

export function buildSocialProofBanner(stats) {
  if (!stats) {
    stats = getDefaultStats();
  }

  return `
    <div class="social-proof-banner">
      <div class="banner-content">
        <div class="banner-icon">✨</div>
        <div class="banner-text">
          <strong>${formatNumber(stats.totalVisitors)}</strong> telah menjelajah Pangkor bersama Kembara Van Pink
        </div>
      </div>
    </div>
  `;
}

function formatNumber(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
