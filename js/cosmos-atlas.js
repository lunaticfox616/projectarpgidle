// GENERATED from modules/cosmos-atlas*.mjs. Edit the ESM sources; run npm run build:modules.
(() => {
  // modules/data/cosmos-route.mjs
  var COSMOS_ROUTE_G1 = Object.freeze({
    version: 4,
    retryMs: 3e4,
    start: "planet-0",
    boss: "planet-46",
    requiredClears: 15,
    lengths: Object.freeze([8, 8, 8, 2]),
    habitatByNode: Object.freeze({
      "planet-0": "swarm",
      "planet-1": "guard",
      "planet-6": "storm",
      "planet-11": "swarm",
      "planet-16": "guard",
      "planet-21": "storm",
      "planet-26": "swarm",
      "planet-31": "guard",
      "planet-36": "storm",
      "planet-41": "guard",
      "planet-46": "guard",
      "asteroid-32": "swarm",
      "asteroid-60": "storm",
      "asteroid-81": "swarm",
      "asteroid-111": "guard",
      "asteroid-115": "storm",
      "asteroid-127": "swarm",
      "asteroid-132": "guard",
      "asteroid-140": "storm",
      "asteroid-155": "swarm",
      "asteroid-156": "guard",
      "asteroid-164": "storm",
      "asteroid-166": "swarm",
      "asteroid-168": "guard",
      "asteroid-170": "storm",
      "asteroid-181": "swarm"
    }),
    habitats: Object.freeze({
      swarm: Object.freeze({ name: "군집", markerCount: 3, minPack: 7, maxPack: 8, eliteChance: 0.06, bossAdds: 0, hp: 0.55, damage: 0.5, speed: 1, trait: null }),
      guard: Object.freeze({ name: "수호", markerCount: 6, minPack: 1, maxPack: 2, eliteChance: 0.8, bossAdds: 0, hp: 1.5, damage: 1, speed: 0.85, escortAttackSpeed: 0.3, trait: "energyShield" }),
      storm: Object.freeze({ name: "폭풍", markerCount: 4, minPack: 3, maxPack: 4, eliteChance: 0.25, bossAdds: 0, hp: 0.85, damage: 0.65, speed: 1.55, trait: null, element: "light" })
    }),
    planets: Object.freeze([1, 6, 11, 16, 21, 26, 31, 36, 41].map((n) => `planet-${n}`)),
    asteroids: Object.freeze([32, 60, 81, 111, 115, 127, 132, 140, 155, 156, 164, 166, 168, 170, 181].map((n) => `asteroid-${n}`)),
    choices: Object.freeze({ 1: ["survey", "salvage"], 3: ["survey", "rift"] })
  });
  var COSMOS_ROUTE_GALAXIES = Object.freeze((() => {
    const asteroids = [32, 60, 81, 111, 115, 127, 132, 140, 155, 156, 164, 166, 168, 170, 181, 183, 195, 198, 204, 208, 211, 214, 227, 234, 241, 261, 264, 291, 299, 308, 331, 343, 349, 358, 365, 394, 406, 430, 431, 442, 463, 477, 486, 511, 533, 550, 554, 599, 681, 693, 702, 715, 726, 737, 756, 757, 761, 767, 769, 778, 781, 786, 800, 813, 824, 843, 866, 886, 900, 944, 947, 964, 969, 985, 1e3];
    const bosses = [46, 47, 48, 49, 45];
    return Object.fromEntries([1, 2, 3, 4, 5].map((galaxy) => {
      const planets = Array.from({ length: 50 }, (_, i) => i).filter((i) => i > 0 && (i - 1) % 5 + 1 === galaxy).map((i) => "planet-" + i);
      const rocks = asteroids.slice((galaxy - 1) * 15, galaxy * 15).map((i) => "asteroid-" + i);
      const start = galaxy === 1 ? "planet-0" : planets[0], boss = "planet-" + bosses[galaxy - 1];
      const middle = planets.filter((id) => id !== start && id !== boss).concat(rocks);
      const total = middle.length + 2, count = total - 2;
      const lengths = [0, 1, 2].map((i) => Math.floor(count / 3) + (i < count % 3 ? 1 : 0)).concat(2);
      return [galaxy, Object.freeze({ galaxy, start, boss, middle: Object.freeze(middle), asteroids: Object.freeze(rocks), lengths: Object.freeze(lengths), total })];
    }));
  })());

  // modules/data/cosmos-atlas.mjs
  var COSMOS_ASTEROID_NUMBERS = Object.values(COSMOS_ROUTE_GALAXIES).flatMap((route) => route.asteroids.map((id) => Number(id.split("-")[1])));
  var COSMOS_LAYOUT_VERSION = 20260811;
  var DEFAULT_COSMOS_CAMERA_SCALE = 0.56;
  var GALAXY_SEQUENCE = [1, 2, 3, 4, 5];
  var PLANETS_PER_GALAXY = 10;
  var ASTEROIDS_PER_GALAXY = 15;
  var NODES_PER_GALAXY = PLANETS_PER_GALAXY + ASTEROIDS_PER_GALAXY;
  var GALAXY_BOSS_REQUIRED_CLEARS = COSMOS_ROUTE_G1.requiredClears;
  var GALAXY_BOSS_PLANET_INDEX = Object.fromEntries(Object.entries(COSMOS_ROUTE_GALAXIES).map(([id, route]) => [id, Number(route.boss.split("-")[1])]));
  var COSMOS_CAPSTONE_BOSS_IDS = Object.freeze(
    GALAXY_SEQUENCE.map((galaxy) => `planet-${GALAXY_BOSS_PLANET_INDEX[galaxy]}`)
  );
  var COSMOS_BOSS_EQUIPMENT_DROP_CHANCE = 0.012;
  var COSMOS_BOSS_JEWEL_DROP_CHANCE = 5e-3;
  var COSMOS_BOSS_TALISMAN_DROP_CHANCE = 5e-3;
  var COSMOS_STONE_TIER_FLOORS = [1, 6, 11, 16, 21, 25];
  var COSMOS_MASTERY_NODES = [
    { key: "planetRelief", name: "행성 패널티 완화", max: 30, cost: 1, desc: "10레벨마다 행성 전투 위협 티어 -1 (최대 -3, 위협 티어 완화는 모두 합쳐 -8까지)" },
    { key: "asteroidRelief", name: "소행성 수확 증폭", max: 24, cost: 1, desc: "소행성 클리어 보상 +1.6% (최대 38.4%)" },
    { key: "combatFocus", name: "전투 파밍 집중", max: 24, cost: 1, desc: "행성 클리어 보상 +1.0% (최대 24%)" },
    { key: "craftFocus", name: "제작 파밍 집중", max: 24, cost: 1, desc: "소행성 클리어 보상 +1.0% (최대 24%)" },
    { key: "stardustGain", name: "탐사 보상 증폭", max: 30, cost: 1, desc: "우주계 탐사 보상 +1.0% (최대 30%)" },
    { key: "challengeEase", name: "행성 난이도 완화", max: 22, cost: 1, desc: "4레벨마다 우주계 전투 위협 티어 -1 (최대 -5, 위협 티어 완화는 모두 합쳐 -8까지)" },
    { key: "highRisk", name: "고위험 난이도", max: 20, cost: 1, desc: "4레벨마다 위협 티어 +1, 보상 +2.2% (최대 +44%)" },
    { key: "bossBounty", name: "보스 보상 강화", max: 18, cost: 1, desc: "은하 보스 보상 +2.2% (최대 +39.6%)" },
    { key: "routeInsight", name: "별길 통찰", max: 28, cost: 1, desc: "7레벨마다 우주계 전투 위협 티어 -1 (최대 -4, 위협 티어 완화는 모두 합쳐 -8까지)" },
    { key: "gravityHarness", name: "중력 제어", max: 22, cost: 1, desc: "중력 페널티 완화 +1.0% (최대 22%)" },
    { key: "warpEfficiency", name: "항성 추진", max: 20, cost: 1, desc: "모든 우주계 클리어 보상 +1.0% (최대 20%)" },
    { key: "eliteHunt", name: "유물 감응", max: 20, cost: 1, desc: "보스 유물 드랍 확률 +0.7%p (최대 +14%p)" },
    { key: "resonanceDrive", name: "공명 구동", max: 22, cost: 1, desc: "우주계 전투 최종 피해 +0.6% (최대 13.2%)" },
    { key: "voidSurvey", name: "공허 측량", max: 20, cost: 1, desc: "8레벨마다 소행성 전투 위협 티어 -1 (최대 -2, 위협 티어 완화는 모두 합쳐 -8까지)" },
    { key: "stellarForge", name: "항성 단조", max: 26, cost: 1, desc: "소행성 클리어 보상 +0.9% (최대 23.4%)" },
    { key: "echoCache", name: "에코 저장고", max: 20, cost: 1, desc: "탐사 완료 보상 +1.0% (최대 20%)" },
    { key: "riftGuard", name: "균열 방벽", max: 20, cost: 1, desc: "우주계 받는 피해 완화 +0.7% (최대 14%)" },
    { key: "frontierTax", name: "개척자 세공", max: 18, cost: 1, desc: "깊은 궤도(4~5) 보상 +1.3% (최대 23.4%)" },
    { key: "chainMastery", name: "초회 정복 보너스", max: 18, cost: 1, desc: "미클리어 노드 첫 완료 보상 +2.0% (최대 36%)" },
    { key: "apexProtocol", name: "은하 핵 반응", max: 22, cost: 1, desc: "보스 처치 보상 +1.8% (최대 39.6%)" },
    { key: "starbreaker", name: "성핵 분쇄", max: 12, cost: 1, desc: "보스 전투 피해 +1.8% (최대 21.6%)" }
  ];
  var COSMOS_MASTERY_LINKS = {
    planetRelief: [],
    asteroidRelief: ["planetRelief:6"],
    combatFocus: ["planetRelief:8"],
    craftFocus: ["asteroidRelief:8"],
    stardustGain: ["combatFocus:8", "craftFocus:8"],
    challengeEase: ["planetRelief:12"],
    highRisk: ["challengeEase:8", "stardustGain:10"],
    bossBounty: ["highRisk:6"],
    routeInsight: ["planetRelief:10"],
    gravityHarness: ["routeInsight:8"],
    warpEfficiency: ["routeInsight:10"],
    eliteHunt: ["combatFocus:10"],
    resonanceDrive: ["combatFocus:12", "gravityHarness:10"],
    voidSurvey: ["asteroidRelief:10"],
    stellarForge: ["craftFocus:10", "voidSurvey:8"],
    echoCache: ["stardustGain:10"],
    riftGuard: ["challengeEase:10", "gravityHarness:10"],
    frontierTax: ["warpEfficiency:8", "voidSurvey:10"],
    chainMastery: ["routeInsight:12", "echoCache:8"],
    apexProtocol: ["bossBounty:8", "riftGuard:8"],
    starbreaker: ["apexProtocol:10", "resonanceDrive:10"]
  };
  var GALAXY_SPECS = {
    0: { x: 0, y: 0, r: 180, angle: 0, accent: "#f8e7a0", label: "G0 중심핵" },
    1: { x: 0, y: -760, r: 390, angle: -Math.PI / 2, accent: "#82d8ff", label: "G1 관문권" },
    2: { x: 1110, y: -360, r: 410, angle: -Math.PI / 6, accent: "#b38cff", label: "G2 북동은하" },
    3: { x: -1110, y: -360, r: 410, angle: -Math.PI * 5 / 6, accent: "#7cf2c8", label: "G3 북서은하" },
    4: { x: 900, y: 820, r: 430, angle: Math.PI / 4, accent: "#ffb36e", label: "G4 남동은하" },
    5: { x: -900, y: 820, r: 430, angle: Math.PI * 3 / 4, accent: "#ff80bc", label: "G5 남서은하" }
  };

  // modules/data/cosmos-atlas-planets.mjs
  var COSMOS_PLANETS = [
    {
      "name": "시리온",
      "source": "Sirius",
      "theme": "우주계 관문 / 백색성",
      "orbit": 0,
      "tag": "gateway"
    },
    {
      "name": "베가라",
      "source": "Vega",
      "theme": "별빛 수정 / 마력",
      "orbit": 1,
      "tag": "arcane"
    },
    {
      "name": "리겔룸",
      "source": "Rigel",
      "theme": "냉기 거성 / 동결",
      "orbit": 1,
      "tag": "cold"
    },
    {
      "name": "베텔기아",
      "source": "Betelgeuse",
      "theme": "붉은 초거성 / 화염 폭발",
      "orbit": 1,
      "tag": "fire"
    },
    {
      "name": "알데바란트",
      "source": "Aldebaran",
      "theme": "추적자 / 사냥",
      "orbit": 1,
      "tag": "hunt"
    },
    {
      "name": "안타리온",
      "source": "Antares",
      "theme": "붉은 독성 / 출혈",
      "orbit": 1,
      "tag": "venom"
    },
    {
      "name": "카노푸스",
      "source": "Canopus",
      "theme": "고대 항해성 / 유물",
      "orbit": 2,
      "tag": "relic"
    },
    {
      "name": "아크투라",
      "source": "Arcturus",
      "theme": "수호자 / 방어",
      "orbit": 2,
      "tag": "guard"
    },
    {
      "name": "알타이르",
      "source": "Altair",
      "theme": "고속 궤도 / 회피",
      "orbit": 2,
      "tag": "speed"
    },
    {
      "name": "데네브라",
      "source": "Deneb",
      "theme": "백조자리 / 투사체",
      "orbit": 2,
      "tag": "projectile"
    },
    {
      "name": "폴라리스",
      "source": "Polaris",
      "theme": "길잡이 / 지도",
      "orbit": 2,
      "tag": "map"
    },
    {
      "name": "스피카르",
      "source": "Spica",
      "theme": "수확 / 씨앗",
      "orbit": 2,
      "tag": "seed"
    },
    {
      "name": "레굴론",
      "source": "Regulus",
      "theme": "왕성 / 보스",
      "orbit": 2,
      "tag": "boss"
    },
    {
      "name": "포말하우트",
      "source": "Fomalhaut",
      "theme": "심해 우주 / 보호막",
      "orbit": 2,
      "tag": "shield"
    },
    {
      "name": "프로키온",
      "source": "Procyon",
      "theme": "선행자 / 루프 가속",
      "orbit": 2,
      "tag": "loop"
    },
    {
      "name": "카펠리아",
      "source": "Capella",
      "theme": "황금빛 / 재화",
      "orbit": 3,
      "tag": "wealth"
    },
    {
      "name": "카스토라",
      "source": "Castor",
      "theme": "쌍둥이 / 분신",
      "orbit": 3,
      "tag": "mirror"
    },
    {
      "name": "폴룩시아",
      "source": "Pollux",
      "theme": "쌍둥이 / 생명력",
      "orbit": 3,
      "tag": "vital"
    },
    {
      "name": "벨라트릭스",
      "source": "Bellatrix",
      "theme": "전사성 / 치명타",
      "orbit": 3,
      "tag": "crit"
    },
    {
      "name": "알닐람",
      "source": "Alnilam",
      "theme": "오리온 허리띠 / 중심선",
      "orbit": 3,
      "tag": "belt"
    },
    {
      "name": "민타카르",
      "source": "Mintaka",
      "theme": "차원문 / 관문",
      "orbit": 3,
      "tag": "gate"
    },
    {
      "name": "알니타크",
      "source": "Alnitak",
      "theme": "사슬 / 결박",
      "orbit": 3,
      "tag": "bind"
    },
    {
      "name": "미라크라",
      "source": "Mirach",
      "theme": "거울빛 / 반사",
      "orbit": 3,
      "tag": "reflect"
    },
    {
      "name": "미르파크",
      "source": "Mirfak",
      "theme": "거대 전장 / 광역",
      "orbit": 3,
      "tag": "aoe"
    },
    {
      "name": "알골리스",
      "source": "Algol",
      "theme": "악마성 / 저주",
      "orbit": 3,
      "tag": "curse"
    },
    {
      "name": "마르카브",
      "source": "Markab",
      "theme": "돌진 / 충격파",
      "orbit": 3,
      "tag": "charge"
    },
    {
      "name": "스케아트",
      "source": "Scheat",
      "theme": "불안정 / 변질",
      "orbit": 3,
      "tag": "chaos"
    },
    {
      "name": "알페라츠",
      "source": "Alpheratz",
      "theme": "은하 관문 / 전이",
      "orbit": 3,
      "tag": "warp"
    },
    {
      "name": "두베론",
      "source": "Dubhe",
      "theme": "곰자리 / 체력",
      "orbit": 4,
      "tag": "tank"
    },
    {
      "name": "메라키온",
      "source": "Merak",
      "theme": "방향성 / 탐험",
      "orbit": 4,
      "tag": "path"
    },
    {
      "name": "페크다르",
      "source": "Phecda",
      "theme": "육체 / 재생",
      "orbit": 4,
      "tag": "regen"
    },
    {
      "name": "메그레즈",
      "source": "Megrez",
      "theme": "연결점 / 루프 노드",
      "orbit": 4,
      "tag": "node"
    },
    {
      "name": "알리오스",
      "source": "Alioth",
      "theme": "별빛 강화 / 스킬",
      "orbit": 4,
      "tag": "skill"
    },
    {
      "name": "미자르",
      "source": "Mizar",
      "theme": "이중성 / 추가 발동",
      "orbit": 4,
      "tag": "dual"
    },
    {
      "name": "알카이드",
      "source": "Alkaid",
      "theme": "끝별 / 고난도",
      "orbit": 4,
      "tag": "end"
    },
    {
      "name": "사드라",
      "source": "Sadr",
      "theme": "심장부 / 핵 보스",
      "orbit": 4,
      "tag": "core"
    },
    {
      "name": "라살하그",
      "source": "Rasalhague",
      "theme": "뱀주인 / 독",
      "orbit": 4,
      "tag": "poison"
    },
    {
      "name": "샤울라",
      "source": "Shaula",
      "theme": "전갈 꼬리 / 관통",
      "orbit": 4,
      "tag": "sting"
    },
    {
      "name": "사르가스",
      "source": "Sargas",
      "theme": "전갈성 / 치명 독",
      "orbit": 4,
      "tag": "toxiccrit"
    },
    {
      "name": "아크룩스",
      "source": "Acrux",
      "theme": "남십자 / 정화",
      "orbit": 4,
      "tag": "purify"
    },
    {
      "name": "가크룩시아",
      "source": "Gacrux",
      "theme": "붉은 십자 / 제물",
      "orbit": 5,
      "tag": "sacrifice"
    },
    {
      "name": "미모사르",
      "source": "Mimosa",
      "theme": "향기 / 꽃과 씨앗",
      "orbit": 5,
      "tag": "flower"
    },
    {
      "name": "하다리온",
      "source": "Hadar",
      "theme": "쌍성 / 동료",
      "orbit": 5,
      "tag": "companion"
    },
    {
      "name": "아케르나르",
      "source": "Achernar",
      "theme": "강의 끝 / 외곽",
      "orbit": 5,
      "tag": "outer"
    },
    {
      "name": "피코크라",
      "source": "Peacock",
      "theme": "공작별 / 화려한 보상",
      "orbit": 5,
      "tag": "reward"
    },
    {
      "name": "에니프론",
      "source": "Enif",
      "theme": "돌진 / 충격",
      "orbit": 5,
      "tag": "impact"
    },
    {
      "name": "하말리스",
      "source": "Hamal",
      "theme": "충돌 / 물리 피해",
      "orbit": 5,
      "tag": "physical"
    },
    {
      "name": "디프다르",
      "source": "Diphda",
      "theme": "고래 / 흡수",
      "orbit": 5,
      "tag": "absorb"
    },
    {
      "name": "주베누비아",
      "source": "Zubenelgenubi",
      "theme": "균형 / 선택 보상",
      "orbit": 5,
      "tag": "balance"
    },
    {
      "name": "주벤샤말",
      "source": "Zubeneschamali",
      "theme": "심판 / 최종 관문",
      "orbit": 5,
      "tag": "judgement"
    }
  ];

  // modules/domain/cosmos-atlas-graph.mjs
  var CosmosAtlasGraph = class {
    constructor(deps) {
      this.deps = deps;
      this.nodes = [];
      this.edges = [];
      this.byId = /* @__PURE__ */ new Map();
    }
    hashSeed(input) {
      let h = 2166136261;
      let s = String(input || "");
      for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    }
    seeded01(seed) {
      let x = this.hashSeed(seed);
      x ^= x << 13;
      x ^= x >>> 17;
      x ^= x << 5;
      return (x >>> 0) % 1e5 / 1e5;
    }
    formatAsteroidNo(no) {
      return String(no).padStart(3, "0");
    }
    getGalaxyForPlanetIndex(idx) {
      if (idx <= 0) return 0;
      return GALAXY_SEQUENCE[(idx - 1) % GALAXY_SEQUENCE.length];
    }
    getGalaxyPlanetSlot(idx) {
      if (idx <= 0) return 0;
      return Math.floor((idx - 1) / GALAXY_SEQUENCE.length);
    }
    getGalaxyForAsteroidIndex(idx) {
      return GALAXY_SEQUENCE[Math.max(0, Math.min(GALAXY_SEQUENCE.length - 1, Math.floor(idx / ASTEROIDS_PER_GALAXY)))];
    }
    getGalaxyTierBandBase(galaxy) {
      return galaxy <= 0 ? 1 : (Math.max(1, Math.min(5, Math.floor(galaxy))) - 1) * 5 + 1;
    }
    getGalaxyRouteOrder(localSlot, isGalaxyBoss) {
      if (isGalaxyBoss) return 22;
      const withoutBoss = localSlot > 9 ? localSlot - 1 : localSlot;
      return withoutBoss >= 22 ? withoutBoss + 1 : withoutBoss;
    }
    getGalaxyRoutePosition(galaxy, routeOrder) {
      const spec = GALAXY_SPECS[galaxy] || GALAXY_SPECS[1];
      if (galaxy === 0) return { x: spec.x, y: spec.y };
      const order = Math.max(0, Math.min(NODES_PER_GALAXY - 1, Math.floor(routeOrder || 0)));
      const stage = Math.floor(order / 5);
      const lane = order % 5 - 2;
      const length = Math.max(1, Math.hypot(spec.x, spec.y));
      const dx = spec.x / length;
      const dy = spec.y / length;
      const branchDepth = Math.abs(lane);
      const sweep = lane === 0 ? 0 : (stage % 2 === 0 ? lane : -lane) * 12;
      const progress2 = (stage - 2) * 154 + branchDepth * 28 + sweep;
      const side = lane * (78 + stage * 7);
      return {
        x: spec.x + dx * progress2 - dy * side,
        y: spec.y + dy * progress2 + dx * side
      };
    }
    assignGalaxyRoutePositions() {
      GALAXY_SEQUENCE.forEach((galaxy) => {
        const nodes = this.nodes.filter((node) => node.orbit === galaxy);
        const boss = nodes.find((node) => node.tag === "boss");
        const routeOrders = Array.from({ length: NODES_PER_GALAXY }, (_, index) => index).filter((order) => order !== 22);
        nodes.filter((node) => node !== boss).sort((a, b) => a.localSlot - b.localSlot).forEach((node, index) => {
          node.routeOrder = routeOrders[index];
          Object.assign(node, this.getGalaxyRoutePosition(galaxy, node.routeOrder));
        });
        if (boss) {
          boss.routeOrder = 22;
          Object.assign(boss, this.getGalaxyRoutePosition(galaxy, boss.routeOrder));
        }
      });
    }
    buildCosmosAtlasData() {
      if (this.nodes.length) return;
      this.nodes.length = 0;
      this.edges.length = 0;
      this.byId.clear();
      COSMOS_PLANETS.forEach((p, idx) => this.addCosmosPlanet(p, idx));
      COSMOS_ASTEROID_NUMBERS.forEach((no, idx) => this.addCosmosAsteroid(no, idx));
      this.assignGalaxyRoutePositions();
      this.nodes.forEach((node) => this.byId.set(node.id, node));
      this.buildEdges();
    }
    addCosmosPlanet(p, idx) {
      const galaxy = this.getGalaxyForPlanetIndex(idx);
      const planetSlot = this.getGalaxyPlanetSlot(idx);
      const localSlot = galaxy === 0 ? 0 : planetSlot;
      const isGalaxyBoss = galaxy > 0 && GALAXY_BOSS_PLANET_INDEX[galaxy] === idx;
      const routeOrder = galaxy === 0 ? 0 : this.getGalaxyRouteOrder(localSlot, isGalaxyBoss);
      const pos = this.getGalaxyRoutePosition(galaxy, routeOrder);
      const tag = isGalaxyBoss || p.tag === "boss" ? "boss" : p.tag;
      const { sizeClass, gravity } = this.planetPhysicalSize(p, idx, galaxy);
      const node = {
        id: `planet-${idx}`,
        kind: "planet",
        name: p.name,
        source: p.source,
        theme: p.theme,
        tag,
        baseTag: p.tag,
        orbit: galaxy,
        originalOrbit: Math.max(0, Math.floor(p.orbit || 0)),
        localIndex: localSlot,
        localSlot,
        routeOrder,
        tier: this.planetTier(idx, galaxy, isGalaxyBoss, planetSlot),
        x: pos.x,
        y: pos.y,
        radius: idx === 0 ? 19 : Math.max(11, 17 - galaxy * 0.35 + sizeClass * 0.4),
        labelPriority: idx === 0 ? 10 : tag === "boss" ? 8 : Math.max(2, 7 - Math.floor(localSlot / 2)),
        sizeClass,
        gravity
      };
      this.nodes.push(node);
    }
    planetPhysicalSize(planet, index, galaxy) {
      const sizeSeed = this.seeded01(planet.name + ":size");
      const gravitySeed = this.seeded01(planet.name + ":grav");
      const sizeClass = index === 0 ? 1 : Math.max(1, Math.min(5, 1 + Math.floor(sizeSeed * 5)));
      const gravity = index === 0 ? 1 : Math.max(1, Math.round((1.05 + galaxy * 0.18 + sizeClass * 0.18 + gravitySeed * 1.35) * 10) / 10);
      return { sizeClass, gravity };
    }
    planetTier(index, galaxy, boss, slot) {
      if (index === 0) return 1;
      const offset = boss ? 4 : Math.min(4, Math.floor(slot / 2));
      return Math.max(1, Math.min(25, this.getGalaxyTierBandBase(galaxy) + offset));
    }
    addCosmosAsteroid(no, idx) {
      const galaxy = this.getGalaxyForAsteroidIndex(idx);
      const asteroidSlot = idx % ASTEROIDS_PER_GALAXY;
      const localSlot = PLANETS_PER_GALAXY + asteroidSlot;
      const routeOrder = this.getGalaxyRouteOrder(localSlot, false);
      const pos = this.getGalaxyRoutePosition(galaxy, routeOrder);
      const sizeClass = Math.max(1, Math.min(4, 1 + Math.floor(this.seeded01("ast-size-" + no) * 4)));
      const gravity = Math.max(0.9, Math.round((0.95 + galaxy * 0.16 + sizeClass * 0.13 + this.seeded01("ast-grav-" + no) * 1.05) * 10) / 10);
      const node = {
        id: `asteroid-${no}`,
        kind: "asteroid",
        name: this.deps._t("소행성 {no}", { no: this.formatAsteroidNo(no) }),
        source: `Asteroid #${no}`,
        theme: "소행성 지대 / 재료/창공의 정수",
        tag: "asteroid",
        baseTag: "asteroid",
        orbit: galaxy,
        originalOrbit: galaxy,
        localIndex: localSlot,
        localSlot,
        routeOrder,
        tier: Math.max(1, Math.min(25, this.getGalaxyTierBandBase(galaxy) + Math.min(4, Math.floor(asteroidSlot / 3)))),
        x: pos.x,
        y: pos.y,
        radius: Math.max(9, 12.5 - galaxy * 0.2 + sizeClass * 0.25),
        labelPriority: 0,
        sizeClass,
        gravity
      };
      this.nodes.push(node);
    }
    addEdge(a, b, type) {
      if (!a || !b || a === b) return;
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (this.edges.some((e) => e.key === key)) return;
      this.edges.push({ key, a, b, type: type || "route" });
    }
    buildEdges() {
      GALAXY_SEQUENCE.forEach((galaxy) => {
        const route = this.nodes.filter((node) => node.orbit === galaxy).sort((a, b) => a.routeOrder - b.routeOrder);
        const byOrder = new Map(route.map((node) => [node.routeOrder, node]));
        for (let stage = 0; stage < 5; stage++) this.connectGalaxyStage(byOrder, stage);
        const entry = byOrder.get(2);
        const previous = galaxy === 1 ? this.byId.get("planet-0") : this.byId.get(`planet-${GALAXY_BOSS_PLANET_INDEX[galaxy - 1]}`);
        if (entry && previous) this.addEdge(previous.id, entry.id, galaxy === 1 ? "spine" : "transition");
      });
    }
    connectGalaxyStage(byOrder, stage) {
      const row = Array.from({ length: 5 }, (_, lane) => byOrder.get(stage * 5 + lane));
      for (let lane = 0; lane < 4; lane++) this.connectNodes(row[lane], row[lane + 1], "branch");
      const nextCenter = byOrder.get((stage + 1) * 5 + 2);
      this.connectNodes(row[2], nextCenter, "spine");
      if (stage < 4) this.connectNodes(row[stage % 2 === 0 ? 3 : 1], nextCenter, "route");
    }
    connectNodes(a, b, type) {
      if (a && b) this.addEdge(a.id, b.id, type);
    }
    getNeighbors(id) {
      const out = [];
      this.edges.forEach((e) => {
        if (e.a === id) out.push(e.b);
        else if (e.b === id) out.push(e.a);
      });
      return out;
    }
  };

  // modules/state/cosmos-atlas.mjs
  var CosmosAtlasState = class {
    constructor(deps) {
      this.deps = deps;
    }
    normalizeCosmosExpeditionState(state2) {
      const cycles = state2.directiveCycles && typeof state2.directiveCycles === "object" && !Array.isArray(state2.directiveCycles) ? state2.directiveCycles : {};
      Object.keys(cycles).forEach((nodeId) => {
        cycles[nodeId] = Math.max(0, Math.min(999999, Math.floor(Number(cycles[nodeId]) || 0)));
      });
      const selected = state2.selectedDirectives && typeof state2.selectedDirectives === "object" && !Array.isArray(state2.selectedDirectives) ? state2.selectedDirectives : {};
      Object.keys(selected).forEach((nodeId) => {
        if (typeof selected[nodeId] !== "string" || !selected[nodeId]) delete selected[nodeId];
      });
      state2.directiveCycles = cycles;
      state2.selectedDirectives = selected;
    }
    getState() {
      if (!this.deps.game) this.deps.game = {};
      const state2 = this.deps.game.cosmosAtlas && typeof this.deps.game.cosmosAtlas === "object" ? this.deps.game.cosmosAtlas : this.deps.game.cosmosAtlas = {};
      state2.cleared = Array.isArray(state2.cleared) ? Array.from(new Set(state2.cleared.filter((id) => typeof id === "string"))) : [];
      state2.selectedId = state2.selectedId || "planet-0";
      this.normalizeCosmosCamera(state2);
      delete state2.starDust;
      this.normalizeCosmosBossRecords(state2);
      this.normalizeCosmosStones(state2);
      state2.equippedStoneGalaxy = this.getEquippedCosmosStoneCount(state2);
      this.normalizeCosmosExpeditionState(state2);
      this.normalizeCosmosMastery(state2);
      if (!state2.camera) state2.camera = { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE };
      return state2;
    }
    getEquippedCosmosStoneCount(state2) {
      const equipped = state2 && state2.equippedStones && typeof state2.equippedStones === "object" ? state2.equippedStones : {};
      return Object.keys(equipped).filter((key) => !!equipped[key]).length;
    }
    hasSixthCosmosStoneUnlock() {
      return this.deps.getSocketedJewels().some(({ jewel }) => jewel.uniqueId === "cbj_enifron_faded_stone" || jewel.id === "cbj_enifron_faded_stone" || jewel.name === "바래진 우주석");
    }
    isCosmosStoneAcquired(state2, galaxy) {
      const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
      if (g === 6) return this.hasSixthCosmosStoneUnlock();
      return !!(state2 && state2.bossStones && state2.bossStones[String(g)]);
    }
    normalizeCosmosCamera(state2) {
      state2.camera = state2.camera && typeof state2.camera === "object" ? state2.camera : null;
      if (state2.layoutVersion !== COSMOS_LAYOUT_VERSION) {
        state2.camera = { x: 0, y: 0, scale: DEFAULT_COSMOS_CAMERA_SCALE };
        state2.layoutVersion = COSMOS_LAYOUT_VERSION;
      }
    }
    normalizeCosmosBossRecords(state2) {
      state2.bossClears = Array.isArray(state2.bossClears) ? Array.from(new Set(state2.bossClears.filter((id) => typeof id === "string"))) : [];
      state2.bossKills = state2.bossKills && typeof state2.bossKills === "object" ? state2.bossKills : {};
      Object.keys(state2.bossKills).forEach((id) => {
        state2.bossKills[id] = Math.max(0, Math.floor(Number(state2.bossKills[id]) || 0));
      });
      state2.bossRelics = Array.isArray(state2.bossRelics) ? state2.bossRelics.filter((relic) => relic && relic.rerollStoneOption && Math.floor(Number(relic.galaxy) || 0) >= 1 && Math.floor(Number(relic.galaxy) || 0) <= 5) : [];
      state2.bossExclusiveMisses = state2.bossExclusiveMisses && typeof state2.bossExclusiveMisses === "object" ? state2.bossExclusiveMisses : {};
      Object.keys(state2.bossExclusiveMisses).forEach((id) => {
        state2.bossExclusiveMisses[id] = Math.max(0, Math.min(39, Math.floor(Number(state2.bossExclusiveMisses[id]) || 0)));
      });
    }
    normalizeCosmosStones(state2) {
      state2.bossStones = state2.bossStones && typeof state2.bossStones === "object" ? state2.bossStones : {};
      Object.keys(state2.bossStones).forEach((g) => {
        if (!/^[1-5]$/.test(g) || !state2.bossStones[g]) delete state2.bossStones[g];
      });
      state2.bossStoneOptions = state2.bossStoneOptions && typeof state2.bossStoneOptions === "object" ? state2.bossStoneOptions : {};
      state2.equippedStones = state2.equippedStones && typeof state2.equippedStones === "object" ? state2.equippedStones : {};
      Object.keys(state2.equippedStones).forEach((g) => {
        const galaxy = Math.floor(Number(g) || 0);
        if (galaxy < 1 || galaxy > 6 || !state2.equippedStones[g] || !this.isCosmosStoneAcquired(state2, galaxy)) delete state2.equippedStones[g];
      });
    }
    normalizeCosmosMastery(state2) {
      state2.masteryPointsSpent = Math.max(0, Math.floor(state2.masteryPointsSpent || 0));
      state2.mastery = state2.mastery && typeof state2.mastery === "object" ? state2.mastery : {};
      COSMOS_MASTERY_NODES.forEach((node) => {
        state2.mastery[node.key] = Math.max(0, Math.min(node.max, Math.floor(state2.mastery[node.key] || 0)));
      });
    }
  };

  // modules/domain/cosmos-atlas-progress.mjs
  var CosmosAtlasProgress = class {
    constructor(deps, services) {
      this.deps = deps;
      this.state = services.state;
      this.graph = services.graph;
    }
    getSkyPowerBalance() {
      if (!this.deps.game.currencies || typeof this.deps.game.currencies !== "object") this.deps.game.currencies = {};
      return Math.max(0, Math.floor(Number(this.deps.game.currencies.skyEssence) || 0));
    }
    grantCosmosSkyPower(rewardPoints) {
      const gain = Math.max(1, Math.round(Math.max(0, Number(rewardPoints) || 0) / this.deps.COSMOS_SKY_POWER_PER_REWARD));
      const balance = this.getSkyPowerBalance();
      this.deps.game.currencies.skyEssence = balance + gain;
      return gain;
    }
    getCosmosCapstoneProgress(stateOverride) {
      const state2 = stateOverride && typeof stateOverride === "object" ? stateOverride : this.state.getState();
      const clearedSet = new Set(Array.isArray(state2.bossClears) ? state2.bossClears : []);
      const bosses = COSMOS_CAPSTONE_BOSS_IDS.map((id, index) => {
        const planetIndex = Math.max(0, Math.floor(Number(String(id).replace("planet-", ""))) || 0);
        const def = COSMOS_PLANETS[planetIndex] || {};
        return {
          id,
          galaxy: index + 1,
          name: def.name || id,
          cleared: clearedSet.has(id)
        };
      });
      const clearedCount = bosses.filter((row) => row.cleared).length;
      const keyCount = this.getCosmosSovereignKeys();
      const season = Math.max(1, Math.floor(Number(this.deps.game && this.deps.game.season) || 1));
      return {
        bosses,
        clearedCount,
        total: bosses.length,
        missing: bosses.filter((row) => !row.cleared),
        ready: clearedCount === bosses.length,
        eligibleSeason: season >= 31,
        keyCount,
        canChallenge: season >= 31 && clearedCount === bosses.length && keyCount > 0
      };
    }
    getCosmosSovereignKeys() {
      const owner = this.deps.game;
      return Math.max(0, Math.floor(Number(owner && owner.currencies && owner.currencies.cosmosSovereignKey) || 0));
    }
    getCosmosMasteryValue(key) {
      const state2 = this.state.getState();
      return Math.max(0, Math.floor((state2.mastery || {})[key] || 0));
    }
    getCosmosMasteryTotalPoints() {
      const state2 = this.state.getState();
      return this.graph.nodes.reduce((sum, node) => sum + (state2.cleared.includes(node.id) ? 1 : 0), 0);
    }
    getCosmosMasteryFreePoints() {
      const state2 = this.state.getState();
      const spent = COSMOS_MASTERY_NODES.reduce((sum, node) => sum + state2.mastery[node.key] * node.cost, 0);
      state2.masteryPointsSpent = spent;
      return Math.max(0, this.getCosmosMasteryTotalPoints() - spent);
    }
    *allocateCosmosMastery(nodeKey) {
      const state2 = this.state.getState();
      const node = COSMOS_MASTERY_NODES.find((n) => n.key === nodeKey);
      if (!node) return;
      const reqFail = this.getCosmosMasteryLockReason(node.key);
      if (reqFail) return this.deps.canLog && (yield { kind: "addLog", args: [reqFail, "attack-monster"] });
      const current = this.getCosmosMasteryValue(node.key);
      if (current >= node.max) return this.deps.canLog && (yield { kind: "addLog", args: ["해당 성도술 노드는 이미 최대 단계입니다.", "attack-monster"] });
      if (this.getCosmosMasteryFreePoints() < node.cost) return this.deps.canLog && (yield { kind: "addLog", args: [this.deps._t("성도술 포인트가 부족합니다. (필요: {cost})", { cost: node.cost }), "attack-monster"] });
      state2.mastery[node.key] = current + 1;
      state2.masteryPointsSpent += node.cost;
      if (this.deps.canLog) yield { kind: "addLog", args: [this.deps._t("✨ 성도술 강화: {name} {value}/{max}", { name: node.name, value: current + 1, max: node.max }), "season-up"] };
      yield { kind: "renderCosmosAtlas", args: [] };
    }
    getCosmosMasteryLockReason(nodeKey) {
      const node = COSMOS_MASTERY_NODES.find((n) => n.key === nodeKey);
      if (!node) return null;
      const reqs = COSMOS_MASTERY_LINKS[node.key] || [];
      for (let i = 0; i < reqs.length; i++) {
        const [reqKey, reqLvRaw] = String(reqs[i]).split(":");
        const reqLv = Math.max(1, Math.floor(Number(reqLvRaw || 1)));
        if (this.getCosmosMasteryValue(reqKey) < reqLv) {
          const reqNode = COSMOS_MASTERY_NODES.find((n) => n.key === reqKey);
          return this.deps._t("선행 노드 필요: {reqNode} {reqLv}레벨", { reqNode: reqNode && reqNode.name || reqKey, reqLv });
        }
      }
      return null;
    }
    isCosmosUnlocked() {
      if (!this.deps.game) return false;
      return this.deps.isMapPrimaryContentUnlocked(this.deps.game, "map-tab-cosmos") || this.deps.isCosmosContentUnlockReady(this.deps.game);
    }
    getNodeStatus(node, state2 = this.state.getState()) {
      if (!this.isCosmosUnlocked()) return "locked";
      if (state2.cleared.includes(node.id)) return "cleared";
      if (node.id === "planet-0") return "available";
      if (this.isCosmosRouteDestination(node)) return "available";
      if (!this.isCosmosPreviousGalaxyCleared(node, state2)) return "locked";
      if (node.tag === "boss") {
        const galaxyClears = this.graph.nodes.filter((row) => row.orbit === node.orbit && row.id !== node.id && state2.cleared.includes(row.id)).length;
        if (galaxyClears < GALAXY_BOSS_REQUIRED_CLEARS) return "locked";
        return "available";
      }
      const neighbors = this.graph.getNeighbors(node.id);
      return neighbors.some((id) => state2.cleared.includes(id)) ? "available" : "locked";
    }
    isCosmosPreviousGalaxyCleared(node, state2) {
      if (node.orbit <= 1) return true;
      return state2.bossClears.includes(`planet-${GALAXY_BOSS_PLANET_INDEX[node.orbit - 1]}`);
    }
    isCosmosRouteDestination(node) {
      const intermediate = this.deps.game.cosmosRoute?.version >= 3 ? node.id !== this.deps.game.cosmosRoute.plan.at(-1).at(-1) : node.tag !== "boss";
      return intermediate && this.deps.cosmosRouteRuntime.current(this.deps.game) === node.id;
    }
    getCosmosBossTier(node) {
      if (!node || node.tag !== "boss") return null;
      const g = Math.max(1, Math.min(5, Math.floor(node.orbit || 1)));
      return Math.min(25, g * 5);
    }
    getBossStage(node) {
      if (!node || node.tag !== "boss") return null;
      const state2 = this.state.getState();
      const clears = Math.max(0, Math.floor(state2.bossKills && state2.bossKills[node.id] || 0));
      if (clears >= 3) return 3;
      if (clears >= 1) return 2;
      return 1;
    }
    getGalaxyClearCount(state2, galaxy) {
      return this.graph.nodes.filter((node) => node.orbit === galaxy && node.tag !== "boss" && state2.cleared.includes(node.id)).length;
    }
    getCosmosBossPityProgress(node) {
      if (!node || node.tag !== "boss") return null;
      const misses = Math.max(0, Math.min(39, Math.floor((this.state.getState().bossExclusiveMisses || {})[node.id] || 0)));
      return { misses, guaranteeAt: 40, remaining: Math.max(1, 40 - misses) };
    }
  };

  // modules/domain/cosmos-atlas-stones.mjs
  var CosmosAtlasStones = class {
    constructor(deps, services) {
      this.deps = deps;
      this.state = services.state;
    }
    getCosmosTierFloor(state2 = this.state.getState()) {
      const count = Math.max(0, Math.min(5, this.state.getEquippedCosmosStoneCount(state2)));
      return COSMOS_STONE_TIER_FLOORS[count] || 1;
    }
    getCosmosStonePool(galaxy) {
      const pools = this.deps.COSMOS_BOSS_STONE_OPTION_POOLS || {};
      return pools[String(Math.max(1, Math.min(6, Math.floor(galaxy || 1))))] || null;
    }
    rollCosmosStoneOption(galaxy, bossOption) {
      const pool = this.getCosmosStonePool(galaxy);
      const source = pool ? bossOption ? pool.bossOptions : pool.options : [];
      if (!Array.isArray(source) || source.length <= 0) return null;
      const row = source[Math.floor(Math.random() * source.length)];
      const min = Number(row.min || 0);
      const max = Number(row.max || min);
      const value = min === max ? min : Number((min + Math.random() * (max - min)).toFixed(2));
      return { stat: row.stat, value, min, max, label: row.label || row.stat, boss: !!bossOption };
    }
    ensureCosmosStoneOptions(state2, galaxy) {
      const g = String(Math.max(1, Math.min(6, Math.floor(galaxy || 1))));
      state2.bossStoneOptions = state2.bossStoneOptions && typeof state2.bossStoneOptions === "object" ? state2.bossStoneOptions : {};
      if (!Array.isArray(state2.bossStoneOptions[g])) {
        state2.bossStoneOptions[g] = [this.rollCosmosStoneOption(g, false), this.rollCosmosStoneOption(g, false), this.rollCosmosStoneOption(g, false)].filter(Boolean);
      }
      while (state2.bossStoneOptions[g].length < 3) {
        const option = this.rollCosmosStoneOption(g, false);
        if (option) state2.bossStoneOptions[g].push(option);
        else break;
      }
      state2.bossStoneOptions[g] = state2.bossStoneOptions[g].slice(0, 3);
      return state2.bossStoneOptions[g];
    }
    getCosmosStoneOptionText(option) {
      if (!option) return "빈 옵션";
      const value = Number(option.value || 0);
      const sign = value > 0 ? "+" : "";
      return this.deps._t("{value}{label} {sign}{value2} (범위 {min}~{max})", { value: option.boss ? "👑 " : "", label: option.label || option.stat, sign, value2: value, min: option.min, max: option.max });
    }
    getCosmosStoneNameByGalaxy(galaxy) {
      const pool = this.getCosmosStonePool(galaxy);
      return pool && pool.name ? pool.name : this.deps._t("G{galaxy} 우주석", { galaxy });
    }
    findCosmosBossRelicIndexForStone(relics, galaxy) {
      const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
      if (g === 6) return relics.findIndex((relic) => relic && relic.rerollStoneOption);
      return relics.findIndex((relic) => relic && relic.rerollStoneOption && Math.floor(Number(relic.galaxy) || 0) === g);
    }
    cosmosRelicBlockReason(state2, galaxy) {
      if (!this.state.isCosmosStoneAcquired(state2, galaxy)) return "먼저 해당 우주석을 획득해야 합니다.";
      if (!Array.isArray(state2.bossRelics) || state2.bossRelics.length <= 0) return "사용할 보스 유물이 없습니다.";
      return "";
    }
    *applyCosmosBossRelicToStone(galaxy) {
      const state2 = this.state.getState();
      const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
      const blocked = this.cosmosRelicBlockReason(state2, g);
      if (blocked) return this.deps.canLog && (yield { kind: "addLog", args: [blocked, "attack-monster"] });
      const relicIndex = this.findCosmosBossRelicIndexForStone(state2.bossRelics, g);
      if (relicIndex < 0) return this.deps.canLog && (yield { kind: "addLog", args: ["해당 우주석에 사용할 보스 유물이 없습니다.", "attack-monster"] });
      const options = this.ensureCosmosStoneOptions(state2, g);
      const idx = Math.max(0, Math.min(2, Math.floor(Math.random() * 3)));
      const next = this.rollCosmosStoneOption(g, true);
      if (!next) return;
      state2.bossRelics.splice(relicIndex, 1);
      options[idx] = next;
      if (this.deps.canLog) yield { kind: "addLog", args: [this.deps._t("💠 {g} 보스 옵션 리롤: {next}", { g: this.getCosmosStoneNameByGalaxy(g), next: this.getCosmosStoneOptionText(next) }), "loot-unique"] };
      if (this.deps.canRefresh) yield { kind: "updateStaticUI", args: [] };
      yield { kind: "renderCosmosAtlas", args: [] };
    }
    getBossStoneName(node) {
      const theme = String(node && node.theme || "");
      if (theme.includes("백색")) return "백성핵석";
      if (theme.includes("보호막")) return "장막핵석";
      if (theme.includes("블랙홀")) return "중력핵석";
      if (theme.includes("성운")) return "성운핵석";
      if (theme.includes("황혼") || theme.includes("붕괴")) return "붕괴핵석";
      return "우주석";
    }
    *equipBossStoneByGalaxy(galaxy) {
      const state2 = this.state.getState();
      const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
      const stone = this.getCosmosStoneNameByGalaxy(g);
      if (!this.state.isCosmosStoneAcquired(state2, g)) {
        if (this.deps.canLog) yield { kind: "addLog", args: [this.deps._t("은하 {g} 우주석이 없습니다.", { g }), "attack-monster"] };
        return;
      }
      if (state2.equippedStones[String(g)]) return;
      this.ensureCosmosStoneOptions(state2, g);
      state2.equippedStones[String(g)] = true;
      state2.equippedStoneGalaxy = this.state.getEquippedCosmosStoneCount(state2);
      if (this.deps.canLog) yield { kind: "addLog", args: [this.deps._t("💠 {stone} 장착: 우주계 최소 Tier {cosmosTierFloor} 적용", { stone, cosmosTierFloor: this.getCosmosTierFloor() }), "season-up"] };
      yield { kind: "renderCosmosAtlas", args: [] };
    }
    *unequipBossStoneByGalaxy(galaxy) {
      const state2 = this.state.getState();
      const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
      delete state2.equippedStones[String(g)];
      state2.equippedStoneGalaxy = this.state.getEquippedCosmosStoneCount(state2);
      if (this.deps.canLog) yield { kind: "addLog", args: [this.deps._t("💠 {g} 해제", { g: this.getCosmosStoneNameByGalaxy(g) }), "season-up"] };
      yield { kind: "renderCosmosAtlas", args: [] };
    }
  };

  // modules/domain/cosmos-atlas-directives.mjs
  var CosmosAtlasDirectives = class {
    constructor(deps, services) {
      this.deps = deps;
      this.state = services.state;
      this.graph = services.graph;
      this.progress = services.progress;
    }
    getCosmosDirectiveChoicesForNode(node, stateOverride) {
      if (!node || typeof this.deps.getCosmosExpeditionDirectiveChoices !== "function") return [];
      const state2 = stateOverride || this.state.getState();
      const cycle = Math.max(0, Math.floor(Number(state2.directiveCycles[node.id]) || 0));
      return this.deps.getCosmosExpeditionDirectiveChoices(node.id, cycle);
    }
    getSelectedCosmosDirective(node, stateOverride) {
      const routeDirective = this.deps.cosmosRouteRuntime.directive(this.deps.game, node.id);
      if (routeDirective) return routeDirective;
      const state2 = stateOverride || this.state.getState();
      const choices = this.getCosmosDirectiveChoicesForNode(node, state2);
      if (choices.length === 0) return null;
      const selectedId = state2.selectedDirectives[node.id];
      return choices.find((row) => row.id === selectedId) || choices[0];
    }
    createCosmosDirectiveSnapshot(directive) {
      if (!directive) return null;
      return {
        id: directive.id,
        name: directive.name,
        enemyHpMul: directive.enemyHpMul,
        enemyDamageMul: directive.enemyDamageMul,
        enemyAttackSpeedMul: directive.enemyAttackSpeedMul,
        rewardMul: directive.rewardMul,
        jackpotChance: directive.jackpotChance,
        jackpotBonusMul: directive.jackpotBonusMul,
        rare: directive.rare === true
      };
    }
    *selectCosmosExpeditionDirective(nodeId, directiveId) {
      const node = this.graph.byId.get(String(nodeId || ""));
      if (!node || this.progress.getNodeStatus(node) === "locked") return false;
      const state2 = this.state.getState();
      const fightingThisNode = this.deps.game.currentZoneId === "cosmos_challenge" && state2.activeChallenge && state2.activeChallenge.nodeId === node.id;
      if (fightingThisNode) return false;
      const choices = this.getCosmosDirectiveChoicesForNode(node, state2);
      const selected = choices.find((row) => row.id === String(directiveId || ""));
      if (!selected) return false;
      state2.selectedDirectives[node.id] = selected.id;
      yield { kind: "renderCosmosAtlas", args: [] };
      return true;
    }
    advanceCosmosDirectiveCycle(state2, nodeId) {
      const current = Math.max(0, Math.floor(Number(state2.directiveCycles[nodeId]) || 0));
      state2.directiveCycles[nodeId] = Math.min(999999, current + 1);
      delete state2.selectedDirectives[nodeId];
    }
    getCompletedChallengeDirective(state2, node) {
      const challenge = state2.activeChallenge && state2.activeChallenge.nodeId === node.id ? state2.activeChallenge : null;
      if (challenge && challenge.directive) return challenge.directive;
      return this.createCosmosDirectiveSnapshot(this.getSelectedCosmosDirective(node, state2));
    }
  };

  // modules/domain/cosmos-atlas-rules.mjs
  var CosmosAtlasRules = class {
    constructor(deps, services) {
      this.deps = deps;
      this.progress = services.progress;
      this.stones = services.stones;
      this.graph = services.graph;
      this.directives = services.directives;
      this.state = services.state;
    }
    getDisplayedNodeTier(node, state2) {
      const bossTier = this.progress.getCosmosBossTier(node);
      if (bossTier != null) return bossTier;
      return Math.max(Math.floor(node.tier || 1), this.stones.getCosmosTierFloor(state2));
    }
    canChallengeNode(node) {
      if (!node) return false;
      if (this.deps.game.cosmosRoute?.phase === "failed" && this.deps.cosmosRouteRuntime.retryRemaining(this.deps.game)) return false;
      const status = this.progress.getNodeStatus(node);
      return status === "available" || status === "cleared";
    }
    getCosmosEquivalentUnderworldFloor(node) {
      const tier = Math.max(1, Math.floor(this.getDisplayedNodeTier(node) || 1));
      return 30 + (tier - 1);
    }
    getCosmosChallengeTier(node) {
      const equivFloor = this.getCosmosEquivalentUnderworldFloor(node);
      const baseCombatTier = typeof this.deps.getChaosRealmTier === "function" ? this.deps.getChaosRealmTier(equivFloor) : 30 + Math.floor((equivFloor - 1) * 0.85) + Math.floor(Math.max(0, equivFloor - 10) * 0.18);
      const generalEase = Math.floor(this.progress.getCosmosMasteryValue("challengeEase") / 4) + Math.floor(this.progress.getCosmosMasteryValue("routeInsight") / 7);
      const routeEase = node && node.kind === "planet" ? Math.floor(this.progress.getCosmosMasteryValue("planetRelief") / 10) : Math.floor(this.progress.getCosmosMasteryValue("voidSurvey") / 8);
      const riskTier = Math.floor(this.progress.getCosmosMasteryValue("highRisk") / 4);
      const tierAdjustment = Math.max(-8, Math.min(6, riskTier - generalEase - routeEase));
      const cosmosLoopBonus = Math.max(0, Math.floor(this.deps.game && this.deps.game.cosmosLoopCount || 0)) * 2;
      return Math.max(1, baseCombatTier + tierAdjustment + cosmosLoopBonus);
    }
    getCosmosNodeMechanic(node) {
      if (!node || typeof this.deps.resolveCosmosMechanic !== "function") return null;
      const environment = Array.isArray(this.deps.COSMOS_GALAXY_ENVIRONMENT_DB) ? this.deps.COSMOS_GALAXY_ENVIRONMENT_DB.find((row) => row && row.galaxy === node.orbit) : null;
      const boss = typeof this.deps.getCosmosGalaxyBossMechanic === "function" ? this.deps.getCosmosGalaxyBossMechanic(node.id) : null;
      if (boss) return this.cosmosBossMechanic(boss, environment);
      const mechanic = this.deps.resolveCosmosMechanic(node.tag, this.graph.hashSeed(node.id));
      if (!mechanic || !environment) return mechanic;
      return {
        ...mechanic,
        name: `${environment.name}, ${mechanic.name}`,
        summary: `${environment.summary} ${mechanic.summary}`,
        counter: `${environment.counter} ${mechanic.counter}`
      };
    }
    cosmosBossMechanic(boss, environment) {
      const element = boss.elementRule === "physical" ? "phys" : boss.elementRule === "chaos" ? "chaos" : "weakest";
      return {
        ...boss,
        element,
        summary: environment ? `${environment.summary} ${boss.summary}` : boss.summary,
        counter: environment ? `${environment.counter} ${boss.counter}` : boss.counter
      };
    }
    createCosmosEstimateZone(node, mechanic) {
      const directive = this.directives.getSelectedCosmosDirective(node);
      return {
        id: "cosmos_challenge",
        name: this.deps._t("우주계 {name}", { name: node.name }),
        type: "cosmos",
        tier: this.getCosmosChallengeTier(node),
        lootTier: this.getDisplayedNodeTier(node),
        ele: mechanic && ["phys", "fire", "cold", "light", "chaos"].includes(mechanic.element) ? mechanic.element : "chaos",
        cosmosNodeId: node.id,
        cosmosGalaxy: node.orbit,
        cosmosTag: node.baseTag || node.tag || "",
        cosmosMechanicId: mechanic ? mechanic.id : "",
        gravity: Math.max(1, Number(node.gravity || 1)),
        sizeClass: Math.max(1, Math.floor(node.sizeClass || 1)),
        cosmosDirective: this.directives.createCosmosDirectiveSnapshot(directive),
        cosmosHabitat: this.deps.cosmosRouteRuntime.habitat(this.deps.game, node.id)
      };
    }
    getCosmosReadinessStats(node) {
      const stats = typeof this.deps.getPlayerStats === "function" ? this.deps.getPlayerStats() : {};
      const currentZone = typeof this.deps.getZone === "function" ? this.deps.getZone(this.deps.game && this.deps.game.currentZoneId) : null;
      const masteryAlreadyActive = currentZone && currentZone.type === "cosmos";
      const { damageBonus, bossBonus, guardMul } = this.cosmosReadinessBonuses(node, masteryAlreadyActive);
      const totalDps = Math.max(0, Number(stats.totalDps) || (Number(stats.dps) || 0) + (Number(stats.summonDps) || 0));
      return {
        ...stats,
        totalDps: totalDps * damageBonus * bossBonus,
        genericTakenDamageMultiplier: Math.max(0.01, Number(stats.genericTakenDamageMultiplier) || 1) * guardMul
      };
    }
    getCosmosNodeRecommendation(nodeOrId) {
      this.graph.buildCosmosAtlasData();
      const node = typeof nodeOrId === "string" ? this.graph.byId.get(nodeOrId) : nodeOrId;
      if (!node || typeof this.deps.calculateCosmosDifficultyTarget !== "function") return null;
      const mechanic = this.getCosmosNodeMechanic(node);
      const directive = this.directives.getSelectedCosmosDirective(node);
      const estimateZone = this.createCosmosEstimateZone(node, mechanic);
      const actualEstimate = typeof this.deps.estimateMapZonePowerRequirements === "function" ? this.deps.estimateMapZonePowerRequirements(estimateZone) : null;
      const target = actualEstimate || this.deps.calculateCosmosDifficultyTarget({
        combatTier: this.getCosmosChallengeTier(node),
        sizeClass: node.sizeClass,
        gravity: node.gravity,
        isGalaxyBoss: node.tag === "boss",
        element: mechanic ? mechanic.element : "chaos",
        directive
      });
      if (mechanic && mechanic.element === "weakest") target.element = "weakest";
      const stats = this.getCosmosReadinessStats(node);
      const readiness = typeof this.deps.getMapPowerReadiness === "function" ? this.deps.getMapPowerReadiness(stats, target) : null;
      return { nodeId: node.id, mechanic, directive, target, readiness };
    }
    getCosmosProgressGuide() {
      this.graph.buildCosmosAtlasData();
      const state2 = this.state.getState();
      const woodsmanCleared = Array.isArray(this.deps.game && this.deps.game.journalEntries) && this.deps.game.journalEntries.includes("woodsman");
      if (!woodsmanCleared) return { stage: "unlock", title: this.deps._t("혼돈 밖의 나무꾼 격파"), detail: this.deps._t("나무꾼을 넘은 뒤 지하계 30층에서 우주계 관문을 찾을 수 있습니다."), targetId: null };
      if (!this.progress.isCosmosUnlocked()) return { stage: "unlock", title: this.deps._t("지하계 30층 도달"), detail: this.deps._t("나무꾼 이후 지하계를 내려가 우주계 관문을 여세요."), targetId: null };
      if (!state2.cleared.includes("planet-0")) return { stage: "entry", title: this.deps._t("시리온 관문 돌파"), detail: this.deps._t("중앙 관문을 클리어하면 첫 은하의 별길이 열립니다."), targetId: "planet-0" };
      for (const galaxy of GALAXY_SEQUENCE) {
        const bossId = `planet-${GALAXY_BOSS_PLANET_INDEX[galaxy]}`;
        if (state2.bossClears.includes(bossId)) continue;
        return this.cosmosGalaxyGuide(state2, galaxy, bossId);
      }
      const capstone = this.progress.getCosmosCapstoneProgress(state2);
      if (!capstone.eligibleSeason) {
        return { stage: "season", title: this.deps._t("루프 31 도달"), detail: this.deps._t("다섯 은하를 정복했습니다. 루프를 이어 최종 관문이 열리는 시점에 도달하세요."), targetId: null };
      }
      return capstone.canChallenge ? { stage: "capstone", title: this.deps._t("잔향체 아스트라 도전"), detail: this.deps._t("다섯 은하의 준비가 끝났습니다."), targetId: null } : { stage: "key", title: this.deps._t("표식: 잔향 확보"), detail: this.deps._t("은하 보스를 반복 처치해 아스트라 도전권을 확보하세요."), targetId: COSMOS_CAPSTONE_BOSS_IDS[0] };
    }
    cosmosGalaxyGuide(state2, galaxy, bossId) {
      const clearCount = this.progress.getGalaxyClearCount(state2, galaxy);
      const bossReady = clearCount >= GALAXY_BOSS_REQUIRED_CLEARS;
      const candidates = this.graph.nodes.filter((node) => node.orbit === galaxy && this.progress.getNodeStatus(node, state2) === "available" && (bossReady || node.tag !== "boss")).sort((a, b) => a.routeOrder - b.routeOrder);
      const target = bossReady ? this.graph.byId.get(bossId) : candidates[0];
      return {
        stage: bossReady ? "boss" : "stabilize",
        galaxy,
        title: bossReady ? this.deps._t("G{galaxy} 은하 보스 격파", { galaxy }) : this.deps._t("G{galaxy} 별길 안정화 {clearCount}/{value}", { galaxy, clearCount, value: GALAXY_BOSS_REQUIRED_CLEARS }),
        detail: bossReady ? "보스를 격파해 우주석과 다음 은하를 여세요." : "연결된 노드를 클리어하고 성도술 포인트를 얻으세요.",
        targetId: target ? target.id : bossId,
        current: clearCount,
        target: GALAXY_BOSS_REQUIRED_CLEARS
      };
    }
    getCosmosNodeEstimateZone(id) {
      this.graph.buildCosmosAtlasData();
      const node = this.graph.byId.get(id);
      return node ? this.createCosmosEstimateZone(node, this.getCosmosNodeMechanic(node)) : null;
    }
    cosmosReadinessBonuses(node, masteryAlreadyActive) {
      const damageBonus = masteryAlreadyActive ? 1 : 1 + this.progress.getCosmosMasteryValue("resonanceDrive") * 6e-3;
      const bossBonus = !masteryAlreadyActive && node && node.tag === "boss" ? 1 + this.progress.getCosmosMasteryValue("starbreaker") * 0.018 : 1;
      const guardMul = masteryAlreadyActive ? 1 : Math.max(0.5, 1 - this.progress.getCosmosMasteryValue("riftGuard") * 7e-3);
      return { damageBonus, bossBonus, guardMul };
    }
  };

  // modules/domain/cosmos-atlas-rewards.mjs
  var CosmosAtlasRewards = class {
    constructor(deps, services) {
      this.deps = deps;
      this.rules = services.rules;
      this.state = services.state;
      this.progress = services.progress;
      this.graph = services.graph;
      this.directives = services.directives;
      this.stones = services.stones;
    }
    *forceCosmosBossDrop(spec, tier) {
      const candidates = [];
      if (Array.isArray(spec.equipment) && spec.equipment.length > 0) candidates.push("equipment");
      if (spec.jewel) candidates.push("jewel");
      if (spec.talisman) candidates.push("talisman");
      const chosen = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
      if (chosen === "equipment") return !!(yield* this.grantCosmosBossEquipment(spec, tier, true));
      if (chosen === "jewel") return !!(yield* this.grantCosmosBossJewel(spec, true));
      if (chosen === "talisman") return !!(yield* this.grantCosmosBossTalisman(spec, true));
      return false;
    }
    getCosmosBossRewardSpec(node) {
      if (!node || node.tag !== "boss") return null;
      const db = this.deps.COSMOS_BOSS_REWARD_DB || {};
      return db[node.id] || null;
    }
    createCosmosBossJewel(row) {
      if (!row) return null;
      const stats = (row.stats || []).map((stat) => ({
        id: stat.id,
        val: Number(stat.val || 0),
        valMin: Number(stat.val || 0),
        valMax: Number(stat.val || 0),
        tier: 1,
        statName: typeof this.deps.getStatName === "function" ? this.deps.getStatName(stat.id) : stat.id
      }));
      const jewel = { id: Date.now() + Math.floor(Math.random() * 1e5), uniqueId: row.id, name: row.name, rarity: "unique", uniqueEffect: row.uniqueEffect || "", source: "cosmosBoss", stats };
      if (row.cosmosKeystoneJewel) {
        jewel.cosmosKeystoneJewel = true;
        jewel.cosmosKeystone = typeof this.deps.pickRandomAscendKeystoneId === "function" ? this.deps.pickRandomAscendKeystoneId() : null;
      }
      return jewel;
    }
    pickCosmosBossEquipmentName(spec) {
      const names = spec && Array.isArray(spec.equipment) ? spec.equipment : [];
      const uniqueDb = Array.isArray(this.deps.UNIQUE_DB) ? this.deps.UNIQUE_DB : [];
      const chaseNames = names.filter((name) => uniqueDb.some((item) => item && item.name === name && item.cosmosChase));
      const regularNames = names.filter((name) => !chaseNames.includes(name));
      if (chaseNames.length > 0 && Math.random() < 0.08) {
        return chaseNames[Math.floor(Math.random() * chaseNames.length)];
      }
      const pool = regularNames.length > 0 ? regularNames : names;
      return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    }
    rollCosmosEquipmentChance(spec, force) {
      if (!spec || !Array.isArray(spec.equipment) || spec.equipment.length <= 0) return false;
      return force || Math.random() < COSMOS_BOSS_EQUIPMENT_DROP_CHANCE;
    }
    rollCosmosBossEquipment(spec, tier, force) {
      if (!this.rollCosmosEquipmentChance(spec, force)) return false;
      if (!this.deps.game || !Array.isArray(this.deps.game.inventory)) return false;
      if (typeof this.deps.generateUniqueItem !== "function") return false;
      const uniqueName = this.pickCosmosBossEquipmentName(spec);
      const item = uniqueName ? this.deps.generateUniqueItem(Math.max(1, Math.floor(tier || 1)), null, uniqueName) : null;
      return item;
    }
    *grantCosmosBossEquipment(spec, tier, force) {
      const item = this.rollCosmosBossEquipment(spec, tier, force);
      if (!item) return false;
      if (typeof this.deps.addItemToInventory === "function") this.deps.addItemToInventory(item, { guaranteedKeep: true });
      else this.deps.game.inventory.push(item);
      this.deps.game.noti = this.deps.game.noti || {};
      this.deps.game.noti.items = true;
      if (this.deps.canLog) yield { kind: "addLog", args: [this.deps._t("🌌 우주계 보스 전용 고유 장비 획득: {name}", { name: item.name }), "loot-unique", { item }] };
      return true;
    }
    *grantCosmosBossJewel(spec, force) {
      if (!spec || !spec.jewel || !force && Math.random() >= COSMOS_BOSS_JEWEL_DROP_CHANCE) return false;
      if (!this.deps.game) return false;
      const jewel = this.createCosmosBossJewel(spec.jewel);
      if (!jewel) return false;
      return yield* this.storeCosmosBossJewel(jewel);
    }
    *storeCosmosBossJewel(jewel) {
      const overflow = !this.deps.bagItems.put(this.deps.bagItems.asJewel(jewel), this.deps.game);
      if (overflow) this.deps.bagItems.put(jewel, this.deps.game, true);
      this.deps.game.noti = this.deps.game.noti || {};
      this.deps.game.noti.items = true;
      if (this.deps.canLog) yield { kind: "addLog", args: [this.deps._t("💠 우주계 보스 전용 주얼 획득: {name}{value}", { name: jewel.name, value: overflow ? this.deps._t(" (공간 부족 보호)") : "" }), "loot-unique", { item: jewel, itemKind: "jewel" }] };
      return true;
    }
    *grantCosmosBossTalisman(spec, force) {
      if (!spec || !spec.talisman || !force && Math.random() >= COSMOS_BOSS_TALISMAN_DROP_CHANCE) return false;
      const talisman = this.deps.stumpBox.addTalisman(this.deps.game, this.deps.talismans.fromCosmos(spec.talisman), true);
      if (!talisman) return false;
      this.deps.game.noti = this.deps.game.noti || {};
      this.deps.game.noti.stump = true;
      if (this.deps.canLog) yield { kind: "addLog", args: [this.deps._t("🧿 우주계 보스 전용 부적 획득: {name}", { name: talisman.name }), "loot-unique"] };
      return true;
    }
    *grantCosmosBossExclusiveDrops(node) {
      const spec = this.getCosmosBossRewardSpec(node);
      if (!spec) return false;
      const tier = this.rules.getDisplayedNodeTier(node);
      const state2 = this.state.getState();
      const misses = Math.max(0, Math.min(39, Math.floor((state2.bossExclusiveMisses || {})[node.id] || 0)));
      const force = misses >= 39;
      let granted = false;
      if (force) granted = yield* this.forceCosmosBossDrop(spec, tier);
      else {
        granted = [
          yield* this.grantCosmosBossEquipment(spec, tier, false),
          yield* this.grantCosmosBossJewel(spec, false),
          yield* this.grantCosmosBossTalisman(spec, false)
        ].some(Boolean);
      }
      state2.bossExclusiveMisses[node.id] = granted ? 0 : Math.min(39, misses + 1);
      yield* this.reportCosmosExclusiveDrop(granted, force);
      return granted;
    }
    cloneCosmosBossRelic(spec, node) {
      const galaxy = Math.max(1, Math.min(5, Math.floor(node.orbit || 1)));
      return {
        id: `${spec.id}-${Date.now()}-${Math.floor(Math.random() * 1e5)}`,
        relicId: spec.id,
        bossId: node.id,
        galaxy,
        name: spec.name,
        rerollStoneOption: true
      };
    }
    tryRollBossRelic(node) {
      if (!node || node.tag !== "boss") return null;
      const specDb = this.deps.COSMOS_BOSS_RELIC_DB || {};
      const spec = specDb[node.id];
      if (!spec) return null;
      const state2 = this.state.getState();
      const relicBonus = this.progress.getCosmosMasteryValue("eliteHunt") * 7e-3;
      if (Math.random() >= 0.22 + relicBonus) return null;
      const relic = this.cloneCosmosBossRelic(spec, node);
      state2.bossRelics.push(relic);
      return relic;
    }
    completedCosmosNode(state2, nodeIdOverride) {
      const targetId = nodeIdOverride || state2.selectedId || "planet-0";
      const node = this.graph.byId.get(targetId);
      if (!node) return;
      const status = this.progress.getNodeStatus(node);
      const completedChallenge = state2.activeChallenge && state2.activeChallenge.nodeId === node.id;
      if (!completedChallenge || state2.activeChallenge.rewardSettled) return;
      return { node, status };
    }
    *exploreSelectedCosmosNode(nodeIdOverride) {
      this.graph.buildCosmosAtlasData();
      const state2 = this.state.getState();
      const completed = this.completedCosmosNode(state2, nodeIdOverride);
      if (!completed) return;
      const { node, status } = completed;
      const firstClear = !state2.cleared.includes(node.id);
      const defeatedBossStage = node.tag === "boss" ? this.progress.getBossStage(node) : 0;
      if (!["available", "cleared"].includes(status)) {
        if (this.deps.canLog) yield { kind: "addLog", args: ["아직 별길이 연결되지 않은 우주계 노드입니다.", "attack-monster"] };
        return;
      }
      yield* this.recordCosmosClear(state2, node, status);
      const directive = this.directives.getCompletedChallengeDirective(state2, node) || {};
      const { reward, jackpot, jackpotBonus } = this.calculateCosmosClearReward(node, firstClear, defeatedBossStage, directive);
      const skyPower = this.progress.grantCosmosSkyPower(reward + jackpotBonus);
      const jackpotPower = jackpot ? Math.max(1, Math.round(jackpotBonus / this.deps.COSMOS_SKY_POWER_PER_REWARD)) : 0;
      yield* this.reportCosmosClear(node, state2, { directive, skyPower, jackpot, jackpotPower });
      if (jackpot && this.deps.canToast) {
        yield { kind: "showGameToast", args: [this.deps._t("공명 잭팟, 창공의 정수 +{jackpotPower}", { jackpotPower }), { tone: "success", duration: 3800 }] };
      }
      if (node.tag === "boss") yield* this.grantCosmosBossExclusiveDrops(node);
      yield* this.finalizeCosmosExploration(state2, node, skyPower);
    }
    *reportCosmosBossClear(node, state2) {
      const kills = Math.max(0, Math.floor(state2.bossKills[node.id] || 0));
      if (kills === 1) yield { kind: "addLog", args: [this.deps._t("💠 {name} 첫 격파: {node} 획득", { name: node.name, node: this.stones.getBossStoneName(node) }), "loot-unique"] };
      if (kills === 1) yield { kind: "addLog", args: [this.deps._t("🧩 우주석 슬롯에 장착하면 우주계 난이도 바닥이 상승합니다."), "season-up"] };
      const relicDrop = this.tryRollBossRelic(node);
      if (relicDrop) yield { kind: "addLog", args: [this.deps._t("💠 보스 유물 획득: {name} (우주석 보스 옵션 리롤 재화)", { name: relicDrop.name }), "loot-unique"] };
    }
    *reportCosmosClear(node, state2, receipt) {
      if (!this.deps.canLog) return;
      const { directive, skyPower, jackpot, jackpotPower } = receipt;
      yield { kind: "addLog", args: [`${node.tag === "boss" ? this.deps._t("👑 우주계 은하 보스 격파") : this.deps._t("🌠 우주계 탐사 완료")}: ${node.name}, ${directive.name || this.deps._t("기본 탐사")}, 창공의 정수 +${skyPower}${node.tag === "boss" ? this.deps._t(", 난이도 바닥 Tier {cosmosTierFloor} 적용", { cosmosTierFloor: this.stones.getCosmosTierFloor() }) : ""}`, node.tag === "boss" ? "season-up" : node.kind === "planet" ? "loot-unique" : "loot-magic"] };
      if (jackpot) yield { kind: "addLog", args: [this.deps._t("🌌 공명 잭팟! {name} 보상 증가(창공의 정수 +{jackpotPower} 포함)", { name: directive.name || this.deps._t("탐사 신호"), jackpotPower }), "loot-unique"] };
      if (node.tag === "boss") yield* this.reportCosmosBossClear(node, state2);
    }
    calculateCosmosClearReward(node, firstClear, defeatedBossStage, directive) {
      const rewardBase = node.tag === "boss" ? 30 + node.orbit * 10 + defeatedBossStage * 10 : node.kind === "planet" ? 5 + node.orbit * 2 : 2 + node.orbit;
      const focusMul = node.kind === "planet" ? 1 + this.progress.getCosmosMasteryValue("combatFocus") * 0.01 : 1 + this.progress.getCosmosMasteryValue("craftFocus") * 0.01;
      const rewardMul = this.cosmosClearRewardMultiplier(node, firstClear);
      const directiveRewardMul = Math.max(0.1, Math.min(5, Number(directive.rewardMul) || 1));
      const reward = Math.max(1, Math.floor(rewardBase * rewardMul * focusMul * directiveRewardMul));
      const jackpotChance = Math.max(0, Math.min(0.5, Number(directive.jackpotChance) || 0));
      const jackpot = jackpotChance > 0 && Math.random() < jackpotChance;
      const jackpotBonus = jackpot ? Math.max(1, Math.floor(reward * Math.max(0, Number(directive.jackpotBonusMul) || 0))) : 0;
      return { reward, jackpot, jackpotBonus };
    }
    *finalizeCosmosExploration(state2, node, reward) {
      state2.activeChallenge.rewardSettled = true;
      this.deps.cosmosRouteRuntime.complete(this.deps.game, node.id, reward);
      this.directives.advanceCosmosDirectiveCycle(state2, node.id);
      yield { kind: "renderCosmosAtlas", args: [] };
    }
    *reportCosmosExclusiveDrop(granted, force) {
      if (granted && force && this.deps.canLog) yield { kind: "addLog", args: ["🌠 누적된 성간 공명이 우주계 보스 전용 보상을 확정했습니다.", "loot-unique"] };
      if (granted && this.deps.canRefresh) yield { kind: "updateStaticUI", args: [] };
    }
    recordCosmosBossClear(state2, node) {
      if (node.tag === "boss" && !state2.bossClears.includes(node.id)) state2.bossClears.push(node.id);
      const nextKill = Math.max(0, Math.floor(state2.bossKills && state2.bossKills[node.id] || 0)) + 1;
      state2.bossKills[node.id] = nextKill;
      const g = String(Math.max(1, Math.min(5, Math.floor(node.orbit || 1))));
      if (!state2.bossStones[g]) {
        state2.bossStones[g] = this.stones.getBossStoneName(node);
        this.stones.ensureCosmosStoneOptions(state2, Number(g));
      }
    }
    *recordCosmosClear(state2, node, status) {
      if (status === "available" && !state2.cleared.includes(node.id)) state2.cleared.push(node.id);
      if (node.kind === "planet" && typeof this.deps.markLoopCosmosPlanetClear === "function") {
        const completedLoopGate = this.deps.markLoopCosmosPlanetClear(node.id);
        if (completedLoopGate && this.deps.canLog) yield { kind: "addLog", args: ["🪐 루프 대체 경로 달성: 우주계 에니프론 행성 돌파", "season-up"] };
      }
      if (node.tag === "boss") this.recordCosmosBossClear(state2, node);
    }
    cosmosClearRewardMultiplier(node, firstClear) {
      const rewardMul = 1 + this.progress.getCosmosMasteryValue("stardustGain") * 0.01 + this.progress.getCosmosMasteryValue("highRisk") * 0.022 + this.progress.getCosmosMasteryValue("warpEfficiency") * 0.01 + (node.kind === "asteroid" ? this.progress.getCosmosMasteryValue("asteroidRelief") * 0.016 : 0) + (node.tag === "boss" ? this.progress.getCosmosMasteryValue("bossBounty") * 0.022 + this.progress.getCosmosMasteryValue("apexProtocol") * 0.018 : 0) + this.progress.getCosmosMasteryValue("echoCache") * 0.01 + (node.kind === "asteroid" ? this.progress.getCosmosMasteryValue("stellarForge") * 9e-3 : 0) + (node.orbit >= 4 ? this.progress.getCosmosMasteryValue("frontierTax") * 0.013 : 0) + (firstClear ? this.progress.getCosmosMasteryValue("chainMastery") * 0.02 : 0);
      return rewardMul;
    }
  };

  // modules/combat/cosmos-atlas-encounters.mjs
  var CosmosAtlasEncounters = class {
    constructor(deps, services) {
      this.deps = deps;
      this.rules = services.rules;
      this.directives = services.directives;
      this.state = services.state;
      this.graph = services.graph;
    }
    startCosmosBattle(node) {
      if (!this.deps.game || !node) return;
      const tier = this.rules.getCosmosChallengeTier(node);
      const lootTier = this.rules.getDisplayedNodeTier(node);
      const mechanic = this.rules.getCosmosNodeMechanic(node);
      const directive = this.directives.getSelectedCosmosDirective(node);
      const recommendation = this.rules.getCosmosNodeRecommendation(node);
      const state2 = this.state.getState();
      state2.activeChallenge = {
        ...this.cosmosChallengeIdentity(node, mechanic),
        route: this.deps.cosmosRouteRuntime.current(this.deps.game) === node.id,
        habitat: this.deps.cosmosRouteRuntime.habitat(this.deps.game, node.id),
        tier,
        lootTier,
        recommendedDps: recommendation ? recommendation.target.dps : 0,
        recommendedEhp: recommendation ? recommendation.target.ehp : 0,
        directive: this.directives.createCosmosDirectiveSnapshot(directive)
      };
      this.deps.game.currentZoneId = "cosmos_challenge";
      this.deps.game.killsInZone = 0;
      this.deps.game.enemies = [];
      this.deps.game.encounterPlan = [];
      this.deps.game.encounterIndex = 0;
      this.deps.game.runProgress = 0;
      this.deps.game.moveTimer = 0;
      this.deps.game.combatHalted = false;
      if (typeof this.deps.startMoving === "function") this.deps.startMoving(!this.deps.cosmosRouteRuntime.active(this.deps.game));
    }
    cosmosChallengeIdentity(node, mechanic) {
      return {
        nodeId: node.id,
        galaxy: node.orbit,
        name: node.name,
        gravity: Math.max(1, Number(node.gravity || 1)),
        sizeClass: Math.max(1, Math.floor(node.sizeClass || 1)),
        tag: node.baseTag || node.tag || "",
        theme: node.theme || "",
        mechanicId: mechanic ? mechanic.id : "",
        ele: mechanic ? mechanic.element : "chaos"
      };
    }
    *continueCosmosChallengeAfterClear(mapAction) {
      if (this.state.getState().activeChallenge?.route) return yield* this.continueCosmosRouteAfterClear();
      if (mapAction === "repeatZone") return yield* this.repeatCosmosChallenge();
      if (mapAction !== "nextZone" && mapAction !== "nextLoopBestPlusOne") return false;
      const guide = this.rules.getCosmosProgressGuide();
      const node = guide.targetId ? this.graph.byId.get(guide.targetId) : null;
      if (!node || !this.rules.canChallengeNode(node)) return false;
      const state2 = this.state.getState();
      state2.selectedId = node.id;
      if (this.deps.canLog) yield { kind: "addLog", args: [this.deps._t("🧭 다음 천체 자동 탐사: {name}", { name: node.name }), "season-up"] };
      this.startCosmosBattle(node);
      return true;
    }
    *repeatCosmosChallenge() {
      const state2 = this.state.getState();
      const currentNode = this.graph.byId.get(state2.activeChallenge?.nodeId);
      if (!this.rules.canChallengeNode(currentNode)) return false;
      state2.selectedId = currentNode.id;
      if (this.deps.canLog) yield { kind: "addLog", args: [this.deps._t("우주계 반복 탐사: {name}", { name: currentNode.name }), "season-up"] };
      this.startCosmosBattle(currentNode);
      return true;
    }
    *continueCosmosRouteAfterClear() {
      this.graph.buildCosmosAtlasData();
      const id = this.deps.cosmosRouteRuntime.current(this.deps.game);
      const node = this.graph.byId.get(id);
      if (node && this.rules.canChallengeNode(node)) {
        this.startCosmosBattle(node);
        return true;
      }
      if (node) this.deps.cosmosRouteRuntime.stop(this.deps.game);
      this.deps.game.combatHalted = true;
      this.deps.game.enemies = [];
      this.deps.game.encounterPlan = [];
      this.deps.game.encounterIndex = 0;
      this.deps.game.runProgress = 0;
      this.deps.game.moveTimer = 0;
      yield* this.notifyCosmosRouteStop();
      return true;
    }
    *notifyCosmosRouteStop() {
      const challenge = this.state.getState().activeChallenge;
      if (!challenge || challenge.routeStopNotified) return;
      challenge.routeStopNotified = true;
      const text = "관문권 항로 탐사가 종료되었습니다.";
      if (this.deps.canLog) yield { kind: "addLog", args: [text, "season-up"] };
      if (!this.deps.game.isBackgroundCalculation && this.deps.canToast) {
        yield { kind: "showGameToast", args: [text, { duration: 5e3 }] };
      }
    }
  };

  // modules/ui/cosmos-atlas-records.mjs
  function getCosmosTierFloorTooltipHtml(view2) {
    const current = view2.stones.getCosmosTierFloor();
    const baseFloors = COSMOS_STONE_TIER_FLOORS.slice(1, 6);
    const floorText = baseFloors.map((tier) => {
      const style = tier === current ? "color:#ffd98a;font-weight:800;text-shadow:0 0 8px rgba(255,217,138,.65);" : "color:var(--copy-bright);";
      return `<span style="${style}">${tier}</span>`;
    }).join(" / ");
    return `<div class="tooltip-line">${view2.deps._t("우주계 최소 티어 보정 {floorText}", { floorText })}</div>`;
  }
  function buildCosmosStoneOverlayHtml(view2, state2) {
    return `<div class="cosmos-stone-overlay-inner">
            <div class="cosmos-stone-overlay-head">
                <span>${view2.deps._t("💠 우주석 장착")}</span>
                <button type="button" class="cosmos-stone-overlay-close" data-cosmos-action="close-stones">✕</button>
            </div>
            ${view2.renderCosmosStonePanel(state2)}
        </div>`;
  }
  function buildCosmosStoneTooltipHtml(view2, galaxy) {
    const state2 = view2.state.getState();
    const g = Math.max(1, Math.min(6, Math.floor(galaxy || 1)));
    const acquired = view2.state.isCosmosStoneAcquired(state2, g);
    const options = acquired ? view2.stones.ensureCosmosStoneOptions(state2, g) : [];
    const lines = options.map((option) => `<div class="tooltip-line">${view2.deps.escapeHTML(view2.stones.getCosmosStoneOptionText(option))}</div>`).join("") || '<div class="tooltip-line">아직 획득하지 않았습니다.</div>';
    return `<div class="tooltip-title">${view2.deps.escapeHTML(view2.stones.getCosmosStoneNameByGalaxy(g))}</div>${view2.getCosmosTierFloorTooltipHtml()}<div class="tooltip-line" style="color:var(--copy-bright);">${view2.deps._t("보스 유물 사용: 무작위 1줄을 해당 우주석의 보스 옵션으로 리롤")}</div>${lines}`;
  }
  function renderCosmosStonePanel(view2, state2) {
    const relicCount = Array.isArray(state2.bossRelics) ? state2.bossRelics.length : 0;
    const cardGalaxies = view2.state.hasSixthCosmosStoneUnlock() ? [1, 2, 3, 4, 5, 6] : [1, 2, 3, 4, 5];
    const cards = cardGalaxies.map((g) => {
      const acquired = view2.state.isCosmosStoneAcquired(state2, g);
      const equipped = !!(state2.equippedStones && state2.equippedStones[String(g)]);
      const usableRelic = Array.isArray(state2.bossRelics) && view2.stones.findCosmosBossRelicIndexForStone(state2.bossRelics, g) >= 0;
      const options = acquired ? view2.stones.ensureCosmosStoneOptions(state2, g) : [];
      const optionHtml = options.map((option) => `<div class="cosmos-stone-option ${option.boss ? "boss" : ""}">${view2.deps.escapeHTML(view2.stones.getCosmosStoneOptionText(option))}</div>`).join("") || '<div class="cosmos-stone-option empty">미획득</div>';
      return `<article class="cosmos-stone-card ${acquired ? "acquired" : "locked"} ${equipped ? "equipped" : ""}" data-info-tooltip-anchor="1" data-cosmos-stone-tip="${g}"><div class="cosmos-stone-orb"><i></i><b>G${g}</b></div><div class="cosmos-stone-card-body"><header><b>${view2.deps.escapeHTML(view2.stones.getCosmosStoneNameByGalaxy(g))}</b><span>${equipped ? view2.deps._t("장착 중") : acquired ? view2.deps._t("보유") : view2.deps._t("미획득")}</span></header><small>${view2.deps._t("최소 티어 T{cosmosTierFloor}", { cosmosTierFloor: view2.stones.getCosmosTierFloor() })}</small><div class="cosmos-stone-options">${optionHtml}</div>${cosmosStoneControls(view2, g, { acquired, equipped, usableRelic })}</div></article>`;
    }).join("");
    return `<section class="cosmos-stone-panel"><header><strong>${view2.deps._t("우주석 성좌")}</strong><span>${view2.deps._t("보스 유물 {relicCount}개", { relicCount })}</span></header><div class="cosmos-stone-grid">${cards}</div></section>`;
  }
  function renderSummary(view2) {
    if (!view2.ui.summary) return;
    const state2 = view2.state.getState();
    const cleared = state2.cleared.length;
    const available = view2.graph.nodes.filter((node) => view2.progress.getNodeStatus(node, state2) === "available").length;
    const planetsCleared = view2.graph.nodes.filter((n) => n.kind === "planet" && state2.cleared.includes(n.id)).length;
    const asteroidsCleared = view2.graph.nodes.filter((n) => n.kind === "asteroid" && state2.cleared.includes(n.id)).length;
    const unlocked = view2.progress.isCosmosUnlocked();
    const capstone = view2.progress.getCosmosCapstoneProgress(state2);
    const galaxyProgress = GALAXY_SEQUENCE.map((galaxy) => {
      const total = view2.graph.nodes.filter((node) => node.orbit === galaxy).length;
      const complete = view2.graph.nodes.filter((node) => node.orbit === galaxy && state2.cleared.includes(node.id)).length;
      return `<span><b>G${galaxy}</b><i><em style="width:${total > 0 ? Math.floor(complete / total * 100) : 0}%"></em></i><small>${complete}/${total}</small></span>`;
    }).join("");
    const { capstoneState, capstoneMessage } = cosmosCapstoneStatus(capstone);
    const capstoneBosses = capstone.bosses.map((row) => `
            <button type="button" class="cosmos-capstone-boss ${row.cleared ? "cleared" : "missing"}"
                data-cosmos-action="capstone" data-cosmos-value="${row.id}"
                data-tip="${row.cleared ? view2.deps._t("이번 루프 격파 완료") : view2.deps._t("아틀라스에서 위치 확인")}">
                <span>G${row.galaxy}</span>${view2.deps.escapeHTML(view2.deps._t(row.name))}<b>${row.cleared ? "✓" : "○"}</b>
            </button>`).join("");
    const capstoneAction = capstone.ready ? `<button type="button" class="cosmos-capstone-action" data-cosmos-action="capstone-panel">${view2.deps._t("잔향체 아스트라 위치 열기")}</button>` : "";
    view2.ui.summary.innerHTML = `
            <div class="cosmos-summary-metrics">
                <div><span>${view2.deps._t("탐사 완료")}</span><strong>${cleared}<small> / ${view2.graph.nodes.length}</small></strong></div>
                <div><span>${view2.deps._t("개별 탐사 가능")}</span><strong>${view2.deps._t("{count}개", { count: unlocked ? available : 0 })}</strong></div>
                <div><span>${view2.deps._t("성도술")}</span><strong>${view2.progress.getCosmosMasteryFreePoints()}<small> / ${view2.progress.getCosmosMasteryTotalPoints()}</small></strong></div>
                <div data-tip="${view2.deps._t("창공의 정수는 우주계 탐사, 은하 보스에서 얻고 룬 강화와 룬 각인에 씁니다.")}"><span>${view2.deps._t("창공의 정수")}</span><strong>${view2.progress.getSkyPowerBalance()}</strong></div>
            </div>
            <div class="cosmos-progress-overview"><div class="cosmos-galaxy-progress">${galaxyProgress}</div>
                <div class="cosmos-resource-line"><span>${view2.deps._t("행성 {planetsCleared}/50, 소행성 {asteroidsCleared}/75", { planetsCleared, asteroidsCleared })}</span><span>보스 유물 ${(state2.bossRelics || []).length}, 우주석 ${view2.state.getEquippedCosmosStoneCount(state2)}/${view2.state.hasSixthCosmosStoneUnlock() ? 6 : 5}</span></div></div>
            <details class="cosmos-capstone-card ${capstoneState}" data-ui-disclosure="cosmos-capstone">
                <summary class="cosmos-capstone-head"><span>${view2.deps._t("최종 관문")}</span><strong>${view2.deps._t("잔향체 아스트라 {clearedCount}/{total}, 표식 {keyCount}", { clearedCount: capstone.clearedCount, total: capstone.total, keyCount: capstone.keyCount })}</strong></summary>
                <div class="cosmos-capstone-bosses">${capstoneBosses}</div>
                <p>${view2.deps.escapeHTML(capstoneMessage)}</p>
                <div class="cosmos-capstone-footer"><span>${view2.deps._t("표식: 잔향")} <b>${capstone.keyCount}</b></span>${capstoneAction}</div>
            </details>`;
  }
  function renderMasteryPanel(view2) {
    const el = view2.deps.document.getElementById("cosmos-inner-mastery");
    if (!el) return;
    const freePoints = view2.progress.getCosmosMasteryFreePoints();
    if (el.style.display === "none") return;
    const totalPoints = view2.progress.getCosmosMasteryTotalPoints();
    const cards = COSMOS_MASTERY_NODES.map((node) => {
      const value = view2.progress.getCosmosMasteryValue(node.key);
      const lockReason = view2.progress.getCosmosMasteryLockReason(node.key);
      const canSpend = freePoints >= node.cost && value < node.max && !lockReason;
      const stateClass = lockReason ? "locked" : value >= node.max ? "maxed" : canSpend ? "available" : "";
      const linkLine = cosmosMasteryLinkLine(node);
      return `<article class="cosmos-mastery-card ${stateClass}">
                <div class="cosmos-mastery-card-head"><div><span>${lockReason ? view2.deps._t("잠김") : value >= node.max ? view2.deps._t("완성") : view2.deps._t("별길")}</span><strong>${view2.deps._t(node.name)}</strong></div><b>${value}/${node.max}</b></div>
                <div class="cosmos-mastery-progress"><i style="width:${Math.floor(value / node.max * 100)}%"></i></div>
                <p>${view2.deps._t(node.desc)}</p>
                <div class="cosmos-mastery-card-foot"><small>${lockReason || linkLine}</small><button type="button" data-cosmos-action="mastery" data-cosmos-value="${node.key}" ${canSpend ? "" : "disabled"}>${view2.deps._t("투자, {cost}P", { cost: node.cost })}</button></div>
            </article>`;
    }).join("");
    const html = `<div class="cosmos-mastery-header"><div><div class="cosmos-kicker">${view2.deps._t("별의 숙련")}</div><div class="cosmos-detail-title">${view2.deps._t("성도술 항로")}</div><p>${view2.deps._t("탐사 완료로 얻은 포인트를 연결된 항로에 투자하세요.")}</p></div><div class="cosmos-mastery-points"><span>${view2.deps._t("사용 가능")}<strong>${freePoints}</strong></span><span>${view2.deps._t("누적 획득")}<strong>${totalPoints}</strong></span></div></div><div class="cosmos-mastery-grid">${cards}</div>`;
    if (el.__masteryHtml !== html || !el.firstElementChild) {
      el.innerHTML = html;
      el.__masteryHtml = html;
    }
  }
  function cosmosStoneControls(view2, g, state2) {
    const { acquired, equipped, usableRelic } = state2;
    return `<div class="cosmos-stone-actions"><button data-cosmos-action="equip" data-cosmos-value="${g}" ${acquired && !equipped ? "" : "disabled"}>${view2.deps._t("장착")}</button><button data-cosmos-action="unequip" data-cosmos-value="${g}" ${equipped ? "" : "disabled"}>${view2.deps._t("해제")}</button><button data-cosmos-action="inscribe" data-cosmos-value="${g}" ${acquired && usableRelic ? "" : "disabled"} data-tip="${usableRelic ? view2.deps._t("이 우주석 전용 보스 유물 사용") : view2.deps._t("이 우주석에 맞는 보스 유물이 없습니다")}">${view2.deps._t("유물 각인")}</button></div>`;
  }
  function cosmosCapstoneStatus(capstone) {
    const capstoneState = !capstone.eligibleSeason ? "locked" : capstone.canChallenge ? "ready" : capstone.ready ? "key-needed" : "progress";
    const capstoneMessage = !capstone.eligibleSeason ? "루프 31부터 다섯 은하 보스를 같은 루프에 격파하면 최종 관문이 열립니다." : capstone.canChallenge ? "표식과 격파 조건을 모두 갖췄습니다. 잔향체 아스트라에 도전할 수 있습니다." : capstone.ready ? "격파 조건 완료, 은하 보스를 반복 처치해 「표식: 잔향」을 확보하세요." : `이번 루프 미격파: ${capstone.missing.map((row) => row.name).join(", ")}`;
    return { capstoneState, capstoneMessage };
  }
  function cosmosMasteryLinkLine(node) {
    const links = COSMOS_MASTERY_LINKS[node.key] || [];
    const linkLine = links.length ? links.map((link) => {
      const [key, level] = String(link).split(":");
      const required = COSMOS_MASTERY_NODES.find((row) => row.key === key);
      return `${required ? required.name : key} ${Math.max(1, Math.floor(Number(level || 1)))}Lv`;
    }).join(", ") : "시작 노드";
    return linkLine;
  }

  // modules/ui/cosmos-atlas-detail.mjs
  function getStatusLabel(view2, status) {
    if (status === "cleared") return "탐사 완료";
    if (status === "available") return "탐사 가능";
    return "별길 잠김";
  }
  function renderCosmosDifficultySection(view2, node) {
    const model = view2.rules.getCosmosNodeRecommendation(node);
    if (!model || !model.readiness) return "";
    const ready = model.readiness;
    const label = view2.deps._t("권장 전투력 {value}", { value: ready.meetsRecommendation ? view2.deps._t("달성") : view2.deps._t("미달성") });
    return `<div class="cosmos-detail-section cosmos-readiness">
            <div class="cosmos-section-label">${view2.deps._t("전투 준비도")}</div>
            <div class="cosmos-power-grid map-power-estimate" tabindex="0" aria-label="${label}" data-info-tooltip-anchor="1" data-player-dps="${Math.round(ready.playerDps)}" data-recommended-dps="${Math.round(ready.recommendedDps)}" data-player-ehp="${Math.round(ready.playerEhp)}" data-recommended-ehp="${Math.round(ready.recommendedEhp)}" data-limiting-element="${ready.element}" data-cosmos-power-tip><span><strong class="map-power-grade grade-${ready.meetsRecommendation ? "high" : "low"}">${label}</strong></span></div>
        </div>`;
  }
  function renderGalaxyGateLine(view2, node, state2) {
    if (!node || node.orbit <= 0) return "";
    const clears = view2.progress.getGalaxyClearCount(state2, node.orbit);
    const ready = clears >= GALAXY_BOSS_REQUIRED_CLEARS;
    return `<div class="cosmos-gate-line ${ready ? "ready" : ""}"><span>${view2.deps._t("은하 안정도")}</span><strong>${Math.min(GALAXY_BOSS_REQUIRED_CLEARS, clears)}/${GALAXY_BOSS_REQUIRED_CLEARS}</strong><small>${ready ? view2.deps._t("은하 보스 도전 가능") : view2.deps._t("보스 해금까지 {value}개 노드", { value: GALAXY_BOSS_REQUIRED_CLEARS - clears })}</small></div>`;
  }
  function formatCosmosDirectivePressure(view2, multiplier) {
    const pct = Math.round((Math.max(0, Number(multiplier) || 1) - 1) * 100);
    return `${pct > 0 ? "+" : ""}${pct}%`;
  }
  function renderCosmosDirectiveCard(view2, node, directive, selected, disabled) {
    const chance = Math.round(Math.max(0, Number(directive.jackpotChance) || 0) * 100);
    const className = ["cosmos-directive-card", selected ? "selected" : "", directive.rare ? "rare" : ""].filter(Boolean).join(" ");
    return `<button type="button" class="${className}" data-cosmos-directive-node="${view2.deps.escapeHTML(node.id)}" data-cosmos-directive-id="${view2.deps.escapeHTML(directive.id)}" aria-pressed="${selected ? "true" : "false"}" ${disabled ? "disabled" : ""}>
            <span class="cosmos-directive-card-head"><small>${view2.deps.escapeHTML(directive.signal || "SIGNAL")}</small>${cosmosDirectiveBadge(view2, directive, selected)}</span>
            <strong>${view2.deps.escapeHTML(view2.deps._t(directive.name))}</strong>
            <span class="cosmos-directive-desc">${view2.deps.escapeHTML(view2.deps._t(directive.description))}</span>
            <span class="cosmos-directive-risk"><i>${view2.deps._t("생명력 {enemyHpMul}", { enemyHpMul: view2.formatCosmosDirectivePressure(directive.enemyHpMul) })}</i><i>${view2.deps._t("피해 {enemyDamageMul}", { enemyDamageMul: view2.formatCosmosDirectivePressure(directive.enemyDamageMul) })}</i><i>${view2.deps._t("속도 {enemyAttackSpeedMul}", { enemyAttackSpeedMul: view2.formatCosmosDirectivePressure(directive.enemyAttackSpeedMul) })}</i></span>
            <span class="cosmos-directive-reward"><b>${view2.deps._t("보상 ×{rewardMul}", { rewardMul: Number(directive.rewardMul || 1).toFixed(2) })}</b><em>${chance > 0 ? view2.deps._t("공명 잭팟 {chance}%", { chance }) : view2.deps._t("잭팟 없음")}</em></span>
        </button>`;
  }
  function renderCosmosDirectiveSection(view2, node, state2) {
    const status = view2.progress.getNodeStatus(node);
    const choices = view2.directives.getCosmosDirectiveChoicesForNode(node, state2);
    if (choices.length === 0) return "";
    const selected = view2.directives.getSelectedCosmosDirective(node, state2);
    const fighting = view2.deps.game.currentZoneId === "cosmos_challenge" && state2.activeChallenge && state2.activeChallenge.nodeId === node.id;
    const disabled = !view2.rules.canChallengeNode(node) || fighting;
    const cards = choices.map((row) => view2.renderCosmosDirectiveCard(node, row, selected && row.id === selected.id, disabled)).join("");
    let hint = status === "cleared" ? "새 신호가 포착되었습니다. 원하는 항로로 재탐사하세요." : "탐사 완료 후 무작위 신호 2개가 갱신됩니다.";
    if (fighting) hint = "현재 탐사에 고정됨";
    return `<section class="cosmos-directive-section"><div class="cosmos-directive-title"><span>${view2.deps._t("탐사 신호 선택")}</span><small>${hint}</small></div><div class="cosmos-directive-list">${cards}</div></section>`;
  }
  function getCosmosChallengeButtonLabel(view2, node, status) {
    if (node && node.tag === "boss") return status === "cleared" ? "은하 보스 재도전" : "은하 보스 도전";
    return status === "cleared" ? "새 신호 재탐사" : "전투 도전";
  }
  function renderDetail(view2) {
    if (!view2.ui.detail) return;
    const state2 = view2.state.getState();
    const node = view2.graph.byId.get(view2.state.getState().selectedId) || view2.graph.byId.get("planet-0");
    const status = view2.progress.getNodeStatus(node);
    const available = view2.rules.canChallengeNode(node) && !view2.deps.cosmosRouteRuntime.active(view2.deps.game);
    const reward = node.tag === "boss" ? view2.deps._t("첫 격파, {node}", { node: view2.stones.getBossStoneName(node) }) : view2.deps._t("창공의 정수, {value}", { value: node.kind === "planet" ? view2.deps._t("행성 보상") : view2.deps._t("제작 재료") });
    view2.ui.detail.innerHTML = `
            <div class="cosmos-detail-hero"><div class="cosmos-detail-title">${view2.deps.escapeHTML(view2.deps._t(node.name))}</div>
                <span class="cosmos-status ${status}">${view2.getStatusLabel(status)}</span></div>
            ${view2.renderCosmosDifficultySection(node)}
            ${view2.renderGalaxyGateLine(node, state2)}
            <div class="cosmos-actions">
                <button class="primary" data-exploration-departure data-cosmos-action="challenge" ${available ? "" : "disabled"}>${view2.getCosmosChallengeButtonLabel(node, status)}</button>
                <button data-cosmos-action="stones">${view2.deps._t("우주석 관리")}</button>
                <button data-cosmos-action="close-detail">${view2.deps._t("닫기")}</button>
            </div>
            <details data-ui-disclosure="cosmos-selected-conditions"><summary>${view2.deps._t("전투 조건, 보상")}</summary>
                <p class="cosmos-reward-line">${view2.deps.escapeHTML(reward)}</p>
                ${view2.renderCosmosDirectiveSection(node, state2)}
            </details>`;
  }
  function cosmosDirectiveBadge(view2, directive, selected) {
    if (selected) return view2.deps._t("<b>선택됨</b>");
    return directive.rare ? view2.deps._t("<b>희귀 신호</b>") : "";
  }

  // modules/common/consume-commands.mjs
  function consumeDomainCommands(commands, effects) {
    let step = commands.next();
    while (!step.done) step = commands.next(effects[step.value.kind](...step.value.args));
    return step.value;
  }

  // modules/ui/view-events.mjs
  function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
  }
  function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
      target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
  }

  // modules/ui/cosmos-atlas-view.mjs
  var CosmosAtlasView = class {
    constructor(deps, services) {
      this.deps = deps;
      this.active = true;
      this.listeners = [];
      this.ui = { detail: null, summary: null, installed: false, stoneOverlayOpen: false };
      this.state = services.state;
      this.graph = services.graph;
      this.progress = services.progress;
      this.rules = services.rules;
      this.encounters = services.encounters;
      this.directives = services.directives;
      this.stones = services.stones;
      this.rewards = services.rewards;
      this.getCosmosTierFloorTooltipHtml = getCosmosTierFloorTooltipHtml.bind(void 0, this);
      this.buildCosmosStoneOverlayHtml = buildCosmosStoneOverlayHtml.bind(void 0, this);
      this.buildCosmosStoneTooltipHtml = buildCosmosStoneTooltipHtml.bind(void 0, this);
      this.renderCosmosStonePanel = renderCosmosStonePanel.bind(void 0, this);
      this.renderSummary = renderSummary.bind(void 0, this);
      this.renderMasteryPanel = renderMasteryPanel.bind(void 0, this);
      this.getStatusLabel = getStatusLabel.bind(void 0, this);
      this.renderCosmosDifficultySection = renderCosmosDifficultySection.bind(void 0, this);
      this.renderGalaxyGateLine = renderGalaxyGateLine.bind(void 0, this);
      this.formatCosmosDirectivePressure = formatCosmosDirectivePressure.bind(void 0, this);
      this.renderCosmosDirectiveCard = renderCosmosDirectiveCard.bind(void 0, this);
      this.renderCosmosDirectiveSection = renderCosmosDirectiveSection.bind(void 0, this);
      this.getCosmosChallengeButtonLabel = getCosmosChallengeButtonLabel.bind(void 0, this);
      this.renderDetail = renderDetail.bind(void 0, this);
    }
    refreshCosmosStoneOverlay() {
      const el = this.deps.document.getElementById("cosmos-stone-overlay");
      if (!el || !this.ui.stoneOverlayOpen) return;
      el.innerHTML = this.buildCosmosStoneOverlayHtml(this.state.getState());
    }
    openCosmosStoneOverlay() {
      const el = this.deps.document.getElementById("cosmos-stone-overlay");
      if (!el) return;
      this.switchCosmosInnerTab("route");
      this.ui.stoneOverlayOpen = true;
      el.style.display = "block";
      this.refreshCosmosStoneOverlay();
      el.scrollIntoView({ block: "nearest" });
    }
    closeCosmosStoneOverlay() {
      const el = this.deps.document.getElementById("cosmos-stone-overlay");
      this.ui.stoneOverlayOpen = false;
      if (el) el.style.display = "none";
    }
    toggleCosmosStoneOverlay() {
      if (this.ui.stoneOverlayOpen) this.closeCosmosStoneOverlay();
      else this.openCosmosStoneOverlay();
    }
    showCosmosStoneTooltip(event, galaxy) {
      if (!event || typeof this.deps.showInfoTooltipHtml !== "function") return;
      this.deps.showInfoTooltipHtml(event.clientX, event.clientY, this.buildCosmosStoneTooltipHtml(galaxy), "#b9e6ff");
    }
    installCosmosAtlas() {
      if (!this.active || this.ui.installed) return;
      this.graph.buildCosmosAtlasData();
      const mapTab = this.deps.document.getElementById("tab-map");
      if (!mapTab) return;
      const subtabRow = mapTab.querySelector(".subtab-row");
      if (!subtabRow) return;
      if (!this.deps.document.getElementById("btn-map-tab-cosmos")) {
        const btn = this.deps.document.createElement("button");
        btn.className = "subtab-btn cosmos-tab-btn";
        btn.id = "btn-map-tab-cosmos";
        btn.type = "button";
        btn.textContent = this.deps._t("우주계");
        btn.style.display = "none";
        btn.dataset.cosmosAction = "open";
        subtabRow.appendChild(btn);
      }
      if (!this.deps.document.getElementById("map-tab-cosmos")) {
        const panel = this.deps.document.createElement("div");
        panel.id = "map-tab-cosmos";
        panel.className = "subtab-content cosmos-atlas-tab";
        panel.innerHTML = `
                <div id="ui-cosmos-panel" class="cosmos-panel">
                    <div id="cosmos-unified-map" class="cosmos-unified-map">
                        <div id="cosmos-inner-route"></div>
                        <details id="cosmos-node-detail"><summary>${this.deps._t("선택한 별")}</summary><div class="cosmos-detail" id="ui-cosmos-detail"></div></details>
                        <div id="cosmos-stone-overlay" class="cosmos-stone-overlay" style="display:none;"></div>
                    </div>
                    <div id="cosmos-inner-mastery" class="cosmos-mastery-shell" style="display:none;"></div>
                    <details class="cosmos-records-disclosure"><summary>${this.deps._t("탐사 기록, 보유 재화")}</summary><div class="cosmos-summary" id="ui-cosmos-summary"></div></details>
                </div>`;
        (mapTab.querySelector(".ui-window-body") || mapTab).appendChild(panel);
      }
      this.bindCosmosAtlasElements();
      this.state.getState();
      this.ui.installed = true;
      this.renderCosmosAtlas();
    }
    activateCosmosSubtab() {
      this.deps.document.querySelectorAll("#tab-map .subtab-content").forEach((el) => el.classList.remove("active"));
      this.deps.document.querySelectorAll("#tab-map .subtab-btn").forEach((el) => el.classList.remove("active"));
      const tab = this.deps.document.getElementById("map-tab-cosmos");
      const btn = this.deps.document.getElementById("btn-map-tab-cosmos");
      if (tab) tab.classList.add("active");
      if (btn) btn.classList.add("active");
      if (this.deps.game) this.deps.game.mapSubtab = "map-tab-cosmos";
      this.renderCosmosAtlas();
    }
    bindCosmosAtlasElements() {
      this.ui.detail = this.deps.document.getElementById("ui-cosmos-detail");
      this.ui.summary = this.deps.document.getElementById("ui-cosmos-summary");
    }
    selectCosmosNode(id) {
      if (!this.graph.byId.has(id)) return;
      const state2 = this.state.getState();
      state2.selectedId = id;
      this.renderCosmosAtlas();
    }
    syncCosmosTabVisibility() {
      this.deps.syncMapPrimaryContentTabs();
    }
    renderCosmosAtlas() {
      if (!this.active || this.deps.game && this.deps.game.isBackgroundCalculation) return;
      if (!this.ui.installed) {
        this.installCosmosAtlas();
        return;
      }
      this.syncCosmosTabVisibility();
      this.deps.cosmosRouteUi.render({
        nodes: this.graph.nodes.map(this.cosmosStarView.bind(this)),
        edges: this.graph.edges,
        unlocked: this.progress.isCosmosUnlocked(),
        onAction: this.handleCosmosRouteAction.bind(this),
        zoneOf: this.rules.getCosmosNodeEstimateZone.bind(this.rules)
      });
      this.deps.captureUiDisclosureState(this.ui.detail);
      this.deps.captureUiDisclosureState(this.ui.summary);
      if (this.deps.document.getElementById("cosmos-node-detail").open) this.renderDetail();
      this.renderSummary();
      this.deps.restoreUiDisclosureState(this.ui.detail);
      this.deps.restoreUiDisclosureState(this.ui.summary);
      this.renderMasteryPanel();
      this.refreshCosmosStoneOverlay();
    }
    cosmosStarView(node) {
      const status = this.progress.getNodeStatus(node);
      return { ...node, status, statusLabel: this.getStatusLabel(status) };
    }
    focusRecommendedCosmosNode() {
      this.graph.buildCosmosAtlasData();
      const guide = this.rules.getCosmosProgressGuide();
      if (!guide.targetId) return;
      this.selectCosmosNode(guide.targetId);
      this.focusCosmosAtlasOnSelected();
    }
    focusCosmosCapstoneBoss(nodeId) {
      this.graph.buildCosmosAtlasData();
      const node = this.graph.byId.get(nodeId);
      if (!node || node.tag !== "boss") return;
      this.selectCosmosNode(node.id);
      this.focusCosmosAtlasOnSelected();
    }
    openCosmosCapstoneBossPanel() {
      if (typeof this.deps.switchMapSubtab === "function") this.deps.switchMapSubtab("map-tab-zones");
      if (typeof this.deps.switchMapExploreSubtab === "function") this.deps.switchMapExploreSubtab("map-explore-root-boss");
    }
    challengeSelectedCosmosNode() {
      if (!this.active) return;
      this.graph.buildCosmosAtlasData();
      const state2 = this.state.getState();
      const node = this.graph.byId.get(state2.selectedId || "planet-0");
      if (!node) return;
      if (!this.rules.canChallengeNode(node)) {
        if (typeof this.deps.addLog === "function") this.deps.addLog("해당 우주계 노드는 아직 도전할 수 없습니다.", "attack-monster");
        return;
      }
      if (typeof this.deps.addLog === "function") {
        const directive = this.directives.getSelectedCosmosDirective(node);
        this.deps.addLog(this.deps._t("⚔️ {name} 도전 시작: {value}, 중력 {gravity}g, 크기 등급 {max}, 특징 {theme}", { name: node.name, value: directive ? directive.name : this.deps._t("기본 탐사"), gravity: Number(node.gravity || 1).toFixed(1), max: Math.max(1, Math.floor(node.sizeClass || 1)), theme: node.theme }), "attack-monster");
      }
      this.deps.cosmosRouteRuntime.stop(this.deps.game);
      this.encounters.startCosmosBattle(node);
      this.renderCosmosAtlas();
    }
    handleCosmosRouteAction(action, value) {
      if (!this.active) return;
      const currentGame = this.deps.game;
      if (!this.progress.isCosmosUnlocked() || currentGame.isBackgroundCalculation) return;
      if (action === "battle") {
        this.deps.closeAllWindows();
        this.deps.switchTab("tab-battle");
        return;
      }
      if (this.handleCosmosStarAction(action, value)) return;
      if (action === "retreat") {
        this.deps.cosmosRouteRuntime.leave(currentGame);
        currentGame.combatHalted = true;
        currentGame.enemies = [];
        currentGame.encounterPlan = [];
        currentGame.moveTimer = 0;
      } else {
        const changed = action === "start" && this.deps.cosmosRouteRuntime.start(currentGame, Number(value));
        if (!changed) return;
        const node = this.graph.byId.get(this.deps.cosmosRouteRuntime.current(currentGame));
        if (!this.rules.canChallengeNode(node)) {
          this.deps.cosmosRouteRuntime.stop(currentGame);
          this.deps.addLog("항로 진입 조건을 충족하지 못했습니다. 별 지도에서 진행도를 확인하세요.", "season-up");
          return;
        }
        this.state.getState().selectedId = node.id;
        this.encounters.startCosmosBattle(node);
      }
      this.deps.updateStaticUI();
      this.deps.queueImportantSave(160);
      this.renderCosmosAtlas();
    }
    handleCosmosStarAction(action, value) {
      if (action === "stones") {
        this.openCosmosStoneOverlay();
        return true;
      }
      if (action !== "node") return false;
      const node = this.graph.byId.get(value);
      if (!node) return true;
      this.deps.cosmosRouteUi.focus(node);
      this.selectCosmosNode(node.id);
      this.ui.detail.scrollIntoView({ block: "nearest" });
      return true;
    }
    focusCosmosAtlasOnSelected() {
      const node = this.graph.byId.get(this.state.getState().selectedId);
      if (!node) return;
      this.switchCosmosInnerTab("route");
      this.deps.cosmosRouteUi.focus(node);
      this.renderCosmosAtlas();
    }
    boot() {
      this.installCosmosAtlas();
      if (this.deps.game && this.deps.game.mapSubtab === "map-tab-cosmos") this.activateCosmosSubtab();
    }
    switchCosmosInnerTab(tab) {
      const mastery = tab === "mastery";
      this.deps.document.getElementById("cosmos-unified-map").style.display = mastery ? "none" : "";
      this.deps.document.getElementById("cosmos-inner-route").style.display = mastery ? "none" : "";
      this.deps.document.getElementById("cosmos-inner-mastery").style.display = mastery ? "" : "none";
      this.renderCosmosAtlas();
    }
    run(commands) {
      return consumeDomainCommands(commands, {
        addLog: (...args) => this.deps.addLog(...args),
        showGameToast: (...args) => this.deps.showGameToast(...args),
        updateStaticUI: () => {
          if (this.active) this.deps.updateStaticUI();
        },
        renderCosmosAtlas: () => this.renderCosmosAtlas()
      });
    }
    mount() {
      const doc = this.deps.document;
      const click = (event) => this.onClick(event);
      listenView(this, doc, "click", click);
      for (const type of ["mouseover", "mousemove", "focusin", "touchstart"]) {
        listenView(this, doc, type, (event) => this.onTooltip(event));
      }
      for (const type of ["mouseout", "focusout"]) listenView(this, doc, type, (event) => this.leaveTooltip(event));
      if (doc.readyState === "loading") listenView(this, doc, "DOMContentLoaded", () => this.boot(), { once: true });
      else this.boot();
      listenView(this, this.deps.window, "load", () => this.boot());
    }
    onClick(event) {
      const target = event.target?.closest?.("#map-tab-cosmos, #btn-map-tab-cosmos");
      if (!this.active || !target) return;
      if (event.target.id === "cosmos-stone-overlay") {
        this.closeCosmosStoneOverlay();
        return;
      }
      if (this.handleDirectiveClick(event)) return;
      const power = event.target.closest("[data-cosmos-power-tip]");
      if (power) {
        event.stopPropagation();
        power.focus();
        this.showPowerTooltip(event, power);
        return;
      }
      const button = event.target.closest("[data-cosmos-action]");
      if (!button || button.disabled) return;
      this.performAction(button.dataset.cosmosAction, button.dataset.cosmosValue, button);
    }
    handleDirectiveClick(event) {
      const directive = event.target.closest("[data-cosmos-directive-id]");
      if (!directive || directive.disabled) return false;
      this.run(this.directives.selectCosmosExpeditionDirective(directive.dataset.cosmosDirectiveNode, directive.dataset.cosmosDirectiveId));
      return true;
    }
    performAction(action, value, button) {
      const actions = {
        open: () => this.deps.switchMapSubtab("map-tab-cosmos"),
        "close-stones": () => this.closeCosmosStoneOverlay(),
        stones: () => this.openCosmosStoneOverlay(),
        equip: () => this.run(this.stones.equipBossStoneByGalaxy(Number(value))),
        unequip: () => this.run(this.stones.unequipBossStoneByGalaxy(Number(value))),
        inscribe: () => this.run(this.stones.applyCosmosBossRelicToStone(Number(value))),
        mastery: () => this.run(this.progress.allocateCosmosMastery(value)),
        capstone: () => this.focusCosmosCapstoneBoss(value),
        "capstone-panel": () => this.openCosmosCapstoneBossPanel(),
        challenge: () => this.challengeSelectedCosmosNode(),
        "close-detail": () => {
          button.closest("details").open = false;
        }
      };
      if (Object.hasOwn(actions, action)) actions[action]();
    }
    onTooltip(event) {
      if (!this.active || !event.target?.closest?.("#map-tab-cosmos")) return;
      const stone = event.target.closest("[data-cosmos-stone-tip]");
      if (stone && ["mouseover", "mousemove"].includes(event.type)) {
        this.showCosmosStoneTooltip(event, Number(stone.dataset.cosmosStoneTip));
        return;
      }
      const power = event.target.closest("[data-cosmos-power-tip]");
      if (!power) return;
      if (event.type === "touchstart") event.stopPropagation();
      this.showPowerTooltip(event, power);
    }
    showPowerTooltip(event, target) {
      this.deps.showMapPowerEstimateTooltip({ currentTarget: target, clientX: event.clientX, clientY: event.clientY });
    }
    leaveTooltip(event) {
      const tip = event.target?.closest?.("[data-cosmos-stone-tip], [data-cosmos-power-tip]");
      if (!tip || !tip.closest("#map-tab-cosmos") || tip.contains(event.relatedTarget)) return;
      if (event.type === "mouseout" && this.deps.document.activeElement === tip) return;
      this.deps.hideInfoTooltip();
    }
    dispose() {
      releaseViewEvents(this);
      this.ui.detail = null;
      this.ui.summary = null;
      this.ui.installed = false;
      this.ui.stoneOverlayOpen = false;
    }
  };

  // modules/cosmos-atlas-classic.mjs
  var graphDeps = {
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    }
  };
  var graph = new CosmosAtlasGraph(graphDeps);
  var stateDeps = {
    get game() {
      return window.GameModules.state.game;
    },
    set game(value) {
      window.GameModules.state.game = value;
    },
    get getSocketedJewels() {
      return typeof getSocketedJewels === "undefined" ? void 0 : getSocketedJewels;
    }
  };
  var state = new CosmosAtlasState(stateDeps);
  var progressDeps = {
    get COSMOS_SKY_POWER_PER_REWARD() {
      return typeof COSMOS_SKY_POWER_PER_REWARD === "undefined" ? void 0 : COSMOS_SKY_POWER_PER_REWARD;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get canLog() {
      return typeof window.addLog === "function";
    },
    get cosmosRouteRuntime() {
      return typeof cosmosRouteRuntime === "undefined" ? void 0 : cosmosRouteRuntime;
    },
    get game() {
      return window.GameModules.state.game;
    },
    set game(value) {
      window.GameModules.state.game = value;
    },
    get isCosmosContentUnlockReady() {
      return typeof isCosmosContentUnlockReady === "undefined" ? void 0 : isCosmosContentUnlockReady;
    },
    get isMapPrimaryContentUnlocked() {
      return typeof isMapPrimaryContentUnlocked === "undefined" ? void 0 : isMapPrimaryContentUnlocked;
    }
  };
  var progress = new CosmosAtlasProgress(progressDeps, { state, graph });
  var stonesDeps = {
    get COSMOS_BOSS_STONE_OPTION_POOLS() {
      return typeof COSMOS_BOSS_STONE_OPTION_POOLS === "undefined" ? void 0 : COSMOS_BOSS_STONE_OPTION_POOLS;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get canLog() {
      return typeof window.addLog === "function";
    },
    get canRefresh() {
      return typeof window.updateStaticUI === "function";
    }
  };
  var stones = new CosmosAtlasStones(stonesDeps, { state });
  var directivesDeps = {
    get cosmosRouteRuntime() {
      return typeof cosmosRouteRuntime === "undefined" ? void 0 : cosmosRouteRuntime;
    },
    get game() {
      return window.GameModules.state.game;
    },
    set game(value) {
      window.GameModules.state.game = value;
    },
    get getCosmosExpeditionDirectiveChoices() {
      return typeof getCosmosExpeditionDirectiveChoices === "undefined" ? void 0 : getCosmosExpeditionDirectiveChoices;
    }
  };
  var directives = new CosmosAtlasDirectives(directivesDeps, { state, graph, progress });
  var rulesDeps = {
    get COSMOS_GALAXY_ENVIRONMENT_DB() {
      return typeof COSMOS_GALAXY_ENVIRONMENT_DB === "undefined" ? void 0 : COSMOS_GALAXY_ENVIRONMENT_DB;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get calculateCosmosDifficultyTarget() {
      return typeof calculateCosmosDifficultyTarget === "undefined" ? void 0 : calculateCosmosDifficultyTarget;
    },
    get cosmosRouteRuntime() {
      return typeof cosmosRouteRuntime === "undefined" ? void 0 : cosmosRouteRuntime;
    },
    get estimateMapZonePowerRequirements() {
      return typeof estimateMapZonePowerRequirements === "undefined" ? void 0 : estimateMapZonePowerRequirements;
    },
    get game() {
      return window.GameModules.state.game;
    },
    set game(value) {
      window.GameModules.state.game = value;
    },
    get getChaosRealmTier() {
      return typeof getChaosRealmTier === "undefined" ? void 0 : getChaosRealmTier;
    },
    get getCosmosGalaxyBossMechanic() {
      return typeof getCosmosGalaxyBossMechanic === "undefined" ? void 0 : getCosmosGalaxyBossMechanic;
    },
    get getMapPowerReadiness() {
      return typeof getMapPowerReadiness === "undefined" ? void 0 : getMapPowerReadiness;
    },
    get getPlayerStats() {
      return typeof getPlayerStats === "undefined" ? void 0 : getPlayerStats;
    },
    get getZone() {
      return typeof getZone === "undefined" ? void 0 : getZone;
    },
    get resolveCosmosMechanic() {
      return typeof resolveCosmosMechanic === "undefined" ? void 0 : resolveCosmosMechanic;
    }
  };
  var rules = new CosmosAtlasRules(rulesDeps, { progress, stones, graph, directives, state });
  var rewardsDeps = {
    get COSMOS_BOSS_RELIC_DB() {
      return typeof COSMOS_BOSS_RELIC_DB === "undefined" ? void 0 : COSMOS_BOSS_RELIC_DB;
    },
    get COSMOS_BOSS_REWARD_DB() {
      return typeof COSMOS_BOSS_REWARD_DB === "undefined" ? void 0 : COSMOS_BOSS_REWARD_DB;
    },
    get COSMOS_SKY_POWER_PER_REWARD() {
      return typeof COSMOS_SKY_POWER_PER_REWARD === "undefined" ? void 0 : COSMOS_SKY_POWER_PER_REWARD;
    },
    get UNIQUE_DB() {
      return typeof UNIQUE_DB === "undefined" ? void 0 : UNIQUE_DB;
    },
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get addItemToInventory() {
      return typeof addItemToInventory === "undefined" ? void 0 : addItemToInventory;
    },
    get bagItems() {
      return typeof bagItems === "undefined" ? void 0 : bagItems;
    },
    get canLog() {
      return typeof window.addLog === "function";
    },
    get canRefresh() {
      return typeof window.updateStaticUI === "function";
    },
    get canToast() {
      return typeof window.showGameToast === "function";
    },
    get cosmosRouteRuntime() {
      return typeof cosmosRouteRuntime === "undefined" ? void 0 : cosmosRouteRuntime;
    },
    get game() {
      return window.GameModules.state.game;
    },
    set game(value) {
      window.GameModules.state.game = value;
    },
    get generateUniqueItem() {
      return typeof generateUniqueItem === "undefined" ? void 0 : generateUniqueItem;
    },
    get getStatName() {
      return typeof getStatName === "undefined" ? void 0 : getStatName;
    },
    get markLoopCosmosPlanetClear() {
      return typeof markLoopCosmosPlanetClear === "undefined" ? void 0 : markLoopCosmosPlanetClear;
    },
    get pickRandomAscendKeystoneId() {
      return typeof pickRandomAscendKeystoneId === "undefined" ? void 0 : pickRandomAscendKeystoneId;
    },
    get stumpBox() {
      return typeof stumpBox === "undefined" ? void 0 : stumpBox;
    },
    get talismans() {
      return typeof talismans === "undefined" ? void 0 : talismans;
    }
  };
  var rewards = new CosmosAtlasRewards(rewardsDeps, { rules, state, progress, graph, directives, stones });
  var encountersDeps = {
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get canLog() {
      return typeof window.addLog === "function";
    },
    get canToast() {
      return typeof window.showGameToast === "function";
    },
    get cosmosRouteRuntime() {
      return typeof cosmosRouteRuntime === "undefined" ? void 0 : cosmosRouteRuntime;
    },
    get game() {
      return window.GameModules.state.game;
    },
    set game(value) {
      window.GameModules.state.game = value;
    },
    get startMoving() {
      return typeof startMoving === "undefined" ? void 0 : startMoving;
    }
  };
  var encounters = new CosmosAtlasEncounters(encountersDeps, { rules, directives, state, graph });
  var viewDeps = {
    get _t() {
      return typeof _t === "undefined" ? void 0 : _t;
    },
    get addLog() {
      return typeof addLog === "undefined" ? void 0 : addLog;
    },
    get captureUiDisclosureState() {
      return typeof captureUiDisclosureState === "undefined" ? void 0 : captureUiDisclosureState;
    },
    get closeAllWindows() {
      return typeof closeAllWindows === "undefined" ? void 0 : closeAllWindows;
    },
    get cosmosRouteRuntime() {
      return typeof cosmosRouteRuntime === "undefined" ? void 0 : cosmosRouteRuntime;
    },
    get cosmosRouteUi() {
      return typeof cosmosRouteUi === "undefined" ? void 0 : cosmosRouteUi;
    },
    get document() {
      return typeof document === "undefined" ? void 0 : document;
    },
    get escapeHTML() {
      return typeof escapeHTML === "undefined" ? void 0 : escapeHTML;
    },
    get game() {
      return window.GameModules.state.game;
    },
    set game(value) {
      window.GameModules.state.game = value;
    },
    get hideInfoTooltip() {
      return typeof hideInfoTooltip === "undefined" ? void 0 : hideInfoTooltip;
    },
    get queueImportantSave() {
      return typeof queueImportantSave === "undefined" ? void 0 : queueImportantSave;
    },
    get restoreUiDisclosureState() {
      return typeof restoreUiDisclosureState === "undefined" ? void 0 : restoreUiDisclosureState;
    },
    get showGameToast() {
      return typeof showGameToast === "undefined" ? void 0 : showGameToast;
    },
    get showInfoTooltipHtml() {
      return typeof showInfoTooltipHtml === "undefined" ? void 0 : showInfoTooltipHtml;
    },
    get showMapPowerEstimateTooltip() {
      return typeof showMapPowerEstimateTooltip === "undefined" ? void 0 : showMapPowerEstimateTooltip;
    },
    get switchMapExploreSubtab() {
      return typeof switchMapExploreSubtab === "undefined" ? void 0 : switchMapExploreSubtab;
    },
    get switchMapSubtab() {
      return typeof switchMapSubtab === "undefined" ? void 0 : switchMapSubtab;
    },
    get switchTab() {
      return typeof switchTab === "undefined" ? void 0 : switchTab;
    },
    get syncMapPrimaryContentTabs() {
      return typeof syncMapPrimaryContentTabs === "undefined" ? void 0 : syncMapPrimaryContentTabs;
    },
    get updateStaticUI() {
      return typeof updateStaticUI === "undefined" ? void 0 : updateStaticUI;
    },
    get window() {
      return typeof window === "undefined" ? void 0 : window;
    }
  };
  var view = new CosmosAtlasView(viewDeps, { state, graph, progress, rules, encounters, directives, stones, rewards });
  window.GameModules.cosmosAtlas = { graph, state, progress, stones, directives, rules, rewards, encounters, view };
  safeExposeGlobals({
    renderCosmosAtlas: view.renderCosmosAtlas.bind(view),
    challengeSelectedCosmosNode: view.challengeSelectedCosmosNode.bind(view),
    getCosmosMasteryValue: progress.getCosmosMasteryValue.bind(progress),
    getCosmosBossPityProgress: progress.getCosmosBossPityProgress.bind(progress),
    switchCosmosInnerTab: view.switchCosmosInnerTab.bind(view),
    focusCosmosAtlasOnSelected: view.focusCosmosAtlasOnSelected.bind(view),
    installCosmosAtlas: view.installCosmosAtlas.bind(view),
    openCosmosStoneOverlay: view.openCosmosStoneOverlay.bind(view),
    getCosmosCapstoneProgress: progress.getCosmosCapstoneProgress.bind(progress),
    getCosmosNodeRecommendation: rules.getCosmosNodeRecommendation.bind(rules),
    getCosmosProgressGuide: rules.getCosmosProgressGuide.bind(rules),
    focusRecommendedCosmosNode: view.focusRecommendedCosmosNode.bind(view),
    grantCosmosSkyPower: progress.grantCosmosSkyPower.bind(progress),
    handleCosmosRouteAction: view.handleCosmosRouteAction.bind(view)
  });
  view.mount();
})();
