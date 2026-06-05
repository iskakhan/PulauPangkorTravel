export function getSupabaseAccessToken() {
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key || !key.startsWith('sb-') || !key.endsWith('-auth-token')) {
      continue;
    }

    const token = readAccessToken(window.localStorage.getItem(key));
    if (token) {
      return token;
    }
  }

  return '';
}

export function hasSupabaseAuthSession() {
  return Boolean(getSupabaseAccessToken());
}

function readAccessToken(rawValue) {
  if (!rawValue) {
    return '';
  }

  try {
    const parsed = JSON.parse(rawValue);
    return parsed?.access_token || parsed?.currentSession?.access_token || '';
  } catch (error) {
    return '';
  }
}
