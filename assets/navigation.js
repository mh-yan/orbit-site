/* Native anchors, a compact mobile disclosure, and responsive tab semantics. */
(function () {
  'use strict';
  var header = document.querySelector('.site-header');
  var button = document.getElementById('menu-toggle');
  var nav = document.getElementById('site-navigation');
  var tabs = document.querySelector('.chapter-list');
  var mobile = window.matchMedia('(max-width: 640px)');
  var open = false;
  var layoutFrame = 0, pageActive = true;
  var marker = document.getElementById('nav-reveal-point');
  function syncElevation(entries) {
    var entry = entries && entries[0];
    var bounds = entry && entry.boundingClientRect ? entry.boundingClientRect : marker && marker.getBoundingClientRect();
    var raised = String(bounds ? bounds.bottom < 0 : true);
    if (header.dataset.raised !== raised) header.dataset.raised = raised;
  }
  function label() {
    var en = document.documentElement.dataset.lang === 'en';
    button.setAttribute('aria-label', open ? (en ? 'Close navigation' : '关闭导航') : (en ? 'Open navigation' : '打开导航'));
  }
  function setOpen(value, restoreFocus) {
    open = mobile.matches && value;
    header.dataset.menuOpen = String(open);
    nav.inert = mobile.matches && !open;
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
  document.addEventListener('click', function (event) {
    if (event.detail !== 0 || event.defaultPrevented || event.altKey || event.metaKey || event.ctrlKey || event.shiftKey) return;
    var link = event.target.closest && event.target.closest('a[href]');
    var href = link && link.getAttribute('href');
    if (!href || href.length < 2 || href.charAt(0) !== '#') return;
    var target;
    try { target = document.getElementById(decodeURIComponent(href.slice(1))); } catch (_) { return; }
    if (!target || typeof target.scrollIntoView !== 'function') return;
    // Keyboard navigation lands immediately even while pointer-driven native
    // anchors use the page's smooth scroll preference.
    event.preventDefault();
    if (target.getAttribute('tabindex') === null) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: 'instant', block: 'start' });
    if (window.history && window.location.hash !== href) window.history.pushState(null, '', href);
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
    var start = String(tabs.scrollLeft > 3);
    var end = String(tabs.scrollWidth - tabs.clientWidth - tabs.scrollLeft > 3);
    if (tabs.dataset.overflowStart !== start) tabs.dataset.overflowStart = start;
    if (tabs.dataset.overflowEnd !== end) tabs.dataset.overflowEnd = end;
  }
  function syncTabOrientation() {
    var direction = window.getComputedStyle(tabs).flexDirection;
    tabs.setAttribute('aria-orientation', direction === 'column' || direction === 'column-reverse' ? 'vertical' : 'horizontal');
    syncTabOverflow();
    if (window.OrbitSiteMedia && window.OrbitSiteMedia.syncChapterIndicator) window.OrbitSiteMedia.syncChapterIndicator(false);
  }
  function syncLayout() {
    if (layoutFrame) window.cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
    if (!mobile.matches) setOpen(false, false);
    else if (!open && nav.contains(document.activeElement)) button.focus({ preventScroll: true });
    nav.inert = mobile.matches && !open;
    syncTabOrientation();
  }
  function requestLayout() {
    if (!layoutFrame && pageActive && !document.hidden) layoutFrame = window.requestAnimationFrame(syncLayout);
  }
  function cancelLayout() {
    if (layoutFrame) window.cancelAnimationFrame(layoutFrame);
    layoutFrame = 0;
  }
  mobile.addEventListener('change', syncLayout);
  window.addEventListener('resize', requestLayout, { passive: true });
  tabs.addEventListener('scroll', syncTabOverflow, { passive: true });
  document.addEventListener('orbit:preferenceschange', function () { label(); requestLayout(); });
  if ('ResizeObserver' in window) new ResizeObserver(requestLayout).observe(tabs);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestLayout);
  if (marker && 'IntersectionObserver' in window) {
    var elevationObserver = new IntersectionObserver(syncElevation, { threshold: 0 });
    elevationObserver.observe(marker);
  } else window.addEventListener('scroll', syncElevation, { passive: true });
  window.addEventListener('pagehide', function () { pageActive = false; cancelLayout(); });
  window.addEventListener('pageshow', function () { pageActive = true; syncElevation(); syncLayout(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) cancelLayout(); else requestLayout(); });
  syncLayout(); label(); syncElevation();
})();
