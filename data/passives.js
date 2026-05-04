function safeExposeData(map) {
  Object.keys(map || {}).forEach(function (key) {
    if (typeof window[key] === "undefined") window[key] = map[key];
  });
}

// Phase-1 extracted data block.
const GEM_SKY_ENHANCEMENTS = {
    sky_fury: { id: 'sky_fury', name: '폭풍 충전', desc: '스킬 피해 +8%', stat: 'pctDmg', val: 8 },
    sky_swiftness: { id: 'sky_swiftness', name: '질풍 각인', desc: '스킬 공격속도 +8%', stat: 'aspd', val: 8 },
    sky_precision: { id: 'sky_precision', name: '창공의 눈', desc: '스킬 치명타 확률 +6%', stat: 'crit', val: 6 },
    sky_blood: { id: 'sky_blood', name: '비상의 맥박', desc: '스킬 흡수 +0.6%', stat: 'leech', val: 0.6 },
    sky_tempest: { id: 'sky_tempest', name: '폭풍 분기', desc: '스킬 타겟 수 +1', stat: 'targets', val: 1 },
    sky_keen: { id: 'sky_keen', name: '예리한 파열', desc: '치명타 피해 배율 +25%', stat: 'critDmg', val: 25 },
    sky_blitz: { id: 'sky_blitz', name: '천공 붕괴', desc: '지속 피해 계열 스킬 피해 +18%', stat: 'dotMulti', val: 18 },
    sky_harmony: { id: 'sky_harmony', name: '창공의 조율', desc: '스킬 피해 +6%, 공격속도 +6%', stat: 'hybrid', val: 6 },
    sky_sunder: { id: 'sky_sunder', name: '갑주 분쇄', desc: '스킬의 물리 피해 감소 무시 +6%', stat: 'physIgnore', val: 6 },
    sky_pierce: { id: 'sky_pierce', name: '균열 투과', desc: '스킬의 저항 관통 +6%', stat: 'resPen', val: 6 }
};

const TALISMAN_SHAPES = {
    I: [[0, 0], [1, 0], [2, 0], [3, 0]],
    O: [[0, 0], [1, 0], [0, 1], [1, 1]],
    T: [[0, 0], [1, 0], [2, 0], [1, 1]],
    S: [[1, 0], [2, 0], [0, 1], [1, 1]],
    Z: [[0, 0], [1, 0], [1, 1], [2, 1]],
    J: [[0, 0], [0, 1], [1, 1], [2, 1]],
    L: [[2, 0], [0, 1], [1, 1], [2, 1]]
};

const TALISMAN_SHAPE_STYLE = {
    I: { color: '#7dd3fc', glow: 'rgba(125,211,252,0.28)', symbol: '▤' },
    O: { color: '#f9a8d4', glow: 'rgba(249,168,212,0.26)', symbol: '◼' },
    T: { color: '#c4b5fd', glow: 'rgba(196,181,253,0.26)', symbol: '✚' },
    S: { color: '#86efac', glow: 'rgba(134,239,172,0.24)', symbol: '⟍' },
    Z: { color: '#fca5a5', glow: 'rgba(252,165,165,0.24)', symbol: '⟋' },
    J: { color: '#93c5fd', glow: 'rgba(147,197,253,0.24)', symbol: '⌟' },
    L: { color: '#fdba74', glow: 'rgba(253,186,116,0.24)', symbol: '⌞' }
};

const TALISMAN_OPTION_POOL = [
    { stat: 'pctDmg', label: '피해 증가(%)', min: 6, max: 14, step: 1 },
    { stat: 'flatHp', label: '최대 생명력', min: 28, max: 75, step: 1 },
    { stat: 'crit', label: '치명타 확률(%)', min: 2, max: 8, step: 0.5 },
    { stat: 'aspd', label: '공격 속도(%)', min: 2, max: 8, step: 0.5 },
    { stat: 'resPen', label: '저항 관통(%)', min: 1, max: 5, step: 0.5 },
    { stat: 'dr', label: '물리 피해 감소(%)', min: 2, max: 7, step: 0.5 },
    { stat: 'pctHp', label: '생명력 증가(%)', min: 4, max: 12, step: 1 },
    { stat: 'move', label: '이동 속도(%)', min: 2, max: 8, step: 1 },
    { stat: 'dotPctDmg', label: '지속 피해 배율(%)', min: 4, max: 14, step: 1 },
    { stat: 'regenSuppress', label: '재생 억제(%)', min: 0.1, max: 0.1, step: 0.1 },
    { stat: 'minDmgRoll', label: '최소 피해 보정(%)', min: 1, max: 3, step: 1 },
    { stat: 'maxDmgRoll', label: '최대 피해 보정(%)', min: 1, max: 3, step: 1 }
];

const HERO_SELECTION_DEFS = {
    hero1: {
        id: 'hero1',
        label: '궁수',
        blindLabel: '궁수',
        talentsText: '투사체 피해 +18%, 공격 속도 +12%, 최소 대미지 보정 +10%',
        stats: [{ stat: 'projectilePctDmg', value: 18 }, { stat: 'aspd', value: 12 }, { stat: 'minDmgRoll', value: 10 }],
        strips: { idle: 'hero1Idle', walk: 'hero1Walk', attack: 'hero1Attack', hurt: 'hero1Hurt', death: 'hero1Death' }
    },
    hero2: {
        id: 'hero2',
        label: '전사',
        blindLabel: '전사',
        talentsText: '근접 피해 +20%, 최대 생명력 +10%, 최대 대미지 보정 +10%, 강타 피해 +18%',
        stats: [{ stat: 'meleePctDmg', value: 20 }, { stat: 'pctHp', value: 10 }, { stat: 'maxDmgRoll', value: 10 }, { stat: 'slamPctDmg', value: 18 }],
        strips: { idle: 'hero2Idle', walk: 'hero2Walk', attack: 'hero2Attack', hurt: 'hero2Hurt', death: 'hero2Death' }
    },
    hero3: {
        id: 'hero3',
        label: '드루이드',
        blindLabel: '드루이드',
        talentsText: '원소 피해 +22%, 생명력 재생 +1.2%, 모든 저항 +5%',
        stats: [{ stat: 'elementalPctDmg', value: 22 }, { stat: 'regen', value: 1.2 }, { stat: 'resF', value: 5 }, { stat: 'resC', value: 5 }, { stat: 'resL', value: 5 }, { stat: 'resChaos', value: 5 }],
        strips: { idle: 'hero3Idle', walk: 'hero3Walk', attack: 'hero3Attack', hurt: 'hero3Hurt', death: 'hero3Death' }
    },
    hero4: {
        id: 'hero4',
        label: '블레이드',
        blindLabel: '블레이드',
        talentsText: '카오스 피해 +20%, 흡혈 +0.2%, 이동 속도 +12%, 치명타 피해 +20%, 치명타 확률 +2.5%',
        stats: [{ stat: 'chaosPctDmg', value: 20 }, { stat: 'leech', value: 0.2 }, { stat: 'move', value: 12 }, { stat: 'critDmg', value: 20 }, { stat: 'crit', value: 2.5 }],
        strips: { idle: 'hero4Idle', walk: 'hero4Walk', attack: 'hero4Attack', hurt: 'hero4Hurt', death: 'hero4Death' }
    }
};

const PASSIVE_TREE = { nodes: {}, edges: [] };

const PASSIVE_TARGET_NODES = 1200;

const PASSIVE_DISCOVERY_RADIUS = 155;

const PASSIVE_ROOT_DISCOVERY_EDGE_DEPTH = 1;

const PASSIVE_DISCOVERY_EDGE_DEPTH = 1;

const PASSIVE_PREVIEW_RADIUS = 105;

const PASSIVE_PREVIEW_EDGE_DEPTH = 1;

const PASSIVE_THEME_POOLS = {
    center: ['flatHp', 'flatDmg', 'pctDmg', 'crit', 'aspd', 'move', 'regen', 'pctHp'],
    templar: ['energyShield', 'energyShieldPct', 'pctHp', 'regen', 'resAll', 'aoePctDmg'],
    witch: ['energyShield', 'energyShieldPct', 'pctHp', 'crit', 'dotPctDmg', 'gemLevel'],
    shadow: ['evasion', 'evasionPct', 'pctHp', 'move', 'crit', 'projectilePctDmg'],
    ranger: ['evasion', 'evasionPct', 'pctHp', 'aspd', 'projectilePctDmg', 'coldPctDmg'],
    duelist: ['armor', 'armorPct', 'pctHp', 'aspd', 'meleePctDmg', 'physPctDmg'],
    marauder: ['armor', 'armorPct', 'pctHp', 'dr', 'regen', 'physPctDmg']
};

const PASSIVE_SECTOR_TITLES = {
    templar: '성직자의 회랑',
    witch: '마녀의 장막',
    shadow: '암영의 굴절',
    ranger: '유격수의 길',
    duelist: '결투가의 원',
    marauder: '전사의 틈'
};

const PASSIVE_STYLE = {
    bg: '#05070b',
    bg2: '#0c1017',
    gold: '#d6b36a',
    goldBright: '#f5dfad',
    bronze: '#8a6335',
    steel: '#7e95a8',
    steelDim: '#31404d',
    inactiveFill: '#11161d',
    hiddenFill: '#0a0d12',
    reachableGlow: 'rgba(120,170,205,0.22)',
    activeGlow: 'rgba(245,223,173,0.34)',
    previewGlow: 'rgba(111,149,173,0.16)',
    fog: 'rgba(2,3,6,0.18)'
};

const PASSIVE_CORE_GENERIC_STATS = ['flatHp', 'flatDmg', 'pctDmg', 'aspd', 'move', 'crit', 'regen', 'pctHp'];

const PASSIVE_STAR_BLESSING = { flatHp: 140, pctDmg: 24, move: 10 };

const PASSIVE_APEX_CONFIGS = [
    {
        title: '별끝의 심장',
        stat: 'flatHp',
        val: 60,
        desc: '가장 바깥 성좌의 생명력을 끌어와 몸체를 두텁게 만듭니다.',
        outerNodes: [
            { title: '심핵의 외연', stat: 'pctHp', val: 8, kind: 'evolved', desc: '바깥 별무리가 생명력 비율을 키워 줍니다.' },
            { title: '불멸의 맥', stat: 'regen', val: 1.2, kind: 'evolved', desc: '성좌가 서서히 몸을 회복시킵니다.' },
            { title: '초신성의 심장', stat: 'flatHp', val: 120, kind: 'transcendent', desc: '각성 후 가장 단단한 별핵입니다.' }
        ]
    },
    {
        title: '별끝의 불꽃',
        stat: 'pctDmg',
        val: 36,
        desc: '순수한 전투 의지를 불러내 전반적인 화력을 끌어올립니다.',
        outerNodes: [
            { title: '쇄도의 편린', stat: 'pctDmg', val: 20, kind: 'evolved', desc: '공격 전체를 더 날카롭게 밀어 올립니다.' },
            { title: '격돌의 잔광', stat: 'flatDmg', val: 24, kind: 'evolved', desc: '기초 타격 자체를 무겁게 만듭니다.' },
            { title: '초신성의 불꽃', stat: 'critDmg', val: 35, kind: 'transcendent', desc: '치명타가 폭발적으로 강해집니다.' }
        ]
    },
    {
        title: '별끝의 바람',
        stat: 'aspd',
        val: 8,
        desc: '움직임과 공격 템포를 함께 날렵하게 바꿉니다.',
        outerNodes: [
            { title: '가속의 갈래', stat: 'aspd', val: 12, kind: 'evolved', desc: '별빛이 손끝의 리듬을 끌어올립니다.' },
            { title: '유성의 꼬리', stat: 'move', val: 10, kind: 'evolved', desc: '탐험 속도와 전장 이동이 가벼워집니다.' },
            { title: '초신성의 바람', stat: 'crit', val: 8, kind: 'transcendent', desc: '민첩함이 정밀한 치명타로 이어집니다.' }
        ]
    },
    {
        title: '별끝의 갑주',
        stat: 'resAll',
        val: 10,
        desc: '원소 폭풍을 견디는 외곽 성벽을 형성합니다.',
        outerNodes: [
            { title: '수호의 편광', stat: 'resAll', val: 10, kind: 'evolved', desc: '세 가지 원소 저항을 함께 단단하게 다집니다.' },
            { title: '철성의 궤도', stat: 'dr', val: 8, kind: 'evolved', desc: '별무리가 받는 충격을 흩어 놓습니다.' },
            { title: '초신성의 갑주', stat: 'resChaos', val: 10, kind: 'transcendent', desc: '깊은 공허까지 버티는 외피가 형성됩니다.' }
        ]
    },
    {
        title: '별끝의 통찰',
        stat: 'crit',
        val: 6,
        desc: '성좌의 흐름을 읽어 전투와 젬 운용을 정교하게 다듬습니다.',
        outerNodes: [
            { title: '공명의 실마리', stat: 'suppCap', val: 1, kind: 'evolved', desc: '보조 젬 배치 한도를 넓혀 줍니다.' },
            { title: '천구의 음영', stat: 'gemLevel', val: 1, kind: 'evolved', desc: '장착한 스킬 젬의 힘을 더 끌어냅니다.' },
            { title: '초신성의 통찰', stat: 'critDmg', val: 28, kind: 'transcendent', desc: '정교함이 강력한 치명 일격으로 완성됩니다.' }
        ]
    }
];

const PASSIVE_SPECIAL_NODE_CONFIGS = [
    { sector: 'marauder', kinds: ['deadend', 'major', 'keystone'], stat: 'physIgnore', val: 6, title: '갑주 분쇄', desc: '물리 타격이 적의 갑주를 무너뜨려 물리 피해 감소를 무시합니다.' },
    { sector: 'duelist', kinds: ['deadend', 'major', 'keystone'], stat: 'physIgnore', val: 5, title: '전장 파열', desc: '정교한 베기가 적의 물리 보호막을 찢어 냅니다.' },
    { sector: 'shadow', kinds: ['deadend', 'major', 'keystone'], stat: 'physIgnore', val: 4, title: '암전 절개', desc: '그림자 속 일격이 단단한 방어도 틈을 내어 통과합니다.' },
    { sector: 'templar', kinds: ['deadend', 'major', 'keystone'], stat: 'resPen', val: 5, title: '성흔 균열', desc: '성광의 균열이 적의 저항을 뚫고 더 깊은 상처를 남깁니다.' },
    { sector: 'witch', kinds: ['deadend', 'major', 'keystone'], stat: 'resPen', val: 6, title: '원소 침식', desc: '원소 마력이 적의 저항을 마모시켜 음수 영역까지 끌어내립니다.' },
    { sector: 'ranger', kinds: ['deadend', 'major', 'keystone'], stat: 'resPen', val: 5, title: '관통 탄도', desc: '날카로운 궤적이 원소와 독의 장벽을 그대로 꿰뚫습니다.' },
    { sector: 'templar', kinds: ['deadend'], stat: 'regenSuppress', val: 0.5, title: '활력 봉쇄', desc: '공격이 적의 생명력 재생을 누적 억제합니다.' },
    { sector: 'witch', kinds: ['deadend'], stat: 'regenSuppress', val: 0.5, title: '부패 인장', desc: '저주받은 흔적이 적의 재생 능력을 잠급니다.' },
    { sector: 'shadow', kinds: ['deadend'], stat: 'regenSuppress', val: 0.5, title: '암영 구속', desc: '은밀한 일격이 상처 재생을 가로막습니다.' },
    { sector: 'duelist', kinds: ['deadend'], stat: 'regenSuppress', val: 0.5, title: '결투의 속박', desc: '연속 베기로 적의 회복 루프를 끊어냅니다.' },
    { sector: 'marauder', kinds: ['deadend'], stat: 'regenSuppress', val: 0.5, title: '절맥 강타', desc: '강한 충격이 적의 회복 혈류를 억제합니다.' },
    { sector: 'duelist', kinds: ['major', 'keystone'], stat: 'minDmgRoll', val: 4, title: '하한 제압', desc: '연속 교전에서도 피해 하한을 안정적으로 유지합니다.' },
    { sector: 'marauder', kinds: ['major', 'keystone'], stat: 'maxDmgRoll', val: 4, title: '상한 폭발', desc: '강타의 최고 피해를 끌어올립니다.' }
];

safeExposeData({ GEM_SKY_ENHANCEMENTS, TALISMAN_SHAPES, TALISMAN_SHAPE_STYLE, TALISMAN_OPTION_POOL, HERO_SELECTION_DEFS, PASSIVE_TREE, PASSIVE_TARGET_NODES, PASSIVE_DISCOVERY_RADIUS, PASSIVE_ROOT_DISCOVERY_EDGE_DEPTH, PASSIVE_DISCOVERY_EDGE_DEPTH, PASSIVE_PREVIEW_RADIUS, PASSIVE_PREVIEW_EDGE_DEPTH, PASSIVE_THEME_POOLS, PASSIVE_SECTOR_TITLES, PASSIVE_STYLE, PASSIVE_CORE_GENERIC_STATS, PASSIVE_STAR_BLESSING, PASSIVE_APEX_CONFIGS, PASSIVE_SPECIAL_NODE_CONFIGS });
