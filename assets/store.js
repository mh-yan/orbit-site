(function () {
  'use strict';
  // Only release metadata belongs here. License keys and customer data do not.
  function secureURL(value) {
    try {
      var url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
    } catch (_) { return null; }
  }
  function downloadInfo(value) {
    if (!value || typeof value !== 'object') return null;
    var url = secureURL(value.url);
    if (!url || !/\.(zip|dmg)$/i.test(new URL(url).pathname)
      || !/^\d+\.\d+\.\d+$/.test(value.version || '')
      || !['arm64', 'x86_64', 'universal'].includes(value.architecture)
      || !Number.isSafeInteger(value.bytes) || value.bytes < 1
      || !/^[0-9a-f]{64}$/i.test(value.sha256 || '')
      || !/^\d+(\.\d+){0,2}$/.test(value.minimumMacOS || '')) return null;
    return { url: url, version: value.version, architecture: value.architecture,
      bytes: value.bytes, sha256: value.sha256.toLowerCase(), minimumMacOS: value.minimumMacOS };
  }
  function purchaseInfo(value) {
    if (!value || typeof value !== 'object') return null;
    var url = secureURL(value.url);
    var wechat = typeof value.wechat === 'string' && /^[A-Za-z][A-Za-z0-9_-]{5,19}$/.test(value.wechat) ? value.wechat : null;
    var email = typeof value.email === 'string' && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(value.email) ? value.email : null;
    return url || wechat || email ? { url: url, wechat: wechat, email: email } : null;
  }
  if (typeof module === 'object' && module.exports) module.exports = { downloadInfo: downloadInfo, purchaseInfo: purchaseInfo };
  if (typeof document === 'undefined') return;

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var connection = navigator.connection;
  var userMotion = true, config = null, copied = false;
  try { userMotion = JSON.parse(localStorage.getItem('orbit-site-preferences-v3') || '{}').motion !== false; } catch (_) {}
  function en() { return root.dataset.lang === 'en'; }
  function t(zh, english) { return en() ? english : zh; }
  function save() { try { localStorage.setItem('orbit-site-preferences-v3', JSON.stringify({ lang: en() ? 'en' : 'zh', motion: userMotion })); } catch (_) {} }
  function status(id, zh, english) { var element = document.getElementById(id); if (element) element.textContent = t(zh, english); }
  function syncRelease() {
    var download = config && downloadInfo(config.download);
    var purchase = config && purchaseInfo(config.purchase);
    var link = document.getElementById('download-link');
    if (link && download) {
      link.href = download.url; link.hidden = false;
      document.getElementById('download-pending').hidden = true;
      var arch = { arm64: t('Apple 芯片', 'Apple silicon'), x86_64: 'Intel', universal: t('Apple 芯片与 Intel 通用', 'Apple silicon & Intel') }[download.architecture];
      status('download-status', '下载完成后，将 Orbit 放入「应用程序」。', 'After downloading, move Orbit to Applications.');
      var meta = document.getElementById('release-meta');
      meta.textContent = 'v' + download.version + ' · ' + arch + ' · macOS ' + download.minimumMacOS + '+ · ' + (download.bytes / 1048576).toFixed(1) + ' MB';
      meta.hidden = false;
      document.getElementById('release-sha').textContent = download.sha256;
      document.getElementById('release-hash').hidden = false;
    }
    var buyLink = document.getElementById('purchase-link');
    // A contact alone must never open sales before an actual release exists.
    if (!buyLink || !purchase || !download) return;
    document.getElementById('purchase-pending').hidden = true;
    if (purchase.url || purchase.email) {
      buyLink.href = purchase.url || 'mailto:' + encodeURIComponent(purchase.email) + '?subject=Orbit%20%E6%B0%B8%E4%B9%85%E6%BF%80%E6%B4%BB';
      buyLink.hidden = false;
      if (purchase.url) { buyLink.target = '_blank'; buyLink.rel = 'noopener noreferrer'; }
    }
    status('purchase-status', '购买后，由开发者发送 CDK 激活码。', 'After purchase, the developer sends your CDK.');
    if (purchase.wechat) {
      document.getElementById('purchase-contact').hidden = false;
      status('contact-label', '微信：' + purchase.wechat, 'WeChat: ' + purchase.wechat);
      status('copy-contact', '复制微信号', 'Copy WeChat ID');
    }
    if (copied) status('copy-feedback', '已复制微信号', 'WeChat ID copied');
  }
  function syncPreferences() {
    root.lang = en() ? 'en' : 'zh-CN';
    document.title = document.body.getAttribute('data-title-' + (en() ? 'en' : 'zh'));
    document.querySelectorAll('[data-label-zh]').forEach(function (element) { element.setAttribute('aria-label', element.getAttribute('data-label-' + (en() ? 'en' : 'zh'))); });
    document.querySelectorAll('[data-alt-zh]').forEach(function (element) { element.alt = element.getAttribute('data-alt-' + (en() ? 'en' : 'zh')); });
    var language = document.getElementById('language-toggle');
    language.textContent = en() ? '中' : 'EN';
    language.setAttribute('aria-label', en() ? '切换为中文' : 'Switch to English');
    var constrained = reduce.matches || !!(connection && connection.saveData);
    var motion = userMotion && !constrained;
    root.dataset.motion = motion ? 'on' : 'off';
    var button = document.getElementById('motion-toggle');
    button.disabled = constrained;
    button.setAttribute('aria-pressed', String(motion));
    status('motion-label', reduce.matches ? '跟随系统：减少动态效果' : constrained ? '节省流量：动效暂停' : motion ? '动效开启' : '动效关闭', reduce.matches ? 'System: reduced motion' : constrained ? 'Data Saver: motion paused' : motion ? 'Motion on' : 'Motion off');
    syncRelease();
    document.dispatchEvent(new CustomEvent('orbit:preferenceschange'));
  }
  document.getElementById('language-toggle').addEventListener('click', function () { root.dataset.lang = en() ? 'zh' : 'en'; syncPreferences(); save(); });
  document.getElementById('motion-toggle').addEventListener('click', function () { userMotion = !userMotion; syncPreferences(); save(); });
  reduce.addEventListener('change', syncPreferences);
  if (connection && connection.addEventListener) connection.addEventListener('change', syncPreferences);
  var copy = document.getElementById('copy-contact');
  if (copy) copy.addEventListener('click', async function () {
    var purchase = config && purchaseInfo(config.purchase);
    if (!purchase || !purchase.wechat) return;
    var feedback = document.getElementById('copy-feedback');
    feedback.hidden = false;
    try {
      await navigator.clipboard.writeText(purchase.wechat);
      copied = true; status('copy-feedback', '已复制微信号', 'WeChat ID copied');
    } catch (_) {
      copied = false; status('copy-feedback', '未能复制，请选中上方微信号手动复制。', 'Could not copy. Select the WeChat ID above and copy it manually.');
    }
  });
  syncPreferences();
  // Default HTML describes the unavailable state. A failed request can never
  // expose a stale private release or a speculative checkout destination.
  var abort = new AbortController();
  var timeout = window.setTimeout(function () { abort.abort(); }, 8000);
  fetch('assets/release.json', { cache: 'no-store', signal: abort.signal })
    .then(function (response) { if (!response.ok) throw new Error('Release metadata unavailable'); return response.json(); })
    .then(function (value) { if (value && value.schemaVersion === 1) { config = value; syncRelease(); } })
    .catch(function () {})
    .finally(function () { window.clearTimeout(timeout); });
})();
