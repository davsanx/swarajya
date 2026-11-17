'use strict';
/* Swarajya — game data: factions, ages, units, buildings, technologies, scenarios */
window.G = { HW: 32, HH: 16, MAXPOP: 100, speed: 1, paused: false, muted: false };
G.msg = function () {};
G.sfx = function () {};

G.RES = {
  f: { name: 'Dhanya', en: 'Food', icon: '🌾' },
  w: { name: 'Lakud', en: 'Wood', icon: '🪵' },
  g: { name: 'Hon', en: 'Gold', icon: '🪙' },
  s: { name: 'Dagad', en: 'Stone', icon: '🪨' }
};

G.FACTIONS = {
  swarajya: {
    name: 'Hindavi Swarajya', short: 'Swarajya', c: '#f28c1e', d: '#b55e06', l: '#ffe2ad', flag: '#ff8a00', style: 'maratha',
    pal: { wl: '#6f675e', wr: '#57504a', wt: '#9a8f82', pl: '#d9c8a0', pr: '#b9a780', roof: '#a5502f', roofd: '#7c3a22' }
  },
  adilshahi: {
    name: 'Adilshahi Sultanate of Bijapur', short: 'Adilshahi', c: '#3b78c4', d: '#234e87', l: '#dfeaf8', flag: '#2f6bbd', style: 'deccan',
    pal: { wl: '#7d766b', wr: '#635d54', wt: '#a39a8c', pl: '#cfc6b4', pr: '#aaa291', roof: '#e9e3d3', roofd: '#bdb6a4' },
    names: { villager: 'Kashtkar', sword: 'Paik', spear: 'Barchi Paik', archer: 'Tirandaz', musket: 'Banduqchi', lcav: 'Sawar', hcav: 'Silahdar', cannon: 'Top', elephant: 'Jangi Hathi',
      tc: 'Qila', house: 'Makan', farm: 'Khet', kothar: 'Ambar', vakhar: 'Godam', barracks: 'Chhavni', range: 'Tirandaz Maidan', stable: 'Astabal', siege: 'Topkhana', smith: 'Silah-khana', market: 'Bazaar', temple: 'Dargah', tower: 'Burj', wall: 'Fasil' }
  },
  mughal: {
    name: 'Mughal Empire', short: 'Mughal', c: '#2f9a5a', d: '#1b6238', l: '#e6f5ea', flag: '#1f8a4c', style: 'mughal',
    pal: { wl: '#a55a45', wr: '#84463a', wt: '#c98068', pl: '#d8b9a0', pr: '#b8977f', roof: '#f3efe6', roofd: '#c9c3b6' },
    names: { villager: 'Raiyat', sword: 'Piyada', spear: 'Neza-baz', archer: 'Tirandaz', musket: 'Barqandaz', lcav: 'Sowar', hcav: 'Ahadi', cannon: 'Top', elephant: 'Jangi Hathi',
      tc: 'Qila', house: 'Makan', farm: 'Khet', kothar: 'Ambar', vakhar: 'Godam', barracks: 'Chhavni', range: 'Tirandaz Maidan', stable: 'Astabal', siege: 'Topkhana', smith: 'Silah-khana', market: 'Bazaar', temple: 'Dargah', tower: 'Burj', wall: 'Fasil' }
  }
};

G.AGES = [
  { name: 'Jahagir Kaal', dv: 'जहागीर काळ', years: 'c. 1640',
    blurb: 'The Pune jagir, rebuilt under Rajmata Jijabai. A golden plough breaks the ruined soil.' },
  { name: 'Swarajya Sthapana', dv: 'स्वराज्य स्थापना', years: '1645 – 1656', cost: { f: 400 }, time: 45,
    blurb: 'By tradition, the oath of Swarajya is sworn at Raireshwar. Torna and Rajgad follow.' },
  { name: 'Gad-Kot Kaal', dv: 'गडकोट काळ', years: '1657 – 1673', cost: { f: 700, g: 250 }, time: 60,
    blurb: 'The age of forts. Matchlocks, cannon and heavy horse join the Mavale.' },
  { name: 'Rajyabhishek', dv: 'राज्याभिषेक', years: '1674', cost: { f: 1000, g: 700 }, time: 80,
    blurb: '6 June 1674, Raigad: the coronation. Shivaji Maharaj is Chhatrapati of a sovereign realm.' }
];

/* cls: vill inf spear archer gun cav siege eleph hero   dmg: melee | pierce | siege */
G.UNITS = {
  villager: { n: 'Rayat', dv: 'रयत', desc: 'Farmer-citizen of the Swarajya. Gathers resources, builds and repairs.', cls: 'vill', shape: 'vill', hp: 30, atk: 2, dmg: 'melee', range: 0, rof: 2, ar: 0, pa: 0, sp: 2.2, sight: 5, cost: { f: 50 }, time: 13, pop: 1, age: 0 },
  sword: { n: 'Mavala', dv: 'मावळा', desc: 'Hardy hill infantry from the Maval valleys, armed with sword and shield.', cls: 'inf', shape: 'sword', hp: 62, atk: 8, dmg: 'melee', range: 0, rof: 1.5, ar: 1, pa: 1, sp: 2.45, sight: 6, cost: { f: 55, g: 15 }, time: 13, pop: 1, age: 0, bonus: { bld: 2 } },
  spear: { n: 'Bhalekari', dv: 'भालेकरी', desc: 'Spearman. Cheap, and deadly to cavalry and elephants.', cls: 'spear', shape: 'spear', hp: 50, atk: 5, dmg: 'melee', range: 0, rof: 1.6, ar: 0, pa: 0, sp: 2.4, sight: 6, cost: { f: 35, w: 25 }, time: 11, pop: 1, age: 1, bonus: { cav: 14, eleph: 26 } },
  archer: { n: 'Dhanurdhar', dv: 'धनुर्धर', desc: 'Bowman. Good against slow infantry; weak to cavalry.', cls: 'archer', shape: 'archer', hp: 34, atk: 6, dmg: 'pierce', range: 5, rof: 1.8, ar: 0, pa: 0, sp: 2.35, sight: 7, cost: { w: 30, g: 35 }, time: 15, pop: 1, age: 1, bonus: { spear: 3 } },
  musket: { n: 'Hetkari', dv: 'हेटकरी', desc: 'Konkan matchlockman. Slow to reload but hits very hard.', cls: 'gun', shape: 'gun', hp: 40, atk: 18, dmg: 'pierce', range: 6, rof: 3.2, ar: 0, pa: 1, sp: 2.25, sight: 8, cost: { f: 45, g: 55 }, time: 19, pop: 1, age: 2, bonus: { eleph: 10 } },
  lcav: { n: 'Bargir', dv: 'बारगीर', desc: 'Light horseman mounted and armed by the state. A swift raider.', cls: 'cav', shape: 'cav', hp: 82, atk: 8, dmg: 'melee', range: 0, rof: 1.5, ar: 1, pa: 2, sp: 3.7, sight: 8, cost: { f: 70, g: 20 }, time: 17, pop: 1, age: 1, bonus: { archer: 4, gun: 4, siege: 8 } },
  hcav: { n: 'Shiledar', dv: 'शिलेदार', desc: 'Heavy horseman who brings his own horse and arms.', cls: 'cav', shape: 'hcav', hp: 128, atk: 13, dmg: 'melee', range: 0, rof: 1.6, ar: 3, pa: 2, sp: 3.3, sight: 7, cost: { f: 70, g: 70 }, time: 23, pop: 1, age: 2, bonus: { archer: 3, gun: 3, siege: 8 } },
  cannon: { n: 'Tof', dv: 'तोफ', desc: 'Cannon. Shatters walls, bastions and buildings from afar.', cls: 'siege', shape: 'cannon', hp: 75, atk: 38, dmg: 'siege', range: 8, rof: 5, ar: 0, pa: 6, sp: 1.35, sight: 9, cost: { w: 150, g: 120 }, time: 32, pop: 2, age: 2, bonus: { bld: 85 } },
  elephant: { n: 'War Elephant', dv: 'हत्ती', desc: 'Armoured war elephant. Tramples infantry and batters buildings.', cls: 'eleph', shape: 'eleph', hp: 330, atk: 22, dmg: 'melee', range: 0, rof: 2, ar: 3, pa: 3, sp: 1.9, sight: 6, cost: { f: 160, g: 110 }, time: 30, pop: 2, age: 2, bonus: { bld: 26 }, r: 0.5, only: ['adilshahi', 'mughal'] },

  shivaji: { n: 'Shivaji Maharaj', dv: 'छत्रपती शिवाजी महाराज', desc: 'Founder of Hindavi Swarajya. Nearby troops fight harder; rallies the army with “Har Har Mahadev!”. If wounded he withdraws to the Rajwada and returns.', cls: 'hero', shape: 'shivaji', hero: true, respawn: true, hp: 440, atk: 22, dmg: 'melee', range: 0, rof: 1.3, ar: 4, pa: 4, sp: 3.5, sight: 10, cost: {}, time: 1, pop: 0, age: 0, regen: 1.2, r: 0.4, only: ['swarajya'] },
  tanaji: { n: 'Tanaji Malusare', dv: 'तानाजी मालुसरे', desc: 'Subedar and boyhood companion of Maharaj. Master of escalade: heavy bonus damage against fortifications.', cls: 'hero', shape: 'heroInf', hero: true, respawn: true, hp: 300, atk: 19, dmg: 'melee', range: 0, rof: 1.3, ar: 3, pa: 3, sp: 2.7, sight: 8, cost: { f: 150, g: 120 }, time: 25, pop: 0, age: 1, regen: 0.8, bonus: { bld: 14 }, only: ['swarajya'] },
  bajiprabhu: { n: 'Baji Prabhu Deshpande', dv: 'बाजी प्रभू देशपांडे', desc: 'Wielder of twin dandpatta, hero of Ghodkhind. Almost impossible to bring down.', cls: 'hero', shape: 'heroInf2', hero: true, respawn: true, hp: 400, atk: 16, dmg: 'melee', range: 0, rof: 1.2, ar: 6, pa: 5, sp: 2.4, sight: 8, cost: { f: 150, g: 120 }, time: 25, pop: 0, age: 1, regen: 0.8, only: ['swarajya'] },
  netaji: { n: 'Netaji Palkar', dv: 'नेताजी पालकर', desc: 'Sarnobat of the cavalry, called “Prati-Shivaji”. A lightning raider.', cls: 'hero', shape: 'heroCav', hero: true, respawn: true, hp: 310, atk: 18, dmg: 'melee', range: 0, rof: 1.3, ar: 3, pa: 3, sp: 3.8, sight: 9, cost: { f: 180, g: 160 }, time: 28, pop: 0, age: 2, regen: 0.8, r: 0.4, bonus: { archer: 4, gun: 4, siege: 8 }, only: ['swarajya'] },

  qiladar: { n: 'Qiladar', dv: '', desc: 'Commander of the fort garrison.', cls: 'hero', shape: 'cmdr', hero: true, hp: 300, atk: 16, dmg: 'melee', range: 0, rof: 1.5, ar: 3, pa: 3, sp: 2.4, sight: 7, cost: {}, time: 1, pop: 0, age: 0 },
  afzal: { n: 'Afzal Khan', dv: '', desc: 'Veteran general of Bijapur, sent to destroy the young Swarajya.', cls: 'hero', shape: 'cmdr', big: 1.3, hero: true, hp: 520, atk: 24, dmg: 'melee', range: 0, rof: 1.5, ar: 4, pa: 3, sp: 2.2, sight: 7, cost: {}, time: 1, pop: 0, age: 0 },
  udaybhan: { n: 'Udaybhan Rathod', dv: '', desc: 'Rajput qiladar holding Kondhana for the Mughal Empire.', cls: 'hero', shape: 'cmdr', big: 1.15, hero: true, hp: 430, atk: 22, dmg: 'melee', range: 0, rof: 1.4, ar: 4, pa: 4, sp: 2.5, sight: 7, cost: {}, time: 1, pop: 0, age: 0 },
  subahdar: { n: 'Mughal Subahdar', dv: '', desc: 'Imperial governor of the Deccan.', cls: 'hero', shape: 'cmdrCav', hero: true, hp: 430, atk: 20, dmg: 'melee', range: 0, rof: 1.4, ar: 4, pa: 4, sp: 3.1, sight: 8, cost: {}, time: 1, pop: 0, age: 0, r: 0.4 },
  sardar: { n: 'Adilshahi Sardar', dv: '', desc: 'A noble commander of Bijapur.', cls: 'hero', shape: 'cmdrCav', hero: true, hp: 400, atk: 19, dmg: 'melee', range: 0, rof: 1.4, ar: 4, pa: 3, sp: 3.1, sight: 8, cost: {}, time: 1, pop: 0, age: 0, r: 0.4 }
};
for (const k in G.UNITS) { const u = G.UNITS[k]; u.key = k; if (!u.r) u.r = 0.3; }

G.BLD = {
  tc: { n: 'Rajwada', dv: 'राजवाडा', desc: 'Seat of the Swarajya. Trains Rayat and Sardars, advances the age, and accepts every resource.', size: 4, hp: 2400, cost: { w: 280, s: 120 }, time: 70, age: 2, pop: 10, drop: 'fwgs', trains: ['villager', 'tanaji', 'bajiprabhu', 'netaji'], atk: 8, range: 6.5, rof: 1.6, sight: 9, ht: 78 },
  house: { n: 'Ghar', dv: 'घर', desc: 'Homes for your people. +5 population.', size: 2, hp: 520, cost: { w: 30 }, time: 12, age: 0, pop: 5, sight: 3, ht: 34 },
  farm: { n: 'Shet', dv: 'शेत', desc: 'Farmland. One Rayat tills it for an endless supply of Dhanya.', size: 2, hp: 220, cost: { w: 45 }, time: 8, age: 0, walk: true, sight: 2, ht: 6 },
  kothar: { n: 'Kothar', dv: 'कोठार', desc: 'Granary. Drop-off point for Dhanya (food).', size: 2, hp: 620, cost: { w: 70 }, time: 14, age: 0, drop: 'f', sight: 4, ht: 38 },
  vakhar: { n: 'Vakhar', dv: 'वखार', desc: 'Depot. Drop-off point for Lakud, Hon and Dagad.', size: 2, hp: 620, cost: { w: 70 }, time: 14, age: 0, drop: 'wgs', sight: 4, ht: 30 },
  barracks: { n: 'Talim', dv: 'तालीम', desc: 'Training ground for infantry: Mavale and Bhalekari.', size: 3, hp: 1300, cost: { w: 130 }, time: 26, age: 0, trains: ['sword', 'spear'], sight: 5, ht: 40 },
  range: { n: 'Tirandazi Maidan', dv: 'तिरंदाजी मैदान', desc: 'Trains Dhanurdhar archers and Hetkari matchlockmen.', size: 3, hp: 1200, cost: { w: 140 }, time: 26, age: 1, trains: ['archer', 'musket'], sight: 5, ht: 30 },
  stable: { n: 'Paga', dv: 'पागा', desc: 'State stables. Trains Bargir and Shiledar cavalry.', size: 3, hp: 1200, cost: { w: 150 }, time: 26, age: 1, trains: ['lcav', 'hcav', 'elephant'], sight: 5, ht: 40 },
  siege: { n: 'Tofkhana', dv: 'तोफखाना', desc: 'Artillery park. Casts and fields Tof (cannon).', size: 3, hp: 1300, cost: { w: 180, g: 60 }, time: 32, age: 2, trains: ['cannon'], sight: 5, ht: 40 },
  smith: { n: 'Shikalgar', dv: 'शिकलगार', desc: 'Weaponsmith. Researches better arms and armour.', size: 2, hp: 900, cost: { w: 120 }, time: 22, age: 1, sight: 4, ht: 40 },
  market: { n: 'Peth', dv: 'पेठ', desc: 'Market town. Trade goods for Hon, and levy Chauth.', size: 3, hp: 1000, cost: { w: 140 }, time: 24, age: 1, sight: 5, ht: 34 },
  temple: { n: 'Bhavani Mandir', dv: 'भवानी मंदिर', desc: 'Temple of Tulja Bhavani. Heals troops nearby and blesses your Sardars.', size: 3, hp: 1000, cost: { w: 150, g: 50 }, time: 28, age: 2, heal: 7, sight: 5, ht: 74 },
  tower: { n: 'Buruj', dv: 'बुरुज', desc: 'Fort bastion. Fires on enemies in range.', size: 1, hp: 950, cost: { s: 100, w: 25 }, time: 22, age: 1, atk: 7, range: 7, rof: 1.6, sight: 9, ht: 62 },
  wall: { n: 'Tat', dv: 'तट', desc: 'Fort wall of Deccan basalt. Hold Shift to place several.', size: 1, hp: 1100, cost: { s: 6 }, time: 4, age: 1, sight: 2, ht: 24 }
};
for (const k in G.BLD) G.BLD[k].key = k;

G.TECH = {
  ganimi: { n: 'Ganimi Kava', dv: 'गनिमी कावा', ic: '🌲', at: 'tc', age: 1, cost: { f: 150, g: 100 }, time: 30, desc: 'The hill-fighter’s way of war: strike and vanish. Infantry, cavalry and Sardars move 12% faster.', apply: t => { t.mods.speed *= 1.12; } },
  tat: { n: 'Durg Bandhani', dv: 'दुर्ग बांधणी', ic: '🧱', at: 'tc', age: 2, cost: { s: 150, w: 100 }, time: 40, desc: 'Fort-building in the manner of Hiroji Indulkar, architect of Raigad. Buildings +25% HP, Buruj +3 attack.',
    apply: (t, S) => { t.mods.bhp *= 1.25; t.mods.tower += 3; for (const e of S.ents) if (e.kind === 'b' && e.team === t.id) { e.maxhp = Math.round(e.maxhp * 1.25); e.hp = Math.round(e.hp * 1.25); } } },
  sheti: { n: 'Sheti Sudharna', dv: 'शेती सुधारणा', ic: '🌱', at: 'kothar', age: 1, cost: { f: 75, w: 100 }, time: 25, desc: 'Land survey and fair assessment for the Rayat. Farms yield 25% faster.', apply: t => { t.mods.farm *= 1.25; } },
  forge1: { n: 'Polad Talwar', dv: 'पोलादी तलवार', ic: '⚔️', at: 'smith', age: 1, cost: { f: 120, g: 60 }, time: 30, desc: 'Steel blades. Melee units +2 attack.', apply: t => { t.mods.melee += 2; } },
  forge2: { n: 'Firangi Blades', dv: 'फिरंगी', ic: '🗡️', at: 'smith', age: 2, req: 'forge1', cost: { f: 220, g: 140 }, time: 40, desc: 'Long straight blades on Maratha hilts. Melee units +2 attack.', apply: t => { t.mods.melee += 2; } },
  mail1: { n: 'Chilkhat', dv: 'चिलखत', ic: '🛡️', at: 'smith', age: 1, cost: { f: 100, g: 80 }, time: 30, desc: 'Mail and padded armour. All troops +1 armour, +1 pierce armour.', apply: t => { t.mods.armor += 1; t.mods.parmor += 1; } },
  mail2: { n: 'Heavy Chilkhat', dv: 'भारी चिलखत', ic: '🛡️', at: 'smith', age: 2, req: 'mail1', cost: { f: 200, g: 160 }, time: 40, desc: 'Plate-reinforced armour. All troops +1 armour, +2 pierce armour.', apply: t => { t.mods.armor += 1; t.mods.parmor += 2; } },
  fletch: { n: 'Kaman Mastery', dv: 'कमान', ic: '🏹', at: 'smith', age: 1, cost: { f: 100, g: 60 }, time: 30, desc: 'Composite bows. Archers +1 attack and +1 range.', apply: t => { t.mods.ranged += 1; t.mods.range += 1; } },
  barud: { n: 'Refined Barud', dv: 'बारूद', ic: '💥', at: 'smith', age: 2, cost: { f: 200, g: 200 }, time: 40, desc: 'Better gunpowder. Hetkari and Tof deal 20% more damage.', apply: t => { t.mods.gun *= 1.2; } },
  chauth: { n: 'Chauth', dv: 'चौथ', ic: '💰', at: 'market', age: 2, cost: { f: 200, w: 200 }, time: 40, desc: 'A levy of one-fourth on the revenue of hostile territory. A steady trickle of Hon.', apply: t => { t.mods.trickle += 0.8; } },
  bhavani: { n: 'Bhavani’s Blessing', dv: 'भवानीचा आशीर्वाद', ic: '🔱', at: 'temple', age: 2, cost: { f: 150, g: 150 }, time: 35, desc: 'Sardars and Maharaj gain 20% more health.',
    apply: (t, S) => { t.mods.hero *= 1.2; for (const e of S.ents) if (e.kind === 'u' && e.team === t.id && e.def.hero) { e.maxhp = Math.round(e.maxhp * 1.2); e.hp = Math.round(e.hp * 1.2); } } }
};
for (const k in G.TECH) G.TECH[k].key = k;

G.DIFF = [
  { n: 'Naik', sub: 'Easy', vt: 9, army: 9, first: 480, wave: 4, inc: 1, gap: 210, trickle: 0, maxAge: 2, towers: 2, garrison: 2 },
  { n: 'Sarnobat', sub: 'Standard', vt: 15, army: 20, first: 340, wave: 6, inc: 2, gap: 170, trickle: 0.6, maxAge: 3, towers: 4, garrison: 4 },
  { n: 'Chhatrapati', sub: 'Hard', vt: 22, army: 34, first: 300, wave: 7, inc: 3, gap: 140, trickle: 1.5, maxAge: 3, towers: 8, garrison: 6 }
];

G.SCENARIOS = [
  { id: 'torna', title: 'Torna', sub: 'The Toran of Swarajya', dv: 'स्वराज्याचे तोरण', year: '1646', foe: 'Adilshahi',
    map: { N: 72, seed: 1646, rock: 0.55, forest: 0.5 },
    player: { x: 15, y: 56 }, heroes: ['shivaji'], escort: 2,
    enemies: [{ faction: 'adilshahi', x: 56, y: 15, cmdr: 'qiladar', age: 0, ease: 1 }],
    brief: ['The year is 1646. Shivaji Raje is sixteen. From the Pune jagir, among the Mavale of the Sahyadri valleys, the idea of Swarajya — a realm of one’s own — has taken root.',
      'High above stands Torna, also called Prachandagad, held for the Sultan of Bijapur. Take it, and the garland — the toran — of Swarajya is hung.',
      'History records that Torna changed hands with barely a blow struck. Here, you will have to earn it: raise a settlement, train your Mavale, and bring down the Adilshahi Qila.'],
    win: 'Torna is yours. Treasure found within its walls will raise a new capital on the next hill — Rajgad. The toran of Swarajya has been tied.' },
  { id: 'pratapgad', title: 'Pratapgad', sub: 'The Tiger’s Claws', dv: 'प्रतापगड', year: '1659', foe: 'Adilshahi',
    map: { N: 80, seed: 1659, rock: 0.5, forest: 0.9, coast: true },
    player: { x: 61, y: 61 }, heroes: ['shivaji'], escort: 4, age: 1,
    enemies: [{ faction: 'adilshahi', x: 18, y: 18, cmdr: 'afzal', age: 1, ease: 0 }],
    brief: ['November 1659. Bijapur has sent its most feared general, Afzal Khan, with a great army to crush the Swarajya. He has marched into the dense forests of Javali, below your new fort of Pratapgad.',
      'On the 10th of November the two leaders met at the foot of the fort. Afzal Khan struck first; Maharaj, armoured beneath his robe, answered with the wagh nakh. At the signal, the Mavale hidden in the forest fell upon the Adilshahi camp.',
      'The forest is your ally. Build your strength in the hills, break the waves the Khan sends against you, then destroy his camp and defeat Afzal Khan.'],
    win: 'The army of Bijapur is routed in the forests of Javali. The victory at Pratapgad announces Swarajya to all of Hindustan.' },
  { id: 'sinhagad', title: 'Sinhagad', sub: 'Gad Ala, Pan Sinha Gela', dv: 'गड आला पण सिंह गेला', year: '1670', foe: 'Mughal',
    map: { N: 80, seed: 1670, rock: 0.75, forest: 0.45 },
    player: { x: 16, y: 18 }, heroes: ['shivaji', 'tanaji'], escort: 4, age: 1,
    enemies: [{ faction: 'mughal', x: 62, y: 62, cmdr: 'udaybhan', age: 1, ease: -1 }],
    brief: ['February 1670. By the Treaty of Purandar, Kondhana and twenty-two other forts were surrendered to the Mughal Empire. Now Maharaj is taking them back.',
      'Kondhana towers over Pune, held by the Rajput qiladar Udaybhan Rathod. Tanaji Malusare set aside his own son’s wedding to lead the assault, scaling the sheer cliff by night with his Mavale.',
      'Tanaji fights at your side. His blows fall hardest upon fortifications. Break into the Mughal Qila and defeat Udaybhan.'],
    win: 'Kondhana is taken — but Tanaji Malusare fell in the hour of victory. “Gad ala, pan Sinha gela,” said Maharaj: the fort is won, but the lion is gone. The fort is called Sinhagad ever after.' },
  { id: 'raigad', title: 'Raigad', sub: 'Between Two Empires', dv: 'राज्याभिषेक', year: '1674', foe: 'Mughal & Adilshahi',
    map: { N: 92, seed: 1674, rock: 0.55, forest: 0.55, coast: true },
    player: { x: 46, y: 46 }, heroes: ['shivaji'], escort: 4, age: 1, res: { f: 400, w: 400, g: 250, s: 250 },
    enemies: [{ faction: 'mughal', x: 16, y: 16, cmdr: 'subahdar', age: 1, ease: 0 }, { faction: 'adilshahi', x: 75, y: 75, cmdr: 'sardar', age: 1, ease: 0 }],
    brief: ['The Swarajya now stretches from the Sahyadri to the sea — and stands between two great powers. To the north, the Mughal subah of the Deccan. To the south, the Sultanate of Bijapur.',
      'At Raigad, the capital, preparations are under way for a coronation that will declare a sovereign Maratha state. Neither empire means to let that day arrive.',
      'Hold the centre against both. Advance to the age of Rajyabhishek if you can, and destroy both enemy strongholds.'],
    win: '6 June 1674. On the summit of Raigad, Shivaji Maharaj is crowned Chhatrapati. A new era — the Rajyabhishek Shaka — begins.' },
  { id: 'skirmish', title: 'Sahyadri', sub: 'Open Skirmish', dv: 'सह्याद्री', year: 'Random map', foe: 'Mughal',
    map: { N: 84, seed: 0, rock: 0.55, forest: 0.6 },
    player: { x: 17, y: 66 }, heroes: ['shivaji'], escort: 2,
    enemies: [{ faction: 'mughal', x: 66, y: 17, cmdr: 'subahdar', age: 0, ease: 0 }],
    brief: ['A fresh corner of the Sahyadri, different every time. A Mughal subahdar has raised a fort across the hills.',
      'Start from a single Rajwada and a handful of Rayat. Grow, advance through the ages, and drive the empire from the mountains.'],
    win: 'The hills are free. Har Har Mahadev!' }
];

G.nameOf = function (e) {
  const S = G.S, t = S.teams[e.team];
  if (e.type === 'shivaji') return t.age >= 3 ? 'Chhatrapati Shivaji Maharaj' : 'Shivaji Maharaj';
  return (t.f.names && t.f.names[e.type]) || e.def.n;
};
G.defName = function (key, faction) {
  const f = G.FACTIONS[faction], d = G.UNITS[key] || G.BLD[key];
  return (f.names && f.names[key]) || d.n;
};
