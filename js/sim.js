'use strict';
/* Simulation: entities, orders, economy, combat, production, fog, victory */
(function () {
  const M = G.Map, U = G.UNITS, B = G.BLD, TE = G.TECH;
  const RKEY = G.RKEY = { 1: 'w', 2: 'f', 3: 'g', 4: 's', 5: 'f' };
  const RATE = { 1: 0.6, 2: 0.62, 3: 0.52, 4: 0.48, 5: 0.5 }, CAP = 12;
  let S;
  const byId = id => S.byId.get(id);
  G.byId = id => G.S.byId.get(id);

  G.canAfford = (t, c) => { for (const k in c) if (t.res[k] < c[k]) return false; return true; };
  function pay(t, c) { for (const k in c) t.res[k] -= c[k]; }
  function refund(t, c) { for (const k in c) t.res[k] += c[k]; }
  const hostile = G.hostile = (a, b) => a !== b && !(S.teams[a].isAI && S.teams[b].isAI);
  const isMil = u => u.kind === 'u' && u.def.cls !== 'vill';

  function mkTeam(id, faction, isAI) {
    return { id, faction, f: G.FACTIONS[faction], isAI, res: { f: 0, w: 0, g: 0, s: 0 }, pop: 0, popCap: 0, age: 0, aging: false,
      techs: {}, heroes: {}, down: {}, abilityT: 0,
      mods: { melee: 0, armor: 0, parmor: 0, ranged: 0, range: 0, speed: 1, farm: 1, gun: 1, bhp: 1, tower: 0, hero: 1, trickle: 0 }, ai: null };
  }

  /* ---------- spawning ---------- */
  function spawnUnit(type, team, x, y) {
    const d = U[type], t = S.teams[team];
    const hp = Math.round(d.hp * (d.hero ? t.mods.hero : 1));
    const u = { id: S.nextId++, kind: 'u', type, def: d, team, x, y, hp, maxhp: hp, order: null, path: null, pi: 0, pt: 0, fail: 0, cd: 0,
      carry: 0, ctype: null, dir: 1, anim: Math.random() * 6, scanT: Math.random() * 0.5, moving: false, working: false, flash: 0, farm: 0, auraT: 0, rallyT: 0 };
    S.ents.push(u); S.byId.set(u.id, u); t.pop += d.pop;
    if (d.hero) t.heroes[type] = u.id;
    return u;
  }
  G.spawnUnit = spawnUnit;

  function spawnBuilding(type, team, tx, ty, done) {
    const d = B[type], t = S.teams[team], N = M.N;
    const maxhp = Math.round(d.hp * t.mods.bhp);
    const b = { id: S.nextId++, kind: 'b', type, def: d, team, tx, ty, size: d.size, x: tx + d.size / 2, y: ty + d.size / 2,
      hp: done ? maxhp : 1, maxhp, done: !!done, prog: done ? 1 : 0, queue: [], rally: null, cd: 0, worker: 0, flash: 0 };
    for (let y = ty; y < ty + d.size; y++) for (let x = tx; x < tx + d.size; x++) {
      const i = y * N + x; M.bld[i] = b.id; M.block[i] = d.walk ? 0 : 1;
    }
    S.ents.push(b); S.byId.set(b.id, b);
    if (done) recalcPop(t);
    return b;
  }
  G.spawnBuilding = spawnBuilding;

  function recalcPop(t) {
    let cap = 0;
    for (const e of S.ents) if (e.kind === 'b' && e.team === t.id && e.done && !e.dead && e.def.pop) cap += e.def.pop;
    t.popCap = Math.min(G.MAXPOP, cap);
  }

  G.canPlace = function (team, type, tx, ty) {
    const d = B[type], N = M.N;
    for (let y = ty; y < ty + d.size; y++) for (let x = tx; x < tx + d.size; x++) {
      if (!M.buildable(x, y)) return false;
      if (team === 0 && !M.explored[y * N + x]) return false;
    }
    return true;
  };
  G.place = function (team, type, tx, ty) {
    const d = B[type], t = S.teams[team];
    if (d.age > t.age || !G.canAfford(t, d.cost) || !G.canPlace(team, type, tx, ty)) return null;
    pay(t, d.cost);
    return spawnBuilding(type, team, tx, ty, false);
  };

  function freeAround(b, px, py) {
    const N = M.N;
    let best = null, bd = 1e9;
    for (let r = 1; r <= 4 && !best; r++) {
      for (let y = b.ty - r; y < b.ty + b.size + r; y++) for (let x = b.tx - r; x < b.tx + b.size + r; x++) {
        if (x > b.tx - r && x < b.tx + b.size + r - 1 && y > b.ty - r && y < b.ty + b.size + r - 1) continue;
        if (x < 0 || y < 0 || x >= N || y >= N || M.block[y * N + x]) continue;
        const d = Math.hypot(x + 0.5 - px, y + 0.5 - py);
        if (d < bd) { bd = d; best = [x, y]; }
      }
    }
    return best || [b.tx | 0, (b.ty + b.size) | 0];
  }

  /* ---------- stats ---------- */
  function speedOf(u) {
    const m = S.teams[u.team].mods, c = u.def.cls;
    let s = u.def.sp;
    if (c === 'inf' || c === 'spear' || c === 'cav' || c === 'hero') s *= m.speed;
    if (u.rallyT > S.time) s *= 1.2;
    return s;
  }
  G.atkOf = function (u) {
    const d = u.def, m = S.teams[u.team].mods;
    let a = d.atk;
    if (u.kind === 'b') return a + m.tower;
    if (d.cls === 'vill') return a;
    if (d.dmg === 'melee') a += m.melee; else if (d.cls === 'archer') a += m.ranged;
    if (d.cls === 'gun' || d.cls === 'siege') a *= m.gun;
    if (u.auraT > S.time) a *= 1.15;
    if (u.rallyT > S.time) a *= 1.3;
    return a;
  };
  G.rangeOf = function (u) {
    const d = u.def;
    if (u.kind === 'b') return d.range;
    if (d.range > 0) return d.range + (d.cls === 'archer' ? S.teams[u.team].mods.range : 0);
    return 0.75;
  };
  G.armorOf = function (e, melee) {
    if (e.kind === 'b') return 0;
    const m = S.teams[e.team].mods;
    return melee ? e.def.ar + m.armor : e.def.pa + m.parmor;
  };
  function calcDmg(a, e) {
    const d = a.def;
    let v = G.atkOf(a);
    const cls = e.kind === 'b' ? 'bld' : e.def.cls;
    if (d.bonus && d.bonus[cls]) v += d.bonus[cls];
    const type = a.kind === 'b' ? 'pierce' : d.dmg;
    if (e.kind === 'b') {
      if (type === 'pierce') v *= 0.12; else if (type === 'melee' && d.cls !== 'eleph') v *= 0.5;
    } else v -= G.armorOf(e, type === 'melee');
    return Math.max(1, v);
  }
  function distTo(u, e) {
    if (e.kind === 'b') {
      const dx = Math.max(e.tx - u.x, 0, u.x - (e.tx + e.size)), dy = Math.max(e.ty - u.y, 0, u.y - (e.ty + e.size));
      return Math.hypot(dx, dy);
    }
    return Math.max(0, Math.hypot(e.x - u.x, e.y - u.y) - e.def.r);
  }
  G.distTo = distTo;

  /* ---------- movement ---------- */
  function setOrder(u, o) {
    if (u.farm) { const f = byId(u.farm); if (f && f.worker === u.id) f.worker = 0; u.farm = 0; }
    u.order = o; u.path = null; u.pi = 0; u.pt = 0; u.fail = 0;
  }
  G.setOrder = setOrder;

  function step(u, dt) {
    const p = u.path;
    if (!p || u.pi >= p.length) return 1;
    let sp = speedOf(u) * dt;
    const N = M.N;
    while (sp > 0 && u.pi < p.length) {
      const w = p[u.pi], dx = w[0] - u.x, dy = w[1] - u.y, d = Math.hypot(dx, dy);
      let nx, ny;
      if (d <= sp) { nx = w[0]; ny = w[1]; } else { nx = u.x + dx / d * sp; ny = u.y + dy / d * sp; }
      const ti = (ny | 0) * N + (nx | 0), ci = (u.y | 0) * N + (u.x | 0);
      if (ti !== ci && M.block[ti]) return 2;
      u.x = nx; u.y = ny;
      if (d <= sp) { sp -= d; u.pi++; } else sp = 0;
    }
    return u.pi >= p.length ? 1 : 0;
  }
  function direct(u, x, y, dt) {
    const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy);
    if (d < 0.01) return;
    const sp = Math.min(d, speedOf(u) * dt), nx = u.x + dx / d * sp, ny = u.y + dy / d * sp;
    if (M.block[(ny | 0) * M.N + (nx | 0)]) return;
    u.x = nx; u.y = ny;
  }
  /* 1 = in range, 0 = on the way, -1 = cannot reach */
  function approach(u, e, range, dt) {
    const d = distTo(u, e);
    if (d <= range) { u.path = null; return 1; }
    if (e.kind === 'u' && d < 2.2 && M.los(u.x, u.y, e.x, e.y)) { direct(u, e.x, e.y, dt); u.path = null; u.pt = 0; return 0; }
    u.pt -= dt;
    const fin = !u.path || u.pi >= u.path.length;
    if (u.pt <= 0 && (fin || (e.kind === 'u' && (Math.abs(e.x - u.ptx) > 1 || Math.abs(e.y - u.pty) > 1)))) {
      if (fin && u.path && u.fail >= 2) return -1;
      let x0, y0, x1, y1, k;
      if (e.kind === 'b') { x0 = e.tx; y0 = e.ty; x1 = e.tx + e.size - 1; y1 = e.ty + e.size - 1; k = Math.max(1, Math.floor(range * 0.7)); }
      else { x0 = x1 = e.x | 0; y0 = y1 = e.y | 0; k = Math.floor(range * 0.7); }
      u.path = M.findPath(u.x, u.y, x0, y0, x1, y1, k); u.pi = 0;
      u.pt = 0.5 + Math.random() * 0.3; u.ptx = e.x; u.pty = e.y;
      if (u.path.partial) u.fail++; else u.fail = 0;
    }
    if (u.path && step(u, dt) === 2) { u.path = null; u.pt = Math.min(u.pt, 0.15); }
    return 0;
  }

  /* ---------- combat ---------- */
  function acquire(u, rad) {
    let best = null, bs = 1e9;
    const wallOK = u.wallOK > S.time, h = u.home;
    for (const e of S.ents) {
      if (e.dead || !hostile(u.team, e.team)) continue;
      if (e.type === 'wall' && !wallOK) continue;
      if (e.id === u.avoidId && S.time < u.avoidT) continue;
      if (u.team !== 0 && e.kind === 'b' && !e.done && e.type === 'farm') continue;
      const d = distTo(u, e);
      if (d > rad) continue;
      if (h && Math.hypot(e.x - h.x, e.y - h.y) > 11) continue;
      const s = d + (e.kind === 'b' ? (e.def.atk ? 2 : e.type === 'wall' ? 9 : 5) : 0) + (e.kind === 'u' && e.def.cls === 'vill' ? 1.5 : 0);
      if (s < bs) { bs = s; best = e; }
    }
    return best;
  }
  function shoot(a, e) {
    const dmg = calcDmg(a, e), d = Math.hypot(e.x - a.x, e.y - a.y);
    const kind = a.kind === 'b' ? 'arrow' : a.def.cls === 'siege' ? 'ball' : a.def.cls === 'gun' ? 'shot' : 'arrow';
    const spd = kind === 'ball' ? 10 : kind === 'shot' ? 28 : 13;
    S.proj.push({ x: a.x, y: a.y, sx: a.x, sy: a.y, tx: e.x, ty: e.y, id: e.id, t: 0, dur: Math.max(0.08, d / spd), dmg, src: a.id, team: a.team, kind, h0: a.kind === 'b' ? a.def.ht * 0.7 : 12 });
    if (kind !== 'arrow') S.fx.push({ k: 'smoke', x: a.x, y: a.y, t: 0, d: 0.5 });
    G.sfx(kind === 'arrow' ? 'arrow' : kind === 'ball' ? 'boom' : 'shot', a);
  }
  function fire(u, e) {
    u.atkAnim = S.time;
    if (u.def.range > 1) shoot(u, e);
    else { hit(e, calcDmg(u, e), u); G.sfx('hit', u); }
  }
  function hit(e, dmg, src) {
    if (e.dead) return;
    e.hp -= dmg; e.flash = 0.12; e.lastHit = S.time;
    const t = S.teams[e.team];
    if (src && !src.dead) {
      if (e.team === 0 && S.time - S.alertT > 12) {
        S.alertT = S.time; S.pings.push({ x: e.x, y: e.y, t: S.time });
        G.msg(e.kind === 'b' ? 'Your ' + G.nameOf(e) + ' is under attack!' : e.def.cls === 'vill' ? 'Your Rayat are under attack!' : 'Your troops are under attack!', 'warn');
        G.sfx('alert');
      }
      if (t.isAI && t.ai && (e.kind === 'b' || e.def.cls === 'vill')) t.ai.threat = { x: src.x, y: src.y, t: S.time };
      if (isMil(e) && e.def.atk > 3) {
        const o = e.order;
        if (!o) setOrder(e, { type: 'attack', id: src.id, auto: true, ox: e.x, oy: e.y });
        else if (o.type === 'move' && o.amove) setOrder(e, { type: 'attack', id: src.id, auto: true, resume: { x: o.x, y: o.y } });
        else if (o.type === 'attack' && o.auto && src.kind === 'u') { const c = byId(o.id); if (c && c.kind === 'b') { o.id = src.id; e.path = null; e.pt = 0; } }
      }
    }
    if (e.hp <= 0) kill(e, src);
  }
  function kill(e, src) {
    if (e.dead) return;
    e.dead = true; e.hp = 0; S.dirty = true; S.byId.delete(e.id);
    const t = S.teams[e.team];
    if (e.kind === 'u') {
      t.pop -= e.def.pop;
      if (e.farm) { const f = byId(e.farm); if (f && f.worker === e.id) f.worker = 0; }
      if (e.def.hero) {
        if (e.def.respawn) {
          t.heroes[e.type] = -1; t.down[e.type] = S.time + 45;
          if (e.team === 0) { G.msg(G.nameOf(e) + ' is wounded and withdraws to the Rajwada.', 'warn'); G.sfx('alert'); }
        } else {
          delete t.heroes[e.type];
          G.msg(e.def.n + ' has been defeated!', 'good'); G.sfx('horn');
        }
      }
      S.fx.push({ k: 'corpse', x: e.x, y: e.y, t: 0, d: 6, c: t.f.c });
    } else {
      const N = M.N;
      for (let y = e.ty; y < e.ty + e.size; y++) for (let x = e.tx; x < e.tx + e.size; x++) { const i = y * N + x; if (M.bld[i] === e.id) { M.bld[i] = 0; M.freeTile(i); } }
      for (const q of e.queue) undoQueue(t, q);
      recalcPop(t);
      S.fx.push({ k: 'rubble', x: e.x, y: e.y, t: 0, d: 8, s: e.size });
      G.sfx('crash', e);
      if (e.type === 'tc' && e.team !== 0) G.msg('The ' + t.f.short + ' ' + G.nameOf(e) + ' has fallen!', 'good');
    }
  }
  G.kill = kill;

  /* ---------- unit AI ---------- */
  function finishAttack(u, o) {
    if (o.resume) setOrder(u, { type: 'move', x: o.resume.x, y: o.resume.y, amove: true });
    else setOrder(u, null);
  }
  function nearestDrop(u, key) {
    let best = null, bd = 1e9;
    for (const e of S.ents) {
      if (e.dead || e.kind !== 'b' || e.team !== u.team || !e.done || !e.def.drop || e.def.drop.indexOf(key) < 0) continue;
      const d = distTo(u, e);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }
  function freeFarm(u, near) {
    let best = null, bd = 1e9;
    for (const e of S.ents) {
      if (e.dead || e.type !== 'farm' || e.team !== u.team || !e.done) continue;
      if (e.worker && e.worker !== u.id && byId(e.worker)) continue;
      const d = Math.hypot(e.x - near.x, e.y - near.y);
      if (d < bd) { bd = d; best = e; }
    }
    return bd < 14 ? best : null;
  }
  function afterBuild(u, b) {
    if (b.type === 'farm' && !b.dead && (!b.worker || !byId(b.worker))) { setOrder(u, { type: 'gather', rt: 5, farm: b.id, phase: 'go' }); return; }
    let best = null, bd = 12;
    for (const e of S.ents) if (!e.dead && e.kind === 'b' && e.team === u.team && !e.done) { const d = distTo(u, e); if (d < bd) { bd = d; best = e; } }
    if (best) { setOrder(u, { type: 'build', id: best.id }); return; }
    if (b.def.drop && b.type !== 'tc') {
      const types = b.type === 'kothar' ? [2] : [1, 3, 4];
      let pick = null, pd = 1e9;
      for (const rt of types) { const n = M.nearestRes(rt, b.x, b.y, 8); if (n) { const d = Math.hypot(n.x - b.x, n.y - b.y); if (d < pd) { pd = d; pick = { rt, n }; } } }
      if (pick) { setOrder(u, { type: 'gather', rt: pick.rt, tx: pick.n.x, ty: pick.n.y, phase: 'go' }); return; }
    }
    setOrder(u, null);
  }

  function updGather(u, o, dt) {
    const key = RKEY[o.rt], t = S.teams[u.team], N = M.N;
    if (u.ctype !== key) { u.carry = 0; u.ctype = key; }
    if (o.phase === 'ret') {
      let d = byId(o.drop);
      if (!d || d.dead) {
        d = nearestDrop(u, key);
        if (!d) { setOrder(u, null); return; }
        o.drop = d.id; u.path = null; u.pt = 0; u.fail = 0;
      }
      const r = approach(u, d, 1.0, dt);
      if (r === 1) { t.res[key] += Math.floor(u.carry); u.carry = 0; o.phase = 'go'; u.path = null; u.pt = 0; u.fail = 0; }
      else if (r === -1) setOrder(u, null);
      return;
    }
    if (o.rt === 5) {
      let f = byId(o.farm);
      if (!f || f.dead) { f = freeFarm(u, u); if (!f) { setOrder(u, null); return; } o.farm = f.id; }
      if (!f.done) { setOrder(u, { type: 'build', id: f.id }); return; }
      if (f.worker && f.worker !== u.id && byId(f.worker)) {
        const g = freeFarm(u, f);
        if (!g) { setOrder(u, null); return; }
        f = g; o.farm = g.id; u.path = null; u.pt = 0;
      }
      f.worker = u.id; u.farm = f.id;
      if (Math.hypot(f.x - u.x, f.y - u.y) > 0.7) {
        u.pt -= dt;
        if ((!u.path || u.pi >= u.path.length) && u.pt <= 0) { const fx = f.x | 0, fy = f.y | 0; u.path = M.findPath(u.x, u.y, fx, fy, fx, fy, 0); u.pi = 0; u.pt = 0.6; if (!u.path.length) direct(u, f.x, f.y, dt); }
        if (step(u, dt) === 2) u.path = null;
      } else { u.working = true; u.carry += RATE[5] * t.mods.farm * dt; }
    } else {
      let i = o.ty * N + o.tx;
      if (M.resType[i] !== o.rt) {
        const n = M.nearestRes(o.rt, o.tx + 0.5, o.ty + 0.5, 10);
        if (!n) { if (u.carry >= 1) { o.phase = 'ret'; o.drop = 0; u.path = null; u.pt = 0; } else setOrder(u, null); return; }
        o.tx = n.x; o.ty = n.y; u.path = null; u.pt = 0; i = o.ty * N + o.tx;
      }
      if (Math.abs(u.x - (o.tx + 0.5)) < 1.3 && Math.abs(u.y - (o.ty + 0.5)) < 1.3) {
        u.path = null; u.working = true; o.fails = 0;
        const amt = RATE[o.rt] * dt;
        u.carry += amt; o.acc = (o.acc || 0) + amt;
        while (o.acc >= 1) { o.acc -= 1; if (M.resAmt[i] > 0) M.resAmt[i]--; if (M.resAmt[i] <= 0) { M.deplete(i); break; } }
        if (o.tx + 0.5 !== u.x) u.dir = ((o.tx + 0.5 - u.x) - (o.ty + 0.5 - u.y)) >= 0 ? 1 : -1;
      } else {
        u.pt -= dt;
        if ((!u.path || u.pi >= u.path.length) && u.pt <= 0) {
          if (u.path) {           // arrived somewhere but not adjacent: unreachable, pick another
            o.fails = (o.fails || 0) + 1;
            const n = M.nearestRes(o.rt, u.x, u.y, 7);
            if (!n || o.fails > 4) { setOrder(u, null); return; }
            o.tx = n.x; o.ty = n.y;
          }
          u.path = M.findPath(u.x, u.y, o.tx, o.ty, o.tx, o.ty, 1); u.pi = 0; u.pt = 0.5;
        }
        if (step(u, dt) === 2) u.path = null;
      }
    }
    if (u.carry >= CAP) { o.phase = 'ret'; o.drop = 0; u.path = null; u.pt = 0; u.fail = 0; }
  }

  function updUnit(u, dt) {
    u.cd -= dt; u.flash -= dt; u.working = false;
    const px = u.x, py = u.y, o = u.order;
    if (!o) {
      if (u.def.atk > 3 && isMil(u)) {
        u.scanT -= dt;
        if (u.scanT <= 0) {
          u.scanT = 0.5;
          const e = acquire(u, u.def.sight);
          if (e) setOrder(u, { type: 'attack', id: e.id, auto: true, ox: u.x, oy: u.y });
          else if (u.home && Math.hypot(u.x - u.home.x, u.y - u.home.y) > 2) setOrder(u, { type: 'move', x: u.home.x, y: u.home.y });
        }
      }
    } else if (o.type === 'move') {
      if (!u.path) {
        u.pt -= dt;
        if (u.pt <= 0) {
          const tx = o.x | 0, ty = o.y | 0;
          u.path = M.findPath(u.x, u.y, tx, ty, tx, ty, 0); u.pi = 0; u.pt = 0.4; o.tries = (o.tries || 0) + 1;
          if (!u.path.length || o.tries > 6) setOrder(u, null);
        }
      } else {
        const r = step(u, dt);
        if (r === 1) setOrder(u, null); else if (r === 2) u.path = null;
      }
      if (o.amove && u.order === o) {
        u.scanT -= dt;
        if (u.scanT <= 0) {
          u.scanT = 0.5;
          const e = acquire(u, u.def.sight);
          if (e) setOrder(u, { type: 'attack', id: e.id, auto: true, resume: { x: o.x, y: o.y } });
        }
      }
    } else if (o.type === 'attack') {
      const e = byId(o.id);
      if (!e || e.dead) finishAttack(u, o);
      else {
        if (o.auto) {
          if (e.kind === 'b') {
            u.scanT -= dt;
            if (u.scanT <= 0) { u.scanT = 0.7; const n = acquire(u, u.def.sight); if (n && n.kind === 'u' && n.def.cls !== 'vill') { o.id = n.id; u.path = null; u.pt = 0; } }
          }
          if (u.home && Math.hypot(u.x - u.home.x, u.y - u.home.y) > 13) { setOrder(u, { type: 'move', x: u.home.x, y: u.home.y }); return; }
          if (!o.resume && o.ox != null && Math.hypot(u.x - o.ox, u.y - o.oy) > 14) { setOrder(u, null); return; }
        }
        const r = approach(u, e, G.rangeOf(u), dt);
        if (r === 1) {
          const sd = (e.x - u.x) - (e.y - u.y);
          if (Math.abs(sd) > 0.05) u.dir = sd > 0 ? 1 : -1;
          if (u.cd <= 0) { u.cd = u.def.rof; fire(u, e); }
        } else if (r === -1) {
          u.avoidId = e.id; u.avoidT = S.time + 15; u.wallOK = S.time + 15;
          finishAttack(u, o);
        }
      }
    } else if (o.type === 'gather') updGather(u, o, dt);
    else if (o.type === 'build') {
      const b = byId(o.id);
      if (!b || b.dead) setOrder(u, null);
      else if (b.done && b.hp >= b.maxhp) afterBuild(u, b);
      else {
        const r = approach(u, b, 1.0, dt);
        if (r === 1) {
          u.working = true;
          if (!b.done) {
            const inc = dt / b.def.time;
            b.prog += inc; b.hp = Math.min(b.maxhp, b.hp + b.maxhp * inc);
            if (b.prog >= 1) { b.prog = 1; b.done = true; recalcPop(S.teams[b.team]); if (b.team === 0) G.sfx('built'); }
          } else b.hp = Math.min(b.maxhp, b.hp + b.maxhp * dt / (b.def.time * 2.5));
        } else if (r === -1) setOrder(u, null);
      }
    }
    const mx = u.x - px, my = u.y - py;
    u.moving = mx !== 0 || my !== 0;
    if (u.moving) { u.anim += dt * 11; const sd = mx - my; if (Math.abs(sd) > 0.003) u.dir = sd > 0 ? 1 : -1; }
    else if (u.working) u.anim += dt * 7;
  }

  /* ---------- buildings ---------- */
  function undoQueue(t, q) {
    if (q.kind === 'tech') delete t.techs[q.key];
    else if (q.kind === 'age') t.aging = false;
    else if (U[q.key].hero) delete t.heroes[q.key];
  }
  G.queue = function (b, kind, key) {
    const t = S.teams[b.team];
    if (!b.done || b.queue.length >= 5) return false;
    let d;
    if (kind === 'unit') {
      d = U[key];
      if (d.age > t.age || (d.only && d.only.indexOf(t.faction) < 0)) return false;
      if (d.hero && t.heroes[key]) return false;
    } else if (kind === 'tech') {
      d = TE[key];
      if (t.techs[key] || d.age > t.age || (d.req && t.techs[d.req] !== 2)) return false;
    } else {
      if (t.age >= 3 || t.aging) return false;
      d = G.AGES[t.age + 1];
    }
    if (!G.canAfford(t, d.cost)) return false;
    pay(t, d.cost);
    if (kind === 'tech') t.techs[key] = 1; else if (kind === 'age') t.aging = true; else if (d.hero) t.heroes[key] = -1;
    b.queue.push({ kind, key, t: 0, time: d.time, cost: d.cost });
    return true;
  };
  G.cancelQueue = function (b, i) {
    const q = b.queue[i]; if (!q) return;
    const t = S.teams[b.team];
    refund(t, q.cost); undoQueue(t, q); b.queue.splice(i, 1);
  };
  function produce(b, key) {
    const r = b.rally, s = freeAround(b, r ? r.x : b.x - 1, r ? r.y : b.y + b.size);
    const u = spawnUnit(key, b.team, s[0] + 0.5, s[1] + 0.5);
    if (r) {
      if (u.def.cls === 'vill' && r.rt) {
        if (r.rt === 5) setOrder(u, { type: 'gather', rt: 5, farm: r.farm, phase: 'go' });
        else setOrder(u, { type: 'gather', rt: r.rt, tx: r.tx, ty: r.ty, phase: 'go' });
      } else G.cmd.move([u], r.x, r.y);
    }
    if (b.team === 0) G.sfx('trained');
    return u;
  }
  function updBld(b, dt) {
    b.flash -= dt;
    if (!b.done) return;
    const t = S.teams[b.team];
    if (b.queue.length) {
      const q = b.queue[0];
      q.t += dt;
      if (q.t >= q.time) {
        q.t = q.time;
        if (q.kind === 'unit') {
          const d = U[q.key];
          if (!d.hero && t.pop + d.pop > t.popCap) b.stalled = true;
          else { b.stalled = false; b.queue.shift(); produce(b, q.key); }
        } else if (q.kind === 'tech') {
          b.queue.shift(); t.techs[q.key] = 2; TE[q.key].apply(t, S);
          if (b.team === 0) { G.msg('Research complete: ' + TE[q.key].n, 'good'); G.sfx('built'); }
        } else {
          b.queue.shift(); t.aging = false; t.age++;
          const A = G.AGES[t.age];
          if (b.team === 0) { G.msg('You have entered the age of ' + A.name + ' (' + A.years + '). ' + A.blurb, 'age'); G.sfx('horn'); }
          else G.msg('The ' + t.f.short + ' grow stronger.', 'warn');
        }
      }
    }
    if (b.def.atk) {
      b.cd -= dt;
      if (b.cd <= 0) {
        b.cd = 0.4;
        let best = null, bd = G.rangeOf(b);
        for (const e of S.ents) {
          if (e.dead || e.kind !== 'u' || !hostile(b.team, e.team)) continue;
          const d = Math.hypot(e.x - b.x, e.y - b.y);
          if (d < bd) { bd = d; best = e; }
        }
        if (best) { b.cd = b.def.rof; shoot(b, best); }
      }
    }
  }

  /* ---------- per-tick systems ---------- */
  function updProj(dt) {
    for (const p of S.proj) {
      const e = byId(p.id);
      if (e && !e.dead) { p.tx = e.x; p.ty = e.y; }
      p.t += dt;
      const k = Math.min(1, p.t / p.dur);
      p.x = p.sx + (p.tx - p.sx) * k; p.y = p.sy + (p.ty - p.sy) * k;
      if (k >= 1) {
        p.done = true;
        if (e && !e.dead) hit(e, p.dmg, byId(p.src) || { dead: true });
        if (p.kind === 'ball') S.fx.push({ k: 'blast', x: p.tx, y: p.ty, t: 0, d: 0.5 });
      }
    }
    if (S.proj.length) S.proj = S.proj.filter(p => !p.done);
  }
  function updFx(dt) {
    let dead = false;
    for (const f of S.fx) { f.t += dt; if (f.t >= f.d) dead = true; }
    if (dead) S.fx = S.fx.filter(f => f.t < f.d);
  }
  function separate() {
    const still = [], N = M.N;
    for (const u of S.ents) if (u.kind === 'u' && !u.dead && !u.moving && (!u.order || u.order.type === 'attack')) still.push(u);
    for (let i = 0; i < still.length; i++) {
      const a = still[i];
      for (let j = i + 1; j < still.length; j++) {
        const b = still[j], dx = b.x - a.x, dy = b.y - a.y;
        if (dx > 0.5 || dx < -0.5 || dy > 0.5 || dy < -0.5) continue;
        let d = Math.hypot(dx, dy);
        if (d >= 0.5) continue;
        let ux, uy;
        if (d < 0.01) { const ang = (a.id * 2.4) % 6.28; ux = Math.cos(ang); uy = Math.sin(ang); d = 0; } else { ux = dx / d; uy = dy / d; }
        const push = (0.5 - d) * 0.25;
        const ax = a.x - ux * push, ay = a.y - uy * push, bx = b.x + ux * push, by = b.y + uy * push;
        if (ax > 0.3 && ay > 0.3 && ax < N - 0.3 && ay < N - 0.3 && !M.block[(ay | 0) * N + (ax | 0)]) { a.x = ax; a.y = ay; }
        if (bx > 0.3 && by > 0.3 && bx < N - 0.3 && by < N - 0.3 && !M.block[(by | 0) * N + (bx | 0)]) { b.x = bx; b.y = by; }
      }
    }
  }
  function fog() {
    const N = M.N, vis = M.visible, ex = M.explored;
    vis.fill(0);
    for (const e of S.ents) {
      if (e.dead || e.team !== 0) continue;
      const r = e.kind === 'b' && !e.done ? 3 : e.def.sight, cx = e.x | 0, cy = e.y | 0, r2 = r * r + 1;
      for (let dy = -r; dy <= r; dy++) {
        const y = cy + dy; if (y < 0 || y >= N) continue;
        for (let dx = -r; dx <= r; dx++) {
          const x = cx + dx; if (x < 0 || x >= N || dx * dx + dy * dy > r2) continue;
          const i = y * N + x; vis[i] = 1; ex[i] = 1;
        }
      }
    }
  }
  G.fog = fog;

  function second() {
    const p = S.teams[0], sh = byId(p.heroes.shivaji);
    S.idleVill = 0;
    for (const e of S.ents) {
      if (e.dead) continue;
      if (e.kind === 'u') {
        if (e.def.regen && e.hp < e.maxhp) e.hp = Math.min(e.maxhp, e.hp + e.def.regen);
        if (e.team === 0) {
          if (sh && e !== sh && Math.hypot(e.x - sh.x, e.y - sh.y) < 6) e.auraT = S.time + 1.5;
          if (e.def.cls === 'vill' && !e.order) S.idleVill++;
        }
      } else if (e.done && e.def.heal) {
        for (const u of S.ents) if (u.kind === 'u' && !u.dead && u.team === e.team && u.hp < u.maxhp && Math.hypot(u.x - e.x, u.y - e.y) < e.def.heal) u.hp = Math.min(u.maxhp, u.hp + 3);
      }
    }
    for (const t of S.teams) {
      for (const k in t.down) {
        if (S.time < t.down[k]) continue;
        const tc = S.ents.find(e => e.type === 'tc' && e.team === t.id && e.done && !e.dead);
        if (!tc) continue;
        delete t.down[k];
        const s = freeAround(tc, tc.x - 1, tc.y + 3);
        const u = spawnUnit(k, t.id, s[0] + 0.5, s[1] + 0.5);
        if (t.id === 0) { G.msg(G.nameOf(u) + ' has recovered and rides out again!', 'good'); G.sfx('horn'); }
      }
      if (t.isAI) G.AI.tick(t);
    }
    checkEnd();
  }
  function checkEnd() {
    let all = true;
    for (const o of S.objectives) { if (!o.done && o.check()) { o.done = true; G.msg('Objective complete: ' + o.text, 'good'); } if (!o.done) all = false; }
    if (all) { S.over = { win: true }; G.sfx('horn'); return; }
    let blds = 0, tc = 0, vill = 0;
    for (const e of S.ents) if (!e.dead && e.team === 0) {
      if (e.kind === 'b') { if (e.type !== 'wall' && e.type !== 'farm') blds++; if (e.type === 'tc') tc++; } else if (e.def.cls === 'vill') vill++;
    }
    if (blds === 0 || (tc === 0 && vill === 0)) S.over = { win: false };
  }

  G.tick = function (dt) {
    S = G.S;
    if (!S || S.over) return;
    S.time += dt; S.n++;
    const ents = S.ents;
    for (let i = 0; i < ents.length; i++) { const e = ents[i]; if (e.dead) continue; if (e.kind === 'u') updUnit(e, dt); else updBld(e, dt); }
    updProj(dt); updFx(dt);
    if (S.n % 3 === 0) separate();
    for (const t of S.teams) if (t.mods.trickle) t.res.g += t.mods.trickle * dt;
    S.fogT -= dt; if (S.fogT <= 0) { S.fogT = 0.3; fog(); }
    S.secT -= dt; if (S.secT <= 0) { S.secT += 1; second(); }
    if (S.dirty) { S.ents = S.ents.filter(e => !e.dead); S.dirty = false; }
  };

  /* ---------- commands (used by the player UI and the AI) ---------- */
  G.cmd = {
    move(units, x, y, amove) {
      const N = M.N;
      x = Math.max(0.5, Math.min(N - 0.5, x)); y = Math.max(0.5, Math.min(N - 0.5, y));
      const tiles = M.spiral(x, y, units.length, 16);
      units.forEach((u, i) => {
        const t = tiles[i] || tiles[tiles.length - 1] || [x | 0, y | 0];
        setOrder(u, { type: 'move', x: t[0] + 0.5, y: t[1] + 0.5, amove: !!amove });
      });
    },
    attack(units, e) { for (const u of units) setOrder(u, { type: 'attack', id: e.id }); },
    gather(units, rt, tx, ty) { for (const u of units) if (u.def.cls === 'vill') setOrder(u, { type: 'gather', rt, tx, ty, phase: 'go' }); },
    farm(u, b) { setOrder(u, { type: 'gather', rt: 5, farm: b.id, phase: 'go' }); },
    build(units, b) { for (const u of units) if (u.def.cls === 'vill') setOrder(u, { type: 'build', id: b.id }); },
    stop(units) { for (const u of units) setOrder(u, null); }
  };
  G.trade = function (mode, key) {
    const t = S.teams[0], st = key === 's';
    if (mode === 'sell') { if (t.res[key] < 100) return false; t.res[key] -= 100; t.res.g += st ? 70 : 55; }
    else { const c = st ? 140 : 110; if (t.res.g < c) return false; t.res.g -= c; t.res[key] += 100; }
    G.sfx('coin'); return true;
  };
  G.heroAbility = function () {
    const t = S.teams[0], sh = byId(t.heroes.shivaji);
    if (!sh || S.time < t.abilityT) return false;
    t.abilityT = S.time + 90;
    for (const u of S.ents) if (u.kind === 'u' && !u.dead && u.team === 0 && Math.hypot(u.x - sh.x, u.y - sh.y) < 10) u.rallyT = S.time + 15;
    S.fx.push({ k: 'ring', x: sh.x, y: sh.y, t: 0, d: 1.2, r: 10, c: '#ffb347' });
    G.msg('Har Har Mahadev! Your troops surge forward.', 'age'); G.sfx('horn');
    return true;
  };
  G.destroy = function (e) { if (e && !e.dead && e.team === 0 && !e.def.hero) kill(e, null); };

  /* ---------- scenario setup ---------- */
  function buildFort(t, e, D) {
    const cx = e.x, cy = e.y, W = 10, lo = -W, hi = W - 1;
    for (let dy = lo - 2; dy <= hi + 2; dy++) for (let dx = lo - 2; dx <= hi + 2; dx++) {
      const edge = dx <= lo || dx >= hi || dy <= lo || dy >= hi;
      if (edge) M.forceClear(cx + dx, cy + dy);
    }
    spawnBuilding('tc', t.id, cx - 2, cy - 2, true);
    const towers = Math.max(0, D.towers - (e.ease || 0) * 2);
    const tw = [];
    const corners = [[lo, lo], [hi, hi], [lo, hi], [hi, lo]];
    const gates = [[-3, lo], [2, lo], [-3, hi], [2, hi], [lo, -3], [lo, 2], [hi, -3], [hi, 2]];
    for (let i = 0; i < Math.min(4, towers); i++) tw.push(corners[i]);
    for (let i = 0; i < Math.min(8, towers - 4); i++) tw.push(gates[i]);
    for (let dy = lo; dy <= hi; dy++) for (let dx = lo; dx <= hi; dx++) {
      if (!(dx === lo || dx === hi || dy === lo || dy === hi)) continue;
      const gate = (dx >= -2 && dx <= 1) || (dy >= -2 && dy <= 1);
      const corner = (dx === lo || dx === hi) && (dy === lo || dy === hi);
      if (gate && !corner) continue;
      const x = cx + dx, y = cy + dy;
      if (!M.inb(x, y) || M.bld[y * M.N + x]) continue;
      spawnBuilding(tw.some(p => p[0] === dx && p[1] === dy) ? 'tower' : 'wall', t.id, x, y, true);
    }
    for (const k of ['barracks', 'house', 'house', 'house']) {
      const s = G.AI.findSpot(B[k].size, cx, cy, 4, 9);
      if (s) spawnBuilding(k, t.id, s.x, s.y, true);
    }
    for (let i = 0; i < 5; i++) spawnUnit('villager', t.id, cx - 2.5 + i, cy + 2.5);
    const n = Math.max(1, D.garrison - (e.ease || 0));
    for (let i = 0; i < n; i++) { const u = spawnUnit(i % 3 === 2 && t.age >= 1 ? 'archer' : i % 3 === 1 && t.age >= 1 ? 'spear' : 'sword', t.id, cx + 2.5 + (i % 3), cy - 1.5 + ((i / 3) | 0)); u.home = { x: u.x, y: u.y }; }
    if (e.cmdr) { const c = spawnUnit(e.cmdr, t.id, cx + 0.5, cy + 3.5); c.home = { x: c.x, y: c.y }; t.cmdr = c.id; }
  }

  G.newGame = function (scn, diff) {
    S = G.S = { time: 0, n: 0, ents: [], byId: new Map(), nextId: 1, teams: [], proj: [], fx: [], pings: [], scn, diff,
      over: null, fogT: 0, secT: 1, alertT: -99, dirty: false, objectives: [], idleVill: 0 };
    const starts = [{ x: scn.player.x, y: scn.player.y }].concat(scn.enemies.map(e => ({ x: e.x, y: e.y, fort: true })));
    M.generate(scn.map, starts);
    const D = G.DIFF[diff];
    const p = mkTeam(0, 'swarajya', false); S.teams.push(p);
    p.res = Object.assign({ f: 250, w: 250, g: 100, s: 150 }, scn.res || {});
    p.age = scn.age || 0;
    const px = scn.player.x, py = scn.player.y;
    spawnBuilding('tc', 0, px - 2, py - 2, true);
    for (let i = 0; i < 4; i++) spawnUnit('villager', 0, px - 1.5 + i, py + 2.5);
    scn.heroes.forEach((h, i) => spawnUnit(h, 0, px + 2.5, py - 0.5 + i));
    for (let i = 0; i < (scn.escort || 0); i++) spawnUnit('sword', 0, px + 3.5 + ((i / 2) | 0), py - 0.5 + (i % 2));
    scn.enemies.forEach((e, i) => {
      const t = mkTeam(i + 1, e.faction, true); S.teams.push(t);
      t.res = { f: 200, w: 200, g: 100, s: 100 }; t.age = e.age || 0;
      buildFort(t, e, D);
      G.AI.init(t, e, D);
      const qn = G.defName('tc', e.faction);
      S.objectives.push({ text: 'Destroy the ' + t.f.short + ' ' + qn, done: false, check: () => !S.ents.some(x => x.type === 'tc' && x.team === t.id && !x.dead) });
      if (e.cmdr) S.objectives.push({ text: 'Defeat ' + U[e.cmdr].n, done: false, check: () => !byId(t.cmdr) });
    });
    fog();
    return S;
  };
})();
