import { SESSION_EXPIRES_KEY, SESSION_TOKEN_KEY, SESSION_VISITOR_NAME_KEY } from './config.js';

export function loadSession() {
  return {
    sessionToken: sessionStorage.getItem(SESSION_TOKEN_KEY),
    sessionExpiresAt: Number(sessionStorage.getItem(SESSION_EXPIRES_KEY)) || null,
    visitorName: sessionStorage.getItem(SESSION_VISITOR_NAME_KEY) || '',
  };
}

export function saveSession(result) {
  const sessionToken = result.session_token;
  const visitorName = result.visitor_name || '';
  let sessionExpiresAt = null;

  sessionStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  sessionStorage.setItem(SESSION_VISITOR_NAME_KEY, visitorName);

  if (result.expires_in_seconds) {
    sessionExpiresAt = Date.now() + Number(result.expires_in_seconds) * 1000;
    sessionStorage.setItem(SESSION_EXPIRES_KEY, String(sessionExpiresAt));
  } else {
    sessionStorage.removeItem(SESSION_EXPIRES_KEY);
  }

  return { sessionToken, sessionExpiresAt, visitorName };
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_TOKEN_KEY);
  sessionStorage.removeItem(SESSION_EXPIRES_KEY);
  sessionStorage.removeItem(SESSION_VISITOR_NAME_KEY);
}
