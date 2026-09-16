/* Native scrolling and a single, short entrance for each section.
   No measured geometry, moving video layer, or per-frame scroll work. */
(function () {
  'use strict';
  var root = document.documentElement;
  var preferences = window.OrbitSiteMedia && window.OrbitSiteMedia.preferences;
  var reduce = preferences ? preferences.reducedMotion : window.matchMedia('(prefers-reduced-motion:reduce)');
  var reveals = Array.from(document.querySelectorAll('[data-reveal]'));
  var observer;
  function reveal(element, immediate) {
    if (immediate) element.classList.add('reveal-immediate');
    element.classList.add('is-revealed');
    if (observer) observer.unobserve(element);
  }
  function revealAll() {
    reveals.forEach(function (element) { reveal(element, true); });
    if (observer) observer.disconnect();
  }
  function respectMotion() { if (reduce.matches || root.dataset.motion === 'off') revealAll(); }
  // A future content change must not turn the native film into a moving layer.
  reveals.forEach(function (element) { if (element.querySelector('video')) element.classList.add('reveal-static'); });
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && entry.intersectionRatio > 0) reveal(entry.target, false);
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -16px 0px' });
    root.classList.add('motion-ready');
    reveals.forEach(function (element) { observer.observe(element); });
  } else revealAll();
  document.addEventListener('focusin', function (event) {
    // Keyboard focus is never hidden behind an entrance, including a parent
    // reveal block. Revealing once also makes subsequent focus moves immediate.
    reveals.forEach(function (element) { if (element.contains(event.target)) reveal(element, true); });
  });
  document.addEventListener('orbit:preferenceschange', respectMotion);
  reduce.addEventListener('change', respectMotion);
  respectMotion();
})();
