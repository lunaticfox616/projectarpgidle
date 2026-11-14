// GENERATED from modules/data/act-exploration-maps.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/act-exploration-maps.mjs
  var ACT_EXPLORATION_MAPS = Object.freeze([
    {
      act: 1,
      id: "root-branches",
      terrain: "뿌리 동굴",
      biome: "root",
      width: 39,
      height: 35,
      rotation: 0,
      gate: [19, 7],
      approach: "crown",
      rooms: [
        ["entry", 19, 31, 2, 2, "entry"],
        ["hall", 19, 25, 4, 2, "battle"],
        ["fork", 19, 18, 3, 3, "battle"],
        ["west", 7, 18, 4, 3, "elite"],
        ["east", 31, 18, 4, 3, "elite"],
        ["twig", 31, 27, 3, 2, "optional"],
        ["hollow", 6, 10, 3, 2, "optional"],
        ["crown", 19, 11, 3, 2, "battle"],
        ["boss", 19, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "hall"],
        ["hall", "fork"],
        ["fork", "west"],
        ["fork", "east"],
        ["east", "twig"],
        ["west", "hollow"],
        ["fork", "crown"]
      ]
    },
    {
      act: 2,
      id: "garden-circuit",
      terrain: "생울타리 중정",
      biome: "courtyard",
      width: 43,
      height: 35,
      rotation: 0,
      gate: [21, 7],
      approach: "balcony",
      rooms: [
        ["entry", 21, 31, 2, 2, "entry"],
        ["south", 21, 25, 4, 2, "battle"],
        ["west", 8, 25, 3, 2, "battle"],
        ["east", 34, 25, 3, 2, "battle"],
        ["hedgeWest", 8, 14, 3, 3, "elite"],
        ["hedgeEast", 34, 14, 3, 3, "elite"],
        ["alcove", 3, 20, 1, 2, "optional"],
        ["arbor", 39, 20, 1, 2, "optional"],
        ["balcony", 21, 11, 4, 2, "battle"],
        ["boss", 21, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "south"],
        ["south", "west"],
        ["south", "east"],
        ["west", "hedgeWest"],
        ["east", "hedgeEast"],
        ["hedgeWest", "balcony", [[8, 11]]],
        ["hedgeEast", "balcony", [[34, 11]]],
        ["west", "alcove", [[3, 25]]],
        ["east", "arbor", [[39, 25]]]
      ]
    },
    {
      act: 3,
      id: "suspended-spans",
      terrain: "허공 널다리",
      biome: "aerial",
      width: 35,
      height: 49,
      rotation: 1,
      gate: [17, 7],
      approach: "summit",
      passage: 1,
      rooms: [
        ["entry", 7, 44, 3, 2, "entry"],
        ["isleSouth", 25, 39, 3, 2, "battle"],
        ["isleWest", 8, 31, 3, 2, "elite"],
        ["isleEast", 25, 22, 3, 2, "elite"],
        ["spur", 29, 31, 2, 2, "optional"],
        ["ledge", 5, 18, 2, 2, "optional"],
        ["summit", 17, 11, 3, 2, "battle"],
        ["boss", 17, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "isleSouth", [[7, 39]]],
        ["isleSouth", "isleWest", [[25, 31]]],
        ["isleWest", "isleEast", [[8, 22]]],
        ["isleEast", "summit", [[25, 11]]],
        ["isleWest", "spur"],
        ["isleEast", "ledge", [[5, 22]]]
      ]
    },
    {
      act: 4,
      id: "braided-maze",
      terrain: "책장 미궁",
      biome: "maze",
      width: 47,
      height: 39,
      rotation: 3,
      gate: [23, 7],
      approach: "threshold",
      rooms: [
        ["entry", 23, 35, 2, 2, "entry"],
        ["cross", 23, 28, 2, 2, "battle"],
        ["westLow", 8, 28, 2, 2, "battle"],
        ["eastLow", 38, 28, 2, 2, "battle"],
        ["westHigh", 8, 16, 2, 2, "elite"],
        ["eastHigh", 38, 16, 2, 2, "elite"],
        ["center", 23, 21, 2, 2, "battle"],
        ["blindWest", 3, 21, 1, 1, "optional"],
        ["blindEast", 43, 21, 1, 1, "optional"],
        ["threshold", 23, 11, 2, 2, "battle"],
        ["boss", 23, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "cross"],
        ["cross", "westLow"],
        ["cross", "eastLow"],
        ["westLow", "westHigh"],
        ["eastLow", "eastHigh"],
        ["westHigh", "center", [[16, 16], [16, 21]]],
        ["eastHigh", "center", [[30, 16], [30, 21]]],
        ["center", "cross"],
        ["center", "threshold"],
        ["westLow", "blindWest", [[3, 28]]],
        ["eastLow", "blindEast", [[43, 28]]]
      ]
    },
    {
      act: 5,
      id: "silent-nave",
      terrain: "검은 물 신전",
      biome: "sanctum",
      width: 35,
      height: 43,
      rotation: 0,
      gate: [17, 7],
      approach: "altar",
      rooms: [
        ["entry", 17, 39, 2, 2, "entry"],
        ["naveSouth", 17, 32, 3, 3, "battle"],
        ["naveNorth", 17, 20, 3, 3, "battle"],
        ["choir", 6, 30, 3, 3, "elite"],
        ["vestry", 28, 18, 3, 3, "elite"],
        ["crypt", 5, 12, 2, 2, "optional"],
        ["archive", 29, 33, 2, 2, "optional"],
        ["altar", 17, 11, 3, 2, "battle"],
        ["boss", 17, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "naveSouth"],
        ["naveSouth", "naveNorth"],
        ["naveNorth", "altar"],
        ["naveSouth", "choir", [[6, 32]]],
        ["naveNorth", "vestry", [[28, 20]]],
        ["choir", "crypt", [[6, 12]]],
        ["naveSouth", "archive", [[29, 32]]]
      ]
    },
    {
      act: 6,
      id: "broken-courtyard",
      terrain: "무너진 중정",
      biome: "ruins",
      width: 43,
      height: 35,
      rotation: 0,
      gate: [21, 7],
      approach: "balcony",
      rooms: [
        ["entry", 21, 31, 2, 2, "entry"],
        ["south", 21, 25, 4, 2, "battle"],
        ["west", 8, 25, 3, 2, "battle"],
        ["east", 34, 25, 3, 2, "elite"],
        ["hedgeWest", 8, 14, 3, 3, "elite"],
        ["hedgeEast", 34, 14, 3, 3, "optional"],
        ["breach", 21, 19, 3, 2, "battle"],
        ["collapse", 3, 20, 1, 2, "optional"],
        ["balcony", 21, 11, 4, 2, "battle"],
        ["boss", 21, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "south"],
        ["south", "west"],
        ["west", "hedgeWest"],
        ["west", "collapse", [[3, 25]]],
        ["south", "breach"],
        ["breach", "east", [[34, 19]]],
        ["breach", "hedgeEast", [[34, 19]]],
        ["breach", "balcony"],
        ["hedgeWest", "balcony", [[8, 11]]]
      ]
    },
    {
      act: 7,
      id: "hollow-spiral",
      terrain: "줄기 속 나선",
      biome: "trunk",
      width: 45,
      height: 45,
      rotation: 2,
      gate: [22, 7],
      approach: "heart",
      rooms: [
        ["entry", 5, 40, 2, 2, "entry"],
        ["rimSouth", 38, 39, 3, 2, "battle"],
        ["rimEast", 38, 13, 3, 3, "elite"],
        ["rimNorth", 7, 13, 3, 3, "battle"],
        ["innerWest", 7, 30, 2, 2, "elite"],
        ["innerSouth", 25, 30, 3, 2, "battle"],
        ["innerEast", 25, 20, 2, 2, "battle"],
        ["deadwood", 15, 6, 2, 2, "optional"],
        ["hollow", 15, 23, 2, 2, "optional"],
        ["heart", 22, 11, 2, 2, "battle"],
        ["boss", 22, 4, 3, 2, "boss"]
      ],
      links: [
        ["entry", "rimSouth", [[5, 39]]],
        ["rimSouth", "rimEast"],
        ["rimEast", "rimNorth"],
        ["rimNorth", "innerWest"],
        ["innerWest", "innerSouth"],
        ["innerSouth", "innerEast"],
        ["innerEast", "heart", [[25, 11]]],
        ["innerWest", "hollow", [[15, 30]]],
        ["rimNorth", "deadwood", [[15, 13]]]
      ]
    },
    {
      act: 8,
      id: "offset-veils",
      terrain: "보라 장막 섬",
      biome: "veil",
      width: 49,
      height: 39,
      rotation: 1,
      gate: [24, 7],
      approach: "veilEnd",
      rooms: [
        ["entry", 5, 30, 2, 2, "entry"],
        ["southEast", 42, 29, 3, 2, "battle"],
        ["middleEast", 42, 20, 3, 2, "elite"],
        ["middleWest", 13, 20, 3, 2, "battle"],
        ["northWest", 13, 11, 3, 2, "elite"],
        ["veilEnd", 24, 11, 2, 2, "battle"],
        ["foldSouth", 25, 35, 2, 2, "optional"],
        ["foldNorth", 42, 11, 3, 2, "optional"],
        ["boss", 24, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "southEast", [[5, 29]]],
        ["southEast", "middleEast"],
        ["middleEast", "middleWest"],
        ["middleWest", "northWest"],
        ["northWest", "veilEnd"],
        ["middleWest", "foldSouth", [[25, 20]]],
        ["middleEast", "foldNorth"]
      ]
    },
    {
      act: 9,
      id: "three-confluences",
      terrain: "꽃덤불 교차로",
      biome: "canopy",
      width: 53,
      height: 37,
      rotation: 0,
      gate: [26, 7],
      approach: "cocoon",
      rooms: [
        ["entry", 26, 33, 3, 2, "entry"],
        ["fork", 26, 27, 3, 2, "battle"],
        ["west", 7, 25, 3, 3, "elite"],
        ["east", 45, 25, 3, 3, "elite"],
        ["center", 26, 19, 4, 3, "battle"],
        ["westHigh", 7, 13, 3, 2, "battle"],
        ["eastHigh", 45, 13, 3, 2, "battle"],
        ["sapWest", 16, 32, 2, 2, "optional"],
        ["sapEast", 36, 32, 2, 2, "optional"],
        ["cocoon", 26, 11, 4, 2, "battle"],
        ["boss", 26, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "fork"],
        ["fork", "west", [[7, 27]]],
        ["fork", "east", [[45, 27]]],
        ["fork", "center"],
        ["west", "westHigh"],
        ["east", "eastHigh"],
        ["westHigh", "cocoon", [[7, 11]]],
        ["eastHigh", "cocoon", [[45, 11]]],
        ["center", "cocoon"],
        ["west", "sapWest", [[16, 25]]],
        ["east", "sapEast", [[36, 25]]]
      ]
    },
    {
      act: 10,
      id: "crown-wheel",
      terrain: "별빛 차륜",
      biome: "crown",
      width: 49,
      height: 43,
      rotation: 0,
      gate: [24, 7],
      approach: "axis",
      rooms: [
        ["entry", 24, 39, 2, 2, "entry"],
        ["south", 24, 33, 3, 2, "battle"],
        ["southWest", 9, 31, 3, 2, "battle"],
        ["southEast", 39, 31, 3, 2, "battle"],
        ["west", 6, 20, 3, 3, "elite"],
        ["east", 42, 20, 3, 3, "elite"],
        ["northWest", 12, 11, 3, 2, "battle"],
        ["northEast", 36, 11, 3, 2, "battle"],
        ["innerWest", 17, 23, 2, 2, "optional"],
        ["innerEast", 31, 23, 2, 2, "optional"],
        ["axis", 24, 11, 3, 2, "battle"],
        ["boss", 24, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "south"],
        ["south", "southWest", [[9, 33]]],
        ["south", "southEast", [[39, 33]]],
        ["southWest", "west", [[6, 31]]],
        ["southEast", "east", [[42, 31]]],
        ["west", "northWest", [[6, 11]]],
        ["east", "northEast", [[42, 11]]],
        ["northWest", "axis"],
        ["northEast", "axis"],
        ["south", "innerWest", [[17, 33]]],
        ["south", "innerEast", [[31, 33]]]
      ]
    }
  ]);
  var CONTENT_EXPLORATION_MAPS = Object.freeze([
    {
      id: "trial-blades",
      look: "trial-blades",
      terrain: "칼날 회랑",
      biome: "sanctum",
      width: 31,
      height: 47,
      rotation: 0,
      gate: [15, 7],
      approach: "antechamber",
      rooms: [
        ["entry", 15, 43, 2, 2, "entry"],
        ["hallLow", 15, 36, 4, 2, "battle"],
        ["hallMid", 15, 29, 4, 2, "battle"],
        ["alcoveWest", 5, 29, 2, 2, "elite"],
        ["hallHigh", 15, 22, 4, 2, "battle"],
        ["alcoveEast", 25, 22, 2, 2, "elite"],
        ["armory", 5, 15, 2, 2, "optional"],
        ["antechamber", 15, 11, 3, 2, "battle"],
        ["boss", 15, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "hallLow"],
        ["hallLow", "hallMid"],
        ["hallMid", "alcoveWest"],
        ["hallMid", "hallHigh"],
        ["hallHigh", "alcoveEast"],
        ["hallHigh", "antechamber"],
        ["hallHigh", "armory", [[5, 22]]]
      ]
    },
    {
      id: "trial-triad",
      look: "trial-triad",
      terrain: "삼원 제단",
      biome: "sanctum",
      width: 45,
      height: 39,
      rotation: 0,
      gate: [22, 7],
      approach: "sanctum",
      rooms: [
        ["entry", 22, 35, 2, 2, "entry"],
        ["court", 22, 28, 4, 2, "battle"],
        ["hub", 22, 20, 3, 3, "battle"],
        ["fireShrine", 8, 20, 3, 3, "elite"],
        ["coldShrine", 36, 20, 3, 3, "elite"],
        ["fireVault", 8, 31, 2, 2, "optional"],
        ["coldVault", 36, 31, 2, 2, "optional"],
        ["sanctum", 22, 11, 4, 2, "battle"],
        ["boss", 22, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "court"],
        ["court", "hub"],
        ["hub", "fireShrine"],
        ["hub", "coldShrine"],
        ["fireShrine", "fireVault"],
        ["coldShrine", "coldVault"],
        ["hub", "sanctum"],
        ["fireShrine", "sanctum", [[8, 11]]],
        ["coldShrine", "sanctum", [[36, 11]]]
      ]
    },
    {
      id: "trial-miasma",
      look: "trial-miasma",
      terrain: "독무 정원",
      biome: "canopy",
      width: 41,
      height: 41,
      rotation: 0,
      gate: [20, 7],
      approach: "arbor",
      rooms: [
        ["entry", 20, 37, 2, 2, "entry"],
        ["gardenSouth", 20, 30, 4, 2, "battle"],
        ["poolWest", 8, 26, 3, 3, "battle"],
        ["poolEast", 32, 26, 3, 3, "battle"],
        ["thornWest", 8, 15, 3, 2, "elite"],
        ["thornEast", 32, 15, 3, 2, "elite"],
        ["spring", 20, 21, 2, 2, "optional"],
        ["arbor", 20, 11, 3, 2, "battle"],
        ["boss", 20, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "gardenSouth"],
        ["gardenSouth", "poolWest", [[8, 30]]],
        ["gardenSouth", "poolEast", [[32, 30]]],
        ["poolWest", "thornWest"],
        ["poolEast", "thornEast"],
        ["thornWest", "arbor", [[8, 11]]],
        ["thornEast", "arbor", [[32, 11]]],
        ["gardenSouth", "spring"]
      ]
    },
    {
      id: "trial-crossing",
      look: "trial-crossing",
      terrain: "십자 회랑",
      biome: "maze",
      width: 45,
      height: 45,
      rotation: 0,
      gate: [22, 7],
      approach: "apex",
      rooms: [
        ["entry", 22, 41, 2, 2, "entry"],
        ["crossSouth", 22, 33, 2, 2, "battle"],
        ["heart", 22, 24, 3, 3, "elite"],
        ["crossWest", 9, 24, 2, 2, "battle"],
        ["crossEast", 35, 24, 2, 2, "battle"],
        ["northWest", 9, 14, 2, 2, "elite"],
        ["northEast", 35, 14, 2, 2, "battle"],
        ["bloodWell", 3, 33, 1, 1, "optional"],
        ["voidWell", 41, 33, 1, 1, "optional"],
        ["apex", 22, 11, 3, 2, "battle"],
        ["boss", 22, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "crossSouth"],
        ["crossSouth", "heart"],
        ["heart", "crossWest"],
        ["heart", "crossEast"],
        ["crossWest", "northWest"],
        ["crossEast", "northEast"],
        ["northWest", "apex", [[9, 11]]],
        ["northEast", "apex", [[35, 11]]],
        ["heart", "apex"],
        ["crossSouth", "bloodWell"],
        ["crossSouth", "voidWell"],
        ["crossWest", "crossSouth", [[9, 33]]]
      ]
    },
    {
      id: "trial-winter",
      look: "trial-winter",
      terrain: "혹한 미궁",
      biome: "veil",
      width: 49,
      height: 41,
      rotation: 0,
      gate: [24, 7],
      approach: "frostGate",
      rooms: [
        ["entry", 6, 37, 2, 2, "entry"],
        ["driftSouth", 24, 36, 3, 2, "battle"],
        ["driftEast", 42, 33, 3, 2, "battle"],
        ["icefall", 42, 22, 3, 3, "elite"],
        ["hollow", 24, 25, 3, 2, "battle"],
        ["frozenPool", 6, 25, 2, 2, "elite"],
        ["cairn", 6, 14, 3, 2, "battle"],
        ["glacier", 42, 12, 3, 2, "optional"],
        ["frostGate", 24, 11, 3, 2, "battle"],
        ["boss", 24, 4, 4, 2, "boss"]
      ],
      links: [
        ["entry", "driftSouth", [[6, 36]]],
        ["driftSouth", "driftEast", [[42, 36]]],
        ["driftEast", "icefall"],
        ["icefall", "hollow", [[24, 22]]],
        ["hollow", "frozenPool", [[6, 25]]],
        ["frozenPool", "cairn"],
        ["cairn", "frostGate", [[6, 11]]],
        ["icefall", "glacier"]
      ]
    }
  ]);
  var ACT_EXPLORATION_BACKDROPS = (() => {
    const GATE_OFFSETS = [[-22, -28], [-10, -42], [-22, -44], [-10, -42]];
    const view = (act, rotation) => Object.freeze({
      map: `assets/exploration/act${act}-r${rotation}-map.png`,
      gate: `assets/exploration/act${act}-r${rotation}-gate.png`,
      gateOffset: Object.freeze(GATE_OFFSETS[rotation])
    });
    const entry = (act, shade) => Object.freeze({ shade: Object.freeze(shade), views: Object.freeze(GATE_OFFSETS.map((_, rotation) => view(act, rotation))) });
    const named = (id, shade) => Object.freeze({ shade: Object.freeze(shade), views: Object.freeze(GATE_OFFSETS.map((offset, rotation) => Object.freeze({
      map: `assets/exploration/${id}-r${rotation}-map.png`,
      gate: `assets/exploration/${id}-r${rotation}-gate.png`,
      gateOffset: Object.freeze(offset)
    }))) });
    return Object.freeze({
      "root-branches": entry(1, [20, 16, 24]),
      "garden-circuit": entry(2, [14, 18, 21]),
      "suspended-spans": entry(3, [7, 8, 13]),
      "braided-maze": entry(4, [18, 11, 13]),
      "silent-nave": entry(5, [17, 13, 12]),
      "broken-courtyard": entry(6, [16, 13, 11]),
      "hollow-spiral": entry(7, [18, 12, 8]),
      "offset-veils": entry(8, [10, 8, 16]),
      "three-confluences": entry(9, [18, 11, 16]),
      "crown-wheel": entry(10, [5, 5, 11]),
      "trial-blades": named("trial-blades", [13, 14, 18]),
      "trial-triad": named("trial-triad", [18, 14, 10]),
      "trial-miasma": named("trial-miasma", [10, 14, 11]),
      "trial-crossing": named("trial-crossing", [17, 10, 12]),
      "trial-winter": named("trial-winter", [10, 13, 20])
    });
  })();
  var ACT_EXPLORATION_ART_VERSION = "20261004d";
  var ACT_EXPLORATION_VISION = Object.freeze({ radius: 6, engageRadius: 5, splashReach: 12, sightBonusMax: 3 });
  var ACT_EXPLORATION_ALERT = Object.freeze({ fromLoop: 2, chance: 0.2, hearReach: 12, outline: "#ff6f59", prefix: "경계하는", markMs: 1200 });
  var ACT_EXPLORATION_AMBUSH = Object.freeze({ chance: 0.05, pull: 0.4, keep: 2, search: 3, windUp: 0.9, outline: "#ff3d5a" });
  var ACT_EXPLORATION_WAVES = Object.freeze({ chance: 0.3, counts: Object.freeze([[1, 5], [2, 3], [3, 2]]), delayMs: 1500 });
  var ACT_EXPLORATION_INCIDENTS = Object.freeze({
    critter: Object.freeze({
      chance: 0.012,
      look: "act1-slime",
      name: "금빛 수액 슬라임",
      glaze: Object.freeze({ color: "#ffcf4a", alpha: 0.36 }),
      outline: "#fff0a8",
      hpMul: 2.5,
      expMul: 3,
      fleeMs: 13e3,
      stepSec: 0.42,
      rewards: Object.freeze({ picks: 4, gear: "rare", currencies: Object.freeze([
        ["magicBud", 3, 5],
        ["sapBud", 1, 3],
        ["formlessDew", 1, 2],
        ["blessing", 1, 1],
        ["deepWhetstone", 1, 1],
        ["rootIron", 1, 1],
        ["jewelPolish", 1, 1]
      ]) }),
      rainbow: Object.freeze({
        chance: 0.02,
        name: "무지갯빛 수액 슬라임",
        glazes: Object.freeze(["#ff8f8f", "#ffc46b", "#fff27a", "#8af08a", "#7ad0ff", "#c79bff"]),
        everyMs: 220,
        alpha: 0.42,
        currency: "goldenRule",
        chaseShare: 0.5
      })
    }),
    stray: Object.freeze({ chance: 0.02, prefix: "길 잃은", outline: "#9be0a4", expMul: 2, gear: "magic" }),
    sleep: Object.freeze({ chance: 0.03, prefix: "잠든", outline: "#a9b8ff", zColor: "#d4dcff", zEveryMs: 1700, wakeCells: 2, groggyMs: 1500 }),
    feast: Object.freeze({ chance: 4e-4 }),
    star: Object.freeze({
      chance: 0.015,
      fallMs: 520,
      burstMs: 680,
      rewards: Object.freeze([["magicBud", 3], ["sapBud", 1], ["formlessDew", 1], ["blessing", 1]]),
      // 유성우(숨은 사건): 별 하나 대신 count개가 한꺼번에, 그 가운데 하나는 황금률(golden, 떨어질 수 있을 때).
      shower: Object.freeze({ chance: 6e-4, count: 7, golden: Object.freeze(["goldenRule", 1]) })
    }),
    breath: Object.freeze({ chance: 0.012, seconds: 30, kinds: Object.freeze([
      Object.freeze({ key: "wind", name: "바람의 숨결", text: "이동 속도 +30%, 공격 속도 +15%", stats: Object.freeze([["move", 30], ["aspd", 15]]) }),
      Object.freeze({ key: "ember", name: "불씨의 숨결", text: "피해 +40%", stats: Object.freeze([["pctDmg", 40]]) }),
      Object.freeze({ key: "ring", name: "나이테의 숨결", text: "받는 물리 피해 감소 +10%, 모든 원소 저항 +15%", stats: Object.freeze([["dr", 10], ["resAll", 15]]) })
    ]) }),
    challenge: Object.freeze({
      chance: 0.012,
      seconds: 20,
      marks: Object.freeze([10, 5, 3]),
      picks: 3,
      rewards: Object.freeze([["magicBud", 2], ["sapBud", 1], ["formlessDew", 1], ["blessing", 1]])
    }),
    yawn: Object.freeze({ chance: 4e-4, sleepMs: 6e3 }),
    lucky: Object.freeze({ min: 777, gapMs: 3e4, kill: 7777, rewards: Object.freeze([["magicBud", 3], ["sapBud", 1], ["formlessDew", 2], ["goldenRule", 1], ["fairyRing", 1]]) }),
    records: Object.freeze([
      ["critter", "금빛 수액 슬라임", false],
      ["stray", "길 잃은 몬스터", false],
      ["sleep", "잠든 무리", false],
      ["star", "별똥별", false],
      ["challenge", "사냥 도전", false],
      ["breath", "세계수의 숨결", false],
      ["rainbow", "무지갯빛 수액 슬라임", true],
      ["feast", "황금 수액 잔치", true],
      ["yawn", "세계수의 하품", true],
      ["lucky", "행운의 숫자", true],
      ["shower", "유성우", true],
      ["luckyKill", "루프의 7,777번째 처치", true]
    ].map((row) => Object.freeze(row)))
  });
  var GROUND_LOOT_DROP = Object.freeze({ flightMs: 300, flightSpreadMs: 60, nameMs: 120, readyMs: 520, gapMs: 140, queueCapMs: 3e3 });

  // modules/data/act-exploration-maps.mjs:classic
  Object.assign(globalThis, { ACT_EXPLORATION_MAPS, CONTENT_EXPLORATION_MAPS, ACT_EXPLORATION_BACKDROPS, ACT_EXPLORATION_ART_VERSION, ACT_EXPLORATION_VISION, ACT_EXPLORATION_ALERT, ACT_EXPLORATION_AMBUSH, ACT_EXPLORATION_WAVES, ACT_EXPLORATION_INCIDENTS, GROUND_LOOT_DROP });
  if (typeof safeExposeData === "function") safeExposeData({ ACT_EXPLORATION_MAPS, CONTENT_EXPLORATION_MAPS, ACT_EXPLORATION_BACKDROPS, ACT_EXPLORATION_ART_VERSION, ACT_EXPLORATION_VISION, ACT_EXPLORATION_ALERT, ACT_EXPLORATION_AMBUSH, ACT_EXPLORATION_WAVES, ACT_EXPLORATION_INCIDENTS, GROUND_LOOT_DROP });
})();
