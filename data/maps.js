if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/maps.js');

// Phase-1 extracted map/season/journal data.
const STORY_ACTS = [
    { id: 'root_tip_sanctuary', order: 1, displayAct: '1', title: '뿌리끝 성소', subtitle: '썩은 잔뿌리를 베며 중간계로 돌아갈 길을 연다.', description: '뿌리없는 자는 뿌리끝의 드루이드에게 거두어져 뿌리길을 되살릴 사냥을 시작한다.', areaTheme: '축축한 뿌리, 곰팡이, 죽은 수액, 지하 성소', bossId: 'rotten_mane_rootlet', bossName: '썩은갈기의 잔뿌리', clearText: '썩은 잔뿌리가 잘려나가자, 오래 막혀 있던 뿌리길이 다시 열린다.', unlockText: '뿌리길의 봉인이 열리며 가지치기의 중정이 드러난다.', specialType: 'normal', tier: 1, maxKills: 1, ele: 'phys' },
    { id: 'pruning_courtyard_fall', order: 2, displayAct: '2', title: '가지치기의 중정', subtitle: '불멸의 정원사 앞에서 패배가 담금질로 기록된다.', description: '중간계로 돌아온 뿌리없는 자는 정원사의 불멸성 앞에 패배하고 다시 추방된다.', areaTheme: '정돈된 중정, 냉혹한 가위, 추방의 의식', bossId: 'gardener_immortal', bossName: '정원사', clearText: '정원사의 가위는 뿌리없는 자를 다시 뿌리끝으로 떨어뜨렸다. 그러나 절단의 개념은 조금 더 차가워졌다.', unlockText: '이 패배는 담금질로 기록된다. 허공뿌리로 향하는 길이 열린다.', specialType: 'normal', tier: 2, maxKills: 1, ele: 'fire' },
    { id: 'suspended_aerial_roots', order: 3, displayAct: '3', title: '허공뿌리 현수림', subtitle: '굶주림의 지배자를 벨수록 정원사의 불멸성에 균열이 간다.', description: '공기뿌리 세계에서 기근의 맹수를 처치해 정원사의 권능을 약화시킨다.', areaTheme: '허공에 매달린 뿌리, 굶주림, 바람, 추락감', bossId: 'famine_beast', bossName: '기근의 맹수', clearText: '허공뿌리의 굶주림이 끊어지자, 정원사의 불멸성에 첫 균열이 생겼다.', unlockText: '갈림뿌리 미궁으로 이어지는 분기점이 열린다.', specialType: 'normal', tier: 2, maxKills: 1, ele: 'cold' },
    { id: 'forked_root_maze', order: 4, displayAct: '4', title: '갈림뿌리 미궁', subtitle: '끝없이 갈라지는 곁뿌리 미궁을 돌파한다.', description: '갈림길마다 분기하는 뿌리 속에서 측근의 기사를 추적해 처치한다.', areaTheme: '분기하는 길, 미궁, 가지처럼 갈라지는 뿌리', bossId: 'retainer_knight', bossName: '측근의 기사', clearText: '갈림뿌리의 길목이 무너지며 측근의 기사는 침묵했다.', unlockText: '지주근의 침묵 성소가 열린다.', specialType: 'normal', tier: 3, maxKills: 2, ele: 'light' },
    { id: 'taproot_silent_sanctum', order: 5, displayAct: '5', title: '지주근의 침묵 성소', subtitle: '드루이드의 배신과 뿌리없는 자의 기원을 확인한다.', description: '지주근의 드루이드를 쓰러뜨리며 뿌리없는 자가 절단의 개념임을 드러낸다.', areaTheme: '침묵, 거대한 받침뿌리, 배신, 성소의 붕괴', bossId: 'taproot_druid', bossName: '지주근의 드루이드', clearText: '드루이드는 죽기 직전 깨달았다. 뿌리없는 자는 생명이 아니라, 아직 벼려지지 않은 절단이었다.', unlockText: '불멸이 벗겨진 정원사에게 다시 도전할 수 있다.', specialType: 'normal', tier: 4, maxKills: 1, ele: 'fire' },
    { id: 'pruning_courtyard_revenge', order: 6, displayAct: '6', title: '가지치기의 중정', subtitle: '이번에는 정원사의 불멸성이 사라졌다.', description: '같은 이름의 정원사지만 이번에는 처치 가능한 결전이다.', areaTheme: '무너진 중정, 깨진 가위, 복수의 결투', bossId: 'gardener_mortal', bossName: '정원사', clearText: '이번에는 가위가 부러졌다. 정원사의 질서는 뿌리없는 칼날 앞에서 무너졌다.', unlockText: '말라가는 큰 줄기의 경고가 시작된다.', specialType: 'normal', tier: 4, maxKills: 1, ele: 'cold' },
    { id: 'withering_great_trunk', order: 7, displayAct: '7', title: '말라가는 큰 줄기', subtitle: '뿌리가 꺾이자 줄기가 먼저 비명을 올린다.', description: '줄기의 전령을 쓰러뜨리고 수관 이변의 근본 원인을 추적한다.', areaTheme: '말라가는 수액, 갈라진 줄기, 위쪽에서 내려오는 경고', bossId: 'trunk_herald', bossName: '줄기의 전령', clearText: '전령은 무너지는 줄기 위에서 말했다. ‘뿌리를 벤 것은 너지만, 나무를 버린 것은 수관이다.’', unlockText: '끝없는 장막의 줄기로 향하는 문이 열린다.', specialType: 'normal', tier: 5, maxKills: 1, ele: 'light' },
    { id: 'endless_veil_trunk', order: 8, displayAct: '8', title: '끝없는 장막의 줄기', subtitle: '반복되는 장막 속에서 루프의 기시감이 짙어진다.', description: '끝없는 줄기의 순례자를 처치하며 반복의 흔적을 맞닥뜨린다.', areaTheme: '반복되는 장막, 죽은 수액, 데자뷰, 루프 암시', bossId: 'endless_pilgrim', bossName: '끝없는 줄기의 순례자', clearText: '순례자는 뿌리없는 자를 처음 본 듯, 또 오래 기다린 듯 바라보았다.', unlockText: '비탄의 교차가 모습을 드러낸다.', specialType: 'normal', tier: 5, maxKills: 1, ele: 'chaos' },
    { id: 'crossroad_of_lament', order: 9, displayAct: '9', title: '비탄의 교차', subtitle: '삽목들의 생존 본능이 수관을 비극으로 가른다.', description: '울부짖는 교차의 성가대를 처치하며 수관 진입부를 돌파한다.', areaTheme: '가지들의 충돌, 생존 본능, 비극적 합창, 수관 입구', bossId: 'wailing_chorus', bossName: '울부짖는 교차의 성가대', clearText: '성가대의 울음은 배신의 노래가 아니었다. 그것은 살아남으려는 가지들의 기도였다.', unlockText: '합일의 차륜으로 올라갈 길이 열린다.', specialType: 'normal', tier: 6, maxKills: 1, ele: 'chaos' },
    { id: 'wheel_of_unity', order: 10, displayAct: '10', title: '합일의 차륜', subtitle: '아홉 삽목의 의지가 하나의 왕관으로 응집한다.', description: '합일의 왕관을 쓰러뜨리지만 세계수는 이미 말라가고 있다.', areaTheme: '최상층 수관, 아홉 삽목의 합체, 새 세계 직전', bossId: 'crown_of_unity', bossName: '합일의 왕관', clearText: '왕관은 부서졌다. 그러나 말라버린 세계수는 더 이상 스스로를 지탱하지 못했다.', unlockText: '혼돈 층계로 내려갈 길이 열린다.', specialType: 'normal', tier: 7, maxKills: 1, ele: 'chaos' }
];

const WORLD_MAP_HOTSPOTS = [
    { zoneId: 0, x: 18, y: 70 },
    { zoneId: 1, x: 30, y: 61 },
    { zoneId: 2, x: 39, y: 50 },
    { zoneId: 3, x: 48, y: 44 },
    { zoneId: 4, x: 59, y: 42 },
    { zoneId: 5, x: 68, y: 48 },
    { zoneId: 6, x: 74, y: 56 },
    { zoneId: 7, x: 80, y: 47 },
    { zoneId: 8, x: 87, y: 39 },
    { zoneId: 9, x: 91, y: 30 },
    { zoneId: 10, x: 94, y: 22 }
];

const TRIAL_ZONES = [
    { id: 'trial_1', name: "1차 전직 시련", type: "trial", tier: 3, maxKills: 1, reqZone: 3, fixedDifficultyMul: 1 },
    { id: 'trial_2', name: "2차 전직 시련", type: "trial", tier: 6, maxKills: 1, reqZone: 8, fixedDifficultyMul: 1 },
    { id: 'trial_3', name: "3차 전직 시련 (여신)", type: "trial", tier: 15, maxKills: 1, reqZone: -1, key: 'trialKey3', fixedDifficultyMul: 1 },
    { id: 'trial_4', name: "4차 전직 미궁 시련", type: "trial", tier: 20, maxKills: 1, reqZone: -1, key: 'trialKey3', fixedDifficultyMul: 1 },
    { id: 'trial_5', name: "혹독한 겨울의 미궁 (재능 개화)", type: "trial", tier: 30, maxKills: 1, reqZone: -1, bloomTrial: true, bloomTrialAffixFloor: 10, underworldPenaltyFloor: 10, trapRegenSuppressPct: 3, fixedDifficultyMul: 1 }
];

const METEOR_FALL_ZONE_ID = 'meteor_fall_site';

const MAX_STAR_WEDGES = 3;

const MAX_STAR_WEDGES_HARD_CAP = 8;

const STAR_WEDGE_RADIUS = 3;

const STAR_WEDGE_UNLOCK_LOOP = 7;

const STAR_WEDGE_UNLOCK_ACT = 7;

const OCEAN_UNLOCK_LOOP = 11;

const OCEAN_ZONE_ID = 'ocean_depth';

// 루프 조건 상한·세분화 (state.js: getSeasonAbyssDepthCap / hasCurrentLoopAbyssRequirementClear):
//  - 요구 혼돈 심도는 루프 30(심화 40) 이후에도 기존처럼 루프당 1층씩 증가한다.
//  - 루프 31+에서는 에니프론 행성을 이번 루프에 돌파하면 우주계 루프를 선택할 수 있다.
const LOOP_GATE_ABYSS_DEPTH_CAP = 40;
const LOOP_GATE_ALT_START_SEASON = 31;
const LOOP_GATE_ALT_COSMOS_PLANET_ID = 'planet-45';
const LOOP_GATE_ALT_COSMOS_PLANET_NAME = '에니프론';

// 스토리 액트(매 루프 레벨 1부터 다시 지나는 재성장 구간)의 루프 스케일 상한.
// 이 루프 수까지만 세지고 이후 고정된다 (combat.js: getLoopDifficultyInputs).
const ACT_LOOP_SCALE_CAP = 20;

// 시간의 균열 (루프 13+): 과거에 심고, 미래에 거둔다 — 고유+희귀 융합 던전.
//  - 과거 클리어 → 제단 개방 → 같은 부위의 고유 1개·희귀 1개를 올림 → 미래 클리어 → 융합 유물 획득.
//  - 시간압(1~10)이 난이도이자 보상 손잡이: 높을수록 몬스터가 강해지고 '완벽한 융합' 확률이 오른다.
//  - 융합 유물은 신성한/타락/축복의 오브 외의 제작 재화를 받지 않는다.
const TIME_RIFT_UNLOCK_LOOP = 13;
const TIME_RIFT_PAST_ZONE_ID = 'time_rift_past';
const TIME_RIFT_FUTURE_ZONE_ID = 'time_rift_future';
const TIME_RIFT_MAX_PRESSURE = 10;
// 시간압별 혼돈 환산 깊이. 초반은 약 5단계씩 오르며, 9→10은 의도적으로 큰 벽이다.
const TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS = Object.freeze([1, 6, 11, 16, 22, 29, 37, 47, 62, 90]);
// 완벽(유실 0) = perfectBase + perfectPerPressure×(시간압-1) — 기본은 매우 낮게.
// 불안정(유실 2) = max(unstableMin, unstableBase - unstablePerPressure×(시간압-1)). 나머지는 보통(유실 1).
const TIME_RIFT_FUSION_ODDS = { perfectBase: 0.03, perfectPerPressure: 0.045, unstableBase: 0.42, unstablePerPressure: 0.035, unstableMin: 0.08 };

const STAR_WEDGE_OPTION_POOL = [
    { stat: 'pctDmg', min: 10, max: 16 },
    { stat: 'flatHp', min: 56, max: 96 },
    { stat: 'aspd', min: 4, max: 8 },
    { stat: 'crit', min: 2, max: 9 },
    { stat: 'critDmg', min: 16, max: 28 },
    { stat: 'dr', min: 3, max: 7 },
    { stat: 'move', min: 4, max: 9 },
    { stat: 'physIgnore', min: 4, max: 8 },
    { stat: 'resPen', min: 4, max: 8 },
    { stat: 'regen', min: 0.6, max: 1.2, step: 0.1 },
    { stat: 'chaosPctDmg', min: 10, max: 18 },
    { stat: 'resF', min: 6, max: 14 },
    { stat: 'resC', min: 6, max: 14 },
    { stat: 'resL', min: 6, max: 14 },
    { stat: 'resChaos', min: 3, max: 7 },
    { stat: 'armorPct', min: 10, max: 18 },
    { stat: 'evasionPct', min: 10, max: 18 },
    { stat: 'energyShieldPct', min: 10, max: 18 },
    { stat: 'maxResF', min: 1, max: 1 },
    { stat: 'maxResC', min: 1, max: 1 },
    { stat: 'maxResL', min: 1, max: 1 }
];

const STAR_WEDGE_CORE_OPTION_POOL = [
    { stat: 'flatDmg', min: 16, max: 32 },
    { stat: 'pctHp', min: 9, max: 16 },
    { stat: 'elementalPctDmg', min: 14, max: 24 },
    { stat: 'physPctDmg', min: 14, max: 24 },
    { stat: 'projectilePctDmg', min: 14, max: 24 },
    { stat: 'meleePctDmg', min: 14, max: 24 },
    { stat: 'dotPctDmg', min: 14, max: 24 },
    { stat: 'resAll', min: 4, max: 7 },
    { stat: 'ds', min: 8, max: 14 },
    { stat: 'minDmgRoll', min: 5, max: 9 },
    { stat: 'maxDmgRoll', min: 7, max: 12 },
    { stat: 'energyShieldPct', min: 14, max: 21 },
    { stat: 'armorPct', min: 14, max: 21 },
    { stat: 'evasionPct', min: 14, max: 21 }
];

const SEASON_CONTENT_ROADMAP = {
    1: { title: '루프 1', features: ['시작: 기본 전투/장비/지도'] },
    2: { title: '루프 2', features: ['해금: 홀씨 제작'] },
    3: { title: '루프 3', features: ['해금: 고대 미궁(화석)'] },
    4: { title: '루프 4', features: ['해금: 창공 강화'] },
    5: { title: '루프 5', features: ['해금: 루프 패시브 확장 + 주얼'] },
    6: { title: '루프 6', features: ['해금: 부적 시스템'] },
    7: { title: '루프 7', features: ['해금: 별쐐기 / 운석 낙하 지점'] },
    8: { title: '루프 8', features: ['해금: 벌집'] },
    9: { title: '루프 9', features: ['해금: 균열'] },
    10: { title: '루프 10', features: ['해금: 심화 혼돈'] },
    11: { title: '루프 11', features: ['심화: 혼돈 단계 상승'] },
    12: { title: '루프 12', features: ['심화: 혼돈 단계 상승'] },
    13: { title: '루프 13', features: ['해금: 시간의 균열 (융합 제단)', '심화: 혼돈 단계 상승'] },
    14: { title: '루프 14', features: ['심화: 혼돈 단계 상승'] },
    15: { title: '루프 15', features: ['심화: 혼돈 단계 상승'] },
    16: { title: '루프 16', features: ['심화: 혼돈 단계 상승'] },
    17: { title: '루프 17', features: ['심화: 혼돈 단계 상승'] },
    18: { title: '루프 18', features: ['심화: 혼돈 단계 상승'] },
    19: { title: '루프 19', features: ['심화: 혼돈 단계 상승'] },
    20: { title: '루프 20', features: ['종착: 혼돈 20 루프'] }
};

const SEASON_BOSS_ZONES = [
    { id: 's2_boss_flame', name: '화염 군주 이그니스', type: 'seasonBoss', tier: 12, key: 'bossKeyFlame', reqSeason: 2, ele: 'fire', reward: 'bossCore' },
    { id: 's2_boss_frost', name: '서리 여제 글라시아', type: 'seasonBoss', tier: 12, key: 'bossKeyFrost', reqSeason: 2, ele: 'cold', reward: 'bossCore' },
    { id: 's2_boss_storm', name: '폭풍 군단장 볼타', type: 'seasonBoss', tier: 13, key: 'bossKeyStorm', reqSeason: 2, ele: 'light', reward: 'bossCore' },
    { id: 's6_beast_cerberus', name: '야수왕 케르베로스', type: 'seasonBoss', tier: 18, key: 'beastKeyCerberus', reqSeason: 6, ele: 'chaos', reward: 'bossCore' },
    // 버려진 날붙이들 (루프 31+): 나무꾼이 벼리다 버린 다른 날들. 플레이어(첫 번째 날붙이)를 시험하러 온다.
    //  - 매 루프 다시 도전하는 고정 난이도 결투(loopScaleExempt) — 난이도는 fixedDifficultyMul·bossMods로만 조절한다.
    //  - bossMods shape는 createEnemy의 cosmosMods와 동일: *Mul(hp/damage/attackSpeed/armor/evasion/regen)은 배율, 나머지는 가산.
    //  - 다섯 날을 한 루프 안에 모두 꺾으면 「완성작」이 모습을 드러낸다 (requiresRivals).
    { id: 'rival_overheat', name: '버려진 두 번째 날 「과열」', type: 'seasonBoss', tier: 30, key: 'rivalKey', reqSeason: 31, ele: 'fire', reward: 'goldenRule', journalId: 'rival_overheat', rivalBlade: true, loopScaleExempt: true, fixedDifficultyMul: 2.2,
      bossMods: { hpMul: 0.75, damageMul: 1.3, attackSpeedMul: 1.3, critChanceBonus: 14, patternMode: 'burst', traitName: '과열 — 먼저 베지 못하면 먼저 베인다' } },
    { id: 'rival_dull', name: '버려진 세 번째 날 「무딤」', type: 'seasonBoss', tier: 30, key: 'rivalKey', reqSeason: 31, ele: 'cold', reward: 'goldenRule', journalId: 'rival_dull', rivalBlade: true, loopScaleExempt: true, fixedDifficultyMul: 2.2,
      bossMods: { hpMul: 1.5, damageMul: 1.1, attackSpeedMul: 0.78, dr: 12, resAll: 12, armorMul: 1.6, firstHitGuard: 0.3, patternMode: 'slam', traitName: '무딤 — 부러지지 않는 것이 전부였던 날' } },
    { id: 'rival_glutton', name: '버려진 네 번째 날 「탐식」', type: 'seasonBoss', tier: 30, key: 'rivalKey', reqSeason: 31, ele: 'chaos', reward: 'goldenRule', journalId: 'rival_glutton', rivalBlade: true, loopScaleExempt: true, fixedDifficultyMul: 2.2,
      bossMods: { hpMul: 1.25, regenMul: 8, resChaos: 20, ailmentChanceBonus: 0.1, patternMode: 'ramp', traitName: '탐식 — 상처를 먹고 아무는 날' } },
    { id: 'rival_afterimage', name: '버려진 다섯 번째 날 「잔영」', type: 'seasonBoss', tier: 30, key: 'rivalKey', reqSeason: 31, ele: 'light', reward: 'goldenRule', journalId: 'rival_afterimage', rivalBlade: true, loopScaleExempt: true, fixedDifficultyMul: 2.2,
      bossMods: { hpMul: 0.85, attackSpeedMul: 1.18, evasionMul: 1.7, critChanceBonus: 8, firstHitGuard: 0.15, patternMode: 'burst', traitName: '잔영 — 스치는 것조차 허락하지 않는 날' } },
    { id: 'rival_backedge', name: '버려진 여섯 번째 날 「역린」', type: 'seasonBoss', tier: 30, key: 'rivalKey', reqSeason: 31, ele: 'phys', reward: 'goldenRule', journalId: 'rival_backedge', rivalBlade: true, loopScaleExempt: true, fixedDifficultyMul: 2.2,
      bossMods: { hpMul: 1.1, damageMul: 1.2, penetration: 12, dr: 8, resAll: 8, armorMul: 1.25, patternMode: 'slam', traitName: '역린 — 방어를 거꾸로 베는 날' } },
    { id: 'rival_masterwork', name: '일곱 번째 날 「완성작」', type: 'seasonBoss', tier: 32, key: 'rivalKey', reqSeason: 31, ele: 'chaos', reward: 'woodsmanTouch', journalId: 'rival_masterwork', rivalBlade: true, capstoneRival: true, loopScaleExempt: true, fixedDifficultyMul: 3.2,
      requiresRivals: ['rival_overheat', 'rival_dull', 'rival_glutton', 'rival_afterimage', 'rival_backedge'],
      bossMods: { hpMul: 1.9, damageMul: 1.35, attackSpeedMul: 1.12, critChanceBonus: 10, dr: 10, resAll: 10, regenMul: 3, penetration: 8, firstHitGuard: 0.25, patternMode: 'ramp', traitName: '완성작 — 여섯 날의 모든 것' } },
    // 잔향체 아스트라 (루프 31+): 우주계 5개 은하의 보스(하말리스/디프다르/주베누비아/주벤샤말/에니프론)를
    // 같은 루프 안에 모두 격파해야 모습을 드러내는 우주계의 최종 관문. 다섯 보스의 정체성을 번갈아 두르며 싸운다.
    { id: 'cosmos_astra', name: '잔향체 아스트라', type: 'seasonBoss', tier: 34, key: 'cosmosSovereignKey', reqSeason: 31, ele: 'chaos', reward: 'goldenRule', journalId: 'cosmos_astra', cosmosCapstone: true, loopScaleExempt: true, fixedDifficultyMul: 3.6,
      requiresCosmosBosses: ['planet-45', 'planet-46', 'planet-47', 'planet-48', 'planet-49'],
      bossMods: { hpMul: 1.6, damageMul: 1.3, attackSpeedMul: 1.1, dr: 10, resAll: 12, armorMul: 1.35, evasionMul: 1.25, regenMul: 2, penetration: 10, critChanceBonus: 12, firstHitGuard: 0.28, patternMode: 'ramp', traitName: '잔향 — 다섯 별의 마지막 메아리' } }
];

const LABYRINTH_ZONE_ID = 'labyrinth_endless';

const JOURNAL_DB = {
    prologue: { title: '프롤로그 - 정원사의 판단', lines: ['“이 나무에 뿌리내리지 못한 것은 열매가 될 수 없다.”', '“너는 가지가 아니다. 잎도, 씨앗도, 벌레도 아니다.”', '“그렇다면 남은 이름은 하나뿐이다. 밑거름.”'] },
    act_1: { title: '액트 1 - 뿌리의 드루이드', lines: ['“뿌리가 없다는 건 저주가 아니다.”', '“어쩌면 이 세계에서 가장 자유로운 형벌이지.”', '“중간계로 돌아가고 싶다면, 썩은 잔뿌리들을 베어라.”', '“길은 언제나 상처를 따라 열린다.”'], bonus: { stat: 'flatHp', value: 5, label: '최대 생명력 +5' } },
    act_2: { title: '액트 2 - 정원사의 불멸', lines: ['“나는 내가 살아 있는 것이 아니다.”', '“가지들이 나를 살린다.”', '“나를 베고 싶다면, 먼저 이 나무가 나를 잊게 만들어라.”'], bonus: { stat: 'flatDmg', value: 1, label: '기본 피해 +1' } },
    act_3: { title: '액트 3 - 드루이드의 경고', lines: ['“널 추방한 자가 정원사라면, 그는 나뭇가지들의 호혜를 받고 있다.”', '“기근의 뿌리를 끊으면 정원사에게 닿는 호혜도 함께 마를 것이다.”'], bonus: { stat: 'aspd', value: 1, label: '공격 속도 +1%' } },
    act_4: { title: '액트 4 (4-1/4-2) - 갈림과 축적', lines: ['“네가 돌아갈 곳은 없다.”', '“그는 너를 길렀다고? 아니다. 그는 너를 벼렸다.”'], bonus: { stat: 'move', value: 2, label: '이동 속도 +2%' } },
    act_5: { title: '액트 5 - 지주근의 진실', lines: ['“나는 이 나무를 버틴 자다.”', '“너는… 베는 자의 조각이다.”', '“나무꾼의 손에서 빠진, 첫 번째 날붙이였구나.”'], bonus: { stat: 'flatHp', value: 8, label: '최대 생명력 +8' } },
    act_6: { title: '액트 6 - 정원사의 붕괴', lines: ['“왜 가지들이 대답하지 않지?”', '“왜 내 상처가 닫히지 않는 거지?”', '“너는 대체 무엇이냐.”'], bonus: { stat: 'pctDmg', value: 1, label: '피해 +1%' } },
    act_7: { title: '액트 7 - 삽목들의 논리', lines: ['“우리는 썩어가는 나무에 남지 않겠다.”', '“떨어져 나가는 것은 배신이 아니다. 번식이다.”'], bonus: { stat: 'dr', value: 1, label: '물리 피해 감소 +1%' } },
    act_8: { title: '액트 8 - 끝없는 장막', lines: ['“처음 본 길인데도, 발자국은 이미 나 있다.”'], bonus: { stat: 'resAll', value: 1, label: '모든 저항 +1%' } },
    act_9: { title: '액트 9 - 비탄의 교차', lines: ['“살아남으려는 가지의 울음은 죄가 아니다.”'], bonus: { stat: 'crit', value: 1, label: '치명타 확률 +1%' } },
    act_10: { title: '액트 10 - 합일의 차륜', lines: ['“왕관은 부서져도, 선택은 남는다.”'], bonus: { stat: 'flatHp', value: 12, label: '최대 생명력 +12' } },
    woodsman: { title: '나무꾼', lines: ['“종착점에 도착했구나, 나의 피조물아.”', '“선택해라. 도구로 남을 것인지, 날이 될 것인지.”'] },
    woodsman_echo: { title: '나무꾼 격파 (잔상)', lines: ['“남은 것은 도끼의 잔향뿐.”', '“흔들리지 않는 표적 앞에서, 너의 날은 수치로 증명된다.”'], bonus: { stat: 'passivePoint', value: 1, label: '영구 패시브 포인트 +1' }, hidden: true, hint: '혼돈 밖에서 나무꾼을 완전히 격파하라' },
    star_wedge: { title: '별쐐기', lines: ['“나무 바깥에서 떨어진 검은 별의 파편.”', '“패시브 트리에 박아 넣으면 주변 노드의 성장 규칙을 비틀 수 있다.”'] },
    immortal: { title: '히든저널 - 불사자', lines: ['“한 번도 무너지지 않고, 끝까지 걸어온 칼날.”', '“죽음을 허락하지 않은 루프의 기록.”'], bonus: { stat: 'passivePoint', value: 1, label: '영구 패시브 포인트 +1' }, hidden: true, hint: '한 루프에서 죽지 않고 액트 10 클리어' },
    beehive_queen: { title: '루프8 - 벌집 여왕', lines: ['“길은 셋으로 갈라졌지만, 독은 하나로 모였다.”', '“여왕의 날개 아래서 선택은 대가를 부른다.”'], bonus: { stat: 'aspd', value: 1, label: '공격 속도 +1%' } },
    void_grand_breach: { title: '루프9 - 큰 구멍', lines: ['“공허는 틈으로 시작해 심장으로 끝난다.”', '“쏟아지는 무리를 지나면, 공백도 얼굴을 드러낸다.”'], bonus: { stat: 'chaosPctDmg', value: 3, label: '카오스 피해 +3%' } },
    labyrinth_10: { title: '고대 미궁 - 열 번째 문', lines: ['“같은 복도는 한 번도 없었지만, 모든 벽에는 같은 균사가 자랐다.”', '“열 번째 문을 넘은 자는 길을 외우지 않는다. 길이 자신을 기억하게 만든다.”'] },
    ocean_500: { title: '심해 - 압력의 경계', lines: ['“빛이 닿지 않는 곳에서도 뿌리는 아래를 향했다.”', '“오백 미터의 압력을 견딘 칼날은, 바다 밑에도 베어낼 길이 있음을 알았다.”'] },
    sky_tower_10: { title: '창공의 탑 - 역중력', lines: ['“뿌리에서 가장 멀어진 곳에서, 나무는 하늘을 향해 다시 자랐다.”', '“열 층의 중력을 거슬러 오른 발걸음은 더 이상 땅만을 믿지 않는다.”'] },
    time_rift_fusion: { title: '시간의 균열 - 남겨진 기억', lines: ['“과거의 이름과 미래의 상처가 한 몸에 남았다.”', '“융합은 복원이 아니다. 잃어버린 두 가능성 중 하나를 선택하는 일이다.”'] },
    colony_wave_10: { title: '군락지 - 열 번째 파동', lines: ['“군락은 개체를 세지 않는다. 살아남은 형태만을 기억한다.”', '“열 번의 파동을 견딘 방벽에는 벌레가 아니라 의지가 들러붙었다.”'] },
    level_200: { title: '히든저널 - 초월의 가지', lines: ['“성장이 숫자를 넘어 이름이 되는 순간.”', '“두 번째 백의 고리를 넘은 칼날은, 더 빠르게 다음 계절을 배운다.”'], bonus: { stat: 'expGain', value: 2, label: '경험치 획득 +2%' }, hidden: true, hint: '레벨 200 달성' },
    passive_star_evolution: { title: '히든저널 - 성좌 각성', lines: ['“별끝 다섯 자리가 하나의 문양으로 맞물렸다.”', '“각성한 성좌는 피해, 생명력, 발걸음에 영구적인 공명을 남긴다.”'], displayEffect: '성좌 각성 효과: 피해 +24%, 최대 생명력 +140, 이동 속도 +10%', hidden: true, hint: '별끝 특수 노드 5개를 모두 활성화' },
    rival_overheat: { title: '버려진 날 - 과열', lines: ['“나는 가장 빨리 베었다. 그래서 가장 먼저 버려졌다.”', '“속도만 남은 날은, 결국 제 손잡이를 태운다.”'], bonus: { stat: 'aspd', value: 1, label: '공격 속도 +1%' } },
    rival_dull: { title: '버려진 날 - 무딤', lines: ['“부러지지 않는 것이 나의 전부였다.”', '“그러나 베지 못하는 날을, 누가 날이라 부르지.”'], bonus: { stat: 'dr', value: 1, label: '물리 피해 감소 +1%' } },
    rival_glutton: { title: '버려진 날 - 탐식', lines: ['“상처는 전부 내 몫이었다. 그래서 전부 삼켰다.”', '“아무는 날은 갈리지 않는다. 그는 그것을 결함이라 불렀다.”'], bonus: { stat: 'flatHp', value: 10, label: '최대 생명력 +10' } },
    rival_afterimage: { title: '버려진 날 - 잔영', lines: ['“맞지 않으면 지지 않는다고 믿었다.”', '“닿지 않는 날은, 아무것도 바꾸지 못했다.”'], bonus: { stat: 'crit', value: 1, label: '치명타 확률 +1%' } },
    rival_backedge: { title: '버려진 날 - 역린', lines: ['“나는 갑옷 안쪽부터 베었다.”', '“그는 말했다. 방식이 아니라 방향이 틀렸다고.”'], bonus: { stat: 'pctDmg', value: 1, label: '피해 +1%' } },
    rival_masterwork: { title: '일곱 번째 날 - 완성작', lines: ['“내가 완성이라면, 너는 무엇이지.”', '“그가 끝내 손에서 놓지 않은 날이, 처음으로 물었다.”', '“…어째서 버려진 쪽이 더 날카로운가.”'], bonus: { stat: 'passivePoint', value: 1, label: '영구 패시브 포인트 +1' } },
    cosmos_astra: { title: '잔향체 - 아스트라', lines: ['“다섯 개의 별이 사라진 자리에, 하나의 메아리가 남았다.”', '“하말리스의 굳음, 디프다르의 굶주림, 주베누비아의 저울, 주벤샤말의 심판, 에니프론의 충격.”', '“모든 것을 삼킨 별은 마지막으로 하나의 질문을 남긴다 — 너는 그 다섯 조각들보다 온전한가.”'], bonus: { stat: 'passivePoint', value: 2, label: '영구 패시브 포인트 +2' } }
};

const JOURNAL_ENTRY_ORDER = ['prologue', 'act_1', 'act_2', 'act_3', 'act_4', 'act_5', 'act_6', 'act_7', 'act_8', 'act_9', 'act_10', 'woodsman', 'woodsman_echo', 'star_wedge', 'beehive_queen', 'void_grand_breach', 'labyrinth_10', 'ocean_500', 'sky_tower_10', 'time_rift_fusion', 'colony_wave_10', 'immortal', 'level_200', 'passive_star_evolution', 'rival_overheat', 'rival_dull', 'rival_glutton', 'rival_afterimage', 'rival_backedge', 'rival_masterwork', 'cosmos_astra'];

const ABYSS_PASSIVE_NODES = [
    { key: 'power', name: '강력함', max: 20, desc: '몬스터 피해 +2%, 재화 드랍률 +1%/pt' },
    { key: 'tenacity', name: '끈질김', max: 20, desc: '몬스터 생명력 +2%, 경험치/장비 드랍률 +1%/pt' },
    { key: 'horde', name: '대규모', max: 20, desc: '무리규모 +3%, 몬스터 경험치 -2%/pt, 드랍률 -1%/pt' },
    { key: 'frailty', name: '허약함', max: 20, desc: '플레이어 피격 +1%, 드랍률 +1%/pt' },
    { key: 'weakness', name: '나약함', max: 20, desc: '몬스터 받는 피해 1% 감소, 경험치 +2%/pt' },
    { key: 'resistance', name: '저항', max: 20, desc: '몬스터 모든 저항/물피감 +1%, 드랍률 +1%/pt' },
    { key: 'elite', name: '정예', max: 20, desc: '희귀 몬스터 등장 확률 +2%/pt' },
    { key: 'coreRaid', name: '핵심: 수뇌부 공략', max: 1, cost: 5, desc: '보스 생명력/피해 10% 감소' },
    { key: 'arrogance', name: '핵심: 오만', max: 1, cost: 5, desc: '보스 생명력/피해 20% 증가, 보스 특수재화 확률 +5%' },
    { key: 'magnifier', name: '핵심: 확대경', max: 1, cost: 5, desc: '맵 길이 2배(진행속도 절반), 무리규모 +20%' }
];

safeExposeData({ STORY_ACTS, WORLD_MAP_HOTSPOTS, TRIAL_ZONES, METEOR_FALL_ZONE_ID, MAX_STAR_WEDGES, MAX_STAR_WEDGES_HARD_CAP, STAR_WEDGE_RADIUS, STAR_WEDGE_UNLOCK_LOOP, STAR_WEDGE_UNLOCK_ACT, STAR_WEDGE_OPTION_POOL, STAR_WEDGE_CORE_OPTION_POOL, SEASON_CONTENT_ROADMAP, SEASON_BOSS_ZONES, LABYRINTH_ZONE_ID, JOURNAL_DB, JOURNAL_ENTRY_ORDER, ABYSS_PASSIVE_NODES, LOOP_GATE_ABYSS_DEPTH_CAP, LOOP_GATE_ALT_START_SEASON, LOOP_GATE_ALT_COSMOS_PLANET_ID, LOOP_GATE_ALT_COSMOS_PLANET_NAME, OCEAN_UNLOCK_LOOP, OCEAN_ZONE_ID });
