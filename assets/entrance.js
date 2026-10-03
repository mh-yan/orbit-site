/* The first-paint CSS entrance settles once, without a scroll lock or frame loop. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.getElementById('hero');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var timer;
  var observer;
  var running = false;
  var entryNames = /^(orbit-arrive|orbit-unfold|horizon-arrive|orbit-letter)$/;
  var navigation = performance.getEntriesByType('navigation')[0];
  var restoringHistory = navigation && navigation.type === 'back_forward';
  function finish() {
    running = false;
    clearTimeout(timer);
    if (root.dataset.entry !== 'complete') root.dataset.entry = 'complete';
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
    // CSS has already started at the first styled paint. Wait for its real
    // completion rather than cutting off a delayed start with a wall clock.
    if (typeof hero.getAnimations === 'function') {
      var animations = hero.getAnimations({ subtree: true }).filter(function (animation) {
        return entryNames.test(animation.animationName) && animation.playState !== 'finished' && animation.playState !== 'idle';
      });
      if (animations.length) {
        Promise.all(animations.map(function (animation) {
          return animation.finished.catch(function () {});
        })).then(function () { if (running) finish(); });
      } else finish();
    } else {
      // Older engines cannot expose CSS animation completion. This fallback
      // outlasts the longest 1042ms entrance; it does not drive interpolation.
      timer = setTimeout(finish, 1600);
    }
    if (running && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) finish();
      }, { threshold: 0 });
      observer.observe(hero);
    }
  } else finish();
  document.addEventListener('orbit:preferenceschange', respectPreferences);
  reduce.addEventListener('change', respectPreferences);
  if (connection && connection.addEventListener) connection.addEventListener('change', respectPreferences);
  document.addEventListener('visibilitychange', function () { if (document.hidden && running) finish(); });
  window.addEventListener('pagehide', finish);
  window.addEventListener('pageshow', function (event) { if (event.persisted) finish(); });
})();
