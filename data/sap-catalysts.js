// GENERATED from modules/data/sap-catalysts.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/sap-catalysts.mjs
  var SAP_CATALYSTS = Object.freeze({
    minLoop: 32,
    // 한 번에 더하는 품질과 그 상한(타락한 장비는 제작할 수 없으니 기폭제도 못 쓴다: 품질 30은 잿불의 몫).
    quality: 2,
    cap: 20,
    // 기폭제: 재화 키, 품질 속성(data/affix-tags.js AFFIX_TAG_LISTS.quality), 짝이 되는 그루터기 함 색(뿌리 조합).
    // 물리 기폭제(2026-11-04): 물리 꽃과 뿌리가 생겨 더했다. 품질 속성은 심연 촉매의 물리와 같다.
    kinds: Object.freeze([
      { key: "catalystPhys", mode: "physical", color: "physical" },
      { key: "catalystFire", mode: "fire", color: "fire" },
      { key: "catalystCold", mode: "cold", color: "cold" },
      { key: "catalystLight", mode: "light", color: "lightning" },
      { key: "catalystChaos", mode: "chaos", color: "chaos" },
      { key: "catalystCrit", mode: "crit", color: null },
      { key: "catalystSummon", mode: "summon", color: null }
    ].map(Object.freeze)),
    // 수액 무리의 처치 드롭(무작위 기폭제 하나): 일반과 정예.
    killDrops: Object.freeze({ normal: 0.04, elite: 0.25 }),
    // 뿌리 조합: 같은 색의 다 자란 뿌리 둘 → 그 색의 기폭제 하나.
    rootCost: 2
  });

  // modules/data/sap-catalysts.mjs:classic
  Object.assign(globalThis, { SAP_CATALYSTS });
  if (typeof safeExposeData === "function") safeExposeData({ SAP_CATALYSTS });
})();
