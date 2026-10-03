/* A reversible brand introduction that flows directly into the cinema.
   ViewTimeline owns interpolation when available; the fallback only requests
   one frame after an actual scroll/resize and stops outside this section. */
(function () {
  'use strict';
  var root = document.documentElement;
  var hero = document.getElementById('hero');
  if (!hero || typeof Element.prototype.animate !== 'function') return;
  var heroCopy = hero.querySelector('.hero-copy');
  if (!heroCopy) return;
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
  var progress = -1;
  var viewportWidth = window.innerWidth;
  var viewportHeight = window.innerHeight;
  var needsMeasure = true;
  var pageActive = true;
  var initialized = false;
  var focusAnimation = null;
  var focusFallback = false;
  var definitions = [
    ['.hero-horizon', [
      { transform: 'translateY(0)', offset: 0, easing: 'cubic-bezier(.4,0,.6,1)' },
      { transform: 'translateY(-28px)', offset: 1 }
    ]],
    ['.hero-copy', [
      { opacity: 1, transform: 'translateY(0)', offset: 0 },
      { opacity: 1, transform: 'translateY(0)', offset: .2, easing: 'cubic-bezier(.4,0,.6,1)' },
      { opacity: 0, transform: 'translateY(-24px)', offset: .9 },
      { opacity: 0, transform: 'translateY(-24px)', offset: 1 }
    ]]
  ];
  // Each app returns a short distance toward its own orbit, instead of fading
  // the entire constellation as a flat layer. This sits outside the initial
  // CSS entrance, so scrolling can reverse without restarting that entrance.
  var appPosition = 'translate(-50%,-50%) translate(calc(var(--orbit-width) * var(--slot-x)),calc(var(--orbit-height) * var(--slot-y))) rotate(var(--turn))';
  hero.querySelectorAll('.intro-app').forEach(function (_, index) {
    var settled = appPosition + ' translate(calc(var(--slot-x) * -14px),calc(var(--slot-y) * -10px - 8px)) scale(.98)';
    definitions.push(['.intro-app:nth-child(' + (index + 1) + ')', [
      { opacity: 1, transform: appPosition, offset: 0 },
      { opacity: 1, transform: appPosition, offset: .1 + index * .015, easing: 'cubic-bezier(.4,0,.6,1)' },
      { opacity: 0, transform: settled, offset: .66 + index * .022 },
      { opacity: 0, transform: settled, offset: 1 }
    ]]);
  });
  function measure() {
    var bounds = hero.getBoundingClientRect();
    start = bounds.top + window.scrollY;
    // The hero occupies its content-sized stage in normal flow. There is no pinned,
    // empty interval before the native recordings enter the viewport.
    distance = Math.max(1, bounds.height);
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    needsMeasure = false;
  }
  function update() {
    if (!enabled || !pageActive || document.hidden || nativeTimeline) return;
    if (needsMeasure) measure();
    var next = Math.max(0, Math.min(1, (window.scrollY - start) / distance));
    // Repeated boundary/resize notifications must not recommit the same styles.
    if (next === progress) return;
    progress = next;
    animations.forEach(function (animation) { animation.currentTime = progress * 1000; });
  }
  function schedule() {
    if (enabled && !nativeTimeline && pageActive && (visible || needsMeasure) && !document.hidden && !frame) {
      frame = requestAnimationFrame(function () { frame = 0; update(); });
    }
  }
  function resized() {
    if (viewportWidth === window.innerWidth && viewportHeight === window.innerHeight) return;
    needsMeasure = true;
    schedule();
  }
  function clearFocus() {
    if (focusAnimation) focusAnimation.cancel();
    focusAnimation = null;
    if (focusFallback) heroCopy.style.removeProperty('opacity');
    focusFallback = false;
  }
  function protectFocus() {
    if (!enabled || !heroCopy.contains(document.activeElement)) return;
    clearFocus();
    try {
      // Additive opacity keeps the live scroll timeline underneath. A focused
      // link stays fully visible, including when it is already in the viewport.
      focusAnimation = heroCopy.animate([{ opacity: 1 }, { opacity: 1 }], { duration: 1, fill: 'both', composite: 'add' });
      if (focusAnimation.effect && focusAnimation.effect.composite !== 'add') throw new Error('Additive animation unavailable');
    } catch (_) {
      clearFocus();
      heroCopy.style.setProperty('opacity', '1', 'important');
      focusFallback = true;
    }
  }
  function releaseFocus() {
    if (focusFallback || !enabled) { clearFocus(); return; }
    if (!focusAnimation) return;
    var previous = focusAnimation;
    // Release only the added contribution; scrolling can continue underneath
    // without a stale opacity endpoint or another requestAnimationFrame loop.
    focusAnimation = heroCopy.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, easing: 'cubic-bezier(.22,1,.36,1)', composite: 'add' });
    previous.cancel();
    var release = focusAnimation;
    release.onfinish = function () { if (focusAnimation === release) clearFocus(); };
  }
  function clear() {
    cancelAnimationFrame(frame); frame = 0;
    clearFocus();
    animations.forEach(function (animation) { animation.cancel(); });
    animations = [];
    progress = -1;
  }
  function buildAnimations() {
    var timeline;
    nativeTimeline = typeof window.ViewTimeline === 'function' && window.CSS && CSS.supports('animation-range', 'exit 0% exit 100%');
    try {
      if (nativeTimeline) timeline = new ViewTimeline({ subject: hero, axis: 'block', inset: '0px' });
      definitions.forEach(function (definition) {
        var options = nativeTimeline
          ? { timeline: timeline, rangeStart: 'exit 0%', rangeEnd: 'exit 100%', fill: 'both', easing: 'linear' }
          : { duration: 1000, fill: 'both', easing: 'linear' };
        var animation = hero.querySelector(definition[0]).animate(definition[1], options);
        animations.push(animation);
        if (nativeTimeline && animation.timeline !== timeline) throw new Error('Scroll timeline unavailable');
        if (!nativeTimeline) animation.pause();
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
    if (enabled) { needsMeasure = true; buildAnimations(); update(); protectFocus(); }
    else { hero.dataset.timeline = 'static'; progress = 0; }
  }
  window.addEventListener('scroll', schedule, { passive: true });
  heroCopy.addEventListener('focusin', protectFocus);
  heroCopy.addEventListener('focusout', function (event) { if (!heroCopy.contains(event.relatedTarget)) releaseFocus(); });
  window.addEventListener('resize', resized, { passive: true });
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
  window.addEventListener('pagehide', function () { pageActive = false; cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', function () { pageActive = true; needsMeasure = true; update(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else { needsMeasure = true; update(); }
  });
  configure();
})();
