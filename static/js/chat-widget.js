/**
 * Kembara Van Pink — AI Chat Widget
 *
 * Embeds your Custom ChatGPT (ChatGPT.com) inside a slide-up iOS-style panel.
 *
 * To set your Custom GPT URL, update CHAT_URL below:
 *   e.g. 'https://chatgpt.com/g/g-XXXXXXXX-your-gpt-name'
 *
 * Note: ChatGPT.com requires login and may block iframe embedding via
 * X-Frame-Options. If the iframe shows blank, the footer "Open in browser"
 * link will let users open it in a new tab directly.
 */

const CHAT_URL = 'https://chatgpt.com/g/g-YOUR_GPT_ID_HERE';
const CHAT_TITLE = 'Kembara Van Pink AI';
const CHAT_SUBTITLE = 'Tanya soalan tentang Pulau Pangkor';

export function initChatWidget(mapScreenEl) {
  if (!mapScreenEl) return;

  // Inject HTML into the map screen
  const widgetHTML = `
    <div class="chat-panel-backdrop" id="chat-backdrop" aria-hidden="true"></div>

    <div class="chat-panel" id="chat-panel" role="dialog" aria-modal="true" aria-label="${CHAT_TITLE}">
      <div class="chat-panel-handle" aria-hidden="true"></div>
      <header class="chat-panel-header">
        <div class="chat-panel-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="chat-panel-title-group">
          <p class="chat-panel-title">${CHAT_TITLE}</p>
          <p class="chat-panel-subtitle">${CHAT_SUBTITLE}</p>
        </div>
        <button class="chat-panel-close" id="chat-panel-close" aria-label="Tutup panel chat" type="button">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 6 6 18M6 6l12 12"/>
          </svg>
        </button>
      </header>

      <div class="chat-panel-body">
        <div class="chat-panel-loading" id="chat-loading">
          <div class="chat-loading-spinner" aria-hidden="true"></div>
          <p>Memuatkan AI Kembara Van Pink...</p>
        </div>
        <iframe
          id="chat-iframe"
          src="about:blank"
          title="${CHAT_TITLE}"
          allow="microphone; clipboard-write"
          referrerpolicy="no-referrer-when-downgrade"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        ></iframe>
      </div>

      <footer class="chat-panel-footer">
        <a href="${CHAT_URL}" target="_blank" rel="noopener noreferrer" id="chat-open-link">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Buka dalam browser
        </a>
      </footer>
    </div>

    <button class="chat-bubble-btn" id="chat-bubble-btn" type="button"
      aria-label="Buka AI Chat Kembara Van Pink" aria-expanded="false">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="chat-bubble-dot" aria-hidden="true"></span>
    </button>
  `;

  mapScreenEl.insertAdjacentHTML('beforeend', widgetHTML);

  // DOM refs
  const bubbleBtn = document.getElementById('chat-bubble-btn');
  const panel = document.getElementById('chat-panel');
  const backdrop = document.getElementById('chat-backdrop');
  const closeBtn = document.getElementById('chat-panel-close');
  const iframe = document.getElementById('chat-iframe');
  const loading = document.getElementById('chat-loading');

  let isOpen = false;
  let hasLoaded = false;

  function openPanel() {
    isOpen = true;
    panel.classList.add('is-open');
    backdrop.classList.add('is-open');
    backdrop.removeAttribute('aria-hidden');
    bubbleBtn.setAttribute('aria-expanded', 'true');
    bubbleBtn.classList.remove('has-notification');

    // Lazy-load the iframe on first open
    if (!hasLoaded) {
      hasLoaded = true;
      loading.classList.remove('hidden');
      iframe.src = CHAT_URL;
      iframe.addEventListener('load', () => {
        loading.classList.add('hidden');
      }, { once: true });

      // Fallback: hide loader after 8s even if iframe fails to fire load event
      setTimeout(() => loading.classList.add('hidden'), 8000);
    }

    // Trap focus inside panel
    setTimeout(() => closeBtn.focus(), 300);
  }

  function closePanel() {
    isOpen = false;
    panel.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    bubbleBtn.setAttribute('aria-expanded', 'false');
    bubbleBtn.focus();
  }

  function togglePanel() {
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  }

  // Bind events
  bubbleBtn.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', closePanel);
  backdrop.addEventListener('click', closePanel);

  // Keyboard: close on Escape
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanel();
    }
  });

  // Swipe down to close (touch gesture)
  let touchStartY = 0;
  panel.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
  }, { passive: true });

  panel.addEventListener('touchend', (e) => {
    const delta = e.changedTouches[0].clientY - touchStartY;
    if (delta > 80) {
      closePanel();
    }
  }, { passive: true });

  return {
    open: openPanel,
    close: closePanel,
    toggle: togglePanel,
  };
}
