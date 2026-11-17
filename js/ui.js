'use strict';
/* HUD, selection, mouse and keyboard input */
(function () {
  const M = G.Map, R = G.Render, U = G.UNITS, B = G.BLD, TE = G.TECH;
  const ui = G.ui = { sel: [], selSet: new Set(), placing: null, placeTile: null, menu: 'main', drag: null, mx: 0, my: 0, groups: {}, keys: {}, inside: false };
  const $ = id => document.getElementById(id);
  const HOT = 'QWERTASDFGZXCVB';
  let cmds = [], sigInfo = '', sigCmd = '', lastClick = { t: 0, id: 0 }, lastGroup = { t: 0, k: '' };

  function setSel(ids) { ui.sel = ids; ui.selSet = new Set(ids); ui.menu = 'main'; }
  G.setSel = setSel;
  function selEnts() {
    const out = [];
    for (const id of ui.sel) { const e = G.byId(id); if (e && !e.dead) out.push(e); }
    if (out.length !== ui.sel.length) { ui.sel = out.map(e => e.id); ui.selSet = new Set(ui.sel); }
    return out;
  }
  const ownUnits = () => selEnts().filter(e => e.kind === 'u' && e.team === 0);
  const gy = n => '<img class="gy" src="' + R.glyph(n) + '">';
  const costStr = c => Object.keys(c).map(k => '<span>' + gy(k) + c[k] + '</span>').join('');
  const px = u => u.slice(0, 5) === 'data:' ? ' class="px"' : '';

  /* ---------- messages ---------- */
  G.msg = function (text, cls) {
    const box = $('msgs'); if (!box) return;
    const d = document.createElement('div'); d.className = 'msg ' + (cls || ''); d.textContent = text;
    box.appendChild(d);
    while (box.children.length > 5) box.removeChild(box.firstChild);
    setTimeout(() => { d.classList.add('fade'); setTimeout(() => d.remove(), 900); }, cls === 'age' ? 11000 : 6500);
  };

  /* ---------- sound ---------- */
  let ac = null; const last = {};
  G.sfx = function (name, src) {
    if (G.muted || G.headless) return;
    const now = performance.now();
    if (now - (last[name] || 0) < 90) return;
    if (src && G.S) { const i = (src.y | 0) * M.N + (src.x | 0); if (!M.visible[i]) return; const p = G.w2s(src.x, src.y); if (p[0] < -200 || p[1] < -200 || p[0] > R.W + 200 || p[1] > R.H + 200) return; }
    last[name] = now;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime;
      const tone = (type, f0, f1, dur, vol, delay) => {
        const o = ac.createOscillator(), g = ac.createGain(), s = t + (delay || 0);
        o.type = type; o.frequency.setValueAtTime(f0, s); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), s + dur);
        g.gain.setValueAtTime(vol, s); g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        o.connect(g); g.connect(ac.destination); o.start(s); o.stop(s + dur + 0.02);
      };
      switch (name) {
        case 'select': tone('triangle', 520, 620, 0.07, 0.05); break;
        case 'move': tone('triangle', 380, 300, 0.08, 0.05); break;
        case 'hit': tone('square', 180 + Math.random() * 60, 90, 0.06, 0.035); break;
        case 'arrow': tone('sawtooth', 900, 400, 0.07, 0.02); break;
        case 'shot': tone('square', 140, 40, 0.12, 0.07); break;
        case 'boom': tone('sawtooth', 110, 28, 0.4, 0.14); break;
        case 'crash': tone('sawtooth', 90, 30, 0.6, 0.12); break;
        case 'built': tone('triangle', 440, 440, 0.1, 0.06); tone('triangle', 660, 660, 0.16, 0.06, 0.1); break;
        case 'trained': tone('triangle', 330, 500, 0.12, 0.05); break;
        case 'coin': tone('sine', 1200, 1600, 0.1, 0.05); break;
        case 'alert': tone('square', 500, 500, 0.12, 0.06); tone('square', 380, 380, 0.18, 0.06, 0.14); break;
        case 'horn': tone('sawtooth', 147, 147, 0.5, 0.09); tone('sawtooth', 196, 196, 0.7, 0.09, 0.4); tone('sawtooth', 220, 220, 0.9, 0.08, 0.95); break;
        case 'error': tone('square', 160, 120, 0.12, 0.05); break;
      }
    } catch (e) { /* audio unavailable */ }
  };

  /* ---------- picking ---------- */
  function seen(e) { if (e.team === 0 || G.reveal) return true; const i = (e.y | 0) * M.N + (e.x | 0); return e.kind === 'u' ? M.visible[i] : M.explored[i]; }
  function pick(sx, sy, tall) {
    const S = G.S, z = G.cam.z;
    let best = null, bd = 1e9;
    for (const e of S.ents) {
      if (e.dead || e.kind !== 'u' || !seen(e)) continue;
      const p = G.w2s(e.x, e.y), big = e.def.r > 0.35 || e.def.hero;
      const dx = sx - p[0], dy = (sy - (p[1] - (big ? 16 : 12) * z)) * 0.75, rr = (big ? 19 : 13) * z, d = dx * dx + dy * dy;
      if (d < rr * rr && d < bd) { bd = d; best = e; }
    }
    if (best) return best;
    for (const off of tall ? [0, 14, 30, 46] : [0, 12]) {
      const w = G.s2w(sx, sy + off * z), x = Math.floor(w[0]), y = Math.floor(w[1]);
      if (!M.inb(x, y)) continue;
      const id = M.bld[y * M.N + x];
      if (id) { const e = G.byId(id); if (e && seen(e) && (off === 0 || off < e.def.ht * 0.8)) return e; }
    }
    return null;
  }
  function pickRes(sx, sy) {
    for (const off of [0, 14, 28]) {
      const w = G.s2w(sx, sy + off * G.cam.z), x = Math.floor(w[0]), y = Math.floor(w[1]);
      if (!M.inb(x, y)) continue;
      const i = y * M.N + x;
      if (M.resType[i] && (M.explored[i] || G.reveal) && (off === 0 || M.resType[i] === 1)) return { rt: M.resType[i], x, y };
    }
    return null;
  }

  /* ---------- right-click orders ---------- */
  function order(sx, sy, wx, wy) {
    const S = G.S, sel = selEnts();
    if (!sel.length || sel[0].team !== 0) return;
    const mark = (x, y, c) => S.fx.push({ k: 'mark', x, y, t: 0, d: 0.5, c });
    const e = sx == null ? null : pick(sx, sy, false), res = sx == null || e ? null : pickRes(sx, sy);
    const units = sel.filter(u => u.kind === 'u');
    if (!units.length) {                                   // buildings selected: set rally point
      for (const b of sel) {
        if (!b.def.trains) continue;
        b.rally = { x: wx, y: wy };
        if (res) Object.assign(b.rally, { rt: res.rt, tx: res.x, ty: res.y, x: res.x + 0.5, y: res.y + 0.5 });
        else if (e && e.type === 'farm' && e.team === 0) Object.assign(b.rally, { rt: 5, farm: e.id, x: e.x, y: e.y });
      }
      mark(wx, wy, '#ffd23a'); G.sfx('move'); return;
    }
    const vills = units.filter(u => u.def.cls === 'vill'), others = units.filter(u => u.def.cls !== 'vill');
    if (e && G.hostile(0, e.team)) { G.cmd.attack(units, e); mark(e.x, e.y, '#ff5a4a'); G.sfx('move'); return; }
    if (e && e.team === 0 && e.kind === 'b') {
      if (vills.length) {
        if (!e.done || e.hp < e.maxhp) G.cmd.build(vills, e);
        else if (e.type === 'farm') {
          let first = true;
          for (const v of vills) { if (first) { G.cmd.farm(v, e); first = false; } else G.setOrder(v, { type: 'gather', rt: 5, farm: 0, phase: 'go' }); }
        } else if (e.def.drop) { for (const v of vills) if (v.carry >= 1 && v.order && v.order.type === 'gather') { v.order.phase = 'ret'; v.order.drop = e.id; v.path = null; v.pt = 0; } else G.cmd.move([v], wx, wy); }
        else G.cmd.move(vills, wx, wy);
      }
      if (others.length) G.cmd.move(others, wx, wy);
      mark(e.x, e.y, '#7dff7d'); G.sfx('move'); return;
    }
    if (res && vills.length) {
      G.cmd.gather(vills, res.rt, res.x, res.y);
      if (others.length) G.cmd.move(others, wx, wy);
      mark(res.x + 0.5, res.y + 0.5, '#ffd23a'); G.sfx('move'); return;
    }
    G.cmd.move(units, wx, wy);
    mark(wx, wy, '#7dff7d'); G.sfx('move');
  }

  /* ---------- command card ---------- */
  function lockTip(d, t) { return d.age > t.age ? 'Requires the age of ' + G.AGES[d.age].name : ''; }
  function buildCmd(key, t) {
    const d = B[key], lock = lockTip(d, t);
    return { icon: R.icon('b', key, 'swarajya'), name: d.n, dv: d.dv, desc: d.desc, cost: d.cost, off: !!lock, why: lock,
      run() { if (lock) return G.sfx('error'); ui.placing = key; } };
  }
  function getCmds() {
    const S = G.S, c = new Array(15).fill(null), sel = selEnts();
    if (!sel.length) return c;
    const e = sel[0], t = S.teams[0];
    if (e.team !== 0) return c;
    if (e.kind === 'b') {
      const del = { glyph: 'demolish', name: 'Demolish', desc: 'Tear down this building. (Click only. no hotkey.)', nohot: true, run() { for (const b of selEnts()) if (b.kind === 'b' && b.type === e.type) G.destroy(b); } };
      c[14] = del;
      if (!e.done) return c;
      let i = 0;
      const same = () => selEnts().filter(b => b.kind === 'b' && b.type === e.type && b.done).sort((a, b) => a.queue.length - b.queue.length);
      for (const k of e.def.trains || []) {
        const d = U[k];
        if (d.only && d.only.indexOf('swarajya') < 0) continue;
        if (d.hero && t.heroes[k]) continue;
        const lock = lockTip(d, t);
        c[i++] = { icon: R.icon('u', k, 'swarajya'), name: 'Train ' + d.n, dv: d.dv, desc: d.desc, cost: d.cost, off: !!lock, why: lock, stats: d,
          run() { if (lock || !G.queue(same()[0], 'unit', k)) { G.sfx('error'); if (!lock) G.msg(G.canAfford(t, d.cost) ? 'The queue is full.' : 'Not enough resources.', 'warn'); } } };
      }
      for (const k in TE) {
        const d = TE[k];
        if (d.at !== e.type || t.techs[k]) continue;
        if (d.req && t.techs[d.req] !== 2) continue;
        const lock = lockTip(d, t);
        c[i++] = { glyph: k, name: d.n, dv: d.dv, desc: d.desc, cost: d.cost, off: !!lock, why: lock,
          run() { if (lock || !G.queue(e, 'tech', k)) { G.sfx('error'); if (!lock) G.msg('Not enough resources.', 'warn'); } } };
      }
      if (e.type === 'tc' && t.age < 3 && !t.aging) {
        const A = G.AGES[t.age + 1];
        c[i++] = { glyph: 'age', name: 'Advance to ' + A.name, dv: A.dv, desc: A.years + '. ' + A.blurb, cost: A.cost, gold: true,
          run() { if (!G.queue(e, 'age')) { G.sfx('error'); G.msg('Not enough resources to advance.', 'warn'); } } };
      }
      if (e.type === 'market') {
        const tr = (mode, key, slot) => { c[slot] = { glyph: key, tag: mode === 'sell' ? '+' + (key === 's' ? 70 : 55) : '-' + (key === 's' ? 140 : 110), name: (mode === 'sell' ? 'Sell 100 ' : 'Buy 100 ') + G.RES[key].name, desc: mode === 'sell' ? 'Receive ' + (key === 's' ? 70 : 55) + ' Hon.' : 'Costs ' + (key === 's' ? 140 : 110) + ' Hon.', run() { if (!G.trade(mode, key)) G.sfx('error'); } }; };
        tr('sell', 'f', 5); tr('sell', 'w', 6); tr('sell', 's', 7); tr('buy', 'f', 10); tr('buy', 'w', 11); tr('buy', 's', 12);
      }
      return c;
    }
    const units = sel.filter(u => u.kind === 'u');
    const allVill = units.every(u => u.def.cls === 'vill');
    if (allVill) {
      if (ui.menu === 'econ') {
        ['house', 'farm', 'kothar', 'vakhar', 'market', 'smith', 'temple', 'tc'].forEach((k, i) => { c[i] = buildCmd(k, t); });
        c[14] = { glyph: 'back', name: 'Back', desc: '', run() { ui.menu = 'main'; } };
      } else if (ui.menu === 'mil') {
        ['barracks', 'range', 'stable', 'siege', 'tower', 'wall'].forEach((k, i) => { c[i] = buildCmd(k, t); });
        c[14] = { glyph: 'back', name: 'Back', desc: '', run() { ui.menu = 'main'; } };
      } else {
        c[0] = { glyph: 'econ', name: 'Build: Settlement', desc: 'Homes, farms, storehouses, market, smith and temple.', run() { ui.menu = 'econ'; } };
        c[1] = { glyph: 'mil', name: 'Build: Military', desc: 'Talim, Paga, Tofkhana, bastions and walls.', run() { ui.menu = 'mil'; } };
      }
    }
    if (ui.menu === 'main') {
      if (units.some(u => u.type === 'shivaji')) {
        const cd = Math.ceil(t.abilityT - S.time);
        c[5] = { glyph: 'rally', name: 'Har Har Mahadev', dv: 'हर हर महादेव', desc: 'Rally cry. For 15 seconds all your troops near Maharaj gain +30% attack and +20% speed.', off: cd > 0, why: cd > 0 ? 'Ready in ' + cd + 's' : '', tag: cd > 0 ? cd + 's' : '', gold: true,
          run() { if (!G.heroAbility()) G.sfx('error'); } };
      }
      c[7] = { glyph: 'stop', name: 'Stop', desc: 'Halt and stand ground.', run() { G.cmd.stop(ownUnits()); } };
    }
    return c;
  }

  function hpHtml(e) { const f = Math.max(0, e.hp / e.maxhp); return '<div class="hp"><i style="width:' + (f * 100).toFixed(0) + '%;background:' + (f > 0.5 ? '#5fd35f' : f > 0.25 ? '#e3b23c' : '#d8442b') + '"></i><span>' + Math.ceil(e.hp) + ' / ' + e.maxhp + '</span></div>'; }
  function updatePanel() {
    const S = G.S, sel = selEnts(), t = S.teams[0];
    let h = '', pic = '';
    if (!sel.length) {
      const A = G.AGES[t.age];
      h = '<div class="idle"><div class="nm">' + A.name + ' <span class="dv">' + A.dv + '</span></div><div class="sub">' + A.years + '</div><p>' + A.blurb + '</p></div>';
    } else if (sel.length === 1) {
      const e = sel[0], tm = S.teams[e.team], d = e.def;
      const ic = R.icon(e.kind, e.type, tm.faction);
      pic = ic;
      h = '<div class="nm">' + G.nameOf(e) + '</div><div class="sub" style="color:' + tm.f.c + '">' + (e.team === 0 && d.dv ? '<span class="dv">' + d.dv + '</span> &nbsp; ' : '') + tm.f.name + '</div>' + hpHtml(e);
      if (e.kind === 'u') {
        h += '<div class="stats"><span>' + gy('atk') + Math.round(G.atkOf(e)) + '</span><span>' + gy('armor') + G.armorOf(e, true) + '</span><span>' + gy('parmor') + G.armorOf(e, false) + '</span>' + (d.range > 1 ? '<span>' + gy('range') + G.rangeOf(e) + '</span>' : '') + '<span>' + gy('speed') + d.sp.toFixed(1) + '</span></div>';
        if (e.team === 0) {
          const o = e.order;
          let st = !o ? 'Idle' : o.type === 'move' ? 'Moving' : o.type === 'attack' ? 'Attacking' : o.type === 'build' ? 'Building' : o.phase === 'ret' ? 'Returning with ' + G.RES[e.ctype].name : 'Gathering ' + G.RES[G.RKEY[o.rt]].name;
          if (e.carry >= 1) st += ', carrying ' + Math.floor(e.carry) + ' ' + G.RES[e.ctype].name;
          if (e.rallyT > S.time) st += '. Rallied!'; else if (e.auraT > S.time) st += '. Inspired by Maharaj';
          h += '<div class="extra">' + st + '</div>';
        } else h += '<div class="extra">' + d.desc + '</div>';
      } else {
        if (d.atk) h += '<div class="stats"><span>' + gy('atk') + G.atkOf(e) + '</span><span>' + gy('range') + d.range + '</span></div>';
        if (!e.done) h += '<div class="extra">Under construction: ' + Math.floor(e.prog * 100) + '%</div>';
        else if (e.team === 0 && e.queue.length) {
          h += '<div class="queue">';
          e.queue.forEach((q, i) => {
            const qi = q.kind === 'unit' ? R.icon('u', q.key, 'swarajya') : '', icon = q.kind === 'unit' ? '<img' + px(qi) + ' src="' + qi + '">' : '<img class="gq" src="' + R.glyph(q.kind === 'tech' ? q.key : 'age') + '">';
            h += '<div class="q" data-q="' + i + '" title="Click to cancel">' + icon + (i === 0 ? '<i style="height:' + (100 - q.t / q.time * 100).toFixed(0) + '%"></i>' : '') + '</div>';
          });
          h += '</div>' + (e.stalled ? '<div class="extra warn">Population limit reached. Build more Ghar.</div>' : '');
        } else h += '<div class="extra">' + (e.type === 'farm' && e.team === 0 ? (e.worker && G.byId(e.worker) ? 'Being tilled.' : 'Right-click with a Rayat to till this farm.') : d.desc) + '</div>';
      }
    } else {
      h = '<div class="multi">';
      sel.slice(0, 36).forEach(e => { const f = e.hp / e.maxhp, mi = R.icon(e.kind, e.type, S.teams[e.team].faction); h += '<div class="m" data-id="' + e.id + '"><img' + px(mi) + ' src="' + mi + '"><i style="width:' + (f * 100).toFixed(0) + '%;background:' + (f > 0.5 ? '#5fd35f' : f > 0.25 ? '#e3b23c' : '#d8442b') + '"></i></div>'; });
      h += '</div>';
    }
    if (pic) {                       // keep the portrait element alive so it never flickers
      const box = $('info');
      if (box.dataset.pic !== pic) { box.dataset.pic = pic; box.innerHTML = '<div class="portrait"><img' + px(pic) + ' src="' + pic + '"></div><div class="meta"></div>'; sigInfo = ''; }
      if (h !== sigInfo) { sigInfo = h; box.lastElementChild.innerHTML = h; }
    } else if (h !== sigInfo || $('info').dataset.pic) { sigInfo = h; $('info').dataset.pic = ''; $('info').innerHTML = h; }

    cmds = getCmds();
    let ch = '';
    cmds.forEach((c, i) => {
      if (!c) { ch += '<div class="cmd empty"></div>'; return; }
      const afford = !c.cost || G.canAfford(t, c.cost);
      ch += '<div class="cmd' + (c.off ? ' off' : '') + (!afford ? ' poor' : '') + (c.gold ? ' gold' : '') + '" data-i="' + i + '">' + (c.icon ? '<img' + px(c.icon) + ' src="' + c.icon + '">' : '<img class="gc" src="' + R.glyph(c.glyph) + '">') + (c.tag ? '<em>' + c.tag + '</em>' : '') + (c.nohot ? '' : '<b>' + HOT[i] + '</b>') + '</div>';
    });
    if (ch !== sigCmd) { sigCmd = ch; $('cmds').innerHTML = ch; }

    $('r-f').textContent = Math.floor(t.res.f); $('r-w').textContent = Math.floor(t.res.w); $('r-g').textContent = Math.floor(t.res.g); $('r-s').textContent = Math.floor(t.res.s);
    $('r-pop').textContent = t.pop + ' / ' + t.popCap;
    $('r-pop').parentNode.classList.toggle('full', t.pop >= t.popCap);
    const A = G.AGES[t.age];
    $('age-dv').textContent = A.dv; $('age-en').textContent = A.name;
    const sec = Math.floor(S.time);
    $('clock').textContent = ((sec / 60) | 0) + ':' + ('0' + (sec % 60)).slice(-2);
    $('idle').style.display = S.idleVill ? '' : 'none'; $('idle-n').textContent = S.idleVill;
    let oh = '<h4>' + S.scn.title + ', ' + S.scn.year + '</h4>';
    for (const o of S.objectives) oh += '<div class="' + (o.done ? 'done' : '') + '">' + gy(o.done ? 'ok' : 'dot') + o.text + '</div>';
    if ($('objectives').innerHTML !== oh) $('objectives').innerHTML = oh;
  }
  G.updatePanel = updatePanel;

  function showTip(i, el) {
    const c = cmds[i], tip = $('tip');
    if (!c) { tip.style.display = 'none'; return; }
    let h = '<div class="tn">' + c.name + (c.dv ? ' <span class="dv">' + c.dv + '</span>' : '') + (c.nohot ? '' : ' <kbd>' + HOT[i] + '</kbd>') + '</div>';
    if (c.cost && Object.keys(c.cost).length) h += '<div class="tc">' + costStr(c.cost) + '</div>';
    if (c.stats) { const d = c.stats; h += '<div class="ts"><span>' + gy('hp') + d.hp + '</span><span>' + gy('atk') + d.atk + '</span><span>' + gy('armor') + d.ar + '/' + d.pa + '</span>' + (d.range > 1 ? '<span>' + gy('range') + d.range + '</span>' : '') + '</div>'; }
    if (c.desc) h += '<div class="td">' + c.desc + '</div>';
    if (c.why) h += '<div class="tw">' + c.why + '</div>';
    tip.innerHTML = h; tip.style.display = 'block';
    const r = el.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(window.innerWidth - tip.offsetWidth - 8, r.left + r.width / 2 - tip.offsetWidth / 2)) + 'px';
    tip.style.top = (r.top - tip.offsetHeight - 10) + 'px';
  }

  function idleVillager() {
    const S = G.S, list = S.ents.filter(e => !e.dead && e.team === 0 && e.kind === 'u' && e.def.cls === 'vill' && !e.order);
    if (!list.length) return;
    ui.idleI = ((ui.idleI || 0) + 1) % list.length;
    const v = list[ui.idleI]; setSel([v.id]); G.centerOn(v.x, v.y); G.sfx('select');
  }
  function selectType(type, center) {
    const S = G.S, e = S.ents.find(x => !x.dead && x.team === 0 && x.type === type);
    if (!e) return;
    if (ui.sel.length === 1 && ui.sel[0] === e.id || center) G.centerOn(e.x, e.y);
    setSel([e.id]); G.sfx('select');
  }

  /* ---------- input wiring ---------- */
  G.initUI = function () {
    const cv = $('game'), mini = $('mini');
    R.initMini(mini);
    window.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('mousemove', e => { ui.mx = e.clientX; ui.my = e.clientY; ui.inside = true; });
    document.addEventListener('mouseleave', () => { ui.inside = false; });
    window.addEventListener('blur', () => { ui.keys = {}; ui.inside = false; });

    cv.addEventListener('mousedown', e => {
      if (!G.S || G.S.over || G.paused) return;
      const w = G.s2w(e.clientX, e.clientY);
      if (e.button === 0) {
        if (ui.placing) {
          const d = B[ui.placing], t = ui.placeTile, team = G.S.teams[0];
          if (!t) return;
          if (!G.canAfford(team, d.cost)) { G.msg('Not enough resources for ' + d.n + '.', 'warn'); G.sfx('error'); return; }
          const b = G.place(0, ui.placing, t[0], t[1]);
          if (!b) { G.sfx('error'); return; }
          const vills = ownUnits().filter(u => u.def.cls === 'vill');
          if (e.shiftKey && ui.placing === 'wall') { for (const v of vills) if (!v.order || v.order.type !== 'build') G.cmd.build([v], b); } else G.cmd.build(vills, b);
          G.sfx('built');
          if (!e.shiftKey) { ui.placing = null; ui.menu = 'main'; }
          return;
        }
        ui.drag = { x0: e.clientX, y0: e.clientY, box: false, shift: e.shiftKey };
      } else if (e.button === 2) {
        if (ui.placing) { ui.placing = null; return; }
        order(e.clientX, e.clientY, w[0], w[1]);
      }
    });
    window.addEventListener('mouseup', e => {
      if (e.button !== 0 || !ui.drag || !G.S) { return; }
      const d = ui.drag, S = G.S; ui.drag = null;
      if (d.box) {
        const xa = Math.min(d.x0, e.clientX), xb = Math.max(d.x0, e.clientX), ya = Math.min(d.y0, e.clientY), yb = Math.max(d.y0, e.clientY);
        let ids = [];
        for (const u of S.ents) { if (u.dead || u.kind !== 'u' || u.team !== 0) continue; const p = G.w2s(u.x, u.y); if (p[0] >= xa && p[0] <= xb && p[1] - 10 >= ya && p[1] - 10 <= yb) ids.push(u); }
        if (ids.some(u => u.def.cls !== 'vill')) ids = ids.filter(u => u.def.cls !== 'vill');
        if (ids.length) { const n = ids.map(u => u.id); setSel(d.shift ? Array.from(new Set(ui.sel.concat(n))) : n); G.sfx('select'); }
        return;
      }
      const ent = pick(e.clientX, e.clientY, true), now = performance.now();
      if (!ent) { if (!d.shift) setSel([]); return; }
      if (ent.team === 0 && now - lastClick.t < 350 && lastClick.id === ent.id) {
        const ids = [];
        for (const u of S.ents) { if (u.dead || u.team !== 0 || u.type !== ent.type) continue; const p = G.w2s(u.x, u.y); if (p[0] > -40 && p[1] > -40 && p[0] < R.W + 40 && p[1] < R.H + 40) ids.push(u.id); }
        setSel(ids);
      } else if (d.shift && ent.team === 0 && ui.sel.length && G.byId(ui.sel[0]) && G.byId(ui.sel[0]).team === 0) {
        setSel(ui.selSet.has(ent.id) ? ui.sel.filter(i => i !== ent.id) : ui.sel.concat(ent.id));
      } else setSel([ent.id]);
      lastClick = { t: now, id: ent.id }; G.sfx('select');
    });
    cv.addEventListener('wheel', e => {
      e.preventDefault();
      if (!G.S) return;
      const c = G.cam, w = G.s2w(e.clientX, e.clientY), ZS = [0.5, 0.75, 1, 1.5, 2], now = performance.now();
      if (now - (ui.zoomT || 0) < 140) return; ui.zoomT = now;
      const zi = ZS.indexOf(c.z), z = ZS[Math.max(0, Math.min(ZS.length - 1, (zi < 0 ? 2 : zi) + (e.deltaY < 0 ? 1 : -1)))];
      c.z = z; c.x = (w[0] - w[1]) * G.HW - e.clientX / z; c.y = (w[0] + w[1]) * G.HH - e.clientY / z; G.clampCam();
    }, { passive: false });

    // minimap
    let miniDown = false;
    const miniGo = e => { const r = mini.getBoundingClientRect(), w = R.miniToWorld((e.clientX - r.left) * mini.width / r.width, (e.clientY - r.top) * mini.height / r.height); return [Math.max(0, Math.min(M.N, w[0])), Math.max(0, Math.min(M.N, w[1]))]; };
    mini.addEventListener('mousedown', e => {
      if (!G.S) return;
      const w = miniGo(e);
      if (e.button === 0) { miniDown = true; G.centerOn(w[0], w[1]); }
      else if (e.button === 2 && ownUnits().length) order(null, null, w[0], w[1]);
    });
    window.addEventListener('mousemove', e => { if (miniDown) { const w = miniGo(e); G.centerOn(w[0], w[1]); } });
    window.addEventListener('mouseup', () => { miniDown = false; });

    // command card
    const cm = $('cmds');
    cm.addEventListener('mousedown', e => { const el = e.target.closest('.cmd'); if (!el || el.dataset.i == null || !G.S || G.S.over) return; const c = cmds[+el.dataset.i]; if (c) { c.run(); G.sfx('select'); updatePanel(); } });
    cm.addEventListener('mousemove', e => { const el = e.target.closest('.cmd'); if (el && el.dataset.i != null) showTip(+el.dataset.i, el); else $('tip').style.display = 'none'; });
    cm.addEventListener('mouseleave', () => { $('tip').style.display = 'none'; });
    $('info').addEventListener('mousedown', e => {
      const q = e.target.closest('.q'), m = e.target.closest('.m');
      if (q) { const b = selEnts()[0]; if (b) G.cancelQueue(b, +q.dataset.q); }
      else if (m) setSel([+m.dataset.id]);
    });
    $('idle').addEventListener('mousedown', idleVillager);

    window.addEventListener('keydown', e => {
      if (!G.S || e.repeat && !e.key.startsWith('Arrow')) return;
      const k = e.key.length === 1 ? e.key.toUpperCase() : e.key;
      ui.keys[k] = true;
      if (G.S.over) return;
      if (k === 'P') { G.togglePause(); return; }
      if (G.paused) return;
      if (k === 'Escape') { if (ui.placing) ui.placing = null; else if (ui.menu !== 'main') ui.menu = 'main'; else if (ui.sel.length) setSel([]); else G.togglePause(); return; }
      if (/^[0-9]$/.test(k)) {
        if (e.ctrlKey || e.metaKey || e.altKey) { ui.groups[k] = ui.sel.slice(); G.msg('Group ' + k + ' assigned.'); e.preventDefault(); }
        else if (ui.groups[k]) {
          const ids = ui.groups[k].filter(i => G.byId(i)); if (!ids.length) return;
          const now = performance.now();
          if (lastGroup.k === k && now - lastGroup.t < 400) { const u = G.byId(ids[0]); G.centerOn(u.x, u.y); }
          lastGroup = { k, t: now }; setSel(ids); G.sfx('select');
        }
        return;
      }
      if (k === '.' || k === ',') { idleVillager(); return; }
      if (k === 'H') { selectType('tc'); return; }
      if (k === 'M') { selectType('shivaji', true); return; }
      if (k === ' ') { const s = selEnts()[0]; if (s) G.centerOn(s.x, s.y); e.preventDefault(); return; }
      if (e.ctrlKey || e.metaKey) return;
      const i = HOT.indexOf(k);
      if (i >= 0 && cmds[i] && !cmds[i].nohot) { cmds[i].run(); G.sfx('select'); updatePanel(); }
    });
    window.addEventListener('keyup', e => { const k = e.key.length === 1 ? e.key.toUpperCase() : e.key; ui.keys[k] = false; });
  };

  /* called every frame */
  G.uiFrame = function (dt) {
    const S = G.S; if (!S) return;
    const c = G.cam, k = ui.keys, sp = 900 * dt / c.z;
    let dx = 0, dy = 0;
    if (k.ArrowLeft) dx -= 1; if (k.ArrowRight) dx += 1; if (k.ArrowUp) dy -= 1; if (k.ArrowDown) dy += 1;
    if (ui.inside && !G.paused && document.hasFocus()) {
      if (ui.mx <= 3) dx -= 1; else if (ui.mx >= R.W - 4) dx += 1;
      if (ui.my <= 3) dy -= 1; else if (ui.my >= R.H - 4) dy += 1;
    }
    if (dx || dy) { c.x += dx * sp; c.y += dy * sp; G.clampCam(); }
    if (ui.drag && !ui.drag.box && Math.hypot(ui.mx - ui.drag.x0, ui.my - ui.drag.y0) > 6) ui.drag.box = true;
    if (ui.placing) {
      const d = B[ui.placing], w = G.s2w(ui.mx, ui.my);
      ui.placeTile = [Math.round(w[0] - d.size / 2), Math.round(w[1] - d.size / 2)];
      if (!ownUnits().some(u => u.def.cls === 'vill')) ui.placing = null;
    }
    document.body.style.cursor = ui.placing ? 'crosshair' : 'default';
  };
})();
