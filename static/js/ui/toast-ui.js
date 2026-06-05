export function createToastUi(dom) {
  let toastTimer = null;

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.remove('hidden');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => dom.toast.classList.add('hidden'), 3000);
  }

  return {
    showToast,
  };
}
