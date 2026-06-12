/**
 * Image Optimization - Blur-up Placeholder System
 * Provides dominant color detection and lazy loading with blur-up effect
 */

export function generateImageBlur(imageUrl) {
  // Generate a data URL with a simple color gradient
  // In production, use a proper blurhash library like "blurhash" npm package
  if (!imageUrl) {
    return 'linear-gradient(135deg, #e0e0e0 0%, #f5f5f5 100%)';
  }

  // Extract potential dominant color from image URL patterns
  try {
    // For URLs with color info, extract it
    const hash = extractColorHashFromUrl(imageUrl);
    if (hash) {
      return hash;
    }

    // Generate placeholder based on URL hash
    const colors = generatePlaceholderColors(imageUrl);
    return `linear-gradient(135deg, ${colors[0]} 0%, ${colors[1]} 100%)`;
  } catch (error) {
    return 'linear-gradient(135deg, #d0d0d0 0%, #e8e8e8 100%)';
  }
}

function extractColorHashFromUrl(url) {
  // Check for color parameter in URL (e.g., ?color=rgb...)
  try {
    const urlObj = new URL(url, window.location.origin);
    const color = urlObj.searchParams.get('color') || urlObj.searchParams.get('dominant_color');
    if (color) {
      return `linear-gradient(135deg, #${color} 0%, #${color}80 100%)`;
    }
  } catch (e) {
    // Invalid URL, continue
  }
  return null;
}

function generatePlaceholderColors(url) {
  // Generate consistent colors based on URL hash
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = ((hash << 5) - hash) + url.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const hue = Math.abs(hash % 360);
  const saturation = 60 + (Math.abs((hash * 7) % 20));
  const lightness = 70 + (Math.abs((hash * 11) % 15));

  return [
    `hsl(${hue}, ${saturation}%, ${lightness}%)`,
    `hsl(${(hue + 30) % 360}, ${saturation - 10}%, ${lightness - 5}%)`,
  ];
}

export function setupImageBlurUp(imageElement, imageUrl) {
  if (!imageElement || !imageUrl) {
    return;
  }

  // Generate blur-up placeholder
  const blurPlaceholder = generateImageBlur(imageUrl);
  
  // Apply placeholder as background
  imageElement.style.backgroundImage = blurPlaceholder;
  imageElement.classList.add('image-loading');

  // Create temporary image to detect load
  const img = new Image();
  img.onload = () => {
    imageElement.classList.remove('image-loading');
    imageElement.style.backgroundImage = `url('${imageUrl}')`;
  };
  img.onerror = () => {
    console.warn('Failed to load image:', imageUrl);
    imageElement.classList.remove('image-loading');
  };

  // Start loading with a small delay
  setTimeout(() => {
    img.src = imageUrl;
  }, 50);
}

export function setupLazyImageLoading() {
  // Use Intersection Observer for lazy loading
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target;
          const dataUrl = img.getAttribute('data-src');
          
          if (dataUrl) {
            setupImageBlurUp(img, dataUrl);
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px', // Start loading 50px before entering viewport
    });

    // Observe all lazy-loadable images
    document.querySelectorAll('img[data-src]').forEach((img) => {
      imageObserver.observe(img);
    });
  }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupLazyImageLoading);
} else {
  setupLazyImageLoading();
}
