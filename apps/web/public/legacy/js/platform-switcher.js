/* Only the authenticated outer shell reveals these controls and handles navigation. */
(function () {
  if (window.parent === window) return;
  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-endvora-switcher]');
    if (!button || button.hidden) return;
    document.querySelectorAll('[data-endvora-switcher]').forEach(function (item) { item.removeAttribute('data-active'); });
    button.setAttribute('data-active', '');
    if (typeof closeMobileNavMenus === 'function') closeMobileNavMenus();
    window.parent.postMessage({ type: 'endvora:open-switcher' }, window.location.origin);
  });
  document.addEventListener('pointerdown', function (event) {
    if (!event.target.closest('[data-endvora-switcher]')) window.parent.postMessage({ type: 'endvora:dismiss-switcher' }, window.location.origin);
  });
})();
