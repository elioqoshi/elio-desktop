(function () {
  'use strict';
  // the page is drawn at 1x and zoomed 2x (1x on phones, see styles.css); pointer math divides by it
  var Z = 2;
  (function () {
    var mq = window.matchMedia('(max-width: 760px)');
    function setZ() { Z = mq.matches ? 1 : 2; }
    setZ(); if (mq.addEventListener) mq.addEventListener('change', setZ);
  })();
  var root = document.getElementById('root98');
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('elio98:' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('elio98:' + k, JSON.stringify(v)); } catch (e) {} }
  };
  function q(sel, ctx) { return (ctx || document).querySelector(sel); }
  function phone() { return window.matchMedia('(max-width: 760px)').matches; }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(v, Math.max(lo, hi))); }
  function qa(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  /* ---------- theme ---------- */
  var savedTheme = store.get('theme');
  function systemDark() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function setDark(on) {
    root.classList.toggle('dark', on);
    q('#dark-btn').setAttribute('aria-pressed', on ? 'true' : 'false');
    q('#dark-btn').title = on ? 'lights on' : 'lights off';
  }
  setDark(savedTheme === null ? systemDark() : savedTheme === 'dark');
  q('#dark-btn').addEventListener('click', function () {
    var on = !root.classList.contains('dark'); setDark(on); store.set('theme', on ? 'dark' : 'light');
  });
  new MutationObserver(function () { if (store.get('theme') === null) setDark(systemDark()); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ---------- windows ---------- */
  var W = {
    about: { open: true, x: 170, y: 18, z: 2, w: 290 },
    portrait: { open: true, x: 430, y: 46, z: 3, w: 170 },
    talks: { w: 340 }, photo: { w: 320 }, clock: { w: 392 }, contact: { w: 270 }, radio: { w: 280 }, imprint: { w: 300 }
  };
  Object.keys(W).forEach(function (k) { var s = W[k]; if (s.open === undefined) { s.open = false; s.x = 0; s.y = 0; s.z = 0; } });
  function winEl(k) { return q('[data-win="' + k + '"]'); }
  function topZ() { return Math.max.apply(null, Object.keys(W).map(function (k) { return W[k].z || 0; })); }
  function apply(k) { var s = W[k], e = winEl(k); e.hidden = !s.open; e.style.left = s.x + 'px'; e.style.top = s.y + 'px'; e.style.zIndex = s.z; }
  var busy = 0, pending = {};
  // while busy the hourglass cursor turns, one frame every 100ms like SerenityOS's
  var waitTimer = 0, waitFrame = 0;
  function setBusy(d) {
    busy = Math.max(0, busy + d); root.classList.toggle('busy', busy > 0);
    if (busy && !waitTimer) { root.setAttribute('data-wf', waitFrame = 0); waitTimer = setInterval(function () { root.setAttribute('data-wf', waitFrame = (waitFrame + 1) % 14); }, 100); }
    else if (!busy && waitTimer) { clearInterval(waitTimer); waitTimer = 0; }
  }
  function focusWin(k) { if (W[k].z < topZ()) { W[k].z = topZ() + 1; apply(k); } }
  function openWin(k) {
    if (W[k].open) { focusWin(k); return; }
    if (pending[k]) return;
    pending[k] = true; setBusy(1);
    setTimeout(function () { pending[k] = false; reallyOpen(k); setBusy(-1); }, 1000);
  }
  function reallyOpen(k) {
    var s = W[k], e = winEl(k), desk = q('.desk-area'), body = q('.window-body', e);
    s.open = true; s.z = topZ() + 1; s.x = 0; s.y = 0; body.style.maxHeight = ''; body.style.overflow = ''; apply(k);
    if (k === 'talks') renderTalk();
    if (k === 'clock') { cal = berlinDay(new Date()); renderCal(); tick(); }
    if (k.indexOf('f:') === 0) renderFolder(k.slice(2));
    var dw = desk.clientWidth, dh = desk.clientHeight, h = e.offsetHeight;
    var over = h - (dh - 16);
    if (over > 0 && e.classList.contains('sized')) { e.style.height = Math.max(80, e.offsetHeight - 6 - over) + 'px'; h = e.offsetHeight; }
    else if (over > 0) {
      body.style.maxHeight = Math.max(60, body.offsetHeight - over) + 'px'; body.style.overflow = 'auto'; h = e.offsetHeight;
    }
    var minX = phone() ? Math.max(0, Math.min(8, dw - e.offsetWidth)) : 168, maxX = Math.max(minX, dw - e.offsetWidth - 8), maxY = Math.max(8, dh - h - 8);
    var minY = phone() ? Math.min(iconsBottom() + 8, maxY) : 8;
    s.x = Math.round(minX + Math.random() * (maxX - minX));
    s.y = Math.round(minY + Math.random() * (maxY - minY));
    apply(k);
  }
  // the lowest edge of the icons along the top of a phone's desk
  function iconsBottom() {
    var b = 0;
    qa('#icons .dicon').forEach(function (d) { if (d.style.top !== 'auto') b = Math.max(b, d.offsetTop + d.offsetHeight); });
    return b;
  }
  // keep every open window on the desk when the screen changes size or turns
  function keepOnDesk(k) {
    var s = W[k], e = winEl(k), desk = q('.desk-area');
    if (!s.open || s.max) return;
    s.x = clamp(s.x, 0, desk.clientWidth - e.offsetWidth); s.y = clamp(s.y, 0, desk.clientHeight - 20); apply(k);
  }
  // maximize fills the desk; the old spot and size come back on restore
  function maximize(k, on) {
    var s = W[k], e = winEl(k), desk = q('.desk-area'), body = q('.window-body', e);
    if (on === !!s.max) return;
    if (on) {
      s.max = { x: s.x, y: s.y, width: e.style.width, height: e.style.height, sized: e.classList.contains('sized'), mh: body.style.maxHeight, ov: body.style.overflow };
      s.x = 0; s.y = 0; body.style.maxHeight = ''; body.style.overflow = '';
      e.classList.add('max'); fitMax(k);
    } else {
      s.x = s.max.x; s.y = s.max.y; e.style.width = s.max.width; e.style.height = s.max.height; e.classList.toggle('sized', s.max.sized);
      body.style.maxHeight = s.max.mh; body.style.overflow = s.max.ov;
      e.classList.remove('max'); s.max = null;
    }
    focusWin(k); apply(k);
  }
  function fitMax(k) {
    var e = winEl(k), desk = q('.desk-area');
    // .window has 3px padding on each side around its content box
    e.style.width = (desk.clientWidth - 6) + 'px'; e.style.height = (desk.clientHeight - 6) + 'px';
  }
  window.addEventListener('resize', function () { Object.keys(W).forEach(function (k) { if (W[k].max) fitMax(k); else keepOnDesk(k); }); });
  function closeWin(k) {
    if (W[k].max) maximize(k, false);
    W[k].open = false; apply(k);
    if (k === 'talks') ytSend('pauseVideo');
    if (k === 'radio') radioPause();
  }
  // folder windows are added later, so setup is a function they can call too
  function setupWin(k) {
    var e = winEl(k); apply(k);
    e.addEventListener('pointerdown', function () { focusWin(k); });
    q('.title-bar-controls button', e).addEventListener('click', function () { closeWin(k); });
    var bar = q('.title-bar', e), drag = null;
    bar.style.touchAction = 'none';
    bar.addEventListener('dblclick', function (ev) { if (!ev.target.closest('button')) maximize(k, !W[k].max); });
    bar.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0 || ev.target.closest('button') || W[k].max) return;
      drag = { sx: ev.clientX, sy: ev.clientY, ox: W[k].x, oy: W[k].y };
      try { bar.setPointerCapture(ev.pointerId); } catch (err) {}
    });
    bar.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      // keep at least part of the title bar on the desk so the window can always be grabbed again
      var desk = q('.desk-area');
      W[k].x = clamp(Math.round(drag.ox + (ev.clientX - drag.sx) / Z), 0, desk.clientWidth - 48);
      W[k].y = clamp(Math.round(drag.oy + (ev.clientY - drag.sy) / Z), 0, desk.clientHeight - 20);
      apply(k);
    });
    function end() { drag = null; }
    bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
  }
  Object.keys(W).forEach(setupWin);
  // every window but dialogs resizes from its edges and corners; a folder's size grip is the bottom-right corner
  function resizable(k) {
    var e = winEl(k);
    if (e.classList.contains('fixed98')) return;
    ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].forEach(function (dir) {
      var h = document.createElement('div'); h.className = 'rz98'; h.setAttribute('data-d', dir); h.setAttribute('aria-hidden', 'true');
      e.appendChild(h); resizeFrom(k, h, dir);
    });
    var grip = q('.grip98', e); if (grip) resizeFrom(k, grip, 'se');
  }
  function resizeFrom(k, h, dir) {
    var e = winEl(k), d = null;
    h.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0 || W[k].max) return;
      ev.preventDefault(); ev.stopPropagation(); focusWin(k);
      // .window has 3px padding around its content box
      d = { sx: ev.clientX, sy: ev.clientY, x: W[k].x, y: W[k].y, w: e.offsetWidth - 6, h: e.offsetHeight - 6 };
      try { h.setPointerCapture(ev.pointerId); } catch (err) {}
    });
    h.addEventListener('pointermove', function (ev) {
      if (!d) return;
      var desk = q('.desk-area'), s = W[k], dx = (ev.clientX - d.sx) / Z, dy = (ev.clientY - d.sy) / Z;
      var x = d.x, y = d.y, w = d.w, hh = d.h, minW = 150, minH = 80;
      if (dir.indexOf('e') >= 0) w = clamp(Math.round(d.w + dx), minW, desk.clientWidth - d.x - 6);
      if (dir.indexOf('w') >= 0) { x = clamp(Math.round(d.x + dx), 0, d.x + d.w - minW); w = d.w + d.x - x; }
      if (dir.indexOf('s') >= 0) hh = clamp(Math.round(d.h + dy), minH, desk.clientHeight - d.y - 6);
      if (dir.indexOf('n') >= 0) { y = clamp(Math.round(d.y + dy), 0, d.y + d.h - minH); hh = d.h + d.y - y; }
      s.x = x; s.y = y; s.w = w; e.style.width = w + 'px';
      if (/[ns]/.test(dir)) {
        e.style.height = hh + 'px'; e.classList.add('sized');
        var body = q('.window-body', e); body.style.maxHeight = ''; body.style.overflow = '';
      }
      apply(k);
    });
    function end() { d = null; }
    h.addEventListener('pointerup', end); h.addEventListener('pointercancel', end);
  }
  Object.keys(W).forEach(resizable);
  qa('[data-open]').forEach(function (b) { b.addEventListener('click', function () { openWin(b.getAttribute('data-open')); }); });
  qa('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeWin(b.getAttribute('data-close')); }); });

  /* ---------- clients menu ---------- */
  var clients = [
    ['Mozilla', 'https://www.mozilla.org'], ['Ubuntu', 'https://ubuntu.com'], ['Tor Project', 'https://www.torproject.org'],
    ['Thunderbird', 'https://www.thunderbird.net'], ['GitHub', 'https://github.com'], ['Wikimedia Deutschland', 'https://www.wikimedia.de'],
    ['Open Technology Fund', 'https://www.opentech.fund'], ['EFF', 'https://www.eff.org'], ['Linux Foundation', 'https://www.linuxfoundation.org'],
    ['Eclipse Foundation', 'https://www.eclipse.org'], ['Internews', 'https://internews.org'], ['Reset Tech', 'https://www.reset.tech'],
    ['eQualitie', 'https://equalit.ie'], ['GIZ', 'https://www.giz.de'], ['TU Darmstadt', 'https://www.tu-darmstadt.de'], ['University of Michigan', 'https://umich.edu']
  ];
  var menu = q('#clients-menu'), scrim = q('#menu-scrim'), mbtn = q('#clients-btn');
  clients.forEach(function (c) {
    var a = document.createElement('a');
    a.className = 'menuitem98'; a.setAttribute('role', 'menuitem'); a.href = c[1]; a.target = '_blank'; a.rel = 'noopener'; a.tabIndex = -1; a.textContent = c[0];
    a.addEventListener('click', function () { setMenu(false); });
    menu.appendChild(a);
  });
  var items = qa('.menuitem98', menu);
  function setMenu(open, focusIdx) {
    menu.hidden = !open; scrim.hidden = !open; mbtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && focusIdx !== undefined) items[focusIdx].focus();
  }
  mbtn.addEventListener('click', function () { if (menu.hidden) setMenu(true, 0); else { setMenu(false); mbtn.focus(); } });
  mbtn.addEventListener('keydown', function (e) { if (e.key === 'ArrowDown') { e.preventDefault(); setMenu(true, 0); } });
  scrim.addEventListener('click', function () { setMenu(false); });
  menu.addEventListener('keydown', function (e) {
    var i = items.indexOf(document.activeElement), n = items.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % n].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + n) % n].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[n - 1].focus(); }
    else if (e.key === 'Escape') { e.preventDefault(); setMenu(false); mbtn.focus(); }
    else if (e.key === 'Tab') { setMenu(false); }
  });

  /* ---------- clock ---------- */
  var Clock = {
    // Pixel clock ported from SerenityOS AnalogClock (BSD-2-Clause, (c) 2021 Erlend Hoier)
    clockFace: function () {
      if (this._face) return this._face;
      const W = 170, C = 85, R = 70;
      const grid = new Uint8Array(W * W);
      const put = (x, y, v) => { if (x >= 0 && y >= 0 && x < W && y < W) grid[y * W + x] = v; };
      const grad = (sz, x, y) => {
        for (let yy = 0; yy < sz; yy++) for (let xx = 0; xx < sz; xx++) put(x + xx, y + yy, 1);
        const e = sz - 2;
        for (let k = 0; k <= e; k++) put(x + k, y, 2);
        for (let k = 0; k <= e; k++) put(x + k, y + e, 3);
        for (let k = 0; k <= e; k++) put(x + e, y + k, 3);
        for (let k = 0; k <= e; k++) put(x, y + k, 2);
      };
      const mirrored = (sz, x, y, off) => {
        const w = C - off, h = C - off;
        [[x, y], [y, x], [-x, y], [-y, x], [x, -y], [y, -x], [-x, -y], [-y, -x]].forEach(([a, b]) => grad(sz, a + w, b + h));
      };
      const step = 2 * Math.PI / 60;
      for (let i = 0; i <= 7; i++) {
        const x = Math.trunc(Math.sin(step * i) * R), y = Math.trunc(Math.cos(step * i) * R);
        mirrored(3, x, y, 1);
        if (i % 5 === 0) mirrored(5, x, y, 2);
      }
      this._face = { gfill: this.runs(grid, W, 1), ghi: this.runs(grid, W, 2), gsh: this.runs(grid, W, 3) };
      return this._face;
    },
    runs: function (grid, W, v) {
      let d = '';
      for (let y = 0; y < W; y++) {
        let x = 0;
        while (x < W) {
          if (grid[y * W + x] === v) { let e = x; while (e < W && grid[y * W + e] === v) e++; d += 'M' + x + ' ' + y + 'h' + (e - x) + 'v1h' + (x - e) + 'z'; x = e; } else x++;
        }
      }
      return d;
    },
    pixLine: function (a, b, set) {
      let x0 = a[0], y0 = a[1]; const x1 = b[0], y1 = b[1];
      const dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1, dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
      let err = dx + dy;
      for (let n = 0; n < 400; n++) { set(x0, y0); if (x0 === x1 && y0 === y1) break; const e2 = 2 * err; if (e2 >= dy) { err += dy; x0 += sx; } if (e2 <= dx) { err += dx; y0 += sy; } }
    },
    handLayers: function (angle, length) {
      const C = 85, tail = 22, wing = 5, W = 170;
      if (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
      const co = Math.cos(angle), si = Math.sin(angle), T = Math.trunc;
      const tip = [T(C + co * length), T(C + si * length)];
      const tl = [T(C - co * tail), T(C - si * tail)];
      const rw = [T(C - si * wing), T(C + co * wing)];
      const lw = [T(C + si * wing), T(C - co * wing)];
      const poly = [tip, lw, tl, rw];
      const fill = new Uint8Array(W * W), dark = new Uint8Array(W * W), hi = new Uint8Array(W * W);
      const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
      const inside = (px, py) => {
        let pos = false, neg = false;
        for (let k = 0; k < 4; k++) { const a = poly[k], b = poly[(k + 1) % 4]; const c = (b[0] - a[0]) * (py - a[1]) - (b[1] - a[1]) * (px - a[0]); if (c > 0) pos = true; if (c < 0) neg = true; }
        return !(pos && neg);
      };
      for (let y = Math.max(0, Math.min(...ys)); y <= Math.min(W - 1, Math.max(...ys)); y++)
        for (let x = Math.max(0, Math.min(...xs)); x <= Math.min(W - 1, Math.max(...xs)); x++)
          if (inside(x + 0.5, y + 0.5)) fill[y * W + x] = 1;
      const setD = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < W) { dark[y * W + x] = 1; hi[y * W + x] = 0; } };
      const setH = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < W) { hi[y * W + x] = 1; dark[y * W + x] = 0; } };
      if (angle > Math.PI / 2 - Math.PI / 3 && angle < Math.PI + Math.PI / 3) {
        this.pixLine(lw, tip, setD); this.pixLine(lw, tl, setD); this.pixLine(rw, tip, setH); this.pixLine(rw, tl, setH);
      } else {
        this.pixLine(rw, tip, setD); this.pixLine(rw, tl, setD); this.pixLine(lw, tip, setH); this.pixLine(lw, tl, setH);
      }
      return { fill: this.runs(fill, W, 1), dark: this.runs(dark, W, 1), hi: this.runs(hi, W, 1) };
    },
    clockPaths: function (h, m, s) {
      const face = this.clockFace();
      const off = Math.PI / 2;
      const minute = m * 2 * Math.PI / 60;
      const hour = (minute + 2 * Math.PI * h) / 12;
      const sec = s * 2 * Math.PI / 60 - off;
      const mh = this.handLayers(minute - off, 58);
      const hh = this.handLayers(hour - off, 42);
      const W = 170, g = new Uint8Array(W * W);
      this.pixLine([85, 85], [Math.trunc(85 + Math.cos(sec) * 60), Math.trunc(85 + Math.sin(sec) * 60)], (x, y) => { if (x >= 0 && y >= 0 && x < W && y < W) g[y * W + x] = 1; });
      return Object.assign({}, face, { minFill: mh.fill, minDark: mh.dark, minHi: mh.hi, hourFill: hh.fill, hourDark: hh.dark, hourHi: hh.hi, sec: this.runs(g, W, 1) });
    }
  };
  var fmtTime = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  var fmtDate = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', weekday: 'short', day: 'numeric', month: 'short' });
  var fmtParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23' });
  function tick() {
    var now = new Date(), time = fmtTime.format(now), date = fmtDate.format(now).replace(',', '');
    q('#menu-time').textContent = date + '  ' + time;
    if (!W.clock.open) return;
    var parts = {};
    fmtParts.formatToParts(now).forEach(function (p) { parts[p.type] = Number(p.value); });
    var paths = Clock.clockPaths(parts.hour || 0, parts.minute || 0, parts.second || 0);
    qa('#clock-svg path').forEach(function (p) { p.setAttribute('d', paths[p.getAttribute('data-k')] || ''); });
    q('#clock-svg').setAttribute('aria-label', 'Analog clock showing ' + time + ' in Berlin');
    q('#clock-field').value = fmtSecs.format(now);
    var d = berlinDay(now);
    if (d.key !== calToday) { calToday = d.key; renderCal(); }
    q('#clock-zone').textContent = 'Current time zone: W. Europe ' + (/\+2/.test(fmtZone.format(now)) ? 'Daylight' : 'Standard') + ' Time';
  }
  // the Date & Time tab: a month calendar you can page through, with today picked out like in Windows 98
  var fmtSecs = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  var fmtYmd = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Berlin', year: 'numeric', month: '2-digit', day: '2-digit' });
  var fmtZone = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', timeZoneName: 'shortOffset' });
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function berlinDay(now) { var p = fmtYmd.format(now).split('-').map(Number); return { y: p[0], m: p[1] - 1, d: p[2], key: p.join('-') }; }
  var calToday = '', cal = berlinDay(new Date());
  MONTHS.forEach(function (m, i) { var o = document.createElement('option'); o.value = i; o.textContent = m; q('#cal-month').appendChild(o); });
  function renderCal() {
    var t = berlinDay(new Date()), first = new Date(Date.UTC(cal.y, cal.m, 1)).getUTCDay(), days = new Date(Date.UTC(cal.y, cal.m + 1, 0)).getUTCDate();
    q('#cal-month').value = cal.m; q('#cal-year').value = cal.y;
    q('#cal-cap').textContent = MONTHS[cal.m] + ' ' + cal.y;
    var body = q('#cal-days'), html = '';
    for (var i = 0; i < 42; i++) {
      if (i % 7 === 0) { if (i >= first + days) break; html += '<tr>'; }
      var n = i - first + 1, real = n >= 1 && n <= days, today = real && cal.y === t.y && cal.m === t.m && n === t.d;
      html += '<td' + (today ? ' class="today" aria-current="date"' : '') + '>' + (real ? n : '') + '</td>';
      if (i % 7 === 6) html += '</tr>';
    }
    body.innerHTML = html;
  }
  q('#cal-month').addEventListener('change', function (e) { cal.m = Number(e.target.value); renderCal(); });
  q('#cal-year').addEventListener('change', function (e) { var y = Math.round(Number(e.target.value)); if (y >= 1970 && y <= 2099) cal.y = y; renderCal(); });
  // the two tabs
  qa('.tabs98 [role=tab] a').forEach(function (a) {
    a.addEventListener('click', function (e) {
      e.preventDefault();
      qa('.tabs98 [role=tab]').forEach(function (li) {
        var on = li.contains(a); li.setAttribute('aria-selected', on ? 'true' : 'false');
        q(li.querySelector('a').getAttribute('href')).hidden = !on;
      });
    });
  });
  tick(); setInterval(tick, 1000);

  /* ---------- media player ---------- */
  var talks = [
    { title: 'Identifying and Addressing Usability Vulnerabilities', meta: 'FOSS Backstage 2026, Berlin', where: 'Berlin', video: 'vctZaoDzq2k', url: 'https://www.youtube.com/watch?v=vctZaoDzq2k', openLabel: 'watch on youtube' },
    { title: 'Speaker at FOSDEM 2026', meta: 'FOSDEM 2026, Brussels', where: 'Brussels', url: 'https://fosdem.org/2026/schedule/speaker/elio_qoshi', openLabel: 'go there' }
  ];
  var ti = 0, ytState = -1, ytReady = false, ytQueued = null;
  function ytSend(func) {
    // commands sent before YouTube answers are dropped, so hold the latest one
    if (!ytReady) { ytQueued = func; return; }
    var f = q('#talk-video');
    if (f && f.contentWindow) f.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: [] }), '*');
  }
  function renderTalk() {
    var t = talks[ti], screen = q('#talk-screen');
    if (t.video) {
      var f = q('#talk-video');
      if (!f || f.getAttribute('data-id') !== t.video) {
        screen.innerHTML = '';
        f = document.createElement('iframe');
        f.id = 'talk-video'; f.setAttribute('data-id', t.video); f.title = t.title;
        f.src = 'https://www.youtube.com/embed/' + t.video + '?enablejsapi=1&rel=0&playsinline=1' +
          (location.protocol.indexOf('http') === 0 ? '&origin=' + encodeURIComponent(location.origin) : '');
        f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
        // twice the size, scaled to half: cancels .root98's zoom:2 so YouTube draws at its normal size
        f.style.cssText = 'display: block; width: 200%; height: 200%; border: 0; transform: scale(0.5); transform-origin: 0 0';
        // keep asking for player events until YouTube answers, like its own iframe API does
        f.addEventListener('load', function () {
          var tries = 0, ask = setInterval(function () {
            if (ytReady || ++tries > 40 || !f.isConnected) return clearInterval(ask);
            f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'talk-video' }), '*');
          }, 250);
        });
        screen.appendChild(f);
        ytState = -1; ytReady = false; ytQueued = null;
      }
    } else {
      screen.innerHTML = '<div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 12px; text-align: center; color: #fff"><span class="ico ico-presenter" aria-hidden="true"></span><p style="margin: 0">no tape for this one :(</p><a class="btn98" target="_blank" rel="noopener">go there</a></div>';
      q('a', screen).href = t.url;
    }
    q('#talks-p').textContent = t.title; q('#talk-meta').textContent = t.meta;
    var open = q('#talk-open'); open.href = t.url; open.textContent = t.openLabel;
    ['#talk-toggle', '#talk-stop'].forEach(function (id) { q(id).disabled = !t.video; });
    q('#talk-count').textContent = (ti + 1) + '/' + talks.length;
    renderTalkStatus();
    var list = q('#talk-list'); list.innerHTML = '';
    talks.forEach(function (x, i) {
      var li = document.createElement('div'); li.setAttribute('role', 'listitem');
      var b = document.createElement('button'); b.type = 'button'; b.className = 'prow' + (i === ti ? ' sel' : '');
      b.setAttribute('aria-current', i === ti ? 'true' : 'false');
      b.innerHTML = '<span></span><span class="t"></span><span></span>';
      b.children[0].textContent = i + 1; b.children[1].textContent = x.title; b.children[2].textContent = x.where;
      b.addEventListener('click', function () { pickTalk(i); });
      li.appendChild(b); list.appendChild(li);
    });
  }
  function pickTalk(i) { ti = (i + talks.length) % talks.length; ytState = -1; renderTalk(); }
  q('#talk-prev').addEventListener('click', function () { pickTalk(ti - 1); });
  q('#talk-next').addEventListener('click', function () { pickTalk(ti + 1); });
  // YouTube player states: -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
  function ytPlaying() { return ytState === 1 || ytState === 3; }
  function player(func) {
    ytSend(func);
    // show the change right away; YouTube's own state event confirms or corrects it
    ytState = func === 'playVideo' ? 1 : func === 'pauseVideo' ? 2 : 5;
    if (ytPlaying()) radioPause();
    renderTalkStatus();
  }
  window.addEventListener('message', function (e) {
    if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
    var d = e.data;
    try { if (typeof d === 'string') d = JSON.parse(d); } catch (err) { return; }
    if (!d || !d.event) return;
    if (!ytReady) { ytReady = true; if (ytQueued) { var c = ytQueued; ytQueued = null; ytSend(c); } }
    var s = d.event === 'onStateChange' ? d.info : d.info && d.info.playerState;
    if (typeof s !== 'number' || s === ytState) return;
    ytState = s;
    if (ytPlaying()) radioPause();
    renderTalkStatus();
  });
  function renderTalkStatus() {
    var on = ytPlaying(), video = !!talks[ti].video;
    q('#talk-status').textContent = !video ? 'no tape' : on ? 'playing...' : ytState === 2 ? 'paused.' : 'ready.';
    q('#talk-ic-play').style.display = on ? 'none' : '';
    q('#talk-ic-pause').style.display = on ? '' : 'none';
    q('#talk-toggle').setAttribute('aria-label', on ? 'Pause' : 'Play');
  }
  q('#talk-toggle').addEventListener('click', function () { player(ytPlaying() ? 'pauseVideo' : 'playVideo'); });
  q('#talk-stop').addEventListener('click', function () { player('stopVideo'); });

  /* ---------- photos ---------- */
  // build.py fills window.PHOTOS from the photos/ folder
  // each entry: { name, src (dithered), thumb (dithered), full (original) }
  var photos = window.PHOTOS || [], pi = 0, curPhoto = null;
  // previous and next go through the photos in the folder the open one sits in, wherever that is now
  function photoList() { return curPhoto ? childrenOf(parentOf(curPhoto)).filter(function (id) { return ITEMS[id].kind === 'photo'; }) : []; }
  function showPhoto(id) {
    curPhoto = id; pi = ITEMS[id].photo;
    var p = photos[pi], img = q('#photo-img'), list = photoList();
    img.src = p.src; img.alt = p.name;
    q('#photo-t').textContent = ITEMS[id].name; q('#photo-name').textContent = ITEMS[id].name;
    q('#photo-pos').textContent = (list.indexOf(id) + 1) + '/' + list.length;
    q('#photo-full').href = p.full;
    q('#photo-prev').disabled = q('#photo-next').disabled = list.length < 2;
  }
  function stepPhoto(n) {
    var list = photoList();
    if (list.length < 2) return;
    var i = Math.max(0, list.indexOf(curPhoto));
    showPhoto(list[(i + n + list.length) % list.length]);
  }
  q('#photo-prev').addEventListener('click', function () { stepPhoto(-1); });
  q('#photo-next').addEventListener('click', function () { stepPhoto(1); });
  // arrow keys flip through them while the viewer is the window in front
  document.addEventListener('keydown', function (e) {
    if (!W.photo.open || W.photo.z !== topZ() || e.altKey || e.ctrlKey || e.metaKey) return;
    var a = document.activeElement;
    if (a && a.closest && (a.closest('input, textarea, select, .ctx98, .dialog98, .menu98'))) return;
    if (document.querySelector('.ctx98:not([hidden]), .dialog98')) return;
    var n = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
    if (!n) return;
    e.preventDefault(); stepPhoto(n);
  });

  /* ---------- files and folders ---------- */
  // Everything on the desktop is an item in a small folder tree. Visitors can make, rename,
  // delete and move folders and move any item between folders. Their changes only live in
  // their own browser: 'fs' holds the tree, 'icons' the spots of desktop icons.
  var ITEMS = {}, ORDER = [];
  function addItem(it) { ITEMS[it.id] = it; ORDER.push(it.id); }
  [
    { id: 'portrait', name: 'portrait.jpg', ico: 'ico-image', kind: 'app' },
    { id: 'talks', name: 'Talks', ico: 'ico-presenter', kind: 'app' },
    { id: 'contact', name: 'Help', ico: 'ico-help', kind: 'app' },
    { id: 'radio', name: 'Winamp', ico: 'ico-winamp', kind: 'app' },
    { id: 'photos', name: 'Photos', ico: 'ico-folder', kind: 'folder' },
    { id: 'trash', name: 'Trash', ico: 'ico-trash', kind: 'folder' },
    { id: 'ura', name: 'Ura Design', ico: 'ico-browser', kind: 'link', href: 'https://ura.design', dock: 2 },
    { id: 'linkedin', name: 'LinkedIn', ico: 'ico-network', kind: 'link', href: 'https://www.linkedin.com/in/elioqoshi/', dock: 1 },
    { id: 'github', name: 'GitHub', ico: 'ico-git', kind: 'link', href: 'https://github.com/elioqoshi/', dock: 0 }
  ].forEach(function (it) { it.home = 'desktop'; addItem(it); });
  photos.forEach(function (p, i) { addItem({ id: 'photo:' + p.name, name: p.name, ico: 'ico-image', kind: 'photo', photo: i, home: 'photos' }); });
  var fs = store.get('fs') || {};
  // folders: visitor-made folders; parent: moves; names: renamed built-in folders;
  // from/fromPos: where something in the trash came from, so it can go back
  fs.folders = fs.folders || []; fs.parent = fs.parent || {}; fs.names = fs.names || {}; fs.from = fs.from || {}; fs.fromPos = fs.fromPos || {};
  Object.keys(fs.names).forEach(function (id) { if (ITEMS[id] && ITEMS[id].kind === 'folder' && id !== 'trash') ITEMS[id].name = fs.names[id]; });
  fs.folders.forEach(function (f) { addItem({ id: f.id, name: f.name, ico: 'ico-folder', kind: 'folder', own: true, home: 'desktop' }); });
  // forget moves of items or into folders that no longer exist (a photo removed from the repo, say)
  Object.keys(fs.parent).forEach(function (id) {
    var p = fs.parent[id];
    if (!ITEMS[id] || (p !== 'desktop' && !(ITEMS[p] && ITEMS[p].kind === 'folder'))) delete fs.parent[id];
  });
  var iconPos = store.get('icons') || {};
  function saveFs() { store.set('fs', fs); store.set('icons', iconPos); }
  function parentOf(id) { return fs.parent[id] || ITEMS[id].home; }
  function childrenOf(fid) { return ORDER.filter(function (id) { return ITEMS[id] && parentOf(id) === fid; }); }
  // true when folder fid is id itself or sits somewhere inside it
  function inside(id, fid) {
    for (var f = fid, n = 0; f && f !== 'desktop' && n < 64; f = parentOf(f), n++) if (f === id) return true;
    return false;
  }
  function inTrash(id) { return id !== 'trash' && inside('trash', parentOf(id)); }
  // the title of a nested folder shows its path, like Photos\trips
  function pathOf(fid) {
    var names = [];
    for (var f = fid, n = 0; f && f !== 'desktop' && n < 64; f = parentOf(f), n++) names.unshift(ITEMS[f].name);
    return names.join('\\');
  }
  // like Windows 98 without auto arrange, icons stay put when one leaves the desk; Arrange Icons tidies up
  function pinDesk() {
    var spots = layoutDesk();
    childrenOf('desktop').forEach(function (id) { if (!iconPos[id]) iconPos[id] = spots[id]; });
  }
  function moveItem(id, fid, at) {
    if (!ITEMS[id] || (fid !== 'desktop' && inside(id, fid))) return false;
    // the trash only lives on the desk, and nothing goes into a folder that is itself in the trash
    if ((id === 'trash' && fid !== 'desktop') || (fid !== 'trash' && fid !== 'desktop' && inTrash(fid))) return false;
    if (cut === id) cut = null;
    var from = parentOf(id);
    if (from === 'desktop' && fid !== 'desktop') pinDesk();
    if (fid === 'trash' && from !== 'trash') {
      fs.from[id] = from;
      if (from === 'desktop' && iconPos[id]) fs.fromPos[id] = iconPos[id]; else delete fs.fromPos[id];
      closeFolders(id);
    } else if (fid !== 'trash') { delete fs.from[id]; delete fs.fromPos[id]; }
    fs.parent[id] = fid;
    if (fid === 'desktop' && at) iconPos[id] = at; else delete iconPos[id];
    saveFs(); refreshAll();
    return true;
  }
  function refreshAll() {
    renderDesk();
    Object.keys(W).forEach(function (k) { if (k.indexOf('f:') === 0) renderFolder(k.slice(2)); });
  }

  // selection: one click selects (the label turns navy), a double-click opens
  var selEl = null, lastPointer = 'mouse', justDragged = false, cut = null;
  function select(el) { if (selEl && selEl !== el) selEl.classList.remove('sel'); selEl = el; if (el) el.classList.add('sel'); }
  document.addEventListener('pointerdown', function (e) { if (!e.target.closest('.icon, .pthumb, .ctx98')) select(null); }, true);
  function openItem(it) {
    // like the Recycle Bin, things in the trash can't be opened, only restored
    if (inTrash(it.id)) return;
    if (it.kind === 'app') openWin(it.id);
    else if (it.kind === 'folder') openFolder(it.id);
    else if (it.kind === 'photo') { showPhoto(it.id); openWin('photo'); }
    else if (it.kind === 'link') window.open(it.href, '_blank', 'noopener');
  }
  function wireItem(el, it) {
    el.addEventListener('pointerdown', function (e) { lastPointer = e.pointerType; });
    el.addEventListener('click', function (e) {
      if (it.kind === 'link') e.preventDefault();
      if (justDragged) return;
      // the keyboard (Enter, detail 0) and a tap on a phone open right away
      if (e.detail === 0 || lastPointer === 'touch') openItem(it); else select(el);
    });
    el.addEventListener('dblclick', function () { if (lastPointer !== 'touch') openItem(it); });
    el.addEventListener('focus', function () { select(el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'F2' && canRename(it)) { e.preventDefault(); rename(it.id); }
      else if (e.key === 'Delete' && canDelete(it)) { e.preventDefault(); trashItem(it.id); }
    });
  }

  // where a dragged item would land: a folder icon, an open folder window, or the desk
  var hl = null;
  function dropAt(x, y, id) {
    var els = document.elementsFromPoint(x, y);
    for (var i = 0; i < els.length; i++) {
      var el = els[i], t = null;
      if (el.closest('.dragging')) continue;
      var host = el.closest('[data-id]'), fw = el.closest('[data-folder]');
      if (host && ITEMS[host.getAttribute('data-id')].kind === 'folder' && host.getAttribute('data-id') !== id && !inTrash(host.getAttribute('data-id'))) t = { fid: host.getAttribute('data-id'), el: host };
      else if (fw) t = { fid: fw.getAttribute('data-folder'), el: fw };
      else if (el.closest('.win')) return null;
      else if (el.closest('.desk-area')) return { fid: 'desktop' };
      else return null;
      if (t.fid !== 'desktop' && (inside(id, t.fid) || (id === 'trash'))) return null;
      return t.fid !== 'trash' && t.fid !== 'desktop' && inTrash(t.fid) ? null : t;
    }
    return null;
  }
  function highlight(t) {
    if (hl) hl.classList.remove('drop98');
    hl = t && t.el ? t.el : null;
    if (hl) hl.classList.add('drop98');
  }

  // desktop icons: saved spots first, the rest fill free grid cells top to bottom
  var iconBox = q('#icons');
  function cellOf(p) { return p.r !== undefined ? 'R' + Math.round((p.r - 12) / 76) + ',' + Math.round((p.b - 12) / 64) : 'L' + Math.round((p.x - 12) / 76) + ',' + Math.round((p.y - 12) / 64); }
  function deskRows() { return Math.min(5, Math.max(1, Math.floor((iconBox.clientHeight - 68) / 64) + 1)); }
  function layoutDesk() {
    // a phone is tall and narrow, so its icons fill rows across the top and the windows go below them
    var ids = childrenOf('desktop'), taken = {}, spots = {}, rows = deskRows(), across = phone();
    var cols = Math.max(1, Math.floor((iconBox.clientWidth - 8) / 76));
    ids.forEach(function (id) { if (iconPos[id]) { spots[id] = iconPos[id]; taken[cellOf(iconPos[id])] = 1; } });
    ids.forEach(function (id) {
      if (spots[id]) return;
      var it = ITEMS[id];
      if (it.dock !== undefined && !taken['R0,' + it.dock]) { spots[id] = { r: 12, b: 12 + it.dock * 64 }; taken['R0,' + it.dock] = 1; return; }
      for (var n = 0; ; n++) {
        var c = across ? n % cols : Math.floor(n / rows), r = across ? Math.floor(n / cols) : n % rows;
        if (!taken['L' + c + ',' + r]) { taken['L' + c + ',' + r] = 1; spots[id] = { x: 12 + c * 76, y: 12 + r * 64 }; return; }
      }
    });
    return spots;
  }
  function place(wrap, p) {
    if (p.r !== undefined) { wrap.style.left = 'auto'; wrap.style.top = 'auto'; wrap.style.right = p.r + 'px'; wrap.style.bottom = p.b + 'px'; }
    else { wrap.style.right = 'auto'; wrap.style.bottom = 'auto'; wrap.style.left = p.x + 'px'; wrap.style.top = p.y + 'px'; }
  }
  function renderDesk() {
    var spots = layoutDesk();
    iconBox.innerHTML = '';
    var mx = iconBox.clientWidth - 72, my = iconBox.clientHeight - 50;
    childrenOf('desktop').forEach(function (id) {
      var p = spots[id];
      // spots saved on a bigger screen are pulled back inside this one
      p = p.r !== undefined ? { r: clamp(p.r, 0, mx), b: clamp(p.b, 0, my) } : { x: clamp(p.x, 0, mx), y: clamp(p.y, 0, my) };
      iconBox.appendChild(deskIcon(ITEMS[id], p));
    });
  }
  function deskIcon(it, p) {
    var wrap = document.createElement('div');
    wrap.className = 'dicon' + (cut === it.id ? ' cut98' : ''); wrap.setAttribute('role', 'listitem'); wrap.setAttribute('data-id', it.id);
    var inner = document.createElement(it.kind === 'link' ? 'a' : 'button');
    if (it.kind === 'link') { inner.href = it.href; inner.target = '_blank'; inner.rel = 'noopener'; inner.draggable = false; } else inner.type = 'button';
    inner.className = 'icon';
    inner.innerHTML = '<span class="ico ' + it.ico + '" aria-hidden="true"></span><span class="lbl"></span>';
    q('.lbl', inner).textContent = it.name;
    wrap.appendChild(inner); place(wrap, p); wireItem(inner, it);
    // drag to move it on the desk, or drop it onto a folder
    var d = null;
    wrap.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0 || ev.target.closest('.rename98')) return;
      d = { sx: ev.clientX, sy: ev.clientY, p: p, np: p, moved: false };
      // capture right away so a fast flick doesn't lose the icon; on the inner element so its click still fires
      try { inner.setPointerCapture(ev.pointerId); } catch (err) {}
    });
    wrap.addEventListener('pointermove', function (ev) {
      if (!d) return;
      var dx = (ev.clientX - d.sx) / Z, dy = (ev.clientY - d.sy) / Z;
      if (!d.moved) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        d.moved = true; wrap.classList.add('dragging'); wrap.style.zIndex = 2;
      }
      var mx = iconBox.clientWidth - wrap.offsetWidth, my = iconBox.clientHeight - wrap.offsetHeight;
      d.np = d.p.r !== undefined
        ? { r: clamp(Math.round(d.p.r - dx), 0, mx), b: clamp(Math.round(d.p.b - dy), 0, my) }
        : { x: clamp(Math.round(d.p.x + dx), 0, mx), y: clamp(Math.round(d.p.y + dy), 0, my) };
      place(wrap, d.np);
      highlight(dropAt(ev.clientX, ev.clientY, it.id));
    });
    wrap.addEventListener('pointerup', function (ev) {
      if (d && d.moved) {
        justDragged = true; setTimeout(function () { justDragged = false; }, 0);
        wrap.classList.remove('dragging'); wrap.style.zIndex = '';
        var t = dropAt(ev.clientX, ev.clientY, it.id); highlight(null);
        if (t && t.fid !== 'desktop') { if (!moveItem(it.id, t.fid)) place(wrap, d.p); }
        else { iconPos[it.id] = d.np; p = d.np; saveFs(); }
      }
      d = null;
    });
    wrap.addEventListener('pointercancel', function () {
      if (d && d.moved) { wrap.classList.remove('dragging'); wrap.style.zIndex = ''; place(wrap, d.p); highlight(null); }
      d = null;
    });
    return wrap;
  }

  // folder windows are made from a template the first time a folder opens
  function folderKey(fid) { return 'f:' + fid; }
  function openFolder(fid) {
    var k = folderKey(fid);
    if (!W[k]) {
      var e = q('#folder-tpl').content.firstElementChild.cloneNode(true);
      e.setAttribute('data-win', k); e.setAttribute('data-folder', fid);
      q('.desk-area').appendChild(e);
      W[k] = { w: 300, open: false, x: 0, y: 0, z: 0 };
      setupWin(k); resizable(k);
    }
    openWin(k);
  }
  function renderFolder(fid) {
    var e = winEl(folderKey(fid)), it = ITEMS[fid];
    if (!e || !it) return;
    var grid = q('.folder-grid', e), kids = childrenOf(fid);
    q('.folder-t', e).textContent = pathOf(fid); e.setAttribute('aria-label', pathOf(fid) + ' folder');
    grid.innerHTML = '';
    if (!kids.length) grid.innerHTML = '<p class="muted" style="margin: 0; padding: 8px">' + (fid === 'trash' ? 'nothing in the trash. tidy!' : 'this folder is empty :(') + '</p>';
    kids.forEach(function (id) { grid.appendChild(folderItem(ITEMS[id])); });
    q('.folder-count', e).textContent = kids.length + (kids.length === 1 ? ' object' : ' objects');
  }
  function folderItem(it) {
    var li = document.createElement('div');
    li.className = 'fitem' + (cut === it.id ? ' cut98' : ''); li.setAttribute('role', 'listitem'); li.setAttribute('data-id', it.id);
    var b = document.createElement('button'); b.type = 'button'; b.className = 'pthumb';
    if (it.kind === 'photo') { b.innerHTML = '<img alt="" loading="lazy"><span class="pname"></span>'; b.firstChild.src = photos[it.photo].thumb; }
    else b.innerHTML = '<span class="pico"><span class="ico ' + it.ico + '" aria-hidden="true"></span></span><span class="pname"></span>';
    b.lastChild.textContent = it.name;
    li.appendChild(b); wireItem(b, it);
    // drag a copy of it around; dropping it moves the item. The browser's own image drag would cancel ours
    qa('img', b).forEach(function (img) { img.draggable = false; });
    b.addEventListener('dragstart', function (e) { e.preventDefault(); });
    var d = null, ghost = null;
    b.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0) return;
      d = { sx: ev.clientX, sy: ev.clientY };
      try { b.setPointerCapture(ev.pointerId); } catch (err) {}
    });
    b.addEventListener('pointermove', function (ev) {
      if (!d) return;
      if (!ghost) {
        if (Math.abs(ev.clientX - d.sx) < 6 && Math.abs(ev.clientY - d.sy) < 6) return;
        ghost = b.cloneNode(true); ghost.className = 'pthumb ghost98'; root.appendChild(ghost); li.classList.add('dragging');
      }
      ghost.style.left = (ev.clientX / Z - 34) + 'px'; ghost.style.top = (ev.clientY / Z - 24) + 'px';
      highlight(dropAt(ev.clientX, ev.clientY, it.id));
    });
    function stop() { if (ghost) { ghost.remove(); ghost = null; li.classList.remove('dragging'); highlight(null); } d = null; }
    b.addEventListener('pointerup', function (ev) {
      if (ghost) {
        var t = dropAt(ev.clientX, ev.clientY, it.id);
        justDragged = true; setTimeout(function () { justDragged = false; }, 0);
        stop();
        if (t && t.fid !== parentOf(it.id)) moveItem(it.id, t.fid, t.fid === 'desktop' ? deskPoint(ev.clientX, ev.clientY) : null);
      }
      d = null;
    });
    b.addEventListener('pointercancel', stop);
    return li;
  }
  // a point on the page as a desktop icon spot (icons are about 72x50)
  function deskPoint(x, y) {
    var r = iconBox.getBoundingClientRect();
    return { x: clamp(Math.round((x - r.left) / Z - 36), 0, iconBox.clientWidth - 72), y: clamp(Math.round((y - r.top) / Z - 16), 0, iconBox.clientHeight - 50) };
  }

  // new folders, renaming, deleting, cut and paste
  function uniqueName(fid, base) {
    var names = childrenOf(fid).map(function (id) { return ITEMS[id].name.toLowerCase(); }), n = base, i = 2;
    while (names.indexOf(n.toLowerCase()) >= 0) n = base + ' (' + i++ + ')';
    return n;
  }
  function newFolder(fid, at) {
    var id = 'f' + Date.now().toString(36), name = uniqueName(fid, 'New Folder');
    fs.folders.push({ id: id, name: name });
    addItem({ id: id, name: name, ico: 'ico-folder', kind: 'folder', own: true, home: 'desktop' });
    fs.parent[id] = fid;
    if (fid === 'desktop' && at) iconPos[id] = at;
    saveFs(); refreshAll(); rename(id);
  }
  // the element showing an item right now: its desktop icon, or its spot in its open folder window
  function itemEl(id) {
    var p = parentOf(id), k = folderKey(p);
    var box = p === 'desktop' ? iconBox : (W[k] && W[k].open ? q('.folder-grid', winEl(k)) : null);
    return box ? box.querySelector('[data-id="' + CSS.escape(id) + '"]') : null;
  }
  function rename(id) {
    var it = ITEMS[id], host = itemEl(id);
    if (!it || !canRename(it) || !host) return;
    var lbl = q('.lbl, .pname', host), input = document.createElement('input'), done = false;
    input.type = 'text'; input.className = 'rename98'; input.value = it.name; input.maxLength = 40; input.setAttribute('aria-label', 'Folder name');
    lbl.style.visibility = 'hidden'; host.appendChild(input); input.focus(); input.select();
    function finish(save) {
      if (done) return;
      done = true;
      var v = input.value.trim();
      if (save && v && v !== it.name) {
        it.name = v;
        if (it.own) fs.folders.forEach(function (f) { if (f.id === id) f.name = v; }); else fs.names[id] = v;
        saveFs();
      }
      refreshAll();
      var el = itemEl(id); if (el) q('.icon, .pthumb', el).focus();
    }
    input.addEventListener('keydown', function (e) {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); finish(true); } else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    input.addEventListener('blur', function () { finish(true); });
    ['pointerdown', 'click', 'dblclick', 'contextmenu'].forEach(function (ev) { input.addEventListener(ev, function (e) { e.stopPropagation(); }); });
  }
  function canRename(it) { return it.kind === 'folder' && it.id !== 'trash' && !inTrash(it.id); }
  function canDelete(it) { return it.id !== 'trash' && !inTrash(it.id); }
  // deleting moves things to the trash; it can't be emptied, so nothing is ever really lost
  function trashItem(id) { if (canDelete(ITEMS[id])) moveItem(id, 'trash'); }
  function restoreItem(id) {
    var to = fs.from[id], at = fs.fromPos[id];
    // back where it came from, or to the desk if that folder is gone or in the trash itself
    if (!(to === 'desktop' || (ITEMS[to] && ITEMS[to].kind === 'folder' && to !== 'trash' && !inTrash(to)))) { to = 'desktop'; at = null; }
    moveItem(id, to, to === 'desktop' ? at : null);
  }
  // close the windows of a folder, and of folders inside it, when it goes in the trash
  function closeFolders(id) {
    Object.keys(W).forEach(function (k) {
      if (k.indexOf('f:') !== 0) return;
      var f = k.slice(2);
      if (ITEMS[f] && (f === id || inside(id, f)) && W[k].open) closeWin(k);
    });
  }
  function setCut(id) { if (id !== 'trash') { cut = id; refreshAll(); } }
  function paste(fid, at) { var id = cut; cut = null; if (!id || !moveItem(id, fid, at)) refreshAll(); }
  function resetDesk() {
    if (!window.confirm('put everything back the way Elio left it?')) return;
    store.set('fs', null); store.set('icons', null); location.reload();
  }
  renderDesk();
  // on phones about.txt and the portrait start under the icons
  function phoneStart() {
    if (!phone()) return;
    var desk = q('.desk-area'), dw = desk.clientWidth, dh = desk.clientHeight, a = W.about, p = W.portrait;
    var ae = winEl('about'), pe = winEl('portrait'), top = iconsBottom() + 8;
    a.x = Math.max(0, Math.round((dw - ae.offsetWidth) / 2)); a.y = top; apply('about');
    p.x = Math.max(0, dw - pe.offsetWidth - 8); p.y = clamp(top + ae.offsetHeight + 12, 0, dh - pe.offsetHeight - 4); apply('portrait');
  }
  phoneStart();
  Object.keys(W).forEach(keepOnDesk);
  // switching between phone and desktop size lays the icons out again
  var phoneMq = window.matchMedia('(max-width: 760px)');
  if (phoneMq.addEventListener) phoneMq.addEventListener('change', function () { renderDesk(); });

  /* ---------- winamp (Ghosts I–IV from the Internet Archive) ---------- */
  // all 36 tracks of the official 2008 release (CC BY-NC-SA 3.0), streamed from archive.org in album order
  var ARCHIVE = 'https://archive.org/download/nine-inch-nails-ghosts-i-iv-2008-web/';
  var LENGTHS = [169, 196, 231, 133, 172, 259, 121, 176, 167, 162, 137, 137, 194, 186, 113, 150, 133, 323,
    132, 219, 174, 151, 164, 159, 119, 146, 172, 322, 175, 179, 146, 266, 242, 352, 210, 139];
  var tracks = LENGTHS.map(function (len, i) {
    var n = i + 1, title = n + ' Ghosts ' + ['I', 'II', 'III', 'IV'][Math.floor(i / 9)];
    return { title: title, len: len, src: ARCHIVE + encodeURIComponent('Nine Inch Nails - Ghosts I-IV - ' + String(n).padStart(2, '0') + ' - ' + title + '.mp3') };
  });
  // two players: one plays, the other quietly loads the track that comes next, then they swap
  var audio = new Audio(), spare = new Audio(), spareIdx = -1;
  audio.preload = 'none'; spare.preload = 'auto';
  var saved = store.get('fm') || {};
  var fm = { playing: false, time: 0, dur: tracks[0].len, vol: 80, seeking: false,
    idx: 0, shuffle: !!saved.shuffle, repeat: saved.repeat || 'off', list: !!saved.list };
  audio.volume = spare.volume = fm.vol / 100;
  // shuffle picks the next track ahead of time so it can be loaded before it's needed
  function queueNext() {
    var n = tracks.length, r;
    if (fm.shuffle && n > 1) { do { r = Math.floor(Math.random() * n); } while (r === fm.idx); fm.upNext = r; }
    else fm.upNext = (fm.idx + 1) % n;
  }
  function preloadNext() {
    if (fm.upNext === undefined || spareIdx === fm.upNext || fm.upNext === fm.idx) return;
    spareIdx = fm.upNext; spare.src = tracks[spareIdx].src; spare.load();
  }
  function saveFm() { store.set('fm', { shuffle: fm.shuffle, repeat: fm.repeat, list: fm.list }); }
  function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
  function renderFm() {
    q('#fm-time').textContent = fmt(fm.time);
    q('#fm-dur').textContent = fmt(fm.dur);
    q('#fm-volnum').textContent = fm.vol;
    var seek = q('#fm-seek'); seek.max = Math.max(1, Math.round(fm.dur)); if (!fm.seeking) seek.value = Math.round(fm.time);
    q('#fm-ic-play').style.display = fm.playing ? 'none' : '';
    q('#fm-ic-pause').style.display = fm.playing ? '' : 'none';
    q('#fm-toggle').setAttribute('aria-label', fm.playing ? 'Pause' : 'Play');
    var sh = q('#fm-shuffle'), rp = q('#fm-repeat'), pl = q('#fm-pl');
    sh.setAttribute('aria-pressed', fm.shuffle ? 'true' : 'false'); sh.title = fm.shuffle ? 'shuffle: on' : 'shuffle: off';
    rp.setAttribute('aria-pressed', fm.repeat === 'off' ? 'false' : 'true');
    rp.setAttribute('aria-label', 'Repeat: ' + fm.repeat); rp.title = 'repeat: ' + fm.repeat;
    q('#fm-ic-one').style.display = fm.repeat === 'one' ? '' : 'none';
    pl.setAttribute('aria-expanded', fm.list ? 'true' : 'false'); pl.setAttribute('aria-pressed', fm.list ? 'true' : 'false');
    pl.title = fm.list ? 'hide playlist' : 'show playlist';
    q('#fm-list').hidden = !fm.list;
    qa('#fm-list .prow').forEach(function (b, i) {
      b.classList.toggle('sel', i === fm.idx); b.setAttribute('aria-current', i === fm.idx ? 'true' : 'false');
    });
  }
  (function renderPlaylist() {
    var list = q('#fm-list');
    tracks.forEach(function (t, i) {
      var li = document.createElement('div'); li.setAttribute('role', 'listitem');
      // the titles already carry the track number ("5 Ghosts I"), so no number column
      var b = document.createElement('button'); b.type = 'button'; b.className = 'prow fm-row';
      b.innerHTML = '<span class="t"></span><span></span>';
      b.children[0].textContent = t.title; b.children[1].textContent = fmt(t.len);
      b.addEventListener('click', function () { loadTrack(i, true); });
      li.appendChild(b); list.appendChild(li);
    });
  })();
  // keep the playing track in view inside the list, without scrolling the page
  function showCurrent() {
    var L = q('#fm-list'), row = qa('#fm-list .prow')[fm.idx];
    if (!row || L.hidden) return;
    var top = row.parentNode.offsetTop;
    if (top < L.scrollTop || top + row.offsetHeight > L.scrollTop + L.clientHeight) L.scrollTop = top - L.clientHeight / 2;
  }
  // what comes after this track, given shuffle and repeat; null means stop
  function pickNext(auto) {
    var n = tracks.length;
    if (auto && fm.repeat === 'one') return fm.idx;
    if (fm.shuffle) return fm.upNext;
    if (fm.idx + 1 < n) return fm.idx + 1;
    return fm.repeat === 'all' || !auto ? 0 : null;
  }
  function loadTrack(i, play) {
    fm.idx = i; fm.time = 0; fm.dur = tracks[i].len;
    if (spareIdx === i && i !== -1) {
      // already loaded: swap the players
      var old = audio; audio = spare; spare = old; spareIdx = -1;
      old.pause(); old.removeAttribute('src'); old.load();
      audio.currentTime = 0; audio.preload = 'auto'; spare.preload = 'auto';
      if (isFinite(audio.duration)) fm.dur = audio.duration;
    } else audio.src = tracks[i].src;
    queueNext();
    q('#fm-title').textContent = tracks[i].title;
    if (play) playFm();
    renderFm(); showCurrent();
  }
  function playFm() {
    if (!audio.src) audio.src = tracks[fm.idx].src;
    var p = audio.play();
    if (p && p.catch) p.catch(function (err) { if (err && err.name !== 'AbortError') cantTuneIn(); });
  }
  function radioPause() { audio.pause(); }
  function cantTuneIn() { q('#fm-title').textContent = 'can’t tune in here :('; q('#fm-sub').textContent = 'try the archive.org link below'; }
  function onAudio(type, fn) {
    [audio, spare].forEach(function (el) { el.addEventListener(type, function (e) { if (e.currentTarget === audio) fn(e); }); });
  }
  // once the current track has loaded enough to play through, start on the next one
  onAudio('canplaythrough', function () { preloadNext(); });
  onAudio('play', function () {
    fm.playing = true; q('#fm-sub').textContent = 'Nine Inch Nails, Ghosts I–IV';
    if (ytPlaying()) { ytSend('pauseVideo'); ytState = 2; renderTalkStatus(); }
    renderFm();
  });
  onAudio('pause', function () { fm.playing = false; renderFm(); });
  onAudio('loadedmetadata', function () { if (isFinite(audio.duration)) fm.dur = audio.duration; renderFm(); });
  onAudio('timeupdate', function () { fm.time = audio.currentTime; renderFm(); });
  onAudio('ended', function () { var nx = pickNext(true); if (nx === null) { fm.playing = false; renderFm(); } else loadTrack(nx, true); });
  onAudio('error', function () { if (audio.src) { fm.playing = false; cantTuneIn(); renderFm(); } });
  q('#fm-title').textContent = tracks[0].title;
  queueNext();
  q('#fm-toggle').addEventListener('click', function () { if (fm.playing) radioPause(); else playFm(); });
  // like Winamp, previous restarts the track unless it has only just begun
  q('#fm-prev').addEventListener('click', function () {
    if (audio.currentTime > 3) { audio.currentTime = 0; return; }
    loadTrack((fm.idx - 1 + tracks.length) % tracks.length, fm.playing);
  });
  q('#fm-next').addEventListener('click', function () { loadTrack(pickNext(false), fm.playing); });
  q('#fm-shuffle').addEventListener('click', function () { fm.shuffle = !fm.shuffle; saveFm(); renderFm(); queueNext(); if (fm.playing) preloadNext(); });
  q('#fm-repeat').addEventListener('click', function () {
    fm.repeat = { off: 'all', all: 'one', one: 'off' }[fm.repeat]; saveFm(); renderFm();
  });
  q('#fm-pl').addEventListener('click', function () { fm.list = !fm.list; saveFm(); renderFm(); showCurrent(); });
  var seek = q('#fm-seek');
  seek.addEventListener('input', function () { fm.seeking = true; q('#fm-time').textContent = fmt(Number(seek.value)); });
  seek.addEventListener('change', function () {
    fm.seeking = false; fm.time = Number(seek.value);
    if (!audio.src) audio.src = tracks[fm.idx].src;
    audio.currentTime = fm.time; renderFm();
  });
  q('#fm-vol').addEventListener('input', function (e) { fm.vol = Number(e.target.value); audio.volume = spare.volume = fm.vol / 100; q('#fm-volnum').textContent = fm.vol; });
  renderFm();

  /* ---------- right-click menus ---------- */
  var ctx = document.createElement('div'), ctxFrom = null, ctxItems = [];
  ctx.className = 'menu98 ctx98'; ctx.setAttribute('role', 'menu'); ctx.hidden = true;
  root.appendChild(ctx);
  // entries: { label, run, bold, disabled } or '-' for a separator
  function openMenu(entries, x, y, from) {
    ctx.innerHTML = ''; ctxItems = []; ctxFrom = from || null;
    entries.forEach(function (it) {
      if (it === '-') { var sep = document.createElement('div'); sep.className = 'sep98'; sep.setAttribute('role', 'separator'); ctx.appendChild(sep); return; }
      var m = document.createElement('div');
      m.className = 'menuitem98' + (it.bold ? ' default' : ''); m.setAttribute('role', 'menuitem'); m.tabIndex = -1; m.textContent = it.label;
      if (it.disabled) m.setAttribute('aria-disabled', 'true');
      else { ctxItems.push(m); m.addEventListener('click', function () { closeMenu(true); it.run(); }); }
      ctx.appendChild(m);
    });
    ctx.hidden = false;
    // page coordinates are 2x the zoomed ones; keep the whole menu on screen
    var vw = window.innerWidth / Z, vh = window.innerHeight / Z;
    ctx.style.left = Math.max(0, Math.min(x / Z, vw - ctx.offsetWidth - 2)) + 'px';
    ctx.style.top = Math.max(0, Math.min(y / Z, vh - ctx.offsetHeight - 2)) + 'px';
    if (ctxItems[0]) ctxItems[0].focus();
  }
  function closeMenu(keepFocus) {
    if (ctx.hidden) return;
    ctx.hidden = true;
    if (!keepFocus && ctxFrom && ctxFrom.focus) ctxFrom.focus();
  }
  ctx.addEventListener('keydown', function (e) {
    var i = ctxItems.indexOf(document.activeElement), n = ctxItems.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); ctxItems[(i + 1) % n].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); ctxItems[(i - 1 + n) % n].focus(); }
    else if (e.key === 'Home') { e.preventDefault(); ctxItems[0].focus(); }
    else if (e.key === 'End') { e.preventDefault(); ctxItems[n - 1].focus(); }
    else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i >= 0) ctxItems[i].click(); }
    else if (e.key === 'Escape') { e.preventDefault(); closeMenu(); }
    else if (e.key === 'Tab') { e.preventDefault(); closeMenu(); }
  });
  document.addEventListener('pointerdown', function (e) { if (!ctx.hidden && !ctx.contains(e.target)) closeMenu(true); }, true);
  window.addEventListener('blur', function () { closeMenu(true); });
  window.addEventListener('resize', function () { closeMenu(true); });

  // desktop: arrange, refresh, new folder, paste and the rest
  function arrangeIcons() { childrenOf('desktop').forEach(function (id) { delete iconPos[id]; }); saveFs(); renderDesk(); }
  function refreshDesk() {
    setBusy(1); iconBox.style.visibility = 'hidden';
    setTimeout(function () { iconBox.style.visibility = ''; setBusy(-1); }, 400);
  }
  function desktopMenu(x, y, from) {
    var dark = root.classList.contains('dark');
    openMenu([
      { label: 'Arrange Icons', run: arrangeIcons },
      '-',
      { label: 'Refresh', run: refreshDesk },
      '-',
      { label: 'Paste', run: function () { paste('desktop', deskPoint(x, y)); }, disabled: !cut },
      '-',
      { label: 'New Folder', run: function () { newFolder('desktop', deskPoint(x, y)); } },
      '-',
      { label: dark ? 'Lights On' : 'Lights Off', run: function () { q('#dark-btn').click(); } },
      { label: 'Restore Wallpaper', run: function () { setWallpaper(null); }, disabled: !wallpaper },
      '-',
      { label: 'Reset Desktop', run: resetDesk }
    ], x, y, from);
  }
  // a modal Windows 98 dialog: an icon, a message and buttons; Enter picks the default, Escape the last
  function dialog98(title, ico, text, buttons) {
    // give focus back afterwards; when a menu opened the dialog, that's what the menu was opened from
    var scrim = document.createElement('div'), d = document.createElement('section'), from = document.activeElement;
    if (!from || from === document.body || (from.closest && from.closest('.ctx98'))) from = ctxFrom;
    scrim.className = 'dialog-scrim'; d.className = 'window dialog98'; d.setAttribute('role', 'alertdialog'); d.setAttribute('aria-modal', 'true');
    d.innerHTML = '<div class="title-bar tb-blue"><div class="title-bar-text"></div><div class="title-bar-controls"><button aria-label="Close"></button></div></div>' +
      '<div class="window-body"><div class="dialog98-msg"><span class="ico ' + ico + '" aria-hidden="true"></span><p></p></div><div class="dialog98-btns"></div></div>';
    q('.title-bar-text', d).textContent = title; q('p', d).textContent = text;
    var id = 'dlg' + Date.now(); q('p', d).id = id; d.setAttribute('aria-labelledby', id);
    function close(run) { scrim.remove(); d.remove(); if (from && from.isConnected && from.focus) from.focus(); if (run) run(); }
    var btns = buttons.map(function (b) {
      var el = document.createElement('button'); el.type = 'button'; el.textContent = b.label;
      if (b.isDefault) el.className = 'default';
      el.addEventListener('click', function () { close(b.run); });
      q('.dialog98-btns', d).appendChild(el); return el;
    });
    q('.title-bar-controls button', d).addEventListener('click', function () { close(); });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Tab') { // keep focus inside the dialog
        var i = btns.indexOf(document.activeElement); e.preventDefault();
        btns[(i + (e.shiftKey ? btns.length - 1 : 1)) % btns.length].focus();
      }
    });
    root.appendChild(scrim); root.appendChild(d);
    (btns.filter(function (b, i) { return buttons[i].isDefault; })[0] || btns[0]).focus();
  }
  // the trash can't really be emptied: say yes and Elio's stuff stays put
  function emptyTrash() {
    var n = childrenOf('trash').length;
    if (!n) return;
    var what = n === 1 ? '\u201c' + ITEMS[childrenOf('trash')[0]].name + '\u201d' : 'these ' + n + ' items';
    dialog98('Confirm Delete', 'ico-trash', 'Are you sure you want to delete ' + what + '?', [
      { label: 'Yes', isDefault: true, run: function () {
        dialog98('Empty Trash', 'ico-help', 'don\u2019t throw Elio\u2019s stuff away :(', [{ label: 'OK', isDefault: true }]);
      } },
      { label: 'No' }
    ]);
  }
  // inside a folder window, on the empty space between items
  function folderBgMenu(fid, x, y) {
    if (fid === 'trash') return openMenu([
      { label: 'Restore All', run: function () { childrenOf('trash').forEach(restoreItem); }, disabled: !childrenOf('trash').length },
      '-',
      { label: 'Empty Trash', run: emptyTrash, disabled: !childrenOf('trash').length }
    ], x, y, null);
    openMenu([
      { label: 'Paste', run: function () { paste(fid); }, disabled: !cut },
      '-',
      { label: 'New Folder', run: function () { newFolder(fid); } }
    ], x, y, null);
  }

  // any item, on the desktop or in a folder
  function itemMenu(it, el, x, y) {
    var list;
    if (inTrash(it.id)) list = [{ label: 'Restore', bold: true, run: function () { restoreItem(it.id); } }, '-', { label: 'Cut', run: function () { setCut(it.id); } }];
    else if (it.id === 'trash') list = [{ label: 'Open', bold: true, run: function () { openItem(it); } }, '-', { label: 'Empty Trash', run: emptyTrash, disabled: !childrenOf('trash').length }];
    else {
      list = [{ label: 'Open', bold: true, run: function () { openItem(it); } }];
      if (it.kind === 'photo') {
        var p = photos[it.photo];
        list.push({ label: 'View Full Size', run: function () { window.open(p.full, '_blank', 'noopener'); } },
                  { label: 'Set as Wallpaper', run: function () { setWallpaper(p.src); } });
      }
      if (it.kind === 'link') list.push({ label: 'Copy Link Address', run: function () {
        if (navigator.clipboard) navigator.clipboard.writeText(it.href).catch(function () {});
      } });
      list.push('-', { label: 'Cut', run: function () { setCut(it.id); } });
      if (it.kind === 'folder') list.push({ label: 'Paste', run: function () { paste(it.id); }, disabled: !cut || cut === it.id });
      list.push('-');
      if (canRename(it)) list.push({ label: 'Rename', run: function () { rename(it.id); } });
      list.push({ label: 'Delete', run: function () { trashItem(it.id); } });
      if (parentOf(it.id) !== 'desktop') list.push('-', { label: 'Move to Desktop', run: function () { moveItem(it.id, 'desktop'); } });
    }
    openMenu(list, x, y, el);
  }

  // title bars: the Windows 98 system menu
  function windowMenu(k, x, y) {
    var s = W[k];
    openMenu([
      { label: 'Restore', run: function () { maximize(k, false); }, disabled: !s.max },
      { label: 'Minimize', disabled: true },
      { label: 'Maximize', run: function () { maximize(k, true); }, disabled: !!s.max },
      '-',
      { label: 'Close', bold: true, run: function () { closeWin(k); } },
      { label: 'Close All Windows', run: function () { Object.keys(W).forEach(function (w) { if (W[w].open) closeWin(w); }); } }
    ], x, y, q('.title-bar-controls button', winEl(k)));
  }

  // photos can become the wallpaper; the choice is remembered per visitor
  var wallpaper = null;
  function setWallpaper(src) {
    wallpaper = src;
    document.documentElement.style.backgroundImage = src ? 'url("' + src + '")' : '';
    document.documentElement.style.backgroundPosition = src ? 'center' : '';
    store.set('wallpaper', src);
  }
  (function () {
    var w = store.get('wallpaper');
    if (w && photos.some(function (p) { return p.src === w; })) setWallpaper(w);
  })();
  function viewerMenu(x, y) {
    var p = photos[pi];
    openMenu([
      { label: 'View Full Size', run: function () { window.open(p.full, '_blank', 'noopener'); } },
      '-',
      { label: 'Set as Wallpaper', run: function () { setWallpaper(p.src); } }
    ], x, y, null);
  }

  // work out which menu a spot on the page gets; null keeps the browser's own menu
  function menuFor(t, x, y) {
    if (t.closest('#photo-img') && photos.length) return function () { viewerMenu(x, y); };
    var host = t.closest('[data-id]');
    if (host && ITEMS[host.getAttribute('data-id')] && !t.closest('.rename98')) {
      var it = ITEMS[host.getAttribute('data-id')], el = q('.icon, .pthumb', host);
      return function () { select(el); itemMenu(it, el, x, y); };
    }
    var fw = t.closest('[data-folder]');
    if (fw && t.closest('.folder-grid')) return function () { folderBgMenu(fw.getAttribute('data-folder'), x, y); };
    var bar = t.closest('.title-bar');
    if (bar && !t.closest('.title-bar-controls')) { var k = bar.closest('[data-win]').getAttribute('data-win'); return function () { windowMenu(k, x, y); }; }
    if (t.closest('.desk-area') && !t.closest('.win')) return function () { desktopMenu(x, y, null); };
    return null;
  }
  document.addEventListener('contextmenu', function (e) {
    var x = e.clientX, y = e.clientY, t = e.target;
    // from the keyboard (menu key, Shift+F10) there is no pointer: use the focused element
    if (!x && !y && t.getBoundingClientRect) { var r = t.getBoundingClientRect(); x = r.left + 8; y = r.bottom; }
    var show = menuFor(t, x, y);
    if (!show) return;
    e.preventDefault();
    // a long press already opened this menu; Android fires contextmenu a little later
    if (Date.now() - pressedAt < 1500) return;
    show();
  });
  // keyboard, like in Windows: Shift+F10 or the menu key for whatever has focus (the desktop
  // when nothing does), Alt+Space for the system menu of the focused window
  document.addEventListener('keydown', function (e) {
    var a = document.activeElement || document.body;
    if (e.altKey && e.code === 'Space') {
      var w = a.closest && a.closest('[data-win]');
      if (!w) return;
      e.preventDefault();
      var wr = w.querySelector('.title-bar').getBoundingClientRect();
      windowMenu(w.getAttribute('data-win'), wr.left + 4, wr.bottom);
    } else if (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10')) {
      if (!ctx.hidden) return;
      var nothing = a === document.body || a === document.documentElement;
      var r = (nothing ? q('.desk-area') : a).getBoundingClientRect();
      var show = menuFor(nothing ? q('.desk-area') : a, r.left + 8, nothing ? r.top + 8 : r.bottom);
      if (!show) return;
      e.preventDefault(); show();
    }
  });
  // iOS has no contextmenu event, so a long press opens the menu there; other phones fire contextmenu first
  var press = null, eatClick = false, pressedAt = 0;
  document.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'touch' || !menuFor(e.target, 0, 0)) return;
    var x = e.clientX, y = e.clientY, t = e.target;
    press = { x: x, y: y, timer: setTimeout(function () {
      press = null;
      if (!ctx.hidden) return;
      var show = menuFor(t, x, y); if (show) { eatClick = true; pressedAt = Date.now(); show(); }
    }, 350) };
  });
  function cancelPress(e) {
    if (!press) return;
    if (e.type === 'pointermove' && Math.abs(e.clientX - press.x) < 8 && Math.abs(e.clientY - press.y) < 8) return;
    clearTimeout(press.timer); press = null;
  }
  ['pointermove', 'pointerup', 'pointercancel'].forEach(function (ev) { document.addEventListener(ev, cancelPress); });
  document.addEventListener('click', function (e) { if (eatClick) { eatClick = false; e.preventDefault(); e.stopPropagation(); } }, true);
})();
