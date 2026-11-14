// GENERATED from modules/data/ember-corruption.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/ember-corruption.mjs
  var EMBER_CORRUPTION_RULES = Object.freeze({
    // 옵션 수치를 다시 굽는 폭(줄마다 따로 굴린다), 품질 결과의 값(타락한 장비의 품질 상한과 같다), 재가 준 거름(그루터기 함 성장).
    scale: Object.freeze({ min: 0.8, max: 1.2 }),
    quality: 30,
    ashGrowth: Object.freeze({ unique: 300, other: 150 })
  });
  var EMBER_BURN_OUTCOMES = Object.freeze({
    unique: Object.freeze([["ash", 25], ["scale", 30], ["twoLines", 25], ["scaleAndLine", 10], ["nothing", 10]].map(Object.freeze)),
    other: Object.freeze([["ash", 25], ["twoLines", 35], ["scale", 20], ["quality", 10], ["nothing", 10]].map(Object.freeze))
  });
  var EMBER_CORRUPTION_LINES = Object.freeze([
    ["gemLevel", ["무기", "투구"], 1, 1],
    ["targetAny", ["무기"], 1, 1],
    ["addedFireDamagePct", ["무기", "목걸이"], 3, 6],
    ["doubleDamageChance", ["무기", "장갑"], 2, 5],
    ["cullStrikePct", ["장갑", "반지"], 2, 4],
    ["firstStrikeDamagePct", ["장갑", "반지"], 25, 50],
    ["bossDamagePct", ["목걸이", "투구"], 12, 25],
    ["eliteDamagePct", ["반지", "신발"], 12, 25],
    ["summonCap", ["목걸이", "투구"], 1, 1],
    ["suppCap", ["투구"], 1, 1],
    ["maxResAll", ["갑옷", "목걸이"], 1, 2],
    ["maxResF", ["갑옷", "반지", "허리띠", "신발"], 2, 4],
    ["blockChanceMax", ["방패"], 1, 3],
    ["physTakenAsFire", ["갑옷", "방패", "허리띠"], 8, 15],
    ["genericTakenDamageReducePct", ["갑옷", "방패", "허리띠"], 2, 4],
    ["dotTakenDamageReducePct", ["방패", "허리띠", "신발", "투구"], 10, 20],
    ["deflectDamageReduce", ["장갑", "신발"], 3, 6]
  ].map(([id, slots, min, max]) => Object.freeze({ id, slots: Object.freeze(slots), min, max })));
  var EMBER_KILL_DROPS = Object.freeze([
    Object.freeze({ key: "emberBranch", normal: 0.05, elite: 0.3 }),
    Object.freeze({ key: "burningEmberBranch", normal: 0.01, elite: 0.08 })
  ]);
  var EMBER_CORRUPTION_TONE = "#ff8a3d";

  // modules/data/ember-corruption.mjs:classic
  Object.assign(globalThis, { EMBER_CORRUPTION_RULES, EMBER_BURN_OUTCOMES, EMBER_CORRUPTION_LINES, EMBER_KILL_DROPS, EMBER_CORRUPTION_TONE });
  if (typeof safeExposeData === "function") safeExposeData({ EMBER_CORRUPTION_RULES, EMBER_BURN_OUTCOMES, EMBER_CORRUPTION_LINES, EMBER_KILL_DROPS, EMBER_CORRUPTION_TONE });
})();
