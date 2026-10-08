/* Focus navigation and request ownership for the native recording player. */
(function (global) {
  'use strict';
  function nextIndex(index, key, count, orientation) {
    if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1 || index < 0 || index >= count) return null;
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    if ((key === 'ArrowDown' && orientation !== 'horizontal') || (key === 'ArrowRight' && orientation !== 'vertical')) return (index + 1) % count;
    if ((key === 'ArrowUp' && orientation !== 'horizontal') || (key === 'ArrowLeft' && orientation !== 'vertical')) return (index + count - 1) % count;
    return null;
  }
  function createRequestGate() {
    var generation = 0;
    return { begin: function () { generation += 1; return generation; }, invalidate: function () { generation += 1; }, accepts: function (ticket) { return ticket === generation; } };
  }
  function createFrameHandoff(stage, canAnimate) {
    var gate = createRequestGate(), outgoing = null, target = null;
    var animation = null, timeout = 0, opacity = 1;
    function clear() {
      gate.invalidate(); target = null;
      if (timeout) window.clearTimeout(timeout);
      timeout = 0;
      if (animation) animation.cancel();
      animation = null;
      if (outgoing) { outgoing.classList.remove('is-exiting'); outgoing.style.opacity = ''; }
      outgoing = null; opacity = 1;
      stage.dataset.transitioning = 'false';
    }
    function release(video) {
      if (!outgoing || target !== video || animation) return;
      if (timeout) window.clearTimeout(timeout);
      timeout = 0;
      if (!canAnimate() || typeof outgoing.animate !== 'function') { clear(); return; }
      var ticket = gate.begin();
      animation = outgoing.animate([{ opacity: opacity }, { opacity: 0 }], {
        duration: 260, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards'
      });
      animation.onfinish = function () { if (gate.accepts(ticket)) clear(); };
    }
    function capture(video, destination) {
      if (!canAnimate()) { clear(); return false; }
      var next = destination.closest('.recording');
      if (outgoing === next) { clear(); return false; }
      if (outgoing) {
        // Keep the one visual already on screen when a choice is interrupted.
        // Sampling opacity does not copy pixels or force a GPU readback.
        opacity = Number(window.getComputedStyle(outgoing).opacity);
        if (!Number.isFinite(opacity)) opacity = 1;
        outgoing.style.opacity = String(opacity);
        if (animation) animation.cancel();
        animation = null;
        if (timeout) window.clearTimeout(timeout);
      } else {
        var source = video.closest('.recording'), poster = source.querySelector('.film-fallback');
        if (!((!video.hidden && video.readyState >= 2) || (poster && poster.complete && poster.naturalWidth > 0))) return false;
        outgoing = source; opacity = 1;
        outgoing.classList.add('is-exiting'); outgoing.style.opacity = '1';
      }
      target = destination; stage.dataset.transitioning = 'true';
      var ticket = gate.begin();
      // Selection/ARIA are committed by the controller immediately. CSS keeps
      // this already-paused native surface visible only for the visual handoff.
      timeout = window.setTimeout(function () {
        if (!gate.accepts(ticket)) return;
        timeout = 0; release(destination);
      }, 450);
      return true;
    }
    return { capture: capture, release: release, clear: clear };
  }
  global.OrbitCinema = { nextIndex: nextIndex, createRequestGate: createRequestGate, createFrameHandoff: createFrameHandoff };
})(typeof globalThis !== 'undefined' ? globalThis : this);
