/**
 * CCUS Compass — Shared Navigation + Theme Manager
 * Include in <head>. Applies theme immediately (no FOUC),
 * injects nav bar after DOMContentLoaded, syncs theme across iframes.
 */
(function () {
  'use strict';

  var THEME_KEY = 'ccus-theme';

  function getTheme() {
    return localStorage.getItem(THEME_KEY) || 'dark';
  }

  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem(THEME_KEY, t);
  }

  // Apply saved theme immediately — prevents flash of wrong theme
  applyTheme(getTheme());

  // Sync theme from parent/sibling frames
  window.addEventListener('message', function (e) {
    if (e.data && e.data.type === 'ccus-theme') {
      applyTheme(e.data.theme);
      updateIcon(e.data.theme);
    }
  });

  function broadcastTheme(t) {
    document.querySelectorAll('iframe').forEach(function (f) {
      try { f.contentWindow.postMessage({ type: 'ccus-theme', theme: t }, '*'); } catch (ex) {}
    });
    if (window.self !== window.top) {
      try { window.parent.postMessage({ type: 'ccus-theme', theme: t }, '*'); } catch (ex) {}
    }
  }

  function updateIcon(t) {
    var btn = document.getElementById('ccus-theme-btn');
    if (btn) btn.textContent = t === 'dark' ? '☀' : '🌙';
    if (btn) btn.title = t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
  }

  document.addEventListener('DOMContentLoaded', function () {
    var inIframe = window.self !== window.top;
    var path = window.location.pathname;
    var isIndex   = /index\.html$|\/\s*$/.test(path);
    var isRegHub  = /regulatory\.html$/.test(path);
    var isSubPage = /us-regulatory\.html$|canada-regulatory\.html$|aer-d065\.html$/.test(path);

    // ── Inject styles ──
    var style = document.createElement('style');
    style.textContent = [
      '#ccus-nav{',
        'position:sticky;top:0;z-index:9999;',
        'height:44px;min-height:44px;flex-shrink:0;',
        'display:flex;align-items:center;padding:0 16px;gap:10px;',
        'font-family:"JetBrains Mono","Segoe UI",monospace;',
        'background:#070f0a;border-bottom:1px solid #1a2e1f;',
        'transition:background .2s,border-color .2s;',
      '}',
      inIframe ? '#ccus-nav{display:none!important;}' : '',

      'html[data-theme="light"] #ccus-nav{background:#f5f1e8;border-bottom-color:#c8b89a;}',

      '.cn-logo{display:flex;align-items:center;gap:8px;text-decoration:none;',
        'color:#7ddfb0;font-weight:700;font-size:.84em;flex-shrink:0;}',
      'html[data-theme="light"] .cn-logo{color:#2d6b4a;}',

      '.cn-icon{width:26px;height:26px;border-radius:5px;flex-shrink:0;',
        'background:linear-gradient(135deg,#1a4a2e,#2d6b4a);',
        'display:flex;align-items:center;justify-content:center;font-size:13px;color:#7ddfb0;}',

      '.cn-sep{width:1px;height:18px;background:#1a2e1f;flex-shrink:0;}',
      'html[data-theme="light"] .cn-sep{background:#c8b89a;}',

      '.cn-page{font-size:.74em;color:#4a6a58;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}',
      'html[data-theme="light"] .cn-page{color:#7a6a50;}',

      '.cn-actions{display:flex;align-items:center;gap:6px;margin-left:auto;flex-shrink:0;}',

      '.cn-btn{display:inline-flex;align-items:center;gap:4px;',
        'padding:4px 9px;border-radius:6px;',
        'border:1px solid #1a2e1f;background:transparent;',
        'color:#4a6a58;font-family:inherit;font-size:.75em;font-weight:600;',
        'cursor:pointer;text-decoration:none;transition:color .15s,border-color .15s;white-space:nowrap;}',
      '.cn-btn:hover{color:#7ddfb0;border-color:#2d6b4a;}',
      'html[data-theme="light"] .cn-btn{border-color:#c8b89a;color:#7a6a50;}',
      'html[data-theme="light"] .cn-btn:hover{color:#2d6b4a;border-color:#2d6b4a;}',

      /* Theme toggle — icon only, slightly larger */
      '#ccus-theme-btn{font-size:1em;padding:4px 8px;min-width:32px;justify-content:center;}',
    ].join('');
    document.head.appendChild(style);

    // ── Build nav ──
    var nav = document.createElement('div');
    nav.id = 'ccus-nav';

    var pageLabel = (document.title || '').split('—')[0].replace('CCUS Compass','').replace('SubsurfaceAI','').trim();

    var backHTML = '';
    if (isSubPage) {
      backHTML = '<a class="cn-btn" href="regulatory.html" target="_top">← Reg Hub</a>';
    } else if (isRegHub) {
      backHTML = '<a class="cn-btn" href="index.html">← Compass</a>';
    }

    nav.innerHTML =
      '<a class="cn-logo" href="index.html" ' + (isSubPage ? 'target="_top"' : '') + '>' +
        '<div class="cn-icon">⬡</div>CCUS Compass' +
      '</a>' +
      (pageLabel ? '<div class="cn-sep"></div><span class="cn-page">' + pageLabel + '</span>' : '') +
      '<div class="cn-actions">' +
        backHTML +
        '<button class="cn-btn" id="ccus-theme-btn" title="Toggle theme"></button>' +
      '</div>';

    document.body.insertBefore(nav, document.body.firstChild);

    updateIcon(getTheme());

    document.getElementById('ccus-theme-btn').addEventListener('click', function () {
      var next = getTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      updateIcon(next);
      broadcastTheme(next);
    });

    // Hide page-level floating toggle buttons inside iframes
    if (inIframe) {
      ['#themeToggle', '.theme-toggle', '#theme-toggle'].forEach(function (sel) {
        var el = document.querySelector(sel);
        if (el) el.style.display = 'none';
      });
    }
  });
})();
