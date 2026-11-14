// GENERATED from modules/data/wisp-summons.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/wisp-summons.mjs
  var WISP_SUMMONS = Object.freeze({
    "화염 위습 소환": Object.freeze({ slug: "wisp-fire", art: "fire", flight: Object.freeze({ base: 260, perDot: 2 }), tailMs: 460 }),
    "냉기 위습 소환": Object.freeze({ slug: "wisp-cold", art: "cold", flight: Object.freeze({ base: 110, perDot: 2 }), tailMs: 260 }),
    "번개 위습 소환": Object.freeze({ slug: "wisp-light", art: "light", flight: Object.freeze({ base: 0, perDot: 0 }), tailMs: 520 }),
    "물리 위습 소환": Object.freeze({ slug: "wisp-phys", art: "phys", flight: Object.freeze({ base: 90, perDot: 3 }), tailMs: 720 }),
    "카오스 위습 소환": Object.freeze({ slug: "wisp-chaos", art: "chaos", flight: Object.freeze({ base: 260, perDot: 2 }), tailMs: 760 })
  });
  var LEGACY_SUMMON_GEM_TO_WISP = Object.freeze({
    "불곰 소환": "화염 위습 소환",
    "서리늑대 소환": "냉기 위습 소환",
    "벼락멧돼지 소환": "번개 위습 소환",
    "칼날까마귀 소환": "물리 위습 소환",
    "철갑 거북 소환": "물리 위습 소환",
    "공허 유충 소환": "카오스 위습 소환",
    "벌떼 소환": "카오스 위습 소환",
    "폭풍 정령 소환": "번개 위습 소환"
  });

  // modules/data/wisp-summons.mjs:classic
  Object.assign(globalThis, { WISP_SUMMONS, LEGACY_SUMMON_GEM_TO_WISP });
  if (typeof safeExposeData === "function") safeExposeData({ WISP_SUMMONS, LEGACY_SUMMON_GEM_TO_WISP });
})();
