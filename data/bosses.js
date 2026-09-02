if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/bosses.js');

// Phase-1 extracted data block.
const ACT_BOSS_NAMES = Object.fromEntries(STORY_ACTS.map((act, idx) => [idx, act.bossName]));


const ACT_BOSS_ASSET_KEYS = [
    'bossAct1', 'bossAct2', 'bossAct3', 'bossAct4_1', 'bossAct5',
    'bossAct6', 'bossAct7', 'bossAct8_1', 'bossAct9', 'bossAct10_1'
];

const BOSS_ASSET_MANIFEST = {
    bossAct1: 'assets/boss/Act1.png',
    bossAct2: 'assets/boss/Act2.png',
    bossAct3: 'assets/boss/Act3.png',
    bossAct4_1: 'assets/boss/Act4-1.png',
    bossAct4_2: 'assets/boss/Act4-2.png',
    bossAct5: 'assets/boss/Act5.png',
    bossAct6: 'assets/boss/Act6.png',
    bossAct7: 'assets/boss/Act7.png',
    bossAct8_1: 'assets/boss/Act8-1.png',
    bossAct8_2: 'assets/boss/Act8-2.png',
    bossAct8_3: 'assets/boss/Act8-3.png',
    bossAct9: 'assets/boss/Act9.png',
    bossAct10_1: 'assets/boss/Act10(1).png',
    bossAct10_2: 'assets/boss/Act10(2).png',
    bossAct10_3: 'assets/boss/Act10(3).png',
    bossAct10_4: 'assets/boss/Act10(4).png',
    bossAct10_5: 'assets/boss/Act10(5).png'
};

const BOSS_ASSET_VARIANTS_BY_ACT = {
    4: ['bossAct4_1', 'bossAct4_2'],
    8: ['bossAct8_1', 'bossAct8_2', 'bossAct8_3'],
    10: ['bossAct10_1', 'bossAct10_2', 'bossAct10_3', 'bossAct10_4', 'bossAct10_5']
};

const REALM_MONSTER_VISUAL_SETS = Object.freeze({
    underworld: Object.freeze({
        id: 'underworld', assetKey: 'realmEnemyUnderworld', src: 'assets/enemies/realms/underworld-v1.webp',
        zoneTypes: Object.freeze(['underworld']), pinnacleTracks: Object.freeze(['underworld']),
        members: Object.freeze([
            ['underworld-crawler', '암반 굴착수', 'normal'], ['underworld-beetle', '흑요석 갑충', 'normal'],
            ['underworld-miner', '사슬 광부', 'normal'], ['underworld-hound', '균사 사냥개', 'normal'],
            ['underworld-executioner', '용암 집행자', 'elite'], ['underworld-wraith', '묘등 망령', 'elite'],
            ['underworld-king', '지저 군주', 'boss']
        ].map((entry, cell) => Object.freeze({ id: entry[0], name: entry[1], role: entry[2], cell })))
    }),
    cosmos: Object.freeze({
        id: 'cosmos', assetKey: 'realmEnemyCosmos', src: 'assets/enemies/realms/cosmos-v1.webp',
        zoneTypes: Object.freeze(['cosmos']), zoneIds: Object.freeze(['cosmos_astra']),
        members: Object.freeze([
            ['cosmos-star', '성흔 가시체', 'normal'], ['cosmos-ooze', '혜성 점액체', 'normal'],
            ['cosmos-wisp', '성좌 망령', 'normal'], ['cosmos-wanderer', '공허 방랑자', 'normal'],
            ['cosmos-sentinel', '궤도 파수병', 'elite'], ['cosmos-seer', '성운 예언자', 'elite'],
            ['cosmos-colossus', '성핵 거신', 'boss']
        ].map((entry, cell) => Object.freeze({ id: entry[0], name: entry[1], role: entry[2], cell })))
    }),
    ocean: Object.freeze({
        id: 'ocean', assetKey: 'realmEnemyOcean', src: 'assets/enemies/realms/ocean-v1.webp',
        zoneTypes: Object.freeze(['oceanDepth']), pinnacleTracks: Object.freeze(['ocean']),
        members: Object.freeze([
            ['ocean-angler', '심해 초롱어', 'normal'], ['ocean-crab', '산호 집게', 'normal'],
            ['ocean-cultist', '해구 주술사', 'normal'], ['ocean-shell', '철갑 패각충', 'normal'],
            ['ocean-knight', '조류 기사', 'elite'], ['ocean-oracle', '해파리 신탁', 'elite'],
            ['ocean-leviathan', '해구 레비아탄', 'boss']
        ].map((entry, cell) => Object.freeze({ id: entry[0], name: entry[1], role: entry[2], cell })))
    }),
    sky: Object.freeze({
        id: 'sky', assetKey: 'realmEnemySky', src: 'assets/enemies/realms/sky-v1.webp',
        zoneTypes: Object.freeze(['skyTower']), pinnacleTracks: Object.freeze(['sky']),
        members: Object.freeze([
            ['sky-imp', '구름 도깨비', 'normal'], ['sky-roc', '어린 뇌조', 'normal'],
            ['sky-sentinel', '날개 파수병', 'normal'], ['sky-harpy', '질풍 하피', 'normal'],
            ['sky-lancer', '폭풍 창기병', 'elite'], ['sky-griffin', '태양 그리핀', 'elite'],
            ['sky-titan', '창공 거신', 'boss']
        ].map((entry, cell) => Object.freeze({ id: entry[0], name: entry[1], role: entry[2], cell })))
    })
});

function getRealmMonsterVisualSet(zone) {
    if (!zone) return null;
    const zoneId = String(zone.id || '');
    return Object.values(REALM_MONSTER_VISUAL_SETS).find(set =>
        set.zoneTypes.includes(zone.type) || (set.zoneIds || []).includes(zoneId)
        || (set.pinnacleTracks || []).includes(zone.pinnacleTrack)) || null;
}

function getRealmMonsterVisualDefinition(set, role, variantSeed) {
    if (!set) return null;
    const pool = set.members.filter(member => member.role === role);
    if (pool.length === 0) return null;
    return pool[Math.abs(Math.floor(Number(variantSeed) || 0)) % pool.length];
}

function getRealmMonsterVisualDefinitionById(id) {
    for (const set of Object.values(REALM_MONSTER_VISUAL_SETS)) {
        const member = set.members.find(entry => entry.id === id);
        if (member) return member;
    }
    return null;
}

function getBossAssetKeyForZone(zone, variantSeed) {
    if (!zone || (zone.type && zone.type !== 'act') || !Number.isInteger(Number(zone.id))) return null;
    const actNumber = Number(zone.id) + 1;
    const variants = BOSS_ASSET_VARIANTS_BY_ACT[actNumber];
    if (variants && variants.length > 0) {
        const index = Math.abs(Math.floor(Number(variantSeed) || 0)) % variants.length;
        return variants[index];
    }
    return ACT_BOSS_ASSET_KEYS[actNumber - 1] || null;
}

const ENEMY_TRAIT_POOL = [
    { id: 'rapid', name: '광폭 연타', outlineColor: '#ef6a45', atkMul: 1.35 },
    { id: 'fortified', name: '강철 피부', outlineColor: '#86a8c4', hpMul: 1.35, dr: 8 },
    { id: 'bulwark', name: '수문장 비늘', outlineColor: '#5fa6bb', firstHitGuard: 0.75 },
    { id: 'duelist', name: '반격 태세', outlineColor: '#d8aa55', hitRateGuard: 0.12 },
    { id: 'leechResist', name: '흡혈저항', outlineColor: '#b98aab', leechEffMul: 0.45, expMul: 1.06, dropMul: 1.04 },
    { id: 'bloodless', name: '무혈', outlineColor: '#d9d4cc', leechEffMul: 0, expMul: 1.10, dropMul: 1.08 },
    { id: 'swiftHands', name: '고속 공세', outlineColor: '#eadb72', attackSpeedVarMul: 1.18, expMul: 1.05, dropMul: 1.03 },
    { id: 'veryFast', name: '매우 빠름', outlineColor: '#82d8de', attackSpeedVarMul: 1.26, expMul: 1.08, dropMul: 1.06 },
    { id: 'strong', name: '강함', outlineColor: '#d97845', atkMul: 1.2, expMul: 1.07, dropMul: 1.05 },
    { id: 'veryStrong', name: '매우 강함', outlineColor: '#f14f43', atkMul: 1.5, hpMul: 1.12, expMul: 1.12, dropMul: 1.08 },
    { id: 'deadly', name: '치명적', outlineColor: '#d13d77', critChanceBonus: 18, expMul: 1.08, dropMul: 1.06 },
    { id: 'tenacious', name: '끈질김', outlineColor: '#85b96b', hpMul: 1.45, expMul: 1.08, dropMul: 1.06 },
    { id: 'fireWard', name: '화염 장막', outlineColor: '#f06436', resF: 28 },
    { id: 'coldWard', name: '서리 장막', outlineColor: '#6ac6ee', resC: 28 },
    { id: 'lightWard', name: '뇌전 장막', outlineColor: '#f2d95b', resL: 28 },
    { id: 'chaosWard', name: '심연 장막', outlineColor: '#9b65dc', resChaos: 22 },
    { id: 'physWard', name: '중갑 전개', outlineColor: '#9aa1aa', dr: 14 },
    { id: 'pressureCrush', name: '수압 압살', outlineColor: '#4a8fc7', oceanPressureGainMul: 1.6 },
    { id: 'oxygenLeech', name: '산소 갈취', outlineColor: '#57c7ac', oceanOxygenLeechOnHit: 4 },
    { id: 'accuracyWard', name: '탁한 물막', outlineColor: '#738d9d', hitRateGuard: 0.18 },
    { id: 'currentSwift', name: '급류 가속', outlineColor: '#46b7cf', atkMul: 1.2, attackSpeedVarMul: 1.16 }
];

const MONSTER_VARIANT_DEFS = Object.freeze([
    ['woodSlime-0', '갈색 수액방울'], ['woodSlime-1', '늘어진 수액방울'],
    ['woodSlime-2', '잔가지 수액괴'], ['woodSlime-3', '껍질 수액괴'],
    ['woodSlime-4', '포자 수액괴'], ['woodSlime-5', '유충 수액괴'],
    ['woodSlime-6', '가시 수액괴'], ['woodSlime-7', '왕관 수액괴'],
    ['woodSlime-8', '꽃가루 수액괴'], ['woodSlime-9', '톱니 수액괴'],
    ['woodSlime-10', '암석 수액괴'], ['woodSlime-11', '뿌리가시 수액괴'],
    ...Array.from({ length: 8 }, (_, index) => [`rootSpider-${index}`, '뿌리거미']),
    ['sapLeech-0', '그을린 뿌리관'], ['sapLeech-1', '가지 뿌리관'],
    ['sapLeech-2', '이끼 뿌리관'], ['sapLeech-3', '쌍둥이 뿌리관'],
    ['sapLeech-4', '뒤틀린 뿌리매듭'], ['sapLeech-5', '잿불 뿌리매듭'],
    ['sapLeech-6', '껍질 뿌리매듭'], ['sapLeech-7', '속빈 뿌리매듭'],
    ['sapLeech-8', '늪지 뿌리매듭'], ['sapLeech-9', '육종 뿌리매듭'],
    ['sapLeech-10', '가시눈 뿌리령'], ['sapLeech-11', '벌집 뿌리령'],
    ['sapLeech-12', '잠복 뿌리령'], ['sapLeech-13', '뿌리갑충'],
    ['woodPuppet-0', '껍질 목각병'], ['woodPuppet-1', '백목 목각병'],
    ['woodPuppet-2', '이끼 목각병'], ['woodPuppet-3', '철목 목각병']
].map(([id, name]) => Object.freeze({ id, name })));

function getMonsterVariantDefinition(variantSeed, element) {
    const elementOffset = element === 'fire' ? 1 : (element === 'cold' ? 2 : (element === 'light' ? 3 : (element === 'chaos' ? 4 : 0)));
    const index = (Math.abs(Math.floor(Number(variantSeed) || 0)) + elementOffset) % MONSTER_VARIANT_DEFS.length;
    return MONSTER_VARIANT_DEFS[index];
}

safeExposeData({
    ACT_BOSS_NAMES, ACT_BOSS_ASSET_KEYS, BOSS_ASSET_MANIFEST, BOSS_ASSET_VARIANTS_BY_ACT,
    getBossAssetKeyForZone, ENEMY_TRAIT_POOL, MONSTER_VARIANT_DEFS, getMonsterVariantDefinition,
    REALM_MONSTER_VISUAL_SETS, getRealmMonsterVisualSet, getRealmMonsterVisualDefinition,
    getRealmMonsterVisualDefinitionById
});
