import { getLocationId, getLocationName, getLocationCategory, getDistanceLabel, getDistanceMeters, getLocationImageUrls } from '../location-data.js?v=11';
import { getSocialMediaLinks } from '../api.js?v=11';
import { refreshIcons } from '../dom.js?v=9';

export function createListViewUi(dom, callbacks = {}) {
  let currentLocations = [];
  let isCleanView = false;
  let currentTab = 'map';

  const listViewContainer = document.getElementById('list-view-container');
  const listViewGrid = document.getElementById('list-view-grid');
  const searchInput = document.getElementById('list-search-input');

  const socialMediaContainer = document.getElementById('social-media-container');
  const socialMediaList = document.getElementById('social-media-list');

  const navBtnMap = document.getElementById('nav-btn-map');
  const navBtnLocation = document.getElementById('nav-btn-location');
  const navBtnSocial = document.getElementById('nav-btn-social');

  const btnToggleUi = document.getElementById('btn-toggle-ui');
  const iconMin = btnToggleUi?.querySelector('.toggle-icon-min');
  const iconMax = btnToggleUi?.querySelector('.toggle-icon-max');

  const mapScreen = document.getElementById('map-screen');
  const tabButtons = {
    map: navBtnMap,
    location: navBtnLocation,
    social: navBtnSocial,
  };

  function renderList(locations) {
    if (!listViewGrid) return;

    listViewGrid.innerHTML = '';

    if (!locations || locations.length === 0) {
      listViewGrid.innerHTML = '<div class="empty-list" data-i18n="ui.empty_list">Tiada lokasi dijumpai.</div>';
      return;
    }

    locations.forEach(location => {
      const imageUrls = getLocationImageUrls(location);
      imageUrls.push('/static/assets/background.png');

      const card = document.createElement('div');
      card.className = 'list-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Lihat ${getLocationName(location)}`);
      card.dataset.locationId = getLocationId(location);

      const distance = getDistanceMeters(location);
      const distanceLabel = Number.isFinite(distance) ? getDistanceLabel(location) : 'Pulau Pangkor';

      card.innerHTML = `
        <div class="list-card-image">
          <img class="list-card-img" src="${escapeAttr(imageUrls[0])}" alt="${escapeAttr(getLocationName(location))}" decoding="async" />
        </div>
        <div class="list-card-content">
          <div class="list-card-title">${escapeHtml(getLocationName(location))}</div>
          <div class="list-card-distance">${escapeHtml(distanceLabel)}</div>
        </div>
      `;

      const image = card.querySelector('.list-card-img');
      let imageUrlIndex = 0;
      image?.addEventListener('error', () => {
        imageUrlIndex += 1;
        if (imageUrlIndex < imageUrls.length) {
          image.setAttribute('src', imageUrls[imageUrlIndex]);
        }
      });

      const openLocation = () => {
        if (callbacks.onLocationClick) {
          callbacks.onLocationClick(location);
        }
      };

      card.addEventListener('click', openLocation);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openLocation();
        }
      });

      listViewGrid.appendChild(card);
    });
  }

  function handleSearch(query) {
    const lowerQuery = query.toLowerCase();
    const filtered = currentLocations.filter(loc => {
      const name = getLocationName(loc).toLowerCase();
      const category = (getLocationCategory(loc) || '').toLowerCase();
      return name.includes(lowerQuery) || category.includes(lowerQuery);
    });
    renderList(filtered);
  }

  async function renderSocialMedia() {
    if (!socialMediaList) return;
    socialMediaList.innerHTML = '<div class="social-state">Memuatkan...</div>';

    try {
      const result = await getSocialMediaLinks();
      if (result.ok && result.data.social_media_links) {
        socialMediaList.innerHTML = '';
        const links = result.data.social_media_links
          .map(normalizeSocialLink)
          .filter(Boolean);

        if (links.length === 0) {
          socialMediaList.innerHTML = '<div class="social-state">Tiada pautan media sosial.</div>';
          return;
        }

        links.forEach(link => {
          const card = document.createElement('a');
          card.className = 'social-card';
          card.href = link.url.href;
          card.target = '_blank';
          card.rel = 'noopener noreferrer';
          card.innerHTML = `
            <span class="social-icon"><img src="${escapeAttr(link.icon)}" alt="${escapeAttr(link.platform)}"></span>
            <span class="social-info">
              <strong class="social-platform">${escapeHtml(link.platform)}</strong>
              <span class="social-handle">${escapeHtml(link.url.hostname)}</span>
            </span>
            <i class="social-external" data-lucide="external-link"></i>
          `;
          socialMediaList.appendChild(card);
        });
        // no need to refresh lucide for platform icons, only for external icon
        refreshIcons();
      } else {
        socialMediaList.innerHTML = '<div class="social-state is-error">Ralat memuatkan media sosial.</div>';
      }
    } catch (error) {
      socialMediaList.innerHTML = '<div class="social-state is-error">Ralat sambungan.</div>';
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      handleSearch(e.target.value);
    });
  }

  function switchTab(tabName) {
    currentTab = tabButtons[tabName] ? tabName : 'map';

    Object.entries(tabButtons).forEach(([key, button]) => {
      const isActive = key === currentTab;
      button?.classList.toggle('active', isActive);
      button?.setAttribute('aria-current', isActive ? 'page' : 'false');
    });

    listViewContainer?.classList.toggle('hidden', currentTab !== 'location');
    socialMediaContainer?.classList.toggle('hidden', currentTab !== 'social');
    mapScreen?.classList.toggle('is-tab-map', currentTab === 'map');
    mapScreen?.classList.toggle('is-tab-location', currentTab === 'location');
    mapScreen?.classList.toggle('is-tab-social', currentTab === 'social');
    mapScreen?.classList.toggle('is-content-tab', currentTab !== 'map');

    if (currentTab === 'map') {
      btnToggleUi?.classList.remove('hidden');
      window.dispatchEvent(new Event('resize'));
      callbacks.onTabChange?.('map');
    } else {
      btnToggleUi?.classList.add('hidden');
      setCleanView(false);
    }

    if (currentTab === 'location') {
      renderList(currentLocations);
      if (searchInput) handleSearch(searchInput.value);
    } else if (currentTab === 'social') {
      renderSocialMedia();
    }
  }

  if (navBtnMap) navBtnMap.addEventListener('click', () => switchTab('map'));
  if (navBtnLocation) navBtnLocation.addEventListener('click', () => switchTab('location'));
  if (navBtnSocial) navBtnSocial.addEventListener('click', () => switchTab('social'));
  
  switchTab('map');

  if (btnToggleUi) {
    btnToggleUi.addEventListener('click', () => {
      setCleanView(!isCleanView);
    });
  }

  function setCleanView(isEnabled) {
    isCleanView = Boolean(isEnabled && currentTab === 'map');
    mapScreen?.classList.toggle('is-clean-view', isCleanView);
    btnToggleUi?.classList.toggle('is-active', isCleanView);
    btnToggleUi?.setAttribute('aria-pressed', String(isCleanView));
    iconMin?.classList.toggle('hidden', isCleanView);
    iconMax?.classList.toggle('hidden', !isCleanView);
  }

  return {
    setListLocations(locations) {
      currentLocations = locations;
      if (navBtnLocation && navBtnLocation.classList.contains('active')) {
        renderList(currentLocations);
        if (searchInput) handleSearch(searchInput.value);
      }
    },
    resetTabs() {
      switchTab('map');
      setCleanView(false);
    }
  };
}

function normalizeSocialLink(link) {
  const url = safeUrl(link?.url);
  if (!url) {
    return null;
  }

  const platform = String(link?.platform || 'Pautan').trim() || 'Pautan';
  return {
    platform,
    url: new URL(url),
    icon: getSocialIcon(platform, link?.icon_name),
  };
}

function getSocialIcon(platform, iconName) {
  const value = String(iconName || platform || '').toLowerCase();
  // map platform to image asset paths in static/assets/logos
  if (value.includes('instagram')) return '/static/assets/logos/instagram.jpg';
  if (value.includes('facebook')) return '/static/assets/logos/facebook.jpg';
  if (value.includes('tiktok')) return '/static/assets/logos/tiktok.jpg';
  if (value.includes('thread') || value.includes('threads')) return '/static/assets/logos/threads.jpg';
  return '/static/assets/logos/main.jpeg';
}

function safeUrl(value) {
  if (!value) {
    return '';
  }

  try {
    const url = new URL(String(value), window.location.href);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '';
  } catch (error) {
    return '';
  }
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
