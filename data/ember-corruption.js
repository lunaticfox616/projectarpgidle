// 잿불 터(12번 루프 30, 2026-10-08, docs/loop-content-12-plan-20261008.md): 아틀라스 지도의 콘텐츠 방 '잿불 터'(data/atlas.js
// encounters.emberField)의 잿불 무리가 드물게 '타오른 잿불가지'를 떨어뜨린다. 장비 하나에 한 번 쓰는 두 번째 타락이라 이미 타락한
// 장비와 고유 장비에도 쓴다(사용자: 아이템 파괴 가능성, 고유 옵션 ±20%, 타락 전용 2줄 같은 강화된 타락). 결과는
// js/ember-corruption.js가 고르고, 재가 된 장비는 그루터기 함의 거름이 된다(js/stump-box.js feedAsh).
const EMBER_CORRUPTION_RULES = Object.freeze({
    // 옵션 수치를 다시 굽는 폭(줄마다 따로 굴린다), 품질 결과의 값(타락한 장비의 품질 상한과 같다), 재가 준 거름(그루터기 함 성장).
    scale: Object.freeze({ min: 0.8, max: 1.2 }),
    quality: 30,
    ashGrowth: Object.freeze({ unique: 300, other: 150 })
});

// 결과 비중: 고유 장비와 나머지. 이 장비에 일어날 수 없는 결과(품질이 이미 30, 다시 구울 옵션이 없음)는 빼고 남은 비중으로 고른다.
const EMBER_BURN_OUTCOMES = Object.freeze({
    unique: Object.freeze([['ash', 25], ['scale', 30], ['twoLines', 25], ['scaleAndLine', 10], ['nothing', 10]].map(Object.freeze)),
    other: Object.freeze([['ash', 25], ['twoLines', 35], ['scale', 20], ['quality', 10], ['nothing', 10]].map(Object.freeze))
});

// 타락 전용 줄: 그 부위에 평소 붙지 않는 줄이 많다(무기와 투구의 젬 레벨, 갑옷의 최대 저항 등). 한 번에 서로 다른 줄, 값은
// [최소, 최대]에서 정수로. 효과는 원래 그 스탯을 쓰는 전투 계산을 그대로 탄다(제작으로 바뀌지 않는 줄, getImmutableItemSpecialStats).
// 한 줄은 두세 부위에만: 같은 줄이 장신구와 장갑 일곱 칸에 겹치면 단순히 센 줄이 된다(2026-10-08 감사, 루프 30 천장 DPS +62%).
// 무기와 목걸이는 불(추가 화염 피해), 장갑과 반지는 결정타(2배, 처형, 선제), 방어구는 불길 버티기(화염으로 받기, 지속 피해).
const EMBER_CORRUPTION_LINES = Object.freeze([
    ['gemLevel', ['무기', '투구'], 1, 1],
    ['targetAny', ['무기'], 1, 1],
    ['addedFireDamagePct', ['무기', '목걸이'], 3, 6],
    ['doubleDamageChance', ['무기', '장갑'], 2, 5],
    ['cullStrikePct', ['장갑', '반지'], 2, 4],
    ['firstStrikeDamagePct', ['장갑', '반지'], 25, 50],
    ['bossDamagePct', ['목걸이', '투구'], 12, 25],
    ['eliteDamagePct', ['반지', '신발'], 12, 25],
    ['summonCap', ['목걸이', '투구'], 1, 1],
    ['suppCap', ['투구'], 1, 1],
    ['maxResAll', ['갑옷', '목걸이'], 1, 2],
    ['maxResF', ['갑옷', '반지', '허리띠', '신발'], 2, 4],
    ['blockChanceMax', ['방패'], 1, 3],
    ['physTakenAsFire', ['갑옷', '방패', '허리띠'], 8, 15],
    ['genericTakenDamageReducePct', ['갑옷', '방패', '허리띠'], 2, 4],
    ['dotTakenDamageReducePct', ['방패', '허리띠', '신발', '투구'], 10, 20],
    ['deflectDamageReduce', ['장갑', '신발'], 3, 6]
].map(([id, slots, min, max]) => Object.freeze({ id, slots: Object.freeze(slots), min, max })));

// 잿불 무리의 처치 드롭(아틀라스 지도의 잿불 터 방, js/loot.js getCurrencyDrops라 바닥 더미와 빛기둥을 탄다): 일반과 정예의 확률.
// 방을 비우면 data/atlas.js rewards를 따로 준다.
const EMBER_KILL_DROPS = Object.freeze([
    Object.freeze({ key: 'emberBranch', normal: 0.05, elite: 0.3 }),
    Object.freeze({ key: 'burningEmberBranch', normal: 0.01, elite: 0.08 })
]);

// 화면의 잿불 색: 타락 전용 줄, 다시 구운 수치 표시, 재화 이름.
const EMBER_CORRUPTION_TONE = '#ff8a3d';

if (typeof safeExposeData === 'function') safeExposeData({ EMBER_CORRUPTION_RULES, EMBER_BURN_OUTCOMES, EMBER_CORRUPTION_LINES, EMBER_KILL_DROPS, EMBER_CORRUPTION_TONE });
