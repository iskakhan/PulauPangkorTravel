export function createUserMarkerElement() {
  const element = document.createElement('div');
  element.className = 'user-location-icon';
  element.innerHTML = `
    <span class="user-avatar-heading" aria-hidden="true"></span>
    <span class="user-avatar-van" aria-hidden="true">
      <span class="user-van-body"></span>
      <span class="user-van-window"></span>
      <span class="user-van-wheel user-van-wheel-back"></span>
      <span class="user-van-wheel user-van-wheel-front"></span>
    </span>
    <span class="user-avatar-core"></span>
    <span class="user-avatar-ring"></span>
  `;
  return element;
}
