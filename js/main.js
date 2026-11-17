'use strict';
/* Menu, briefing, game loop */
(function () {
  const $ = id => document.getElementById(id);
  const STEP = 1 / 20, R = G.Render;
  let scnI = 0, diffI = 1, acc = 0, last = 0, uiT = 0, overShown = false;

  G.applyGlyphs = function (root) { for (const el of (root || document).querySelectorAll('[data-g]')) el.style.backgroundImage = 'url(' + R.glyph(el.dataset.g) + ')'; };
  const art = k => R.art.ui[k] || '';

  function buildMenu() {
    $('scn-list').innerHTML = G.SCENARIOS.map((s, i) => '<div class="scn' + (i === scnI ? ' on' : '') + '" data-i="' + i + '"><div class="yr' + (/^\d+$/.test(s.year) ? '' : ' sm') + '">' + s.year + '</div><div><h3>' + s.title + ' <span class="dv">' + s.dv + '</span></h3><div class="st">' + s.sub + '</div></div><div class="foe">against<br>' + s.foe + '</div></div>').join('');
    $('diff').innerHTML = G.DIFF.map((d, i) => '<button class="' + (i === diffI ? 'on' : '') + '" data-i="' + i + '">' + d.n + '<small>' + d.sub + '</small></button>').join('');
  }
  function menuArt() {
    const full = art('shivaji_full');
    $('plate').style.display = full ? '' : 'none';
    if (full) $('plate-img').src = full;
    const bg = $('title-bg');
    if (art('title')) { bg.style.backgroundImage = 'url(' + art('title') + ')'; bg.style.imageRendering = 'auto'; bg.getContext('2d').clearRect(0, 0, bg.width, bg.height); }
    else R.drawTitle(bg);
  }
  function modal(o) {
    const m = $('modal'), side = o.side ? '<div class="side" style="background-image:url(' + o.side + ')"></div>' : '';
    m.innerHTML = '<div class="card ' + (o.cls || '') + '">' + side + '<div class="body">' + o.body + '</div></div>'; m.classList.remove('hidden');
  }
  function closeModal() { $('modal').classList.add('hidden'); }

  function briefing() {
    const s = G.SCENARIOS[scnI];
    modal({ side: art('shivaji_full'), body: '<div class="yr">' + s.year + ' &nbsp;/&nbsp; ' + G.DIFF[diffI].n + '</div><h2>' + s.title + '<span class="dv">' + s.dv + '</span></h2>' + s.brief.map(p => '<p>' + p + '</p>').join('') +
      '<h5>Objectives</h5><ul>' + G.S.objectives.map(o => '<li>' + o.text + '</li>').join('') + '</ul><div class="btns"><button data-a="menu">Back</button><button class="pri" data-a="go">Har Har Mahadev</button></div>' });
  }
  function start() {
    const s = G.SCENARIOS[scnI];
    G.newGame(s, diffI);
    R.prepMap();
    G.setSel([]); G.ui.placing = null; G.ui.groups = {};
    G.cam.z = 1; G.centerOn(s.player.x, s.player.y);
    G.paused = true; overShown = false; acc = 0;
    $('menu').classList.add('hidden'); $('hud').classList.remove('hidden'); $('msgs').innerHTML = '';
    G.updatePanel();
    briefing();
  }
  function toMenu() { G.S = null; G.paused = false; closeModal(); $('hud').classList.add('hidden'); $('menu').classList.remove('hidden'); }
  G.togglePause = function () {
    if (!G.S || G.S.over) return;
    if (G.paused) { G.paused = false; closeModal(); return; }
    G.paused = true;
    modal({ body: '<div class="yr">Paused</div><h2>' + G.S.scn.title + '</h2><p>The drums fall silent for a moment.</p><div class="btns"><button data-a="menu">Quit to menu</button><button data-a="restart">Restart</button><button class="pri" data-a="go">Resume</button></div>' });
  };
  function gameOver() {
    const S = G.S, s = S.scn, sec = Math.floor(S.time), tm = ((sec / 60) | 0) + ':' + ('0' + (sec % 60)).slice(-2);
    if (S.over.win) modal({ cls: 'win', side: art('shivaji_full'), body: '<div class="yr">Victory &nbsp;/&nbsp; ' + tm + '</div><h2>जय भवानी, जय शिवाजी</h2><p>' + s.win + '</p><div class="btns"><button data-a="restart">Play again</button><button class="pri" data-a="menu">Next battle</button></div>' });
    else modal({ cls: 'lose', body: '<div class="yr">Defeat &nbsp;/&nbsp; ' + tm + '</div><h2>The flag falls back to the hills</h2><p>The settlement is lost, but Swarajya was never one fort or one battle. Maharaj lost forts and won them back, time and again. Regroup and return.</p><div class="btns"><button data-a="menu">Menu</button><button class="pri" data-a="restart">Try again</button></div>' });
  }

  function frame(ts) {
    const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
    if (G.S) {
      if (!G.paused && !G.S.over) {
        acc += dt * G.speed;
        let n = 0;
        while (acc >= STEP && n < 8) { G.tick(STEP); acc -= STEP; n++; }
        if (n === 8) acc = 0;
      }
      G.uiFrame(dt);
      R.draw(ts);
      R.drawMini(ts);
      uiT -= dt;
      if (uiT <= 0) { uiT = 0.15; G.updatePanel(); }
      if (G.S.over && !overShown) { overShown = true; gameOver(); }
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener('load', () => {
    R.onArt = cat => { if (cat === 'ui') menuArt(); };
    R.init($('game'));
    R.uiTextures();
    G.applyGlyphs();
    G.initUI();
    buildMenu(); menuArt();
    window.addEventListener('resize', () => { R.resize(); G.clampCam(); });
    $('scn-list').addEventListener('click', e => { const el = e.target.closest('.scn'); if (el) { scnI = +el.dataset.i; buildMenu(); } });
    $('scn-list').addEventListener('dblclick', e => { if (e.target.closest('.scn')) start(); });
    $('diff').addEventListener('click', e => { const el = e.target.closest('button'); if (el) { diffI = +el.dataset.i; buildMenu(); } });
    $('btn-start').addEventListener('click', start);
    $('modal').addEventListener('click', e => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === 'go') { G.paused = false; closeModal(); G.sfx('horn'); }
      else if (a === 'menu') toMenu();
      else if (a === 'restart') { closeModal(); start(); }
    });
    $('btn-menu').addEventListener('click', G.togglePause);
    $('btn-speed').addEventListener('click', () => { G.speed = G.speed === 1 ? 1.5 : G.speed === 1.5 ? 2 : 1; $('btn-speed').textContent = G.speed + 'x'; });
    $('btn-snd').addEventListener('click', () => { G.muted = !G.muted; const i = $('btn-snd').firstElementChild; i.dataset.g = G.muted ? 'mute' : 'sound'; G.applyGlyphs($('btn-snd')); });
    requestAnimationFrame(frame);
  });
})();
