/* Bahniman Talukdar, v4: page behaviour.
   Smooth wheel scrolling (Lenis), section links with history, the header that turns
   solid and follows the day into night, the floating clock that tells the time of
   day on the page, reveal on scroll, counting figures, case study tabs, FAQs,
   the spec checklist, the menu and the copy-email button. */
(function () {
  'use strict';
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var topBar = document.getElementById('top');
  var floatBtn = document.getElementById('float');
  var ring = document.getElementById('ring');
  var clock = document.getElementById('clock');
  var floatSec = document.getElementById('floatSec');
  var hero = document.getElementById('hero');

  /* ---- smooth wheel scrolling; the loop sleeps when the page is still ---- */
  var lenis = null, loopOn = false, idle = 0, lastFrame = 0, scrollTime = 0;
  function loop(t) {
    if (!lenis) { loopOn = false; return; }
    if (lastFrame) scrollTime += Math.min(64, Math.max(0, t - lastFrame));
    lastFrame = t;
    lenis.raf(scrollTime);
    if (lenis.isScrolling) idle = 0; else idle++;
    if (idle < 3) requestAnimationFrame(loop); else { loopOn = false; lastFrame = 0; }
  }
  function wake() { if (!loopOn && lenis) { loopOn = true; idle = 0; requestAnimationFrame(loop); } }
  if (!reduce && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.075, smoothWheel: true, syncTouch: false, autoRaf: false, anchors: false });
    lenis.on('virtual-scroll', wake);
  }

  /* land a section's heading just under the header, skipping its top padding */
  function goTo(target, immediate) {
    var y = 0;
    if (target && target !== 0) {
      var pad = parseFloat(getComputedStyle(target).paddingTop) || 0;
      var bar = topBar ? topBar.offsetHeight : 64;
      y = target.getBoundingClientRect().top + window.scrollY + Math.min(pad, 200) - bar - 24;
    }
    if (lenis) {
      lenis.resize();
      lenis.scrollTo(Math.max(0, y), { duration: 1.2, lerp: 0, easing: function (t) { return 1 - Math.pow(1 - t, 3); }, immediate: !!immediate });
      wake();
    } else window.scrollTo({ top: Math.max(0, y), behavior: reduce || immediate ? 'auto' : 'smooth' });
  }
  function visit(id, push) {
    var el = id && id !== '#hero' && id !== '#main' ? document.getElementById(id.slice(1)) : null;
    if (id && id !== '#hero' && id !== '#main' && !el) return;
    if (push) {
      var url = location.pathname + location.search + (el ? id : '');
      if (location.pathname + location.search + location.hash !== url) history.pushState(null, '', url);
    }
    var focus = el || document.querySelector('.name');
    if (focus) { if (el && !el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1'); focus.focus({ preventScroll: true }); }
    goTo(el || 0);
  }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  document.querySelectorAll('a[data-go]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      setMenu(false);
      visit(a.getAttribute('href'), true);
    });
  });
  if (floatBtn) floatBtn.addEventListener('click', function () { visit('#hero', true); });
  window.addEventListener('popstate', function () { visit(location.hash, false); });
  window.addEventListener('load', function () { if (location.hash && location.hash.length > 1) visit(location.hash, false); });

  /* ---- load-in for the opening lines ---- */
  function start() { document.body.classList.add('loaded'); }
  if (document.fonts && document.fonts.ready) {
    Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 900); })]).then(start);
  } else start();

  /* ---- reveal on scroll ---- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  /* ---- figures count up the first time they are seen ---- */
  function countUp(el) {
    var txt = el.textContent.trim(), m = txt.match(/^([\d,]+)(.*)$/);
    if (!m) return;
    var end = parseInt(m[1].replace(/,/g, ''), 10), suffix = m[2], comma = m[1].indexOf(',') > -1, t0 = 0;
    var fmt = function (n) { return comma ? n.toLocaleString('en-US') : String(n); };
    el.setAttribute('aria-label', txt);
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(Math.round(end * e)) + suffix;
      if (p < 1) requestAnimationFrame(step); else el.textContent = txt;
    }
    requestAnimationFrame(step);
  }
  var counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && !reduce) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---- the time of day on the page: same stops as the scene's colour grade ---- */
  var STOPS = [330, 570, 810, 1080, 1290];   // minutes after midnight at tod 0..4
  function clockText(tod) {
    var k = Math.min(4, Math.max(0, tod)), i = Math.min(3, Math.floor(k)), f = k - i;
    var m = Math.round((STOPS[i] + (STOPS[i + 1] - STOPS[i]) * f) / 5) * 5;
    var h = Math.floor(m / 60) % 24, mm = m % 60, ap = h < 12 ? 'am' : 'pm', h12 = h % 12 || 12;
    return h12 + ':' + (mm < 10 ? '0' : '') + mm + ' ' + ap;
  }
  var marks = [];
  function measure() {
    marks = [];
    document.querySelectorAll('[data-scene]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      marks.push({ el: el, top: r.top + window.scrollY, h: Math.max(1, r.height), tod: parseFloat(el.getAttribute('data-tod')) || 0, scene: el.getAttribute('data-scene') });
    });
  }
  function sceneAt(y) {
    var s = marks.length ? marks[0].scene : '';
    for (var i = 0; i < marks.length; i++) if (marks[i].top <= y) s = marks[i].scene;
    return s;
  }
  function todAt(y) {
    var idx = 0;
    for (var i = 0; i < marks.length; i++) if (marks[i].top <= y) idx = i;
    var m = marks[idx], nx = marks[idx + 1];
    if (!m) return 0;
    if (y < m.top) return m.tod;
    var f = Math.min(1, Math.max(0, (y - m.top) / m.h));
    return reduce || !nx ? m.tod : m.tod + (nx.tod - m.tod) * f;
  }

  /* ---- active section, header, floating clock: one batched scroll handler ---- */
  var navLinks = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  var LABELS = { hero: 'Top', glance: 'In short', play: 'Play', path: 'Throughline', work: 'Work', studies: 'Cases', lab: 'Lab', record: 'Record', ask: 'Ask', contact: 'Contact' };
  var allSecs = Object.keys(LABELS).map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var lastClock = '', lastSec = null, lastTone = '', lastScene = '', lastSplit = null;
  var paneCap = document.getElementById('paneCap');
  var PLACES = {
    tea: 'A tea estate in the morning mist, Assam',
    bridge: 'Bogibeel Bridge, Assam. Civil engineering came first.',
    rootbridge: 'A living root bridge, Meghalaya. Core HRMS was the part every other module depends on.',
    majuli: 'The Brahmaputra around Majuli. In case study 01, the path data showed where people stopped short.',
    bamboo: 'Bamboo shaped by hand, Assam. Each Lab prototype has a working demo you can try.',
    river: 'Sunset on the Brahmaputra',
    night: 'A tea garden after dark, Assam'
  };
  var ticking = false;
  function update() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    var heroEnd = hero ? hero.offsetTop + hero.offsetHeight * 0.6 : 400;
    var mark = y + vh * 0.35;
    var cur = null;
    allSecs.forEach(function (s) { if (s.offsetTop <= mark) cur = s; });
    var p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    var tone = cur && cur.classList.contains('night') ? 'night' : 'day';
    var c = clockText(todAt(y + vh * 0.25));
    var sc = sceneAt(y + vh * 0.5);
    var split = window.innerWidth >= 1100 && hero && y > hero.offsetHeight * 0.55;
    /* writes */
    topBar.classList.toggle('solid', y > 24);
    if (split !== lastSplit) { root.classList.toggle('split', split); lastSplit = split; }
    if (paneCap && sc !== lastScene) { paneCap.textContent = PLACES[sc] || ''; lastScene = sc; }
    if (tone !== lastTone) { root.setAttribute('data-tone', tone); lastTone = tone; }
    if (floatBtn) floatBtn.classList.toggle('show', y > heroEnd);
    if (ring) ring.style.strokeDashoffset = String(100 - p * 100);
    if (clock && c !== lastClock) { clock.textContent = c; lastClock = c; }
    if (cur !== lastSec) {
      lastSec = cur;
      if (floatSec) floatSec.textContent = cur ? LABELS[cur.id] : 'Top';
      navLinks.forEach(function (a) {
        var on = cur && a.getAttribute('href') === '#' + cur.id;
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }
  }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { measure(); onScroll(); }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(function () { measure(); onScroll(); }).observe(document.querySelector('main'));
  /* each section's stamp is the clock's reading as the section arrives */
  document.querySelectorAll('[data-tod] .hour').forEach(function (h) {
    h.textContent = clockText(parseFloat(h.closest('[data-tod]').getAttribute('data-tod')) || 0);
  });
  measure(); update();

  /* ---- case studies: one at a time, as tabs ---- */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.case-tabs [role="tab"]'));
  if (tabs.length) {
    var show = function (i, focus) {
      tabs.forEach(function (t, k) {
        var on = k === i, panel = document.getElementById(t.getAttribute('aria-controls'));
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        if (panel) { panel.hidden = !on; if (on) { panel.classList.remove('swap'); void panel.offsetWidth; panel.classList.add('swap'); } }
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach(function (t, i) { t.addEventListener('click', function () { show(i); }); });
    document.querySelector('.case-tabs').addEventListener('keydown', function (e) {
      var i = tabs.indexOf(document.activeElement); if (i < 0) return;
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
      if (n === null) return;
      e.preventDefault(); show((n + tabs.length) % tabs.length, true);
    });
    show(0);
  }

  /* ---- FAQ: say what the toggle does ---- */
  document.querySelectorAll('details.ask').forEach(function (d) {
    var label = function () { d.querySelector('summary').setAttribute('aria-label', (d.open ? 'Hide answer: ' : 'Show answer: ') + d.querySelector('summary b').textContent); };
    d.addEventListener('toggle', label); label();
  });

  /* ---- spec checklist ---- */
  var specBtns = document.querySelectorAll('.spec-list button');
  var specBar = document.getElementById('specBar');
  var specStatus = document.getElementById('specStatus');
  function specUpdate() {
    var n = document.querySelectorAll('.spec-list button[aria-pressed="true"]').length, all = specBtns.length;
    if (specBar) specBar.style.transform = 'scaleX(' + (n / all) + ')';
    if (specStatus) {
      specStatus.textContent = n === all ? 'All eight answered · ready for engineering' : 'Tick each one off · ' + n + ' of ' + all;
      specStatus.classList.toggle('done', n === all);
    }
  }
  specBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
      specUpdate();
    });
  });

  /* ---- menu on small screens ---- */
  var menuBtn = document.getElementById('menuBtn'), menu = document.getElementById('menu');
  function setMenu(open) {
    if (!menu || !menuBtn) return;
    if (menu.hidden === !open) return;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuBtn.querySelector('.menu-txt').textContent = open ? 'Close' : 'Menu';
    if (open) { var f = menu.querySelector('a'); if (f) f.focus(); }
  }
  if (menuBtn && menu) {
    menuBtn.addEventListener('click', function (e) { e.stopPropagation(); setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) { e.stopPropagation(); });
    document.addEventListener('click', function () { setMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
  }

  /* ---- copy email ---- */
  var copyBtn = document.getElementById('copy'), copied = document.getElementById('copied');
  if (copyBtn && copied) copyBtn.addEventListener('click', function () {
    var addr = 'bahniman30@gmail.com';
    var done = function () {
      copied.textContent = 'Copied';
      clearTimeout(copyBtn._t);
      copyBtn._t = setTimeout(function () { copied.textContent = ''; }, 2200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(addr).then(done, function () { copied.textContent = 'Select and copy the address'; });
    } else { copied.textContent = 'Select and copy the address'; }
  });

  window.v4ui = { goTo: goTo };
})();
