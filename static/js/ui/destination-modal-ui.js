import { refreshIcons } from '../dom.js?v=9';
import { buildLocationCardModalContent } from '../components/location-card-modal.js?v=9';
import {
  getDistanceLabel,
  getLocationName,
} from '../location-data.js?v=9';

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
    setupCarouselControls(dom.destinationModal);
  }

  function hideDestinationModal() {
    dom.destinationModal.classList.add('hidden');
  }

  function setupCarouselControls(modal) {
    if (!modal) {
      return;
    }

    modal.querySelectorAll('.photo-carousel').forEach((carousel) => {
      const track = carousel.querySelector('.carousel-track');
      const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
      const prevButton = carousel.querySelector('.carousel-prev');
      const nextButton = carousel.querySelector('.carousel-next');
      const indicators = Array.from(carousel.querySelectorAll('.indicator'));

      if (!track || slides.length === 0) {
        return;
      }

      let currentIndex = 0;
      const totalSlides = slides.length;

      const updateCarousel = (index) => {
        currentIndex = ((index % totalSlides) + totalSlides) % totalSlides;
        track.style.transform = `translateX(${currentIndex * -100}%)`;
        indicators.forEach((button, buttonIndex) => {
          button.classList.toggle('active', buttonIndex === currentIndex);
        });
      };

      if (prevButton) {
        prevButton.addEventListener('click', () => updateCarousel(currentIndex - 1));
      }

      if (nextButton) {
        nextButton.addEventListener('click', () => updateCarousel(currentIndex + 1));
      }

      indicators.forEach((button, index) => {
        button.addEventListener('click', () => updateCarousel(index));
      });

      updateCarousel(0);
    });
  }

  return {
    openDestinationModal,
    hideDestinationModal,
  };
}
