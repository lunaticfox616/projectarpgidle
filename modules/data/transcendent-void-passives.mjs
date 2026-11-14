export const PLUTO_VOID_THRESHOLDS = Object.freeze([0.8, 0.96, 0.992, 0.9984]);

/** Translated descriptions stay lazy so changing locale does not rebuild the pool. */
export function createTranscendentVoidPassiveDefinitions(_t, tuning) {
    const { TRANSCENDENT_ANDROMEDA_RADIUS, TRANSCENDENT_ASTEROID_RADIUS, TRANSCENDENT_VOID_VALUES } = tuning;
    return [
        { id: 'trauma', name: '트라우마', min: 5, max: 10, desc: v => _t('이 공허 패시브는 공허 할당 {v}회로 계산', { v }) },
        { id: 'paleBlueDot', name: '창백한 푸른 점', fixed: 10, desc: v => _t('스킬트리 포인트 {v}점을 추가로 얻습니다.', { v }) },
        { id: 'overflowingVigor', name: '넘치는 활기', min: 3, max: 6, desc: v => _t('할당한 공허 패시브 하나당 생명력 최대치 +{v}%', { v }) },
        { id: 'toughSoul', name: '강인한 영혼', min: 3, max: 6, desc: v => _t('할당한 공허 패시브 하나당 에너지 보호막 최대치 +{v}%', { v }) },
        { id: 'defenseMechanism', name: '방어기제', min: 5, max: 10, desc: v => _t('막기 확률 최대치 +{v}% 및 막기 확률 +{v2}%', { v, v2: v }) },
        { id: 'blurredPresence', name: '흐릿한 존재감', min: 10, max: 20, min2: 3, max2: 5, desc: (v, v2) => _t('비껴내기 +{v}% 및 비껴내기 피해 감소 +{v2}%', { v, v2 }) },
        { id: 'chameleon', name: '카멜레온', desc: () => '공허 제작 창에서 다른 초월 하나를 골라 바꿀 수 있습니다' }, // convertChameleonVoidPassive
        { id: 'thirdFinger', name: '세 번째 손가락', desc: () => '반지를 하나 더 장착 가능' },
        { id: 'greed', name: '재물욕', desc: () => '주얼을 하나 더 장착 가능' },
        { id: 'wardKnot', name: '액막이 매듭', desc: () => '액막이를 하나 더 장착 가능' }, // 액막이 칸 +1(js/colony-wards.js slotCount)
        { id: 'innateTalent', name: '타고난 재능', min: 5, max: 15, min2: 1.5, max2: 2, step2: 0.1, desc: (v, v2) => _t('{v}% 확률로 {v2}배 피해', { v, v2 }) },
        { id: 'wholehearted', name: '전심전력', min: 5, max: 15, desc: v => _t('할당한 공허 패시브 하나당 모든 피해 +{v}%', { v }) },
        { id: 'impatience', name: '조급함', min: 8, max: 16, desc: v => _t('할당한 공허 패시브 하나당 이동 속도 +{v}%', { v }) },
        { id: 'immortalHero', name: '불멸의 영웅', fixed: 3000, desc: v => _t('생명력 +{max} (획득 이후 사망 시마다 -30)', { max: Math.max(0, Math.floor(Number(v) || 0)) }) },
        { id: 'seasoned', name: '노련함', min: 4, max: 5, desc: v => _t('경험한 루프 1회마다 치명타 피해 배율 +{v}%', { v }) },
        // 옛 고유 별쐐기 11종(2026-10-01). 트리를 바꾸던 변성 반경은 수치 효과로 옮겼다. 다섯의 수치는 data/passives.js
        // TRANSCENDENT_VOID_VALUES(9단계에서 맞춤).
        { id: 'pluto', name: '명왕성', min: 1, max: 5, rollThresholds: PLUTO_VOID_THRESHOLDS, desc: v => _t('할당한 공허 패시브 수 +{v}로 계산 (5개 확률 1/625)', { v }) },
        { id: 'resonantStar', name: '공명별', fixed: 1, desc: v => _t('보조스킬룬 한도 +{v}', { v }) },
        { id: 'darkMatter', name: '암흑물질', desc: () => '옵션이 한 줄인 다른 공허 패시브의 효과 +100% (초월 공허 제외)' },
        { id: 'sun', name: '태양', desc: () => '초월 직전 이 공허 패시브의 옵션을 3배로 유지' },
        { id: 'blackHole', name: '블랙홀', desc: () => '이 노드가 무료 연결 거점이 됩니다. 시작점까지의 길을 되돌려도 이어진 패시브가 유지됩니다' },
        { id: 'andromeda', name: '안드로메다', desc: () => _t('이 노드 반경 {value} 안의 패시브는 길이 이어지지 않아도 할당할 수 있습니다', { value: TRANSCENDENT_ANDROMEDA_RADIUS }) },
        { id: 'comet', name: '혜성', ...TRANSCENDENT_VOID_VALUES.comet, desc: v => _t('이동 속도 +{v}%', { v }) },
        { id: 'asteroidBelt', name: '소행성대', ...TRANSCENDENT_VOID_VALUES.asteroidBelt, desc: v => _t('이 노드 반경 {value} 안에 할당한 패시브 하나당 모든 피해 +{v}%', { value: TRANSCENDENT_ASTEROID_RADIUS, v }) },
        { id: 'zeroGravity', name: '무중력', ...TRANSCENDENT_VOID_VALUES.zeroGravity, desc: v => _t('회피 +{v}%', { v }) },
        { id: 'satellite', name: '위성', ...TRANSCENDENT_VOID_VALUES.satellite, desc: v => _t('공격 속도 +{v}%', { v }) },
        { id: 'supernova', name: '초신성', ...TRANSCENDENT_VOID_VALUES.supernova, desc: v => _t('다른 공허 패시브의 옵션 +{v}%', { v }) }
    ];
}

export function createTranscendentVoidStatLines(TRANSCENDENT_ASTEROID_RADIUS) {
    return Object.freeze({
        paleBlueDot: tr => [['passivePoint', tr.value || 10]],
        overflowingVigor: (tr, ctx) => [['pctHp', tr.value * ctx.voidCount]],
        toughSoul: (tr, ctx) => [['energyShieldPct', tr.value * ctx.voidCount]],
        defenseMechanism: tr => [['blockChance', tr.value], ['blockChanceMax', tr.value]],
        blurredPresence: tr => [['deflectChance', tr.value], ['deflectDamageReduce', tr.value2]],
        innateTalent: tr => [['doubleDamageChance', tr.value], ['doubleDamageMultiplierPct', Math.max(0, ((tr.value2 || 1.5) - 1) * 100)]],
        wholehearted: (tr, ctx) => [['pctDmg', tr.value * ctx.voidCount]],
        impatience: (tr, ctx) => [['move', tr.value * ctx.voidCount]],
        immortalHero: tr => [['flatHp', Math.max(0, tr.value)]],
        seasoned: (tr, ctx) => [['critDmg', tr.value * ctx.loopCount]],
        resonantStar: tr => [['suppCap', tr.value]],
        comet: tr => [['move', tr.value]],
        zeroGravity: tr => [['evasionPct', tr.value]],
        satellite: tr => [['aspd', tr.value]],
        asteroidBelt: (tr, ctx) => [['pctDmg', tr.value * ctx.allocatedWithin(TRANSCENDENT_ASTEROID_RADIUS)]]
    });
}
