import { createDestinationModalUi } from './destination-modal-ui.js?v=9';
import { createFeedbackUi } from './feedback-ui.js?v=9';
import { createLoginUi } from './login-ui.js?v=9';
import { createMapPanelUi } from './map-panel-ui.js?v=9';
import { createScreenUi } from './screen-ui.js?v=9';
import { createToastUi } from './toast-ui.js?v=9';
import { createListViewUi } from './list-view-ui.js?v=11';

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
