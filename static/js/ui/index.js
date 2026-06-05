import { createDestinationModalUi } from './destination-modal-ui.js';
import { createFeedbackUi } from './feedback-ui.js';
import { createLoginUi } from './login-ui.js';
import { createMapPanelUi } from './map-panel-ui.js';
import { createScreenUi } from './screen-ui.js';
import { createToastUi } from './toast-ui.js';
import { createListViewUi } from './list-view-ui.js';

export function createUi(dom, mapView, callbacks = {}) {
  return {
    ...createScreenUi(dom, mapView),
    ...createLoginUi(dom),
    ...createFeedbackUi(dom),
    ...createMapPanelUi(dom),
    ...createDestinationModalUi(dom),
    ...createToastUi(dom),
    ...createListViewUi(dom, callbacks),
  };
}
