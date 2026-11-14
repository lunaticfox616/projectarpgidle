// GENERATED from modules/data/stump-nursery.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/stump-nursery.mjs
  var STUMP_NURSERY = Object.freeze({
    minLoop: 39,
    // 지도 지역 → 씨앗의 색(고목 줄기는 다섯 색에서 무작위).
    regionColors: Object.freeze({ roots: "chaos", canopy: "lightning", garden: "fire", sanctum: "cold" }),
    // 처치 드롭 확률(일반, 정예), 품질 범위(처치, 방 정리), 황금 확률의 배수(보통 드롭의 황금 확률 × 이것), 방 정리의 흉터 확률.
    killChance: Object.freeze({ normal: 0.04, elite: 0.3 }),
    killRoll: Object.freeze([0.95, 1.2]),
    clearRoll: Object.freeze([1, 1.25]),
    goldenMul: 3,
    scarChance: 0.1,
    // 고대 씨앗: 여는 루프, 묘목장 정리와 최종 보스 처치의 확률, 품질 범위.
    ancient: Object.freeze({ minLoop: 42, roomChance: 0.05, apexChance: 0.25, roll: Object.freeze([1, 1.2]) })
  });

  // modules/data/stump-nursery.mjs:classic
  Object.assign(globalThis, { STUMP_NURSERY });
  if (typeof safeExposeData === "function") safeExposeData({ STUMP_NURSERY });
})();
