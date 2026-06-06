import { refreshIcons } from '../dom.js?v=6';
import { buildLocationCardModalContent } from '../components/location-card-modal.js?v=6';
import {
  getDistanceLabel,
  getLocationName,
} from '../location-data.js?v=6';

export function createDestinationModalUi(dom) {
  function openDestinationModal(options) {
    const location = options?.location || options;
    if (!location) {
      return;
    }

    dom.modalTitle.textContent = getLocationName(location);
    dom.modalDistance.textContent = getDistanceLabel(location);
    dom.locationCardContent.innerHTML = buildLocationCardModalContent({
      location,
      detail: options?.detail,
      isAuthenticated: options?.isAuthenticated,
      isInside: options?.isInside,
      isVisited: options?.isVisited,
      visit: options?.visit,
    });

    dom.destinationModal.classList.remove('hidden');
    refreshIcons();
  }

  function hideDestinationModal() {
    dom.destinationModal.classList.add('hidden');
  }

  return {
    openDestinationModal,
    hideDestinationModal,
  };
}
