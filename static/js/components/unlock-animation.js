import { refreshIcons } from '../dom.js?v=6';

export function showUnlockAnimation(dom, { title, message }) {
  dom.unlockTitle.textContent = title || 'Kad lokasi dibuka';
  dom.unlockMessage.textContent = message || 'Reward diterima.';
  dom.unlockAnimation.classList.remove('hidden');
  window.setTimeout(() => dom.unlockAnimation.classList.add('hidden'), 2200);
  refreshIcons();
}
