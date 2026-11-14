// GENERATED from modules/data/monster-sprites.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // classic-data:C:\Users\pjh46\.codex\worktrees\esm-pilot-20261112\pr-repo\modules\data\weapon-categories.mjs
  var WEAPON_CATEGORIES = globalThis.WEAPON_CATEGORIES;

  // modules/data/monster-sprites.mjs
  var MONSTER_SPRITE_KINDS = Object.freeze({
    bug: Object.freeze({
      frame: 48,
      rows: Object.freeze(["up", "down", "left", "right"]),
      feet: Object.freeze([24, 28]),
      shadow: 0.3,
      idleMs: Object.freeze([220, 180, 220, 180]),
      attackMs: Object.freeze([100, 90, 80, 70, 110, 150]),
      impactFrame: 3
    }),
    deaconMelee: Object.freeze({
      frame: 79,
      rows: Object.freeze(["down", "left", "right", "up"]),
      feet: Object.freeze([39.5, 40]),
      shadow: 0.24,
      idleMs: Object.freeze([100, 100, 100, 100]),
      attackMs: Object.freeze([150, 70, 150, 80, 90, 120]),
      impactFrame: 2
    }),
    deaconRanged: Object.freeze({
      frame: 79,
      rows: Object.freeze(["down", "left", "right", "up"]),
      feet: Object.freeze([39.5, 40]),
      shadow: 0.24,
      idleMs: Object.freeze([100, 100, 100, 100]),
      attackMs: Object.freeze([110, 100, 200, 60, 90, 130]),
      impactFrame: 3
    }),
    root: Object.freeze({
      frame: 64,
      rows: Object.freeze(["up", "down", "left", "right"]),
      feet: Object.freeze([32, 49]),
      shadow: 0.3,
      idleMs: Object.freeze([220, 180, 220, 180]),
      attackMs: Object.freeze([100, 90, 80, 70, 110, 150]),
      impactFrame: 3
    }),
    realm: Object.freeze({
      frame: 48,
      rows: Object.freeze(["up", "down", "left", "right"]),
      feet: Object.freeze([24, 32]),
      shadow: 0.3,
      idleMs: Object.freeze([220, 180, 220, 180]),
      attackMs: Object.freeze([100, 90, 80, 70, 110, 150]),
      impactFrame: 3
    }),
    realmBoss: Object.freeze({
      frame: 64,
      rows: Object.freeze(["up", "down", "left", "right"]),
      feet: Object.freeze([32, 46]),
      shadow: 0.42,
      idleMs: Object.freeze([240, 200, 240, 200]),
      attackMs: Object.freeze([120, 110, 90, 80, 130, 170]),
      impactFrame: 3
    })
  });
  var MONSTER_SPRITE_SHEETS = Object.freeze(Object.fromEntries([
    ["act1-slime", "bug", "bugs/act1-slime", 12],
    ["act1-worm", "bug", "bugs/act1-worm", 13],
    ["act1-ant", "bug", "bugs/act1-ant", 17],
    ["act3-slime", "bug", "bugs/act3-slime", 15],
    ["act3-worm", "bug", "bugs/act3-worm", 14],
    ["act3-ant", "bug", "bugs/act3-ant", 18],
    ["act4-slime", "bug", "bugs/act4-slime", 15],
    ["act4-worm", "bug", "bugs/act4-worm", 14],
    ["act4-ant", "bug", "bugs/act4-ant", 21],
    ["act5-slime", "bug", "bugs/act5-slime", 19],
    ["act5-worm", "bug", "bugs/act5-worm", 16],
    ["act5-ant", "bug", "bugs/act5-ant", 22],
    ...[2, 6, 7, 8].flatMap((act) => [
      [`deacon-act${act}-melee`, "deaconMelee", `deacons/act${act}-melee`, 24],
      [`deacon-act${act}-ranged`, "deaconRanged", `deacons/act${act}-ranged`, 24]
    ]),
    ...Object.entries({
      greatsword: { up: [35, 49], down: [36, 48], left: [39, 48], right: [23, 48] },
      scimitar: { up: [36.5, 49], down: [36, 48], left: [34.5, 48], right: [26.5, 48] },
      shortbow: { up: [35, 49], down: [33, 48], left: [30, 49], right: [32, 49] },
      orb: { up: [34.5, 49], down: [32, 49], left: [33, 48], right: [30, 48] },
      flask: { up: [30, 49], down: [31, 49], left: [35, 49], right: [29, 49] },
      censer: { up: [34, 49], down: [35, 49], left: [37.5, 48], right: [24.5, 49] }
    }).map(([weapon, feet]) => [`root-${weapon}`, "root", `roots/${WEAPON_CATEGORIES[weapon].root}`, 31, feet]),
    ["underworld-beetle", "realm", "realms/underworld/beetle", 17, [24, 32]],
    ["underworld-hound", "realm", "realms/underworld/hound", 22, [24, 31]],
    ["underworld-king", "realmBoss", "realms/underworld/king", 42, [32, 46]],
    ["cosmos-star", "realm", "realms/cosmos/star", 22, [24, 33]],
    ["cosmos-ooze", "realm", "realms/cosmos/ooze", 24, [24, 32]],
    ["cosmos-sentinel", "realm", "realms/cosmos/sentinel", 30, [24, 36]],
    ["cosmos-colossus", "realmBoss", "realms/cosmos/colossus", 43, [32, 46]],
    // 운석 전용 역할은 고유 ID로 공격 유형과 표기를 분리하고, 그림은 이미 있는 우주계 시트를 빌린다.
    ["meteor-shard", "realm", "realms/cosmos/star", 22, [24, 33]],
    ["meteor-melt", "realm", "realms/cosmos/ooze", 24, [24, 32]],
    ["meteor-sentinel", "realm", "realms/cosmos/sentinel", 30, [24, 36]],
    // 대균열 전용 ID는 전투 역할을 구별한다. 낡은 시점 그림은 가까운 종족의 시트를 빌린다.
    ["breach-scout", "realm", "realms/cosmos/star", 22, [24, 33]],
    ["breach-reflux", "realm", "realms/sky/imp", 25, [24, 36]],
    ["breach-veil", "realm", "realms/cosmos/sentinel", 30, [24, 36]],
    ["breach-venom", "realm", "realms/ocean/oracle", 26, [24, 37]],
    ["grand_breach_guardian", "realmBoss", "realms/cosmos/colossus", 43, [32, 46]],
    ["ocean-angler", "realm", "realms/ocean/angler", 28, [24, 32]],
    ["ocean-crab", "realm", "realms/ocean/crab", 19, [24, 33]],
    ["ocean-shell", "realm", "realms/ocean/shell", 14, [24, 31]],
    ["ocean-oracle", "realm", "realms/ocean/oracle", 26, [24, 37]],
    ["ocean-leviathan", "realmBoss", "realms/ocean/leviathan", 42, [32, 47]],
    ["hive-worker", "realm", "realms/hive/worker", 24, [24, 34]],
    ["hive-drone", "realm", "realms/hive/drone", 25, [24, 34]],
    ["hive-scout", "realm", "realms/hive/scout", 23, [24, 34]],
    ["hive-nurse", "realm", "realms/hive/nurse", 24, [24, 34]],
    ["hive-guard", "realm", "realms/hive/guard", 27, [24, 34]],
    ["hive-royal", "realm", "realms/hive/royal", 27, [24, 34]],
    ["hive-queen", "realmBoss", "realms/hive/queen", 40, [32, 46]],
    ["sky-imp", "realm", "realms/sky/imp", 25, [24, 36]],
    ["sky-roc", "realm", "realms/sky/roc", 24, [24, 33]],
    ["sky-harpy", "realm", "realms/sky/harpy", 28, [24, 34]],
    ["sky-griffin", "realm", "realms/sky/griffin", 29, [24, 33]],
    ["sky-titan", "realmBoss", "realms/sky/titan", 44, [32, 46]]
  ].map(([id, kind, stem, height, feet]) => [id, Object.freeze({
    id,
    kind,
    height,
    feet: feet ? Object.freeze(feet) : null,
    idle: `assets/enemies/${stem}-idle.png`,
    attack: `assets/enemies/${stem}-attack.png`
  })])));
  var MONSTER_STAGE_KIND = Object.freeze({
    frame: 96,
    stage: true,
    shadow: 0.3,
    idleMs: Object.freeze([170, 170, 170, 170, 170, 170]),
    attackMs: Object.freeze([100, 90, 80, 70, 110, 150]),
    impactFrame: 3
  });
  var MONSTER_STAGE_SHEETS = Object.freeze(Object.fromEntries([
    ["act1-slime", 53, [44, 84]],
    ["act1-ant", 41, [42, 84]],
    ["act1-worm", 29, [46, 84]],
    ...Object.entries({ fire: 74, ice: 66, lightning: 60, poison: 66, holy: 72, void: 60 }).map(([element, height]) => ["wisp-" + element, height, [48, 84]]),
    ["breach-scout", 60, [48, 84], "wisp-void"],
    ["breach-reflux", 60, [48, 84], "wisp-void"],
    ["breach-veil", 60, [48, 84], "wisp-void"],
    ["breach-venom", 66, [48, 84], "wisp-poison"]
  ].map(([id, height, feet, source = id]) => [id, Object.freeze({
    id,
    kind: "stage",
    height,
    feet: Object.freeze(feet),
    idle: `assets/enemies/stage/${source}-idle.png`,
    attack: `assets/enemies/stage/${source}-attack.png`
  })])));

  // modules/data/monster-sprites.mjs:classic
  Object.assign(globalThis, { MONSTER_SPRITE_KINDS, MONSTER_SPRITE_SHEETS, MONSTER_STAGE_KIND, MONSTER_STAGE_SHEETS });
  if (typeof safeExposeData === "function") safeExposeData({ MONSTER_SPRITE_KINDS, MONSTER_SPRITE_SHEETS, MONSTER_STAGE_KIND, MONSTER_STAGE_SHEETS });
})();
