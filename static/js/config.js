export const API_BASE = window.location.protocol === 'file:' ? 'http://127.0.0.1:5001/api' : '/api';
export const DEFAULT_CENTER = [4.2105, 100.5577];
export const PANGKOR_BOUNDS = {
  south: 4.165,
  west: 100.515,
  north: 4.255,
  east: 100.595,
};
export const PANGKOR_SYSTEM_BUFFER_M = 200;
export const SESSION_TOKEN_KEY = 'session_token';
export const SESSION_EXPIRES_KEY = 'session_expires_at';
export const SESSION_VISITOR_NAME_KEY = 'session_visitor_name';
