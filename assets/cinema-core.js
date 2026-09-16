/* Focus navigation and request ownership for the native recording player. */
(function (global) {
  'use strict';
  function nextIndex(index, key, count) {
    if (!Number.isInteger(index) || !Number.isInteger(count) || count < 1 || index < 0 || index >= count) return null;
    if (key === 'Home') return 0;
    if (key === 'End') return count - 1;
    if (key === 'ArrowDown' || key === 'ArrowRight') return (index + 1) % count;
    if (key === 'ArrowUp' || key === 'ArrowLeft') return (index + count - 1) % count;
    return null;
  }
  function createRequestGate() {
    var generation = 0;
    return { begin: function () { generation += 1; return generation; }, invalidate: function () { generation += 1; }, accepts: function (ticket) { return ticket === generation; } };
  }
  global.OrbitCinema = { nextIndex: nextIndex, createRequestGate: createRequestGate };
})(typeof globalThis !== 'undefined' ? globalThis : this);
