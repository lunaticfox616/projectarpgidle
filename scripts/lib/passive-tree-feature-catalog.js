'use strict';

const { STAT_META, normalizePassiveValue, passiveValueStep } = require('./passive-tree-option-catalog');

const FIXED_FEATURE_STATS = new Set([
    'gemLevel', 'chaosGemLevel', 'summonGemLevel', 'suppCap', 'projectileExtraShots'
]);
const HALF_POINT_FEATURE_STATS = new Set([
    'regen', 'crit', 'blockChance', 'blockChanceMax', 'deflectChance', 'dr', 'physIgnore', 'resPen',
    'summonCrit', 'doubleDamageChance'
]);
const CLEAN_PERCENT_LADDERS = Object.freeze({
    normal: Object.freeze([1, 2, 3, 4, 5, 6, 8, 10, 12, 15]),
    major: Object.freeze([1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 16, 18, 20, 24, 25, 30, 35, 40, 45, 50, 60, 75, 80, 100])
});
const CLEAN_FLAT_LADDERS = Object.freeze({
    attribute: Object.freeze({
        normal: Object.freeze([5, 6, 8, 10, 12, 15]),
        major: Object.freeze([8, 10, 12, 15, 16, 18, 20, 24, 25, 30])
    }),
    pool: Object.freeze({
        normal: Object.freeze([10, 15, 20, 25, 30, 35, 40]),
        major: Object.freeze([20, 25, 30, 35, 40, 45, 50, 60, 75, 80, 100])
    }),
    accuracy: Object.freeze({
        normal: Object.freeze([20, 30, 40, 50, 60, 75, 80, 100]),
        major: Object.freeze([60, 75, 80, 90, 100, 120, 140, 160, 180, 200])
    })
});
const CLEAN_FLAT_FAMILIES = Object.freeze({
    strength: 'attribute', dexterity: 'attribute', intelligence: 'attribute',
    flatHp: 'pool', energyShield: 'pool', armor: 'pool', evasion: 'pool', accuracy: 'accuracy'
});

function closestCleanValue(ladder, target) {
    return ladder.reduce((best, candidate) => {
        const distance = Math.abs(candidate - target), bestDistance = Math.abs(best - target);
        return distance < bestDistance || (distance === bestDistance && candidate > best) ? candidate : best;
    }, ladder[0]);
}

function cleanValueLadder(statId, type) {
    const flatFamily = CLEAN_FLAT_FAMILIES[statId];
    if (flatFamily) return CLEAN_FLAT_LADDERS[flatFamily][type] || null;
    const suffix = STAT_META[statId]?.[1];
    if (HALF_POINT_FEATURE_STATS.has(statId) || (suffix !== '%' && suffix !== '%p')) return null;
    return CLEAN_PERCENT_LADDERS[type] || null;
}

function normalizeFeaturePassiveValue(statId, value, type) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric === 0) return numeric;
    if (HALF_POINT_FEATURE_STATS.has(statId)) {
        const magnitude = Math.max(0.5, Math.round(Math.abs(numeric) * 2) / 2);
        return Math.sign(numeric) * magnitude;
    }
    const ladder = cleanValueLadder(statId, type);
    if (!ladder) return normalizePassiveValue(statId, numeric);
    return Math.sign(numeric) * closestCleanValue(ladder, Math.abs(numeric));
}

function nextFeaturePassiveValue(statId, type, minimum) {
    const threshold = Number(minimum);
    if (HALF_POINT_FEATURE_STATS.has(statId)) return Math.floor(threshold * 2 + 1) / 2;
    const ladder = cleanValueLadder(statId, type);
    if (ladder) return ladder.find(value => value > threshold) || (Math.floor(threshold / 5) + 1) * 5;
    return normalizePassiveValue(statId, threshold + passiveValueStep(statId));
}

function isCleanFeaturePassiveValue(statId, value, type) {
    return Number(value) === normalizeFeaturePassiveValue(statId, value, type);
}

function scaleFeatureProfileEffects(profile, node) {
    const band = Math.max(0, Math.min(4, Number(node.powerBand) || 0));
    return profile.effects.map(([statId, value]) => {
        const scale = node.type !== 'major' || FIXED_FEATURE_STATS.has(statId) ? 1 : 0.65 + band * 0.05;
        return { statId, value: normalizeFeaturePassiveValue(statId, value * scale, node.type) };
    });
}

const FEATURE_EFFECT_PROFILES = Object.freeze({
    strength: {
        normal: [
            { id: 'blood', name: '단단한 혈맥', effects: [['strength', 10], ['flatHp', 20]] },
            { id: 'might', name: '무거운 완력', effects: [['strength', 10], ['physPctDmg', 6]] },
            { id: 'plate', name: '중갑의 근골', effects: [['strength', 8], ['armorPct', 7]] },
            { id: 'vow', name: '서약의 근간', effects: [['strength', 8], ['resAll', 3.5]] },
            { id: 'sinew', name: '불굴의 힘줄', effects: [['strength', 8], ['regen', 0.3]] }
        ],
        major: [
            { id: 'giant-blood', name: '거신의 혈맥', effects: [['strength', 18], ['flatHp', 45]] },
            { id: 'tempered-might', name: '벼린 완력', effects: [['strength', 18], ['physPctDmg', 16]] },
            { id: 'front-bone', name: '전열의 근골', effects: [['strength', 16], ['takenDamageReduceWhen2EnemiesPct', 3]] },
            { id: 'guardian-frame', name: '수호자의 골격', effects: [['strength', 16], ['blockChanceMax', 1.5]] },
            { id: 'sanctuary-pillar', name: '성역의 기둥', effects: [['strength', 16], ['resAll', 7.5]] },
            { id: 'enduring-sinew', name: '불굴의 힘줄', effects: [['strength', 16], ['regen', 0.6]] },
            { id: 'overwhelming', name: '압도적 근력', effects: [['strength', 18], ['addedPhysDamagePct', 5]] }
        ]
    },
    dexterity: {
        normal: [
            { id: 'precision', name: '정교한 손놀림', effects: [['dexterity', 10], ['accuracy', 60]] },
            { id: 'reflex', name: '바람의 반사', effects: [['dexterity', 10], ['evasionPct', 7]] },
            { id: 'tempo', name: '기민한 박자', effects: [['dexterity', 8], ['aspd', 2.5]] },
            { id: 'footwork', name: '민첩한 발놀림', effects: [['dexterity', 8], ['move', 2.5]] },
            { id: 'sense', name: '기민한 감각', effects: [['dexterity', 8], ['crit', 1.2]] },
            { id: 'mobile-strike', name: '흔들리는 공세', effects: [['dexterity', 8], ['mobilityPctDmg', 6]] }
        ],
        major: [
            { id: 'eagle-eye', name: '매의 눈', effects: [['dexterity', 18], ['accuracy', 140]] },
            { id: 'wind-body', name: '바람을 타는 몸', effects: [['dexterity', 16], ['move', 5]] },
            { id: 'bow-hand', name: '흔들림 없는 시위', effects: [['dexterity', 16], ['projectilePctDmg', 12]] },
            { id: 'blade-hand', name: '그림자의 손', effects: [['dexterity', 16], ['doubleDamageChance', 1.5]] },
            { id: 'flask-hand', name: '정밀한 투척', effects: [['dexterity', 16], ['poisonDamageMultiplierPct', 10]] },
            { id: 'weakness-sense', name: '약점 감지', effects: [['dexterity', 16], ['crit', 3]] },
            { id: 'unbroken-tempo', name: '끊기지 않는 박자', effects: [['dexterity', 16], ['aspd', 5]] },
            { id: 'momentum', name: '가속하는 기세', effects: [['dexterity', 16], ['mobilityPctDmg', 14]] }
        ]
    },
    intelligence: {
        normal: [
            { id: 'knowledge', name: '축적된 지식', effects: [['intelligence', 10], ['energyShield', 20]] },
            { id: 'formula', name: '주문 해석', effects: [['intelligence', 10], ['spellPctDmg', 6.5]] },
            { id: 'abyss-study', name: '심연 연구', effects: [['intelligence', 8], ['chaosPctDmg', 6]] },
            { id: 'warded-mind', name: '보호받는 정신', effects: [['intelligence', 8], ['resAll', 3]] },
            { id: 'thought-speed', name: '정신의 가속', effects: [['intelligence', 8], ['aspd', 2.5]] }
        ],
        major: [
            { id: 'archive', name: '살아 있는 서고', effects: [['intelligence', 18], ['energyShield', 40]] },
            { id: 'wise-ward', name: '현자의 방벽', effects: [['intelligence', 16], ['resAll', 8]] },
            { id: 'high-formula', name: '고등 술식', effects: [['intelligence', 16], ['spellPctDmg', 13]] },
            { id: 'forbidden-study', name: '금단의 연구', effects: [['intelligence', 16], ['addedChaosDamagePct', 5]] },
            { id: 'perfect-recipe', name: '완전한 배합식', effects: [['intelligence', 16], ['poisonDamageMultiplierPct', 10]] },
            { id: 'mental-fortress', name: '정신의 성채', effects: [['intelligence', 16], ['physTakenAsChaos', 4]] },
            { id: 'thought-speed', name: '사고 가속', effects: [['intelligence', 16], ['aspd', 5]] },
            { id: 'command-language', name: '지배의 언어', effects: [['intelligence', 18], ['summonResPen', 4]] }
        ]
    },
    atk: {
        normal: [
            { id: 'tempo', name: '전투의 박자', effects: [['pctDmg', 8], ['aspd', 2.5]] },
            { id: 'weakness', name: '약점 포착', effects: [['pctDmg', 8], ['crit', 1.2]] },
            { id: 'force', name: '응축된 힘', effects: [['pctDmg', 7], ['flatDmg', 3]] },
            { id: 'aim', name: '정확한 공세', effects: [['pctDmg', 7], ['accuracy', 50]] }
        ],
        major: [
            { id: 'relentless', name: '거침없는 공세', effects: [['pctDmg', 18], ['aspd', 5]] },
            { id: 'fatal', name: '치명적 간파', effects: [['pctDmg', 16], ['critDmg', 18]] },
            { id: 'crushing', name: '압도하는 힘', effects: [['pctDmg', 16], ['doubleDamageChance', 2]] },
            { id: 'perfect-aim', name: '완전한 조준', effects: [['pctDmg', 15], ['accuracyBonusPct', 10]] },
            { id: 'wide-assault', name: '전장 장악', effects: [['pctDmg', 15], ['aoePctDmg', 10]] },
            { id: 'breach', name: '방어선 돌파', effects: [['pctDmg', 15], ['resPen', 3]] }
        ]
    },
    melee: {
        normal: [
            { id: 'edge', name: '날 선 일격', effects: [['meleePctDmg', 8], ['flatDmg', 3]] },
            { id: 'flurry', name: '연속 베기', effects: [['meleePctDmg', 7.5], ['aspd', 2.5]] },
            { id: 'vital', name: '급소 절개', effects: [['meleePctDmg', 7.5], ['crit', 1.2]] },
            { id: 'pierce', name: '파고드는 칼끝', effects: [['meleePctDmg', 7], ['physIgnore', 2.5]] }
        ],
        major: [
            { id: 'execution', name: '처형의 칼날', effects: [['meleePctDmg', 18], ['doubleDamageChance', 2]] },
            { id: 'storm-edge', name: '질풍의 칼날', effects: [['meleePctDmg', 16], ['aspd', 5]] },
            { id: 'fatal-edge', name: '치명적인 틈', effects: [['meleePctDmg', 16], ['critDmg', 18]] },
            { id: 'armor-split', name: '갑주 절단', effects: [['meleePctDmg', 16], ['physIgnore', 4]] },
            { id: 'open-wound', name: '벌어진 상처', effects: [['meleePctDmg', 14], ['bleedChance', 10]] },
            { id: 'duelist-vigor', name: '결투자의 생명력', effects: [['meleePctDmg', 14], ['takenDamageReduceWhen1EnemyPct', 3]] },
            { id: 'guarded-edge', name: '방어적인 칼끝', effects: [['meleePctDmg', 16], ['leechTotalCap', 3]] },
            { id: 'heavy-edge', name: '묵직한 칼끝', effects: [['meleePctDmg', 18], ['flatDmg', 7]] },
            { id: 'precise-edge', name: '정밀한 칼끝', effects: [['meleePctDmg', 16], ['crit', 3]] },
            { id: 'skirmisher', name: '척후의 칼날', effects: [['meleePctDmg', 14], ['move', 5]] }
        ]
    },
    projectile: {
        normal: [
            { id: 'straight', name: '곧은 궤적', effects: [['projectilePctDmg', 8], ['accuracy', 55]] },
            { id: 'swift', name: '빠른 시위', effects: [['projectilePctDmg', 7.5], ['aspd', 2.5]] },
            { id: 'weakness', name: '약점 조준', effects: [['projectilePctDmg', 7.5], ['crit', 1.2]] },
            { id: 'venom', name: '독화살 연구', effects: [['projectilePctDmg', 7], ['dotPctDmg', 5]] }
        ],
        major: [
            { id: 'deadeye', name: '정확한 사수', effects: [['projectilePctDmg', 18], ['accuracyBonusPct', 10]] },
            { id: 'storm-shot', name: '질풍 사격', effects: [['projectilePctDmg', 16], ['aspd', 5]] },
            { id: 'heart-shot', name: '심장 관통', effects: [['projectilePctDmg', 16], ['critDmg', 18]] },
            { id: 'venom-rain', name: '맹독의 비', effects: [['projectilePctDmg', 14], ['poisonDamageMultiplierPct', 12]] },
            { id: 'cold-string', name: '서리 먹인 시위', effects: [['projectilePctDmg', 15], ['addedColdDamagePct', 5]] },
            { id: 'armour-piercer', name: '갑주 관통탄', effects: [['projectilePctDmg', 16], ['physIgnore', 4]] },
            { id: 'longshot', name: '장거리 조준', effects: [['projectilePctDmg', 18], ['accuracy', 140]] },
            { id: 'physical-shot', name: '강철 촉 화살', effects: [['projectilePctDmg', 16], ['physPctDmg', 12]] }
        ]
    },
    physical: {
        normal: [
            { id: 'split', name: '철을 가르는 힘', effects: [['physPctDmg', 8], ['physIgnore', 2.5]] },
            { id: 'wound', name: '깊은 상처', effects: [['physPctDmg', 7.5], ['bleedChance', 4]] },
            { id: 'blood-trail', name: '피의 궤적', effects: [['dotPctDmg', 7], ['bleedChance', 4]] },
            { id: 'heavy', name: '무거운 타격', effects: [['physPctDmg', 8], ['flatDmg', 3]] },
            { id: 'earth-impact', name: '대지의 충격', effects: [['physPctDmg', 7], ['slamPctDmg', 7]] }
        ],
        major: [
            { id: 'sunder', name: '철벽 파쇄', effects: [['physPctDmg', 18], ['physIgnore', 4]] },
            { id: 'deep-wound', name: '깊게 패인 상처', effects: [['physPctDmg', 16], ['bleedChance', 10]] },
            { id: 'blood-road', name: '핏빛 길', effects: [['dotPctDmg', 15], ['bleedChance', 10]] },
            { id: 'heavy-force', name: '산을 울리는 힘', effects: [['physPctDmg', 16], ['doubleDamageChance', 2]] },
            { id: 'iron-body', name: '강철의 육신', effects: [['physPctDmg', 15], ['takenDamageReduceWhen2EnemiesPct', 3]] },
            { id: 'bone-break', name: '뼈를 부수는 일격', effects: [['physPctDmg', 15], ['critDmg', 18]] },
            { id: 'shockwave', name: '충격파', effects: [['physPctDmg', 15], ['aoePctDmg', 10]] },
            { id: 'cataclysm', name: '산맥을 깨우는 진동', effects: [['physPctDmg', 14], ['slamPctDmg', 18]] },
            { id: 'crushing-blow', name: '분쇄 타격', effects: [['physPctDmg', 18], ['flatDmg', 7]] }
        ]
    },
    armor: {
        normal: [
            { id: 'shell', name: '강철 외피', effects: [['armorPct', 8], ['armor', 25]] },
            { id: 'front', name: '전열 방벽', effects: [['armorPct', 8], ['pctHp', 3.5]] },
            { id: 'guard', name: '완강한 수비', effects: [['blockChance', 1.2], ['armorPct', 7]] },
            { id: 'bulwark', name: '저항의 보루', effects: [['armorPct', 7], ['resAll', 3.5]] }
        ],
        major: [
            { id: 'steel-fort', name: '강철 성채', effects: [['armorPct', 18], ['physTakenAsFire', 4]] },
            { id: 'unbroken-line', name: '무너지지 않는 전열', effects: [['armorPct', 16], ['takenDamageReduceWhen2EnemiesPct', 3]] },
            { id: 'perfect-guard', name: '철벽 방어', effects: [['blockChance', 3], ['blockChanceMax', 1.5]] },
            { id: 'impact-dispersion', name: '충격 분산', effects: [['dr', 2], ['armorPct', 12]] },
            { id: 'living-armour', name: '살아 있는 갑주', effects: [['armorPct', 14], ['regen', 0.8]] },
            { id: 'elemental-fort', name: '원소의 보루', effects: [['armorPct', 14], ['resAll', 7.5]] },
            { id: 'shield-wall', name: '방패벽', effects: [['shieldPctDmg', 14], ['armorPct', 12]] },
            { id: 'frontline-vitality', name: '전열의 체력', effects: [['armorPct', 16], ['pctHp', 6]] },
            { id: 'plated-guard', name: '판금 수비', effects: [['armorPct', 14], ['blockChance', 3]] },
            { id: 'living-bulwark', name: '살아 있는 보루', effects: [['blockChance', 3], ['pctHp', 6]] }
        ]
    },
    evasion: {
        normal: [
            { id: 'flow', name: '흐르는 몸놀림', effects: [['evasionPct', 8], ['evasion', 25]] },
            { id: 'trace', name: '흔적 없는 걸음', effects: [['evasionPct', 7], ['move', 2.5]] },
            { id: 'glance', name: '비스듬한 회피', effects: [['deflectChance', 2], ['evasionPct', 6]] },
            { id: 'counter', name: '반격의 틈', effects: [['evasionPct', 7], ['crit', 1.2]] },
            { id: 'swift', name: '날랜 몸놀림', effects: [['evasionPct', 7], ['aspd', 2.5]] }
        ],
        major: [
            { id: 'afterimage', name: '무수한 잔상', effects: [['evasionPct', 18], ['evasion', 50]] },
            { id: 'wind-step', name: '바람걸음', effects: [['evasionPct', 16], ['move', 5]] },
            { id: 'slant', name: '흘려내기', effects: [['deflectChance', 7], ['evasionPct', 12]] },
            { id: 'counter-gap', name: '반격의 순간', effects: [['evasionPct', 14], ['takenDamageReduceWhen1EnemyPct', 2.5]] },
            { id: 'mobile-archer', name: '움직이는 사수', effects: [['evasionPct', 14], ['accuracyBonusPct', 8]] },
            { id: 'shadow-duelist', name: '그림자 결투', effects: [['evasionPct', 14], ['doubleDamageChance', 1.5]] },
            { id: 'untouched', name: '닿지 않는 몸', effects: [['evasionPct', 14], ['takenDamageReduceWhen2EnemiesPct', 2.5]] },
            { id: 'swift-shadow', name: '날랜 잔상', effects: [['evasionPct', 16], ['aspd', 5]] }
        ]
    },
    energyShield: {
        normal: [
            { id: 'barrier', name: '비전 방벽', effects: [['energyShieldPct', 8], ['energyShield', 20]] },
            { id: 'mind-shell', name: '정신의 외피', effects: [['energyShieldPct', 7], ['resAll', 3.5]] },
            { id: 'condense', name: '응축된 보호막', effects: [['energyShieldPct', 7], ['intelligence', 8]] },
            { id: 'recharge', name: '차오르는 장막', effects: [['energyShieldPct', 7], ['energyShieldRegen', 4]] }
        ],
        major: [
            { id: 'arcane-fort', name: '비전 성채', effects: [['energyShieldPct', 18], ['energyShield', 40]] },
            { id: 'sealed-mind', name: '봉인된 정신', effects: [['energyShieldPct', 16], ['resAll', 7.5]] },
            { id: 'mind-crystal', name: '정신 결정', effects: [['energyShieldPct', 16], ['intelligence', 16]] },
            { id: 'living-veil', name: '살아 있는 장막', effects: [['energyShieldPct', 14], ['energyShieldRegen', 8]] },
            { id: 'spell-ward', name: '주문 방호', effects: [['energyShieldPct', 14], ['spellPctDmg', 12]] },
            { id: 'abyss-ward', name: '심연 방호', effects: [['energyShieldPct', 14], ['chaosPctDmg', 12]] },
            { id: 'guarded-soul', name: '보호받는 영혼', effects: [['energyShieldPct', 14], ['blockChanceMax', 1]] },
            { id: 'rapid-recharge', name: '빠른 재충전', effects: [['energyShieldPct', 14], ['energyShieldRechargeFaster', 0.2]] }
        ]
    },
    spell: {
        normal: [
            { id: 'weave', name: '주문 직조', effects: [['spellPctDmg', 8.5], ['aspd', 2.5]] },
            { id: 'focus', name: '집중된 술식', effects: [['spellPctDmg', 8], ['crit', 1.2]] },
            { id: 'circle', name: '확장된 주문진', effects: [['spellPctDmg', 7.5], ['aoePctDmg', 5]] },
            { id: 'breach', name: '저항 해석', effects: [['spellPctDmg', 7.5], ['resPen', 1.5]] },
            { id: 'channel-focus', name: '유지되는 주문', effects: [['spellPctDmg', 7], ['channelingPctDmg', 7]] }
        ],
        major: [
            { id: 'rapid-weave', name: '고속 영창', effects: [['spellPctDmg', 18], ['aspd', 5]] },
            { id: 'perfect-formula', name: '완전한 술식', effects: [['spellPctDmg', 16], ['critDmg', 18]] },
            { id: 'grand-circle', name: '대주문진', effects: [['spellPctDmg', 15], ['aoePctDmg', 10]] },
            { id: 'resistance-unravel', name: '저항 해체', effects: [['spellPctDmg', 15], ['resPen', 3]] },
            { id: 'elemental-script', name: '삼원 주문서', effects: [['spellPctDmg', 14], ['elementalPctDmg', 12]] },
            { id: 'warded-caster', name: '보호받는 술사', effects: [['spellPctDmg', 14], ['energyShieldPct', 12]] },
            { id: 'lingering-spell', name: '남겨진 주문', effects: [['spellPctDmg', 16], ['dotPctDmg', 10]] },
            { id: 'perfect-channel', name: '끊기지 않는 술식', effects: [['spellPctDmg', 14], ['channelingPctDmg', 18]] },
            { id: 'focused-caster', name: '집중하는 술사', effects: [['spellPctDmg', 16], ['crit', 3]] }
        ]
    },
    chaos: {
        normal: [
            { id: 'erosion', name: '심연의 침식', effects: [['chaosPctDmg', 8], ['poisonChance', 4]] },
            { id: 'decay', name: '느린 부패', effects: [['chaosPctDmg', 8], ['dotPctDmg', 7]] },
            { id: 'breach', name: '공허 관통', effects: [['chaosPctDmg', 7], ['resPen', 1.5]] },
            { id: 'veil', name: '공허의 장막', effects: [['chaosPctDmg', 7], ['resChaos', 4]] }
        ],
        major: [
            { id: 'toxic-abyss', name: '맹독의 심연', effects: [['chaosPctDmg', 18], ['poisonDamageMultiplierPct', 12]] },
            { id: 'endless-decay', name: '끝없는 부패', effects: [['chaosPctDmg', 16], ['dotPctDmg', 15]] },
            { id: 'void-breach', name: '공허 균열', effects: [['chaosPctDmg', 15], ['resPen', 3]] },
            { id: 'black-veil', name: '검은 장막', effects: [['chaosPctDmg', 14], ['physTakenAsChaos', 4]] },
            { id: 'forbidden-spell', name: '금단 주문', effects: [['chaosPctDmg', 14], ['addedChaosDamagePct', 5]] },
            { id: 'servant-ritual', name: '사역 의식', effects: [['chaosPctDmg', 14], ['summonResPen', 4]] },
            { id: 'void-ward', name: '공허의 방호', effects: [['chaosPctDmg', 14], ['resChaos', 8]] },
            { id: 'abyssal-spell', name: '심연 주문', effects: [['chaosPctDmg', 16], ['spellPctDmg', 12]] }
        ]
    },
    elemental: {
        normal: [
            { id: 'harmony', name: '삼원 조율', effects: [['elementalPctDmg', 8], ['resPen', 1.5]] },
            { id: 'fire', name: '불꽃 촉매', effects: [['firePctDmg', 8], ['igniteChance', 4]] },
            { id: 'cold', name: '서리 촉매', effects: [['coldPctDmg', 8], ['chillChance', 4]] },
            { id: 'lightning', name: '전류 촉매', effects: [['lightPctDmg', 8], ['shockChance', 4]] }
        ],
        major: [
            { id: 'convergence', name: '삼원 수렴', effects: [['elementalPctDmg', 18], ['resPen', 3]] },
            { id: 'prism-ward', name: '프리즘 방벽', effects: [['elementalPctDmg', 15], ['resAll', 6]] },
            { id: 'inferno', name: '불길의 중심', effects: [['firePctDmg', 15], ['igniteDamageMultiplierPct', 12]] },
            { id: 'absolute-zero', name: '절대 영도', effects: [['coldPctDmg', 15], ['addedColdDamagePct', 5]] },
            { id: 'thunder-core', name: '뇌정의 중심', effects: [['lightPctDmg', 15], ['shockedEnemyHitDamageMorePct', 10]] },
            { id: 'elemental-script', name: '원소 술식', effects: [['elementalPctDmg', 14], ['spellPctDmg', 12]] }
        ]
    },
    fire: {
        normal: [
            { id: 'core', name: '타오르는 핵', effects: [['firePctDmg', 8], ['igniteChance', 4]] },
            { id: 'spread', name: '번지는 불씨', effects: [['firePctDmg', 7.5], ['aoePctDmg', 5]] },
            { id: 'ember', name: '잿불의 잔열', effects: [['firePctDmg', 7.5], ['dotPctDmg', 6]] },
            { id: 'breach', name: '화염 관통', effects: [['firePctDmg', 7.5], ['resPen', 1.5]] }
        ],
        major: [
            { id: 'inferno-heart', name: '업화의 심장', effects: [['firePctDmg', 18], ['igniteDamageMultiplierPct', 12]] },
            { id: 'wildfire', name: '들불', effects: [['firePctDmg', 16], ['aoePctDmg', 10]] },
            { id: 'eternal-ember', name: '꺼지지 않는 잿불', effects: [['firePctDmg', 16], ['dotPctDmg', 12]] },
            { id: 'melt-resistance', name: '저항 용해', effects: [['firePctDmg', 15], ['resPen', 3]] },
            { id: 'rapid-combustion', name: '급속 연소', effects: [['firePctDmg', 15], ['aspd', 5]] },
            { id: 'fire-ward', name: '불꽃 장막', effects: [['firePctDmg', 15], ['physTakenAsFire', 4]] },
            { id: 'kindled-heart', name: '불붙은 심장', effects: [['firePctDmg', 18], ['igniteChance', 10]] }
        ]
    },
    cold: {
        normal: [
            { id: 'core', name: '차가운 핵', effects: [['coldPctDmg', 8], ['chillChance', 4]] },
            { id: 'shatter', name: '깨지는 서리', effects: [['coldPctDmg', 7.5], ['crit', 1.2]] },
            { id: 'veil', name: '빙결의 장막', effects: [['coldPctDmg', 7.5], ['energyShieldPct', 6]] },
            { id: 'breach', name: '냉기 관통', effects: [['coldPctDmg', 7.5], ['resPen', 1.5]] }
        ],
        major: [
            { id: 'winter-heart', name: '겨울의 심장', effects: [['coldPctDmg', 18], ['addedColdDamagePct', 6]] },
            { id: 'shatter-point', name: '빙점 파쇄', effects: [['coldPctDmg', 16], ['critDmg', 18]] },
            { id: 'glacial-veil', name: '빙하의 장막', effects: [['coldPctDmg', 16], ['physTakenAsCold', 4]] },
            { id: 'frost-breach', name: '서리 균열', effects: [['coldPctDmg', 15], ['resPen', 3]] },
            { id: 'cold-snap', name: '급랭', effects: [['coldPctDmg', 15], ['aspd', 5]] },
            { id: 'wide-frost', name: '혹한 지대', effects: [['coldPctDmg', 15], ['aoePctDmg', 10]] },
            { id: 'frozen-core', name: '얼어붙은 핵', effects: [['coldPctDmg', 18], ['chillChance', 10]] }
        ]
    },
    lightning: {
        normal: [
            { id: 'core', name: '전도성 핵', effects: [['lightPctDmg', 8], ['shockChance', 4]] },
            { id: 'current', name: '연쇄 전류', effects: [['lightPctDmg', 7.5], ['aspd', 2.5]] },
            { id: 'flash', name: '폭발하는 뇌광', effects: [['lightPctDmg', 7.5], ['crit', 1.2]] },
            { id: 'breach', name: '번개 관통', effects: [['lightPctDmg', 7.5], ['resPen', 1.5]] }
        ],
        major: [
            { id: 'storm-heart', name: '폭풍의 심장', effects: [['lightPctDmg', 18], ['shockedEnemyHitDamageMorePct', 10]] },
            { id: 'light-speed', name: '광속 전류', effects: [['lightPctDmg', 16], ['aspd', 5]] },
            { id: 'thunderbolt', name: '낙뢰', effects: [['lightPctDmg', 16], ['critDmg', 18]] },
            { id: 'storm-breach', name: '폭풍 균열', effects: [['lightPctDmg', 15], ['resPen', 3]] },
            { id: 'chain-storm', name: '연쇄 폭풍', effects: [['lightPctDmg', 15], ['aoePctDmg', 10]] },
            { id: 'charged-ward', name: '대전 장막', effects: [['lightPctDmg', 15], ['physTakenAsLight', 4]] }
        ]
    },
    ailment: {
        normal: [
            { id: 'wound', name: '상처의 숙성', effects: [['dotPctDmg', 8], ['bleedChance', 4]] },
            { id: 'poison', name: '독의 숙성', effects: [['dotPctDmg', 8], ['poisonChance', 4]] },
            { id: 'burn', name: '불씨의 숙성', effects: [['dotPctDmg', 8], ['igniteChance', 4]] },
            { id: 'infection', name: '빠른 감염', effects: [['dotPctDmg', 7], ['aspd', 2.5]] }
        ],
        major: [
            { id: 'hemorrhage', name: '대출혈', effects: [['dotPctDmg', 18], ['bleedChance', 10]] },
            { id: 'virulent', name: '맹독성', effects: [['dotPctDmg', 18], ['poisonDamageMultiplierPct', 12]] },
            { id: 'conflagration', name: '대점화', effects: [['dotPctDmg', 18], ['igniteDamageMultiplierPct', 12]] },
            { id: 'rapid-plague', name: '급속 전염', effects: [['dotPctDmg', 16], ['aspd', 5]] },
            { id: 'wide-plague', name: '번지는 병증', effects: [['dotPctDmg', 16], ['aoePctDmg', 10]] },
            { id: 'toxic-breach', name: '독성 침투', effects: [['dotPctDmg', 16], ['resPen', 3]] }
        ]
    },
    potion: {
        normal: [
            { id: 'concentrate', name: '농축 시약', effects: [['potionPctDmg', 9], ['dotPctDmg', 6]] },
            { id: 'volatile', name: '휘발성 혼합', effects: [['potionPctDmg', 8], ['aoePctDmg', 5]] },
            { id: 'throw', name: '신속 투척', effects: [['potionPctDmg', 8], ['aspd', 2.5]] },
            { id: 'venom', name: '맹독 용액', effects: [['potionPctDmg', 8], ['poisonChance', 4]] }
        ],
        major: [
            { id: 'pure-concentrate', name: '극순도 농축액', effects: [['potionPctDmg', 20], ['poisonDamageMultiplierPct', 12]] },
            { id: 'chain-reaction', name: '연쇄 반응', effects: [['potionPctDmg', 18], ['aoePctDmg', 10]] },
            { id: 'rapid-throw', name: '연속 투척', effects: [['potionPctDmg', 18], ['aspd', 5]] },
            { id: 'deadly-mixture', name: '치명적 혼합물', effects: [['potionPctDmg', 16], ['poisonDamageMultiplierPct', 10]] },
            { id: 'incendiary', name: '발화성 시약', effects: [['potionPctDmg', 16], ['addedFireDamagePct', 5]] },
            { id: 'precise-dose', name: '정밀 투약', effects: [['potionPctDmg', 16], ['critDmg', 18]] },
            { id: 'lingering-extract', name: '잔류 추출물', effects: [['potionPctDmg', 18], ['dotPctDmg', 12]] }
        ]
    },
    shield: {
        normal: [
            { id: 'bash', name: '방패 강타', effects: [['shieldPctDmg', 9], ['armorPct', 7]] },
            { id: 'counter', name: '반격 방벽', effects: [['shieldPctDmg', 8], ['blockChance', 1.2]] },
            { id: 'sanctuary', name: '성역의 방패', effects: [['shieldPctDmg', 8], ['resAll', 3.5]] },
            { id: 'march', name: '굳건한 진군', effects: [['blockChance', 1.2], ['pctHp', 3.5]] }
        ],
        major: [
            { id: 'crushing-shield', name: '분쇄 방패', effects: [['shieldPctDmg', 20], ['armorPct', 14]] },
            { id: 'counter-fort', name: '반격의 성채', effects: [['shieldPctDmg', 18], ['blockChanceMax', 1.5]] },
            { id: 'holy-shield', name: '성스러운 방패', effects: [['shieldPctDmg', 16], ['resAll', 7.5]] },
            { id: 'unbroken-march', name: '불굴의 진군', effects: [['blockChance', 3], ['takenDamageReduceWhen2EnemiesPct', 3]] },
            { id: 'arcane-shield', name: '비전 방패', effects: [['shieldPctDmg', 16], ['energyShieldPct', 12]] },
            { id: 'thunder-shield', name: '뇌광 방패', effects: [['shieldPctDmg', 16], ['addedLightDamagePct', 5]] }
        ]
    },
    summon: {
        normal: [
            { id: 'pack-command', name: '군세 지휘', effects: [['summonPctDmg', 9], ['summonAspd', 4]] },
            { id: 'bound-life', name: '결속된 생명', effects: [['summonPctDmg', 8], ['summonHpPct', 9]] },
            { id: 'predator-eye', name: '포식자의 눈', effects: [['summonPctDmg', 8], ['summonCrit', 1.5]] },
            { id: 'elemental-command', name: '원소 지휘', effects: [['summonPctDmg', 8], ['summonResPen', 2]] }
        ],
        major: [
            { id: 'legion-command', name: '군단 지휘', effects: [['summonPctDmg', 18], ['summonAspd', 8]] },
            { id: 'immortal-retinue', name: '불멸의 권속', effects: [['summonPctDmg', 16], ['summonHpPct', 18]] },
            { id: 'apex-predator', name: '최상위 포식자', effects: [['summonPctDmg', 16], ['summonCrit', 3]] },
            { id: 'higher-summoning', name: '상위 사역술', effects: [['summonPctDmg', 14], ['summonGemLevel', 1]] },
            { id: 'resistance-breaker', name: '권속의 파쇄명령', effects: [['summonPctDmg', 16], ['summonResPen', 5]] }
        ]
    },
    mystique: {
        normal: [
            { id: 'deep-gaze', name: '깊은 응시', effects: [['mystique', 1], ['dotPctDmg', 5]] },
            { id: 'ailment-secret', name: '병증의 비의', effects: [['mystique', 1], ['poisonChance', 3]] },
            { id: 'forbidden-sight', name: '금단의 관측', effects: [['mystique', 1], ['crit', 1]] },
            { id: 'spell-gaze', name: '주문 응시', effects: [['mystique', 1], ['spellPctDmg', 5]] },
            { id: 'hunter-sight', name: '사냥꾼의 시야', effects: [['mystique', 1], ['projectilePctDmg', 5]] }
        ],
        major: [
            { id: 'abyss-eye', name: '심연의 눈', effects: [['mystique', 2], ['dotPctDmg', 10]] },
            { id: 'poison-eye', name: '맹독의 눈', effects: [['mystique', 2], ['poisonChance', 6]] },
            { id: 'truth-eye', name: '진실을 보는 눈', effects: [['mystique', 2], ['crit', 2]] },
            { id: 'arcane-eye', name: '비전의 눈', effects: [['mystique', 2], ['spellPctDmg', 10]] },
            { id: 'void-eye', name: '공허를 보는 눈', effects: [['mystique', 2], ['chaosPctDmg', 10]] },
            { id: 'burning-eye', name: '타오르는 눈', effects: [['mystique', 2], ['igniteChance', 6]] },
            { id: 'hunter-eye', name: '사냥꾼의 눈', effects: [['mystique', 2], ['projectilePctDmg', 10]] }
        ]
    },
    devotion: {
        normal: [
            { id: 'combat', name: '전투의 계시', effects: [['devotion', 1], ['pctDmg', 4]] },
            { id: 'guard', name: '수호의 계시', effects: [['devotion', 1], ['resAll', 2.5]] },
            { id: 'life', name: '생명의 계시', effects: [['devotion', 1], ['pctHp', 2]] },
            { id: 'spirit', name: '영혼의 계시', effects: [['devotion', 1], ['energyShieldPct', 4]] },
            { id: 'abyss', name: '심연의 계시', effects: [['devotion', 1], ['chaosPctDmg', 5]] },
            { id: 'forbidden', name: '금단의 계시', effects: [['devotion', 1], ['spellPctDmg', 5]] },
            { id: 'sealed', name: '봉인의 계시', effects: [['devotion', 1], ['energyShieldRechargeFaster', 0.1]] },
            { id: 'void', name: '공허의 계시', effects: [['devotion', 1], ['resChaos', 2.5]] }
        ],
        major: [
            { id: 'war-gospel', name: '전투 복음', effects: [['devotion', 2], ['pctDmg', 8]] },
            { id: 'guard-gospel', name: '수호 복음', effects: [['devotion', 2], ['resAll', 5]] },
            { id: 'life-gospel', name: '생명 복음', effects: [['devotion', 2], ['pctHp', 4]] },
            { id: 'soul-gospel', name: '영혼 복음', effects: [['devotion', 2], ['energyShieldPct', 8]] },
            { id: 'recovery-gospel', name: '회복 복음', effects: [['devotion', 2], ['regen', 0.6]] },
            { id: 'shield-gospel', name: '방패 복음', effects: [['devotion', 2], ['shieldPctDmg', 12]] },
            { id: 'abyss-gospel', name: '심연 복음', effects: [['devotion', 2], ['chaosPctDmg', 10]] },
            { id: 'forbidden-gospel', name: '금단 복음', effects: [['devotion', 2], ['spellPctDmg', 10]] },
            { id: 'sealed-gospel', name: '봉인 복음', effects: [['devotion', 2], ['energyShieldRechargeFaster', 0.2]] },
            { id: 'void-gospel', name: '공허 복음', effects: [['devotion', 2], ['resChaos', 8]] }
        ]
    },
    cycle: {
        normal: [
            { id: 'impact', name: '반복되는 충격', effects: [['cycle', 1], ['aspd', 2]] },
            { id: 'return', name: '빠른 회귀', effects: [['cycle', 1], ['move', 2]] },
            { id: 'breath', name: '되찾는 숨', effects: [['cycle', 1], ['regen', 0.3]] },
            { id: 'shell', name: '겹치는 파문', effects: [['cycle', 1], ['armorPct', 5]] },
            { id: 'battle', name: '전장의 파문', effects: [['cycle', 1], ['meleePctDmg', 5]] }
        ],
        major: [
            { id: 'storm-cycle', name: '폭풍의 순환', effects: [['cycle', 2], ['aspd', 4]] },
            { id: 'wind-cycle', name: '바람의 순환', effects: [['cycle', 2], ['move', 4]] },
            { id: 'life-cycle', name: '생명의 순환', effects: [['cycle', 2], ['regen', 0.6]] },
            { id: 'iron-cycle', name: '강철의 순환', effects: [['cycle', 2], ['armorPct', 10]] },
            { id: 'element-cycle', name: '삼원의 순환', effects: [['cycle', 2], ['elementalPctDmg', 10]] },
            { id: 'ailment-cycle', name: '병증의 순환', effects: [['cycle', 2], ['dotPctDmg', 10]] },
            { id: 'battle-cycle', name: '전장의 순환', effects: [['cycle', 2], ['meleePctDmg', 10]] }
        ]
    }
});

const RARE_MAJOR_EFFECTS = Object.freeze({
    nkgpgl9m7h6: ['suppCap', 1],
    nhoks5kcy65: ['chaosGemLevel', 1],
    n02fmde04qc: ['projectileExtraShots', 1],
    v13_bulk_궁수_1_13: ['projectileExtraShots', 1],
    v13_bulk_연금술사_3_10: ['gemLevel', 1],
    n313c5ajjtn: ['gemLevel', 1],
    expansion_occult_grimoire_20: ['gemLevel', 1]
});

module.exports = {
    FEATURE_EFFECT_PROFILES, RARE_MAJOR_EFFECTS, isCleanFeaturePassiveValue,
    nextFeaturePassiveValue, normalizeFeaturePassiveValue, scaleFeatureProfileEffects
};
