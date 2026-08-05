// 생장판(Growth Board) 정적 데이터.
// 베이스, 고유, 석판, 전역 공간 시너지, 칸 해금 단계 정의.
// 실행 로직에 의존하지 않는다 (AGENTS.md: data/ 계층).
//
// 모든 생장 아이템은 1칸이다. 폴리오미노(모양 맞추기)를 쓰지 않는 대신,
// "어느 칸에 두느냐"가 유일한 선택이 된다: 이웃, 외벽, 행·열, 석판 영향권.

const GROWTH_BOARD_W = 8;
const GROWTH_BOARD_H = 4;

// 형태는 1칸 하나뿐이다. getGrowthShapeDef가 알 수 없는 id를 dot1로 되돌리므로
// 예전 저장에 남은 폴리오미노 id도 1칸으로 해석된다.
const GROWTH_SHAPE_DB = {
    dot1: { label: '1칸', cells: [[0, 0]] }
};

// 종류 정의: 제작 슬롯(craftSlot)은 기존 MOD_DB/화석/오브 풀을 재사용하기 위한 매핑이다.
// 석판(slab)은 자체 옵션이 없고 다른 아이템의 레벨만 올리므로 제작 대상이 아니다.
const GROWTH_CATEGORY_INFO = {
    flower: { label: '꽃',   icon: '🌸', craftSlot: '무기',   qualityKind: 'weapon' },
    branch: { label: '가지', icon: '🌿', craftSlot: '갑옷',   qualityKind: 'armor' },
    leaf:   { label: '잎',   icon: '🍃', craftSlot: '목걸이', qualityKind: 'accessory' },
    slab:   { label: '석판', icon: '🪨', craftSlot: null,     qualityKind: null, noCraft: true }
};

// 종류별 희귀 추가 옵션 상한. 모든 아이템이 1칸이라 크기로는 구분되지 않으므로
// 종류가 옵션 폭을 정한다: 잎은 줄 수가 적은 대신 조건부 효과가 날카롭다.
const GROWTH_AFFIX_CAP = { flower: 2, branch: 2, leaf: 2, slab: 0 };

function getGrowthCategoryAffixCap(category) {
    let cap = GROWTH_AFFIX_CAP[category];
    return Number.isFinite(cap) ? cap : 2;
}

// ── 석판(레벨) 레이어 ────────────────────────────────────────────────────
// 석판도 1칸이며 자체 능력치가 없다. 대신 영향 범위 안의 칸에 "레벨"을 부여하고,
// 그 칸에 놓인 아이템의 베이스·추가 옵션이 함께 증폭된다.
// 레벨은 여러 석판에서 중첩된다.
const GROWTH_LEVEL_STAT_PCT = 12;   // 레벨 1당 아이템 옵션 +12%
const GROWTH_LEVEL_CAP = 8;         // 레벨 상한(중첩 폭주 방지)

// 영향 범위 패턴. dx/dy는 석판 자신을 원점으로 한 상대 좌표다.
// row/col은 좌표 대신 같은 행·열 전체를 뜻한다.
const GROWTH_SLAB_PATTERNS = {
    orthogonal: { label: '상하좌우', cells: [[0, -1], [0, 1], [-1, 0], [1, 0]] },
    diagonal:   { label: '대각선',   cells: [[-1, -1], [1, -1], [-1, 1], [1, 1]] },
    around:     { label: '주변 8칸', cells: [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]] },
    row:        { label: '같은 행',  axis: 'row' },
    col:        { label: '같은 열',  axis: 'col' },
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
      grants: [{ pattern: 'around', level: 3 }, { pattern: 'row', level: -1 }, { pattern: 'col', level: -1 }] }
];

// 생장판은 기존 고정 슬롯 장비를 대체하지 않는 별도 시스템이며 루프 25에 열린다.
const GROWTH_UNLOCK_LOOP = 25;

// 칸 해금 단계: 루프 진행 → 누적 활성 칸 수. 8칸에서 시작해 32칸(8×4)까지 자란다.
// 아이템이 1칸이라 칸 수가 곧 배치 개수다 — 60칸이면 60개를 관리해야 해서
// 판을 8×4로 줄이고, 대신 칸 하나의 무게를 키웠다.
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
      baseStats: [{ id: 'armor', baseMin: 18, baseMax: 28 }, { id: 'flatHp', baseMin: 12, baseMax: 18 }],
      tags: ['방어'],
      spatial: { desc: '인접한 꽃 1개당 방어도 +12', effects: [{ stage: 'adjacency', when: { type: 'adjCategory', category: 'flower', per: true }, grant: [{ id: 'armor', val: 12 }] }] } },
    { id: 'gb_mist_fern', name: '안개 양치가지', category: 'branch', shapeId: 'dot1', reqTier: 2,
      baseStats: [{ id: 'evasion', baseMin: 16, baseMax: 26 }, { id: 'flatHp', baseMin: 10, baseMax: 16 }],
      tags: ['방어', '회피'],
      spatial: { desc: '인접한 빈칸 1개당 회피 +10', effects: [{ stage: 'adjacency', when: { type: 'emptyAdj', per: true }, grant: [{ id: 'evasion', val: 10 }] }] } },
    { id: 'gb_glow_bark', name: '수정 수피', category: 'branch', shapeId: 'dot1', reqTier: 3,
      baseStats: [{ id: 'energyShield', baseMin: 14, baseMax: 24 }, { id: 'resAll', baseMin: 2, baseMax: 3 }],
      tags: ['방어', '보호막'],
      spatial: { desc: '서로 다른 종류와 인접할 때마다 에너지 보호막 +9', effects: [{ stage: 'adjacency', when: { type: 'adjOtherCategory', per: true }, grant: [{ id: 'energyShield', val: 9 }] }] } },
    { id: 'gb_root_wall', name: '뿌리 옹벽', category: 'branch', shapeId: 'dot1', reqTier: 4,
      baseStats: [{ id: 'armor', baseMin: 18, baseMax: 30 }, { id: 'flatHp', baseMin: 12, baseMax: 18 }, { id: 'regen', baseMin: 0.11, baseMax: 0.19 }],
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
      baseStats: [{ id: 'flatHp', baseMin: 14, baseMax: 20 }, { id: 'resF', baseMin: 3, baseMax: 6 }],
      tags: ['방어', '화염'],
      spatial: { desc: '모서리(두 외벽)에 놓이면 최대 생명력 +34', effects: [{ stage: 'wall', when: { type: 'corner' }, grant: [{ id: 'flatHp', val: 34 }] }] } },
    { id: 'gb_null_lattice', name: '무효 격자', category: 'branch', shapeId: 'dot1', reqTier: 9,
      baseStats: [{ id: 'energyShield', baseMin: 18, baseMax: 28 }, { id: 'resChaos', baseMin: 3, baseMax: 4 }],
      tags: ['방어', '보호막'],
      spatial: { desc: '빈칸이 정확히 하나인 행에 있으면 에너지 보호막 +18%', effects: [{ stage: 'rowcol', when: { type: 'rowOneEmpty' }, grant: [{ id: 'energyShieldPct', val: 18 }] }] } },
    { id: 'gb_pearl_knob', name: '진주 마디', category: 'branch', shapeId: 'dot1', reqTier: 2,
      baseStats: [{ id: 'flatHp', baseMin: 12, baseMax: 18 }, { id: 'resAll', baseMin: 2, baseMax: 3 }],
      tags: ['방어', '연결'],
      spatial: { desc: '다른 종류와 인접할 때마다 모든 저항 +2%', effects: [{ stage: 'adjacency', when: { type: 'adjOtherCategory', per: true }, grant: [{ id: 'resAll', val: 2 }] }] } },
    { id: 'gb_thorn_stud', name: '가시 못가지', category: 'branch', shapeId: 'dot1', reqTier: 4,
      baseStats: [{ id: 'armor', baseMin: 18, baseMax: 28 }, { id: 'flatHp', baseMin: 10, baseMax: 16 }],
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
      spatial: { desc: '2칸 거리에 꽃이 있으면 피해 +3%, 가지가 있으면 최대 생명력 +26', effects: [{ stage: 'complex', when: { type: 'atDistance', distance: 2, category: 'flower' }, grant: [{ id: 'pctDmg', val: 3 }] }, { stage: 'complex', when: { type: 'atDistance', distance: 2, category: 'branch' }, grant: [{ id: 'flatHp', val: 26 }] }] } },
    { id: 'gl_void_grain', name: '공허 낟알', category: 'leaf', shapeId: 'dot1', reqTier: 10,
      baseStats: [{ id: 'chaosPctDmg', baseMin: 1, baseMax: 2 }, { id: 'resChaos', baseMin: 2, baseMax: 4 }],
      tags: ['카오스'],
      spatial: { desc: '같은 열에 카오스 태그가 2개 이상이면 저항 관통 +4%', effects: [{ stage: 'rowcol', when: { type: 'colTagCount', tag: '카오스', min: 2 }, grant: [{ id: 'resPen', val: 4 }] }] } },
    { id: 'gl_summon_whorl', name: '군락 소용돌이잎', category: 'leaf', shapeId: 'dot1', reqTier: 11,
      baseStats: [{ id: 'summonPctDmg', baseMin: 1, baseMax: 2 }, { id: 'summonHpPct', baseMin: 3, baseMax: 4 }],
      tags: ['소환수'],
      spatial: { desc: '소환수 태그 아이템이 판 전체에 4개 이상이면 소환수 효율 +8%', effects: [{ stage: 'tags', when: { type: 'boardTagCount', tag: '소환수', min: 4 }, grant: [{ id: 'summonEfficiency', val: 8 }] }] } }
];

// ── 생장 고유 아이템 ─────────────────────────────────────────────────────
// uniqueEffectKey는 기존 combat.js 파이프라인에 이미 구현된 키를 재사용한다.
// growthEffectKey는 생장판 배치를 읽는 전용 핸들러다.
const GROWTH_UNIQUE_DB = [
    { name: '세계수의 심장', baseId: 'gf_sun_bloom', reqTier: 5,
      uniqueEffect: '5칸 이상 떨어진 꽃의 옵션 +25% (배치 기반)',
      uniqueEffectKey: null, growthEffectKey: 'worldTreeHeart',
      stats: [{ id: 'flatDmg', min: 6, max: 5 }, { id: 'pctHp', min: 4, max: 4 }, { id: 'aoePctDmg', min: 8, max: 6 }],
      tags: ['물리', '근접', '중심'] },
    { name: '요람 가지', baseId: 'gb_root_wall', reqTier: 6,
      uniqueEffect: '인접 아이템 1개당 받는 물리 피해 감소 +1%, 완전히 둘러싸이면 수호막 발동',
      uniqueEffectKey: 'dragonVeinGuard', uniqueEffectParams: { chance: 15, duration: 2, hpPct: 6 }, growthEffectKey: 'cradleBranch',
      stats: [{ id: 'flatHp', min: 22, max: 20 }, { id: 'regen', min: 0.3, max: 0.29 }, { id: 'resAll', min: 4, max: 4 }],
      tags: ['방어', '회복'] },
    { name: '공허 고리', baseId: 'gb_glow_bark', reqTier: 10,
      uniqueEffect: '주변 8칸 아이템의 옵션 +35% (자신은 제외)',
      uniqueEffectKey: null, growthEffectKey: 'voidRing',
      stats: [{ id: 'energyShield', min: 28, max: 26 }, { id: 'resChaos', min: 5, max: 5 }],
      tags: ['방어', '보호막', '고리'] },
    { name: '쌍둥이 홀씨', baseId: 'gl_echo_stem', reqTier: 10,
      uniqueEffect: '2칸 거리 아이템의 추가 옵션 효과를 20% 복사',
      uniqueEffectKey: null, growthEffectKey: 'twinSpore',
      stats: [{ id: 'pctDmg', min: 4, max: 4 }, { id: 'aspd', min: 2, max: 2 }],
      tags: ['연결', '메아리'] },
    { name: '삼원소 공명핵', baseId: 'gl_prism_petal', reqTier: 12,
      uniqueEffect: '판 위에 화염·냉기·번개 태그가 모두 있으면 원소 피해 +30%, 저항 관통 +6%',
      uniqueEffectKey: null, growthEffectKey: 'triElementCore',
      stats: [{ id: 'elementalPctDmg', min: 7, max: 6 }, { id: 'resAll', min: 4, max: 4 }],
      tags: ['원소', '변환'] },
    { name: '경계석 가지', baseId: 'gb_hearth_core', reqTier: 8,
      uniqueEffect: '닿은 외벽 면 1개당 모든 저항 +4%·받는 물리 피해 감소 +2%, 모서리 배치 시 생명력 +10%',
      uniqueEffectKey: null, growthEffectKey: 'boundaryStone',
      stats: [{ id: 'flatHp', min: 18, max: 16 }, { id: 'armor', min: 20, max: 18 }],
      tags: ['방어', '벽'] }
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
      type: 'colCategoryCountPer', category: 'branch', min: 3, grant: [{ id: 'blockChance', val: 1 }] }
];

safeExposeData({
    GROWTH_BOARD_W, GROWTH_BOARD_H, GROWTH_SHAPE_DB, GROWTH_CATEGORY_INFO,
    GROWTH_AFFIX_CAP, getGrowthCategoryAffixCap, GROWTH_UNLOCK_LOOP, GROWTH_UNLOCK_STAGES,
    GROWTH_LEVEL_STAT_PCT, GROWTH_LEVEL_CAP, GROWTH_SLAB_PATTERNS, GROWTH_SLAB_DB,
    GROWTH_SYNERGY_STAGES, GROWTH_BASE_DB, GROWTH_UNIQUE_DB,
    GROWTH_GLOBAL_SYNERGY_DB
});
