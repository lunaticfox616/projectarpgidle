// 보스 변이체(12번 루프 33, 2026-10-08, docs/loop-content-12-plan-20261008.md): 루프 33부터 모든 보스가 드물게 변이체로 나온다. 변이체는
// 원소가 바뀌고 저마다 한 가지가 세다(빠름, 단단함, 흡혈, 겹치기 ...). 잡으면 전리품과 경험치가 늘고, 처음 잡은 변이마다 황금률,
// 아틀라스의 보스였다면 그 보스의 기억 3단계(기억 던전, 루프 21). 기억 던전 3단계부터는 기억의 보스가 변이체로 다시 불려 나올 수 있다.
// 규칙은 js/boss-variants.js, 기록은 기억 던전의 상태(game.atlas.memory.variants)에 남는다.
const BOSS_VARIANTS = Object.freeze({
    minLoop: 33,
    chance: 0.04,
    // 기억 던전 1~5단계에서 기억의 보스가 변이체로 다시 불려 나올 확률.
    recall: Object.freeze([0, 0, 0.15, 0.25, 0.4]),
    // 처치 보상: 전리품과 경험치 배수, 변이마다 처음 잡을 때 한 번 주는 것, 아틀라스의 보스였다면 남기는 기억의 단계.
    reward: Object.freeze({ dropMul: 2.5, expMul: 1.5, firstKill: Object.freeze([Object.freeze(['goldenRule', 1])]), memoryTier: 3 }),
    // 변이: 이름, 원소, 그림 색조(hue-rotate 도), 테 색, 능력치(mul은 곱, add는 더함, shieldPct는 최대 생명력의 그만큼 보호막).
    // 피해 배수는 1.2까지: 특수기 상한(1.55)과 전투력 추정은 그대로다.
    kinds: Object.freeze([
        { id: 'ember', name: '불씨 변이체', ele: 'fire', hue: 20, outline: '#ff8a3d', mul: { damageMul: 1.2 }, add: { ailmentChance: 0.25 }, shieldPct: 0 },
        { id: 'frost', name: '서리 변이체', ele: 'cold', hue: 190, outline: '#8fd6ff', mul: { maxHp: 1.5, attackSpeedVar: 0.9 }, add: { ailmentChance: 0.2 }, shieldPct: 0 },
        { id: 'storm', name: '폭풍 변이체', ele: 'light', hue: 55, outline: '#ffe36b', mul: { attackSpeedVar: 1.3 }, add: { critChance: 10 }, shieldPct: 0 },
        { id: 'void', name: '공허 변이체', ele: 'chaos', hue: 270, outline: '#c99bff', mul: { maxHp: 1.25 }, add: { leechPct: 8 }, shieldPct: 25 },
        { id: 'twin', name: '쌍둥이 변이체', ele: 'phys', hue: 120, outline: '#9fe39a', mul: { damageMul: 1.1 }, add: { doubleStrikeChance: 30 }, shieldPct: 0 }
    ].map(row => Object.freeze({ ...row, mul: Object.freeze(row.mul), add: Object.freeze(row.add) })))
});

if (typeof safeExposeData === 'function') safeExposeData({ BOSS_VARIANTS });
