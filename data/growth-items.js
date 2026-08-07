// 생장판(Growth Board) 정적 데이터.
// 베이스, 고유, 석판, 전역 공간 시너지, 칸 해금 단계 정의.
// 실행 로직에 의존하지 않는다 (AGENTS.md: data/ 계층).
//
// 작은 생장판은 1칸, 고등급 베이스는 2~4칸을 차지한다.
// 큰 형태는 더 강하지만 해금 칸과 인접 면을 많이 소비하는 선택지다.

const GROWTH_BOARD_W = 8;
const GROWTH_BOARD_H = 4;

const GROWTH_SHAPE_DB = {
    dot1:    { label: '1칸', cells: [[0, 0]] },
    domino2: { label: '2칸', cells: [[0, 0], [1, 0]] },
    diagonal2: { label: '2칸 대각', cells: [[0, 0], [1, 1]] },
    line3:   { label: '3칸 직선', cells: [[0, 0], [1, 0], [2, 0]] },
    corner3: { label: '3칸 굽이', cells: [[0, 0], [1, 0], [0, 1]] },
    square4: { label: '4칸 사각', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
    zig4:    { label: '4칸 지그재그', cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
    tee4:    { label: '4칸 갈림', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },
    line4:   { label: '4칸 장축', cells: [[0, 0], [1, 0], [2, 0], [3, 0]] }
};

// 종류 정의: 제작 슬롯(craftSlot)은 기존 MOD_DB/화석/오브 풀을 재사용하기 위한 매핑이다.
// 석판(slab)은 자체 옵션이 없고 다른 아이템의 레벨만 올리므로 제작 대상이 아니다.
const GROWTH_CATEGORY_INFO = {
    flower: { label: '꽃',   icon: '🌸', craftSlot: '무기',   qualityKind: 'weapon' },
    branch: { label: '가지', icon: '🌿', craftSlot: '갑옷',   qualityKind: 'armor' },
    leaf:   { label: '잎',   icon: '🍃', craftSlot: '목걸이', qualityKind: 'accessory' },
    fruit:  { label: '열매', icon: '🍎', craftSlot: '반지',   qualityKind: 'accessory' },
    root:   { label: '뿌리', icon: '🥕', craftSlot: '갑옷',   qualityKind: 'armor' },
    thorn:  { label: '가시', icon: '🌵', craftSlot: '장갑',   qualityKind: 'weapon' },
    stem:   { label: '줄기', icon: '🎋', craftSlot: '신발',   qualityKind: 'accessory' },
    spore:  { label: '포자', icon: '🍄', craftSlot: '목걸이', qualityKind: 'accessory' },
    seed:   { label: '씨앗', icon: '🌰', craftSlot: '반지',   qualityKind: 'accessory' },
    vine:   { label: '덩굴', icon: '🪴', craftSlot: '허리띠', qualityKind: 'accessory' },
    slab:   { label: '석판', icon: '🪨', craftSlot: null,     qualityKind: null, noCraft: true }
};

// 종류별 희귀 추가 옵션 상한. 형태는 공간 비용, 등급은 옵션 줄 수를 정한다.
const GROWTH_AFFIX_CAP = {
    flower: 2, branch: 2, leaf: 2, fruit: 2, root: 2, thorn: 2,
    stem: 2, spore: 2, seed: 2, vine: 2, slab: 0
};

function getGrowthCategoryAffixCap(category) {
    let cap = GROWTH_AFFIX_CAP[category];
    return Number.isFinite(cap) ? cap : 2;
}

// 생장판 전용 추가 옵션 원본 수치. 장비 MOD_DB는 장비에만 그대로 적용하고,
// 생장판 생성·제작은 이 base/step을 사용해 낮은 실제 수치를 아이템에 저장한다.
const GROWTH_AFFIX_VALUE_VERSION = 2;
const GROWTH_AFFIX_VALUE_DB = Object.freeze({
    flatDmg: { base: 1.2, step: 1.2 }, weaponFlatDmgPct: { base: 2.4, step: 1.6 },
    pctDmg: { base: 2, step: 1.6 }, meleePctDmg: { base: 2, step: 1.6 },
    projectilePctDmg: { base: 2, step: 1.6 }, physPctDmg: { base: 2, step: 1.6 },
    elementalPctDmg: { base: 2, step: 1.6 }, firePctDmg: { base: 1.6, step: 1.2 },
    coldPctDmg: { base: 1.6, step: 1.2 }, lightPctDmg: { base: 1.6, step: 1.2 },
    chaosPctDmg: { base: 1.6, step: 1.2 }, aoePctDmg: { base: 1.6, step: 1.2 },
    dotPctDmg: { base: 1.6, step: 1.2 }, summonFlatDmg: { base: 1.6, step: 1.6 },
    summonPctDmg: { base: 2.4, step: 1.6 }, summonHpPct: { base: 2.4, step: 1.6 },
    summonAspd: { base: 1.2, step: 0.8 }, summonCrit: { base: 0.4, step: 0.4 },
    summonCritDmg: { base: 3.2, step: 1.6 }, summonEfficiency: { base: 1.6, step: 1.2 },
    summonResPen: { base: 0.8, step: 0.8 }, spellFlatDmg: { base: 3.2, step: 2.4 },
    spellFlatPct: { base: 2.4, step: 1.6 }, flatHp: { base: 6, step: 4 },
    strength: { base: 3.2, step: 2.4 }, dexterity: { base: 3.2, step: 2.4 },
    intelligence: { base: 3.2, step: 2.4 }, accuracy: { base: 36, step: 24 },
    armor: { base: 4.8, step: 4 }, evasion: { base: 4.8, step: 4 },
    energyShield: { base: 3.6, step: 3.2 }, armorPct: { base: 2.4, step: 1.6 },
    evasionPct: { base: 2.4, step: 1.6 }, deflectChance: { base: 0.4, step: 0.4 },
    energyShieldPct: { base: 2.4, step: 1.6 }, pctHp: { base: 1.6, step: 1.2 },
    aspd: { base: 0.8, step: 0.8 }, crit: { base: 0.2, step: 0.2 },
    move: { base: 1.6, step: 0.8 }, physIgnore: { base: 0.4, step: 0.36 },
    resF: { base: 2, step: 1.2 }, resC: { base: 2, step: 1.2 },
    resL: { base: 2, step: 1.2 }, resAll: { base: 1.2, step: 0.8 },
    resChaos: { base: 0.8, step: 0.56 }, resPen: { base: 0, step: 0.32 },
    regen: { base: 0.08, step: 0.04 }, regenFlat: { base: 8, step: 4.8 },
    regenSuppress: { base: 0.12, step: 0.024 }, regenSuppressGloves: { base: 0.02, step: 0.028 },
    regenSuppressAmulet: { base: 0.04, step: 0 }, leech: { base: 0.032, step: 0.032 },
    leechRateCap: { base: 0.16, step: 0.08 }, leechTotalCap: { base: 0.8, step: 0.4 },
    leechInstanceCap: { base: 0.4, step: 0.2 }, dr: { base: 0.8, step: 0.8 },
    critDmg: { base: 4, step: 2.4 }, ds: { base: 2, step: 1.2 },
    minDmgRollWeapon: { base: 1.6, step: 0.8 }, maxDmgRollWeapon: { base: 1.6, step: 0.8 },
    shieldBlockPct: { base: 4.8, step: 3.2 }, shieldBlockFlat: { base: 0.4, step: 0.32 },
    weaponPhysFlatDmg: { base: 1.2, step: 1.2 }, weaponFireFlatDmg: { base: 1.2, step: 1.2 },
    weaponColdFlatDmg: { base: 1.2, step: 1.2 }, weaponLightFlatDmg: { base: 1.2, step: 1.2 },
    weaponChaosFlatDmg: { base: 1.2, step: 1.2 }, ringPhysFlatDmg: { base: 0.24, step: 0.24 },
    ringFireFlatDmg: { base: 0.24, step: 0.24 }, ringColdFlatDmg: { base: 0.24, step: 0.24 },
    ringLightFlatDmg: { base: 0.24, step: 0.24 }, ringChaosFlatDmg: { base: 0.24, step: 0.24 },
    glovePhysFlatDmg: { base: 0.24, step: 0.24 }, gloveFireFlatDmg: { base: 0.24, step: 0.24 },
    gloveColdFlatDmg: { base: 0.24, step: 0.24 }, gloveLightFlatDmg: { base: 0.24, step: 0.24 },
    gloveChaosFlatDmg: { base: 0.24, step: 0.24 },
    compoundArmor: { base: 1.44, step: 1.2, compound: [{ statId: 'armorPct', statName: '방어도 증가(%)', base: 0.72, step: 0.48 }] },
    compoundEvasion: { base: 1.44, step: 1.2, compound: [{ statId: 'evasionPct', statName: '회피 증가(%)', base: 0.72, step: 0.48 }] },
    compoundEnergyShield: { base: 1.08, step: 0.96, compound: [{ statId: 'energyShieldPct', statName: '에너지 보호막 증가(%)', base: 0.72, step: 0.48 }] },
    compoundWeaponDmg: { base: 0.36, step: 0.36, compound: [{ statId: 'weaponFlatDmgPct', statName: '무기의 기본 피해 증가(%)', base: 0.72, step: 0.48 }] }
});

function getGrowthAffixValueDef(modId) {
    return GROWTH_AFFIX_VALUE_DB[modId] || null;
}

// ── 석판(레벨) 레이어 ────────────────────────────────────────────────────
// 석판도 1칸이며 자체 능력치가 없다. 대신 영향 범위 안의 칸에 "레벨"을 부여하고,
// 그 칸에 놓인 아이템의 베이스·추가 옵션이 함께 증폭된다.
// 레벨은 여러 석판에서 중첩된다.
const GROWTH_LEVEL_STAT_PCT = 15;   // 레벨 1당 아이템 옵션 +15%
const GROWTH_LEVEL_CAP = 8;         // 레벨 상한(중첩 폭주 방지)
const GROWTH_SHAPE_REFORGE_COST_PER_CELL = 3;
const GROWTH_SLAB_REFORGE_COST = 10;

// 영향 범위 패턴. dx/dy는 석판 자신을 원점으로 한 상대 좌표다.
// row/col은 좌표 대신 같은 행·열 전체를 뜻한다.
const GROWTH_SLAB_PATTERNS = {
    orthogonal: { label: '상하좌우', cells: [[0, -1], [0, 1], [-1, 0], [1, 0]] },
    diagonal:   { label: '대각선',   cells: [[-1, -1], [1, -1], [-1, 1], [1, 1]] },
    around:     { label: '주변 8칸', cells: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] },
    row:        { label: '같은 행',  axis: 'row' },
    col:        { label: '같은 열',  axis: 'col' },
    board:      { label: '판 전체',  axis: 'board' },
    self:       { label: '자기 칸',  cells: [[0, 0]] },
    far:        { label: '2칸 거리', cells: [[0, -2], [0, 2], [-2, 0], [2, 0]] }
};

// grants: [{ pattern, level }] — level이 음수면 약화(페널티)다.
// 강한 석판일수록 페널티를 함께 지녀 "어디에 두느냐"가 퍼즐이 되게 한다.
const GROWTH_SLAB_DB = [
    { id: 'gs_base', name: '기반의 석판', reqTier: 1, weight: 1.0,
      desc: '같은 행의 아이템 레벨 +1',
      grants: [{ pattern: 'row', level: 1 }] },
    { id: 'gs_pillar', name: '기둥의 석판', reqTier: 1, weight: 1.0,
      desc: '같은 열의 아이템 레벨 +1',
      grants: [{ pattern: 'col', level: 1 }] },
    { id: 'gs_hearth', name: '화로의 석판', reqTier: 3, weight: 0.9,
      desc: '상하좌우 아이템 레벨 +2',
      grants: [{ pattern: 'orthogonal', level: 2 }] },
    { id: 'gs_cross', name: '엇갈림의 석판', reqTier: 3, weight: 0.9,
      desc: '대각선 아이템 레벨 +2',
      grants: [{ pattern: 'diagonal', level: 2 }] },
    { id: 'gs_oath', name: '맹세의 석판', reqTier: 6, weight: 0.7,
      desc: '주변 8칸 아이템 레벨 +1, 같은 행 레벨 +1',
      grants: [{ pattern: 'around', level: 1 }, { pattern: 'row', level: 1 }] },
    { id: 'gs_defiance', name: '반항의 석판', reqTier: 8, weight: 0.55,
      desc: '같은 행 레벨 +3, 단 상하좌우 레벨 -1',
      grants: [{ pattern: 'row', level: 3 }, { pattern: 'orthogonal', level: -1 }] },
    { id: 'gs_radiance', name: '광휘의 석판', reqTier: 8, weight: 0.55,
      desc: '대각선 레벨 +3, 단 같은 행 레벨 -1',
      grants: [{ pattern: 'diagonal', level: 3 }, { pattern: 'row', level: -1 }] },
    { id: 'gs_echo', name: '메아리의 석판', reqTier: 10, weight: 0.45,
      desc: '2칸 거리 레벨 +3 (바로 옆은 올리지 않는다)',
      grants: [{ pattern: 'far', level: 3 }] },
    { id: 'gs_miracle', name: '기적의 석판', reqTier: 12, weight: 0.3,
      desc: '같은 행·열 모두 레벨 +2, 단 주변 8칸 레벨 -1',
      grants: [{ pattern: 'row', level: 2 }, { pattern: 'col', level: 2 }, { pattern: 'around', level: -1 }] },
    { id: 'gs_sacrifice', name: '헌신의 석판', reqTier: 12, weight: 0.3,
      desc: '주변 8칸 레벨 +3, 단 같은 행·열 레벨 -1',
      grants: [{ pattern: 'around', level: 3 }, { pattern: 'row', level: -1 }, { pattern: 'col', level: -1 }] },
    { id: 'gs_eclipse', name: '일식의 석판', reqTier: 18, weight: 0.012, chase: true,
      flavorText: '빛이 사라진 자리에 모든 뿌리의 그림자가 겹친다.',
      desc: '판 전체 레벨 +2, 단 주변 8칸 레벨 -1',
      grants: [{ pattern: 'board', level: 2 }, { pattern: 'around', level: -1 }] },
    { id: 'gs_constellation', name: '무명성좌의 석판', reqTier: 20, weight: 0.008, chase: true,
      flavorText: '이 별자리를 읽은 자는 없었다. 살아 돌아온 자도 없었으므로.',
      desc: '같은 행·열·대각선 레벨 +2, 2칸 거리 레벨 +3',
      grants: [{ pattern: 'row', level: 2 }, { pattern: 'col', level: 2 },
          { pattern: 'diagonal', level: 2 }, { pattern: 'far', level: 3 }] }
];

// 생장판은 기존 고정 슬롯 장비를 대체하지 않는 별도 시스템이며 루프 25에 열린다.
const GROWTH_UNLOCK_LOOP = 25;

// 칸 해금 단계: 루프 진행 → 누적 활성 칸 수. 8칸에서 시작해 32칸(8×4)까지 자란다.
// 판을 8×4로 제한해 배치 관리량을 누르고, 고급 형태는 여러 칸을 소비하게 한다.
const GROWTH_UNLOCK_STAGES = [
    { cells: 8,  label: '생장판 각성', req: { season: GROWTH_UNLOCK_LOOP } },
    { cells: 11, label: '첫 확장',     req: { season: 28 } },
    { cells: 15, label: '뿌리 내림',   req: { season: 32 } },
    { cells: 19, label: '가지 뻗음',   req: { season: 36 } },
    { cells: 23, label: '무성해짐',    req: { season: 40 } },
    { cells: 27, label: '만개',        req: { season: 45 } },
    { cells: 32, label: '완전한 수관', req: { season: 50 } }
];

// 공간 시너지 규칙 해금 단계 (루프를 거듭하며 판정 계층이 열린다).
const GROWTH_SYNERGY_STAGES = [
    { key: 'adjacency', label: '기본 인접',   req: { season: GROWTH_UNLOCK_LOOP } },
    { key: 'wall',      label: '벽과 방향',   req: { season: 28 } },
    { key: 'rowcol',    label: '행과 열',     req: { season: 32 } },
    { key: 'tags',      label: '태그 공명',   req: { season: 38 } },
    { key: 'complex',   label: '복합 시너지', req: { season: 45 } }
];

// ── 베이스 정의 ──────────────────────────────────────────────────────────
// spatial.effects[].when: 공간 조건 / grant: 충족 시 부여 스탯 줄(고정 수치).
// per:true 조건은 만족 횟수만큼 grant를 반복 적용한다.
// stage: 이 효과가 속한 시너지 계층(해금 전이면 비활성 표시).
//
// 수치 기준: 1칸 아이템 하나는 장비 한 부위의 일부일 뿐이다. 32칸을 가득 채운 판이
// 고정 슬롯 장비 한 세트를 크게 웃돌지 않도록, 베이스 수치와 추가 옵션 수(종류당 2줄)를
// 함께 눌러 두었다. 실제 합산 비교는 scripts/smoke-growth-balance.js가 고정한다.
const GROWTH_BASE_DB = [
    // ── 꽃: 공격 ──
    { id: 'gf_sun_bloom', name: '해바라기 대검화', category: 'flower', shapeId: 'dot1', reqTier: 1,
      baseStats: [{ id: 'flatDmg', baseMin: 1, baseMax: 2 }, { id: 'physPctDmg', baseMin: 2, baseMax: 2 }],
      tags: ['물리', '근접'],
      spatial: { desc: '인접한 가지 1개당 기본 피해 +1', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'branch', per: true }, grant: [{ id: 'flatDmg', val: 1 }] }] } },
    { id: 'gf_ember_crown', name: '잉걸불 왕관화', category: 'flower', shapeId: 'dot1', reqTier: 2,
      baseStats: [{ id: 'flatDmg', baseMin: 1, baseMax: 2 }, { id: 'firePctDmg', baseMin: 2, baseMax: 3 }],
      tags: ['화염', '범위'],
      spatial: { desc: '인접한 잎 1개당 화염 피해 +2%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'leaf', per: true }, grant: [{ id: 'firePctDmg', val: 2 }] }] } },
    { id: 'gf_arrow_reed', name: '살깃 갈대', category: 'flower', shapeId: 'dot1', reqTier: 3,
      baseStats: [{ id: 'flatDmg', baseMin: 1, baseMax: 2 }, { id: 'projectilePctDmg', baseMin: 2, baseMax: 3 }],
      tags: ['투사체', '물리'],
      spatial: { desc: '외벽에 닿아 있으면 투사체 피해 +5%', effects: [{ stage: 'wall', when: { type: 'wallTouch', min: 1 }, grant: [{ id: 'projectilePctDmg', val: 5 }] }] } },
    { id: 'gf_storm_bell', name: '뇌운 종꽃', category: 'flower', shapeId: 'dot1', reqTier: 4,
      baseStats: [{ id: 'spellFlatDmg', baseMin: 1, baseMax: 2 }, { id: 'lightPctDmg', baseMin: 2, baseMax: 3 }],
      tags: ['번개', '주문'],
      spatial: { desc: '위쪽(회전 반영)이 빈칸이면 감전 확률 +10%', effects: [{ stage: 'wall', when: { type: 'dirEmpty', dir: 'up' }, grant: [{ id: 'shockChance', val: 10 }] }] } },
    { id: 'gf_frost_thorn', name: '서리 가시꽃', category: 'flower', shapeId: 'dot1', reqTier: 6,
      baseStats: [{ id: 'flatDmg', baseMin: 1, baseMax: 2 }, { id: 'coldPctDmg', baseMin: 2, baseMax: 3 }],
      tags: ['냉기', '근접'],
      spatial: { desc: '왼쪽(회전 반영)이 외벽이면 냉각 확률 +14%', effects: [{ stage: 'wall', when: { type: 'dirWall', dir: 'left' }, grant: [{ id: 'chillChance', val: 14 }] }] } },
    { id: 'gf_venom_maw', name: '독니 포충화', category: 'flower', shapeId: 'dot1', reqTier: 7,
      baseStats: [{ id: 'flatDmg', baseMin: 1, baseMax: 2 }, { id: 'chaosPctDmg', baseMin: 2, baseMax: 3 }, { id: 'poisonChance', baseMin: 2, baseMax: 4 }],
      tags: ['카오스', '상태이상'],
      spatial: { desc: '같은 행에 상태이상 태그가 2개 이상이면 지속 피해 배율 +5%', effects: [{ stage: 'rowcol', when: { type: 'rowTagCount', tag: '상태이상', min: 2 }, grant: [{ id: 'dotPctDmg', val: 5 }] }] } },
    { id: 'gf_twin_pistil', name: '쌍술 나팔꽃', category: 'flower', shapeId: 'dot1', reqTier: 8,
      baseStats: [{ id: 'flatDmg', baseMin: 1, baseMax: 2 }, { id: 'crit', baseMin: 0.5, baseMax: 1 }],
      tags: ['물리', '근접'],
      spatial: { desc: '행의 가장 오른쪽 꽃이면 치명타 피해 배율 +10%', effects: [{ stage: 'rowcol', when: { type: 'rowEdgeCategory', side: 'right', category: 'flower' }, grant: [{ id: 'critDmg', val: 10 }] }] } },
    { id: 'gf_spore_burst', name: '홀씨 폭관화', category: 'flower', shapeId: 'dot1', reqTier: 9,
      baseStats: [{ id: 'flatDmg', baseMin: 1, baseMax: 2 }, { id: 'aoePctDmg', baseMin: 2, baseMax: 3 }],
      tags: ['범위', '폭발'],
      spatial: { desc: '인접한 폭발 태그 1개당 범위 피해 +3%', effects: [{ stage: 'tags', when: { type: 'adjTag', tag: '폭발', per: true }, grant: [{ id: 'aoePctDmg', val: 3 }] }] } },
    { id: 'gf_spark_seed', name: '불꽃 씨앗', category: 'flower', shapeId: 'dot1', reqTier: 1,
      baseStats: [{ id: 'flatDmg', baseMin: 1, baseMax: 2 }, { id: 'elementalPctDmg', baseMin: 2, baseMax: 2 }],
      tags: ['원소', '고립'],
      spatial: { desc: '고립되어 있으면(인접 아이템 없음) 피해 +6%', effects: [{ stage: 'complex', when: { type: 'isolated' }, grant: [{ id: 'pctDmg', val: 6 }] }] } },
    { id: 'gf_needle_bud', name: '바늘 꽃눈', category: 'flower', shapeId: 'dot1', reqTier: 4,
      baseStats: [{ id: 'flatDmg', baseMin: 1, baseMax: 2 }, { id: 'crit', baseMin: 0.5, baseMax: 1 }],
      tags: ['물리', '군집'],
      spatial: { desc: '꽃 2개 이상과 인접하면 치명타 확률 +2%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'flower', min: 2 }, grant: [{ id: 'crit', val: 2 }] }] } },
    { id: 'gf_fang_sprout', name: '송곳니 새싹', category: 'flower', shapeId: 'dot1', reqTier: 9,
      baseStats: [{ id: 'flatDmg', baseMin: 1, baseMax: 2 }, { id: 'minDmgRoll', baseMin: 1, baseMax: 2 }],
      tags: ['물리', '군집'],
      spatial: { desc: '가지로만 둘러싸이면 피해 +7%', effects: [{ stage: 'complex', when: { type: 'surroundedByCategory', category: 'branch' }, grant: [{ id: 'pctDmg', val: 7 }] }] } },

    // ── 가지: 방어 ──
    { id: 'gb_iron_trunk', name: '무쇠 밑동', category: 'branch', shapeId: 'dot1', reqTier: 1,
      baseStats: [{ id: 'armor', baseMin: 18, baseMax: 28 }, { id: 'flatHp', baseMin: 6, baseMax: 9 }],
      tags: ['방어'],
      spatial: { desc: '인접한 꽃 1개당 방어도 +12', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'flower', per: true }, grant: [{ id: 'armor', val: 12 }] }] } },
    { id: 'gb_mist_fern', name: '안개 양치가지', category: 'branch', shapeId: 'dot1', reqTier: 2,
      baseStats: [{ id: 'evasion', baseMin: 16, baseMax: 26 }, { id: 'flatHp', baseMin: 5, baseMax: 8 }],
      tags: ['방어', '회피'],
      spatial: { desc: '인접한 빈칸 1개당 회피 +10', effects: [{ stage: 'adjacency', when: { type: 'emptyAdj', per: true }, grant: [{ id: 'evasion', val: 10 }] }] } },
    { id: 'gb_glow_bark', name: '수정 수피', category: 'branch', shapeId: 'dot1', reqTier: 3,
      baseStats: [{ id: 'energyShield', baseMin: 14, baseMax: 24 }, { id: 'resAll', baseMin: 2, baseMax: 3 }],
      tags: ['방어', '보호막'],
      spatial: { desc: '서로 다른 종류와 인접할 때마다 에너지 보호막 +9', effects: [{ stage: 'adjacency', when: { type: 'adjOtherCategory', per: true }, grant: [{ id: 'energyShield', val: 9 }] }] } },
    { id: 'gb_root_wall', name: '뿌리 옹벽', category: 'branch', shapeId: 'dot1', reqTier: 4,
      baseStats: [{ id: 'armor', baseMin: 18, baseMax: 30 }, { id: 'flatHp', baseMin: 6, baseMax: 9 }, { id: 'regen', baseMin: 0.11, baseMax: 0.19 }],
      tags: ['방어', '회복'],
      spatial: { desc: '모서리(두 외벽)에 놓이면 받는 물리 피해 감소 +4%', effects: [{ stage: 'wall', when: { type: 'corner' }, grant: [{ id: 'dr', val: 4 }] }] } },
    { id: 'gb_moon_chip', name: '달조각 껍질', category: 'branch', shapeId: 'dot1', reqTier: 5,
      baseStats: [{ id: 'evasion', baseMin: 16, baseMax: 26 }, { id: 'energyShield', baseMin: 12, baseMax: 18 }],
      tags: ['방어', '회피'],
      spatial: { desc: '열의 가장 아래에 있으면 회피 +14%', effects: [{ stage: 'rowcol', when: { type: 'colEdge', side: 'bottom' }, grant: [{ id: 'evasionPct', val: 14 }] }] } },
    { id: 'gb_bulwark_knot', name: '방벽 옹이', category: 'branch', shapeId: 'dot1', reqTier: 6,
      baseStats: [{ id: 'armor', baseMin: 20, baseMax: 30 }, { id: 'blockChance', baseMin: 1, baseMax: 2 }],
      tags: ['방어', '막기'],
      spatial: { desc: '같은 열에 가지가 3개 이상이면 막기 확률 +3%p', effects: [{ stage: 'rowcol', when: { type: 'colCategoryCount', category: 'branch', min: 3 }, grant: [{ id: 'blockChance', val: 3 }] }] } },
    { id: 'gb_tide_coil', name: '조수 똬리', category: 'branch', shapeId: 'dot1', reqTier: 7,
      baseStats: [{ id: 'evasion', baseMin: 18, baseMax: 30 }, { id: 'energyShield', baseMin: 14, baseMax: 20 }],
      tags: ['방어', '회피'],
      spatial: { desc: '벽과 다른 아이템 사이에 끼어 있으면 회피 +20%', effects: [{ stage: 'wall', when: { type: 'pinched' }, grant: [{ id: 'evasionPct', val: 20 }] }] } },
    { id: 'gb_hearth_core', name: '화로심 가지', category: 'branch', shapeId: 'dot1', reqTier: 8,
      baseStats: [{ id: 'flatHp', baseMin: 7, baseMax: 10 }, { id: 'resF', baseMin: 3, baseMax: 6 }],
      tags: ['방어', '화염'],
      spatial: { desc: '모서리(두 외벽)에 놓이면 최대 생명력 +34', effects: [{ stage: 'wall', when: { type: 'corner' }, grant: [{ id: 'flatHp', val: 17 }] }] } },
    { id: 'gb_null_lattice', name: '무효 격자', category: 'branch', shapeId: 'dot1', reqTier: 9,
      baseStats: [{ id: 'energyShield', baseMin: 18, baseMax: 28 }, { id: 'resChaos', baseMin: 3, baseMax: 4 }],
      tags: ['방어', '보호막'],
      spatial: { desc: '빈칸이 정확히 하나인 행에 있으면 에너지 보호막 +18%', effects: [{ stage: 'rowcol', when: { type: 'rowOneEmpty' }, grant: [{ id: 'energyShieldPct', val: 18 }] }] } },
    { id: 'gb_pearl_knob', name: '진주 마디', category: 'branch', shapeId: 'dot1', reqTier: 2,
      baseStats: [{ id: 'flatHp', baseMin: 6, baseMax: 9 }, { id: 'resAll', baseMin: 2, baseMax: 3 }],
      tags: ['방어', '연결'],
      spatial: { desc: '다른 종류와 인접할 때마다 모든 저항 +2%', effects: [{ stage: 'adjacency', when: { type: 'adjOtherCategory', per: true }, grant: [{ id: 'resAll', val: 2 }] }] } },
    { id: 'gb_thorn_stud', name: '가시 못가지', category: 'branch', shapeId: 'dot1', reqTier: 4,
      baseStats: [{ id: 'armor', baseMin: 18, baseMax: 28 }, { id: 'flatHp', baseMin: 5, baseMax: 8 }],
      tags: ['방어', '군집'],
      spatial: { desc: '꽃 2개 이상과 인접하면 받는 물리 피해 감소 +3%', effects: [{ stage: 'complex', when: { type: 'adjCategory', category: 'flower', min: 2 }, grant: [{ id: 'dr', val: 3 }] }] } },

    // ── 잎: 연결·유틸리티 ──
    { id: 'gl_knot_thread', name: '매듭 실잎', category: 'leaf', shapeId: 'dot1', reqTier: 1,
      baseStats: [{ id: 'aspd', baseMin: 2, baseMax: 3 }],
      tags: ['연결'],
      spatial: { desc: '인접한 아이템 1개당 피해 +1%', effects: [{ stage: 'adjacency', when: { type: 'adjAny', per: true }, grant: [{ id: 'pctDmg', val: 1 }] }] } },
    { id: 'gl_wind_vine', name: '바람 넝쿨', category: 'leaf', shapeId: 'dot1', reqTier: 2,
      baseStats: [{ id: 'aspd', baseMin: 2, baseMax: 3 }, { id: 'move', baseMin: 2, baseMax: 4 }],
      tags: ['이동'],
      spatial: { desc: '인접한 꽃 1개당 공격 속도 +2%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'flower', per: true }, grant: [{ id: 'aspd', val: 2 }] }] } },
    { id: 'gl_dew_moss', name: '이슬 이끼잎', category: 'leaf', shapeId: 'dot1', reqTier: 3,
      baseStats: [{ id: 'regen', baseMin: 0.14, baseMax: 0.25 }, { id: 'resAll', baseMin: 2, baseMax: 3 }],
      tags: ['회복'],
      spatial: { desc: '인접한 가지 1개당 초당 재생 +0.2%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'branch', per: true }, grant: [{ id: 'regen', val: 0.2 }] }] } },
    { id: 'gl_prism_petal', name: '분광 꽃잎', category: 'leaf', shapeId: 'dot1', reqTier: 6,
      baseStats: [{ id: 'elementalPctDmg', baseMin: 1, baseMax: 2 }, { id: 'resAll', baseMin: 2, baseMax: 3 }],
      tags: ['변환'],
      spatial: { desc: '서로 다른 원소 태그 2종 이상과 인접하면 저항 관통 +3%', effects: [{ stage: 'tags', when: { type: 'adjDistinctElements', min: 2 }, grant: [{ id: 'resPen', val: 3 }] }] } },
    { id: 'gl_glint_scale', name: '반짝 비늘잎', category: 'leaf', shapeId: 'dot1', reqTier: 6,
      baseStats: [{ id: 'crit', baseMin: 0.5, baseMax: 1 }],
      tags: ['연결'],
      spatial: { desc: '좌우 대칭 위치에 아이템이 있으면 치명타 피해 배율 +5%', effects: [{ stage: 'complex', when: { type: 'mirrorOccupied' }, grant: [{ id: 'critDmg', val: 5 }] }] } },
    { id: 'gl_sap_conduit', name: '수액 도관', category: 'leaf', shapeId: 'dot1', reqTier: 7,
      baseStats: [{ id: 'leech', baseMin: 0.14, baseMax: 0.25 }],
      tags: ['흡혈'],
      spatial: { desc: '꽃과 가지 모두와 인접하면 생명력 흡수 +0.6%', effects: [{ stage: 'adjacency', when: { type: 'adjBothCategories', categories: ['flower', 'branch'] }, grant: [{ id: 'leech', val: 0.6 }] }] } },
    { id: 'gl_relay_bine', name: '중계 덩굴손', category: 'leaf', shapeId: 'dot1', reqTier: 7,
      baseStats: [{ id: 'pctDmg', baseMin: 1, baseMax: 2 }],
      tags: ['연결'],
      spatial: { desc: '연결 태그와 인접하면 자신의 베이스 옵션 효과 +40%', effects: [{ stage: 'tags', when: { type: 'adjTag', tag: '연결' }, grant: [{ id: 'growthSelfBasePct', val: 40 }] }] } },
    { id: 'gl_gale_ribbon', name: '돌풍 리본잎', category: 'leaf', shapeId: 'dot1', reqTier: 8,
      baseStats: [{ id: 'aspd', baseMin: 2, baseMax: 3 }, { id: 'crit', baseMin: 0.5, baseMax: 1 }],
      tags: ['이동'],
      spatial: { desc: '같은 행의 잎 1개당(자신 제외) 공격 속도 +1.5%', effects: [{ stage: 'rowcol', when: { type: 'rowCategoryCount', category: 'leaf', excludeSelf: true, per: true }, grant: [{ id: 'aspd', val: 1.5 }] }] } },
    { id: 'gl_ember_mote', name: '잉걸 티끌', category: 'leaf', shapeId: 'dot1', reqTier: 8,
      baseStats: [{ id: 'firePctDmg', baseMin: 1, baseMax: 2 }, { id: 'igniteChance', baseMin: 2, baseMax: 4 }],
      tags: ['화염', '상태이상'],
      spatial: { desc: '화염 태그와 인접하면 점화 피해 증가 +8%', effects: [{ stage: 'tags', when: { type: 'adjTag', tag: '화염' }, grant: [{ id: 'igniteDamageMultiplierPct', val: 8 }] }] } },
    { id: 'gl_echo_stem', name: '메아리 줄기', category: 'leaf', shapeId: 'dot1', reqTier: 9,
      baseStats: [{ id: 'pctDmg', baseMin: 1, baseMax: 2 }],
      tags: ['연결', '메아리'],
      spatial: { desc: '2칸 거리에 꽃이 있으면 피해 +3%, 가지가 있으면 최대 생명력 +26', effects: [{ stage: 'complex', when: { type: 'atDistance', distance: 2, category: 'flower' }, grant: [{ id: 'pctDmg', val: 3 }] }, { stage: 'complex', when: { type: 'atDistance', distance: 2, category: 'branch' }, grant: [{ id: 'flatHp', val: 13 }] }] } },
    { id: 'gl_void_grain', name: '공허 낟알', category: 'leaf', shapeId: 'dot1', reqTier: 10,
      baseStats: [{ id: 'chaosPctDmg', baseMin: 1, baseMax: 2 }, { id: 'resChaos', baseMin: 2, baseMax: 4 }],
      tags: ['카오스'],
      spatial: { desc: '같은 열에 카오스 태그가 2개 이상이면 저항 관통 +4%', effects: [{ stage: 'rowcol', when: { type: 'colTagCount', tag: '카오스', min: 2 }, grant: [{ id: 'resPen', val: 4 }] }] } },
    { id: 'gl_summon_whorl', name: '군락 소용돌이잎', category: 'leaf', shapeId: 'dot1', reqTier: 11,
      baseStats: [{ id: 'summonPctDmg', baseMin: 1, baseMax: 2 }, { id: 'summonHpPct', baseMin: 3, baseMax: 4 }],
      tags: ['소환수'],
      spatial: { desc: '소환수 태그 아이템이 판 전체에 4개 이상이면 소환수 효율 +8%', effects: [{ stage: 'tags', when: { type: 'boardTagCount', tag: '소환수', min: 4 }, grant: [{ id: 'summonEfficiency', val: 8 }] }] } },

    // ── 열매: 치명타·수확 ──
    { id: 'gfr_red_berry', name: '붉은 수확열매', category: 'fruit', shapeId: 'dot1', reqTier: 3,
      baseStats: [{ id: 'crit', baseMin: 0.5, baseMax: 1 }, { id: 'critDmg', baseMin: 2, baseMax: 4 }], tags: ['수확', '치명타'],
      spatial: { desc: '씨앗과 인접하면 치명타 피해 +7%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'seed' }, grant: [{ id: 'critDmg', val: 7 }] }] } },
    { id: 'gfr_orchard_cluster', name: '별무리 과실송이', category: 'fruit', shapeId: 'square4', reqTier: 12,
      baseStats: [{ id: 'pctDmg', baseMin: 5, baseMax: 7 }, { id: 'critDmg', baseMin: 8, baseMax: 12 }], tags: ['수확', '별빛'],
      spatial: { desc: '외벽에 닿으면 치명타 확률 +4%', effects: [{ stage: 'wall', when: { type: 'wallTouch', min: 1 }, grant: [{ id: 'crit', val: 4 }] }] } },

    // ── 뿌리: 생존·회복 ──
    { id: 'gr_mender_root', name: '치유 수염뿌리', category: 'root', shapeId: 'dot1', reqTier: 2,
      baseStats: [{ id: 'flatHp', baseMin: 7, baseMax: 11 }, { id: 'regen', baseMin: 0.15, baseMax: 0.25 }], tags: ['방어', '회복'],
      spatial: { desc: '줄기와 인접하면 초당 재생 +0.35%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'stem' }, grant: [{ id: 'regen', val: 0.35 }] }] } },
    { id: 'gr_ancient_buttress', name: '고목 버팀뿌리', category: 'root', shapeId: 'corner3', reqTier: 10,
      baseStats: [{ id: 'flatHp', baseMin: 20, baseMax: 28 }, { id: 'armor', baseMin: 45, baseMax: 65 }], tags: ['방어', '고목'],
      spatial: { desc: '모서리에 닿으면 받는 물리 피해 감소 +5%', effects: [{ stage: 'wall', when: { type: 'corner' }, grant: [{ id: 'dr', val: 5 }] }] } },

    // ── 가시: 공격·방어 연결 ──
    { id: 'gt_blood_thorn', name: '피먹는 가시', category: 'thorn', shapeId: 'dot1', reqTier: 4,
      baseStats: [{ id: 'physPctDmg', baseMin: 2, baseMax: 4 }, { id: 'leech', baseMin: 0.12, baseMax: 0.22 }], tags: ['물리', '흡혈'],
      spatial: { desc: '꽃과 인접하면 피해 +4%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'flower' }, grant: [{ id: 'pctDmg', val: 4 }] }] } },
    { id: 'gt_crown_briar', name: '왕관 찔레', category: 'thorn', shapeId: 'domino2', reqTier: 11,
      baseStats: [{ id: 'physPctDmg', baseMin: 5, baseMax: 8 }, { id: 'critDmg', baseMin: 6, baseMax: 10 }], tags: ['물리', '벽'],
      spatial: { desc: '외벽에 닿으면 방어도 +45', effects: [{ stage: 'wall', when: { type: 'wallTouch', min: 1 }, grant: [{ id: 'armor', val: 45 }] }] } },

    // ── 줄기: 속도·도관 ──
    { id: 'gst_quick_reed', name: '빠른 물대', category: 'stem', shapeId: 'dot1', reqTier: 3,
      baseStats: [{ id: 'aspd', baseMin: 2, baseMax: 3 }, { id: 'move', baseMin: 2, baseMax: 3 }], tags: ['연결', '이동'],
      spatial: { desc: '잎과 인접할 때마다 공격 속도 +1%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'leaf', per: true }, grant: [{ id: 'aspd', val: 1 }] }] } },
    { id: 'gst_hollow_conduit', name: '공명 속빈줄기', category: 'stem', shapeId: 'line3', reqTier: 10,
      baseStats: [{ id: 'aspd', baseMin: 5, baseMax: 7 }, { id: 'move', baseMin: 5, baseMax: 7 }], tags: ['연결', '공명'],
      spatial: { desc: '같은 행의 연결 태그 2개 이상이면 피해 +8%', effects: [{ stage: 'rowcol', when: { type: 'rowTagCount', tag: '연결', min: 2 }, grant: [{ id: 'pctDmg', val: 8 }] }] } },

    // ── 포자: 카오스·지속 피해 ──
    { id: 'gsp_dusk_spore', name: '해질녘 포자', category: 'spore', shapeId: 'dot1', reqTier: 4,
      baseStats: [{ id: 'chaosPctDmg', baseMin: 2, baseMax: 4 }, { id: 'poisonChance', baseMin: 3, baseMax: 5 }], tags: ['카오스', '상태이상'],
      spatial: { desc: '가시와 인접하면 지속 피해 +5%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'thorn' }, grant: [{ id: 'dotPctDmg', val: 5 }] }] } },
    { id: 'gsp_mycelium_web', name: '심연 균사망', category: 'spore', shapeId: 'zig4', reqTier: 13,
      baseStats: [{ id: 'chaosPctDmg', baseMin: 7, baseMax: 10 }, { id: 'dotPctDmg', baseMin: 8, baseMax: 12 }], tags: ['카오스', '군집'],
      spatial: { desc: '카오스 태그 3개 이상이면 저항 관통 +5%', effects: [{ stage: 'tags', when: { type: 'boardTagCount', tag: '카오스', min: 3 }, grant: [{ id: 'resPen', val: 5 }] }] } },

    // ── 씨앗: 성장·군락 ──
    { id: 'gsd_patient_seed', name: '기다림의 씨앗', category: 'seed', shapeId: 'dot1', reqTier: 2,
      baseStats: [{ id: 'pctHp', baseMin: 1, baseMax: 2 }, { id: 'pctDmg', baseMin: 1, baseMax: 2 }], tags: ['성장', '군집'],
      spatial: { desc: '열매와 인접하면 생명력 +3%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'fruit' }, grant: [{ id: 'pctHp', val: 3 }] }] } },
    { id: 'gsd_world_kernel', name: '작은 세계의 씨앗', category: 'seed', shapeId: 'square4', reqTier: 14,
      baseStats: [{ id: 'pctHp', baseMin: 6, baseMax: 9 }, { id: 'pctDmg', baseMin: 6, baseMax: 9 }], tags: ['성장', '중심'],
      spatial: { desc: '고립되어 있으면 모든 저항 +10%', effects: [{ stage: 'complex', when: { type: 'isolated' }, grant: [{ id: 'resAll', val: 10 }] }] } },

    // ── 덩굴: 연결·소환 ──
    { id: 'gv_binding_tendril', name: '결속 덩굴손', category: 'vine', shapeId: 'dot1', reqTier: 3,
      baseStats: [{ id: 'summonPctDmg', baseMin: 2, baseMax: 3 }, { id: 'aspd', baseMin: 1, baseMax: 2 }], tags: ['연결', '소환수'],
      spatial: { desc: '씨앗과 인접하면 소환수 효율 +5%', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'seed' }, grant: [{ id: 'summonEfficiency', val: 5 }] }] } },
    { id: 'gv_canopy_bridge', name: '수관 잇는덩굴', category: 'vine', shapeId: 'corner3', reqTier: 12,
      baseStats: [{ id: 'summonPctDmg', baseMin: 6, baseMax: 9 }, { id: 'summonHpPct', baseMin: 8, baseMax: 12 }], tags: ['연결', '소환수'],
      spatial: { desc: '소환수 태그가 4개 이상이면 소환수 효율 +10%', effects: [{ stage: 'tags', when: { type: 'boardTagCount', tag: '소환수', min: 4 }, grant: [{ id: 'summonEfficiency', val: 10 }] }] } }
];

// ── 생장 고유 아이템 ─────────────────────────────────────────────────────
// uniqueEffectKey는 기존 combat.js 파이프라인에 이미 구현된 키를 재사용한다.
// growthEffectKey는 생장판 배치를 읽는 전용 핸들러다.
const GROWTH_UNIQUE_DB = [
    { name: '세계수의 심장', baseId: 'gf_sun_bloom', reqTier: 5,
      uniqueEffect: '5칸 이상 떨어진 꽃의 옵션 +25% (배치 기반)',
      uniqueEffectKey: null, growthEffectKey: 'worldTreeHeart',
      stats: [{ id: 'flatDmg', min: 9, max: 9 }, { id: 'pctHp', min: 6, max: 6 }, { id: 'aoePctDmg', min: 12, max: 12 }],
      tags: ['물리', '근접', '중심'] },
    { name: '요람 가지', baseId: 'gb_root_wall', reqTier: 6,
      uniqueEffect: '인접 아이템 1개당 받는 물리 피해 감소 +1%, 완전히 둘러싸이면 수호막 발동',
      uniqueEffectKey: 'dragonVeinGuard', uniqueEffectParams: { chance: 15, duration: 2, hpPct: 6 }, growthEffectKey: 'cradleBranch',
      stats: [{ id: 'flatHp', min: 33, max: 33 }, { id: 'regen', min: 0.45, max: 0.45 }, { id: 'resAll', min: 6, max: 6 }],
      tags: ['방어', '회복'] },
    { name: '공허 고리', baseId: 'gb_glow_bark', reqTier: 10,
      uniqueEffect: '주변 8칸 아이템의 옵션 +35% (자신은 제외)',
      uniqueEffectKey: null, growthEffectKey: 'voidRing',
      stats: [{ id: 'energyShield', min: 42, max: 42 }, { id: 'resChaos', min: 7.5, max: 7.5 }],
      tags: ['방어', '보호막', '고리'] },
    { name: '쌍둥이 홀씨', baseId: 'gl_echo_stem', reqTier: 10,
      uniqueEffect: '2칸 거리 아이템의 추가 옵션 효과를 20% 복사',
      uniqueEffectKey: null, growthEffectKey: 'twinSpore',
      stats: [{ id: 'pctDmg', min: 6, max: 6 }, { id: 'aspd', min: 3, max: 3 }],
      tags: ['연결', '메아리'] },
    { name: '삼원소 공명핵', baseId: 'gl_prism_petal', reqTier: 12,
      uniqueEffect: '판 위에 화염·냉기·번개 태그가 모두 있으면 원소 피해 +30%, 저항 관통 +6%',
      uniqueEffectKey: null, growthEffectKey: 'triElementCore',
      stats: [{ id: 'elementalPctDmg', min: 10.5, max: 10.5 }, { id: 'resAll', min: 6, max: 6 }],
      tags: ['원소', '변환'] },
    { name: '경계석 가지', baseId: 'gb_hearth_core', reqTier: 8,
      uniqueEffect: '닿은 외벽 면 1개당 모든 저항 +4%·받는 물리 피해 감소 +2%, 모서리 배치 시 생명력 +10%',
      uniqueEffectKey: null, growthEffectKey: 'boundaryStone',
      stats: [{ id: 'flatHp', min: 27, max: 27 }, { id: 'armor', min: 30, max: 30 }],
      tags: ['방어', '벽'] },
    { name: '황금 과수원의 왕관', baseId: 'gfr_orchard_cluster', reqTier: 14,
      uniqueEffect: '4칸을 차지하는 수확 특화 열매', uniqueEffectKey: null, growthEffectKey: null,
      stats: [{ id: 'crit', min: 7.5, max: 7.5 }, { id: 'critDmg', min: 27, max: 27 }], tags: ['수확', '치명타', '별빛'] },
    { name: '대지의 기억', baseId: 'gr_ancient_buttress', reqTier: 13,
      uniqueEffect: '3칸을 차지하는 생존 특화 뿌리', uniqueEffectKey: null, growthEffectKey: null,
      stats: [{ id: 'flatHp', min: 57, max: 57 }, { id: 'dr', min: 9, max: 9 }], tags: ['방어', '회복', '고목'] },
    { name: '순교자의 가시관', baseId: 'gt_crown_briar', reqTier: 13,
      uniqueEffect: '2칸을 차지하는 공격·방어 혼합 가시', uniqueEffectKey: null, growthEffectKey: null,
      stats: [{ id: 'physPctDmg', min: 21, max: 21 }, { id: 'armor', min: 90, max: 90 }], tags: ['물리', '벽', '흡혈'] },
    { name: '천공의 맥관', baseId: 'gst_hollow_conduit', reqTier: 13,
      uniqueEffect: '3칸을 잇는 속도 특화 줄기', uniqueEffectKey: null, growthEffectKey: null,
      stats: [{ id: 'aspd', min: 15, max: 15 }, { id: 'move', min: 15, max: 15 }], tags: ['연결', '공명', '이동'] },
    { name: '검은 달의 균사', baseId: 'gsp_mycelium_web', reqTier: 15,
      uniqueEffect: '4칸을 퍼지는 카오스·지속 피해 포자', uniqueEffectKey: null, growthEffectKey: null,
      stats: [{ id: 'chaosPctDmg', min: 24, max: 24 }, { id: 'dotPctDmg', min: 27, max: 27 }], tags: ['카오스', '상태이상', '군집'] },
    { name: '태초의 핵', baseId: 'gsd_world_kernel', reqTier: 16,
      uniqueEffect: '4칸을 차지하는 생명력·피해 혼합 씨앗', uniqueEffectKey: null, growthEffectKey: null,
      stats: [{ id: 'pctHp', min: 18, max: 18 }, { id: 'pctDmg', min: 18, max: 18 }], tags: ['성장', '중심', '군집'] },
    { name: '만물결속 덩굴', baseId: 'gv_canopy_bridge', reqTier: 15,
      uniqueEffect: '3칸을 잇는 소환수 특화 덩굴', uniqueEffectKey: null, growthEffectKey: null,
      stats: [{ id: 'summonPctDmg', min: 24, max: 24 }, { id: 'summonEfficiency', min: 18, max: 18 }], tags: ['연결', '소환수', '군집'] },
    { name: '재의 태양', baseId: 'gf_ember_crown', reqTier: 11,
      uniqueEffect: '인접한 서로 다른 종류 1개당 화염 피해 +8%, 3종 이상이면 저항 관통 +5%',
      uniqueEffectKey: null, growthEffectKey: 'ashenSun',
      stats: [{ id: 'firePctDmg', min: 21, max: 21 }, { id: 'igniteChance', min: 18, max: 18 }],
      tags: ['화염', '상태이상', '중심'] },
    { name: '첫 수확의 성배', baseId: 'gfr_red_berry', reqTier: 12,
      uniqueEffect: '판 위 씨앗 1개당 모든 열매의 베이스 옵션 +10% (최대 30%)',
      uniqueEffectKey: null, growthEffectKey: 'firstHarvestChalice',
      stats: [{ id: 'crit', min: 6, max: 6 }, { id: 'critDmg', min: 21, max: 21 }],
      tags: ['수확', '치명타', '성장'] },
    { name: '거꾸로 자란 뿌리', baseId: 'gr_ancient_buttress', reqTier: 14,
      uniqueEffect: '자신이 받는 음수 석판 레벨 1당 생명력 +5%·방어도 +25',
      uniqueEffectKey: null, growthEffectKey: 'invertedRoot',
      stats: [{ id: 'flatHp', min: 48, max: 48 }, { id: 'armor', min: 105, max: 105 }],
      tags: ['방어', '고목', '역행'] },
    { name: '피의 십일조', baseId: 'gt_blood_thorn', reqTier: 12,
      uniqueEffect: '인접한 비석판 1개당 물리 피해 +7%·생명력 -2%',
      uniqueEffectKey: null, growthEffectKey: 'bloodTitheThorn',
      stats: [{ id: 'physPctDmg', min: 18, max: 18 }, { id: 'leech', min: 0.75, max: 0.75 }],
      tags: ['물리', '흡혈', '희생'] },
    { name: '폭풍을 꿰는 도관', baseId: 'gst_hollow_conduit', reqTier: 14,
      uniqueEffect: '같은 행·열의 화염·냉기·번개 생장판 옵션 +18%',
      uniqueEffectKey: null, growthEffectKey: 'stormPiercingConduit',
      stats: [{ id: 'aspd', min: 12, max: 12 }, { id: 'lightPctDmg', min: 21, max: 21 }],
      tags: ['연결', '공명', '번개'] },
    { name: '군체의 탯줄', baseId: 'gv_canopy_bridge', reqTier: 15,
      uniqueEffect: '다른 소환수 생장판 옵션 +15%, 대상이 4개 이상이면 소환수 한도 +1',
      uniqueEffectKey: null, growthEffectKey: 'hiveUmbilical',
      stats: [{ id: 'summonPctDmg', min: 27, max: 27 }, { id: 'summonHpPct', min: 22.5, max: 22.5 }],
      tags: ['연결', '소환수', '군체'] },
    { name: '태초의 설계도', baseId: 'gsd_world_kernel', shapeId: 'square4', reqTier: 18,
      weight: 0.018, chase: true, flavorText: '숲은 자라난 것이 아니다. 누군가의 도면대로 완성되고 있었다.',
      uniqueEffect: '비석판 생장판이 6종 이상이고 종류가 서로 겹치지 않으면 모든 비석판의 베이스 옵션 +40%',
      uniqueEffectKey: null, growthEffectKey: 'primordialBlueprint',
      stats: [{ id: 'pctHp', min: 24, max: 24 }, { id: 'pctDmg', min: 24, max: 24 }],
      tags: ['성장', '중심', '설계'] },
    { name: '죽은 별의 균사체', baseId: 'gsp_mycelium_web', shapeId: 'zig4', reqTier: 20,
      weight: 0.012, chase: true, flavorText: '별빛을 먹은 포자는 주인의 피보다 먼저 새로운 하늘을 기억한다.',
      uniqueEffect: '비석판이 받는 양의 석판 레벨 합계 1당 카오스·지속 피해 +4%(최대 80%), 생명력 -10%',
      uniqueEffectKey: null, growthEffectKey: 'deadStarMycelium',
      stats: [{ id: 'chaosPctDmg', min: 36, max: 36 }, { id: 'dotPctDmg', min: 36, max: 36 }],
      tags: ['카오스', '상태이상', '별빛'] }
];

// ── 전역 시너지 규칙 (판 전체 판정) ───────────────────────────────────────
const GROWTH_GLOBAL_SYNERGY_DB = [
    { id: 'gs_row_filled', stage: 'rowcol', label: '가득 찬 행', desc: '완전히 채워진 행 1개당 피해 +2%, 생명력 +2%',
      type: 'rowFilled', per: true, grant: [{ id: 'pctDmg', val: 2 }, { id: 'pctHp', val: 2 }] },
    { id: 'gs_symmetry', stage: 'complex', label: '좌우 대칭', desc: '배치가 좌우 대칭이면 치명타 피해 배율 +15%',
      type: 'mirrorSymmetry', grant: [{ id: 'critDmg', val: 15 }] },
    { id: 'gs_tri_element', stage: 'tags', label: '삼원소 공명', desc: '서로 다른 원소 태그 3종 이상이면 원소 피해 +10%, 저항 관통 +2%',
      type: 'distinctElementTags', min: 3, grant: [{ id: 'elementalPctDmg', val: 10 }, { id: 'resPen', val: 2 }] },
    { id: 'gs_summon_pack', stage: 'tags', label: '군락 결속', desc: '소환수 태그 아이템 4개 이상이면 소환수 최대 한도 +1',
      type: 'tagItemCount', tag: '소환수', min: 4, grant: [{ id: 'summonCap', val: 1 }] },
    { id: 'gs_four_corners', stage: 'complex', label: '사방의 주춧돌', desc: '판의 네 모서리가 모두 채워지면 공격 속도 +6%, 이동 속도 +6%',
      type: 'cornersOccupied', grant: [{ id: 'aspd', val: 6 }, { id: 'move', val: 6 }] },
    { id: 'gs_diversity', stage: 'complex', label: '다양성', desc: '같은 베이스 중복 없이 8개 이상 배치하면 모든 저항 +6%',
      type: 'allUniqueBases', min: 8, grant: [{ id: 'resAll', val: 6 }] },
    { id: 'gs_category_balance', stage: 'complex', label: '삼목의 균형', desc: '꽃·가지·잎을 각각 3개 이상 배치하면 피해 +4%, 생명력 +4%',
      type: 'categoryBalance', min: 3, grant: [{ id: 'pctDmg', val: 4 }, { id: 'pctHp', val: 4 }] },
    { id: 'gs_open_space', stage: 'complex', label: '여백의 미', desc: '빈 해금 칸이 8개 이상이면 회피 +10%, 초당 재생 +0.4%',
      type: 'emptyUnlockedCells', min: 8, grant: [{ id: 'evasionPct', val: 10 }, { id: 'regen', val: 0.4 }] },
    { id: 'gs_branch_column', stage: 'rowcol', label: '가지 기둥', desc: '가지가 3개 이상인 열 1개당 막기 확률 +1%p',
      type: 'colCategoryCountPer', category: 'branch', min: 3, grant: [{ id: 'blockChance', val: 1 }] },
    { id: 'gs_harvest_cycle', stage: 'tags', label: '수확의 순환', desc: '씨앗·열매·뿌리를 각각 1개 이상 배치하면 피해와 생명력 +5%',
      type: 'categorySet', categories: ['seed', 'fruit', 'root'], grant: [{ id: 'pctDmg', val: 5 }, { id: 'pctHp', val: 5 }] },
    { id: 'gs_wild_colony', stage: 'complex', label: '야생 군락', desc: '포자·덩굴·가시를 각각 1개 이상 배치하면 지속 피해 +10%, 소환수 피해 +10%',
      type: 'categorySet', categories: ['spore', 'vine', 'thorn'], grant: [{ id: 'dotPctDmg', val: 10 }, { id: 'summonPctDmg', val: 10 }] }
];

safeExposeData({
    GROWTH_BOARD_W, GROWTH_BOARD_H, GROWTH_SHAPE_DB, GROWTH_CATEGORY_INFO,
    GROWTH_AFFIX_CAP, GROWTH_AFFIX_VALUE_VERSION, GROWTH_AFFIX_VALUE_DB,
    getGrowthCategoryAffixCap, getGrowthAffixValueDef, GROWTH_UNLOCK_LOOP, GROWTH_UNLOCK_STAGES,
    GROWTH_LEVEL_STAT_PCT, GROWTH_LEVEL_CAP, GROWTH_SHAPE_REFORGE_COST_PER_CELL,
    GROWTH_SLAB_REFORGE_COST, GROWTH_SLAB_PATTERNS, GROWTH_SLAB_DB,
    GROWTH_SYNERGY_STAGES, GROWTH_BASE_DB, GROWTH_UNIQUE_DB,
    GROWTH_GLOBAL_SYNERGY_DB
});
