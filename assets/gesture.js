/* An illustrated gesture, separate from the native recordings. Only phase
   changes are scheduled; the browser interpolates transforms and opacity. */
(function () {
  'use strict';
  var section = document.getElementById('gesture');
  if (!section) return;
  var root = document.documentElement;
  var stage = document.getElementById('gesture-stage');
  var toggle = document.getElementById('gesture-toggle');
  var announcement = document.getElementById('gesture-announcement');
  var controls = section.querySelector('.gesture-step-controls');
  var steps = Array.from(controls.querySelectorAll('[data-step]'));
  var preferences = window.OrbitSiteMedia && window.OrbitSiteMedia.preferences;
  var reduce = preferences ? preferences.reducedMotion : window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var phases = ['hold', 'aim', 'release', 'rest'];
  var duration = { hold: 1400, aim: 1800, release: 1600, rest: 440 };
  var phase = section.dataset.phase;
  var timer = null;
  var inView = false, pageActive = true, pausedByUser = false, started = false;
  var observesVisibility = 'IntersectionObserver' in window;
  var labels = {
    hold: ['按住快捷键，轮盘出现。', 'Hold your shortcut to bring up Orbit.'],
    aim: ['指向 Safari，圆球变为黑色。', 'Point at Safari to select its circle.'],
    release: ['松手打开所选应用，轮盘收起。', 'Release to open your choice and dismiss Orbit.'],
    rest: ['回到中央再松手，也可以取消。', 'You can also return to the center and release to cancel.']
  };
  function t(zh, en) { return root.dataset.lang === 'en' ? en : zh; }
  function motionAllowed() {
    return root.dataset.motion !== 'off' && !reduce.matches && !(connection && connection.saveData);
  }
  function mayRun() {
    return observesVisibility && inView && pageActive && !document.hidden && motionAllowed() && !pausedByUser;
  }
  function clearTimer() {
    if (timer !== null) window.clearTimeout(timer);
    timer = null;
  }
  function describe() {
    var label = labels[phase];
    stage.setAttribute('data-label-zh', '手势演示：' + label[0]);
    stage.setAttribute('data-label-en', 'Gesture illustration: ' + label[1]);
    stage.setAttribute('aria-label', t('手势演示：' + label[0], 'Gesture illustration: ' + label[1]));
  }
  function show(next, announce) {
    phase = next;
    section.dataset.phase = phase;
    steps.forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.step === (phase === 'rest' ? 'hold' : phase)));
    });
    describe();
    // Automatic loops remain silent for assistive technology.
    if (announce) announcement.textContent = t(labels[phase][0], labels[phase][1]);
  }
  function reconcile() {
    var running = mayRun();
    section.dataset.running = String(running);
    section.dataset.animate = running ? 'on' : 'off';
    toggle.disabled = !motionAllowed() || !observesVisibility;
    toggle.setAttribute('aria-pressed', String(running));
    toggle.setAttribute('aria-label', toggle.disabled
      ? t('动画已关闭，可使用步骤按钮查看', 'Motion is off. Use the step buttons to explore.')
      : running ? t('暂停手势演示', 'Pause the gesture illustration') : t('播放手势演示', 'Play the gesture illustration'));
    if (!running) { clearTimer(); return; }
    if (!started) { started = true; show('hold', false); }
    if (timer === null) timer = window.setTimeout(function () {
      timer = null;
      if (!mayRun()) { reconcile(); return; }
      show(phases[(phases.indexOf(phase) + 1) % phases.length], false);
      reconcile();
    }, duration[phase]);
  }
  function select(button) {
    pausedByUser = true;
    reconcile();
    show(button.dataset.step, true);
  }
  steps.forEach(function (button, index) {
    button.addEventListener('click', function () { select(button); });
    button.addEventListener('keydown', function (event) {
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      var next = event.key === 'ArrowRight' ? (index + 1) % steps.length
        : event.key === 'ArrowLeft' ? (index + steps.length - 1) % steps.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? steps.length - 1 : null;
      if (next === null) return;
      event.preventDefault();
      steps[next].focus({ preventScroll: true });
      select(steps[next]);
    });
  });
  controls.addEventListener('focusin', function () {
    pausedByUser = true;
    reconcile();
  });
  toggle.addEventListener('click', function () {
    if (toggle.disabled) return;
    pausedByUser = section.dataset.running === 'true';
    reconcile();
  });
  document.addEventListener('orbit:preferenceschange', function () { describe(); reconcile(); });
  reduce.addEventListener('change', reconcile);
  if (connection && typeof connection.addEventListener === 'function') connection.addEventListener('change', reconcile);
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('pagehide', function () { pageActive = false; reconcile(); });
  window.addEventListener('pageshow', function () { pageActive = true; reconcile(); });
  if (observesVisibility) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        inView = entry.isIntersecting && entry.intersectionRatio >= 0.35;
      });
      reconcile();
    }, { threshold: [0, 0.35] });
    observer.observe(stage);
  }
  show(phase, false);
  reconcile();
})();
