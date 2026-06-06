import { SESSION_EXPIRES_KEY, SESSION_TOKEN_KEY, SESSION_VISITOR_NAME_KEY } from './config.js?v=6';

export function loadSession() {
  migrateSessionStorage();

  const session = {
    sessionToken: localStorage.getItem(SESSION_TOKEN_KEY),
    sessionExpiresAt: Number(localStorage.getItem(SESSION_EXPIRES_KEY)) || null,
    visitorName: localStorage.getItem(SESSION_VISITOR_NAME_KEY) || '',
  };

  if (session.sessionExpiresAt && session.sessionExpiresAt <= Date.now()) {
    clearSession();
    return {
      sessionToken: null,
      sessionExpiresAt: null,
      visitorName: '',
    };
  }

  return session;
}

export function saveSession(result) {
  const sessionToken = result.session_token || result.sessionToken;
  const visitorName = result.visitor_name || '';
  let sessionExpiresAt = parseExpiresAt(result.expires_at);

  if (!sessionToken) {
    clearSession();
    return { sessionToken: null, sessionExpiresAt: null, visitorName: '' };
  }

  localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  localStorage.setItem(SESSION_VISITOR_NAME_KEY, visitorName);

  if (!sessionExpiresAt && result.expires_in_seconds) {
    sessionExpiresAt = Date.now() + Number(result.expires_in_seconds) * 1000;
  }

  if (sessionExpiresAt) {
    localStorage.setItem(SESSION_EXPIRES_KEY, String(sessionExpiresAt));
  } else {
    localStorage.removeItem(SESSION_EXPIRES_KEY);
  }

  return { sessionToken, sessionExpiresAt, visitorName };
}

export function clearSession() {
  [localStorage, sessionStorage].forEach((storage) => {
    storage.removeItem(SESSION_TOKEN_KEY);
    storage.removeItem(SESSION_EXPIRES_KEY);
    storage.removeItem(SESSION_VISITOR_NAME_KEY);
  });
}

function migrateSessionStorage() {
  const token = sessionStorage.getItem(SESSION_TOKEN_KEY);
  if (!token || localStorage.getItem(SESSION_TOKEN_KEY)) {
    return;
  }

  localStorage.setItem(SESSION_TOKEN_KEY, token);

  const expiresAt = sessionStorage.getItem(SESSION_EXPIRES_KEY);
  const visitorName = sessionStorage.getItem(SESSION_VISITOR_NAME_KEY);
  if (expiresAt) {
    localStorage.setItem(SESSION_EXPIRES_KEY, expiresAt);
  }
  if (visitorName) {
    localStorage.setItem(SESSION_VISITOR_NAME_KEY, visitorName);
  }
}

function parseExpiresAt(value) {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  if (Number.isFinite(numeric)) {
    return numeric;
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}
