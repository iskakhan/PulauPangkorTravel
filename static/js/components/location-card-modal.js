import { buildDestinasiDetails } from './destinasi-details.js';
import {
  getCategoryLabel,
  getDistanceLabel,
  getLocationDescription,
  getLocationId,
  getLocationName,
} from '../location-data.js';

export function buildLocationCardModalContent({
  location,
  detail = {},
  isAuthenticated = false,
  isInside = false,
  isVisited = false,
  visit = null,
}) {
  const detailLocation = detail.location || {};
  const mergedLocation = { ...location, ...detailLocation };
  const card = detail.card || {};
  const destinasi = detail.destinasi || null;
  const media = collectMedia(mergedLocation, detail.media || [], destinasi);
  const unlocked = isVisited || Boolean(visit);
  const canUnlock = isInside && isAuthenticated;
  const heroImage = destinasi?.banner_image_url || destinasi?.featured_image_url || media.images[0];

  return `
    ${heroImage ? `<img class="detail-hero-image" src="${escapeAttr(heroImage)}" alt="${escapeAttr(getLocationName(mergedLocation))}" loading="lazy" />` : ''}

    <div class="detail-chips">
      <span>${escapeHtml(getCategoryLabel(mergedLocation))}</span>
      <span>${escapeHtml(getDistanceLabel(mergedLocation))}</span>
      <span class="${unlocked ? 'chip-success' : isInside ? 'chip-warn' : ''}">
        ${unlocked ? 'Unlocked' : isInside ? 'Dalam radius' : 'Jelajah'}
      </span>
    </div>

    <p class="destination-description">${escapeHtml(getLocationDescription(mergedLocation))}</p>

    ${buildUnlockState({ card, isAuthenticated, isInside, unlocked, canUnlock })}
    ${buildLocationFacts(mergedLocation)}
    ${buildActionLinks(mergedLocation)}
    ${buildMediaSection(media)}
    ${buildDestinasiDetails(destinasi)}
  `;
}

function buildUnlockState({ card, isAuthenticated, isInside, unlocked, canUnlock }) {
  const reward = card.reward_points ?? card.points ?? 0;
  const title = card.card_title || card.title || 'Kad lokasi';
  const badge = card.badge_name || card.badge || 'Pangkor Explorer';
  const rarity = card.rarity || 'Explorer';
  const unlockMessage = card.unlock_message || 'Datang ke kawasan ini untuk unlock ganjaran lawatan.';

  return `
    <section class="reward-panel ${unlocked ? 'is-unlocked' : 'is-locked'}">
      <div>
        <span class="section-kicker">${escapeHtml(rarity)}</span>
        <h4>${escapeHtml(title)}</h4>
        <p>${escapeHtml(unlocked || canUnlock ? unlockMessage : getLockedMessage(isAuthenticated, isInside))}</p>
      </div>
      <div class="reward-score">
        <strong>${escapeHtml(reward)}</strong>
        <span>XP</span>
      </div>
      <div class="badge-row">
        <span>${escapeHtml(badge)}</span>
        ${!isAuthenticated && isInside ? '<button id="modal-login-button" class="secondary-action" type="button">Log masuk untuk unlock</button>' : ''}
      </div>
    </section>
  `;
}

function buildLocationFacts(location) {
  const rows = [
    ['Alamat', location.address],
    ['Waktu buka', location.opening_hours],
    ['Bayaran', location.entry_fee],
    ['Telefon', location.contact_phone || location.phone],
  ].filter(([, value]) => value);

  if (!rows.length) {
    return '';
  }

  return `
    <section class="detail-section">
      <div class="detail-section-heading">
        <span class="section-kicker">Info</span>
        <h4>Info lokasi</h4>
      </div>
      <dl class="detail-grid">
        ${rows.map(([label, value]) => `
          <div>
            <dt>${escapeHtml(label)}</dt>
            <dd>${escapeHtml(value)}</dd>
          </div>
        `).join('')}
      </dl>
    </section>
  `;
}

function buildActionLinks(location) {
  const locationId = getLocationId(location);
  const website = safeUrl(location.website_url || location.website);
  const googleMapsUrl = safeUrl(location.google_maps_url || location.maps_url);
  const links = [
    locationId ? `
      <button
        class="video-link glass-control van-view-button"
        type="button"
        data-view-location-id="${escapeAttr(locationId)}"
        aria-label="View peta ${escapeAttr(getLocationName(location))}"
      >
        <span>Navigasi</span>
        <span class="van-action-icon"><i data-lucide="navigation"></i></span>
      </button>
    ` : '',
    website ? `<a class="video-link glass-control" href="${escapeAttr(website)}" target="_blank" rel="noreferrer noopener"><span>Website</span><i data-lucide="external-link"></i></a>` : '',
    googleMapsUrl ? `<a class="video-link glass-control" href="${escapeAttr(googleMapsUrl)}" target="_blank" rel="noreferrer noopener"><span>Google Maps</span><i data-lucide="map"></i></a>` : '',
  ].filter(Boolean);

  if (!links.length) {
    return '';
  }

  return `<div class="detail-actions">${links.join('')}</div>`;
}

function buildMediaSection(media) {
  if (!media.images.length && !media.videos.length) {
    return `
      <section class="detail-section">
        <div class="empty-media">
          <i data-lucide="image-off"></i>
          <span>Tiada media tersedia</span>
        </div>
      </section>
    `;
  }

  return `
    <section class="detail-section">
      <div class="detail-section-heading">
        <span class="section-kicker">Media</span>
        <h4>Galeri</h4>
      </div>
      ${media.images.length ? `
        <div class="gallery">
          ${media.images.map((url, index) => `
            <figure class="image-card">
              <img src="${escapeAttr(url)}" alt="Gambar lokasi ${index + 1}" loading="lazy" />
            </figure>
          `).join('')}
        </div>
      ` : ''}
      ${media.videos.length ? `
        <div class="video-section">
          <h4>Video</h4>
          <div class="video-links">
            ${media.videos.map((url, index) => `
              <a class="video-link glass-control" href="${escapeAttr(url)}" target="_blank" rel="noreferrer noopener">
                <span>Video ${index + 1}</span>
                <i data-lucide="play-circle" aria-hidden="true"></i>
              </a>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </section>
  `;
}

function collectMedia(location, records, destinasi) {
  const images = [];
  const videos = [];

  addList(images, location.senarai_gambar);
  addList(videos, location.senarai_video);
  addUrl(images, destinasi?.featured_image_url);
  addUrl(images, destinasi?.banner_image_url);
  addUrl(videos, destinasi?.video_url);

  records.forEach((record) => {
    const url = record.url || record.media_url || record.file_url || record.public_url || record.external_url || record.thumbnail_url;
    const type = String(record.media_type || record.type || '').toLowerCase();

    if (!url) {
      return;
    }

    if (type.includes('video')) {
      addUrl(videos, url);
    } else {
      addUrl(images, url);
    }
  });

  return {
    images: unique(images),
    videos: unique(videos),
  };
}

function getLockedMessage(isAuthenticated, isInside) {
  if (!isAuthenticated && isInside) {
    return 'Anda berada dalam radius. Log masuk untuk simpan visit dan unlock reward.';
  }

  if (isInside) {
    return 'Anda berada dalam radius. Kad ini sedang dibuka.';
  }

  return 'Dekati pin ini untuk membuka kad lokasi dan ganjaran.';
}

function addList(target, value) {
  if (Array.isArray(value)) {
    value.forEach((item) => addUrl(target, item));
  }
}

function addUrl(target, value) {
  const url = safeUrl(value);
  if (url) {
    target.push(url);
  }
}

function unique(items) {
  return [...new Set(items)];
}

function safeUrl(value) {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(String(value), window.location.href);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return url.href;
    }
  } catch (error) {
    return '';
  }

  return '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll('`', '&#096;');
}
