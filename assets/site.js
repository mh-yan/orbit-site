(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var userMotion = root.dataset.motion !== 'off';
  var previousMotion;
  var current = 0;
  var tabs = Array.from(document.querySelectorAll('[data-scene]'));
  var chapterList = document.querySelector('.chapter-list');
  var panels = Array.from(document.querySelectorAll('.scene'));
  var movies = Array.from(document.querySelectorAll('video'));
  var players = [];
  var playButton = document.getElementById('cinema-play');
  var pendingScene = null;
  var pageActive = true;
  var observesVisibility = 'IntersectionObserver' in window;
  var visibility = new WeakMap();
  var exposure = new WeakMap();
  var pausedByUser = new WeakSet();
  var sceneAnimation, storyAnimation;
  var faqAnimations = new Map();
  function lang() { return root.dataset.lang === 'en' ? 'en' : 'zh'; }
  function t(zh, en) { return lang() === 'zh' ? zh : en; }
  function text(element, value) { if (element.textContent !== value) element.textContent = value; }
  function savingData() { return !!(connection && connection.saveData); }
  function allowed() { return userMotion && !reduce.matches && !savingData(); }
  function activeVideo() { return panels[current].querySelector('video'); }
  function playerFor(video) { return players.find(function (player) { return player.video === video; }); }
  function isVisible(video) {
    var panel = video.closest('.scene');
    return pageActive && !document.hidden && (!panel || !panel.hidden)
      && (!observesVisibility || visibility.get(video) === true);
  }
  function canAutoPlay(video) { return allowed() && isVisible(video) && !pausedByUser.has(video); }
  function markPause(video, paused) {
    // A recording reused in another view retains its manual pause preference.
    movies.forEach(function (movie) {
      if (movie.dataset.src === video.dataset.src) { if (paused) pausedByUser.add(movie); else pausedByUser.delete(movie); }
    });
  }
  function userPause(video) { markPause(video, true); playerFor(video).pause(); syncPlayback(); }
  function save() { try { localStorage.setItem('orbit-site-preferences-v3', JSON.stringify({ lang: lang(), motion: userMotion })); } catch (_) {} }
  function pauseAll(except) { players.forEach(function (player) { if (player.video !== except) player.pause(); }); }
  function requestPlayback(video, restart) {
    // Even before the first observer delivery, the last explicit request owns
    // playback. Autoplay cannot replace it while its destination scrolls in.
    pendingScene = { video: video, restart: restart };
    pauseAll(video);
    syncPlayback();
    if (isVisible(video)) playerFor(video).play(restart);
  }
  function enter(element, from, duration, previous, continuous) {
    if (previous && continuous && previous.playState === 'running' && typeof window.getComputedStyle === 'function') {
      var presented = window.getComputedStyle(element);
      from = { opacity: presented.opacity, transform: presented.transform };
    }
    if (previous) previous.cancel();
    if (!allowed() || !pageActive || document.hidden || typeof element.animate !== 'function') return null;
    return element.animate([from, { opacity: 1, transform: 'none' }], { duration: duration, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  function cancelAnimations() {
    if (sceneAnimation) sceneAnimation.cancel();
    if (storyAnimation) storyAnimation.cancel();
    sceneAnimation = storyAnimation = null;
    faqAnimations.forEach(function (animation) { animation.cancel(); });
    faqAnimations.clear();
  }
  function syncPlayback() {
    var video = activeVideo();
    var running = !video.paused && !video.ended;
    var requested = !!(pendingScene && pendingScene.video === video);
    var engaged = running || requested;
    text(document.getElementById('transport-icon'), engaged ? 'Ⅱ' : '▷');
    playButton.setAttribute('aria-label', engaged ? t('暂停当前章节', 'Pause current chapter') : t('播放当前章节', 'Play current chapter'));
    playButton.setAttribute('aria-pressed', String(engaged));
    playButton.setAttribute('aria-controls', video.id);
    document.getElementById('cinema-player').setAttribute('aria-busy', String(requested || (running && video.readyState < 3)));
  }
  function makePlayer(video) {
    video.loop = true;
    var recording = video.closest('.recording');
    var fallback = recording.querySelector('.film-fallback');
    var errorBox = recording.querySelector('.film-error');
    var gate = OrbitCinema.createRequestGate();
    var failed = false, loaded = false;
    function pause() { gate.invalidate(); video.pause(); }
    function translateError() { if (failed) text(errorBox, t('这段视频暂时无法播放。点击播放重试，或切换其他演示。', 'This recording could not load. Try again or choose another chapter.')); }
    function fail(error, ticket) {
      if ((ticket !== undefined && !gate.accepts(ticket)) || (error && error.name === 'AbortError')) return;
      if (error && error.name === 'NotAllowedError') { markPause(video, true); pause(); syncPlayback(); return; }
      markPause(video, true); pause(); failed = true;
      video.hidden = true; fallback.hidden = !!(fallback.complete && fallback.naturalWidth === 0); errorBox.hidden = false;
      translateError(); syncPlayback();
    }
    function play(restart) {
      pendingScene = null; pauseAll(video);
      // Keep the real source lazy, including under Save Data and reduced motion.
      if (!loaded) { video.src = video.dataset.src; loaded = true; video.load(); }
      else if (failed || video.error || video.networkState === 3) video.load();
      if (restart || video.ended) { try { video.currentTime = 0; } catch (_) {} }
      var ticket = gate.begin(), promise;
      try { promise = video.play(); } catch (error) { fail(error, ticket); return; }
      if (promise && promise.catch) promise.catch(function (error) { fail(error, ticket); });
      syncPlayback();
    }
    video.addEventListener('error', function () { if (loaded && video.error) fail(video.error); });
    fallback.addEventListener('error', function () { fallback.hidden = true; });
    video.addEventListener('pause', function () { if (video.paused) gate.invalidate(); syncPlayback(); });
    video.addEventListener('playing', function () {
      if (video.paused || !pageActive || document.hidden) return;
      failed = false; video.hidden = false; fallback.hidden = true; errorBox.hidden = true; syncPlayback();
    });
    video.addEventListener('play', syncPlayback);
    video.addEventListener('ended', syncPlayback);
    ['loadstart', 'loadeddata', 'waiting', 'stalled', 'canplay'].forEach(function (event) { video.addEventListener(event, syncPlayback); });
    return { video: video, play: play, pause: pause, translateError: translateError };
  }
  movies.forEach(function (video) { players.push(makePlayer(video)); });
  function syncStory(animate) {
    var panel = panels[current], story = document.getElementById('scene-story');
    ['headline', 'description', 'meta'].forEach(function (key) { text(document.getElementById('scene-' + key), panel.getAttribute('data-' + key + '-' + lang())); });
    if (animate) storyAnimation = enter(story, { opacity: 0.65, transform: 'translateY(4px)' }, 180, storyAnimation, true);
    else { if (storyAnimation) storyAnimation.cancel(); storyAnimation = null; }
  }
  function revealChapter(tab) {
    var width = chapterList.clientWidth;
    if (!width || chapterList.scrollWidth <= width || typeof chapterList.scrollTo !== 'function') return;
    var currentScroll = chapterList.scrollLeft;
    var left = tab.offsetLeft - 8, right = tab.offsetLeft + tab.offsetWidth + 8;
    var destination = left < currentScroll ? left : right > currentScroll + width ? right - width : currentScroll;
    destination = Math.max(0, Math.min(chapterList.scrollWidth - width, destination));
    // Only the chapter strip moves. Card links retain the page's native anchor
    // scroll, and a newer selection replaces any unfinished horizontal scroll.
    chapterList.scrollTo({ left: destination, behavior: allowed() && Math.abs(destination - currentScroll) > 1 ? 'smooth' : 'auto' });
  }
  function selectScene(index, play) {
    if (!Number.isInteger(index) || index < 0 || index >= panels.length) return;
    var old = current;
    if (panels[old].contains(document.activeElement) && old !== index) tabs[index].focus({ preventScroll: true });
    current = index; pendingScene = null; pauseAll();
    if (sceneAnimation) sceneAnimation.cancel();
    sceneAnimation = null;
    chapterList.style.setProperty('--chapter-index', String(index));
    tabs.forEach(function (tab, i) { tab.classList.toggle('is-active', i === index); tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
    if (play) revealChapter(tabs[index]);
    // Selection is synchronous: no delayed callback can revive an old chapter.
    panels.forEach(function (panel, i) {
      panel.inert = i !== index; panel.hidden = i !== index;
      panel.setAttribute('aria-hidden', String(i !== index));
      panel.classList.toggle('is-visible', i === index);
    });
    var panel = panels[index];
    if (play && index !== old) sceneAnimation = enter(panel, { opacity: 0.72, transform: 'none' }, 180);
    text(document.getElementById('scene-caption'), panel.getAttribute('data-scene-title-' + lang()));
    document.getElementById('cinema-open').href = activeVideo().dataset.src;
    syncStory(play && index !== old); syncPlayback();
    if (play) {
      var requested = activeVideo(); markPause(requested, false); requestPlayback(requested, true);
    }
  }
  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { selectScene(index, true); });
    tab.addEventListener('keydown', function (event) {
      if (event.altKey || event.metaKey || event.ctrlKey) return;
      var next = OrbitCinema.nextIndex(index, event.key, tabs.length, chapterList.getAttribute('aria-orientation') || 'horizontal');
      if (next === null) return;
      event.preventDefault();
      tabs.forEach(function (button, i) { button.tabIndex = i === next ? 0 : -1; });
      tabs[next].focus();
    });
  });
  function toggle(video) {
    var requested = pendingScene && pendingScene.video === video;
    pendingScene = null;
    if (requested || (!video.paused && !video.ended)) userPause(video);
    else { markPause(video, false); requestPlayback(video, false); }
  }
  playButton.addEventListener('click', function () { toggle(activeVideo()); });
  function sceneIndex(name) { return panels.findIndex(function (panel) { return panel.id === 'scene-' + name; }); }
  document.getElementById('editor-jump').addEventListener('click', function () { selectScene(sceneIndex('editor'), true); });
  document.querySelectorAll('[data-show-scene]').forEach(function (link) { link.addEventListener('click', function () { selectScene(sceneIndex(link.dataset.showScene), true); }); });
  document.querySelectorAll('.faq-list details').forEach(function (details) {
    var answer = details.querySelector('.faq-answer');
    if (!answer) return;
    details.addEventListener('toggle', function () {
      var previous = faqAnimations.get(details);
      if (previous) previous.cancel();
      faqAnimations.delete(details);
      if (!details.open) return;
      // Native details owns layout, focus and open state. This only reveals the
      // answer; closing never waits for an animation or a height measurement.
      var animation = enter(answer, { opacity: 0.7, transform: 'translateY(-3px)' }, 160);
      if (animation) {
        faqAnimations.set(details, animation);
        animation.onfinish = function () { if (faqAnimations.get(details) === animation) faqAnimations.delete(details); };
      }
    });
  });
  function reconcilePlayback() {
    if (!pageActive || document.hidden) { pauseAll(); return; }
    if (pendingScene) {
      if (isVisible(pendingScene.video)) playerFor(pendingScene.video).play(pendingScene.restart);
      return;
    }
    var active = activeVideo();
    // Manual playback keeps ownership while the selected chapter is visible.
    if (!active.paused && isVisible(active)) return;
    if (exposure.get(active) >= 0.6 && canAutoPlay(active)) playerFor(active).play(false);
  }
  function syncPreferences() {
    root.lang = lang() === 'zh' ? 'zh-CN' : 'en';
    document.title = t('Orbit · 下一步，顺手就到。', 'Orbit · Your next move. Just a flick away.');
    document.querySelectorAll('[data-label-zh]').forEach(function (el) { el.setAttribute('aria-label', el.getAttribute('data-label-' + lang())); });
    document.querySelectorAll('[data-alt-zh]').forEach(function (el) { el.alt = el.getAttribute('data-alt-' + lang()); });
    var languageButton = document.getElementById('language-toggle'); text(languageButton, lang() === 'zh' ? 'EN' : '中'); languageButton.setAttribute('aria-label', lang() === 'zh' ? 'Switch to English' : '切换为中文');
    var motion = allowed(); root.dataset.motion = motion ? 'on' : 'off';
    var motionButton = document.getElementById('motion-toggle'); motionButton.disabled = reduce.matches || savingData();
    motionButton.setAttribute('aria-pressed', String(motion)); text(document.getElementById('motion-label'), reduce.matches ? t('跟随系统：减少动态效果', 'System: reduced motion') : savingData() ? t('节省流量：动效暂停', 'Data Saver: motion paused') : motion ? t('动效开启', 'Motion on') : t('动效关闭', 'Motion off'));
    if (previousMotion !== motion && !motion) {
      pendingScene = null; pauseAll();
      cancelAnimations();
    }
    var resume = previousMotion === false && motion;
    previousMotion = motion;
    text(document.getElementById('scene-caption'), panels[current].getAttribute('data-scene-title-' + lang()));
    syncStory(false); players.forEach(function (player) { player.translateError(); }); syncPlayback();
    if (resume) reconcilePlayback();
    if (typeof CustomEvent === 'function') document.dispatchEvent(new CustomEvent('orbit:preferenceschange'));
  }
  document.getElementById('language-toggle').addEventListener('click', function () { root.dataset.lang = lang() === 'zh' ? 'en' : 'zh'; syncPreferences(); save(); });
  document.getElementById('motion-toggle').addEventListener('click', function () { userMotion = !userMotion; syncPreferences(); save(); });
  reduce.addEventListener('change', syncPreferences);
  if (connection && typeof connection.addEventListener === 'function') connection.addEventListener('change', function () {
    if (savingData()) { pendingScene = null; pauseAll(); cancelAnimations(); }
    syncPreferences();
  });
  document.addEventListener('visibilitychange', function () { if (document.hidden) { pendingScene = null; pauseAll(); cancelAnimations(); syncPlayback(); } else reconcilePlayback(); });
  window.addEventListener('pagehide', function () { pageActive = false; pendingScene = null; pauseAll(); cancelAnimations(); syncPlayback(); });
  window.addEventListener('pageshow', function () { pageActive = true; reconcilePlayback(); });
  if (observesVisibility) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var video = entry.target.querySelector('video') || entry.target;
        var visible = entry.isIntersecting && entry.intersectionRatio > 0;
        visibility.set(video, visible); exposure.set(video, entry.intersectionRatio);
        if (!visible) playerFor(video).pause();
      });
      // Decide once per observer batch; entering records cannot fight for play().
      reconcilePlayback();
    }, { threshold: [0, 0.05, 0.6] });
    movies.forEach(function (video) { observer.observe(video.closest('.recording')); });
  }
  window.OrbitSiteMedia = { preferences: { reducedMotion: reduce } };
  selectScene(0, false); syncPreferences();
})();
