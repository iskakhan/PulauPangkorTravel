export function createFeedbackUi(dom) {
  function openFeedbackModal() {
    hideFeedbackError();
    setFeedbackLoading(false);
    dom.feedbackModal.classList.remove('hidden');
    dom.feedbackVisitComment.focus();
  }

  function hideFeedbackModal() {
    dom.feedbackModal.classList.add('hidden');
  }

  function resetFeedbackForm() {
    dom.feedbackForm.reset();
    hideFeedbackError();
    setFeedbackLoading(false);
  }

  function showFeedbackError(message) {
    dom.feedbackError.textContent = message;
    dom.feedbackError.classList.remove('hidden');
  }

  function hideFeedbackError() {
    dom.feedbackError.textContent = '';
    dom.feedbackError.classList.add('hidden');
  }

  function setFeedbackLoading(isLoading) {
    dom.feedbackSubmitButton.dataset.loading = String(isLoading);
    dom.feedbackSubmitButton.disabled = isLoading;
    dom.feedbackSkipButton.disabled = isLoading;
    dom.feedbackCloseButton.disabled = isLoading;
    dom.feedbackSubmitLabel.textContent = isLoading ? 'Menghantar' : 'Hantar & log keluar';
    dom.feedbackSpinner.classList.toggle('hidden', !isLoading);
  }

  return {
    openFeedbackModal,
    hideFeedbackModal,
    resetFeedbackForm,
    showFeedbackError,
    hideFeedbackError,
    setFeedbackLoading,
  };
}
