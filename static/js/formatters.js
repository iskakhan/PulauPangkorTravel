export function formatDistance(distance) {
  const value = Number(distance);
  if (!Number.isFinite(value)) {
    return 'Dalam radius 50 m';
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} km`;
  }
  return `${Math.max(Math.round(value), 1)} m`;
}

export function formatTime(milliseconds) {
  const totalSeconds = Math.max(Math.ceil(milliseconds / 1000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}
