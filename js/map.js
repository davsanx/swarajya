'use strict';
/* Map generation, tile grids and A* pathfinding */
(function () {
  const M = G.Map = {};
  const T = M.T = { GRASS: 0, DIRT: 1, WATER: 2, ROCK: 3, SAND: 4, ROAD: 5 };
  M.RES = { TREE: 1, BUSH: 2, GOLD: 3, STONE: 4 };

  G.rng = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  function noise(R, n) {
    const w = n + 2, g = new Float32Array(w * w);
    for (let i = 0; i < g.length; i++) g[i] = R();
    return function (u, v) {
      u = Math.max(0, Math.min(n, u)); v = Math.max(0, Math.min(n, v));
      const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0;
      const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
      const a = g[y0 * w + x0], b = g[y0 * w + x0 + 1], c = g[(y0 + 1) * w + x0], d = g[(y0 + 1) * w + x0 + 1];
      return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    };
  }

  const terrBlocked = t => t === T.WATER || t === T.ROCK;
  M.inb = (x, y) => x >= 0 && y >= 0 && x < M.N && y < M.N;

  M.generate = function (cfg, starts) {
    const N = M.N = cfg.N, sz = N * N;
    const R = M.R = G.rng(cfg.seed || ((Math.random() * 1e9) | 0) + 1);
    M.terrain = new Uint8Array(sz); M.variant = new Uint8Array(sz);
    M.resType = new Uint8Array(sz); M.resAmt = new Uint16Array(sz);
    M.bld = new Int32Array(sz); M.block = new Uint8Array(sz);
    M.explored = new Uint8Array(sz); M.visible = new Uint8Array(sz);
    const keep = new Uint8Array(sz);
    const n1 = noise(R, 8), n2 = noise(R, 16), n3 = noise(R, 6), n4 = noise(R, 12);
    const rockT = 0.69 - 0.13 * (cfg.rock == null ? 0.5 : cfg.rock);
    const forT = 0.67 - 0.2 * (cfg.forest == null ? 0.5 : cfg.forest);

    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, u = x / N, v = y / N;
      M.variant[i] = (R() * 4) | 0;
      const h = n1(u * 7, v * 7) * 0.6 + n2(u * 15, v * 15) * 0.4;
      const lake = n3(u * 5, v * 5), d = n4(u * 11, v * 11);
      let t = d > 0.62 ? T.DIRT : T.GRASS;
      if (h > rockT) t = T.ROCK;
      if (lake < 0.15) t = T.WATER; else if (lake < 0.185 && t !== T.ROCK) t = T.SAND;
      if (cfg.coast) {
        const c = (x - y) / N + (d - 0.5) * 0.12;
        if (c < -0.62) t = T.WATER; else if (c < -0.56) t = T.SAND;
      }
      M.terrain[i] = t;
    }

    // clear the ground around every starting position
    for (const s of starts) {
      const rad = s.fort ? 13 : 9;
      for (let y = s.y - rad - 1; y <= s.y + rad + 1; y++) for (let x = s.x - rad - 1; x <= s.x + rad + 1; x++) {
        if (!M.inb(x, y)) continue;
        const i = y * N + x, dx = x - s.x, dy = y - s.y;
        const inside = s.fort ? Math.max(Math.abs(dx), Math.abs(dy)) <= rad : dx * dx + dy * dy <= rad * rad;
        if (!inside) continue;
        if (M.terrain[i] !== T.GRASS && M.terrain[i] !== T.DIRT) M.terrain[i] = T.GRASS;
        if (s.fort || dx * dx + dy * dy <= 30) keep[i] = 2;
      }
    }

    // ghat roads from the player to every enemy stronghold
    function stamp(cx, cy) {
      for (let y = Math.floor(cy - 2); y <= cy + 2; y++) for (let x = Math.floor(cx - 2); x <= cx + 2; x++) {
        if (!M.inb(x, y)) continue;
        const i = y * N + x, d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d < 1.15) { M.terrain[i] = T.ROAD; if (!keep[i]) keep[i] = 1; }
        else if (d < 2.3) { if (terrBlocked(M.terrain[i]) || M.terrain[i] === T.SAND) M.terrain[i] = T.DIRT; if (!keep[i]) keep[i] = 1; }
      }
    }
    for (let k = 1; k < starts.length; k++) {
      const a = starts[0], b = starts[k], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const px = -dy / len, py = dx / len, amp = len * 0.14 * (R() < 0.5 ? -1 : 1);
      for (let i = 0; i <= len * 2; i++) {
        const t = i / (len * 2), off = Math.sin(t * Math.PI * 2) * amp;
        stamp(a.x + dx * t + px * off, a.y + dy * t + py * off);
      }
    }

    // forest
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = y * N + x, t = M.terrain[i];
      if ((t !== T.GRASS && t !== T.DIRT) || keep[i]) continue;
      const u = x / N, v = y / N;
      const f = n2(u * 13 + 2, v * 13 + 2) * 0.6 + n4(v * 11, u * 11) * 0.4;
      if (f > forT || R() < 0.012) { M.resType[i] = 1; M.resAmt[i] = 100; }
    }

    const farFromStarts = (x, y, d) => starts.every(s => Math.hypot(x - s.x, y - s.y) > d);
    function cluster(type, cx, cy, count, amt, minStart) {
      let x = Math.round(cx), y = Math.round(cy), placed = 0, tries = 0;
      while (placed < count && tries++ < count * 30) {
        if (M.inb(x, y)) {
          const i = y * N + x, t = M.terrain[i];
          const okT = t === T.GRASS || t === T.DIRT;
          const clear = starts.every(s => Math.max(Math.abs(x - s.x), Math.abs(y - s.y)) >= minStart);
          if (okT && keep[i] !== 1 && clear && (M.resType[i] === 0 || M.resType[i] === 1)) {
            if (M.resType[i] !== type) placed++;
            M.resType[i] = type; M.resAmt[i] = amt;
          }
        }
        const dir = (R() * 4) | 0;
        x += [1, -1, 0, 0][dir]; y += [0, 0, 1, -1][dir];
        if (Math.hypot(x - cx, y - cy) > 2.6) { x = Math.round(cx); y = Math.round(cy); }
      }
    }
    for (const s of starts) {
      const a = R() * 6.28;
      const at = (ang, d) => [Math.max(3, Math.min(N - 4, s.x + Math.cos(ang) * d)), Math.max(3, Math.min(N - 4, s.y + Math.sin(ang) * d))];
      let p = at(a, 6.5); cluster(2, p[0], p[1], 7, 150, 4);
      p = at(a + 2.1, 7.5); cluster(3, p[0], p[1], 7, 800, 5);
      p = at(a + 4.2, 8); cluster(4, p[0], p[1], 5, 600, 5);
      if (!s.fort) { p = at(a + 1.0, 8.5); cluster(1, p[0], p[1], 12, 100, 5); p = at(a + 3.2, 8.5); cluster(1, p[0], p[1], 12, 100, 5); }
    }
    for (let k = 0; k < Math.round(N / 6); k++) {
      for (let tries = 0; tries < 30; tries++) {
        const x = 4 + R() * (N - 8), y = 4 + R() * (N - 8);
        if (!farFromStarts(x, y, 17) || terrBlocked(M.terrain[((y | 0) * N) + (x | 0)])) continue;
        cluster(k % 3 === 0 ? 4 : k % 3 === 1 ? 3 : 2, x, y, k % 3 === 2 ? 5 : 6, k % 3 === 0 ? 600 : k % 3 === 1 ? 800 : 150, 17);
        break;
      }
    }

    for (let i = 0; i < sz; i++) M.block[i] = terrBlocked(M.terrain[i]) || M.resType[i] ? 1 : 0;
    initPath(sz);
  };

  M.forceClear = function (x, y) {
    if (!M.inb(x, y)) return;
    const i = y * M.N + x;
    if (M.terrain[i] !== T.GRASS && M.terrain[i] !== T.DIRT && M.terrain[i] !== T.ROAD) M.terrain[i] = T.DIRT;
    M.resType[i] = 0; M.resAmt[i] = 0;
    if (!M.bld[i]) M.block[i] = 0;
  };
  M.deplete = function (i) {
    M.resType[i] = 0; M.resAmt[i] = 0;
    M.block[i] = terrBlocked(M.terrain[i]) ? 1 : 0;
  };
  M.freeTile = function (i) { M.block[i] = terrBlocked(M.terrain[i]) || M.resType[i] ? 1 : 0; };
  M.buildable = function (x, y) {
    if (!M.inb(x, y)) return false;
    const i = y * M.N + x;
    return !M.block[i] && !M.bld[i];
  };

  M.nearestRes = function (type, x, y, maxR) {
    const N = M.N, cx = x | 0, cy = y | 0;
    let best = null, bd = 1e9;
    for (let r = 0; r <= maxR; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = cx + dx, ty = cy + dy;
        if (tx < 0 || ty < 0 || tx >= N || ty >= N) continue;
        if (M.resType[ty * N + tx] !== type) continue;
        const d = Math.hypot(tx + 0.5 - x, ty + 0.5 - y);
        if (d < bd) { bd = d; best = { x: tx, y: ty }; }
      }
      if (best && r >= bd) break;
    }
    return best;
  };

  M.spiral = function (x, y, n, maxR) {
    const out = [], N = M.N, cx = x | 0, cy = y | 0;
    for (let r = 0; out.length < n && r <= (maxR || 14); r++) {
      const ring = [];
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const tx = cx + dx, ty = cy + dy;
        if (tx < 0 || ty < 0 || tx >= N || ty >= N || M.block[ty * N + tx]) continue;
        ring.push([tx, ty, dx * dx + dy * dy]);
      }
      ring.sort((a, b) => a[2] - b[2]);
      for (const t of ring) if (out.length < n) out.push(t);
    }
    return out;
  };

  M.los = function (x0, y0, x1, y1) {
    const N = M.N, blk = M.block, d = Math.hypot(x1 - x0, y1 - y0), n = Math.ceil(d / 0.3);
    for (let i = 1; i < n; i++) {
      const px = x0 + (x1 - x0) * i / n, py = y0 + (y1 - y0) * i / n;
      if (blk[(py | 0) * N + ((px - 0.22) | 0)] || blk[(py | 0) * N + ((px + 0.22) | 0)] ||
        blk[((py - 0.22) | 0) * N + (px | 0)] || blk[((py + 0.22) | 0) * N + (px | 0)]) return false;
    }
    return true;
  };

  /* ---------- A* ---------- */
  let gS, came, st, cl, gen = 0;
  let hk = new Float32Array(1 << 15), hv = new Int32Array(1 << 15), hn = 0;
  function initPath(sz) { gS = new Float32Array(sz); came = new Int32Array(sz); st = new Uint32Array(sz); cl = new Uint32Array(sz); gen = 0; }
  function hpush(k, v) {
    if (hn >= hk.length) { const a = new Float32Array(hk.length * 2); a.set(hk); hk = a; const b = new Int32Array(hv.length * 2); b.set(hv); hv = b; }
    let i = hn++;
    while (i > 0) { const p = (i - 1) >> 1; if (hk[p] <= k) break; hk[i] = hk[p]; hv[i] = hv[p]; i = p; }
    hk[i] = k; hv[i] = v;
  }
  function hpop() {
    const top = hv[0]; hn--;
    const k = hk[hn], v = hv[hn];
    let i = 0;
    for (;;) {
      let c = 2 * i + 1; if (c >= hn) break;
      if (c + 1 < hn && hk[c + 1] < hk[c]) c++;
      if (hk[c] >= k) break;
      hk[i] = hk[c]; hv[i] = hv[c]; i = c;
    }
    hk[i] = k; hv[i] = v;
    return top;
  }
  const DX = [1, -1, 0, 0, 1, 1, -1, -1], DY = [0, 0, 1, -1, 1, -1, 1, -1];

  /* Path from (sx,sy) to within Chebyshev `range` of the tile rect x0..x1,y0..y1.
     Returns waypoints (tile centres). `partial` is set when the goal is unreachable. */
  M.findPath = function (sx, sy, x0, y0, x1, y1, range) {
    const N = M.N, blk = M.block;
    const stx = Math.min(N - 1, Math.max(0, sx | 0)), sty = Math.min(N - 1, Math.max(0, sy | 0)), s = sty * N + stx;
    gen++; hn = 0;
    const hf = (x, y) => {
      const dx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0, dy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0;
      const mx = dx > dy ? dx : dy, mn = dx > dy ? dy : dx;
      return Math.max(0, mx + 0.414 * mn - range);
    };
    const goal = (x, y, i) => {
      const dx = x < x0 ? x0 - x : x > x1 ? x - x1 : 0, dy = y < y0 ? y0 - y : y > y1 ? y - y1 : 0;
      return (dx > dy ? dx : dy) <= range && (!blk[i] || i === s);
    };
    if (goal(stx, sty, s)) return [];
    gS[s] = 0; st[s] = gen; came[s] = -1;
    let best = s, bh = hf(stx, sty), found = -1;
    hpush(bh, s);
    while (hn > 0) {
      const c = hpop();
      if (cl[c] === gen) continue;
      cl[c] = gen;
      const cx = c % N, cy = (c / N) | 0;
      if (goal(cx, cy, c)) { found = c; break; }
      const g = gS[c];
      for (let k = 0; k < 8; k++) {
        const nx = cx + DX[k], ny = cy + DY[k];
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        const ni = ny * N + nx;
        if (blk[ni] || cl[ni] === gen) continue;
        if (k >= 4 && (blk[cy * N + nx] || blk[ny * N + cx])) continue;
        const ng = g + (k >= 4 ? 1.4142 : 1);
        if (st[ni] !== gen || ng < gS[ni]) {
          st[ni] = gen; gS[ni] = ng; came[ni] = c;
          const h = hf(nx, ny);
          if (h < bh) { bh = h; best = ni; }
          hpush(ng + h, ni);
        }
      }
    }
    const end = found >= 0 ? found : best;
    const raw = [];
    for (let c = end; c !== s && c >= 0; c = came[c]) raw.push([(c % N) + 0.5, ((c / N) | 0) + 0.5]);
    raw.reverse();
    // string-pull
    const out = [];
    let cx = sx, cy = sy, i = 0;
    while (i < raw.length) {
      let j = i;
      while (j + 1 < raw.length && j - i < 14 && M.los(cx, cy, raw[j + 1][0], raw[j + 1][1])) j++;
      out.push(raw[j]); cx = raw[j][0]; cy = raw[j][1]; i = j + 1;
    }
    if (found < 0) out.partial = true;
    return out;
  };
})();
