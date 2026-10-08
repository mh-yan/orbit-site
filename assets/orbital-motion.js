/* Layer the existing section entrances without adding another scroll owner.
   Only small copy/glyphs move; recordings and screenshots stay anchored. */
(function () {
  'use strict';
  var root = document.documentElement;
  var pageActive = true;
  // Child selector, initial delay, sibling interval, vertical distance.
  var stages = [
    ['.section-heading', [['h2', 0, 0, 12], ['.section-description', 55, 0, 7]]],
    ['.detail-heading', [['.eyebrow', 0, 0, 5], ['h2', 50, 0, 12]]],
    ['.setup-feature', [['.detail-overline', 0, 0, 5], ['.detail-copy h3', 45, 0, 10], ['.detail-copy > p:not(.detail-overline)', 90, 0, 6]]],
    ['.subwheel-feature', [['.detail-overline', 0, 0, 5], ['h3', 45, 0, 12], ['.subwheel-copy > p:not(.detail-overline)', 90, 0, 6], ['.detail-link', 125, 0, 5]]],
    ['.capabilities', [['h3', 0, 0, 8], ['.capability-list li', 50, 35, 7], ['.license-note', 160, 0, 4]]],
    ['.detail-quiet', [['.quiet-heading', 0, 0, 10], ['.comfort-copy h3', 45, 45, 6], ['.comfort-copy p', 80, 45, 4]]],
    ['.faq-intro', [['.eyebrow', 0, 0, 5], ['h2', 50, 0, 12]]],
    ['.detail-closing', [['.eyebrow', 0, 0, 5], ['h2', 45, 0, 12], ['.release-status', 90, 0, 6], ['.detail-link', 125, 0, 5], ['.release-price', 65, 0, 8], ['.release-trial', 110, 0, 5], ['.release-billing', 140, 0, 4]]]
  ];
  stages.forEach(function (stage) {
    document.querySelectorAll(stage[0] + '[data-reveal]').forEach(function (group) {
      group.classList.add('orbit-staged');
      stage[1].forEach(function (item) {
        group.querySelectorAll(item[0]).forEach(function (element, index) {
          element.style.setProperty('--orbit-stage-delay', (item[1] + index * item[2]) + 'ms');
          element.style.setProperty('--orbit-stage-y', item[3] + 'px');
          element.classList.add('orbit-stage-item');
        });
      });
    });
  });
  function sync() {
    // site.js already folds system reduced motion and SaveData into this flag.
    var eligible = pageActive && !document.hidden && root.dataset.motion !== 'off';
    root.dataset.orbitalMotion = eligible ? 'on' : 'off';
  }
  document.addEventListener('orbit:preferenceschange', sync);
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('pagehide', function () { pageActive = false; sync(); });
  window.addEventListener('pageshow', function () { pageActive = true; sync(); });
  sync();
})();
