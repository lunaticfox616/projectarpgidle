if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/bosses.js');

// Phase-1 extracted data block.
const ACT_BOSS_NAMES = Object.fromEntries(STORY_ACTS.map((act, idx) => [idx, act.bossName]));

// Body identity controls ordinary attacks and resistance cues; ocean current rules still take precedence.
const BOSS_BODY_ELEMENTS = Object.freeze({
    'atlas-garden-1': 'phys', 'atlas-garden-2': 'cold',
    'atlas-sanctum-4': 'light', 'atlas-sanctum-5': 'cold'
});


const ACT_BOSS_ASSET_KEYS = [
    'bossAct1', 'bossAct2', 'bossAct3', 'bossAct4_1', 'bossAct5',
    'bossAct6', 'bossAct7', 'bossAct8_1', 'bossAct9', 'bossAct10_1'
];

// 원본 보스 그림. 게임은 이것을 실행 중에 정리(배경을 투명하게, js/passives.js sanitizeBattleSheet)하던 것을 미리 해 둔
// assets/battle-clean 그림을 쓴다(2026-10-07 메모리 검토: 정리 사본이 원본 디코드와 따로 메모리에 남았다). 원본을 고치면
// scripts/export-clean-battle-sheets.cjs로 다시 만든다.
const BOSS_ASSET_SOURCES = {
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
const BOSS_ASSET_MANIFEST = Object.fromEntries(Object.entries(BOSS_ASSET_SOURCES).map(([key, src]) =>
    [key, `assets/battle-clean/boss-${src.split('/').pop().replace(/\.png$/, '').replace(/\((\d+)\)/, '-$1')}.png`]));

const BOSS_ASSET_VARIANTS_BY_ACT = {
    4: ['bossAct4_1', 'bossAct4_2'],
    8: ['bossAct8_1', 'bossAct8_2', 'bossAct8_3'],
    10: ['bossAct10_1', 'bossAct10_2', 'bossAct10_3', 'bossAct10_4', 'bossAct10_5']
};

// 보스 그림은 왼쪽을 보고 그려졌다(2026-10-06 열일곱 장 확인). 정면을 보는 이 셋만 뒤집지 않고,
// 나머지는 주인공이 오른쪽에 서면 좌우를 뒤집는다(js/canvas-battlefield.js shouldMirrorEnemySprite).
const BOSS_ASSET_FRONT_FACING = Object.freeze(['bossAct9', 'bossAct10_2', 'bossAct10_5']);

// 영역 몬스터(2026-10-02 다시 그림): 몬스터마다 대기 · 공격 시트 한 장씩(data/monster-sprites.js, 그리기는
// js/canvas-monster-actors.js), 공격 방식은 그림을 따른다(근접 = 물기 · 할퀴기 · 무기, 원거리 = 주문 · 던지기 · 등불).
// 2026-10-13: 옆에서 보는 무대의 새 그림이 없어 예전 그림으로 나오던 열한 종류를 지웠다(RETIRED_REALM_MONSTERS). 지하계에는 정예 종류가
// 남지 않아, 그런 영역의 정예는 그 영역의 일반 몬스터가 맡는다(getRealmMonsterVisualDefinition).
const REALM_MONSTER_VISUAL_SETS = Object.freeze({
    underworld: Object.freeze({
        id: 'underworld',
        zoneTypes: Object.freeze(['underworld']), pinnacleTracks: Object.freeze(['underworld']),
        members: Object.freeze([
            ['underworld-beetle', '흑요석 갑충', 'normal', 'melee'],
            ['underworld-hound', '균사 사냥개', 'normal', 'melee'],
            ['underworld-obsidian-centipede', '흑요석 지네', 'elite', 'melee'],
            ['underworld-king', '지저 군주', 'boss', 'melee']
        ].map(([id, name, role, attack]) => Object.freeze({ id, name, role, attack })))
    }),
    cosmos: Object.freeze({
        id: 'cosmos',
        zoneTypes: Object.freeze(['cosmos']), zoneIds: Object.freeze(['cosmos_astra']),
        members: Object.freeze([
            ['cosmos-star', '성흔 가시체', 'normal', 'melee'], ['cosmos-ooze', '혜성 점액체', 'normal', 'melee'],
            ['cosmos-sentinel', '궤도 파수병', 'elite', 'ranged'],
            ['cosmos-colossus', '성핵 거신', 'boss', 'melee']
        ].map(([id, name, role, attack]) => Object.freeze({ id, name, role, attack })))
    }),
    ocean: Object.freeze({
        id: 'ocean',
        zoneTypes: Object.freeze(['oceanDepth']), pinnacleTracks: Object.freeze(['ocean']),
        members: Object.freeze([
            ['ocean-angler', '심해 초롱어', 'normal', 'melee'], ['ocean-crab', '산호 집게', 'normal', 'melee'],
            ['ocean-shell', '철갑 패각충', 'normal', 'melee'],
            ['ocean-oracle', '해파리 신탁', 'elite', 'ranged'],
            ['ocean-leviathan', '해구 레비아탄', 'boss', 'ranged']
        ].map(([id, name, role, attack]) => Object.freeze({ id, name, role, attack })))
    }),
    // 벌집 원정과 군락지(2026-10-06): 예전엔 벌 그림이 없어 이름만 바꾼 부제사 · 위습 · 뿌리와 붉은 악마 보스로 보였다.
    hive: Object.freeze({
        id: 'hive',
        zoneTypes: Object.freeze(['beehive']),
        members: Object.freeze([
            ['hive-worker', '벌집 전투벌', 'normal', 'melee'], ['hive-drone', '벌집 수벌', 'normal', 'melee'],
            ['hive-scout', '벌집 정찰벌', 'normal', 'ranged'], ['hive-nurse', '꿀주머니 벌', 'normal', 'ranged'],
            ['hive-guard', '정예 수호벌', 'elite', 'melee'], ['hive-royal', '여왕 근위벌', 'elite', 'melee'],
            ['hive-queen', '벌집 여왕', 'boss', 'ranged']
        ].map(([id, name, role, attack]) => Object.freeze({ id, name, role, attack })))
    }),
    colony: Object.freeze({
        id: 'colony',
        zoneTypes: Object.freeze(['colony']),
        members: Object.freeze([
            ['act5-ant', '군락 일개미', 'normal', 'melee'], ['act4-ant', '군락 병정개미', 'normal', 'melee'],
            ['colony-borer-grub', '군락 굴착벌레', 'normal', 'melee'], ['act5-worm', '군락 천공벌레', 'normal', 'melee'],
            ['hive-guard', '군락 수호벌', 'elite', 'melee'], ['colony-carapace-beetle', '군락 갑충', 'elite', 'melee'],
            ['colony-boss', '군락지 지배체', 'boss', 'melee']
        ].map(([id, name, role, attack]) => Object.freeze({ id, name, role, attack })))
    }),
    sky: Object.freeze({
        id: 'sky',
        zoneTypes: Object.freeze(['skyTower']), pinnacleTracks: Object.freeze(['sky']),
        members: Object.freeze([
            ['sky-imp', '구름 도깨비', 'normal', 'ranged'], ['sky-roc', '어린 뇌조', 'normal', 'melee'],
            ['sky-harpy', '질풍 하피', 'normal', 'ranged'],
            ['sky-griffin', '태양 그리핀', 'elite', 'melee'],
            ['sky-titan', '창공 거신', 'boss', 'melee']
        ].map(([id, name, role, attack]) => Object.freeze({ id, name, role, attack })))
    })
});

// 위습형 몬스터 규칙: 일반·정예 외형 뽑기에서 다섯에 하나(다른 몬스터보다 조금 드묾), 생명력 70%,
// 회피 조금 높음 · 방어도 낮음, 스킬룬 드랍 확률 3배. 원소 저항·피해 감소는 getWispEnemyDefenseBonuses(js/combat.js).
const WISP_ENEMY_RULES = Object.freeze({ spawnOneIn: 5, hpMul: 0.7, evasionMul: 1.3, armorMul: 0.5, gemDropMul: 3 });
const WISP_NEUTRAL_RULES = Object.freeze({ spawnOneIn: 0, hpMul: 1, evasionMul: 1, armorMul: 1, gemDropMul: 1 });

const WISP_MONSTER_ASSET_MANIFEST = Object.freeze({
    wispEnemyAttack: 'assets/enemies/wisps/wisp-attack-v1.webp',
    wispEnemyGlow: 'assets/enemies/wisps/wisp-glow-v1.webp'
});

const WISP_MONSTER_VISUALS = Object.freeze([
    ['B01', 'sediment-core', '침전핵 위습', 'basic', ['phys']],
    ['B02', 'ember', '불씨 위습', 'basic', ['fire']],
    ['B03', 'frost-core', '서리핵 위습', 'basic', ['cold']],
    ['B04', 'lightning', '뇌전 위습', 'basic', ['light']],
    ['B05', 'chaos-rift', '혼돈균열 위습', 'basic', ['chaos']],
    ['B06', 'poison-sac', '독낭 위습', 'basic', ['chaos']],
    ['H01', 'thermal-shock', '열충격 위습', 'hybrid', ['fire', 'cold']],
    ['H02', 'thunder-flame', '뇌화 위습', 'hybrid', ['fire', 'light']],
    ['H03', 'frost-thunder', '빙뢰 위습', 'hybrid', ['cold', 'light']],
    ['H04', 'charred-core', '탄화핵 위습', 'hybrid', ['phys', 'fire']],
    ['H05', 'frozen-sediment', '동결침전 위습', 'hybrid', ['phys', 'cold']],
    ['H06', 'storm-sediment', '낙뢰침전 위습', 'hybrid', ['phys', 'light']],
    ['H07', 'blight-chaos', '괴독 위습', 'hybrid', ['chaos']],
    ['S01', 'sacred-sap', '성수액 위습', 'special', ['phys', 'fire']],
    ['S02', 'sealed-necrosis', '봉인괴저 위습', 'special', ['chaos']],
    ['S03', 'depleted-backflow', '고갈역류 위습', 'special', ['cold', 'chaos']],
    ['S04', 'veil-fold', '장막접힘 위습', 'special', ['chaos']],
    ['S05', 'convergence-ring', '수렴륜 위습', 'special', ['phys', 'light']]
].map((entry, cell) => Object.freeze({
    id: `wisp-${entry[0].toLowerCase()}`,
    code: entry[0],
    slug: entry[1],
    name: entry[2],
    category: entry[3],
    elements: Object.freeze(entry[4]),
    cell
})));

function getRealmMonsterVisualSet(zone) {
    if (!zone) return null;
    const zoneId = String(zone.id || '');
    return Object.values(REALM_MONSTER_VISUAL_SETS).find(set =>
        set.zoneTypes.includes(zone.type) || (set.zoneIds || []).includes(zoneId)
        || (set.pinnacleTracks || []).includes(zone.pinnacleTrack)) || null;
}

function getRealmMonsterVisualDefinition(set, role, variantSeed) {
    if (!set) return null;
    const ofRole = wanted => set.members.filter(member => member.role === wanted);
    const pool = role === 'elite' && ofRole(role).length === 0 ? ofRole('normal') : ofRole(role);
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

/** Explicit story stages preserve actor identity; other encounters retain visual variants. */
function getStoryBossStage(zone, stageIndex) {
    if (zone?.type !== 'act' || !Number.isInteger(stageIndex)) return null;
    const stages = STORY_ACTS[zone.id]?.bossStages;
    return stages?.[Math.max(0, Math.min(stageIndex, stages.length - 1))] || null;
}

function getBossNameForZone(zone, stageIndex = 0) {
    const stage = getStoryBossStage(zone, stageIndex);
    if (stage) return stage.name;
    const names = {
        outsideChaos: '혼돈 밖의 나무꾼', trial: `${zone.name} 수호자`, seasonBoss: zone.name,
        meteor: '검은 별의 심장', oceanDepth: `심해 가디언 ${Math.floor(zone.depthM || 0)}m`, atlasMap: zone.bossName
    };
    return names[zone.type] || ACT_BOSS_NAMES[zone.id] || `${zone.name.split(':')[0]} 지배자`;
}

function getBossAssetKeyForZone(zone, variantSeed, stageIndex) {
    if (!zone || (zone.type && zone.type !== 'act') || !Number.isInteger(Number(zone.id))) return null;
    const stage = getStoryBossStage(zone, stageIndex);
    if (stage) return stage.assetKey;
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

// 액트 일반·정예 몬스터(2026-10-02, 받은 묶음 둘): 뿌리층 슬라임 · 웜 · 개미(rignin-monsters-idle-attack-v1, 액트 1 · 3 · 4 · 5)와
// 철퇴 부제사 · 성수 부제녀(rignin-deacons-idle-attack-v2, 액트 2 · 6 · 7 · 8 팔레트). 액트 9 · 10은 장막(액트 8) 팔레트,
// 혼돈 이후 콘텐츠(액트도 영역 세트도 아닌 곳 전부)는 부제 네 팔레트를 섞는다. 공격 방식은 그림을 따른다(사용자 결정
// 2026-10-02): 근접 = 몸통 돌진 · 물기 · 철퇴, 원거리 = 성수. 그림 시트 규격은 data/monster-sprites.js.
// 무기 뿌리촉수(rignin-weapon-root-tentacles-idle-attack-v1): 뿌리가 무기 대분류(data/weapon-categories.js) 하나를 든 몬스터.
// 영역 세트가 아닌 모든 지역에서 적 spawnOneIn에 하나꼴로 나오고, 처치마다 weaponDropChance 확률로 제 대분류 무기를 하나
// 떨군다(보통 장비 드랍과 따로, js/combat.js grantRootWeaponPick). 그 무기와 보통 드랍의 무기는 제 대분류 바탕에서 고른다
// (js/passives.js chooseItemBase). 대검 · 곡도 · 향로는 근접, 나머지는 원거리.
// 2026-10-07 사용자 요청: 너무 자주 나와(위습이 아닌 적 여덟에 하나) 흔하고, 무기는 거의 주지 않았다(장비 드랍의 절반이 무기였지만
// 장비 드랍 자체가 처치의 1% 안팎). 마흔에 하나로 드물게 하고, 대신 제 무기를 넷에 하나꼴로 떨군다.
const ROOT_MONSTER_RULES = Object.freeze({ spawnOneIn: 40, weaponDropChance: 0.25 });
const ROOT_MONSTER_VISUALS = Object.freeze([
    ['greatsword', '대검 뿌리촉수', 'melee'], ['scimitar', '곡도 뿌리촉수', 'melee'], ['shortbow', '단궁 뿌리촉수', 'ranged'],
    ['orb', '오브 뿌리촉수', 'ranged'], ['flask', '플라스크 뿌리촉수', 'ranged'], ['censer', '향로 뿌리촉수', 'melee']
].map(([weapon, name, attack]) => Object.freeze({ id: `root-${weapon}`, name, attack, weapon })));
const ACT_MONSTER_VISUALS = Object.freeze([
    ['act7-crackback-tick', '균열등 진드기', 'melee'], ['act7-husk-stag', '껍질마른 사슴', 'melee'],
    ['act8-veil-moth', '장막나방', 'ranged'], ['act8-shroud-toad', '장막 두꺼비', 'melee'],
    ['act9-dirge-crane', '만가 두루미', 'ranged'], ['act9-chorus-bulbs', '합창 구근', 'ranged'],
    ['act10-graft-beast', '접목수', 'melee'], ['postchaos-inverted-sapling', '역생 묘목', 'ranged'],
    ['atlas-canopy-leafglider', '잎막 활공쥐', 'melee'], ['atlas-garden-bonsai-snail', '분재 달팽이', 'melee'],
    ['act1-slime', '수액 슬라임', 'melee'], ['act1-worm', '뿌리 웜', 'melee'], ['act1-ant', '뿌리 일개미', 'melee'],
    ['act3-slime', '포자 슬라임', 'melee'], ['act3-worm', '부패 웜', 'melee'], ['act3-ant', '균사 개미', 'melee'],
    ['act4-slime', '수지 슬라임', 'melee'], ['act4-worm', '수피 웜', 'melee'], ['act4-ant', '뿌리 병정개미', 'melee'],
    ['act5-slime', '심핵 슬라임', 'melee'], ['act5-worm', '고대 천공웜', 'melee'], ['act5-ant', '고목 개미', 'melee'],
    ['deacon-act2-melee', '중정 철퇴 부제사', 'melee'], ['deacon-act2-ranged', '중정 성수 부제녀', 'ranged'],
    ['deacon-act6-melee', '고갈 철퇴 부제사', 'melee'], ['deacon-act6-ranged', '고갈 성수 부제녀', 'ranged'],
    ['deacon-act7-melee', '고목 철퇴 부제사', 'melee'], ['deacon-act7-ranged', '고목 성수 부제녀', 'ranged'],
    ['deacon-act8-melee', '장막 철퇴 부제사', 'melee'], ['deacon-act8-ranged', '장막 성수 부제녀', 'ranged']
].map(([id, name, attack]) => Object.freeze({ id, name, attack })).concat(ROOT_MONSTER_VISUALS));
const ACT_MONSTER_VISUAL_BY_ID = Object.freeze(Object.fromEntries(ACT_MONSTER_VISUALS.map(def => [def.id, def])));

/** 액트 번호(1~10) → 그 액트의 몬스터 외형. postChaos = 혼돈 이후. */
const ACT_MONSTER_POOLS = (() => {
    const bugs = act => Object.freeze([`act${act}-slime`, `act${act}-worm`, `act${act}-ant`]);
    const deacons = act => Object.freeze([`deacon-act${act}-melee`, `deacon-act${act}-ranged`]);
    return Object.freeze({
        1: bugs(1), 2: deacons(2), 3: bugs(3), 4: bugs(4), 5: bugs(5),
        6: Object.freeze([...deacons(6), 'act7-husk-stag']),
        7: Object.freeze([...deacons(7), 'act7-husk-stag', 'act7-crackback-tick']),
        8: Object.freeze([...deacons(8), 'act8-veil-moth', 'act8-shroud-toad']),
        9: Object.freeze([...deacons(8), 'act9-dirge-crane', 'act9-chorus-bulbs']),
        10: Object.freeze(['deacon-act8-melee', 'act10-graft-beast', 'act9-chorus-bulbs']),
        postChaos: Object.freeze([... [2, 6, 7, 8].flatMap(deacons), 'postchaos-inverted-sapling'])
    });
})();

/** 예전 목재 몬스터(수액 응집체 · 뿌리 거미 · 수액 흡충 · 목각 인형) → 그림이 가장 닮은 새 몬스터. 저장 변환(js/save-migrations.js)이 쓴다. */
const RETIRED_WOOD_MONSTER_SKINS = Object.freeze({
    woodSlime: 'act1-slime', rootSpider: 'act1-ant', sapLeech: 'act1-worm', woodPuppet: 'deacon-act2-melee'
});

/** 2026-10-13에 지운 영역 몬스터 열하나 → 같은 영역에 남은 몬스터 (사용자: "필요없는 몬스터 종류는 삭제시켜". 옆에서 보는 무대의 새 그림이
 * 없어 예전 그림으로 나오던 종류다). 모아 둔 외형과, 저장에 든 싸우던 적이 이 표대로 바뀐다(js/save-migrations.js
 * migrateRetiredRealmMonsters). 같은 구실과 공격 방식의 몬스터를 먼저 골랐고, 그 영역에 남은 것이 없으면 가장 가까운 몬스터다. */
const RETIRED_REALM_MONSTERS = Object.freeze({
    'underworld-crawler': 'underworld-beetle', 'underworld-miner': 'underworld-hound', 'underworld-executioner': 'underworld-hound', 'underworld-wraith': 'underworld-beetle',
    'cosmos-wisp': 'cosmos-star', 'cosmos-wanderer': 'cosmos-ooze', 'cosmos-seer': 'cosmos-sentinel',
    'ocean-cultist': 'ocean-angler', 'ocean-knight': 'ocean-oracle',
    'sky-sentinel': 'sky-harpy', 'sky-lancer': 'sky-griffin'
});

const MONSTER_VARIANT_DEFS = Object.freeze([
    ...ACT_MONSTER_VISUALS,
    ...WISP_MONSTER_VISUALS.map(wisp => Object.freeze({ id: wisp.id, name: wisp.name, attack: 'ranged' }))
]);

function getWispMonsterVisualDefinition(variantSeed, element) {
    const seed = Math.abs(Math.floor(Number(variantSeed) || 0));
    const pool = WISP_MONSTER_VISUALS.filter(wisp => wisp.elements.includes(element));
    const candidates = pool.length > 0 ? pool : WISP_MONSTER_VISUALS;
    return candidates[Math.floor(seed / WISP_ENEMY_RULES.spawnOneIn) % candidates.length];
}

/** 이 지역의 일반·정예 외형 목록: 스토리 액트는 그 액트 몫, 나머지(혼돈 이후)는 부제 네 팔레트. */
function getActMonsterPool(zone) {
    const act = zone && zone.type === 'act' && Number.isInteger(Number(zone.id)) ? Number(zone.id) + 1 : 0;
    if (zone?.atlasRegion === 'canopy') return ['atlas-canopy-leafglider', 'act8-veil-moth', 'deacon-act8-ranged'];
    if (zone?.atlasRegion === 'garden') return ['atlas-garden-bonsai-snail', 'act7-husk-stag', 'act9-chorus-bulbs'];
    return ACT_MONSTER_POOLS[act] || ACT_MONSTER_POOLS.postChaos;
}

/** 뿌리촉수 자리(시드 나머지 1, 위습 자리와 겹치면 위습)면 시드로 고른 뿌리촉수, 아니면 null. */
function getRootMonsterVisualDefinition(seed) {
    const every = ROOT_MONSTER_RULES.spawnOneIn;
    return seed % every === 1 ? ROOT_MONSTER_VISUALS[Math.floor(seed / every) % ROOT_MONSTER_VISUALS.length] : null;
}

/** 뿌리촉수가 든 무기 대분류(드랍이 그쪽으로 쏠린다). 다른 적은 null. */
function getRootMonsterWeapon(enemy) {
    const def = enemy ? ACT_MONSTER_VISUAL_BY_ID[enemy.spriteVariantId] : null;
    return (def && def.weapon) || null;
}

/** 일반·정예 외형: 다섯에 하나는 원소 위습, 마흔에 하나는 무기 뿌리촉수, 나머지는 지역 목록에서 시드와 원소로 고른다. */
/** marker.ownLook: a content room that draws its own sheet (the atlas hive's bees, js/atlas-encounters.js) rolls none. */
function getMonsterVariantDefinition(variantSeed, element, zone, marker) {
    if (marker && marker.ownLook) return null;
    const seed = Math.abs(Math.floor(Number(variantSeed) || 0));
    if (seed % WISP_ENEMY_RULES.spawnOneIn === 0) return getWispMonsterVisualDefinition(seed, element);
    const root = getRootMonsterVisualDefinition(seed);
    if (root) return root;
    const elementOffset = element === 'fire' ? 1 : (element === 'cold' ? 2 : (element === 'light' ? 3 : (element === 'chaos' ? 4 : 0)));
    const pool = getActMonsterPool(zone);
    return ACT_MONSTER_VISUAL_BY_ID[pool[(seed + elementOffset) % pool.length]];
}

/** 그림이 정한 공격 방식('melee' · 'ranged'): 액트 몬스터 · 뿌리촉수 · 영역 세트는 표에서, 위습은 원거리. 모르는 외형은 null. */
function getMonsterVisualAttackKind(visualId) {
    const def = ACT_MONSTER_VISUAL_BY_ID[visualId] || getRealmMonsterVisualDefinitionById(visualId);
    if (def) return def.attack;
    return typeof visualId === 'string' && visualId.startsWith('wisp-') ? 'ranged' : null;
}

// 보스의 싸우는 거리 (2026-10-14 사용자: "보스 몬스터의 특성별로 근접, 사거리 있음, 사거리 무한 등 특징을 만들고 전투 AI 적용이
// 필요함"). 전에는 모든 보스가 제자리에서 방 어디든 닿았다(COMBAT_GRID_CONFIG.bossAttackRange).
//   melee  근접: 붙어야 친다. 닿지 않으면 주인공에게 걸어온다.
//   ranged 사거리 있음: range칸 안에서 쏜다. 사거리 밖이면 사거리 안까지 걸어 들어온다.
//   far    사거리 무한: 제자리에서 방 어디든 닿는다(전과 같다).
// 전투 규칙은 js/combat-grid.js(사거리 배정)와 js/combat.js(다가가기, 떨어진 곳에서 쓰는 특수기)가 읽는다.
const BOSS_REACH = Object.freeze({
    kinds: Object.freeze({
        melee: Object.freeze({ id: 'melee', label: '근접', range: COMBAT_GRID_CONFIG.meleeAttackRange }),
        ranged: Object.freeze({ id: 'ranged', label: '원거리', range: 4 }),
        far: Object.freeze({ id: 'far', label: '사거리 무한', range: COMBAT_GRID_CONFIG.bossAttackRange })
    }),
    /** 그림 열쇠 → 싸우는 거리. 그림을 보고 정했다: 네 발 짐승, 철퇴를 든 기사, 거미 다리, 사슬과 낫을 든 순례자는 근접.
     * 지팡이와 종을 든 자, 나비는 원거리. 정원사, 접목의 어머니, 고치에서 태어난 존재는 제자리에서 방 전체를 다스린다. */
    byAsset: Object.freeze({
        bossAct1: 'melee', bossAct2: 'ranged', bossAct3: 'ranged', bossAct4_1: 'melee', bossAct4_2: 'melee', bossAct5: 'ranged',
        bossAct6: 'far', bossAct7: 'ranged', bossAct8_1: 'ranged', bossAct8_2: 'melee', bossAct8_3: 'melee', bossAct9: 'far',
        bossAct10_1: 'far', bossAct10_2: 'far', bossAct10_3: 'far', bossAct10_4: 'far', bossAct10_5: 'far'
    }),
    byVisual: Object.freeze({ 'atlas-garden-1': 'melee', 'atlas-garden-2': 'ranged', 'atlas-sanctum-4': 'ranged',
        'atlas-sanctum-5': 'far', 'colony-boss': 'melee' }),
    /** 예고하는 특수기(지면 강타, 충격파 등)는 대상이 이 칸 수 안이면 사거리 밖이어도 그 자리에서 쓴다: 근접 보스에게서 달아나기만
     * 하면 아무것도 맞지 않는 싸움이 되지 않게. */
    castRange: 6,
    /** 사거리 밖의 대상에게 다가가는 한 걸음(초): 방 단위 무대에서 주인공의 기본 걸음(0.4초)보다 빠르다. 전투는 0.1초 단위로
     * 흐르므로 0.1의 배수로 적는다(0.34로 적으면 0.4초에 한 걸음이 된다). */
    stepSec: 0.3
});
/** 보스의 싸우는 거리(BOSS_REACH.kinds의 하나): 그림 열쇠로 정해 둔 것, 없으면 외형이 정한 공격 방식(영역의 보스), 그것도 없으면
 * 사거리 무한. */
function getBossReach(enemy) {
    const look = enemy.spriteVariantId || enemy.monsterVisualId;
    const kind = BOSS_REACH.byVisual[look] || BOSS_REACH.byAsset[enemy.bossAssetKey] || getMonsterVisualAttackKind(look);
    return BOSS_REACH.kinds[kind] || BOSS_REACH.kinds.far;
}

safeExposeData({
    BOSS_REACH, getBossReach, BOSS_BODY_ELEMENTS,
    ACT_BOSS_NAMES, ACT_BOSS_ASSET_KEYS, BOSS_ASSET_SOURCES, BOSS_ASSET_MANIFEST, BOSS_ASSET_VARIANTS_BY_ACT, BOSS_ASSET_FRONT_FACING,
    getBossAssetKeyForZone, getBossNameForZone, ENEMY_TRAIT_POOL, MONSTER_VARIANT_DEFS, getMonsterVariantDefinition,
    ACT_MONSTER_VISUALS, ACT_MONSTER_VISUAL_BY_ID, ACT_MONSTER_POOLS, RETIRED_WOOD_MONSTER_SKINS, RETIRED_REALM_MONSTERS, getActMonsterPool,
    getMonsterVisualAttackKind, ROOT_MONSTER_RULES, ROOT_MONSTER_VISUALS, getRootMonsterVisualDefinition, getRootMonsterWeapon,
    WISP_ENEMY_RULES, WISP_NEUTRAL_RULES, WISP_MONSTER_ASSET_MANIFEST, WISP_MONSTER_VISUALS, getWispMonsterVisualDefinition,
    REALM_MONSTER_VISUAL_SETS, getRealmMonsterVisualSet, getRealmMonsterVisualDefinition,
    getRealmMonsterVisualDefinitionById
});
