/* Observe the finite first-paint phrase. User intent can quicken its remaining
   motion without cancelling the presentation frame or taking over scrolling. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.getElementById('hero');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var timer;
  var observer;
  var running = false;
  var handedOff = false;
  var animations = [];
  var initialScroll = window.scrollY;
  var entryNames = /^(orbit-arrive|orbit-unfold|horizon-arrive|orbit-o-arrive|orbit-o-depth|orbit-trace|orbit-word-reveal|crest-unfold|crest-centre|crest-settle)$/;
  var navigation = performance.getEntriesByType('navigation')[0];
  var restoringHistory = navigation && navigation.type === 'back_forward';
  function finish() {
    running = false;
    clearTimeout(timer);
    if (root.dataset.entry !== 'complete') root.dataset.entry = 'complete';
    if (observer) observer.disconnect();
    window.removeEventListener('scroll', onScroll);
    document.removeEventListener('mousedown', onPrimaryPress);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('focusin', onFocusIn);
  }
  function respectPreferences() {
    if (reduce.matches || root.dataset.motion === 'off' || (connection && connection.saveData)) finish();
  }
  function handoff() {
    if (!running || handedOff) return;
    handedOff = true;
    var remaining = 0;
    var live = animations.filter(function (animation) {
      return animation.playState !== 'finished' && animation.playState !== 'idle';
    });
    live.forEach(function (animation) {
      try {
        var end = animation.effect.getComputedTiming().endTime;
        var time = Number.isFinite(animation.currentTime) ? animation.currentTime : 0;
        var rate = Number.isFinite(animation.playbackRate) && animation.playbackRate > 0 ? animation.playbackRate : 1;
        if (Number.isFinite(end)) remaining = Math.max(remaining, (end - time) / rate);
      } catch (_) { /* An older engine may only expose completion promises. */ }
    });
    var acceleration = Math.max(1, remaining / 220);
    if (acceleration === 1) return;
    // Changing playback rate preserves the browser's current presentation,
    // including delays, and keeps every layer in the same temporal relation.
    // Engines without this method simply finish their existing short phrase.
    live.forEach(function (animation) {
      try {
        if (typeof animation.updatePlaybackRate === 'function') {
          var rate = Number.isFinite(animation.playbackRate) && animation.playbackRate > 0 ? animation.playbackRate : 1;
          animation.updatePlaybackRate(rate * acceleration);
        }
      } catch (_) { /* Keep native interpolation if retiming is unavailable. */ }
    });
  }
  function onScroll() {
    if (Math.abs(window.scrollY - initialScroll) > 8) handoff();
  }
  function exposeAction(target) {
    if (!target || typeof target.closest !== 'function') return;
    var action = target.closest('.hero-actions');
    // Retain the visible state after blur/release. Otherwise removing a
    // temporary focus rule could restart a delayed CSS entrance from zero.
    if (action) action.dataset.entryExposed = 'true';
  }
  function onFocusIn(event) {
    exposeAction(event.target);
  }
  function onPrimaryPress(event) {
    // An ordinary press on the scenery is not a request to skip the entrance.
    // Only intentional actions receive a quicker, continuous visual handoff.
    var target = event.target;
    if (event.button === 0 && target && typeof target.closest === 'function'
        && target.closest('a,button,input,select,textarea,summary,[role="button"]')) {
      exposeAction(target);
      handoff();
    }
  }
  function onKeyDown(event) {
    if (event.key === 'Escape') handoff();
  }
  // Deep links and restored positions should show their destination directly.
  // A head-time skip is final, even if the tab becomes visible before defer.
  if (hero && root.dataset.entry !== 'complete' && !location.hash && !restoringHistory && window.scrollY < 64 && !document.hidden
      && !reduce.matches && root.dataset.motion !== 'off' && !(connection && connection.saveData)) {
    running = true;
    root.dataset.entry = 'running';
    exposeAction(document.activeElement);
    // CSS has already started at the first styled paint. Wait for its real
    // completion rather than cutting off a delayed start with a wall clock.
    try {
      if (typeof hero.getAnimations !== 'function') throw new Error('Animation inspection unavailable');
      animations = hero.getAnimations({ subtree: true }).filter(function (animation) {
        return entryNames.test(animation.animationName) && animation.playState !== 'finished' && animation.playState !== 'idle';
      });
      if (animations.length) {
        Promise.all(animations.map(function (animation) {
          return animation.finished.catch(function () {});
        })).then(function () { if (running) finish(); });
      } else finish();
    } catch (_) {
      // This only guards older engines. It outlasts the 1750ms final layer;
      // CSS still owns interpolation and nothing waits for this timer.
      timer = setTimeout(finish, 2200);
    }
    if (running) {
      window.addEventListener('scroll', onScroll, { passive: true });
      document.addEventListener('mousedown', onPrimaryPress);
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('focusin', onFocusIn);
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
