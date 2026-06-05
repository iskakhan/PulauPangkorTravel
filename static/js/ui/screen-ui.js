export function createScreenUi(dom, mapView) {
  function showScreen(screen) {
    dom.loginScreen.classList.toggle('hidden', screen !== 'login');
    dom.mapScreen.classList.toggle('hidden', screen !== 'map');
    document.body.dataset.screen = screen;

    if (screen === 'map') {
      mapView.invalidateSize();
    }
  }

  return {
    showScreen,
  };
}
