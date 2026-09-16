/* A finite brand entrance. No splash screen, scroll lock or frame loop. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.querySelector('.hero-copy');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var timer;
  var observer;
  var running = false;
  var navigation = performance.getEntriesByType('navigation')[0];
  var restoringHistory = navigation && navigation.type === 'back_forward';
  function finish() {
    running = false;
    clearTimeout(timer);
    root.dataset.entry = 'complete';
    if (observer) observer.disconnect();
  }
  function respectPreferences() {
    if (reduce.matches || root.dataset.motion === 'off' || (connection && connection.saveData)) finish();
  }
  // Deep links and restored positions should show their destination directly.
  if (hero && !location.hash && !restoringHistory && window.scrollY < 64 && !document.hidden
      && !reduce.matches && root.dataset.motion !== 'off' && !(connection && connection.saveData)) {
    running = true;
    root.dataset.entry = 'running';
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) finish();
      }, { threshold: 0 });
      observer.observe(hero);
    }
    timer = setTimeout(finish, 2000);
  } else finish();
  document.addEventListener('orbit:preferenceschange', respectPreferences);
  document.addEventListener('focusin', function (event) {
    if (running && event.target.closest('[data-journey-link]')) finish();
  });
  reduce.addEventListener('change', respectPreferences);
  if (connection && connection.addEventListener) connection.addEventListener('change', respectPreferences);
  document.addEventListener('visibilitychange', function () { if (document.hidden && running) finish(); });
  window.addEventListener('pagehide', finish);
  window.addEventListener('pageshow', function (event) { if (event.persisted) finish(); });
})();
