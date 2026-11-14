// GENERATED from modules/data/colony-wards.mjs. Edit the ESM source; run npm run build:modules.
(() => {
  // modules/data/colony-wards.mjs
  var COLONY_WARD_RULES = Object.freeze({
    slot: "액막이",
    name: "액막이 부적",
    baseId: "colony_ward",
    slots: Object.freeze(["액막이1", "액막이2", "액막이3", "액막이4", "액막이5"]),
    // 칸 수(2026-10-11 사용자: "액막이 칸 기본 0칸이고, 허리띠로 1~3칸까지 가능하게 (랜덤) 특수한 경우 5칸까지되는건유지"): 기본 0,
    // 낀 허리띠가 제 칸 수만큼(허리띠마다 1~3 가운데 하나로 정해져 있다, 고르게 굴린다), 초월 공허 패시브 '액막이 매듭' 하나마다,
    // 가디언 '수호 재생', 고유 허리띠 '천 개의 유리병'(예전 물약 칸 허리띠) 각 +1, 체이싱 고유 허리띠 '편린을 꿴 허리띠'(stringEffectKey)는
    // 제 값만큼(+2, 끼운 액막이의 줄도 두 배). 5칸까지. 허리띠의 칸 수는 축복의 꽃잎이 베이스 옵션 값과 함께 다시 굴린다(사용자: "꽃잎으로
    // 굴리게해줘").
    baseSlots: 0,
    beltSlots: Object.freeze({ min: 1, max: 3 }),
    maxSlots: 5,
    voidPassive: "wardKnot",
    ascendNode: "gd3",
    uniqueEffectKey: "thousandBottles",
    stringEffectKey: "wardString",
    // 얻는 곳: 군락지 웨이브가 주된 곳(5웨이브마다 반드시, 나머지 웨이브도 28%: 20웨이브 한 판에 여덟 개 안팎). 군락지가 열린 뒤에는
    // 모든 지도의 처치에서 아주 드물게(일반 0.04%, 정예 0.2%, 보스 1%: 16등급 지도 300판 실측 50판에 하나, 기대값 40판에 하나).
    unlock: "colony",
    colonyZoneId: "colony_run",
    // 지배체를 넘긴 액막이는 줄의 기존 범위 안에서 더 높게 굴린다. 5웨이브 25%, 10웨이브 35%, 최대 75% 바닥.
    colonyWave: Object.freeze({ every: 5, chance: 0.28, bossRollFloor: 0.25, bossRollStep: 0.1, maxRollFloor: 0.75 }),
    field: Object.freeze({ normal: 4e-4, elite: 2e-3, boss: 0.01 }),
    // 해체하면 군락지 편린 1 + 값 / 40(1~6), 예전과 같다. 편린 30개로 군락지 화면에서 새 액막이 하나를 만든다(칸을 사던 편린의 새 쓰임,
    // 웨이브마다 편린 1 + 웨이브 / 3이라 군락지 한 판에 두어 개).
    shards: Object.freeze({ base: 1, per: 40, max: 6 }),
    craftCost: 30,
    // 예전 저장: 군락지 편린과 흔적으로 산 칸(2~4칸째)은 이관할 때 돌려준다.
    legacySlotCosts: Object.freeze({
      2: Object.freeze({ colonyShard: 25 }),
      3: Object.freeze({ colonyShard: 75 }),
      4: Object.freeze({ colonyShard: 150, colonyTrace: 1 })
    })
  });
  var COLONY_WARD_POOL = Object.freeze([
    ["flatHp", 40, 120, "최대 생명력"],
    ["armor", 30, 140, "방어도"],
    ["evasion", 30, 140, "회피"],
    ["energyShield", 20, 120, "에너지 보호막"],
    ["resAll", 4, 12, "모든 원소 저항"],
    ["maxResF", 1, 2, "최대 화염 저항"],
    ["maxResC", 1, 2, "최대 냉기 저항"],
    ["maxResL", 1, 2, "최대 번개 저항"],
    ["resChaos", 4, 12, "카오스 저항"],
    ["ailResIgnite", 6, 20, "점화 저항"],
    ["ailResFreeze", 6, 20, "냉각/동결 저항"],
    ["ailResShock", 6, 20, "감전 저항"],
    ["ailResPoison", 6, 20, "중독 저항"],
    ["ailResBleed", 6, 20, "출혈 저항"],
    ["regenFlat", 2, 8, "초당 생명력 재생"],
    ["energyShieldRegen", 2, 10, "에너지 보호막 회복속도"],
    ["critResist", 4, 18, "치명타 저항"],
    ["dr", 1, 4, "받는 물리 피해 감소"],
    ["fireTakenDamageReducePct", 2, 8, "받는 화염 피해 감소"],
    ["coldTakenDamageReducePct", 2, 8, "받는 냉기 피해 감소"],
    ["lightTakenDamageReducePct", 2, 8, "받는 번개 피해 감소"],
    ["chaosTakenDamageReducePct", 2, 8, "받는 카오스 피해 감소"],
    ["dotTakenDamageReducePct", 2, 8, "받는 지속 피해 감소"],
    ["takenDamageReduceWhen2EnemiesPct", 1, 5, "받는 피해 감소(2마리 이상)"],
    ["takenDamageReduceWhen1EnemyPct", 1, 5, "받는 피해 감소(1마리)"],
    ["igniteDamageReducePct", 3, 10, "받는 점화 피해 감소"],
    ["bleedDamageReducePct", 3, 10, "받는 출혈 피해 감소"],
    ["poisonDamageReducePct", 3, 10, "받는 중독 피해 감소"]
  ].map(([id, min, max, name]) => Object.freeze({ id, min, max, name })));
  var COLONY_WARD_UNIQUES = Object.freeze({
    chance: 5e-3,
    rows: Object.freeze([
      Object.freeze({ key: "wardEcho", name: "메아리 매듭", text: "끼운 다른 액막이의 줄이 50% 강해집니다", params: Object.freeze({ pct: 50 }) }),
      Object.freeze({ key: "incidentBell", name: "사건을 부르는 방울", text: "잔잔한 사건을 두 배 자주 만납니다", params: Object.freeze({ mul: 2 }) }),
      Object.freeze({ key: "doubleKnot", name: "두 번 맨 매듭", text: "줄 하나가 보통 액막이 최대치의 1.5~2배입니다", params: Object.freeze({ min: 1.5, max: 2 }) })
    ])
  });

  // modules/data/colony-wards.mjs:classic
  Object.assign(globalThis, { COLONY_WARD_RULES, COLONY_WARD_POOL, COLONY_WARD_UNIQUES });
  if (typeof safeExposeData === "function") safeExposeData({ COLONY_WARD_RULES, COLONY_WARD_POOL, COLONY_WARD_UNIQUES });
})();
