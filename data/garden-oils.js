// GENERATED from modules/data/garden-oils.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/garden-oils.mjs
  var GARDEN_OILS = Object.freeze({
    minLoop: 36,
    // 기름: 재화 키, 그루터기 함 색, 이름.
    oils: Object.freeze([
      { key: "oilFire", color: "fire", name: "불씨 기름" },
      { key: "oilCold", color: "cold", name: "서리 기름" },
      { key: "oilLight", color: "lightning", name: "뇌우 기름" },
      { key: "oilChaos", color: "chaos", name: "그늘 기름" }
    ].map(Object.freeze)),
    // 한 번 바르는 기름 수, 보여 주는 노드 수, 같은 색 셋일 때의 최소 힘 단계(패시브 노드 powerBand).
    perAnoint: 3,
    offers: 3,
    pureBand: 2,
    // 깊어지는 해금: 루프 48부터 목걸이에 둘째 자리(다른 노드 하나를 더 새긴다).
    secondSlotLoop: 48,
    // 색마다 그 색이 부르는 패시브 주요 노드의 갈래(archetype). 갈래가 없는 노드는 바를 수 없다.
    pools: Object.freeze({
      fire: Object.freeze(["strength", "melee", "physical", "armor", "shield", "fire", "slam", "channel_guard", "guard_regen", "life", "bleed", "duel", "atk"]),
      cold: Object.freeze(["dexterity", "evasion", "cold", "projectile", "range_roll", "cold_poison", "area_projectile", "precision", "targets", "volley", "accuracy"]),
      lightning: Object.freeze(["intelligence", "spell", "energyShield", "lightning", "elemental", "mystique", "devotion", "energy", "echo", "area", "arcane"]),
      chaos: Object.freeze([
        "chaos",
        "cycle",
        "potion",
        "ailment",
        "poison_projectile",
        "dot_spell",
        "energy_poison",
        "summon",
        "maximum_resist",
        "summon_efficiency",
        "guard_summon"
      ])
    }),
    // 시든 무리의 처치 드롭(무작위 색 기름 하나): 일반과 정예.
    killDrops: Object.freeze({ normal: 0.05, elite: 0.3 }),
    // 열매 조합: 같은 색 열매 둘 → 그 색 기름 하나.
    fruitCost: 2
  });

  // modules/data/garden-oils.mjs:classic
  Object.assign(globalThis, { GARDEN_OILS });
  if (typeof safeExposeData === "function") safeExposeData({ GARDEN_OILS });
})();
