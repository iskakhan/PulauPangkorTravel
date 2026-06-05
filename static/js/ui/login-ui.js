const LOGIN_LANGUAGE_KEY = 'pangkor_login_language';
const DEFAULT_LANGUAGE = 'ms';
const LOGIN_COPY = {
  en: {
    language: 'Language',
    heroCopy: 'Log in to open the Pangkor map and unlock visits.',
    session: 'Session',
    kicker: 'Visitor Access',
    title: 'Enter map',
    demoKey: 'Test key',
    useKey: 'Use key',
    visitorName: 'Visitor name',
    visitorPlaceholder: 'Enter your name',
    accessKey: 'Access key',
    accessPlaceholder: 'Tap Use key or paste your key',
    clearKey: 'Clear access key',
    login: 'Log in',
    loading: 'Verifying',
    nameRequired: 'Please enter your name.',
    keyRequired: 'Please enter your access key.',
    invalidKey: 'Invalid key. Check it and try again.',
    apiFailed: 'API connection failed. Make sure the Flask server is running.',
  },
  ms: {
    language: 'Bahasa',
    heroCopy: 'Log masuk untuk buka peta Pangkor dan unlock lawatan.',
    session: 'Sesi',
    kicker: 'Akses Pelawat',
    title: 'Masuk peta',
    demoKey: 'Key test',
    useKey: 'Isi key',
    visitorName: 'Nama pelawat',
    visitorPlaceholder: 'Masukkan nama anda',
    accessKey: 'Kunci akses',
    accessPlaceholder: 'Tekan Isi key atau tampal key',
    clearKey: 'Kosongkan kunci akses',
    login: 'Log masuk',
    loading: 'Mengesahkan',
    nameRequired: 'Sila masukkan nama pelawat.',
    keyRequired: 'Sila masukkan kunci akses.',
    invalidKey: 'Kunci tidak sah. Semak semula dan cuba lagi.',
    apiFailed: 'Sambungan API gagal. Pastikan Flask server sedang berjalan.',
  },
};

export function createLoginUi(dom) {
  let activeLanguage = normalizeLanguage(window.localStorage.getItem(LOGIN_LANGUAGE_KEY));

  function copy(key) {
    return LOGIN_COPY[activeLanguage]?.[key] || LOGIN_COPY[DEFAULT_LANGUAGE][key] || key;
  }

  function initLoginLanguage() {
    applyLoginLanguage(activeLanguage, { persist: false });
  }

  function setLoginLanguage(language) {
    applyLoginLanguage(language, { persist: true });
  }

  function applyLoginLanguage(language, { persist = true } = {}) {
    activeLanguage = normalizeLanguage(language);
    document.documentElement.lang = activeLanguage;

    if (persist) {
      window.localStorage.setItem(LOGIN_LANGUAGE_KEY, activeLanguage);
    }

    dom.languageSelect.value = activeLanguage;
    dom.languageLabel.textContent = copy('language');
    dom.loginHeroCopy.textContent = copy('heroCopy');
    dom.loginHeroSession.textContent = copy('session');
    dom.loginKicker.textContent = copy('kicker');
    dom.loginFormTitle.textContent = copy('title');
    dom.demoKeyLabel.textContent = copy('demoKey');
    dom.useTestKeyLabel.textContent = copy('useKey');
    dom.visitorNameLabel.textContent = copy('visitorName');
    dom.visitorNameInput.placeholder = copy('visitorPlaceholder');
    dom.accessKeyLabel.textContent = copy('accessKey');
    dom.accessKeyInput.placeholder = copy('accessPlaceholder');
    dom.clearKeyButton.setAttribute('aria-label', copy('clearKey'));
    dom.clearKeyButton.title = copy('clearKey');
    const isLoading = dom.loginButton.dataset.loading === 'true';
    dom.loginButtonLabel.textContent = isLoading ? copy('loading') : copy('login');
  }

  function getLoginLanguage() {
    return activeLanguage;
  }

  function getLoginMessage(key) {
    return copy(key);
  }

  function showLoginError(message) {
    dom.loginError.textContent = message;
    dom.loginError.classList.remove('hidden');
    dom.visitorNameInput.setAttribute('aria-invalid', 'true');
    dom.accessKeyInput.setAttribute('aria-invalid', 'true');
  }

  function hideLoginError() {
    dom.loginError.textContent = '';
    dom.loginError.classList.add('hidden');
    dom.visitorNameInput.removeAttribute('aria-invalid');
    dom.accessKeyInput.removeAttribute('aria-invalid');
  }

  function updateLoginButtonState() {
    const isLoading = dom.loginButton.dataset.loading === 'true';
    const hasName = dom.visitorNameInput.value.trim().length >= 2;
    const hasKey = dom.accessKeyInput.value.trim().length > 0;
    dom.loginButton.disabled = isLoading || !hasName || !hasKey;
    dom.clearKeyButton.classList.toggle('hidden', !hasKey);
  }

  function setLoginLoading(isLoading) {
    dom.loginButton.dataset.loading = String(isLoading);
    dom.loginButtonLabel.textContent = isLoading ? copy('loading') : copy('login');
    dom.loginSpinner.classList.toggle('hidden', !isLoading);
    updateLoginButtonState();
  }

  function showDemoKey(demoAccessKey) {
    if (!demoAccessKey) {
      return;
    }

    dom.demoKeyValue.textContent = demoAccessKey;
    dom.demoKeyCard.classList.remove('hidden');
  }

  return {
    initLoginLanguage,
    setLoginLanguage,
    getLoginLanguage,
    getLoginMessage,
    showLoginError,
    hideLoginError,
    updateLoginButtonState,
    setLoginLoading,
    showDemoKey,
  };
}

function normalizeLanguage(language) {
  return language === 'ms' ? 'ms' : DEFAULT_LANGUAGE;
}
