(function () {
  'use strict';
  var Z = 2;
  var root = document.getElementById('root98');
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('elio98:' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('elio98:' + k, JSON.stringify(v)); } catch (e) {} }
  };
  function q(sel, ctx) { return (ctx || document).querySelector(sel); }
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
    talks: { w: 340 }, clock: { w: 194 }, contact: { w: 270 }, radio: { w: 210 }, imprint: { w: 300 }
  };
  Object.keys(W).forEach(function (k) { var s = W[k]; if (s.open === undefined) { s.open = false; s.x = 0; s.y = 0; s.z = 0; } });
  function winEl(k) { return q('[data-win="' + k + '"]'); }
  function topZ() { return Math.max.apply(null, Object.keys(W).map(function (k) { return W[k].z || 0; })); }
  function apply(k) { var s = W[k], e = winEl(k); e.hidden = !s.open; e.style.left = s.x + 'px'; e.style.top = s.y + 'px'; e.style.zIndex = s.z; }
  var busy = 0, pending = {};
  function setBusy(d) { busy = Math.max(0, busy + d); root.classList.toggle('busy', busy > 0); }
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
    if (k === 'clock') tick();
    if (k === 'radio') ensureRadio();
    var dw = desk.clientWidth, dh = desk.clientHeight, h = e.offsetHeight;
    var over = h - (dh - 16);
    if (over > 0) {
      body.style.maxHeight = Math.max(60, body.offsetHeight - over) + 'px'; body.style.overflow = 'auto'; h = e.offsetHeight;
    }
    var minX = dw > 380 ? 168 : 8, maxX = Math.max(minX, dw - s.w - 8), maxY = Math.max(8, dh - h - 8);
    s.x = Math.round(minX + Math.random() * (maxX - minX));
    s.y = Math.round(8 + Math.random() * (maxY - 8));
    apply(k);
  }
  function closeWin(k) {
    W[k].open = false; apply(k);
    if (k === 'talks') ytSend('pauseVideo');
    if (k === 'radio') scCall('pause');
  }
  Object.keys(W).forEach(function (k) {
    var e = winEl(k); apply(k);
    e.addEventListener('pointerdown', function () { focusWin(k); });
    q('.title-bar-controls button', e).addEventListener('click', function () { closeWin(k); });
    var bar = q('.title-bar', e), drag = null;
    bar.style.touchAction = 'none';
    bar.addEventListener('pointerdown', function (ev) {
      if (ev.button !== 0 || ev.target.closest('button')) return;
      drag = { sx: ev.clientX, sy: ev.clientY, ox: W[k].x, oy: W[k].y };
      try { bar.setPointerCapture(ev.pointerId); } catch (err) {}
    });
    bar.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      W[k].x = Math.max(0, Math.round(drag.ox + (ev.clientX - drag.sx) / Z));
      W[k].y = Math.max(0, Math.round(drag.oy + (ev.clientY - drag.sy) / Z));
      apply(k);
    });
    function end() { drag = null; }
    bar.addEventListener('pointerup', end); bar.addEventListener('pointercancel', end);
  });
  qa('[data-open]').forEach(function (b) { b.addEventListener('click', function () { openWin(b.getAttribute('data-open')); }); });
  qa('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeWin(b.getAttribute('data-close')); }); });

  /* ---------- desktop icons ---------- */
  var icons = [
    { id: 'portrait', label: 'portrait.jpg', ico: 'ico-image', kind: 'app' },
    { id: 'talks', label: 'talks', ico: 'ico-presenter', kind: 'app' },
    { id: 'clock', label: 'clock.exe', ico: 'ico-clock', kind: 'app' },
    { id: 'contact', label: 'help', ico: 'ico-help', kind: 'app' },
    { id: 'radio', label: 'winamp', ico: 'ico-winamp', kind: 'app' },
    { id: 'ura', label: 'Ura Design', ico: 'ico-browser', kind: 'link', href: 'https://ura.design', dock: 2 },
    { id: 'linkedin', label: 'LinkedIn', ico: 'ico-network', kind: 'ph', title: 'coming soon!!', dock: 1 },
    { id: 'github', label: 'GitHub', ico: 'ico-git', kind: 'ph', title: 'coming soon!!', dock: 0 }
  ];
  var iconPos = store.get('icons') || {};
  var justDragged = false;
  var iconBox = q('#icons');
  icons.forEach(function (def, idx) {
    var wrap = document.createElement('div');
    wrap.className = 'dicon'; wrap.setAttribute('role', 'listitem');
    var inner;
    if (def.kind === 'app') { inner = document.createElement('button'); inner.type = 'button'; }
    else if (def.kind === 'link') { inner = document.createElement('a'); inner.href = def.href; inner.target = '_blank'; inner.rel = 'noopener'; inner.draggable = false; }
    else { inner = document.createElement('span'); inner.setAttribute('role', 'link'); inner.setAttribute('aria-disabled', 'true'); inner.title = def.title; }
    inner.className = 'icon' + (def.kind === 'ph' ? ' is-ph' : '');
    inner.innerHTML = '<span class="ico ' + def.ico + '" aria-hidden="true"></span><span class="lbl"></span>';
    q('.lbl', inner).textContent = def.label;
    wrap.appendChild(inner); iconBox.appendChild(wrap);
    function pos() {
      if (iconPos[def.id]) return iconPos[def.id];
      if (def.dock !== undefined) return { r: 12, b: 12 + def.dock * 64 };
      return { x: 12 + Math.floor(idx / 5) * 76, y: 12 + (idx % 5) * 64 };
    }
    function place() {
      var p = pos();
      if (p.r !== undefined) { wrap.style.left = 'auto'; wrap.style.top = 'auto'; wrap.style.right = p.r + 'px'; wrap.style.bottom = p.b + 'px'; }
      else { wrap.style.right = 'auto'; wrap.style.bottom = 'auto'; wrap.style.left = p.x + 'px'; wrap.style.top = p.y + 'px'; }
    }
    place();
    var d = null;
    wrap.addEventListener('pointerdown', function (ev) { if (ev.button !== 0) return; d = { sx: ev.clientX, sy: ev.clientY, p: pos(), moved: false, id: ev.pointerId }; });
    wrap.addEventListener('pointermove', function (ev) {
      if (!d) return;
      var dx = (ev.clientX - d.sx) / Z, dy = (ev.clientY - d.sy) / Z;
      if (!d.moved) {
        if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
        d.moved = true; wrap.classList.add('dragging'); wrap.style.zIndex = 2;
        try { wrap.setPointerCapture(d.id); } catch (err) {}
      }
      iconPos[def.id] = d.p.r !== undefined
        ? { r: Math.max(0, Math.round(d.p.r - dx)), b: Math.max(0, Math.round(d.p.b - dy)) }
        : { x: Math.max(0, Math.round(d.p.x + dx)), y: Math.max(0, Math.round(d.p.y + dy)) };
      place();
    });
    function up() {
      if (d && d.moved) {
        justDragged = true; setTimeout(function () { justDragged = false; }, 0);
        wrap.classList.remove('dragging'); wrap.style.zIndex = '';
        store.set('icons', iconPos);
      }
      d = null;
    }
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
    inner.addEventListener('click', function (ev) {
      if (justDragged) { ev.preventDefault(); return; }
      if (def.kind === 'app') openWin(def.id);
    });
  });

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
    q('#clock-caption').textContent = date + ', ' + time;
  }
  tick(); setInterval(tick, 1000);

  /* ---------- media player ---------- */
  var talks = [
    { title: 'Identifying and Addressing Usability Vulnerabilities', meta: 'FOSS Backstage 2026, Berlin', where: 'Berlin', video: 'vctZaoDzq2k', url: 'https://www.youtube.com/watch?v=vctZaoDzq2k', openLabel: 'watch on youtube' },
    { title: 'Speaker at FOSDEM 2026', meta: 'FOSDEM 2026, Brussels', where: 'Brussels', url: 'https://fosdem.org/2026/schedule/speaker/elio_qoshi', openLabel: 'go there' }
  ];
  var ti = 0, ytPlaying = false, ytStarted = false, ytReady = false, ytQueued = null, ytWait = 0;
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
        // controls=0 hides YouTube's own bar; the player buttons below drive it instead
        f.src = 'https://www.youtube.com/embed/' + t.video + '?enablejsapi=1&rel=0&controls=0&disablekb=1&fs=0&iv_load_policy=3&playsinline=1' +
          (location.protocol.indexOf('http') === 0 ? '&origin=' + encodeURIComponent(location.origin) : '');
        f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
        f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin';
        // twice the size, scaled to half: cancels .root98's zoom:2 so YouTube draws at its normal size
        f.style.cssText = 'display: block; width: 200%; height: 200%; border: 0; transform: scale(0.5); transform-origin: 0 0; pointer-events: none';
        // keep asking for player events until YouTube answers, like its own iframe API does
        f.addEventListener('load', function () {
          var tries = 0, ask = setInterval(function () {
            if (ytReady || ++tries > 40 || !f.isConnected) return clearInterval(ask);
            f.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 'talk-video' }), '*');
          }, 250);
        });
        // the poster sits over the video and takes every click, so the mouse never wakes
        // YouTube's overlays; it shows the thumbnail until the tape runs, then goes clear
        var poster = document.createElement('button');
        poster.type = 'button'; poster.className = 'talk-poster'; poster.setAttribute('aria-label', 'Play ' + t.title);
        poster.innerHTML = '<img alt="">';
        poster.firstChild.src = 'https://i.ytimg.com/vi/' + t.video + '/hqdefault.jpg';
        poster.addEventListener('click', function () { player(ytPlaying ? 'pauseVideo' : 'playVideo'); });
        screen.appendChild(f); screen.appendChild(poster);
        ytStarted = false; ytReady = false; ytQueued = null;
      }
    } else {
      screen.innerHTML = '<div style="height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 12px; text-align: center; color: #fff"><span class="ico ico-presenter" aria-hidden="true"></span><p style="margin: 0">no tape for this one :(</p><a class="btn98" target="_blank" rel="noopener">go there</a></div>';
      q('a', screen).href = t.url;
    }
    q('#talks-p').textContent = t.title; q('#talk-meta').textContent = t.meta;
    var open = q('#talk-open'); open.href = t.url; open.textContent = t.openLabel;
    ['#talk-play', '#talk-pause', '#talk-stop'].forEach(function (id) { q(id).disabled = !t.video; });
    q('#talk-count').textContent = (ti + 1) + '/' + talks.length;
    q('#talk-status').textContent = t.video ? (ytPlaying ? 'playing...' : 'ready.') : 'no tape';
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
  function pickTalk(i) { ti = (i + talks.length) % talks.length; ytPlaying = false; renderTalk(); }
  q('#talk-prev').addEventListener('click', function () { pickTalk(ti - 1); });
  q('#talk-next').addEventListener('click', function () { pickTalk(ti + 1); });
  function player(func) {
    ytSend(func); ytPlaying = func === 'playVideo'; if (ytPlaying) scCall('pause');
    clearTimeout(ytWait);
    if (ytPlaying) armFallback();
    if (func === 'stopVideo') { ytStarted = false; setPoster(true); }
    renderTalkStatus();
  }
  // if the browser blocks remote play (some phones), show YouTube's own tap target
  function armFallback() {
    if (ytReady) ytWait = setTimeout(function () {
      if (ytStarted) return;
      var p = q('#talk-screen .talk-poster'), f = q('#talk-video');
      if (p) p.hidden = true; if (f) f.style.pointerEvents = 'auto';
    }, 4000);
  }
  function setPoster(on) {
    var p = q('#talk-screen .talk-poster');
    if (!p) return;
    p.classList.toggle('clear', !on);
    p.setAttribute('aria-label', (on ? 'Play ' : 'Pause ') + talks[ti].title);
  }
  window.addEventListener('message', function (e) {
    if (!/^https:\/\/www\.youtube(-nocookie)?\.com$/.test(e.origin)) return;
    var d = e.data;
    try { if (typeof d === 'string') d = JSON.parse(d); } catch (err) { return; }
    if (!d || !d.event) return;
    if (!ytReady) {
      ytReady = true;
      if (ytQueued) { var c = ytQueued; ytQueued = null; ytSend(c); if (c === 'playVideo') { clearTimeout(ytWait); armFallback(); } }
    }
    var s = d.event === 'onStateChange' ? d.info : d.info && d.info.playerState;
    if (typeof s !== 'number') return;
    // 1 playing, 2 paused, 0 ended; the thumbnail hides YouTube's overlays whenever it is not playing
    if (s === 1) { ytStarted = true; ytPlaying = true; setPoster(false); scCall('pause'); }
    else if (s === 2) { ytPlaying = false; setPoster(true); }
    else if (s === 0) { ytPlaying = false; ytStarted = false; setPoster(true); }
    else return;
    renderTalkStatus();
  });
  function renderTalkStatus() { q('#talk-status').textContent = talks[ti].video ? (ytPlaying ? 'playing...' : 'ready.') : 'no tape'; }
  q('#talk-play').addEventListener('click', function () { player('playVideo'); });
  q('#talk-pause').addEventListener('click', function () { player('pauseVideo'); });
  q('#talk-stop').addEventListener('click', function () { player('stopVideo'); });

  /* ---------- winamp (SoundCloud widget) ---------- */
  var SET = 'https://soundcloud.com/dominic-gagn-1/sets/nine-inch-nails-ghosts-i-iv';
  var fm = { ready: false, playing: false, time: 0, dur: 0, vol: 80, seeking: false };
  function scCall(method, value) {
    var f = q('#sc-widget');
    if (!f || !f.contentWindow) return;
    var msg = value === undefined ? { method: method } : { method: method, value: value };
    f.contentWindow.postMessage(JSON.stringify(msg), 'https://w.soundcloud.com');
  }
  function fmt(t) { t = Math.max(0, Math.floor(t || 0)); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
  function renderFm() {
    q('#fm-time').textContent = fmt(fm.time);
    var seek = q('#fm-seek'); seek.max = Math.max(1, Math.round(fm.dur)); if (!fm.seeking) seek.value = Math.round(fm.time);
    q('#fm-ic-play').style.display = fm.playing ? 'none' : '';
    q('#fm-ic-pause').style.display = fm.playing ? '' : 'none';
    q('#fm-toggle').setAttribute('aria-label', fm.playing ? 'Pause' : 'Play');
  }
  function ensureRadio() {
    if (q('#sc-widget')) return;
    var f = document.createElement('iframe');
    f.id = 'sc-widget'; f.className = 'fm-widget'; f.title = 'SoundCloud player'; f.allow = 'autoplay'; f.tabIndex = -1; f.setAttribute('aria-hidden', 'true');
    f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(SET) + '&auto_play=false&buying=false&sharing=false&download=false&show_artwork=false&show_comments=false&show_playcount=false&show_user=false&single_active=true&visual=false';
    winEl('radio').appendChild(f);
    setTimeout(function () {
      if (!fm.ready) { q('#fm-title').textContent = 'can’t tune in here :('; q('#fm-sub').textContent = 'try the SoundCloud link below'; }
    }, 8000);
  }
  window.addEventListener('message', function (e) {
    if (e.origin !== 'https://w.soundcloud.com') return;
    var d = e.data;
    try { if (typeof d === 'string') d = JSON.parse(d); } catch (err) { return; }
    if (!d || !d.method) return;
    if (d.method === 'ready') {
      fm.ready = true;
      ['play', 'pause', 'finish', 'playProgress'].forEach(function (ev) { scCall('addEventListener', ev); });
      scCall('setVolume', fm.vol); scCall('getCurrentSound');
      q('#fm-sub').textContent = 'Nine Inch Nails, Ghosts I–IV';
    } else if (d.method === 'play') {
      fm.playing = true; scCall('getCurrentSound'); ytSend('pauseVideo'); ytPlaying = false; renderTalkStatus();
    } else if (d.method === 'pause' || d.method === 'finish') {
      fm.playing = false;
    } else if (d.method === 'playProgress' && d.value) {
      fm.time = (d.value.currentPosition || 0) / 1000;
    } else if (d.method === 'getCurrentSound' && d.value) {
      q('#fm-title').textContent = d.value.title || 'Ghosts I–IV';
      fm.dur = (d.value.duration || 0) / 1000;
      if (d.value.permalink_url) q('#fm-link').href = d.value.permalink_url;
    }
    renderFm();
  });
  q('#fm-toggle').addEventListener('click', function () { scCall(fm.playing ? 'pause' : 'play'); });
  q('#fm-prev').addEventListener('click', function () { scCall('prev'); });
  q('#fm-next').addEventListener('click', function () { scCall('next'); });
  var seek = q('#fm-seek');
  seek.addEventListener('input', function () { fm.seeking = true; q('#fm-time').textContent = fmt(Number(seek.value)); });
  seek.addEventListener('change', function () { fm.seeking = false; fm.time = Number(seek.value); scCall('seekTo', fm.time * 1000); renderFm(); });
  q('#fm-vol').addEventListener('input', function (e) { fm.vol = Number(e.target.value); scCall('setVolume', fm.vol); });
  renderFm();
})();
