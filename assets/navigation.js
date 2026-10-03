/* Native anchors, a compact mobile disclosure, and responsive tab semantics. */
(function () {
  'use strict';
  var header = document.querySelector('.site-header');
  var button = document.getElementById('menu-toggle');
  var nav = document.getElementById('site-navigation');
  var tabs = document.querySelector('.chapter-list');
  var mobile = window.matchMedia('(max-width: 640px)');
  var open = false;
  var marker = document.getElementById('nav-reveal-point');
  function syncElevation() {
    header.dataset.raised = String(marker ? marker.getBoundingClientRect().bottom < 0 : true);
  }
  function label() {
    var en = document.documentElement.dataset.lang === 'en';
    button.setAttribute('aria-label', open ? (en ? 'Close navigation' : '关闭导航') : (en ? 'Open navigation' : '打开导航'));
  }
  function setOpen(value, restoreFocus) {
    open = mobile.matches && value;
    header.dataset.menuOpen = String(open);
    button.setAttribute('aria-expanded', String(open));
    label();
    if (restoreFocus) button.focus({ preventScroll: true });
  }
  button.addEventListener('click', function () {
    setOpen(!open, false);
    if (open) nav.querySelector('a').focus({ preventScroll: true });
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && open) { setOpen(false, true); event.preventDefault(); }
  });
  document.addEventListener('click', function (event) {
    if (open && !header.contains(event.target)) setOpen(false, false);
  });
  header.addEventListener('focusout', function (event) {
    if (open && event.relatedTarget && !header.contains(event.relatedTarget)) setOpen(false, false);
  });
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      if (!open) return;
      var target = document.querySelector(link.getAttribute('href'));
      setOpen(false, false);
      if (target) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    });
  });
  function syncTabOverflow() {
    tabs.dataset.overflowStart = String(tabs.scrollLeft > 3);
    tabs.dataset.overflowEnd = String(tabs.scrollWidth - tabs.clientWidth - tabs.scrollLeft > 3);
  }
  function syncTabOrientation() {
    var direction = window.getComputedStyle(tabs).flexDirection;
    tabs.setAttribute('aria-orientation', direction === 'column' || direction === 'column-reverse' ? 'vertical' : 'horizontal');
    syncTabOverflow();
  }
  function syncLayout() {
    if (!mobile.matches) setOpen(false, false);
    else if (!open && nav.contains(document.activeElement)) button.focus({ preventScroll: true });
    syncTabOrientation();
  }
  mobile.addEventListener('change', syncLayout);
  window.addEventListener('resize', syncTabOrientation, { passive: true });
  tabs.addEventListener('scroll', syncTabOverflow, { passive: true });
  document.addEventListener('orbit:preferenceschange', label);
  if (marker && 'IntersectionObserver' in window) {
    var elevationObserver = new IntersectionObserver(syncElevation, { threshold: 0 });
    elevationObserver.observe(marker);
  } else window.addEventListener('scroll', syncElevation, { passive: true });
  window.addEventListener('pageshow', syncElevation);
  syncLayout(); label(); syncElevation();
})();
