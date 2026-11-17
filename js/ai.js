'use strict';
/* Enemy AI: plays by the same rules as the player (real villagers, real buildings) */
(function () {
  const M = G.Map, U = G.UNITS, B = G.BLD, TE = G.TECH;
  const AI = G.AI = {};

  AI.findSpot = function (size, cx, cy, minR, maxR) {
    const N = M.N;
    cx = Math.round(cx); cy = Math.round(cy);
    for (let r = minR; r <= maxR; r++) {
      const cand = [];
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        cand.push([cx + dx - (size >> 1), cy + dy - (size >> 1)]);
      }
      for (let k = cand.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; const t = cand[k]; cand[k] = cand[j]; cand[j] = t; }
      for (const c of cand) {
        let ok = true;
        for (let y = c[1] - 1; y <= c[1] + size && ok; y++) for (let x = c[0] - 1; x <= c[0] + size; x++) {
          if (x < 1 || y < 1 || x >= N - 1 || y >= N - 1 || M.block[y * N + x] || M.bld[y * N + x]) { ok = false; break; }
        }
        if (ok) return { x: c[0], y: c[1] };
      }
    }
    return null;
  };

  AI.init = function (t, e, D) {
    const ease = e.ease || 0;
    t.ai = {
      vt: Math.max(6, D.vt - ease * 3), army: Math.max(5, D.army - ease * 4), wave: Math.max(3, D.wave - ease),
      inc: D.inc, gap: D.gap + ease * 40, nextWave: D.first + ease * 90 + Math.random() * 30, trickle: Math.max(0, D.trickle - ease * 0.3),
      maxAge: Math.max(1, Math.min(3, D.maxAge - (ease > 0 ? 1 : 0))), towers: 0, threat: null,
      ageT: [150, 420, 780], home: { x: e.x, y: e.y }
    };
  };

  AI.tick = function (t) {
    const S = G.S, a = t.ai;
    if (!a) return;
    const vills = [], army = [], blds = [];
    for (const e of S.ents) {
      if (e.dead || e.team !== t.id) continue;
      if (e.kind === 'b') blds.push(e);
      else if (e.def.cls === 'vill') vills.push(e);
      else if (!e.home) army.push(e);
    }
    const tc = blds.find(b => b.type === 'tc' && b.done);
    const target = () => {
      let best = null, bd = 1e9;
      for (const e of S.ents) if (!e.dead && e.team === 0 && e.kind === 'b' && e.type !== 'wall') { const d = Math.hypot(e.x - a.home.x, e.y - a.home.y) - (e.type === 'tc' ? 12 : 0); if (d < bd) { bd = d; best = e; } }
      return best || S.ents.find(e => !e.dead && e.team === 0);
    };
    if (!tc) {
      const idle = army.filter(u => !u.order), tg = target();
      if (idle.length && tg) G.cmd.move(idle, tg.x, tg.y, true);
      return;
    }
    t.res.f += a.trickle; t.res.w += a.trickle; t.res.g += a.trickle; t.res.s += a.trickle * 0.4;
    const has = k => blds.filter(b => b.type === k).length;
    const pending = blds.filter(b => !b.done);
    const pickVill = (x, y) => {
      let best = null, bd = 1e9;
      for (const v of vills) {
        if (v.order && v.order.type === 'build') continue;
        const d = Math.hypot(v.x - x, v.y - y) + (v.carry > 4 ? 6 : 0);
        if (d < bd) { bd = d; best = v; }
      }
      return best;
    };
    const tryBuild = (k, nx, ny, minR, maxR) => {
      const d = B[k];
      if (d.age > t.age || !G.canAfford(t, d.cost)) return null;
      const s = AI.findSpot(d.size, nx == null ? tc.x : nx, ny == null ? tc.y : ny, minR || 4, maxR || 16);
      if (!s) return null;
      const b = G.place(t.id, k, s.x, s.y);
      if (!b) return null;
      const v = pickVill(b.x, b.y);
      if (v) G.cmd.build([v], b);
      pending.push(b);
      return b;
    };

    // villagers
    if (vills.length < a.vt && tc.queue.length < 2) G.queue(tc, 'unit', 'villager');
    for (const b of pending) {
      if (!vills.some(v => v.order && v.order.type === 'build' && v.order.id === b.id)) { const v = pickVill(b.x, b.y); if (v) G.cmd.build([v], b); }
    }
    if (pending.length < 2) {
      if (t.popCap - t.pop < 4 && t.popCap < G.MAXPOP && !pending.some(b => b.type === 'house')) tryBuild('house', null, null, 4, 18);
      else {
        const want = ['barracks'];
        if (t.age >= 1) want.push('range', 'stable', 'smith');
        if (t.age >= 2) want.push('siege');
        for (const k of want) if (!has(k)) { tryBuild(k, null, null, 5, 18); break; }
      }
    }

    // put idle villagers to work
    const cnt = { f: 0, w: 0, g: 0, s: 0 };
    let bushers = 0;
    for (const v of vills) if (v.order && v.order.type === 'gather') { cnt[G.RKEY[v.order.rt]]++; if (v.order.rt === 2) bushers++; }
    const ratio = t.age === 0 ? { f: 0.5, w: 0.35, g: 0.15, s: 0 } : { f: 0.47, w: 0.2, g: 0.28, s: 0.05 };
    if (t.res.w < 120) { ratio.w += 0.15; ratio.f -= 0.1; ratio.g -= 0.05; }
    // rebalance: villagers never go idle on their own while trees remain, so pull one over when the split drifts
    if (vills.length >= 6) {
      const tot = vills.length;
      let hi = null, hv = 0.12, lo = null, lv = -0.12;
      for (const k in ratio) { const d = cnt[k] / tot - ratio[k]; if (d > hv) { hv = d; hi = k; } if (d < lv) { lv = d; lo = k; } }
      if (hi && lo) {
        const v = vills.find(x => x.order && x.order.type === 'gather' && G.RKEY[x.order.rt] === hi && x.order.rt !== 5 && x.carry < 3);
        if (v) { G.setOrder(v, null); cnt[hi]--; }
      }
    }
    const depot = (rt, n) => {
      if (pending.length >= 2) return;
      const key = G.RKEY[rt];
      let near = false;
      for (const b of blds) if (b.def.drop && b.def.drop.indexOf(key) >= 0 && Math.hypot(b.x - n.x, b.y - n.y) < 9) { near = true; break; }
      if (!near) tryBuild(rt === 2 ? 'kothar' : 'vakhar', n.x, n.y, 2, 6);
    };
    for (const v of vills) {
      if (v.order) continue;
      let key = 'f', worst = 1e9;
      const tot = Math.max(1, vills.length);
      for (const k in ratio) { if (!ratio[k]) continue; const d = cnt[k] / tot - ratio[k]; if (d < worst) { worst = d; key = k; } }
      let done = false;
      if (key === 'f') {
        const farm = blds.find(b => b.type === 'farm' && b.done && (!b.worker || !G.byId(b.worker)));
        if (farm) { G.cmd.farm(v, farm); farm.worker = v.id; done = true; }
        else {
          const n = M.nearestRes(2, tc.x, tc.y, 12);
          const mkFarm = () => {
            if (has('farm') >= Math.ceil(a.vt * 0.5) || !G.canAfford(t, B.farm.cost)) return false;
            const s = AI.findSpot(2, tc.x, tc.y, 3, 16), b = s && G.place(t.id, 'farm', s.x, s.y);
            if (!b) return false;
            G.cmd.build([v], b); blds.push(b); return true;
          };
          if (n && bushers < 4) { G.cmd.gather([v], 2, n.x, n.y); bushers++; done = true; }
          else if (mkFarm()) done = true;
          else if (n) { G.cmd.gather([v], 2, n.x, n.y); bushers++; done = true; }
        }
      }
      if (!done && (key === 'g' || key === 's')) {
        const rt = key === 'g' ? 3 : 4, n = M.nearestRes(rt, tc.x, tc.y, 40);
        if (n) { G.cmd.gather([v], rt, n.x, n.y); depot(rt, n); done = true; }
      }
      if (!done) {
        const n = M.nearestRes(1, tc.x, tc.y, 45);
        if (n) { G.cmd.gather([v], 1, n.x, n.y); depot(1, n); key = 'w'; }
      }
      cnt[key]++;
    }

    // ages and technology
    if (t.age < a.maxAge && !t.aging && tc.queue.length < 2 && S.time > a.ageT[t.age] && G.canAfford(t, G.AGES[t.age + 1].cost)) G.queue(tc, 'age');
    if (army.length >= 5) {
      const smith = blds.find(b => b.type === 'smith' && b.done && !b.queue.length);
      if (smith) for (const k in TE) { const d = TE[k]; if (d.at === 'smith' && !t.techs[k] && d.age <= t.age && G.queue(smith, 'tech', k)) break; }
    }

    // army (hold back while saving up for the next age, once there is a basic defence)
    const saving = t.age < a.maxAge && !t.aging && S.time > a.ageT[t.age] && army.length >= Math.min(a.wave, 6);
    if (army.length < a.army && !saving) {
      const opts = [];
      for (const b of blds) {
        if (!b.done || b.queue.length >= 2 || !b.def.trains || b.type === 'tc') continue;
        for (const k of b.def.trains) {
          const d = U[k];
          if (d.age > t.age || (d.only && d.only.indexOf(t.faction) < 0)) continue;
          const w = k === 'cannon' ? 0.5 : k === 'elephant' ? (t.faction === 'mughal' ? 0.9 : 0.6) : k === 'sword' ? 1.6 : 1;
          opts.push([b, k, w]);
        }
      }
      for (let n = 0; n < 2 && opts.length; n++) {
        let tw = 0; for (const o of opts) tw += o[2];
        let r = Math.random() * tw, pick = opts[0];
        for (const o of opts) { r -= o[2]; if (r <= 0) { pick = o; break; } }
        G.queue(pick[0], 'unit', pick[1]);
      }
    }

    // defend the fort
    if (a.threat && S.time - a.threat.t < 4) {
      const def = army.filter(u => !u.order && Math.hypot(u.x - a.threat.x, u.y - a.threat.y) < 34);
      if (def.length) G.cmd.move(def, a.threat.x, a.threat.y, true);
    }
    // attack waves
    if (S.time >= a.nextWave) {
      const ready = army.filter(u => !u.order);
      if (ready.length >= a.wave) {
        const tg = target();
        if (tg) {
          G.cmd.move(ready, tg.x, tg.y, true);
          a.wave = Math.min(a.wave + a.inc, a.army); a.nextWave = S.time + a.gap;
          G.msg(t.f.short + ' war drums sound. An attack is on the march!', 'warn'); G.sfx('alert');
        }
      }
    }
  };
})();
