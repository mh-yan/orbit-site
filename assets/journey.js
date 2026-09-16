/* A reversible brand introduction that flows directly into the cinema.
   ViewTimeline owns interpolation when available; the fallback only requests
   one frame after an actual scroll/resize and stops outside this section. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.getElementById('hero');
  if (!hero || typeof Element.prototype.animate !== 'function') return;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var shortScreen = window.matchMedia('(max-height: 600px)');
  var connection = navigator.connection;
  var animations = [];
  var frame = 0;
  var start = 0;
  var distance = 1;
  var enabled = false;
  var visible = true;
  var nativeTimeline = false;
  var progress = 0;
  var initialized = false;
  var definitions = [
    ['.hero-horizon', [
      { transform: 'translateY(0)', offset: 0 },
      { transform: 'translateY(-48px)', offset: 1 }
    ]],
    ['.hero-copy', [
      { opacity: 1, transform: 'translateY(0)', offset: 0 },
      { opacity: 1, transform: 'translateY(0)', offset: .12 },
      { opacity: 0, transform: 'translateY(-32px)', offset: .72 },
      { opacity: 0, transform: 'translateY(-32px)', offset: 1 }
    ]],
    ['.intro-orbit', [
      { opacity: 1, transform: 'translateX(-50%) translateY(0)', offset: 0 },
      { opacity: 1, transform: 'translateX(-50%) translateY(0)', offset: .1 },
      { opacity: 0, transform: 'translateX(-50%) translateY(-24px)', offset: .78 },
      { opacity: 0, transform: 'translateX(-50%) translateY(-24px)', offset: 1 }
    ]]
  ];
  function measure() {
    var bounds = hero.getBoundingClientRect();
    start = bounds.top + window.scrollY;
    // The hero occupies one viewport in normal flow. There is no pinned,
    // empty interval before the native recordings enter the viewport.
    distance = Math.max(1, bounds.height);
  }
  function update() {
    frame = 0;
    if (!enabled || document.hidden) return;
    progress = Math.max(0, Math.min(1, (window.scrollY - start) / distance));
    if (!nativeTimeline) animations.forEach(function (animation) { animation.currentTime = progress * 1000; });
  }
  function schedule() {
    if (enabled && visible && !document.hidden && !frame) frame = requestAnimationFrame(update);
  }
  function clear() {
    cancelAnimationFrame(frame); frame = 0;
    animations.forEach(function (animation) { animation.cancel(); });
    animations = [];
  }
  function buildAnimations() {
    var timeline;
    nativeTimeline = typeof window.ViewTimeline === 'function';
    if (nativeTimeline) timeline = new ViewTimeline({ subject: hero, axis: 'block', inset: '0px' });
    try {
      definitions.forEach(function (definition) {
        var options = nativeTimeline
          ? { timeline: timeline, rangeStart: 'exit 0%', rangeEnd: 'exit 100%', fill: 'both', easing: 'linear' }
          : { duration: 1000, fill: 'both', easing: 'linear' };
        var animation = hero.querySelector(definition[0]).animate(definition[1], options);
        if (!nativeTimeline) animation.pause();
        animations.push(animation);
      });
    } catch (_) {
      clear(); nativeTimeline = false;
      definitions.forEach(function (definition) {
        var animation = hero.querySelector(definition[0]).animate(definition[1], { duration: 1000, fill: 'both', easing: 'linear' });
        animation.pause(); animations.push(animation);
      });
    }
    hero.dataset.timeline = nativeTimeline ? 'native' : 'fallback';
  }
  function configure() {
    var next = !reduce.matches && !shortScreen.matches && root.dataset.motion !== 'off' && !(connection && connection.saveData);
    if (initialized && next === enabled) return;
    initialized = true; enabled = next;
    clear(); hero.dataset.story = enabled ? 'on' : 'off';
    if (enabled) { measure(); buildAnimations(); update(); }
    else { hero.dataset.timeline = 'static'; progress = 0; }
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', function () { if (enabled) { measure(); update(); } }, { passive: true });
  document.addEventListener('orbit:preferenceschange', configure);
  reduce.addEventListener('change', configure);
  shortScreen.addEventListener('change', configure);
  if (connection && connection.addEventListener) connection.addEventListener('change', configure);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      update();
    }, { threshold: 0 }).observe(hero);
  }
  window.addEventListener('pagehide', function () { cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', function () { if (enabled) { measure(); update(); } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) { measure(); update(); } });
  configure();
})();
