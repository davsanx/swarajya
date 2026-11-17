'use strict';
/* Isometric renderer — every sprite is drawn procedurally on canvas */
(function () {
  const HW = G.HW, HH = G.HH, M = G.Map;
  const R = G.Render = {};
  const cam = G.cam = { x: 0, y: 0, z: 1 };
  let cv, ctx, W = 800, H = 600, dpr = 1;
  const PI = Math.PI;

  G.iso = (x, y) => [(x - y) * HW, (x + y) * HH];
  G.w2s = (x, y) => [((x - y) * HW - cam.x) * cam.z, ((x + y) * HH - cam.y) * cam.z];
  G.s2w = (sx, sy) => { const ix = sx / cam.z + cam.x, iy = sy / cam.z + cam.y; return [(ix / HW + iy / HH) / 2, (iy / HH - ix / HW) / 2]; };
  G.centerOn = (x, y) => { cam.x = (x - y) * HW - W / 2 / cam.z; cam.y = (x + y) * HH - (H - 170) / 2 / cam.z; };
  G.clampCam = function () {
    const N = M.N; if (!N) return;
    const c = G.s2w(W / 2, (H - 170) / 2);
    const x = Math.max(0, Math.min(N, c[0])), y = Math.max(0, Math.min(N, c[1]));
    if (x !== c[0] || y !== c[1]) G.centerOn(x, y);
  };

  /* ---------- sprites ---------- */
  const tiles = [], spr = {};
  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function mkTile(base, spk, seed) {
    const c = mk(2 * HW + 2, 2 * HH + 2), x = c.getContext('2d'), r = G.rng(seed);
    x.beginPath(); x.moveTo(HW + 1, 0); x.lineTo(2 * HW + 2, HH + 1); x.lineTo(HW + 1, 2 * HH + 2); x.lineTo(0, HH + 1); x.closePath();
    x.fillStyle = base; x.fill(); x.save(); x.clip();
    for (let i = 0; i < 30; i++) { x.fillStyle = spk[(r() * spk.length) | 0]; x.fillRect(r() * 66, r() * 34, 1 + r() * 3, 1 + r() * 1.4); }
    x.restore();
    return c;
  }
  function blob(x, cx, cy, r, col) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }
  function buildSprites() {
    const T = [
      [['#6c9a44', '#699641', '#70a048', '#66923f'], ['#7dab52', '#5c8838', '#86b35a']],
      [['#9a8a56', '#958551', '#a08f5b', '#90804e'], ['#ab9b66', '#857544', '#b3a36d']],
      [['#3d7ea6', '#3a7aa2', '#4083ab', '#38779e'], ['#5796bb', '#2f6b91', '#6aa6c9']],
      [['#5d5850', '#59544c', '#615c54', '#555048'], ['#6b665e', '#4a453e']],
      [['#d6c48e', '#d2c08a', '#dac893', '#cebc86'], ['#e3d3a2', '#c2b07a']],
      [['#b39868', '#af9464', '#b89d6d', '#aa8f60'], ['#c4aa7b', '#9a8055', '#8f7750']]
    ];
    for (let t = 0; t < 6; t++) { tiles[t] = []; for (let v = 0; v < 4; v++) tiles[t][v] = mkTile(T[t][0][v], T[t][1], 100 + t * 10 + v); }
    spr.tree = [];
    const greens = [['#2f6b2c', '#3f8438', '#57a148'], ['#2a6130', '#38793d', '#4c964f'], ['#3b6e24', '#54892f', '#73a63e']];
    for (let v = 0; v < 3; v++) {
      const c = mk(64, 84), x = c.getContext('2d'), g = greens[v], s = 1 + v * 0.08;
      x.fillStyle = 'rgba(0,0,0,.22)'; x.beginPath(); x.ellipse(32, 76, 15, 6, 0, 0, 7); x.fill();
      x.fillStyle = '#5b3d22'; x.fillRect(29.5, 50, 5, 27); x.fillStyle = '#74512f'; x.fillRect(29.5, 50, 2, 27);
      blob(x, 32, 44, 19 * s, g[0]); blob(x, 22, 38, 12 * s, g[0]); blob(x, 43, 40, 12 * s, g[0]);
      blob(x, 27, 33, 12 * s, g[1]); blob(x, 39, 30, 11 * s, g[1]); blob(x, 31, 24 - v * 2, 10 * s, g[1]);
      blob(x, 27, 26, 6 * s, g[2]); blob(x, 37, 23, 5 * s, g[2]); blob(x, 21, 36, 4, g[2]);
      spr.tree[v] = c;
    }
    { const c = mk(44, 34), x = c.getContext('2d');
      x.fillStyle = 'rgba(0,0,0,.2)'; x.beginPath(); x.ellipse(22, 27, 16, 6, 0, 0, 7); x.fill();
      blob(x, 15, 20, 9, '#3f7d2c'); blob(x, 28, 19, 10, '#3f7d2c'); blob(x, 22, 14, 9, '#4f9336'); blob(x, 29, 16, 6, '#62a843');
      for (const p of [[14, 17], [20, 12], [26, 20], [31, 14], [18, 23], [24, 16], [33, 21]]) blob(x, p[0], p[1], 2, '#d8442b');
      spr.bush = c; }
    function rocks(base, lit, dark, gems) {
      const c = mk(56, 42), x = c.getContext('2d');
      x.fillStyle = 'rgba(0,0,0,.22)'; x.beginPath(); x.ellipse(28, 33, 22, 8, 0, 0, 7); x.fill();
      const poly = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.fill(); };
      poly([[8, 32], [12, 18], [22, 12], [30, 20], [28, 34]], base); poly([[12, 18], [22, 12], [20, 22]], lit); poly([[20, 22], [30, 20], [28, 34], [8, 32]], dark);
      poly([[26, 34], [30, 16], [40, 10], [48, 22], [46, 35]], base); poly([[30, 16], [40, 10], [38, 22]], lit); poly([[38, 22], [48, 22], [46, 35], [26, 34]], dark);
      if (gems) for (const p of [[16, 20], [22, 27], [34, 18], [41, 26], [36, 30], [13, 28], [43, 16]]) { x.fillStyle = gems; x.fillRect(p[0], p[1], 3.5, 2.5); x.fillStyle = '#fff6b8'; x.fillRect(p[0], p[1], 1.5, 1); }
      return c;
    }
    spr.gold = rocks('#8d7a52', '#a8946a', '#6e5d3c', '#f5c62a');
    spr.stone = rocks('#9a9a98', '#bcbcb9', '#737371', null);
    spr.rock = [];
    for (let v = 0; v < 3; v++) {
      const c = mk(74, 64), x = c.getContext('2d'), r = G.rng(40 + v);
      const pk = 10 + r() * 12, px = 28 + r() * 18;
      const poly = (pts, col) => { x.fillStyle = col; x.beginPath(); pts.forEach((p, i) => i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1])); x.fill(); };
      poly([[4, 46], [14, 26], [px, pk], [58, 22], [70, 46], [37, 62]], '#59544c');
      poly([[4, 46], [14, 26], [px, pk], [px - 4, 40], [37, 62]], '#6d675d');
      poly([[14, 26], [px, pk], [px - 6, 30]], '#857e72');
      poly([[px, pk], [58, 22], [50, 34]], '#4b463f');
      x.fillStyle = '#5f8a3c'; x.fillRect(16, 27, 9, 2); x.fillRect(px - 2, pk + 1, 7, 2);
      spr.rock[v] = c;
    }
  }

  /* ---------- drawing helpers ---------- */
  function poly(c, pts, col) { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
  function box(c, x, y, e, h, lift, ct, cl, cr) {
    const tX = (x - y) * HW, tY = (x + y) * HH - lift, w = e * HW, d = e * HH;
    poly(c, [tX - w, tY + d, tX, tY + 2 * d, tX, tY + 2 * d - h, tX - w, tY + d - h], cl);
    poly(c, [tX, tY + 2 * d, tX + w, tY + d, tX + w, tY + d - h, tX, tY + 2 * d - h], cr);
    poly(c, [tX, tY - h, tX + w, tY + d - h, tX, tY + 2 * d - h, tX - w, tY + d - h], ct);
  }
  function roof(c, x, y, e, h, rh, cl, cr, cb) {
    const tX = (x - y) * HW, tY = (x + y) * HH - h, w = e * HW, d = e * HH;
    const ax = tX - w / 2, ay = tY + d / 2 - rh, bx = tX + w / 2, by = tY + 1.5 * d - rh;
    poly(c, [tX, tY, tX + w, tY + d, bx, by, ax, ay], cb);
    poly(c, [tX - w, tY + d, tX, tY + 2 * d, bx, by, ax, ay], cl);
    poly(c, [tX, tY + 2 * d, tX + w, tY + d, bx, by], cr);
  }
  function dome(c, cx, cy, r, col, dk) {
    c.fillStyle = col; c.beginPath(); c.moveTo(cx - r, cy);
    c.bezierCurveTo(cx - r * 1.2, cy - r * 0.9, cx - r * 0.35, cy - r * 1.25, cx, cy - r * 1.65);
    c.bezierCurveTo(cx + r * 0.35, cy - r * 1.25, cx + r * 1.2, cy - r * 0.9, cx + r, cy); c.closePath(); c.fill();
    c.fillStyle = dk; c.beginPath(); c.moveTo(cx + r * 0.2, cy);
    c.bezierCurveTo(cx + r * 0.75, cy - r * 0.8, cx + r * 0.3, cy - r * 1.25, cx, cy - r * 1.65);
    c.bezierCurveTo(cx + r * 0.35, cy - r * 1.25, cx + r * 1.2, cy - r * 0.9, cx + r, cy); c.closePath(); c.fill();
    c.fillStyle = '#d8b64a'; c.fillRect(cx - 0.8, cy - r * 1.65 - 6, 1.6, 7);
  }
  function flag(c, x, y, h, f, time) {
    c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - h); c.stroke();
    const wv = Math.sin(time * 3 + x * 0.1) * 1.5, ty = y - h;
    c.fillStyle = f.flag;
    if (f.style === 'maratha') poly(c, [x, ty, x + 15, ty + 2 + wv, x + 8, ty + 5.5, x + 15, ty + 9 + wv, x, ty + 11], f.flag);
    else { poly(c, [x, ty, x + 14, ty + 1 + wv, x + 14, ty + 9 + wv, x, ty + 10], f.flag); c.fillStyle = '#f4e9c4'; c.beginPath(); c.arc(x + 7, ty + 5 + wv * 0.5, 2.2, 0, 7); c.fill(); }
  }
  const ctr = (tx, ty, s) => [(tx - ty) * HW, (tx + ty + s) * HH];

  /* ---------- buildings ---------- */
  function drawBldShape(c, type, tx, ty, s, f, time, prog) {
    const p = f.pal, m = f.style === 'maratha', C = ctr(tx, ty, s), cx = C[0], cy = C[1];
    switch (type) {
      case 'tc':
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 22, 0, p.wt, p.wl, p.wr);
        if (m) {
          box(c, tx + 0.75, ty + 0.75, s - 1.5, 20, 22, p.pl, p.pl, p.pr);
          roof(c, tx + 0.55, ty + 0.55, s - 1.1, 42, 16, p.roof, p.roofd, p.roofd);
          poly(c, [cx - 50, cy + 14, cx - 38, cy + 20, cx - 38, cy + 5, cx - 44, cy - 2, cx - 50, cy + 2], '#2b1d12');
          for (let i = 0; i < 3; i++) { c.fillStyle = '#3d2a18'; c.fillRect(cx - 34 + i * 12, cy - 12 + i * 6, 5, 8); c.fillRect(cx + 12 + i * 12, cy + 2 - i * 6, 5, 8); }
          flag(c, cx, cy - 66, 26, f, time);
        } else {
          box(c, tx + 0.8, ty + 0.8, s - 1.6, 18, 22, p.pl, p.pl, p.pr);
          dome(c, cx, cy - 40, 24, p.roof, p.roofd);
          for (const q of [[-64, 0], [64, 0], [0, 32], [0, -32]]) {
            c.fillStyle = p.wl; c.fillRect(cx + q[0] * 0.82 - 4, cy + q[1] * 0.82 - 44, 8, 40);
            dome(c, cx + q[0] * 0.82, cy + q[1] * 0.82 - 44, 5.5, p.roof, p.roofd);
          }
          poly(c, [cx - 48, cy + 15, cx - 36, cy + 21, cx - 36, cy + 6, cx - 42, cy - 1, cx - 48, cy + 3], '#1f1711');
          flag(c, cx, cy - 86, 22, f, time);
        }
        break;
      case 'house':
        if (m) { box(c, tx + 0.25, ty + 0.25, s - 0.5, 12, 0, '#c9a878', '#c9a878', '#a58960'); roof(c, tx + 0.1, ty + 0.1, s - 0.2, 12, 13, '#b8923f', '#8f6f2c', '#8f6f2c'); c.fillStyle = '#4a321d'; c.fillRect(cx - 22, cy + 4, 6, 9); }
        else { box(c, tx + 0.25, ty + 0.25, s - 0.5, 16, 0, p.pl, p.pl, p.pr); box(c, tx + 0.2, ty + 0.2, s - 0.4, 3, 16, p.wt, p.wl, p.wr); c.fillStyle = '#33261a'; c.fillRect(cx - 22, cy + 2, 6, 10); }
        break;
      case 'farm': {
        const a = ctr(tx, ty, 0);
        poly(c, [a[0], a[1] + 3, a[0] + s * HW - 6, a[1] + s * HH, a[0], a[1] + 2 * s * HH - 3, a[0] - s * HW + 6, a[1] + s * HH], '#7a5a34');
        c.strokeStyle = prog < 1 ? '#8a6a44' : '#9fc044'; c.lineWidth = 2.2;
        for (let i = 1; i < 6; i++) { const k = i / 6; c.beginPath(); c.moveTo(a[0] - s * HW * k + 4, a[1] + s * HH * k + 2); c.lineTo(a[0] + s * HW * (1 - k) - 4, a[1] + s * HH * (1 + k) - 2); c.stroke(); }
        break; }
      case 'kothar':
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 14, 0, p.pl, p.pl, p.pr); roof(c, tx + 0.1, ty + 0.1, s - 0.2, 14, 15, p.roof, p.roofd, p.roofd);
        c.fillStyle = '#d9c27a'; c.beginPath(); c.ellipse(cx - 30, cy + 9, 5, 4, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(cx - 22, cy + 13, 5, 4, 0, 0, 7); c.fill();
        break;
      case 'vakhar':
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 6, 0, '#8a6a40', '#7a5a34', '#63482a');
        for (const q of [[-0.6, 0], [0.6, 0], [0, 0.6], [0, -0.6]]) { c.fillStyle = '#5b3d22'; c.fillRect(cx + q[0] * HW * 1.3 - 2, cy + q[1] * HH * 1.3 - 26, 4, 22); }
        box(c, tx + 0.1, ty + 0.1, s - 0.2, 3, 24, '#b8923f', '#a07d33', '#8f6f2c');
        for (let i = 0; i < 3; i++) { c.fillStyle = '#6b4a2a'; c.fillRect(cx - 18 + i * 3, cy - 6 - i * 4, 22, 4); c.fillStyle = '#c9a070'; c.beginPath(); c.arc(cx - 18 + i * 3, cy - 4 - i * 4, 2, 0, 7); c.fill(); }
        break;
      case 'barracks':
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 18, 0, p.wt, p.wl, p.wr);
        box(c, tx + 0.9, ty + 0.9, s - 1.8, 12, 18, p.pl, p.pl, p.pr);
        if (m) roof(c, tx + 0.75, ty + 0.75, s - 1.5, 30, 10, p.roof, p.roofd, p.roofd); else dome(c, cx, cy - 30, 12, p.roof, p.roofd);
        c.strokeStyle = '#ddd'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 44, cy + 2); c.lineTo(cx - 32, cy - 12); c.moveTo(cx - 32, cy + 2); c.lineTo(cx - 44, cy - 12); c.stroke();
        flag(c, cx + 30, cy - 10, 24, f, time);
        break;
      case 'range':
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 6, 0, '#b7a67a', p.wl, p.wr);
        box(c, tx + 0.3, ty + 0.3, 1.2, 16, 6, p.pl, p.pl, p.pr); roof(c, tx + 0.2, ty + 0.2, 1.4, 22, 8, p.roof, p.roofd, p.roofd);
        for (const q of [[10, 2], [34, -8]]) { c.fillStyle = '#5b3d22'; c.fillRect(cx + q[0] - 1, cy + q[1] - 8, 2, 10); c.fillStyle = '#f2ead8'; c.beginPath(); c.ellipse(cx + q[0], cy + q[1] - 14, 5, 7, 0, 0, 7); c.fill(); c.fillStyle = '#c9342a'; c.beginPath(); c.ellipse(cx + q[0], cy + q[1] - 14, 2.5, 3.5, 0, 0, 7); c.fill(); }
        break;
      case 'stable':
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 14, 0, p.pl, p.pl, p.pr); roof(c, tx + 0.1, ty + 0.1, s - 0.2, 14, 14, p.roof, p.roofd, p.roofd);
        for (let i = 0; i < 3; i++) { c.fillStyle = '#3a2716'; c.fillRect(cx - 74 + i * 24, cy - 6 + i * 12, 12, 13); }
        c.fillStyle = '#7a5230'; c.beginPath(); c.ellipse(cx - 20, cy + 26, 7, 4, 0, 0, 7); c.fill(); c.fillRect(cx - 16, cy + 17, 3, 8); c.beginPath(); c.ellipse(cx - 13, cy + 16, 4, 2.5, 0.4, 0, 7); c.fill();
        break;
      case 'siege':
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 16, 0, p.wt, p.wl, p.wr);
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 3, 16, '#6a625a', '#57504a', '#463f3a');
        c.fillStyle = '#2a2a2c'; c.save(); c.translate(cx, cy - 24); c.rotate(-0.35); c.fillRect(-14, -4, 30, 8); c.restore();
        blob(c, cx - 8, cy - 18, 6, '#4a3622'); blob(c, cx - 8, cy - 18, 2, '#2a1d12');
        flag(c, cx + 34, cy - 14, 22, f, time);
        break;
      case 'smith':
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 14, 0, p.wt, p.wl, p.wr); roof(c, tx + 0.1, ty + 0.1, s - 0.2, 14, 10, '#5c5049', '#463c36', '#463c36');
        c.fillStyle = '#4a433d'; c.fillRect(cx + 8, cy - 46, 9, 26);
        c.fillStyle = 'rgba(255,' + (120 + Math.sin(time * 6) * 40 | 0) + ',40,.9)'; c.beginPath(); c.arc(cx + 12.5, cy - 47, 4, 0, 7); c.fill();
        c.fillStyle = '#ff8a2a'; c.fillRect(cx - 24, cy + 5, 7, 7);
        break;
      case 'market':
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 4, 0, '#b7a67a', p.wl, p.wr);
        [[0.4, 0.4, '#c9342a'], [1.6, 0.5, f.c], [0.5, 1.6, '#e3b23c'], [1.6, 1.6, '#3f8f6a']].forEach(q => {
          box(c, tx + q[0], ty + q[1], 0.9, 10, 4, '#8a6a40', '#7a5a34', '#63482a');
          roof(c, tx + q[0] - 0.12, ty + q[1] - 0.12, 1.14, 14, 8, q[2], '#f1e6cf', '#00000033');
        });
        break;
      case 'temple':
        box(c, tx + 0.2, ty + 0.2, s - 0.4, 8, 0, p.wt, p.wl, p.wr);
        box(c, tx + 0.8, ty + 0.8, s - 1.6, 16, 8, '#cdbf9f', '#bfae8a', '#9c8d6c');
        poly(c, [cx - 15, cy - 24, cx - 11, cy - 46, cx - 5, cy - 62, cx, cy - 70, cx + 5, cy - 62, cx + 11, cy - 46, cx + 15, cy - 24], '#bfae8a');
        poly(c, [cx + 2, cy - 24, cx + 3, cy - 46, cx + 2, cy - 62, cx, cy - 70, cx + 5, cy - 62, cx + 11, cy - 46, cx + 15, cy - 24], '#9c8d6c');
        blob(c, cx, cy - 72, 3, '#e3b23c');
        flag(c, cx, cy - 74, 16, { flag: '#ff8a00', style: 'maratha' }, time);
        c.fillStyle = '#2b1d12'; c.fillRect(cx - 22, cy + 0, 7, 11);
        break;
      case 'tower':
        box(c, tx + 0.14, ty + 0.14, 0.72, 44, 0, p.wt, p.wl, p.wr);
        box(c, tx + 0.04, ty + 0.04, 0.92, 7, 44, p.wt, p.wl, p.wr);
        c.fillStyle = '#1c1612'; c.fillRect(cx - 12, cy - 30, 3, 8); c.fillRect(cx + 9, cy - 30, 3, 8);
        if (m) flag(c, cx, cy - 51, 16, f, time); else dome(c, cx, cy - 51, 7, p.roof, p.roofd);
        break;
      case 'wall':
        box(c, tx, ty, 1, 20, 0, p.wt, p.wl, p.wr);
        c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(cx - 20, cy - 12, 6, 1.5); c.fillRect(cx + 10, cy - 10, 8, 1.5); c.fillRect(cx - 4, cy - 2, 7, 1.5);
        break;
    }
  }
  R.drawBldShape = drawBldShape;

  /* ---------- units ---------- */
  function human(c, col, o) {
    const a = o.walk ? Math.sin(o.anim) * 2.4 : 0;
    c.fillStyle = o.leg || '#efe3c8';
    c.fillRect(-3.2 + a * 0.5, -8, 2.7, 8); c.fillRect(0.5 - a * 0.5, -8, 2.7, 8);
    c.fillStyle = col; c.fillRect(-4.2, -17.5, 8.4, 10.5);
    c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(-4.2, -10.5, 8.4, 1.6);
    c.fillStyle = '#a86f45'; c.beginPath(); c.arc(0.3, -20.3, 3.1, 0, 7); c.fill();
    c.fillStyle = o.turban; c.beginPath(); c.arc(0.3, -21.4, 3.6, PI, 0); c.fill(); c.fillRect(-3.3, -22, 7.2, 1.7);
    if (o.peak) poly(c, [-2.2, -24, 1.2, -28.5, 3.4, -24], o.turban);
  }
  function horse(c, col, o) {
    const a = o.walk ? Math.sin(o.anim) * 3 : 0;
    c.strokeStyle = col; c.lineWidth = 2.2; c.beginPath();
    c.moveTo(-8, -9); c.lineTo(-9 - a, 0); c.moveTo(-5, -9); c.lineTo(-4 + a, 0); c.moveTo(6, -9); c.lineTo(5 + a, 0); c.moveTo(9, -9); c.lineTo(10 - a, 0); c.stroke();
    c.fillStyle = col; c.beginPath(); c.ellipse(0, -12, 11.5, 5.6, 0, 0, 7); c.fill();
    poly(c, [8, -15, 14, -24, 18, -23, 19, -19, 15, -18, 12, -11], col);
    c.strokeStyle = o.mane || '#2a1c10'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(9, -16); c.lineTo(14, -24); c.moveTo(-11, -13); c.lineTo(-15, -6 + a * 0.5); c.stroke();
    if (o.cloth) { c.fillStyle = o.cloth; c.fillRect(-5, -16.5, 9, 6); }
  }
  const HORSES = ['#6b4526', '#4a2f1a', '#8a5a30', '#3a2a22', '#7a6248'];
  function unitShape(c, shape, f, o) {
    const col = f.c, tb = f.l, hc = HORSES[(o.id || 0) % HORSES.length];
    const swing = o.atk ? -0.9 : 0;
    switch (shape) {
      case 'vill':
        human(c, '#eadcbe', { anim: o.anim, walk: o.walk, turban: col, leg: '#d9c9a6' });
        if (o.work) { c.save(); c.translate(4, -13); c.rotate(Math.sin(o.anim) * 0.7 - 0.3); c.strokeStyle = '#5b3d22'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(7, -7); c.stroke(); c.fillStyle = '#999'; c.fillRect(5, -9.5, 4, 3); c.restore(); }
        if (o.carry) { c.fillStyle = o.carry === 'w' ? '#7a5230' : o.carry === 'f' ? '#d9c27a' : o.carry === 'g' ? '#f5c62a' : '#a9a9a6'; c.fillRect(-7.5, -17, 4.5, 6); }
        break;
      case 'sword':
        human(c, col, { anim: o.anim, walk: o.walk, turban: tb });
        blob(c, -4, -12.5, 4, f.d); blob(c, -4, -12.5, 1.3, '#e3c36a');
        c.save(); c.translate(4.5, -13); c.rotate(swing); c.strokeStyle = '#e6e6e6'; c.lineWidth = 1.7; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(5, -5, 6, -10); c.stroke(); c.restore();
        break;
      case 'spear':
        human(c, col, { anim: o.anim, walk: o.walk, turban: tb });
        c.save(); c.translate(4, -10); c.rotate(o.atk ? 0.9 : 0.12); c.strokeStyle = '#6b4a2a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 8); c.lineTo(0, -19); c.stroke(); poly(c, [-1.8, -19, 0, -25, 1.8, -19], '#dcdcdc'); c.restore();
        break;
      case 'archer':
        human(c, col, { anim: o.anim, walk: o.walk, turban: tb });
        c.strokeStyle = '#6b4a2a'; c.lineWidth = 1.6; c.beginPath(); c.arc(4, -13.5, 7, -1.25, 1.25); c.stroke();
        c.strokeStyle = '#eee'; c.lineWidth = 0.7; c.beginPath(); c.moveTo(6.2, -20.1); c.lineTo(o.atk ? 3 : 6.2, -13.5); c.lineTo(6.2, -6.9); c.stroke();
        c.fillStyle = '#5b3d22'; c.fillRect(-6, -18, 2.5, 8);
        break;
      case 'gun':
        human(c, col, { anim: o.anim, walk: o.walk, turban: tb });
        c.save(); c.translate(1, -14); c.rotate(o.atk ? -0.05 : -0.5); c.fillStyle = '#4a321d'; c.fillRect(0, -1.2, 7, 2.6); c.fillStyle = '#2b2b2e'; c.fillRect(6, -0.9, 10, 1.7); c.restore();
        c.fillStyle = f.d; c.fillRect(-4.2, -16, 8.4, 2);
        break;
      case 'cav': case 'hcav':
        horse(c, hc, { anim: o.anim, walk: o.walk, cloth: shape === 'hcav' ? f.d : null });
        c.save(); c.translate(-1, -8.5); human(c, col, { anim: 0, walk: false, turban: tb, leg: col });
        if (shape === 'hcav') { c.fillStyle = '#b9b9b9'; c.fillRect(-4.2, -17.5, 8.4, 3.5); c.save(); c.translate(4, -11); c.rotate(o.atk ? 1.2 : 0.5); c.strokeStyle = '#6b4a2a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 6); c.lineTo(0, -20); c.stroke(); poly(c, [-1.6, -20, 0, -25, 1.6, -20], '#ddd'); c.restore(); }
        else { c.save(); c.translate(4.5, -13); c.rotate(swing); c.strokeStyle = '#e6e6e6'; c.lineWidth = 1.7; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(5, -5, 6, -10); c.stroke(); c.restore(); }
        c.restore();
        break;
      case 'cannon':
        c.fillStyle = col; c.fillRect(-10, -9, 12, 4);
        c.save(); c.translate(-2, -10); c.rotate(-0.22); c.fillStyle = '#2a2a2c'; c.fillRect(-6, -3.4, 23, 6.8); c.fillStyle = '#55554f'; c.fillRect(14, -4, 3, 8); c.fillRect(-6, -4, 2.5, 8); c.restore();
        blob(c, -3, -5, 5.6, '#4a3622'); blob(c, -3, -5, 3.6, '#7a5a34'); blob(c, -3, -5, 1.4, '#2a1d12');
        c.save(); c.translate(-13, 0); human(c, col, { anim: o.anim, walk: o.walk, turban: tb }); c.restore();
        break;
      case 'eleph': {
        const a = o.walk ? Math.sin(o.anim * 0.6) * 2 : 0;
        c.fillStyle = '#6f6a66'; c.fillRect(-11 + a, -9, 5, 9); c.fillRect(-3 - a, -9, 5, 9); c.fillRect(5 + a, -9, 5, 9); c.fillRect(11 - a, -9, 5, 9);
        c.fillStyle = '#7d7873'; c.beginPath(); c.ellipse(1, -18, 16, 11, 0, 0, 7); c.fill();
        blob(c, 16, -22, 8, '#7d7873'); c.fillStyle = '#6f6a66'; c.beginPath(); c.ellipse(12, -23, 4.5, 6.5, -0.3, 0, 7); c.fill();
        c.strokeStyle = '#7d7873'; c.lineWidth = 4; c.beginPath(); c.moveTo(21, -20); c.quadraticCurveTo(26, -12, 22, -5); c.stroke();
        c.strokeStyle = '#f4efe0'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(19, -17); c.lineTo(26, -14); c.stroke();
        c.fillStyle = col; c.fillRect(-9, -29, 18, 12); c.fillStyle = f.d; c.fillRect(-10, -33, 20, 5);
        c.fillStyle = '#e3b23c'; c.fillRect(-9, -18, 18, 1.5);
        c.save(); c.translate(0, -24); human(c, col, { anim: 0, walk: false, turban: tb, leg: col }); c.restore();
        break; }
      case 'shivaji':
        horse(c, '#e9e4da', { anim: o.anim, walk: o.walk, cloth: '#b3261e', mane: '#b9b2a4' });
        c.save(); c.translate(-1, -8.5);
        c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-5, -6); c.lineTo(-5, -40); c.stroke();
        poly(c, [-5, -40, -19, -38 + Math.sin(o.t * 3) * 1.5, -12, -34.5, -19, -31 + Math.sin(o.t * 3) * 1.5, -5, -29], '#ff8a00');
        human(c, '#f4f0e6', { anim: 0, walk: false, turban: '#ff8a00', leg: '#f4f0e6', peak: true });
        c.fillStyle = '#ff8a00'; c.fillRect(-4.2, -12.5, 8.4, 2.2); c.fillStyle = '#e3b23c'; c.fillRect(-1, -17.5, 2, 6);
        c.save(); c.translate(4.5, -13); c.rotate(swing); c.strokeStyle = '#f2f2f2'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -6, 7, -13); c.stroke(); c.fillStyle = '#e3b23c'; c.fillRect(-1.5, -1.5, 3, 3); c.restore();
        c.restore();
        break;
      case 'heroCav':
        horse(c, '#3a2a22', { anim: o.anim, walk: o.walk, cloth: f.d });
        c.save(); c.translate(-1, -8.5); human(c, col, { anim: 0, walk: false, turban: '#b3261e', leg: col });
        c.fillStyle = '#e3b23c'; c.fillRect(-4.2, -12.5, 8.4, 2);
        c.save(); c.translate(4.5, -13); c.rotate(swing); c.strokeStyle = '#f2f2f2'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -6, 7, -13); c.stroke(); c.restore();
        c.restore();
        break;
      case 'heroInf':
        c.scale(1.18, 1.18);
        human(c, col, { anim: o.anim, walk: o.walk, turban: '#b3261e' });
        blob(c, -4.5, -12.5, 5, '#3a2a1a'); blob(c, -4.5, -12.5, 3.4, '#b3261e'); blob(c, -4.5, -12.5, 1.3, '#e3c36a');
        c.fillStyle = '#e3b23c'; c.fillRect(-4.2, -12.5, 8.4, 2);
        c.save(); c.translate(4.5, -13); c.rotate(swing); c.strokeStyle = '#f2f2f2'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -6, 7, -13); c.stroke(); c.restore();
        break;
      case 'heroInf2':
        c.scale(1.22, 1.22);
        human(c, col, { anim: o.anim, walk: o.walk, turban: '#f4f0e6' });
        c.fillStyle = '#e3b23c'; c.fillRect(-4.2, -12.5, 8.4, 2);
        c.strokeStyle = '#f2f2f2'; c.lineWidth = 1.8;
        c.save(); c.translate(4.5, -13); c.rotate(o.atk ? -0.2 : 0.75); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -15); c.stroke(); c.fillStyle = '#8a8a8a'; c.fillRect(-1.6, -3, 3.2, 5); c.restore();
        c.save(); c.translate(-4.5, -13); c.rotate(o.atk ? 0.3 : -0.75); c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -15); c.stroke(); c.fillStyle = '#8a8a8a'; c.fillRect(-1.6, -3, 3.2, 5); c.restore();
        break;
      case 'cmdr':
        c.scale(1.2, 1.2);
        human(c, col, { anim: o.anim, walk: o.walk, turban: '#f4f0e6', leg: f.d });
        c.fillStyle = '#e3b23c'; c.fillRect(-4.2, -17.5, 8.4, 1.6); c.fillRect(-4.2, -12.5, 8.4, 2); blob(c, 0.3, -24.3, 1.3, '#e3b23c');
        c.fillStyle = '#2a1c10'; c.fillRect(-1.6, -18.8, 4, 2.4);
        c.save(); c.translate(4.5, -13); c.rotate(swing); c.strokeStyle = '#f2f2f2'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(7, -5, 8, -13); c.stroke(); c.restore();
        break;
      case 'cmdrCav':
        horse(c, '#2a2220', { anim: o.anim, walk: o.walk, cloth: f.d });
        c.save(); c.translate(-1, -8.5);
        c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.3; c.beginPath(); c.moveTo(-5, -6); c.lineTo(-5, -38); c.stroke(); poly(c, [-5, -38, -17, -37, -17, -29, -5, -28], f.flag);
        human(c, col, { anim: 0, walk: false, turban: '#f4f0e6', leg: col });
        c.fillStyle = '#e3b23c'; c.fillRect(-4.2, -17.5, 8.4, 1.6); c.fillRect(-4.2, -12.5, 8.4, 2);
        c.save(); c.translate(4.5, -13); c.rotate(swing); c.strokeStyle = '#f2f2f2'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(6, -6, 7, -13); c.stroke(); c.restore();
        c.restore();
        break;
    }
  }
  const TALL = { cav: 34, hcav: 38, eleph: 46, shivaji: 50, heroCav: 38, cmdrCav: 48, heroInf: 34, heroInf2: 36, cmdr: 36, cannon: 28 };

  function hpBar(c, x, y, w, frac, col) {
    c.fillStyle = 'rgba(0,0,0,.7)'; c.fillRect(x - w / 2 - 1, y - 1, w + 2, 5);
    c.fillStyle = frac > 0.5 ? col : frac > 0.25 ? '#e3b23c' : '#d8442b'; c.fillRect(x - w / 2, y, w * Math.max(0, frac), 3);
  }

  /* ---------- icons for the HUD ---------- */
  const icons = {};
  R.icon = function (kind, key, faction) {
    const id = kind + key + faction;
    if (icons[id]) return icons[id];
    const c = mk(96, 96), x = c.getContext('2d'), f = G.FACTIONS[faction];
    x.scale(2, 2);
    if (kind === 'u') {
      const d = G.UNITS[key], big = /cav|eleph|shivaji|cannon/i.test(d.shape);
      x.translate(big ? 22 : 24, big ? 42 : 40); const s = big ? 1.25 : 1.6; x.scale(s, s);
      unitShape(x, d.shape, f, { anim: 0, walk: false, id: 0, t: 0 });
    } else {
      const d = G.BLD[key], k = (key === 'tower' || key === 'wall' ? 30 : 42) / (2 * d.size * HW);
      x.translate(24, (key === 'tower' ? 40 : key === 'wall' ? 30 : d.size >= 3 ? 30 : 30) - d.size * HH * k); x.scale(k, k);
      drawBldShape(x, key, 0, 0, d.size, f, 0, 1);
    }
    return (icons[id] = c.toDataURL());
  };

  /* ---------- frame ---------- */
  R.init = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); buildSprites(); R.resize(); };
  R.resize = function () {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    R.W = W; R.H = H;
  };

  const list = [];
  R.draw = function (now) {
    const S = G.S, time = now / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#07090c'; ctx.fillRect(0, 0, cv.width, cv.height);
    if (!S) return;
    const z = cam.z * dpr, N = M.N, ex = M.explored, vis = M.visible, all = G.reveal, ui = G.ui;
    ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
    const c0 = G.s2w(0, 0), c1 = G.s2w(W, 0), c2 = G.s2w(0, H), c3 = G.s2w(W, H);
    const x0 = Math.max(0, Math.floor(Math.min(c0[0], c2[0])) - 2), x1 = Math.min(N - 1, Math.ceil(Math.max(c1[0], c3[0])) + 3);
    const y0 = Math.max(0, Math.floor(Math.min(c0[1], c1[1])) - 2), y1 = Math.min(N - 1, Math.ceil(Math.max(c2[1], c3[1])) + 3);
    const vx0 = cam.x - HW - 4, vx1 = cam.x + W / cam.z + HW + 4, vy0 = cam.y - 2 * HH - 4, vy1 = cam.y + H / cam.z + 70;
    list.length = 0;
    const fogT = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ix = (x - y) * HW, iy = (x + y) * HH;
      if (ix < vx0 || ix > vx1 || iy < vy0 || iy > vy1) continue;
      const i = y * N + x;
      if (!all && !ex[i]) continue;
      const t = M.terrain[i];
      ctx.drawImage(tiles[t][M.variant[i]], ix - HW - 1, iy - 1);
      if (t === 3) list.push({ d: x + y + 1, s: spr.rock[M.variant[i] % 3], x: ix - 37, y: iy + HH - 46 });
      const rt = M.resType[i];
      if (rt === 1) list.push({ d: x + y + 1, s: spr.tree[M.variant[i] % 3], x: ix - 32 + (M.variant[i] - 1.5) * 3, y: iy + HH - 76 });
      else if (rt === 2) list.push({ d: x + y + 1, s: spr.bush, x: ix - 22, y: iy + HH - 24 });
      else if (rt === 3) list.push({ d: x + y + 1, s: spr.gold, x: ix - 28, y: iy + HH - 30 });
      else if (rt === 4) list.push({ d: x + y + 1, s: spr.stone, x: ix - 28, y: iy + HH - 30 });
      if (!all && !vis[i]) fogT.push(ix, iy);
    }
    // ground markers
    for (const f of S.fx) {
      if (f.k === 'ring') { const p = G.iso(f.x, f.y), k = f.t / f.d; ctx.strokeStyle = f.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p[0], p[1], f.r * HW * k * 1.2, f.r * HH * k * 1.2, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (f.k === 'mark') { const p = G.iso(f.x, f.y), k = f.t / f.d; ctx.strokeStyle = f.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p[0], p[1], 16 * (1 - k) + 3, 8 * (1 - k) + 1.5, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (f.k === 'corpse') { const p = G.iso(f.x, f.y); ctx.globalAlpha = 0.6 * (1 - f.t / f.d); ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - 1, 9, 4, 0, 0, 7); ctx.fill(); ctx.fillStyle = f.c; ctx.fillRect(p[0] - 5, p[1] - 3, 8, 3); ctx.globalAlpha = 1; }
      else if (f.k === 'rubble') { const p = G.iso(f.x, f.y), a = 1 - f.t / f.d; ctx.globalAlpha = a; ctx.fillStyle = '#4a433d'; ctx.beginPath(); ctx.ellipse(p[0], p[1], f.s * 20, f.s * 10, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#6d665e'; for (let i = 0; i < 6; i++) ctx.fillRect(p[0] + Math.cos(i * 1.9) * f.s * 12 - 3, p[1] + Math.sin(i * 1.9) * f.s * 6 - 3, 7, 5); ctx.globalAlpha = 1; }
    }
    const selSet = ui ? ui.selSet : new Set();
    for (const e of S.ents) {
      if (e.dead) continue;
      const i = (e.y | 0) * N + (e.x | 0);
      if (e.team !== 0 && !all) { if (e.kind === 'u' ? !vis[i] : !ex[i]) continue; }
      const ix = (e.x - e.y) * HW, iy = (e.x + e.y) * HH;
      if (ix < vx0 - 130 || ix > vx1 + 130 || iy < vy0 - 60 || iy > vy1 + 90) continue;
      list.push({ d: e.x + e.y - (e.type === 'farm' ? 3 : 0), e });
    }
    list.sort((a, b) => a.d - b.d);
    for (const it of list) {
      if (it.s) { ctx.drawImage(it.s, it.x, it.y); continue; }
      const e = it.e, f = S.teams[e.team].f, sel = selSet.has(e.id);
      if (e.kind === 'b') {
        if (sel) { const a = ctr(e.tx, e.ty, 0), s = e.size; ctx.strokeStyle = e.team === 0 ? '#fff' : '#ff6a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + s * HW, a[1] + s * HH); ctx.lineTo(a[0], a[1] + 2 * s * HH); ctx.lineTo(a[0] - s * HW, a[1] + s * HH); ctx.closePath(); ctx.stroke(); }
        if (!e.done) ctx.globalAlpha = 0.4 + 0.6 * e.prog;
        drawBldShape(ctx, e.type, e.tx, e.ty, e.size, f, time, e.prog);
        ctx.globalAlpha = 1;
        const C = ctr(e.tx, e.ty, e.size);
        if (e.done && e.hp < e.maxhp * 0.55 && e.type !== 'farm') {
          for (let k = 0; k < (e.hp < e.maxhp * 0.25 ? 3 : 1) * Math.min(2, e.size); k++) {
            const fx = C[0] + Math.sin(k * 2.7 + e.id) * e.size * 12, fy = C[1] - e.def.ht * 0.45 + Math.cos(k * 1.9) * 6, fl = Math.sin(time * 9 + k) * 2;
            poly(ctx, [fx - 5, fy, fx - 2, fy - 9 - fl, fx, fy - 5, fx + 2, fy - 14 + fl, fx + 5, fy], '#ff7a1a'); poly(ctx, [fx - 2.5, fy, fx, fy - 7 + fl, fx + 2.5, fy], '#ffd23a');
          }
        }
        if (sel || (e.hp < e.maxhp && e.done) || !e.done) hpBar(ctx, C[0], C[1] - e.def.ht - 10, 22 + e.size * 10, e.hp / e.maxhp, e.team === 0 ? '#5fd35f' : '#e05a4a');
        if (sel && e.rally && e.team === 0) { const p = G.iso(e.rally.x, e.rally.y); flag(ctx, p[0], p[1], 20, f, time); }
      } else {
        const d = e.def, px = (e.x - e.y) * HW, py = (e.x + e.y) * HH, big = TALL[d.shape] ? 1 : 0;
        ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(px, py, big ? 13 : 7, big ? 5 : 3.2, 0, 0, 7); ctx.fill();
        if (d.hero) { ctx.strokeStyle = e.team === 0 ? 'rgba(255,200,80,.85)' : 'rgba(255,90,70,.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(px, py, 16, 7, 0, 0, 7); ctx.stroke(); }
        if (sel) { ctx.strokeStyle = e.team === 0 ? '#fff' : '#ff6a5a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(px, py, big ? 15 : 10, big ? 6.5 : 4.6, 0, 0, 7); ctx.stroke(); }
        if (e.rallyT > S.time) { ctx.fillStyle = 'rgba(255,150,30,.25)'; ctx.beginPath(); ctx.ellipse(px, py, 12, 5.5, 0, 0, 7); ctx.fill(); }
        ctx.save(); ctx.translate(px, py); const sc = d.big || 1; ctx.scale(e.dir * sc, sc);
        unitShape(ctx, d.shape, f, { anim: e.anim, walk: e.moving, work: e.working, carry: e.carry >= 1 ? e.ctype : null, atk: S.time - (e.atkAnim || -9) < 0.22, id: e.id, t: time });
        ctx.restore();
        if (sel || e.hp < e.maxhp) hpBar(ctx, px, py - (TALL[d.shape] || 30) * (d.big || 1) - 4, d.hero ? 30 : 20, e.hp / e.maxhp, e.team === 0 ? '#5fd35f' : '#e05a4a');
      }
    }
    // projectiles and effects
    for (const p of S.proj) {
      const k = Math.min(1, p.t / p.dur), q = G.iso(p.x, p.y), hgt = p.h0 * (1 - k) + 10 * k + Math.sin(k * PI) * (p.kind === 'shot' ? 2 : p.dur * 26);
      if (p.kind === 'ball') { ctx.fillStyle = '#1a1a1c'; ctx.beginPath(); ctx.arc(q[0], q[1] - hgt, 3.2, 0, 7); ctx.fill(); }
      else {
        const k2 = Math.max(0, k - 0.06), bx = p.sx + (p.tx - p.sx) * k2, by = p.sy + (p.ty - p.sy) * k2, q2 = G.iso(bx, by), h2 = p.h0 * (1 - k2) + 10 * k2 + Math.sin(k2 * PI) * (p.kind === 'shot' ? 2 : p.dur * 26);
        ctx.strokeStyle = p.kind === 'shot' ? '#ffe9a8' : '#3a2a1a'; ctx.lineWidth = p.kind === 'shot' ? 1.5 : 1.3; ctx.beginPath(); ctx.moveTo(q2[0], q2[1] - h2); ctx.lineTo(q[0], q[1] - hgt); ctx.stroke();
      }
    }
    for (const f of S.fx) {
      if (f.k === 'smoke') { const p = G.iso(f.x, f.y), k = f.t / f.d; ctx.fillStyle = 'rgba(230,230,225,' + (0.6 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1] - 16 - k * 14, 4 + k * 8, 0, 7); ctx.fill(); }
      else if (f.k === 'blast') { const p = G.iso(f.x, f.y), k = f.t / f.d; ctx.fillStyle = 'rgba(255,' + (190 - k * 120 | 0) + ',60,' + (0.8 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1] - 8, 5 + k * 16, 0, 7); ctx.fill(); }
    }
    // fog of war
    if (fogT.length) {
      ctx.fillStyle = 'rgba(6,8,18,.46)'; ctx.beginPath();
      for (let i = 0; i < fogT.length; i += 2) { const ix = fogT[i], iy = fogT[i + 1]; ctx.moveTo(ix, iy - 0.5); ctx.lineTo(ix + HW + 0.5, iy + HH); ctx.lineTo(ix, iy + 2 * HH + 0.5); ctx.lineTo(ix - HW - 0.5, iy + HH); ctx.closePath(); }
      ctx.fill();
    }
    // placement ghost
    if (ui && ui.placing) {
      const d = G.BLD[ui.placing], t = ui.placeTile;
      if (t) {
        const ok = G.canPlace(0, ui.placing, t[0], t[1]) && G.canAfford(S.teams[0], d.cost), a = ctr(t[0], t[1], 0), s = d.size;
        ctx.fillStyle = ok ? 'rgba(90,220,90,.35)' : 'rgba(230,60,50,.4)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + s * HW, a[1] + s * HH); ctx.lineTo(a[0], a[1] + 2 * s * HH); ctx.lineTo(a[0] - s * HW, a[1] + s * HH); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 0.6; drawBldShape(ctx, ui.placing, t[0], t[1], s, S.teams[0].f, time, 1); ctx.globalAlpha = 1;
      }
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (ui && ui.drag && ui.drag.box) {
      const d = ui.drag; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(255,255,255,.08)';
      ctx.fillRect(d.x0, d.y0, ui.mx - d.x0, ui.my - d.y0); ctx.strokeRect(d.x0 + 0.5, d.y0 + 0.5, ui.mx - d.x0, ui.my - d.y0);
    }
  };

  /* ---------- minimap ---------- */
  let mini, mctx, off, octx, img, miniT = 0;
  const TC = [[108, 154, 68], [154, 138, 86], [61, 126, 166], [78, 73, 66], [214, 196, 142], [179, 152, 104]];
  const RC = [null, [38, 92, 40], [200, 70, 50], [245, 198, 42], [190, 190, 188]];
  function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
  R.initMini = function (canvas) { mini = canvas; mctx = mini.getContext('2d'); };
  R.drawMini = function (now) {
    const S = G.S; if (!S || !mini) return;
    const N = M.N;
    if (!off || off.width !== N) { off = mk(N, N); octx = off.getContext('2d'); img = octx.createImageData(N, N); miniT = 0; }
    if (now - miniT > 400) {
      miniT = now;
      const d = img.data, ex = M.explored, vis = M.visible, all = G.reveal;
      for (let i = 0; i < N * N; i++) {
        const o = i * 4;
        if (!all && !ex[i]) { d[o] = 8; d[o + 1] = 9; d[o + 2] = 12; d[o + 3] = 255; continue; }
        const c = RC[M.resType[i]] || TC[M.terrain[i]], k = all || vis[i] ? 1 : 0.55;
        d[o] = c[0] * k; d[o + 1] = c[1] * k; d[o + 2] = c[2] * k; d[o + 3] = 255;
      }
      octx.putImageData(img, 0, 0);
      for (const e of S.ents) {
        if (e.dead) continue;
        const i = (e.y | 0) * N + (e.x | 0);
        if (e.team !== 0 && !all && (e.kind === 'u' ? !vis[i] : !ex[i])) continue;
        octx.fillStyle = e.def.hero && e.team === 0 ? '#fff' : S.teams[e.team].f.c;
        if (e.kind === 'b') octx.fillRect(e.tx, e.ty, e.size, e.size); else octx.fillRect((e.x | 0) - (e.def.hero ? 1 : 0), (e.y | 0) - (e.def.hero ? 1 : 0), e.def.hero ? 3 : 2, e.def.hero ? 3 : 2);
      }
    }
    const w = mini.width, h = mini.height, k = w / (2 * N);
    mctx.setTransform(1, 0, 0, 1, 0, 0); mctx.clearRect(0, 0, w, h);
    mctx.imageSmoothingEnabled = false;
    mctx.setTransform(k, k / 2, -k, k / 2, w / 2, 0);
    mctx.drawImage(off, 0, 0);
    mctx.setTransform(1, 0, 0, 1, 0, 0);
    const P = (x, y) => [w / 2 + (x - y) * k, (x + y) * k / 2];
    for (const pg of S.pings) { const a = (S.time - pg.t); if (a > 6) continue; const p = P(pg.x, pg.y); mctx.strokeStyle = 'rgba(255,60,40,' + (1 - a / 6) + ')'; mctx.lineWidth = 2; mctx.beginPath(); mctx.arc(p[0], p[1], 4 + (a * 6) % 12, 0, 7); mctx.stroke(); }
    const q = [G.s2w(0, 0), G.s2w(W, 0), G.s2w(W, H), G.s2w(0, H)].map(c => P(c[0], c[1]));
    mctx.strokeStyle = '#fff'; mctx.lineWidth = 1; mctx.beginPath(); mctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) mctx.lineTo(q[i][0], q[i][1]); mctx.closePath(); mctx.stroke();
  };
  R.miniToWorld = function (mx, my) {
    const N = M.N, k = mini.width / (2 * N), a = (mx - mini.width / 2) / k, b = my / (k / 2);
    return [(a + b) / 2, (b - a) / 2];
  };
})();
