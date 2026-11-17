'use strict';
/* Isometric pixel-art renderer. Sprites are generated in code at native pixel scale,
   then replaced by painted art from assets/ when the manifest lists it. */
(function () {
  const HW = G.HW, HH = G.HH, M = G.Map, PI = Math.PI;
  const R = G.Render = {};
  const cam = G.cam = { x: 0, y: 0, z: 1 };
  let cv, ctx, W = 800, H = 600;

  G.iso = (x, y) => [(x - y) * HW, (x + y) * HH];
  G.w2s = (x, y) => [((x - y) * HW - cam.x) * cam.z, ((x + y) * HH - cam.y) * cam.z];
  G.s2w = (sx, sy) => { const ix = sx / cam.z + cam.x, iy = sy / cam.z + cam.y; return [(ix / HW + iy / HH) / 2, (iy / HH - ix / HW) / 2]; };
  G.centerOn = (x, y) => { cam.x = (x - y) * HW - W / 2 / cam.z; cam.y = (x + y) * HH - (H - 190) / 2 / cam.z; };
  G.clampCam = function () {
    const N = M.N; if (!N) return;
    const c = G.s2w(W / 2, (H - 190) / 2);
    const x = Math.max(0, Math.min(N, c[0])), y = Math.max(0, Math.min(N, c[1]));
    if (x !== c[0] || y !== c[1]) G.centerOn(x, y);
  };

  /* ================= low-level pixel helpers ================= */
  function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.ceil(w); c.height = Math.ceil(h); return c; }
  const rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const css = (c, k) => 'rgb(' + Math.min(255, c[0] * k | 0) + ',' + Math.min(255, c[1] * k | 0) + ',' + Math.min(255, c[2] * k | 0) + ')';
  function hash(x, y, s) { let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1274126177)) | 0; n = Math.imul(n ^ (n >>> 13), 1274126177); return ((n ^ (n >>> 16)) >>> 0) / 4294967296; }
  function pnoise(seed, P) {
    const g = new Float32Array(P * P), r = G.rng(seed);
    for (let i = 0; i < g.length; i++) g[i] = r();
    return function (u, v) {
      const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const xa = ((x0 % P) + P) % P, xb = (xa + 1) % P, ya = ((y0 % P) + P) % P, yb = (ya + 1) % P;
      const a = g[ya * P + xa], b = g[ya * P + xb], c = g[yb * P + xa], d = g[yb * P + xb];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }
  function fbm(seed, size, cells) {
    const a = pnoise(seed, cells), b = pnoise(seed + 1, cells * 2), c = pnoise(seed + 2, cells * 4);
    return (x, y) => a(x / size * cells, y / size * cells) * 0.55 + b(x / size * cells * 2, y / size * cells * 2) * 0.3 + c(x / size * cells * 4, y / size * cells * 4) * 0.15;
  }
  /* seamless banded-noise texture: the base of every ground and wall material */
  function tex(size, seed, pal, o) {
    o = o || {};
    const c = mk(size, size), x = c.getContext('2d'), im = x.createImageData(size, size), d = im.data;
    const f = fbm(seed, size, o.cells || 6), r = G.rng(seed + 9), P = pal.map(rgb), n = P.length;
    for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
      let v = (f(px, py) - 0.5) * (o.contrast || 2.1) + 0.5 + (r() - 0.5) * (o.grain == null ? 0.22 : o.grain);
      const p = P[Math.max(0, Math.min(n - 1, (v * n) | 0))], i = (py * size + px) * 4;
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
    if (o.deco) o.deco(x, r, size);
    return c;
  }
  /* 1px dark outline around a sprite's silhouette: the classic sprite edge */
  function outline(c, a) {
    const x = c.getContext('2d'), w = c.width, h = c.height, im = x.getImageData(0, 0, w, h), d = im.data, src = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) src[i] = d[i * 4 + 3];
    for (let y = 0; y < h; y++) for (let px = 0; px < w; px++) {
      const i = y * w + px;
      if (src[i] > 60) continue;
      if ((px > 0 && src[i - 1] > 150) || (px < w - 1 && src[i + 1] > 150) || (y > 0 && src[i - w] > 150) || (y < h - 1 && src[i + w] > 150)) { const o = i * 4; d[o] = 26; d[o + 1] = 17; d[o + 2] = 12; d[o + 3] = a || 215; }
    }
    x.putImageData(im, 0, 0);
    return c;
  }
  /* cast shadow: the sprite's own silhouette sheared along the ground, light from the upper right */
  function withShadow(body, baseY, alpha, len) {
    const pad = Math.ceil(body.height * (len || 0.55)) + 4, out = mk(body.width + pad, Math.max(body.height, baseY * 1.32) + 2), x = out.getContext('2d');
    const sil = mk(body.width, body.height), s = sil.getContext('2d');
    s.drawImage(body, 0, 0); s.globalCompositeOperation = 'source-in'; s.fillStyle = '#0a0806'; s.fillRect(0, 0, sil.width, sil.height);
    x.globalAlpha = alpha || 0.3;
    x.setTransform(1, 0, len || 0.55, -0.3, pad - (len || 0.55) * baseY, baseY * 1.3);
    x.drawImage(sil, 0, 0);
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1;
    x.drawImage(body, pad, 0);
    out.padX = pad; out.bw = body.width; out.bh = body.height;
    return out;
  }
  function poly(c, pts, col) { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.fill(); }
  function line(c, pts, col, w) { c.strokeStyle = col; c.lineWidth = w || 1; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.stroke(); }
  function blob(x, cx, cy, r, col) { x.fillStyle = col; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); }

  /* ================= materials ================= */
  const MATDEF = {
    basalt: ['#6f6a64', 'block'], basalt2: ['#7c756a', 'block'], sandstone: ['#ad5f48', 'block'], marble: ['#ece6da', 'smooth'],
    white: ['#e6dabd', 'plaster'], lime: ['#d6cdbb', 'plaster'], mud: ['#c39f6d', 'plaster'], redplaster: ['#b9644a', 'plaster'],
    tile: ['#b4573a', 'tile'], slate: ['#5d5650', 'tile'], thatch: ['#b9953f', 'thatch'], wood: ['#8a643c', 'plank'], darkwood: ['#5b3d24', 'plank'],
    earth: ['#8f7650', 'smooth'], paved: ['#a39a8a', 'block'], cloth: ['#c9342a', 'smooth'], iron: ['#3a3a3d', 'smooth']
  };
  const mats = {};
  function matTex(base, kind, k, seed) {
    const S = 32, c = mk(S, S), x = c.getContext('2d'), r = G.rng(seed), b = rgb(base);
    x.fillStyle = css(b, k); x.fillRect(0, 0, S, S);
    const spk = (n, lo, hi) => { for (let i = 0; i < n; i++) { x.fillStyle = css(b, k * (lo + r() * (hi - lo))); x.fillRect((r() * S) | 0, (r() * S) | 0, 1 + (r() * 2 | 0), 1); } };
    if (kind === 'block') {
      for (let row = 0; row < 4; row++) for (let col = 0; col < 3; col++) { x.fillStyle = css(b, k * (0.86 + r() * 0.26)); x.fillRect(col * 11 + (row % 2 ? 5 : 0) - 1, row * 8, 11, 8); if (row % 2 && col === 2) x.fillRect(-1, row * 8, 5, 8); }
      spk(70, 0.8, 1.18);
      x.fillStyle = css(b, k * 0.58);
      for (let row = 0; row < 4; row++) { x.fillRect(0, row * 8 + 7, S, 1); for (let col = 0; col < 3; col++) x.fillRect((col * 11 + (row % 2 ? 5 : 0) + 9) % S, row * 8, 1, 7); }
      x.fillStyle = css(b, k * 1.22); for (let row = 0; row < 4; row++) x.fillRect(0, row * 8, S, 1);
    } else if (kind === 'plaster') { spk(60, 0.9, 1.08); x.fillStyle = css(b, k * 0.84); for (let i = 0; i < 5; i++) x.fillRect((r() * S) | 0, (r() * S) | 0, 2 + (r() * 4 | 0), 1); }
    else if (kind === 'tile') {
      for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
        x.fillStyle = css(b, k * (0.84 + r() * 0.3)); x.fillRect(col * 4 + (row % 2 ? 2 : 0), row * 4, 4, 4);
        x.fillStyle = css(b, k * 0.6); x.fillRect(col * 4 + (row % 2 ? 2 : 0), row * 4 + 3, 4, 1); x.fillRect(col * 4 + (row % 2 ? 2 : 0) + 3, row * 4, 1, 3);
      }
    } else if (kind === 'thatch') { for (let i = 0; i < 260; i++) { x.fillStyle = css(b, k * (0.68 + r() * 0.5)); x.fillRect((r() * S) | 0, (r() * S) | 0, 1, 2 + (r() * 4 | 0)); } x.fillStyle = css(b, k * 0.6); x.fillRect(0, 15, S, 1); x.fillRect(0, 31, S, 1); }
    else if (kind === 'plank') { for (let row = 0; row < 6; row++) { x.fillStyle = css(b, k * (0.88 + r() * 0.24)); x.fillRect(0, row * 6 - 2, S, 6); } spk(50, 0.8, 1.15); x.fillStyle = css(b, k * 0.6); for (let row = 0; row < 6; row++) x.fillRect(0, row * 6 + 3, S, 1); }
    else spk(50, 0.9, 1.1);
    return c;
  }
  const SIDE = { T: 1.06, R: 0.92, L: 0.62, D: 0.46, F: 1 };
  function mat(c, name, side) {
    const id = name + side;
    if (!mats[id]) {
      const d = MATDEF[name] || [name, 'smooth'], p = c.createPattern(matTex(d[0], d[1], SIDE[side], name.length * 31 + side.charCodeAt(0)), 'repeat');
      p.setTransform(side === 'L' ? new DOMMatrix([1, 0.5, 0, 1, 0, 0]) : side === 'R' || side === 'D' ? new DOMMatrix([1, -0.5, 0, 1, 0, 0]) : side === 'T' ? new DOMMatrix([0.7, 0.35, -0.7, 0.35, 0, 0]) : new DOMMatrix());
      mats[id] = p;
    }
    return mats[id];
  }
  const EDGE = 'rgba(20,12,8,.55)', LIT = 'rgba(255,244,214,.3)';
  function box(c, x, y, e, h, lift, m, mt) {
    const tX = (x - y) * HW, tY = (x + y) * HH - (lift || 0), w = e * HW, d = e * HH;
    poly(c, [tX - w, tY + d, tX, tY + 2 * d, tX, tY + 2 * d - h, tX - w, tY + d - h], mat(c, m, 'L'));
    poly(c, [tX, tY + 2 * d, tX + w, tY + d, tX + w, tY + d - h, tX, tY + 2 * d - h], mat(c, m, 'R'));
    poly(c, [tX, tY - h, tX + w, tY + d - h, tX, tY + 2 * d - h, tX - w, tY + d - h], mat(c, mt || m, 'T'));
    line(c, [tX - w, tY + d - h, tX, tY + 2 * d - h, tX + w, tY + d - h], LIT);
    line(c, [tX, tY + 2 * d - h + 1, tX, tY + 2 * d], EDGE);
    line(c, [tX - w, tY + d, tX, tY + 2 * d, tX + w, tY + d], EDGE);
  }
  function roof(c, x, y, e, h, rh, m, gable) {
    const tX = (x - y) * HW, tY = (x + y) * HH - h, w = e * HW, d = e * HH;
    const ax = tX - w / 2, ay = tY + d / 2 - rh, bx = tX + w / 2, by = tY + 1.5 * d - rh;
    poly(c, [tX, tY, tX + w, tY + d, bx, by, ax, ay], mat(c, m, 'D'));
    poly(c, [tX - w, tY + d, tX, tY + 2 * d, bx, by, ax, ay], mat(c, m, 'L'));
    poly(c, [tX, tY + 2 * d, tX + w, tY + d, bx, by], mat(c, gable || 'white', 'R'));
    line(c, [ax, ay, bx, by], LIT, 1.5);
    line(c, [tX - w, tY + d, tX, tY + 2 * d, tX + w, tY + d], EDGE);
    line(c, [tX, tY + 2 * d, bx, by, tX + w, tY + d], EDGE);
  }
  /* an opening (door, window, arch) painted on the left or right wall of a box */
  function opening(c, x, y, e, lift, side, u, wu, b, hp, col, arch, frame) {
    const tX = (x - y) * HW, tY = (x + y) * HH - (lift || 0), w = e * HW, d = e * HH;
    const P = t => side === 'L' ? [tX - w + t * w, tY + d + t * d] : [tX + t * w, tY + 2 * d - t * d];
    const a = P(u), q = P(u + wu), m = P(u + wu / 2);
    const pts = [a[0], a[1] - b, q[0], q[1] - b, q[0], q[1] - b - hp];
    if (arch) pts.push(m[0], m[1] - b - hp - arch);
    pts.push(a[0], a[1] - b - hp);
    if (frame) { c.strokeStyle = frame; c.lineWidth = 2; c.beginPath(); c.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]); c.closePath(); c.stroke(); }
    poly(c, pts, col);
  }
  function windows(c, x, y, e, lift, side, n, b, hp, col, arch, frame) { for (let i = 0; i < n; i++) opening(c, x, y, e, lift, side, (i + 0.5) / n - 0.07, 0.14 * Math.min(1, 3 / n) + 0.02, b, hp, col, arch, frame); }
  function crenels(c, x, y, e, h, lift, m) {
    const n = Math.max(2, Math.round(e * 3.4)), s = 0.13;
    for (let i = 0; i < n; i++) { const t = (i + 0.3) / n * (e - s); box(c, x + t, y + e - s, s, 5, (lift || 0) + h, m); }
    for (let i = 0; i < n; i++) { const t = (i + 0.3) / n * (e - s); box(c, x + e - s, y + t, s, 5, (lift || 0) + h, m); }
  }
  function dome(c, cx, cy, r, col) {
    const b = rgb(col), g = c.createLinearGradient(cx - r, 0, cx + r, 0);
    g.addColorStop(0, css(b, 0.6)); g.addColorStop(0.55, css(b, 0.98)); g.addColorStop(0.8, css(b, 1.1)); g.addColorStop(1, css(b, 0.86));
    c.fillStyle = g; c.beginPath(); c.moveTo(cx - r, cy);
    c.bezierCurveTo(cx - r * 1.22, cy - r * 0.9, cx - r * 0.35, cy - r * 1.25, cx, cy - r * 1.7);
    c.bezierCurveTo(cx + r * 0.35, cy - r * 1.25, cx + r * 1.22, cy - r * 0.9, cx + r, cy); c.closePath(); c.fill();
    c.strokeStyle = EDGE; c.lineWidth = 1; c.stroke();
    c.fillStyle = css(b, 0.7); c.fillRect(cx - r, cy - 1, r * 2, 2);
    c.fillStyle = '#d8b64a'; c.fillRect(cx - 1, cy - r * 1.7 - 6, 2, 7); blob(c, cx, cy - r * 1.7 - 7, 1.6, '#f0d27a');
  }
  function flag(c, x, y, h, f, time) {
    c.fillStyle = '#2a1c10'; c.fillRect(Math.round(x) - 1, Math.round(y - h), 2, h);
    const wv = Math.round(Math.sin(time * 3 + x * 0.1) * 1.5), ty = Math.round(y - h), col = f.flag, dk = css(rgb(col), 0.72);
    if (f.style === 'maratha') { poly(c, [x, ty, x + 16, ty + 2 + wv, x + 9, ty + 6, x + 16, ty + 10 + wv, x, ty + 12], col); poly(c, [x, ty + 8, x + 12, ty + 9 + wv, x + 16, ty + 10 + wv, x, ty + 12], dk); }
    else { poly(c, [x, ty, x + 15, ty + 1 + wv, x + 15, ty + 10 + wv, x, ty + 11], col); poly(c, [x, ty + 7, x + 15, ty + 7 + wv, x + 15, ty + 10 + wv, x, ty + 11], dk); blob(c, x + 7, ty + 5 + wv * 0.5, 2.2, '#f4e9c4'); }
  }
  const ctr = (tx, ty, s) => [(tx - ty) * HW, (tx + ty + s) * HH];

  /* ================= buildings ================= */
  const FM = { maratha: { wall: 'basalt', pl: 'white', roof: 'tile', dome: '#e9e3d3' }, deccan: { wall: 'basalt2', pl: 'lime', roof: 'slate', dome: '#e9e3d3' }, mughal: { wall: 'sandstone', pl: 'marble', roof: 'sandstone', dome: '#f4f0e8' } };
  const DARK = '#1c120b', WIN = '#2a1a10';
  /* draws a building with its tile (0,0) top corner at the origin; pushes animated flag anchors into fl */
  function drawBld(c, type, s, f, fl) {
    const p = FM[f.style], m = f.style === 'maratha', C = ctr(0, 0, s), cx = C[0], cy = C[1], wall = p.wall, pl = p.pl;
    const turret = (x, y, e, h) => { box(c, x, y, e, h, 0, wall); crenels(c, x, y, e, h, 0, wall); if (!m) { const q = ctr(x, y, e); dome(c, q[0], q[1] - h - 4, e * 15, p.dome); } };
    switch (type) {
      case 'tc':
        turret(0, 0, 0.9, 30); turret(3.1, 0, 0.9, 30); turret(0, 3.1, 0.9, 30);
        box(c, 0.3, 0.3, 3.4, 20, 0, wall, 'paved'); crenels(c, 0.3, 0.3, 3.4, 20, 0, wall);
        opening(c, 0.3, 0.3, 3.4, 0, 'L', 0.4, 0.2, 0, 13, DARK, 5, m ? '#3a2718' : css(rgb(p.dome), 0.9));
        opening(c, 0.3, 0.3, 3.4, 0, 'L', 0.43, 0.14, 0, 11, '#5b3d24', 4);
        if (m) {
          box(c, 0.95, 0.95, 2.1, 15, 20, pl); windows(c, 0.95, 0.95, 2.1, 20, 'L', 4, 4, 7, WIN, 2); windows(c, 0.95, 0.95, 2.1, 20, 'R', 4, 4, 7, WIN, 2);
          box(c, 0.8, 0.8, 2.4, 4, 35, 'darkwood');
          box(c, 1.05, 1.05, 1.9, 13, 39, pl); windows(c, 1.05, 1.05, 1.9, 39, 'L', 5, 2, 8, '#3a2414', 2, '#5b3d24'); windows(c, 1.05, 1.05, 1.9, 39, 'R', 5, 2, 8, '#3a2414', 2, '#5b3d24');
          roof(c, 0.8, 0.8, 2.4, 52, 17, 'tile', pl);
          box(c, 1.7, 3.0, 0.6, 9, 20, 'darkwood'); roof(c, 1.6, 2.9, 0.8, 29, 6, 'tile', 'darkwood');
          fl.push([cx, cy - 78, 22]);
        } else {
          box(c, 0.9, 0.9, 2.2, 20, 20, pl); windows(c, 0.9, 0.9, 2.2, 20, 'L', 4, 3, 11, WIN, 4); windows(c, 0.9, 0.9, 2.2, 20, 'R', 4, 3, 11, WIN, 4);
          crenels(c, 0.9, 0.9, 2.2, 20, 20, pl);
          box(c, 1.35, 1.35, 1.3, 7, 40, pl);
          dome(c, cx, cy - 46, 25, p.dome);
          fl.push([cx, cy - 96, 18]);
        }
        turret(3.1, 3.1, 0.9, 30);
        break;
      case 'house':
        if (m) {
          box(c, 0.25, 0.25, 1.5, 12, 0, 'mud'); opening(c, 0.25, 0.25, 1.5, 0, 'L', 0.38, 0.2, 0, 9, '#4a2f18', 0, '#2a1a10'); opening(c, 0.25, 0.25, 1.5, 0, 'R', 0.55, 0.16, 4, 5, WIN);
          poly(c, [-48, 29, 0, 53, 0, 56, -48, 32], 'rgba(150,60,40,.55)');
          roof(c, 0.1, 0.1, 1.8, 12, 13, 'thatch', 'mud');
          blob(c, -30, 46, 3, '#a8603a'); blob(c, -30, 43, 2, '#8a4a2a'); blob(c, 28, 46, 2.6, '#a8603a');
        } else {
          box(c, 0.25, 0.25, 1.5, 17, 0, pl); opening(c, 0.25, 0.25, 1.5, 0, 'L', 0.38, 0.2, 0, 9, DARK, 4); windows(c, 0.25, 0.25, 1.5, 0, 'R', 2, 6, 6, WIN, 3);
          box(c, 0.2, 0.2, 1.6, 3, 17, wall); crenels(c, 0.2, 0.2, 1.6, 20, 0, wall);
        }
        break;
      case 'kothar':
        box(c, 0.15, 0.15, 1.7, 5, 0, wall); box(c, 0.3, 0.3, 1.4, 12, 5, pl); opening(c, 0.3, 0.3, 1.4, 5, 'L', 0.35, 0.3, 0, 9, DARK);
        roof(c, 0.18, 0.18, 1.64, 17, 14, m ? 'tile' : 'slate', pl);
        for (const q of [[-36, 47], [-28, 51], [-32, 43]]) { c.fillStyle = '#d9c27a'; c.beginPath(); c.ellipse(q[0], q[1], 5, 4, 0, 0, 7); c.fill(); c.fillStyle = '#b89c52'; c.fillRect(q[0] - 3, q[1] + 1, 6, 1); }
        blob(c, 24, 50, 4, '#a8603a'); blob(c, 24, 47, 2.5, '#7a3f22');
        break;
      case 'vakhar':
        box(c, 0.15, 0.15, 1.7, 3, 0, 'earth');
        for (const q of [[0.25, 0.25], [1.6, 0.25], [0.25, 1.6], [1.6, 1.6]]) box(c, q[0], q[1], 0.15, 24, 3, 'darkwood');
        for (let i = 0; i < 4; i++) { box(c, 0.5 + i * 0.05, 0.9 - i * 0.02, 0.9, 4, 3 + i * 4, 'wood'); blob(c, (0.5 + i * 0.05 - 0.9 - 0.9 + i * 0.02) * HW + 8, (0.5 + 0.9 + 0.9) * HH - 1 - i * 4, 2, '#d9b98a'); }
        box(c, 1.05, 0.5, 0.5, 7, 3, 'basalt');
        roof(c, 0.1, 0.1, 1.8, 27, 9, 'thatch', 'thatch');
        break;
      case 'barracks':
        box(c, 0.15, 0.15, 2.7, 13, 0, wall, 'earth'); crenels(c, 0.15, 0.15, 2.7, 13, 0, wall);
        opening(c, 0.15, 0.15, 2.7, 0, 'L', 0.4, 0.2, 0, 9, DARK, 3);
        box(c, 0.45, 0.45, 1.25, 12, 13, pl); windows(c, 0.45, 0.45, 1.25, 13, 'R', 2, 3, 6, WIN, 2); windows(c, 0.45, 0.45, 1.25, 13, 'L', 2, 3, 6, WIN, 2);
        if (m) roof(c, 0.35, 0.35, 1.45, 25, 10, 'tile', pl); else dome(c, (0.45 - 0.45) * HW, (0.9 + 1.25) * HH - 26, 13, p.dome);
        poly(c, [18, 44, 44, 31, 62, 40, 36, 53], '#a2573a');
        c.fillStyle = '#5b3d24'; c.fillRect(-12, 50, 2, 12); c.fillRect(2, 57, 2, 12); c.fillRect(-12, 52, 16, 2);
        line(c, [-8, 62, -6, 48], '#d9d9d9', 1.4); line(c, [-3, 64, -1, 50], '#d9d9d9', 1.4); blob(c, 9, 66, 4, f.d); blob(c, 9, 66, 1.4, '#e3c36a');
        fl.push([58, 22, 24]);
        break;
      case 'range':
        box(c, 0.15, 0.15, 2.7, 5, 0, wall, 'earth');
        box(c, 0.3, 0.3, 1.1, 14, 5, pl); opening(c, 0.3, 0.3, 1.1, 5, 'L', 0.3, 0.4, 0, 9, DARK, m ? 0 : 3);
        if (m) roof(c, 0.2, 0.2, 1.3, 19, 9, 'tile', pl); else dome(c, 0, (0.6 + 1.1) * HH - 20, 11, p.dome);
        for (const q of [[20, 48], [44, 36], [-2, 60]]) { c.fillStyle = '#5b3d24'; c.fillRect(q[0] - 1, q[1] - 6, 2, 9); c.fillStyle = '#d9c27a'; c.beginPath(); c.ellipse(q[0], q[1] - 12, 6, 8, 0, 0, 7); c.fill(); c.fillStyle = '#f2ead8'; c.beginPath(); c.ellipse(q[0], q[1] - 12, 4.4, 6, 0, 0, 7); c.fill(); c.fillStyle = '#c9342a'; c.beginPath(); c.ellipse(q[0], q[1] - 12, 2, 3, 0, 0, 7); c.fill(); }
        c.fillStyle = '#5b3d24'; c.fillRect(-52, 44, 2, 12); c.fillRect(-40, 50, 2, 12); c.fillRect(-52, 46, 14, 2);
        break;
      case 'stable':
        box(c, 0.2, 0.2, 2.6, 14, 0, pl); for (let i = 0; i < 4; i++) opening(c, 0.2, 0.2, 2.6, 0, 'L', 0.06 + i * 0.235, 0.18, 0, 10, '#2a1a10', m ? 0 : 3, '#5b3d24');
        windows(c, 0.2, 0.2, 2.6, 0, 'R', 3, 5, 5, WIN);
        roof(c, 0.08, 0.08, 2.84, 14, 15, m ? 'tile' : p.roof, pl);
        blob(c, 70, 62, 6, '#c9a94e'); blob(c, 64, 65, 5, '#b8963f'); blob(c, 75, 66, 4, '#d6b85a');
        break;
      case 'siege':
        box(c, 0.2, 0.2, 2.6, 18, 0, wall); opening(c, 0.2, 0.2, 2.6, 0, 'L', 0.32, 0.36, 0, 12, DARK, 4, '#3a2a1c');
        c.fillStyle = 'rgba(255,120,30,.75)'; opening(c, 0.2, 0.2, 2.6, 0, 'L', 0.42, 0.14, 0, 5, 'rgba(255,130,40,.8)');
        windows(c, 0.2, 0.2, 2.6, 0, 'R', 3, 7, 5, WIN, 2);
        box(c, 0.2, 0.2, 2.6, 3, 18, wall); crenels(c, 0.2, 0.2, 2.6, 21, 0, wall);
        box(c, 0.7, 0.7, 0.55, 26, 21, wall); c.fillStyle = 'rgba(40,36,34,.55)'; blob(c, 0, 0.0 * HH - 38 + (1.4 + 0.55) * HH - 14, 5, 'rgba(60,56,52,.6)');
        c.save(); c.translate(52, 66); c.fillStyle = '#5b3d24'; c.fillRect(-10, -4, 14, 5); c.rotate(-0.3); c.fillStyle = '#8a6a2c'; c.fillRect(-8, -7, 24, 6); c.fillStyle = '#c9a44e'; c.fillRect(14, -8, 3, 8); c.fillRect(-8, -8, 2, 8); c.restore();
        blob(c, 47, 66, 5, '#3a2a1c'); blob(c, 47, 66, 2, '#8a643c');
        for (const q of [[34, 75], [39, 75], [36.5, 71]]) blob(c, q[0], q[1], 2.6, '#2a2a2c');
        fl.push([-70, 26, 22]);
        break;
      case 'smith':
        box(c, 0.2, 0.2, 1.6, 14, 0, wall); opening(c, 0.2, 0.2, 1.6, 0, 'L', 0.25, 0.5, 0, 10, DARK); opening(c, 0.2, 0.2, 1.6, 0, 'L', 0.36, 0.22, 0, 6, '#ff8a2a'); opening(c, 0.2, 0.2, 1.6, 0, 'L', 0.42, 0.1, 0, 4, '#ffd76a');
        windows(c, 0.2, 0.2, 1.6, 0, 'R', 2, 5, 5, WIN);
        roof(c, 0.1, 0.1, 1.8, 14, 10, 'slate', wall);
        box(c, 1.25, 0.45, 0.32, 22, 14, wall);
        c.fillStyle = '#2a2a2c'; c.fillRect(-40, 43, 9, 3); c.fillRect(-38, 46, 5, 4); c.fillRect(-41, 50, 11, 2);
        line(c, [24, 40, 27, 28], '#d9d9d9', 1.4); line(c, [29, 38, 32, 26], '#d9d9d9', 1.4);
        break;
      case 'market':
        box(c, 0.1, 0.1, 2.8, 3, 0, 'paved');
        [[0.35, 0.35, '#c9342a'], [1.6, 0.4, f.c], [0.4, 1.6, '#e3b23c'], [1.6, 1.6, '#3f8f6a']].forEach((q, i) => {
          for (const k of [[0, 0], [0.8, 0], [0, 0.8], [0.8, 0.8]]) box(c, q[0] + k[0], q[1] + k[1], 0.08, 13, 3, 'darkwood');
          box(c, q[0] + 0.1, q[1] + 0.1, 0.7, 6, 3, 'wood');
          const b = ctr(q[0], q[1], 0.9);
          for (let j = 0; j < 4; j++) blob(c, b[0] - 8 + j * 5, b[1] - 9 - (j % 2) * 2, 2.4, ['#e3b23c', '#c9342a', '#6fae4a', '#d9c27a'][(i + j) % 4]);
          MATDEF['aw' + q[2]] = [q[2], 'plank']; roof(c, q[0] - 0.1, q[1] - 0.1, 1.1, 16, 8, 'aw' + q[2], 'aw' + q[2]);
        });
        break;
      case 'temple':
        box(c, 0.15, 0.15, 2.7, 6, 0, 'basalt', 'paved');
        box(c, 0.5, 1.5, 1.0, 12, 6, 'basalt'); for (let i = 0; i < 3; i++) opening(c, 0.5, 1.5, 1.0, 6, 'L', 0.08 + i * 0.31, 0.22, 0, 9, DARK); roof(c, 0.42, 1.42, 1.16, 18, 5, 'slate', 'basalt');
        box(c, 0.85, 0.5, 1.25, 16, 6, 'basalt'); opening(c, 0.85, 0.5, 1.25, 6, 'R', 0.35, 0.3, 0, 9, DARK, 3);
        { const q = ctr(0.85, 0.5, 1.25), x0 = q[0], y0 = q[1] - 22;
          for (let i = 0; i < 6; i++) { const w = 20 - i * 3, yy = y0 - i * 7; poly(c, [x0 - w, yy, x0, yy + w * 0.5, x0, yy + w * 0.5 - 7, x0 - w + 2, yy - 6], mat(c, 'basalt', 'L')); poly(c, [x0, yy + w * 0.5, x0 + w, yy, x0 + w - 2, yy - 6, x0, yy + w * 0.5 - 7], mat(c, 'basalt', 'R')); line(c, [x0 - w, yy, x0, yy + w * 0.5, x0 + w, yy], EDGE); }
          blob(c, x0, y0 - 44, 4, '#e3b23c'); blob(c, x0, y0 - 49, 2.2, '#f0d27a'); fl.push([x0, y0 - 50, 16, 1]); }
        for (let i = 0; i < 5; i++) { box(c, 2.25 + i * 0.02, 2.25 + i * 0.02, 0.34 - i * 0.04, 6, i * 6, 'basalt'); }
        blob(c, 0, 5 * HH - 1 + 0 - 32 + 2.42 * HH * 2 - 5 * HH, 2, '#ffb347');
        break;
      case 'tower':
        box(c, 0.14, 0.14, 0.72, 42, 0, wall); opening(c, 0.14, 0.14, 0.72, 0, 'L', 0.38, 0.24, 18, 7, DARK); opening(c, 0.14, 0.14, 0.72, 0, 'R', 0.38, 0.24, 18, 7, DARK); opening(c, 0.14, 0.14, 0.72, 0, 'L', 0.3, 0.4, 0, 8, DARK, 3);
        box(c, 0.03, 0.03, 0.94, 6, 42, wall); crenels(c, 0.03, 0.03, 0.94, 48, 0, wall);
        if (m) fl.push([cx, cy - 50, 16]); else dome(c, cx, cy - 50, 8, p.dome);
        break;
      case 'wall':
        box(c, 0, 0, 1, 20, 0, wall, 'paved'); crenels(c, 0, 0, 1, 20, 0, wall);
        break;
    }
  }
  const bldCache = {};
  function bldSprite(type, faction) {
    const id = faction + '_' + type;
    if (bldCache[id]) return bldCache[id];
    const d = G.BLD[type], s = d.size, f = G.FACTIONS[faction], art = R.art.buildings[id];
    const rec = { fl: [] };
    let body, ox, oy;
    if (art) {
      const w = Math.round(s * 2 * HW * 1.1), h = Math.round(art.height * w / art.width);
      body = mk(w, h); const b = body.getContext('2d'); b.imageSmoothingQuality = 'high'; b.drawImage(art, 0, 0, w, h);
      ox = w / 2; oy = h - 2 * s * HH - Math.round(s * 2.5);
    } else {
      const top = d.ht + 44; body = mk(s * 2 * HW + 24, s * 2 * HH + top + 8); ox = s * HW + 12; oy = top;
      const b = body.getContext('2d'); b.translate(ox, oy); b.imageSmoothingEnabled = false;
      drawBld(b, type, s, f, rec.fl);
      outline(body);
    }
    const sh = type === 'farm' ? null : withShadow(body, oy + 2 * s * HH - s * 6, 0.3, 0.5);
    rec.cv = sh || body; rec.ox = ox + (sh ? sh.padX : 0); rec.oy = oy; rec.art = !!art;
    return (bldCache[id] = rec);
  }
  function drawFarm(c, tx, ty, s, done) {
    const a = ctr(tx, ty, 0);
    c.save(); c.beginPath(); c.moveTo(a[0], a[1] + 2); c.lineTo(a[0] + s * HW - 4, a[1] + s * HH); c.lineTo(a[0], a[1] + 2 * s * HH - 2); c.lineTo(a[0] - s * HW + 4, a[1] + s * HH); c.closePath();
    c.fillStyle = '#6f5231'; c.fill(); c.clip();
    for (let i = 0; i < 9; i++) { const k = (i + 0.5) / 9, x0 = a[0] - s * HW * k, y0 = a[1] + s * HH * k, x1 = a[0] + s * HW * (1 - k), y1 = a[1] + s * HH * (1 + k); line(c, [x0, y0 + 1, x1, y1 + 1], '#523a20', 2); line(c, [x0, y0 - 1, x1, y1 - 1], done ? (i % 2 ? '#8fb53c' : '#a9c64a') : '#86683f', 2); if (done) for (let j = 1; j < 9; j++) { const t = j / 9; c.fillStyle = (i + j) % 3 ? '#c9d65a' : '#e3c84a'; c.fillRect(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t) - 4, 1, 3); } }
    c.restore();
    line(c, [a[0], a[1] + 2, a[0] + s * HW - 4, a[1] + s * HH, a[0], a[1] + 2 * s * HH - 2, a[0] - s * HW + 4, a[1] + s * HH, a[0], a[1] + 2], 'rgba(40,26,14,.6)');
  }

  /* ================= nature sprites ================= */
  const spr = { tree: [], rock: [] };
  function paintCrown(c, circles, pal, seed) {
    const x = c.getContext('2d'), w = c.width, h = c.height, im = x.getImageData(0, 0, w, h), d = im.data, P = pal.map(rgb), nz = pnoise(seed, 16);
    let cx = 0, cy = 0, R0 = 0; for (const q of circles) { cx += q[0]; cy += q[1]; R0 = Math.max(R0, q[2]); } cx /= circles.length; cy /= circles.length;
    for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
      let inside = false, best = 0;
      for (const q of circles) { const dd = (px - q[0]) * (px - q[0]) + (py - q[1]) * (py - q[1]); if (dd < q[2] * q[2]) { inside = true; best = Math.max(best, ((px - q[0]) * 0.8 - (py - q[1])) / q[2]); } }
      if (!inside) continue;
      let v = 0.42 + best * 0.3 + ((px - cx) - (py - cy) * 1.3) / (R0 * 5) + (nz(px / 4, py / 4) - 0.5) * 0.7 + (hash(px, py, seed) - 0.5) * 0.3;
      const p = P[Math.max(0, Math.min(P.length - 1, (v * P.length) | 0))], i = (py * w + px) * 4;
      d[i] = p[0]; d[i + 1] = p[1]; d[i + 2] = p[2]; d[i + 3] = 255;
    }
    x.putImageData(im, 0, 0);
  }
  function mkTree(v) {
    const c = mk(72, 96), x = c.getContext('2d');
    if (v === 3) {     // coconut palm
      x.strokeStyle = '#6b5236'; x.lineWidth = 4; x.beginPath(); x.moveTo(34, 92); x.quadraticCurveTo(30, 60, 38, 30); x.stroke();
      x.strokeStyle = '#8a6c48'; x.lineWidth = 1; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(31, 88 - i * 6.5); x.lineTo(36, 87 - i * 6.5); x.stroke(); }
      for (let i = 0; i < 9; i++) { const a = -PI / 2 + (i - 4) * 0.58, len = 26 + (i % 2) * 4, ex = 38 + Math.cos(a) * len, ey = 30 + Math.sin(a) * len * 0.55 + 12; x.strokeStyle = i % 2 ? '#3f7d2c' : '#2f6424'; x.lineWidth = 4; x.beginPath(); x.moveTo(38, 30); x.quadraticCurveTo(38 + Math.cos(a) * len * 0.6, 22 + Math.sin(a) * len * 0.3, ex, ey); x.stroke(); x.strokeStyle = '#6fae4a'; x.lineWidth = 1; x.beginPath(); x.moveTo(38, 29); x.quadraticCurveTo(38 + Math.cos(a) * len * 0.6, 20 + Math.sin(a) * len * 0.3, ex, ey - 2); x.stroke(); }
      blob(x, 36, 33, 2.6, '#5b3d22'); blob(x, 40, 34, 2.6, '#6b4a2a');
    } else {
      const trunkH = v === 2 ? 40 : 28, base = 92;
      x.fillStyle = v === 2 ? '#9a8a70' : '#5b3d22'; x.fillRect(33, base - trunkH, 6, trunkH);
      x.fillStyle = v === 2 ? '#7a6c56' : '#3f2a17'; x.fillRect(33, base - trunkH, 2, trunkH); x.fillRect(31, base - 3, 10, 3);
      if (v === 1) { x.fillStyle = '#4a3320'; x.fillRect(24, base - 22, 2, 22); x.fillRect(46, base - 20, 2, 20); x.fillRect(29, base - 18, 1, 18); }
      const sets = [
        [[36, 44, 21], [22, 50, 13], [50, 50, 13], [28, 34, 13], [44, 32, 12]],
        [[36, 48, 22], [17, 54, 13], [55, 54, 13], [26, 38, 14], [46, 36, 14], [36, 30, 11]],
        [[36, 38, 15], [26, 46, 10], [46, 46, 10], [34, 24, 11], [42, 30, 9]]
      ];
      const pals = [['#1f4a22', '#2a5c28', '#356d2e', '#458236', '#5a9a42', '#74b052'], ['#254f1f', '#316325', '#40782d', '#539037', '#6aa645', '#84ba58'], ['#3a5a1c', '#4b6f22', '#5f862a', '#789d34', '#93b344', '#afc85c']];
      paintCrown(c, sets[v], pals[v], 50 + v);
    }
    outline(c);
    return withShadow(c, 91, 0.3, 0.5);
  }
  function mkRocks(base, gems, seed) {
    const c = mk(60, 46), x = c.getContext('2d'), r = G.rng(seed), b = rgb(base);
    const rock = (cx, cy, w, h) => {
      poly(x, [cx - w, cy, cx - w * 0.6, cy - h * 0.7, cx, cy - h, cx + w * 0.7, cy - h * 0.6, cx + w, cy, cx, cy + h * 0.3], css(b, 0.8));
      poly(x, [cx, cy - h, cx + w * 0.7, cy - h * 0.6, cx + w, cy, cx + w * 0.2, cy - h * 0.2], css(b, 1.18));
      poly(x, [cx - w, cy, cx - w * 0.6, cy - h * 0.7, cx - w * 0.1, cy - h * 0.25, cx, cy + h * 0.3], css(b, 0.56));
      for (let i = 0; i < 16; i++) { x.fillStyle = css(b, 0.7 + r() * 0.6); x.fillRect(cx - w * 0.6 + r() * w * 1.3, cy - h * 0.8 + r() * h * 0.8, 1 + (r() * 2 | 0), 1); }
    };
    rock(18, 34, 13, 17); rock(40, 36, 15, 22); rock(29, 40, 10, 11);
    if (gems) for (let i = 0; i < 16; i++) { const gx = 9 + r() * 42, gy = 20 + r() * 18; x.fillStyle = gems; x.fillRect(gx | 0, gy | 0, 3, 2); x.fillStyle = '#fff3a8'; x.fillRect(gx | 0, gy | 0, 1, 1); }
    outline(c);
    return withShadow(c, 40, 0.28, 0.4);
  }
  function mkBush() {
    const c = mk(46, 36);
    paintCrown(c, [[14, 22, 9], [30, 21, 10], [22, 15, 9], [23, 25, 8]], ['#234f1f', '#2f6424', '#3f7d2c', '#56963a', '#6fae4a'], 77);
    const x = c.getContext('2d');
    for (const p of [[12, 19], [19, 12], [27, 21], [33, 15], [17, 25], [24, 17], [35, 23], [28, 27], [21, 21]]) { x.fillStyle = '#7a1f3a'; x.fillRect(p[0], p[1], 3, 3); x.fillStyle = '#d8446b'; x.fillRect(p[0], p[1], 2, 2); }
    outline(c);
    return withShadow(c, 31, 0.26, 0.35);
  }
  let groundTex = {}, pats = {}, strata = {}, cliffTop;
  const TP = 48;       // texture pixels per tile edge
  function buildSprites() {
    const G0 = ['#456f2e', '#4f7b33', '#5a8839', '#659440', '#71a048', '#7dab52'];
    const tuft = (dark, lite, n, fl) => (x, r, S) => {
      for (let i = 0; i < n; i++) { x.fillStyle = r() < 0.5 ? dark : lite; x.fillRect((r() * S) | 0, (r() * S) | 0, 1, 2 + (r() * 2 | 0)); }
      for (let i = 0; i < (fl || 0); i++) { const px = (r() * S) | 0, py = (r() * S) | 0; x.fillStyle = r() < 0.5 ? '#f3e06a' : '#f4f0e0'; x.fillRect(px, py, 2, 2); x.fillStyle = '#e39a3c'; x.fillRect(px, py, 1, 1); }
    };
    groundTex = {
      0: tex(384, 11, G0, { deco: tuft('#35591f', '#8fbd5e', 2600, 90) }),
      1: tex(384, 12, ['#7d7040', '#8a7b46', '#96874e', '#a39357', '#ae9e61', '#74813f'], { deco: tuft('#5f6a2c', '#c2b274', 1500, 0) }),
      2: tex(384, 13, ['#2a658c', '#306e96', '#3677a0', '#3d81aa', '#468bb4'], { cells: 5, grain: 0.1, deco: (x, r, S) => { for (let i = 0; i < 420; i++) { x.fillStyle = r() < 0.3 ? 'rgba(210,235,245,.5)' : 'rgba(120,180,210,.4)'; x.fillRect((r() * S) | 0, (r() * S) | 0, 3 + (r() * 6 | 0), 1); } } }),
      3: tex(384, 14, ['#3f3b35', '#48443d', '#514c45', '#5a554d'], {}),
      4: tex(384, 15, ['#c9b680', '#d2bf89', '#dac892', '#e2d09c', '#e9d8a6'], { grain: 0.12, deco: (x, r, S) => { for (let i = 0; i < 300; i++) { x.fillStyle = 'rgba(160,140,90,.35)'; x.fillRect((r() * S) | 0, (r() * S) | 0, 4 + (r() * 5 | 0), 1); } } }),
      5: tex(384, 16, ['#9a7d54', '#a5885d', '#b09366', '#ba9d70', '#c4a77a'], { deco: (x, r, S) => { for (let i = 0; i < 500; i++) { x.fillStyle = r() < 0.5 ? '#7d6442' : '#d6bd92'; x.fillRect((r() * S) | 0, (r() * S) | 0, 1 + (r() * 2 | 0), 1 + (r() * 2 | 0)); } } })
    };
    for (const k in groundTex) setPattern(+k, groundTex[k]);
    cliffTop = ctx.createPattern(tex(128, 21, ['#56663a', '#61723e', '#6c7d45', '#77774f', '#6b665a', '#7d8a4e'], { cells: 4 }), 'repeat');
    const st = k => { const c = mk(64, 64), x = c.getContext('2d'), r = G.rng(31), b = rgb('#6a645c'); x.fillStyle = css(b, k); x.fillRect(0, 0, 64, 64); let y = 0; while (y < 64) { const hh = 3 + (r() * 6 | 0); x.fillStyle = css(b, k * (0.78 + r() * 0.4)); x.fillRect(0, y, 64, hh); x.fillStyle = css(b, k * 0.55); x.fillRect(0, y + hh - 1, 64, 1); for (let i = 0; i < 5; i++) { x.fillStyle = css(b, k * (0.6 + r() * 0.7)); x.fillRect((r() * 64) | 0, y, 1 + (r() * 3 | 0), hh - 1); } y += hh; } for (let i = 0; i < 14; i++) { x.fillStyle = 'rgba(96,128,60,.55)'; x.fillRect((r() * 64) | 0, (r() * 64) | 0, 2 + (r() * 3 | 0), 1); } return ctx.createPattern(c, 'repeat'); };
    strata.L = st(0.6); strata.R = st(0.98);
    for (let v = 0; v < 4; v++) spr.tree[v] = mkTree(v);
    spr.bush = mkBush(); spr.gold = mkRocks('#8d7a52', '#f5c62a', 5); spr.stone = mkRocks('#8f8f8c', null, 6);
  }
  function setPattern(t, canvas) {
    const p = ctx.createPattern(canvas, 'repeat'); p.setTransform(new DOMMatrix().scale(1 / TP)); pats[t] = p; pats['c' + t] = canvas;
  }

  /* ================= units ================= */
  function human(c, col, o) {
    const a = o.walk ? Math.sin(o.anim) * 2.6 : 0, dk = css(rgb(col.length === 7 ? col : '#888888'), 0.7);
    c.fillStyle = '#3a2414'; c.fillRect(-3.4 + a * 0.5, -1.5, 3.2, 1.5); c.fillRect(0.4 - a * 0.5, -1.5, 3.2, 1.5);
    c.fillStyle = o.leg || '#efe3c8'; c.fillRect(-3.2 + a * 0.5, -8, 2.8, 6.5); c.fillRect(0.5 - a * 0.5, -8, 2.8, 6.5);
    c.fillStyle = col; c.fillRect(-4.4, -17.5, 8.8, 10.5);
    c.fillStyle = dk; c.fillRect(-4.4, -17.5, 2.6, 10.5);
    c.fillStyle = o.sash || 'rgba(0,0,0,.35)'; c.fillRect(-4.4, -10.6, 8.8, 1.8);
    c.fillStyle = '#9a6238'; c.fillRect(3.6, -16.5, 1.8, 6.5 - a * 0.4); c.fillRect(-5.4, -16.5, 1.8, 6 + a * 0.4);
    c.fillStyle = '#a86f45'; c.beginPath(); c.arc(0.3, -20.3, 3.2, 0, 7); c.fill();
    c.fillStyle = '#7a4a2a'; c.fillRect(-2.6, -21, 1.6, 3);
    c.fillStyle = '#20120a'; c.fillRect(1.9, -20.9, 1, 1); c.fillRect(0.6, -19, 2.6, 0.9);
    c.fillStyle = o.turban; c.beginPath(); c.arc(0.3, -21.6, 3.8, PI, 0); c.fill(); c.fillRect(-3.5, -22.2, 7.6, 1.9);
    c.fillStyle = 'rgba(0,0,0,.22)'; c.fillRect(-3.5, -22.2, 2.4, 1.9);
    if (o.peak) poly(c, [-2.4, -24.4, 1.4, -29, 3.6, -24.4], o.turban);
  }
  function horse(c, col, o) {
    const a = o.walk ? Math.sin(o.anim) * 3.2 : 0, b = rgb(col), dk = css(b, 0.66);
    c.strokeStyle = dk; c.lineWidth = 2.4; c.beginPath(); c.moveTo(-8, -9); c.lineTo(-9 - a, 0); c.moveTo(9, -9); c.lineTo(10 - a, 0); c.stroke();
    c.strokeStyle = col; c.beginPath(); c.moveTo(-5, -9); c.lineTo(-4 + a, 0); c.moveTo(6, -9); c.lineTo(5 + a, 0); c.stroke();
    c.fillStyle = col; c.beginPath(); c.ellipse(0, -12, 11.5, 5.8, 0, 0, 7); c.fill();
    c.fillStyle = dk; c.beginPath(); c.ellipse(-1, -9.6, 10, 3, 0, 0, PI); c.fill();
    poly(c, [8, -15, 14, -25, 18.5, -24, 20, -19.5, 16, -18, 12, -11], col);
    c.fillStyle = '#16100c'; c.fillRect(17, -22.6, 1.2, 1.2);
    line(c, [9, -16.5, 14, -25], o.mane || '#20140c', 2); line(c, [-11, -13, -15.5, -5 + a * 0.5], o.mane || '#20140c', 2);
    if (o.cloth) { c.fillStyle = o.cloth; c.fillRect(-5.5, -17, 10, 6.5); c.fillStyle = '#e3b23c'; c.fillRect(-5.5, -11.5, 10, 1); }
    line(c, [12, -17, 18, -21], '#3a2414', 1);
  }
  const HORSES = ['#6b4526', '#4a2f1a', '#8a5a30'];
  const sword = (c, sw, l, w) => { c.save(); c.translate(4.8, -13); c.rotate(sw); line(c, [0, 0, 4.5, -5, l || 6, -(l || 6) - 5], '#eef0f2', w || 1.8); c.fillStyle = '#e3b23c'; c.fillRect(-1.4, -1.4, 2.8, 2.8); c.restore(); };
  function unitShape(c, shape, f, o) {
    const col = f.c, tb = f.l, hc = HORSES[(o.id || 0) % 3], swing = o.atk ? -1.0 : 0;
    switch (shape) {
      case 'vill':
        human(c, '#eadcbe', { anim: o.anim, walk: o.walk, turban: col, leg: '#d9c9a6', sash: f.d });
        if (o.work) { c.save(); c.translate(4.6, -13); c.rotate(Math.sin(o.anim) * 0.8 - 0.3); line(c, [0, 0, 7, -7], '#5b3d22', 1.6); c.fillStyle = '#b9bcc0'; c.fillRect(5, -10, 4.5, 3); c.restore(); }
        if (o.carry) { c.fillStyle = o.carry === 'w' ? '#7a5230' : o.carry === 'f' ? '#d9c27a' : o.carry === 'g' ? '#f5c62a' : '#a9a9a6'; c.fillRect(-8.2, -18, 5, 6.5); c.fillStyle = 'rgba(0,0,0,.3)'; c.fillRect(-8.2, -13, 5, 1.5); }
        break;
      case 'sword':
        human(c, col, { anim: o.anim, walk: o.walk, turban: tb });
        blob(c, -4.4, -12.5, 4.3, '#3a2414'); blob(c, -4.4, -12.5, 3.3, f.d); blob(c, -4.4, -12.5, 1.3, '#e3c36a'); sword(c, swing);
        break;
      case 'spear':
        human(c, col, { anim: o.anim, walk: o.walk, turban: tb });
        c.save(); c.translate(4.6, -10); c.rotate(o.atk ? 0.95 : 0.12); line(c, [0, 8, 0, -20], '#6b4a2a', 1.6); poly(c, [-2, -20, 0, -27, 2, -20], '#e2e4e6'); c.fillStyle = f.flag; c.fillRect(0.8, -19, 3.5, 2.4); c.restore();
        break;
      case 'archer':
        human(c, col, { anim: o.anim, walk: o.walk, turban: tb });
        c.strokeStyle = '#6b4a2a'; c.lineWidth = 1.8; c.beginPath(); c.arc(4.5, -13.5, 7.5, -1.25, 1.25); c.stroke();
        line(c, [6.9, -20.6, o.atk ? 3 : 6.9, -13.5, 6.9, -6.4], '#f0f0f0', 0.8);
        c.fillStyle = '#5b3d22'; c.fillRect(-7, -18.5, 2.6, 8.5); c.fillStyle = '#e8e2d2'; c.fillRect(-7, -20, 2.6, 1.6);
        break;
      case 'gun':
        human(c, col, { anim: o.anim, walk: o.walk, turban: '#b3261e' });
        c.save(); c.translate(1, -14); c.rotate(o.atk ? -0.05 : -0.55); c.fillStyle = '#4a321d'; c.fillRect(0, -1.3, 7.5, 2.8); c.fillStyle = '#26262a'; c.fillRect(6.5, -1, 11, 1.8); c.fillStyle = '#c9a44e'; c.fillRect(9, -1, 1, 1.8); c.restore();
        c.fillStyle = '#3a2414'; c.fillRect(-4.4, -16.4, 8.8, 1.6);
        break;
      case 'cav': case 'hcav':
        horse(c, hc, { anim: o.anim, walk: o.walk, cloth: shape === 'hcav' ? f.d : null });
        c.save(); c.translate(-1, -8.5); human(c, col, { anim: 0, walk: false, turban: tb, leg: col });
        if (shape === 'hcav') { c.fillStyle = '#b9bcc0'; c.fillRect(-4.4, -17.5, 8.8, 4); c.fillStyle = '#8a8d92'; c.fillRect(-4.4, -17.5, 2.6, 4); c.save(); c.translate(4.6, -11); c.rotate(o.atk ? 1.25 : 0.5); line(c, [0, 6, 0, -21], '#6b4a2a', 1.6); poly(c, [-1.8, -21, 0, -27, 1.8, -21], '#e2e4e6'); c.fillStyle = f.flag; c.fillRect(0.8, -20, 4, 2.6); c.restore(); }
        else sword(c, swing);
        c.restore();
        break;
      case 'cannon':
        c.save(); c.translate(-14, 0); human(c, col, { anim: o.anim, walk: o.walk, turban: tb }); c.restore();
        c.fillStyle = '#5b3d24'; c.fillRect(-10, -9.5, 14, 4.5);
        c.save(); c.translate(-2, -10.5); c.rotate(-0.24); c.fillStyle = '#7a5c26'; c.fillRect(-6, -3.6, 24, 7.2); c.fillStyle = '#a8843c'; c.fillRect(-6, -3.6, 24, 2.4); c.fillStyle = '#d6b45a'; c.fillRect(15, -4.4, 3, 8.8); c.fillRect(-6, -4.4, 2.5, 8.8); c.fillRect(5, -4, 1.5, 8); c.restore();
        blob(c, -3, -5.5, 6, '#2a1c10'); blob(c, -3, -5.5, 4.6, '#7a5a34'); blob(c, -3, -5.5, 1.5, '#2a1d12'); line(c, [-7.4, -5.5, 1.4, -5.5], '#2a1c10'); line(c, [-3, -10, -3, -1], '#2a1c10');
        break;
      case 'eleph': {
        const a = o.walk ? Math.sin(o.anim * 0.6) * 2 : 0;
        c.fillStyle = '#5f5a56'; c.fillRect(-11 + a, -9, 5.5, 9); c.fillRect(11 - a, -9, 5.5, 9);
        c.fillStyle = '#74706b'; c.fillRect(-3 - a, -9, 5.5, 9); c.fillRect(5 + a, -9, 5.5, 9);
        c.fillStyle = '#827d78'; c.beginPath(); c.ellipse(1, -18, 16.5, 11, 0, 0, 7); c.fill();
        c.fillStyle = '#6a6561'; c.beginPath(); c.ellipse(-1, -13.5, 14, 5.5, 0, 0, PI); c.fill();
        blob(c, 16.5, -22, 8.2, '#827d78'); c.fillStyle = '#6a6561'; c.beginPath(); c.ellipse(12, -23, 4.6, 6.8, -0.3, 0, 7); c.fill();
        c.strokeStyle = '#827d78'; c.lineWidth = 4.2; c.beginPath(); c.moveTo(21.5, -20); c.quadraticCurveTo(27, -12, 22.5, -4); c.stroke();
        line(c, [19, -17, 26.5, -13.5], '#f6f1e2', 2); c.fillStyle = '#16100c'; c.fillRect(18.6, -24.4, 1.4, 1.4);
        c.fillStyle = '#9aa0a6'; c.fillRect(13, -29, 8, 5);
        c.fillStyle = col; c.fillRect(-10, -29.5, 19, 13); c.fillStyle = f.d; c.fillRect(-10, -20, 19, 3.5); c.fillStyle = '#e3b23c'; c.fillRect(-10, -17.5, 19, 1.5); c.fillRect(-10, -29.5, 19, 1.2);
        c.fillStyle = '#5b3d24'; c.fillRect(-10.5, -34.5, 20, 5);
        c.save(); c.translate(0, -25); human(c, col, { anim: 0, walk: false, turban: tb, leg: col }); c.restore();
        break; }
      case 'shivaji':
        horse(c, '#ece7dd', { anim: o.anim, walk: o.walk, cloth: '#b3261e', mane: '#b9b2a4' });
        c.save(); c.translate(-1, -8.5);
        c.fillStyle = '#2a1c10'; c.fillRect(-6, -41, 1.6, 35);
        { const w = Math.round(Math.sin((o.tf || 0) * 1.57) * 1.5); poly(c, [-6, -41, -21, -39 + w, -13, -35, -21, -31 + w, -6, -29], '#ff8a00'); poly(c, [-6, -33, -17, -32 + w, -21, -31 + w, -6, -29], '#d96a00'); }
        human(c, '#f6f2e8', { anim: 0, walk: false, turban: '#ff8a00', leg: '#f6f2e8', peak: true, sash: '#ff8a00' });
        c.fillStyle = '#e3b23c'; c.fillRect(-1, -17.5, 2, 6.5); c.fillRect(-3.5, -22.4, 7.6, 0.9); c.fillStyle = '#20120a'; c.fillRect(0.2, -19, 3.2, 2);
        sword(c, swing, 7.5, 2.2);
        c.restore();
        break;
      case 'heroCav':
        horse(c, '#33241c', { anim: o.anim, walk: o.walk, cloth: f.d });
        c.save(); c.translate(-1, -8.5); human(c, col, { anim: 0, walk: false, turban: '#8a1f1a', leg: col, sash: '#e3b23c' }); c.fillStyle = '#b9bcc0'; c.fillRect(-4.4, -17.5, 8.8, 2.4);
        c.save(); c.translate(4.6, -11); c.rotate(o.atk ? 1.25 : 0.45); line(c, [0, 6, 0, -23], '#6b4a2a', 1.8); poly(c, [-2, -23, 0, -30, 2, -23], '#eef0f2'); c.fillStyle = '#ff8a00'; c.fillRect(0.8, -22, 5, 3); c.restore();
        c.restore();
        break;
      case 'heroInf':
        c.scale(1.2, 1.2);
        human(c, col, { anim: o.anim, walk: o.walk, turban: '#8a1f1a', sash: '#e3b23c' });
        blob(c, -4.8, -12.5, 5.4, '#2a1c10'); blob(c, -4.8, -12.5, 4.2, '#7a2a1c'); for (const q of [[-6.3, -14], [-3.3, -14], [-6.3, -11], [-3.3, -11]]) blob(c, q[0], q[1], 0.8, '#e3c36a');
        sword(c, swing, 7, 2.2);
        break;
      case 'heroInf2':
        c.scale(1.24, 1.24);
        human(c, col, { anim: o.anim, walk: o.walk, turban: '#f6f2e8', sash: '#e3b23c' });
        c.fillStyle = '#9aa0a6'; c.fillRect(-4.4, -17.5, 8.8, 5);
        c.save(); c.translate(5, -13); c.rotate(o.atk ? -0.25 : 0.8); line(c, [0, 0, 0, -16], '#eef0f2', 2); c.fillStyle = '#8a8d92'; c.fillRect(-1.8, -3, 3.6, 5.5); c.restore();
        c.save(); c.translate(-5, -13); c.rotate(o.atk ? 0.35 : -0.8); line(c, [0, 0, 0, -16], '#eef0f2', 2); c.fillStyle = '#8a8d92'; c.fillRect(-1.8, -3, 3.6, 5.5); c.restore();
        break;
      case 'cmdr':
        c.scale(1.2, 1.2);
        human(c, col, { anim: o.anim, walk: o.walk, turban: '#f6f2e8', leg: f.d, sash: '#e3b23c' });
        c.fillStyle = '#e3b23c'; c.fillRect(-4.4, -17.5, 8.8, 1.6); blob(c, 0.3, -25, 1.5, '#e3b23c');
        c.fillStyle = '#16100c'; c.fillRect(-1.2, -19.2, 4.4, 2.8);
        sword(c, swing, 8, 2.4);
        break;
      case 'cmdrCav':
        horse(c, '#241c1a', { anim: o.anim, walk: o.walk, cloth: f.d });
        c.save(); c.translate(-1, -8.5);
        c.fillStyle = '#2a1c10'; c.fillRect(-6, -39, 1.6, 33); poly(c, [-6, -39, -19, -38, -19, -29, -6, -28], f.flag); blob(c, -12.5, -33.5, 2.2, '#f4e9c4');
        human(c, col, { anim: 0, walk: false, turban: '#f6f2e8', leg: col, sash: '#e3b23c' });
        c.fillStyle = '#e3b23c'; c.fillRect(-4.4, -17.5, 8.8, 1.6); c.fillStyle = '#16100c'; c.fillRect(-1.2, -19.2, 4.4, 2.8);
        sword(c, swing, 7, 2.2);
        c.restore();
        break;
    }
  }
  const US = 1.3, UW = 84, UH = 84, UAX = 42, UAY = 70;
  const TALL = { cav: 34, hcav: 40, eleph: 48, shivaji: 54, heroCav: 44, cmdrCav: 50, heroInf: 36, heroInf2: 38, cmdr: 37, cannon: 28 };
  const unitCache = new Map();
  function unitSprite(d, faction, o) {
    const fr = o.walk ? ((o.anim * 6 / (2 * PI)) | 0) % 6 : (o.work ? 6 + (((o.anim * 4 / (2 * PI)) | 0) % 4) : 0);
    const tf = d.shape === 'shivaji' ? o.tf : 0;
    const id = d.shape + '|' + faction + '|' + (o.walk ? 1 : 0) + fr + '|' + (o.atk ? 1 : 0) + (o.carry || '-') + (o.id % 3) + tf;
    let s = unitCache.get(id);
    if (!s) {
      s = mk(UW, UH); const c = s.getContext('2d'), k = US * (d.big || 1);
      c.translate(UAX, UAY); c.scale(k, k);
      unitShape(c, d.shape, G.FACTIONS[faction], { anim: fr * 2 * PI / 6 + 0.01, walk: o.walk, work: o.work, carry: o.carry, atk: o.atk, id: o.id, tf });
      outline(s);
      unitCache.set(id, s);
    }
    return s;
  }
  function hpBar(c, x, y, w, frac, col) {
    x = Math.round(x - w / 2); y = Math.round(y);
    c.fillStyle = '#120b07'; c.fillRect(x - 1, y - 1, w + 2, 5);
    c.fillStyle = frac > 0.5 ? col : frac > 0.25 ? '#e3b23c' : '#d8442b'; c.fillRect(x, y, Math.round(w * Math.max(0, frac)), 3);
    c.fillStyle = 'rgba(255,255,255,.35)'; c.fillRect(x, y, Math.round(w * Math.max(0, frac)), 1);
  }

  /* ================= painted art from assets/ ================= */
  R.art = { portraits: {}, buildings: {}, nature: {}, terrain: {}, ui: {} };
  R.loadArt = function (onChange) {
    const list = window.SWARAJYA_ASSETS || [];
    for (const p of list) {
      const m = /^(\w+)\/(.+)\.\w+$/.exec(p); if (!m) continue;
      const img = new Image();
      img.onload = () => {
        const cat = m[1], key = m[2];
        if (cat === 'portraits') { R.art.portraits[key] = img.src; for (const k in icons) delete icons[k]; }
        else if (cat === 'buildings') { R.art.buildings[key] = img; delete bldCache[key]; for (const k in icons) delete icons[k]; }
        else if (cat === 'nature') {
          const body = mk(img.width, img.height); body.getContext('2d').drawImage(img, 0, 0);
          const sp = withShadow(body, img.height - 4, 0.3, 0.45); sp.art = true;
          const t = /^tree(\d)$/.exec(key); if (t) spr.tree[+t[1] - 1] = sp; else spr[key] = sp;
        } else if (cat === 'terrain') { const t = { grass: 0, dry: 1, water: 2, basalt: 3, sand: 4, road: 5 }[key]; if (t != null && ctx) setPattern(t, img); }
        else if (cat === 'ui') R.art.ui[key] = img.src;
        if (R.onArt) R.onArt(cat, key);
      };
      img.src = 'assets/built/' + p;
    }
  };

  /* ================= HUD art: icons, glyphs, textures ================= */
  const icons = {};
  R.icon = function (kind, key, faction) {
    const id = kind + key + faction;
    if (icons[id]) return icons[id];
    if (kind === 'u') { const a = R.art.portraits[key] || (faction !== 'swarajya' && !G.UNITS[key].hero && key !== 'elephant' ? R.art.portraits.enemy_soldier : null); if (a) return (icons[id] = a); }
    const c = mk(64, 64), x = c.getContext('2d'), f = G.FACTIONS[faction];
    const g = x.createRadialGradient(32, 26, 4, 32, 32, 44); g.addColorStop(0, '#9a7a4e'); g.addColorStop(0.6, '#5a3c22'); g.addColorStop(1, '#2a160c'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    x.imageSmoothingEnabled = false;
    if (kind === 'u') {
      const d = G.UNITS[key], s = unitSprite(d, faction, { anim: 0, walk: false, id: 0, tf: 0 }), big = TALL[d.shape] > 33;
      x.fillStyle = 'rgba(0,0,0,.35)'; x.beginPath(); x.ellipse(32, 56, 20, 5, 0, 0, 7); x.fill();
      if (big) x.drawImage(s, 0, 0, UW, UH, 32 - UAX * 1.25, 56 - UAY * 1.25, UW * 1.25, UH * 1.25); else x.drawImage(s, 0, 0, UW, UH, 32 - UAX * 2, 57 - UAY * 2, UW * 2, UH * 2);
    } else {
      const d = G.BLD[key];
      if (key === 'farm') { x.translate(32, 18); x.scale(0.42, 0.42); drawFarm(x, 0, 0, 2, true); }
      else { const r = bldSprite(key, faction), k = Math.min(60 / (d.size * 2 * HW), 56 / (r.cv.height - 10)); x.drawImage(r.cv, Math.round(32 - r.ox * k), Math.round(60 - (r.oy + d.size * 2 * HH) * k), r.cv.width * k, r.cv.height * k); }
    }
    return (icons[id] = c.toDataURL());
  };
  const glyphs = {};
  R.glyph = function (name) {
    if (glyphs[name]) return glyphs[name];
    const c = mk(24, 24), x = c.getContext('2d'), B = '#e8bd62', Lt = '#fff1c4', Dk = '#7a5220', St = '#cfd4d8', Sd = '#8a9096', Rd = '#c9452d', Gn = '#6fae4a', Sf = '#ff8a00';
    const r = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    const ln = (pts, col, w) => line(x, pts, col, w), pg = (pts, col) => poly(x, pts, col);
    switch (name) {
      case 'f': for (const q of [[8, -0.35], [12, 0], [16, 0.35]]) { x.save(); x.translate(12, 21); x.rotate(q[1]); ln([0, 0, 0, -11], Dk, 1.5); for (let i = 0; i < 4; i++) { x.fillStyle = i % 2 ? B : Lt; x.beginPath(); x.ellipse(i % 2 ? 1.6 : -1.6, -9 - i * 2.4, 1.8, 2.6, i % 2 ? 0.5 : -0.5, 0, 7); x.fill(); } x.restore(); } r(8, 18, 8, 2, Rd); break;
      case 'w': r(3, 13, 17, 6, '#8a5a30'); r(3, 13, 17, 2, '#a8743e'); blob(x, 20, 16, 3.2, '#d9b98a'); blob(x, 20, 16, 1.4, '#8a5a30'); r(5, 6, 15, 6, '#7a4c26'); r(5, 6, 15, 2, '#9a6836'); blob(x, 5, 9, 3.2, '#d9b98a'); blob(x, 5, 9, 1.4, '#7a4c26'); break;
      case 'g': blob(x, 12, 12, 9, Dk); blob(x, 12, 12, 8, B); blob(x, 12, 12, 6, '#d6a644'); blob(x, 12, 12, 5, B); r(11, 8, 2, 8, Dk); r(8, 11, 8, 2, Dk); r(9, 6, 5, 1, Lt); break;
      case 's': pg([3, 19, 5, 9, 11, 5, 18, 8, 21, 17, 13, 21], Sd); pg([11, 5, 18, 8, 21, 17, 14, 12], St); pg([3, 19, 5, 9, 9, 13, 13, 21], '#6a7076'); break;
      case 'pop': blob(x, 8, 8, 3.4, B); pg([2, 21, 3, 14, 8, 12, 13, 14, 14, 21], B); blob(x, 16, 9, 3, Lt); pg([11, 21, 12, 15, 16, 13, 20, 15, 21, 21], Lt); break;
      case 'idle': blob(x, 12, 12, 8, B); blob(x, 15, 9, 7, '#2c170f'); r(15, 4, 5, 1, Lt); r(18, 5, 1, 3, Lt); r(15, 8, 5, 1, Lt); break;
      case 'hp': pg([12, 21, 3, 11, 4, 6, 8, 4, 12, 8, 16, 4, 20, 6, 21, 11], Rd); r(6, 7, 3, 2, '#ff9a8a'); break;
      case 'atk': ln([5, 19, 18, 5], St, 3); ln([6, 18, 18, 6], '#fff', 1); ln([4, 14, 10, 20], B, 2.4); r(3, 19, 3, 3, Dk); break;
      case 'armor': pg([12, 22, 4, 15, 4, 4, 12, 2, 20, 4, 20, 15], Sd); pg([12, 20, 6, 14, 6, 6, 12, 4], St); r(11, 6, 2, 12, B); r(7, 10, 10, 2, B); break;
      case 'parmor': pg([12, 22, 4, 15, 4, 4, 12, 2, 20, 4, 20, 15], '#8a5a30'); pg([12, 20, 6, 14, 6, 6, 12, 4], '#a8743e'); blob(x, 12, 11, 3, B); break;
      case 'range': x.strokeStyle = '#a8743e'; x.lineWidth = 2.4; x.beginPath(); x.arc(7, 12, 10, -1.2, 1.2); x.stroke(); ln([10.6, 2.6, 10.6, 21.4], Lt, 1); ln([4, 12, 21, 12], St, 1.6); pg([21, 12, 17, 9.5, 17, 14.5], St); break;
      case 'speed': for (const q of [3, 10]) pg([q, 5, q + 7, 12, q, 19, q + 3, 19, q + 10, 12, q + 3, 5], B); break;
      case 'econ': pg([2, 12, 12, 3, 22, 12], Rd); r(5, 12, 14, 9, Lt); r(10, 15, 4, 6, Dk); r(5, 20, 14, 1, Dk); break;
      case 'mil': r(6, 9, 12, 13, Sd); r(6, 9, 4, 13, '#6a7076'); for (const q of [5, 10, 15]) r(q, 5, 4, 5, St); r(10, 15, 4, 7, '#20140c'); r(11, 2, 1, 4, Dk); pg([12, 1, 18, 2, 12, 4], Sf); break;
      case 'stop': pg([8, 2, 16, 2, 22, 8, 22, 16, 16, 22, 8, 22, 2, 16, 2, 8], Rd); r(6, 10, 12, 4, Lt); break;
      case 'back': ln([19, 17, 19, 10, 7, 10], B, 3); pg([2, 10, 9, 4, 9, 16], B); break;
      case 'demolish': ln([5, 5, 19, 19], Rd, 4); ln([19, 5, 5, 19], Rd, 4); break;
      case 'rally': r(4, 2, 2, 20, Dk); pg([6, 3, 21, 5, 14, 9, 21, 13, 6, 15], Sf); pg([6, 11, 17, 12, 21, 13, 6, 15], '#d96a00'); break;
      case 'age': pg([2, 13, 12, 3, 22, 13, 19, 13, 12, 11, 5, 13], Sf); pg([12, 3, 22, 13, 19, 13, 12, 6], '#d96a00'); r(11, 1, 2, 3, B); r(11, 11, 2, 11, B); for (const q of [4, 8, 15, 19]) r(q, 13, 1, 3, B); break;
      case 'ganimi': pg([1, 21, 9, 6, 14, 14, 17, 10, 23, 21], '#55704a'); pg([9, 6, 14, 14, 11, 14], '#7a9a66'); pg([4, 21, 7, 14, 10, 21], '#2f5a26'); ln([14, 20, 20, 17], Lt, 1); pg([21, 16.5, 18, 15.5, 19, 18.5], Lt); break;
      case 'tat': for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) r(2 + j * 7 + (i % 2 ? -3 : 0), 4 + i * 4.5, 6, 3.5, i % 2 ? Sd : St); break;
      case 'sheti': r(2, 19, 20, 3, '#7a5230'); ln([12, 19, 12, 9], Gn, 2); pg([12, 12, 5, 9, 7, 4, 12, 9], Gn); pg([12, 10, 19, 8, 18, 3, 12, 7], '#8fce5a'); break;
      case 'forge1': ln([4, 20, 18, 6], St, 3); ln([5, 19, 18, 7], '#fff', 1); pg([18, 6, 21, 3, 20, 8], St); ln([3, 15, 9, 21], B, 2.4); break;
      case 'forge2': ln([4, 20, 19, 5], St, 2.4); ln([20, 20, 5, 5], St, 2.4); ln([3, 16, 8, 21], B, 2); ln([21, 16, 16, 21], B, 2); break;
      case 'mail1': case 'mail2': pg([12, 22, 4, 15, 4, 4, 12, 2, 20, 4, 20, 15], Sd); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) blob(x, 7 + j * 3.4 + (i % 2) * 1.6, 6 + i * 3.4, 1.1, St); if (name === 'mail2') { r(10, 9, 4, 8, B); r(8, 11, 8, 4, B); } break;
      case 'fletch': x.strokeStyle = '#a8743e'; x.lineWidth = 2.6; x.beginPath(); x.arc(4, 12, 11, -1.15, 1.15); x.stroke(); ln([8.5, 2, 8.5, 22], Lt, 1); ln([3, 12, 22, 12], St, 1.6); pg([22, 12, 18, 9.5, 18, 14.5], St); pg([3, 12, 6, 9.5, 6, 14.5], Rd); break;
      case 'barud': r(6, 8, 12, 14, '#7a4c26'); r(6, 8, 12, 2, B); r(6, 14, 12, 2, B); r(6, 20, 12, 2, B); ln([12, 8, 14, 4, 17, 4], Dk, 1.4); pg([17, 1, 19, 4, 22, 3, 20, 6, 21, 9, 18, 7, 15, 8, 16, 5], Sf); break;
      case 'chauth': for (let i = 0; i < 4; i++) { x.fillStyle = Dk; x.beginPath(); x.ellipse(10, 19 - i * 3.6, 7.5, 3.2, 0, 0, 7); x.fill(); x.fillStyle = i === 3 ? Lt : B; x.beginPath(); x.ellipse(10, 18 - i * 3.6, 7.5, 3.2, 0, 0, 7); x.fill(); } blob(x, 19, 17, 3.6, Dk); blob(x, 19, 16.5, 3, B); break;
      case 'bhavani': r(11, 6, 2, 17, B); ln([5, 3, 5, 9, 19, 9, 19, 3], B, 2); pg([12, 0, 9.5, 6, 14.5, 6], Lt); pg([5, 1, 3.5, 5, 6.5, 5], B); pg([19, 1, 17.5, 5, 20.5, 5], B); r(8, 14, 8, 2, Rd); break;
      case 'pause': r(6, 4, 4, 16, B); r(14, 4, 4, 16, B); break;
      case 'sound': case 'mute': pg([3, 9, 8, 9, 13, 4, 13, 20, 8, 15, 3, 15], B); if (name === 'sound') { x.strokeStyle = Lt; x.lineWidth = 1.6; x.beginPath(); x.arc(13, 12, 4.5, -0.9, 0.9); x.stroke(); x.beginPath(); x.arc(13, 12, 8, -0.9, 0.9); x.stroke(); } else { ln([16, 8, 22, 16], Rd, 2); ln([22, 8, 16, 16], Rd, 2); } break;
      case 'menu': r(4, 5, 16, 3, B); r(4, 11, 16, 3, B); r(4, 17, 16, 3, B); break;
      case 'ok': ln([4, 13, 10, 19, 20, 5], Gn, 3); break;
      case 'dot': pg([12, 6, 18, 12, 12, 18, 6, 12], Sf); break;
    }
    return (glyphs[name] = c.toDataURL());
  };
  /* wood, copper and stone panels for the HUD, exported as CSS variables */
  R.uiTextures = function () {
    const wood = tex(256, 61, ['#2a160c', '#321b0f', '#3a2012', '#432615', '#4b2b18'], { cells: 3, grain: 0.1, contrast: 1.4, deco: (x, r, S) => { for (let i = 0; i < 900; i++) { x.fillStyle = r() < 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(150,100,50,.12)'; x.fillRect((r() * S) | 0, (r() * S) | 0, 12 + (r() * 50 | 0), 1); } for (let y = 63; y < S; y += 64) { x.fillStyle = 'rgba(0,0,0,.6)'; x.fillRect(0, y, S, 2); x.fillStyle = 'rgba(255,200,130,.08)'; x.fillRect(0, y + 2, S, 1); } } });
    const copper = tex(128, 62, ['#3d2416', '#45291a', '#4d2f1d', '#573521', '#5f3b25'], { cells: 4, grain: 0.16, contrast: 1.6 });
    const stone = tex(128, 63, ['#262220', '#2d2926', '#34302c', '#3b3632'], { cells: 5, grain: 0.2 });
    const paper = tex(128, 64, ['#d9c79c', '#dfcea5', '#e5d5ae', '#eadcb8'], { cells: 3, grain: 0.1, contrast: 1.3 });
    const st = document.documentElement.style;
    st.setProperty('--tex-wood', 'url(' + wood.toDataURL() + ')'); st.setProperty('--tex-copper', 'url(' + copper.toDataURL() + ')');
    st.setProperty('--tex-stone', 'url(' + stone.toDataURL() + ')'); st.setProperty('--tex-paper', 'url(' + paper.toDataURL() + ')');
  };
  /* title scene: the Sahyadri at dusk, drawn at low resolution and scaled up */
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  R.drawTitle = function (c) {
    const w = c.width, h = c.height, x = c.getContext('2d');
    const sky = ['#1b1430', '#2d1b3f', '#4a2247', '#7a2f45', '#b04a3a', '#de7a34', '#f4ab4a', '#fbd27a'];
    for (let y = 0; y < h * 0.62; y++) { const t = y / (h * 0.62) * (sky.length - 1), i = Math.floor(t), fr = t - i; for (let px = 0; px < w; px++) { x.fillStyle = sky[Math.min(sky.length - 1, i + (BAYER[(y & 3) * 4 + (px & 3)] / 16 < fr ? 1 : 0))]; x.fillRect(px, y, 1, 1); } }
    blob(x, w * 0.74, h * 0.5, h * 0.11, '#ffe9b0'); blob(x, w * 0.74, h * 0.5, h * 0.085, '#fff6d8');
    const ridge = (base, amp, seed, col, fort) => {
      const n = pnoise(seed, 64), ys = [];
      for (let px = 0; px < w; px++) ys[px] = Math.round(base - (n(px / 46, 0) * 0.65 + n(px / 13, 7) * 0.25 + n(px / 5, 3) * 0.1) * amp);
      if (fort) { const a = Math.round(w * 0.56), b = Math.round(w * 0.84); let top = h; for (let px = a; px < b; px++) top = Math.min(top, ys[px]); for (let px = a; px < b; px++) { const t = (px - a) / (b - a); ys[px] = Math.min(ys[px], top + Math.round(Math.abs(t - 0.5) * 10)) - 6 - (px % 6 < 3 ? 2 : 0); } for (const q of [a, Math.round((a + b) / 2), b - 8]) for (let px = q; px < q + 8; px++) ys[px] -= 7 + (px % 4 < 2 ? 2 : 0); R._fortX = Math.round((a + b) / 2) + 4; R._fortY = ys[Math.round((a + b) / 2) + 4]; }
      x.fillStyle = col; for (let px = 0; px < w; px++) x.fillRect(px, ys[px], 1, h - ys[px]);
    };
    ridge(h * 0.6, h * 0.16, 5, '#8a4a52'); ridge(h * 0.66, h * 0.2, 6, '#6a3346'); ridge(h * 0.7, h * 0.22, 7, '#4a2238', true);
    x.fillStyle = '#20100c'; x.fillRect(R._fortX, R._fortY - 16, 1, 16); poly(x, [R._fortX + 1, R._fortY - 16, R._fortX + 12, R._fortY - 14, R._fortX + 7, R._fortY - 11, R._fortX + 12, R._fortY - 8, R._fortX + 1, R._fortY - 7], '#ff8a00');
    for (let i = 0; i < 26; i++) { x.fillStyle = 'rgba(255,220,170,' + (0.05 + hash(i, 2, 9) * 0.07) + ')'; x.fillRect(0, Math.round(h * (0.7 + i * 0.006)), w, 1); }
    ridge(h * 0.86, h * 0.2, 8, '#2a1420'); ridge(h * 0.98, h * 0.16, 9, '#12090c');
  };

  /* ================= frame ================= */
  R.init = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); buildSprites(); R.resize(); R.loadArt(); };
  R.resize = function () {
    W = window.innerWidth; H = window.innerHeight;
    cv.width = W; cv.height = H; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    R.W = W; R.H = H;
  };
  const RANK = [4, 3, 0, 5, 1, 2];           // draw order: water, sand, road, dry, grass, rock
  const ORDER = [2, 4, 5, 1, 0, 3];
  const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const cliffH = (x, y) => 20 + (((x >> 1) * 7 + (y >> 1) * 13) % 3) * 7;
  function fringe(c, x, y, t, N, extra) {
    for (let k = 0; k < 4; k++) {
      const nx = x + NB[k][0], ny = y + NB[k][1];
      if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
      if (RANK[M.terrain[ny * N + nx]] >= RANK[t]) continue;
      for (let j = 0; j < 3; j++) {
        const u = 0.18 + j * 0.32 + (hash(x, y, k * 3 + j) - 0.5) * 0.16, r = 0.15 + hash(y, x, k * 5 + j) * 0.12 + extra;
        const bx = NB[k][0] ? x + (NB[k][0] > 0 ? 1.02 : -0.02) : x + u, by = NB[k][1] ? y + (NB[k][1] > 0 ? 1.02 : -0.02) : y + u;
        c.moveTo(bx + r, by); c.arc(bx, by, r, 0, 6.2832);
      }
    }
  }
  const byType = [[], [], [], [], [], []], list = [];
  R.draw = function (now) {
    const S = G.S, time = now / 1000;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#050608'; ctx.fillRect(0, 0, W, H);
    if (!S) return;
    ctx.imageSmoothingEnabled = false;
    const z = cam.z, N = M.N, ex = M.explored, vis = M.visible, all = G.reveal, ui = G.ui, ox = -Math.round(cam.x * z), oy = -Math.round(cam.y * z);
    const c0 = G.s2w(0, 0), c1 = G.s2w(W, 0), c2 = G.s2w(0, H), c3 = G.s2w(W, H);
    const x0 = Math.max(0, Math.floor(Math.min(c0[0], c2[0])) - 2), x1 = Math.min(N - 1, Math.ceil(Math.max(c1[0], c3[0])) + 3);
    const y0 = Math.max(0, Math.floor(Math.min(c0[1], c1[1])) - 2), y1 = Math.min(N - 1, Math.ceil(Math.max(c2[1], c3[1])) + 3);
    const vx0 = cam.x - HW - 4, vx1 = cam.x + W / z + HW + 4, vy0 = cam.y - 2 * HH - 4, vy1 = cam.y + H / z + 96;
    list.length = 0; for (const a of byType) a.length = 0;
    const fogT = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const ix = (x - y) * HW, iy = (x + y) * HH;
      if (ix < vx0 || ix > vx1 || iy < vy0 || iy > vy1) continue;
      const i = y * N + x;
      if (!all && !ex[i]) continue;
      const t = M.terrain[i];
      byType[t].push(x, y);
      if (t === 3) list.push({ d: x + y + 0.9, cl: 1, x, y });
      const rt = M.resType[i];
      if (rt) {
        const v = M.variant[i], jx = Math.round((hash(x, y, 1) - 0.5) * 12), jy = Math.round((hash(x, y, 2) - 0.5) * 6);
        let s; if (rt === 1) s = spr.tree[M.terrain[i] === 1 ? (v % 2 ? 2 : 0) : M.treeKind && M.treeKind[i] ? 3 : v % 3]; else s = rt === 2 ? spr.bush : rt === 3 ? spr.gold : spr.stone;
        list.push({ d: x + y + 1, s, x: ix - s.padX - (s.bw >> 1) + jx, y: iy + HH - s.bh + (rt === 1 ? 7 : 10) + jy });
      }
      if (!all && !vis[i]) fogT.push(ix, iy);
    }
    /* ground: continuous projected textures, ragged borders, foam along the shore */
    ctx.setTransform(HW * z, HH * z, -HW * z, HH * z, ox, oy);
    pats[2].setTransform(new DOMMatrix().scale(1 / TP).translate((time * 5) % 384, (time * 3) % 384));
    for (const t of ORDER) {
      const a = byType[t];
      if (t === 4) {           // shore foam goes under everything that is not water
        ctx.beginPath();
        for (const tt of [4, 5, 1, 0, 3]) { const b = byType[tt]; for (let i = 0; i < b.length; i += 2) { const x = b[i], y = b[i + 1]; let wet = false; for (let k = 0; k < 4; k++) { const nx = x + NB[k][0], ny = y + NB[k][1]; if (nx >= 0 && ny >= 0 && nx < N && ny < N && M.terrain[ny * N + nx] === 2) { wet = true; break; } } if (wet) { ctx.rect(x - 0.09, y - 0.09, 1.18, 1.18); fringe(ctx, x, y, tt, N, 0.07); } } }
        ctx.fillStyle = 'rgba(214,236,240,' + (0.5 + Math.sin(time * 1.6) * 0.12) + ')'; ctx.fill();
      }
      if (!a.length) continue;
      ctx.beginPath();
      for (let i = 0; i < a.length; i += 2) { ctx.rect(a[i] - 0.012, a[i + 1] - 0.012, 1.024, 1.024); if (t !== 2) fringe(ctx, a[i], a[i + 1], t, N, 0); }
      ctx.fillStyle = pats[t]; ctx.fill();
    }
    ctx.setTransform(z, 0, 0, z, ox, oy);
    /* ground markers */
    for (const f of S.fx) {
      const p = G.iso(f.x, f.y), k = f.t / f.d;
      if (f.k === 'ring') { ctx.strokeStyle = f.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(p[0], p[1], f.r * HW * k * 1.2, f.r * HH * k * 1.2, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (f.k === 'mark') { ctx.strokeStyle = f.c; ctx.globalAlpha = 1 - k; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p[0], p[1], 16 * (1 - k) + 3, 8 * (1 - k) + 1.5, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
      else if (f.k === 'corpse') { ctx.globalAlpha = 0.7 * (1 - k); ctx.fillStyle = '#2a1810'; ctx.beginPath(); ctx.ellipse(p[0], p[1] - 1, 11, 4.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = f.c; ctx.fillRect(Math.round(p[0] - 6), Math.round(p[1] - 4), 10, 3); ctx.fillStyle = '#a86f45'; ctx.fillRect(Math.round(p[0] + 4), Math.round(p[1] - 5), 4, 4); ctx.globalAlpha = 1; }
      else if (f.k === 'rubble') { ctx.globalAlpha = 1 - k; ctx.fillStyle = '#3a342e'; ctx.beginPath(); ctx.ellipse(p[0], p[1], f.s * 22, f.s * 11, 0, 0, 7); ctx.fill(); for (let i = 0; i < 9; i++) { ctx.fillStyle = i % 2 ? '#6d665e' : '#57504a'; ctx.fillRect(Math.round(p[0] + Math.cos(i * 1.9) * f.s * 13 - 3), Math.round(p[1] + Math.sin(i * 1.9) * f.s * 6 - 3), 6 + i % 3, 4 + i % 2); } ctx.globalAlpha = 1; }
    }
    const selSet = ui ? ui.selSet : new Set();
    for (const e of S.ents) {
      if (e.dead) continue;
      const i = (e.y | 0) * N + (e.x | 0);
      if (e.team !== 0 && !all) { if (e.kind === 'u' ? !vis[i] : !ex[i]) continue; }
      const ix = (e.x - e.y) * HW, iy = (e.x + e.y) * HH;
      if (ix < vx0 - 150 || ix > vx1 + 150 || iy < vy0 - 70 || iy > vy1 + 110) continue;
      list.push({ d: e.x + e.y - (e.type === 'farm' ? 3 : 0), e });
    }
    list.sort((a, b) => a.d - b.d);
    for (const it of list) {
      if (it.s) { ctx.drawImage(it.s, it.x, it.y); continue; }
      if (it.cl) {             // Sahyadri basalt: a raised block with strata on its faces
        const x = it.x, y = it.y, h = cliffH(x, y), tX = (x - y) * HW, tY = (x + y) * HH;
        const rk = (ax, ay) => ax < N && ay < N && M.terrain[ay * N + ax] === 3 ? cliffH(ax, ay) : 0;
        const hl = rk(x, y + 1), hr = rk(x + 1, y);
        if (hl < h) { ctx.fillStyle = strata.L; ctx.beginPath(); ctx.moveTo(tX - HW, tY + HH - hl); ctx.lineTo(tX, tY + 2 * HH - hl); ctx.lineTo(tX, tY + 2 * HH - h); ctx.lineTo(tX - HW, tY + HH - h); ctx.fill(); }
        if (hr < h) { ctx.fillStyle = strata.R; ctx.beginPath(); ctx.moveTo(tX, tY + 2 * HH - hr); ctx.lineTo(tX + HW, tY + HH - hr); ctx.lineTo(tX + HW, tY + HH - h); ctx.lineTo(tX, tY + 2 * HH - h); ctx.fill(); }
        ctx.fillStyle = cliffTop; ctx.beginPath(); ctx.moveTo(tX, tY - h - 0.5); ctx.lineTo(tX + HW + 0.5, tY + HH - h); ctx.lineTo(tX, tY + 2 * HH - h + 0.5); ctx.lineTo(tX - HW - 0.5, tY + HH - h); ctx.fill();
        ctx.fillStyle = 'rgba(210,225,170,.35)';
        if (hl < h) { ctx.beginPath(); ctx.moveTo(tX - HW, tY + HH - h); ctx.lineTo(tX, tY + 2 * HH - h); ctx.lineTo(tX, tY + 2 * HH - h + 1.5); ctx.lineTo(tX - HW, tY + HH - h + 1.5); ctx.fill(); }
        if (hr < h) { ctx.beginPath(); ctx.moveTo(tX, tY + 2 * HH - h); ctx.lineTo(tX + HW, tY + HH - h); ctx.lineTo(tX + HW, tY + HH - h + 1.5); ctx.lineTo(tX, tY + 2 * HH - h + 1.5); ctx.fill(); }
        continue;
      }
      const e = it.e, tm = S.teams[e.team], f = tm.f, sel = selSet.has(e.id);
      if (e.kind === 'b') {
        const s = e.size, a = ctr(e.tx, e.ty, 0), C = ctr(e.tx, e.ty, s);
        if (sel) { ctx.strokeStyle = e.team === 0 ? '#fff' : '#ff6a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + s * HW, a[1] + s * HH); ctx.lineTo(a[0], a[1] + 2 * s * HH); ctx.lineTo(a[0] - s * HW, a[1] + s * HH); ctx.closePath(); ctx.stroke(); }
        if (e.type === 'farm') drawFarm(ctx, e.tx, e.ty, s, e.done);
        else {
          const r = bldSprite(e.type, tm.faction), dx = Math.round(a[0] - r.ox), dy = Math.round(a[1] - r.oy);
          if (e.done) ctx.drawImage(r.cv, dx, dy);
          else {             // rises out of a scaffolded foundation
            poly(ctx, [a[0], a[1] + 3, a[0] + s * HW - 6, a[1] + s * HH, a[0], a[1] + 2 * s * HH - 3, a[0] - s * HW + 6, a[1] + s * HH], '#7a6444');
            const hh = Math.round((r.cv.height - 6) * (0.12 + 0.88 * e.prog));
            ctx.drawImage(r.cv, 0, r.cv.height - hh, r.cv.width, hh, dx, dy + r.cv.height - hh, r.cv.width, hh);
            ctx.fillStyle = '#6b4a2a'; for (const q of [-0.7, -0.25, 0.25, 0.7]) ctx.fillRect(Math.round(C[0] + q * s * HW), Math.round(C[1] - e.def.ht * 0.8 + Math.abs(q) * s * 8), 2, Math.round(e.def.ht * 0.8));
            ctx.fillRect(Math.round(C[0] - 0.7 * s * HW), Math.round(C[1] - e.def.ht * 0.4), Math.round(1.4 * s * HW), 2);
          }
          if (e.done && !r.art) for (const q of r.fl) flag(ctx, a[0] + q[0], a[1] + q[1], q[2], q[3] ? { flag: '#ff8a00', style: 'maratha' } : f, time);
        }
        if (e.done && e.hp < e.maxhp * 0.55 && e.type !== 'farm') {
          for (let k = 0; k < (e.hp < e.maxhp * 0.25 ? 3 : 1) * Math.min(2, e.size); k++) {
            const fx = Math.round(C[0] + Math.sin(k * 2.7 + e.id) * e.size * 12), fy = Math.round(C[1] - e.def.ht * 0.45 + Math.cos(k * 1.9) * 6), fl = Math.round(Math.sin(time * 9 + k) * 2);
            poly(ctx, [fx - 6, fy, fx - 2, fy - 10 - fl, fx, fy - 5, fx + 2, fy - 16 + fl, fx + 6, fy], '#ff7a1a'); poly(ctx, [fx - 3, fy, fx, fy - 8 + fl, fx + 3, fy], '#ffd23a');
            ctx.fillStyle = 'rgba(40,36,34,.35)'; ctx.beginPath(); ctx.arc(fx + 3, fy - 22 - ((time * 14 + k * 9) % 16), 5, 0, 7); ctx.fill();
          }
        }
        if (sel || (e.hp < e.maxhp && e.done) || !e.done) hpBar(ctx, C[0], C[1] - e.def.ht - 14, 22 + e.size * 10, e.hp / e.maxhp, e.team === 0 ? '#5fd35f' : '#e05a4a');
        if (sel && e.rally && e.team === 0) { const p = G.iso(e.rally.x, e.rally.y); flag(ctx, p[0], p[1], 20, f, time); }
      } else {
        const d = e.def, px = Math.round((e.x - e.y) * HW), py = Math.round((e.x + e.y) * HH), big = TALL[d.shape] > 33;
        ctx.fillStyle = 'rgba(8,6,4,.34)'; ctx.beginPath(); ctx.ellipse(px - 3, py + 1, big ? 17 : 9, big ? 6 : 3.6, 0, 0, 7); ctx.fill();
        if (d.hero) { ctx.strokeStyle = e.team === 0 ? 'rgba(255,200,80,.9)' : 'rgba(255,90,70,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, 20, 9, 0, 0, 7); ctx.stroke(); }
        if (sel) { ctx.strokeStyle = e.team === 0 ? '#fff' : '#ff6a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py, big ? 19 : 12, big ? 8 : 5.5, 0, 0, 7); ctx.stroke(); }
        if (e.rallyT > S.time) { ctx.fillStyle = 'rgba(255,150,30,.28)'; ctx.beginPath(); ctx.ellipse(px, py, 15, 7, 0, 0, 7); ctx.fill(); }
        const sp = unitSprite(d, tm.faction, { anim: e.anim, walk: e.moving, work: e.working, carry: e.carry >= 1 ? e.ctype : null, atk: S.time - (e.atkAnim || -9) < 0.22, id: e.id, tf: (time * 5 | 0) % 4 });
        if (e.dir < 0) { ctx.save(); ctx.translate(px, py); ctx.scale(-1, 1); ctx.drawImage(sp, -UAX, -UAY); ctx.restore(); } else ctx.drawImage(sp, px - UAX, py - UAY);
        if (sel || e.hp < e.maxhp) hpBar(ctx, px, py - (TALL[d.shape] || 30) * US * (d.big || 1) - 5, d.hero ? 34 : 22, e.hp / e.maxhp, e.team === 0 ? '#5fd35f' : '#e05a4a');
      }
    }
    /* projectiles and effects */
    for (const p of S.proj) {
      const k = Math.min(1, p.t / p.dur), q = G.iso(p.x, p.y), arc = p.kind === 'shot' ? 2 : p.dur * 26, hgt = p.h0 * (1 - k) + 12 * k + Math.sin(k * PI) * arc;
      if (p.kind === 'ball') { ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.fillRect(Math.round(q[0]) - 2, Math.round(q[1]) - 1, 5, 2); ctx.fillStyle = '#16161a'; ctx.fillRect(Math.round(q[0]) - 2, Math.round(q[1] - hgt) - 2, 5, 5); ctx.fillStyle = '#6a6a70'; ctx.fillRect(Math.round(q[0]), Math.round(q[1] - hgt) - 2, 2, 2); }
      else {
        const k2 = Math.max(0, k - 0.07), q2 = G.iso(p.sx + (p.tx - p.sx) * k2, p.sy + (p.ty - p.sy) * k2), h2 = p.h0 * (1 - k2) + 12 * k2 + Math.sin(k2 * PI) * arc;
        line(ctx, [q2[0], q2[1] - h2, q[0], q[1] - hgt], p.kind === 'shot' ? '#ffe9a8' : '#2a1c10', p.kind === 'shot' ? 2 : 1.6);
        if (p.kind === 'arrow') { ctx.fillStyle = '#e8e2d2'; ctx.fillRect(Math.round(q2[0]) - 1, Math.round(q2[1] - h2) - 1, 2, 2); }
      }
    }
    for (const f of S.fx) {
      const p = G.iso(f.x, f.y), k = f.t / f.d;
      if (f.k === 'smoke') { for (let i = 0; i < 3; i++) { ctx.fillStyle = 'rgba(232,230,222,' + (0.6 * (1 - k)) + ')'; ctx.fillRect(Math.round(p[0] + i * 5 - 6 - k * 4), Math.round(p[1] - 20 - k * 16 - i * 3), Math.round(6 + k * 8), Math.round(6 + k * 8)); } }
      else if (f.k === 'blast') { ctx.fillStyle = 'rgba(255,' + (200 - k * 130 | 0) + ',60,' + (0.85 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1] - 8, 5 + k * 18, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(60,50,44,' + (0.5 * (1 - k)) + ')'; ctx.beginPath(); ctx.arc(p[0] + 4, p[1] - 14 - k * 12, 4 + k * 12, 0, 7); ctx.fill(); }
    }
    /* fog of war */
    if (fogT.length) {
      ctx.fillStyle = 'rgba(8,10,22,.5)'; ctx.beginPath();
      for (let i = 0; i < fogT.length; i += 2) { const ix = fogT[i], iy = fogT[i + 1]; ctx.moveTo(ix, iy - 0.5); ctx.lineTo(ix + HW + 0.5, iy + HH); ctx.lineTo(ix, iy + 2 * HH + 0.5); ctx.lineTo(ix - HW - 0.5, iy + HH); ctx.closePath(); }
      ctx.fill();
    }
    /* placement ghost */
    if (ui && ui.placing && ui.placeTile) {
      const d = G.BLD[ui.placing], t = ui.placeTile, s = d.size, a = ctr(t[0], t[1], 0);
      const ok = G.canPlace(0, ui.placing, t[0], t[1]) && G.canAfford(S.teams[0], d.cost);
      ctx.fillStyle = ok ? 'rgba(90,220,90,.38)' : 'rgba(230,60,50,.45)'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(a[0] + s * HW, a[1] + s * HH); ctx.lineTo(a[0], a[1] + 2 * s * HH); ctx.lineTo(a[0] - s * HW, a[1] + s * HH); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 0.65;
      if (ui.placing === 'farm') drawFarm(ctx, t[0], t[1], s, true); else { const r = bldSprite(ui.placing, 'swarajya'); ctx.drawImage(r.cv, Math.round(a[0] - r.ox), Math.round(a[1] - r.oy)); }
      ctx.globalAlpha = 1;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (ui && ui.drag && ui.drag.box) {
      const d = ui.drag; ctx.fillStyle = 'rgba(255,255,255,.08)'; ctx.fillRect(d.x0, d.y0, ui.mx - d.x0, ui.my - d.y0);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.strokeRect(d.x0 + 0.5, d.y0 + 0.5, ui.mx - d.x0, ui.my - d.y0);
    }
  };
  /* palms along the coast: computed once per map */
  R.prepMap = function () {
    const N = M.N, k = M.treeKind = new Uint8Array(N * N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      if (M.resType[y * N + x] !== 1) continue;
      let near = false;
      for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) { const ax = x + dx, ay = y + dy; if (ax >= 0 && ay >= 0 && ax < N && ay < N && M.terrain[ay * N + ax] === 4) { near = true; break; } }
      if (near && hash(x, y, 4) < 0.75) k[y * N + x] = 1;
    }
  };

  /* ================= minimap ================= */
  let mini, mctx, off, octx, img, miniT = 0;
  const TC = [[92, 138, 58], [150, 135, 80], [52, 116, 158], [84, 79, 71], [218, 200, 146], [176, 147, 102]];
  const RC = [null, [42, 92, 40], [200, 68, 107], [245, 198, 42], [176, 176, 172]];
  R.initMini = function (canvas) { mini = canvas; mctx = mini.getContext('2d'); };
  R.drawMini = function (now) {
    const S = G.S; if (!S || !mini) return;
    const N = M.N;
    if (!off || off.width !== N) { off = mk(N, N); octx = off.getContext('2d'); img = octx.createImageData(N, N); miniT = 0; }
    if (now - miniT > 400 || now < miniT) {
      miniT = now;
      const d = img.data, ex = M.explored, vis = M.visible, all = G.reveal;
      for (let i = 0; i < N * N; i++) {
        const o = i * 4;
        if (!all && !ex[i]) { d[o] = 10; d[o + 1] = 9; d[o + 2] = 10; d[o + 3] = 255; continue; }
        const c = RC[M.resType[i]] || TC[M.terrain[i]], k = (all || vis[i] ? 1 : 0.55) * (0.92 + hash(i, 3, 1) * 0.16);
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
    for (const pg of S.pings) { const a = (S.time - pg.t); if (a > 6) continue; const p = P(pg.x, pg.y); mctx.strokeStyle = 'rgba(255,60,40,' + (1 - a / 6) + ')'; mctx.lineWidth = 3; mctx.beginPath(); mctx.arc(p[0], p[1], 6 + (a * 9) % 18, 0, 7); mctx.stroke(); }
    const q = [G.s2w(0, 0), G.s2w(W, 0), G.s2w(W, H), G.s2w(0, H)].map(c => P(c[0], c[1]));
    mctx.strokeStyle = '#fff'; mctx.lineWidth = 2; mctx.beginPath(); mctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) mctx.lineTo(q[i][0], q[i][1]); mctx.closePath(); mctx.stroke();
  };
  R.miniToWorld = function (mx, my) {
    const N = M.N, k = mini.width / (2 * N), a = (mx - mini.width / 2) / k, b = my / (k / 2);
    return [(a + b) / 2, (b - a) / 2];
  };
})();
