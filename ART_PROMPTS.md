# Swarajya art sheet
Each block below is one image. Paste the whole prompt into your image tool (Google Flow or any other), pick the best result, save it with the exact file name shown, and drop it into the folder shown. Then either tell Claude it is there, or run this one command from the `swarajya` folder and refresh the game:

```bash
python3 tools/build_assets.py
```

That command removes the magenta background, trims and sizes each image, and adds it to the game. Nothing else needs changing.
## Rules that make the images work in the game
- **File name and folder must match exactly.** PNG, JPG or WebP are all accepted (`tanaji.png`, `tanaji.jpg` and `tanaji.webp` all work).
- **Buildings and nature must have the flat magenta background.** The game removes magenta automatically, so there is no need to cut anything out. If a result has scenery, a gradient or a floor shadow behind it, regenerate.
- **Buildings must show the corner pointing down** (the diamond footprint). A front-on or side-on building will look wrong on the map. This is the most common thing to regenerate for.
- **Keep one tool and one style for a whole group** (all Swarajya buildings together, all portraits together) so they match each other.
- **Size:** 1024 x 1024 or larger for everything except the title painting (16:9, 1920 x 1080 or larger).
- **Units on the map** (the small walking soldiers) stay drawn by the game, because they need many animation frames. Their portraits are what you generate.
## Suggested order
1. The four hero portraits and the Rajwada. These are what you look at most.
2. The rest of the Swarajya buildings.
3. Troop portraits and enemy commanders.
4. Enemy buildings, trees and rocks.
5. Ground textures and the title painting.

---

## 1. Portraits

Folder: `assets/portraits`

### Shivaji Maharaj (already in the game as a real 1680s museum painting; generate this only if you want a cinematic version)

Save as: `assets/portraits/shivaji.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: Chhatrapati Shivaji Maharaj at about 40: a lean, alert face with a sharp aquiline nose, a full dark beard and moustache, calm and commanding eyes. He wears the pointed Maratha jiretop turban in saffron and gold with a pearl tassel and a black plume, a crescent-moon tilak on the forehead, gold hoop earrings, strings of pearls, and a white angarkha with fine floral print under a dark shoulder sash. The gilded hilt of the Bhavani sword is just visible at the lower edge.
```

### Tanaji Malusare

Save as: `assets/portraits/tanaji.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: Tanaji Malusare, a Maratha subedar in his forties: broad-shouldered, weathered and fearless, with a thick upturned moustache and a firm jaw. A deep red Maratha pagdi turban, a quilted cotton war coat with leather straps, a round rhino-hide shield with brass bosses slung on the shoulder and a curved talwar hilt in view. A faint sandalwood tilak.
```

### Baji Prabhu Deshpande

Save as: `assets/portraits/bajiprabhu.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: Baji Prabhu Deshpande, a towering Maratha commander of about fifty: powerful build, greying moustache and short beard, a fierce but steady gaze, a fresh cut on one cheek. A white pagdi turban, chain mail over a white tunic, and on his raised forearm the steel gauntlet of a dandpatta sword.
```

### Netaji Palkar

Save as: `assets/portraits/netaji.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: Netaji Palkar, commander of the Maratha cavalry, late thirties: lean and quick-eyed with a trimmed black moustache and a confident half-smile. A maroon and gold pagdi, a riding coat with a mail collar, a lance resting on his shoulder and a dark horse's mane blurred behind him.
```

### Rayat (villager)

Save as: `assets/portraits/villager.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A Maharashtrian farmer of the 1600s, about thirty-five, sun-browned and kind-faced with a light moustache. A plain white cotton turban, bare shoulders with a rough cotton shawl, a sickle resting on his shoulder and ears of jowar grain behind him.
```

### Mavala (swordsman)

Save as: `assets/portraits/sword.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A young Mavala hill soldier: wiry, sharp-eyed, a thin moustache, a determined look. A tightly wound white and saffron turban, a simple white cotton tunic with a cross-belt, a small round leather shield and a curved sword.
```

### Bhalekari (spearman)

Save as: `assets/portraits/spear.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A Maratha spearman: a sturdy man of thirty with a short beard. A plain orange-brown turban, a padded cotton jacket, both hands on a long bamboo spear with a steel leaf-shaped head beside his face.
```

### Dhanurdhar (archer)

Save as: `assets/portraits/archer.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A Maratha archer: lean, focused, one eye slightly narrowed. A cream turban, a leather arm guard, a recurved composite bow held upright and the feathered ends of arrows showing above his shoulder.
```

### Hetkari (matchlockman)

Save as: `assets/portraits/musket.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A Hetkari matchlock gunner from the Konkan coast: dark, stocky, calm. A red-checked head cloth, a powder horn and cord of slow match across his chest, a long matchlock musket with brass bands resting against his shoulder, a thread of smoke rising.
```

### Bargir (light cavalry)

Save as: `assets/portraits/lcav.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A Maratha Bargir light horseman: a lean young rider with a windswept look and a thin moustache. A tightly tied saffron turban with a loose tail, a light cotton coat, a lance, and the head of a small bay horse beside him.
```

### Shiledar (heavy cavalry)

Save as: `assets/portraits/hcav.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A Maratha Shiledar heavy horseman: a proud veteran with a grey-flecked moustache. A steel helmet wrapped in a turban cloth with a mail aventail, a plate-and-mail cuirass, a heavy straight firangi sword raised near the shoulder.
```

### Tof (cannon crew)

Save as: `assets/portraits/cannon.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A Maratha gunner beside a bronze cannon: a soot-streaked man of forty with a cloth tied over his hair. A leather apron over a cotton tunic, a burning linstock in his hand, and the ornamented bronze muzzle of the cannon filling the lower corner.
```

### Afzal Khan

Save as: `assets/portraits/afzal.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: Afzal Khan, a 17th century general of the Bijapur Sultanate: a very tall, heavy and imposing man with a thick black beard, cold confident eyes and a scar across one brow. A white and gold turban with a jewelled aigrette, a rich brocade robe in deep blue and gold over mail, a broad sash with a dagger.
```

### Udaybhan Rathod

Save as: `assets/portraits/udaybhan.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: Udaybhan Rathod, a Rajput fort commander in Mughal service: a hard, proud face with a long moustache curled upward and side whiskers. A red and gold Rajput turban, a steel cuirass with gold inlay over a green tunic, a talwar held upright in front of his chest.
```

### Adilshahi Qiladar (fort commander)

Save as: `assets/portraits/qiladar.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A Deccani fort commander of the Bijapur Sultanate: a middle-aged officer with a neat pointed beard and a wary look. A compact white turban, a blue quilted coat with a mail collar, a ring of heavy iron keys and a straight sword at his belt.
```

### Mughal Subahdar

Save as: `assets/portraits/subahdar.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A Mughal governor of the Deccan: a composed nobleman of fifty with a trimmed grey beard and heavy-lidded eyes. A jewelled white turban with a heron plume, a green and gold jama robe, a pearl necklace, a jade-hilted dagger in a brocade sash.
```

### Adilshahi Sardar

Save as: `assets/portraits/sardar.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A noble cavalry commander of the Bijapur Sultanate: a handsome man of thirty-five with a short black beard and a confident stare. A dark blue turban with gold thread, lamellar armour over silk, a horse's bridle in one gloved hand.
```

### Sultanate / Mughal soldier (shared by enemy troops)

Save as: `assets/portraits/enemy_soldier.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: A 17th century Deccan infantryman in imperial service: a tough, expressionless soldier with a moustache. A plain white turban, a padded green-grey coat, a round steel shield on his arm and a spear shaft beside him.
```

### War elephant

Save as: `assets/portraits/elephant.png`

```text
Bust portrait for the character panel of a historical strategy game set in the 17th century Deccan, India. Cinematic digital oil painting, realistic and dignified, with historically accurate clothing and arms. Dramatic warm key light from the upper left, a soft saffron rim light, a dark deep-maroon background with faint smoke, sharp focus on the face, fine detail in fabric and metal. Head and shoulders, three-quarter view, face turned slightly toward the viewer's right, eyes looking past the camera. No text, no watermark, no frame. Square image, 1:1. Subject: The head of an armoured war elephant, three-quarter view: steel plates over the forehead, a painted trunk, brass-capped tusks, red and gold tasselled cloth, and above it the edge of a wooden howdah with a mahout holding an ankush hook.
```

---

## 2. Swarajya buildings

Folder: `assets/buildings`

### Rajwada (town centre), large building

Save as: `assets/buildings/swarajya_tc.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A Rajwada, the fortified palace of a 17th century Maratha king. A square enclosure of dark grey Deccan basalt with a round bastion at each corner and a tall pointed-arch main gate with heavy teak doors studded with iron spikes; above the gate sits a small nagarkhana drum pavilion. Inside the walls rises a two-storey wada with whitewashed walls, carved dark teak galleries with rows of cusped wooden arches, and hipped roofs of terracotta country tiles. A swallow-tailed saffron flag flies from the highest roof.
```

### Ghar (house), small building

Save as: `assets/buildings/swarajya_house.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A small Maharashtrian village house: thick mud-plastered walls with a painted red-ochre band at the base, a low carved wooden door, a sloping roof of terracotta country tiles with a patch of thatch, a tulsi vrindavan planter in front and clay water pots against the wall.
```

### Kothar (granary), small building

Save as: `assets/buildings/swarajya_kothar.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A village granary: a whitewashed storehouse raised on a basalt plinth, a tiled gable roof, a ramp to a wide door, large clay grain jars, stacked jute sacks and bamboo winnowing baskets outside.
```

### Vakhar (depot), small building

Save as: `assets/buildings/swarajya_vakhar.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A timber and stone depot: an open-sided shed with a thatched roof on rough teak posts, neat stacks of logs, cut basalt blocks, baskets of ore and a parked bullock cart with no animals.
```

### Talim (barracks), medium building

Save as: `assets/buildings/swarajya_barracks.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A Maratha talim, a warriors' training yard: a low basalt wall around a square court with a small tiled gatehouse, a pit of red wrestling earth, a tall mallakhamb pole, wooden racks of curved swords, round shields and spears, and a saffron flag.
```

### Tirandazi Maidan (archery range), medium building

Save as: `assets/buildings/swarajya_range.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: An archery ground: a low dry-stone wall around a packed-earth yard, three straw target butts with painted rings, racks of bows and quivers, and a small open pavilion with a tiled roof.
```

### Paga (stable), medium building

Save as: `assets/buildings/swarajya_stable.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A cavalry stable: a long building with a terracotta tiled roof on teak posts, open stalls with hay and mangers, a stone water trough, saddles and bridles on a rail, a pile of fodder.
```

### Tofkhana (artillery works), medium building

Save as: `assets/buildings/swarajya_siege.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: An artillery foundry: a heavy basalt workshop with a wide arched doorway and a smoking furnace chimney, a bronze cannon on a wooden carriage in the yard, a pyramid of iron cannonballs and a few powder kegs.
```

### Shikalgar (weaponsmith), small building

Save as: `assets/buildings/swarajya_smith.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A weaponsmith's forge: a stone and timber workshop with a smoke-blackened tiled roof, a glowing forge and leather bellows visible through the open front, an anvil, and finished sword blades and spearheads on a rack.
```

### Peth (market), medium building

Save as: `assets/buildings/swarajya_market.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A small market square: four stalls with striped cloth awnings in saffron, red, green and indigo around a stone platform, baskets of grain and spices, bolts of cloth, brass pots and a banyan sapling in a planter.
```

### Bhavani Mandir (temple), medium building

Save as: `assets/buildings/swarajya_temple.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A temple of the goddess Bhavani in black basalt: a stepped Hemadpanti shikhara spire with a brass kalash finial, a pillared mandapa porch with carved columns, a stone deepmala lamp tower in front and a saffron flag on the spire.
```

### Buruj (bastion tower), tall narrow building

Save as: `assets/buildings/swarajya_tower.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A single round bastion tower of a Maratha hill fort: dark basalt masonry tapering slightly upward, a parapet of rounded merlons, narrow arrow slits and a swallow-tailed saffron flag on a pole. Tall and narrow.
```

---

## 3. Adilshahi (Bijapur) buildings

Folder: `assets/buildings`

### Qila (enemy citadel), large building

Save as: `assets/buildings/adilshahi_tc.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A citadel of the Bijapur Sultanate: a square fort of dark basalt with a turret at each corner capped by a small bulbous dome, pointed-arch gate, and at the centre a hall crowned by a large onion dome rising from a ring of lotus petals, with slender minarets. A deep blue banner flies from the dome.
```

### Makan (house), small building

Save as: `assets/buildings/adilshahi_house.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A flat-roofed Deccan town house: lime-plastered walls, a pointed-arch doorway, a carved wooden lattice window, a parapet with small finials and a stair to the roof.
```

### Chhavni (barracks), medium building

Save as: `assets/buildings/adilshahi_barracks.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A garrison barracks of the Bijapur Sultanate: an arcaded court of pointed arches in basalt and lime plaster, a small dome over the gate, spear racks, and a deep blue banner.
```

### Archery range, medium building

Save as: `assets/buildings/adilshahi_range.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A Deccani archery yard: a plastered wall with pointed-arch niches, straw targets, bow racks, and a small domed kiosk.
```

### Astabal (stable), medium building

Save as: `assets/buildings/adilshahi_stable.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A sultanate cavalry stable: a long arcade of pointed arches with stalls behind, a flat roof with a parapet, hay, a stone trough and saddles.
```

### Topkhana (artillery works), medium building

Save as: `assets/buildings/adilshahi_siege.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A sultanate gun foundry: a massive basalt hall with a pointed-arch door, a very large bronze cannon with a lion-mouth muzzle on a carriage, cannonballs and a smoking chimney.
```

### Silah-khana (armoury), small building

Save as: `assets/buildings/adilshahi_smith.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A sultanate armourer's workshop: plastered walls, a small dome, a glowing forge inside a pointed arch, racks of mail coats and helmets.
```

### Burj (tower), tall narrow building

Save as: `assets/buildings/adilshahi_tower.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A single round fort tower of the Bijapur Sultanate: dark basalt with a band of carved stone, pointed merlons, a small bulbous dome cap and a deep blue pennant. Tall and narrow.
```

---

## 4. Mughal buildings

Folder: `assets/buildings`

### Qila (enemy citadel), large building

Save as: `assets/buildings/mughal_tc.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A Mughal fort-palace: a square fort of red sandstone with battlements and octagonal corner towers topped by white marble chhatri kiosks, a grand gate with a cusped arch and white inlay, and inside a white marble pavilion with a ribbed dome. A green banner flies above.
```

### Makan (house), small building

Save as: `assets/buildings/mughal_house.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A Mughal town house: red sandstone base with white plaster above, a cusped-arch doorway, a jharokha balcony with a small curved roof, and a flat roof with a parapet.
```

### Chhavni (barracks), medium building

Save as: `assets/buildings/mughal_barracks.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A Mughal garrison barracks: a red sandstone court with cusped-arch arcades, a gatehouse with two small chhatris, weapon racks and a green banner.
```

### Archery range, medium building

Save as: `assets/buildings/mughal_range.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A Mughal archery yard: a red sandstone wall, straw targets, bow racks and a small white chhatri pavilion.
```

### Astabal (stable), medium building

Save as: `assets/buildings/mughal_stable.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A Mughal cavalry stable: a long red sandstone arcade of cusped arches with stalls, a sloping stone eave, hay, a trough and saddles.
```

### Topkhana (artillery works), medium building

Save as: `assets/buildings/mughal_siege.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A Mughal gun park: a red sandstone workshop with a broad arch, a long bronze cannon on a heavy carriage, cannonballs, powder barrels and a furnace.
```

### Silah-khana (armoury), small building

Save as: `assets/buildings/mughal_smith.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A Mughal armoury workshop: red sandstone with a white marble lintel, a glowing forge under an arch, racks of swords, shields and plate armour.
```

### Burj (tower), tall narrow building

Save as: `assets/buildings/mughal_tower.png`

```text
Isometric building sprite for a historical strategy game set in 17th century Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels, rich stone, wood and tile texture and a warm natural palette. Strict isometric three-quarter top-down view: the camera looks down at about 30 degrees and the building is rotated 45 degrees, so one corner of its square footprint points straight down toward the viewer and both front walls are visible. Strong warm sunlight from the upper right, with the left-hand wall in soft shade. The building stands on a thin diamond-shaped base of packed earth and paving stones that exactly matches its footprint. The whole building is fully visible and centred, with empty margin on every side, nothing cropped. No people, no animals, no text, no logo, no border, no landscape, no cast shadow outside the base. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A single octagonal Mughal fort tower of red sandstone with white marble bands, pointed merlons, a white chhatri kiosk on top and a green pennant. Tall and narrow.
```

---

## 5. Trees, bushes and rocks

Folder: `assets/nature`

### Mango tree

Save as: `assets/nature/tree1.png`

```text
Single isometric nature sprite for a historical strategy game set in the Sahyadri mountains of Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels and a warm natural palette. Isometric three-quarter top-down view, camera looking down at about 30 degrees. Warm sunlight from the upper right. The object is fully visible and centred with empty margin on every side. No people, no animals, no text, no border, no ground, no cast shadow. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A large mango tree with a thick trunk and a dense, dark green rounded crown, a few clusters of green mangoes.
```

### Banyan tree

Save as: `assets/nature/tree2.png`

```text
Single isometric nature sprite for a historical strategy game set in the Sahyadri mountains of Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels and a warm natural palette. Isometric three-quarter top-down view, camera looking down at about 30 degrees. Warm sunlight from the upper right. The object is fully visible and centred with empty margin on every side. No people, no animals, no text, no border, no ground, no cast shadow. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: An old banyan tree with a wide spreading crown and hanging aerial roots, slightly lighter green.
```

### Teak tree

Save as: `assets/nature/tree3.png`

```text
Single isometric nature sprite for a historical strategy game set in the Sahyadri mountains of Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels and a warm natural palette. Isometric three-quarter top-down view, camera looking down at about 30 degrees. Warm sunlight from the upper right. The object is fully visible and centred with empty margin on every side. No people, no animals, no text, no border, no ground, no cast shadow. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A tall teak tree with a straight pale trunk and large, broad, yellow-green leaves.
```

### Coconut palm

Save as: `assets/nature/tree4.png`

```text
Single isometric nature sprite for a historical strategy game set in the Sahyadri mountains of Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels and a warm natural palette. Isometric three-quarter top-down view, camera looking down at about 30 degrees. Warm sunlight from the upper right. The object is fully visible and centred with empty margin on every side. No people, no animals, no text, no border, no ground, no cast shadow. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A coconut palm of the Konkan coast: a slender curved trunk and a crown of long fronds with a cluster of coconuts.
```

### Berry bush (food)

Save as: `assets/nature/bush.png`

```text
Single isometric nature sprite for a historical strategy game set in the Sahyadri mountains of Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels and a warm natural palette. Isometric three-quarter top-down view, camera looking down at about 30 degrees. Warm sunlight from the upper right. The object is fully visible and centred with empty margin on every side. No people, no animals, no text, no border, no ground, no cast shadow. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A low, dense karvanda berry bush with small dark leaves and many ripe purple-red berries.
```

### Gold deposit

Save as: `assets/nature/gold.png`

```text
Single isometric nature sprite for a historical strategy game set in the Sahyadri mountains of Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels and a warm natural palette. Isometric three-quarter top-down view, camera looking down at about 30 degrees. Warm sunlight from the upper right. The object is fully visible and centred with empty margin on every side. No people, no animals, no text, no border, no ground, no cast shadow. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A rocky outcrop of brown stone with bright veins and nuggets of raw gold ore, three or four boulders.
```

### Stone deposit

Save as: `assets/nature/stone.png`

```text
Single isometric nature sprite for a historical strategy game set in the Sahyadri mountains of Maharashtra, India. Hand-painted, highly detailed pixel art with crisp clean pixels and a warm natural palette. Isometric three-quarter top-down view, camera looking down at about 30 degrees. Warm sunlight from the upper right. The object is fully visible and centred with empty margin on every side. No people, no animals, no text, no border, no ground, no cast shadow. The background is one flat, solid, pure magenta colour (#FF00FF) with no gradient. Square image, 1:1. Subject: A pile of grey-black basalt boulders and a few roughly squared quarry blocks.
```


---

## 6. Ground textures

Folder: `assets/terrain`

### Monsoon grass

Save as: `assets/terrain/grass.png`

```text
Seamless tileable ground texture for a strategy game, seen straight down from directly above. Hand-painted detailed pixel art, even flat lighting, no shadows, no perspective, no objects, no horizon. The left edge matches the right edge and the top matches the bottom so it repeats without a visible seam. Square image, 1:1. Subject: Lush green monsoon grass of the Western Ghats with small variations in tone, a few tiny wildflowers and darker tufts.
```

### Dry grass and earth

Save as: `assets/terrain/dry.png`

```text
Seamless tileable ground texture for a strategy game, seen straight down from directly above. Hand-painted detailed pixel art, even flat lighting, no shadows, no perspective, no objects, no horizon. The left edge matches the right edge and the top matches the bottom so it repeats without a visible seam. Square image, 1:1. Subject: Dry season ground: yellow-brown grass and red-brown laterite earth mixed in soft patches.
```

### Dirt road

Save as: `assets/terrain/road.png`

```text
Seamless tileable ground texture for a strategy game, seen straight down from directly above. Hand-painted detailed pixel art, even flat lighting, no shadows, no perspective, no objects, no horizon. The left edge matches the right edge and the top matches the bottom so it repeats without a visible seam. Square image, 1:1. Subject: A packed dirt track of pale red-brown laterite soil with small pebbles and faint cart ruts running in random directions.
```

### Beach sand

Save as: `assets/terrain/sand.png`

```text
Seamless tileable ground texture for a strategy game, seen straight down from directly above. Hand-painted detailed pixel art, even flat lighting, no shadows, no perspective, no objects, no horizon. The left edge matches the right edge and the top matches the bottom so it repeats without a visible seam. Square image, 1:1. Subject: Pale golden beach sand with fine ripples and a few tiny shells.
```

### Water

Save as: `assets/terrain/water.png`

```text
Seamless tileable ground texture for a strategy game, seen straight down from directly above. Hand-painted detailed pixel art, even flat lighting, no shadows, no perspective, no objects, no horizon. The left edge matches the right edge and the top matches the bottom so it repeats without a visible seam. Square image, 1:1. Subject: Deep blue-green water with gentle small ripples and a few soft light glints.
```

### Basalt rock

Save as: `assets/terrain/basalt.png`

```text
Seamless tileable ground texture for a strategy game, seen straight down from directly above. Hand-painted detailed pixel art, even flat lighting, no shadows, no perspective, no objects, no horizon. The left edge matches the right edge and the top matches the bottom so it repeats without a visible seam. Square image, 1:1. Subject: Dark grey Deccan basalt bedrock with cracks, lichen patches and small ledges.
```

---

## 7. Title painting

Folder: `assets/ui`

### Menu background

Save as: `assets/ui/title.jpg`

```text
Wide cinematic matte painting, 16:9. A great Maratha hill fort on a ridge of the Sahyadri mountains at dawn in the monsoon: basalt walls and round bastions following the cliff edge, a tall gateway, mist filling the valleys below, layer after layer of blue-green ridges fading into a saffron and rose sky. A swallow-tailed saffron flag flies from the highest bastion. In the lower right foreground, seen from behind, a lone rider on a white horse stands on a rock ledge looking toward the fort. Painterly, realistic, epic scale, soft volumetric light. The upper left of the sky is calm and empty, and the bottom third is dark, so that text can sit there. No text, no logo, no watermark.
```

---

## Credits for art already in the game

- Portrait of Shivaji Maharaj: painting c. 1680 to 1687, British Museum, public domain, via Wikimedia Commons (`File:Shivaji British Museum.jpg`).
