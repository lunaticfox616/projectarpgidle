if (typeof safeExposeData !== 'function') throw new Error('data/constants.js must load before data/maps.js');

const ACT_BATTLE_MAP_SOURCES = Object.freeze({
    bgAct1: 'assets/background/acts-20260915/bgAct1.webp',
    bgAct2: 'assets/background/acts-20260915/bgAct2.webp',
    bgAct3: 'assets/background/acts-20260915/bgAct3.webp',
    bgAct4: 'assets/background/acts-20260915/bgAct4.webp',
    bgAct5: 'assets/background/acts-20260915/bgAct5.webp',
    bgAct6: 'assets/background/acts-20260915/bgAct6.webp',
    bgAct7: 'assets/background/acts-20260915/bgAct7.webp',
    bgAct8: 'assets/background/acts-20260915/bgAct8.webp',
    bgAct9: 'assets/background/acts-20260915/bgAct9.webp',
    bgAct10: 'assets/background/acts-20260915/bgAct10-soft-grid.webp'
});

const ACT_BATTLE_MAP_LAYOUT = Object.freeze({
    width: 912,
    height: 624,
    gridOriginX: 240,
    gridOriginY: 144,
    cellWidth: 48,
    cellHeight: 48,
    columns: 9,
    rows: 8,
    viewScale: 1.06
});

const ACT_BATTLE_MAP_EFFECTS = Object.freeze({
    bgAct9: {key:'bgAct9Sap',source:'assets/background/acts-20260915/act09-sap.png',
        columns:4,frames:12,width:912,height:624,frameMs:100}
});
safeExposeData({ACT_BATTLE_MAP_EFFECTS});

// Phase-1 extracted map/season/journal data.
const STORY_ACTS = [
    { id: 'root_tip_sanctuary', order: 1, displayAct: '1', title: '뿌리끝 성소', subtitle: '죽은 잔뿌리들이 겹겹이 엉켜 중정으로 오르는 길을 가로막은 지하 성소.', description: '밑거름의 우물 바닥에서 깨어난 뿌리없는 자가 잔뿌리 괴물들에게 습격당하던 은둔자 하켄을 구하고, 위쪽 중정으로 오르는 통로를 개척한다.', areaTheme: '축축한 뿌리, 곰팡이, 죽은 수액, 지하 성소', bossId: 'rotten_mane_rootlet', bossName: '썩은갈기의 잔뿌리', clearText: '통로를 틀어막던 잔뿌리 매듭이 끊어지자, 절단면 너머로 위쪽 중정에서 불어오는 서늘한 바람이 새어 나왔다.', unlockText: '봉인되었던 수액 통로 너머로 가지치기의 중정이 모습을 드러낸다.', specialType: 'normal', tier: 1, maxKills: 1, ele: 'phys' },
    { id: 'pruning_courtyard_fall', order: 2, displayAct: '2', title: '가지치기의 중정', subtitle: '아래쪽 뿌리의 수액을 빨아들여 영원을 유지하는 정원.', description: '중정의 수호자는 치명상을 입어도 황금 수액관이 맥동하는 한 몇 번이고 다시 일어선다.', areaTheme: '정돈된 중정, 냉혹한 가위, 추방의 의식', bossId: 'gardener_immortal', bossName: '부정한 은총의 부제녀', clearText: '수액관이 황금빛으로 맥동하자 쓰러졌던 부제녀의 상처가 순식간에 아물었다. 되살아난 그녀의 일격에 중정 바닥이 무너지며 아래쪽 허공뿌리로 추락한다.', unlockText: '추락한 허공뿌리 너머로 중정에 수액을 공급하는 수송로가 보인다.', specialType: 'normal', tier: 2, maxKills: 1, ele: 'fire' },
    { id: 'suspended_aerial_roots', order: 3, displayAct: '3', title: '허공뿌리 현수림', subtitle: '수액을 모두 빼앗긴 채 허공에 매달려 말라붙은 뿌리 숲.', description: '모든 양분을 중정으로 수탈당해 아사 직전에 몰린 현수림을 가로질러 수액 수송로의 분기점을 찾는다.', areaTheme: '허공에 매달린 뿌리, 굶주림, 바람, 추락감', bossId: 'famine_beast', bossName: '부제나비', clearText: '수액을 빨아들이던 거대한 부제나비가 날개를 접고 추락하자, 갈림뿌리 미궁으로 이어지는 금빛 수액관이 드러났다.', unlockText: '수액 수송로의 심장부인 갈림뿌리 미궁이 열린다.', specialType: 'normal', tier: 2, maxKills: 1, ele: 'cold' },
    { id: 'forked_root_maze', order: 4, displayAct: '4', title: '갈림뿌리 미궁', subtitle: '하층의 수액을 중정으로 실어 나르는 황금 길의 교차로.', description: '수액 운반선을 끊어 중정의 불멸을 거두고, 뒤쫓아 내려온 부제녀의 숨통을 완전히 끊는다.', areaTheme: '분기하는 길, 미궁, 가지처럼 갈라지는 뿌리', bossId: 'retainer_knight', bossStages: [{ name: '황금 길의 마지막 운반자', assetKey: 'bossAct4_1' }, { name: '부정한 은총의 부제녀', assetKey: 'bossAct4_2' }], bossName: '부정한 은총의 부제녀', clearText: '마지막 수액 항아리가 깨지자 부제녀의 상처는 더 이상 닫히지 않았다. 죽어가던 그녀는 지주근의 주인이 당신을 무기로 벼려냈다는 유언을 남겼다.', unlockText: '가장 깊은 받침뿌리인 지주근의 침묵 성소가 열린다.', specialType: 'normal', tier: 3, maxKills: 2, ele: 'light' },
    { id: 'taproot_silent_sanctum', order: 5, displayAct: '5', title: '지주근의 침묵 성소', subtitle: '우물에서 건진 파편을 칼날로 담금질한 비밀 공방.', description: '당신을 거두어 길렀던 지주근의 주인 하켄과 마주하여, 이 모든 여정이 누구를 위한 담금질이었는지 확인한다.', areaTheme: '침묵, 거대한 받침뿌리, 배신, 성소의 붕괴', bossId: 'taproot_druid', bossName: '지주근의 드루이드', clearText: '드루이드 하켄은 당신의 칼끝에서 나무꾼의 첫 번째 날붙이를 읽어내고는, 남은 생명을 모두 태워 무너진 중정으로 오르는 보랏빛 뿌리 다리를 엮어 주었다.', unlockText: '호혜가 끊겨 필멸자로 내려앉은 정원사의 중정이 다시 열린다.', specialType: 'normal', tier: 4, maxKills: 1, ele: 'fire' },
    { id: 'pruning_courtyard_revenge', order: 6, displayAct: '6', title: '가지치기의 중정', subtitle: '수액 공급이 끊겨 시들어 버린 정원사의 마지막 보루.', description: '더 이상 가지들의 호혜로 상처를 되돌리지 못하는 정원사와 최후의 결전을 벌인다.', areaTheme: '무너진 중정, 깨진 가위, 복수의 결투', bossId: 'gardener_mortal', bossName: '정원사', clearText: '정원사의 가위가 부러지자 억눌려 있던 세계수의 수액이 일제히 위쪽 수관으로 역류하기 시작했다. 바닥에 남은 보랏빛 잔향이 속 빈 줄기를 가리킨다.', unlockText: '수액이 역류하는 말라가는 큰 줄기로의 길이 열린다.', specialType: 'normal', tier: 4, maxKills: 1, ele: 'cold' },
    { id: 'withering_great_trunk', order: 7, displayAct: '7', title: '말라가는 큰 줄기', subtitle: '수관에 모든 수액을 빼앗기고 속이 텅 비어버린 고목 도시.', description: '죽어가는 어미나무에서 스스로를 잘라내어 떠나려는 삽목들의 거주지를 지나 수액이 모이는 꼭대기로 오른다.', areaTheme: '말라가는 수액, 갈라진 줄기, 위쪽에서 내려오는 경고', bossId: 'trunk_herald', bossName: '줄기의 전령', clearText: '줄기의 전령이 무너지자, 말라붙은 내벽 너머로 침입자의 그림자를 비추는 하얀 장막의 성소가 드러났다.', unlockText: '끝없는 장막의 줄기로 향하는 관문이 열린다.', specialType: 'normal', tier: 5, maxKills: 1, ele: 'light' },
    { id: 'endless_veil_trunk', order: 8, displayAct: '8', title: '끝없는 장막의 줄기', subtitle: '기억에 없는 당신의 발자국이 바닥마다 포개어져 남은 회랑.', description: '누군가 이미 수없이 베고 지나간 흔적이 남은 장막을 가르며 황금빛 수관의 입구로 나아간다.', areaTheme: '반복되는 장막, 죽은 수액, 데자뷰, 루프 암시', bossId: 'endless_pilgrim', bossName: '끝없는 줄기의 순례자', clearText: '순례자의 가면이 부서지자 장막이 걷히고, 모든 수액이 응집된 황금빛 수관이 모습을 드러냈다.', unlockText: '수관의 입구인 비탄의 교차가 열린다.', specialType: 'normal', tier: 5, maxKills: 1, ele: 'chaos' },
    { id: 'crossroad_of_lament', order: 9, displayAct: '9', title: '비탄의 교차', subtitle: '잘려 나간 가지들의 유해를 접붙여 마지막 고치를 품은 수관.', description: '바깥의 도끼에 맞서기 위해 모든 생명을 한곳에 융합시킨 접목의 어머니와 마주한다.', areaTheme: '가지들의 충돌, 생존 본능, 비극적 합창, 수관 입구', bossId: 'wailing_chorus', bossName: '비탄하는 접목의 어머니', clearText: '접목의 어머니가 쓰러지자 그녀가 품고 있던 거대한 고치가 갈라지고, 금빛 후광을 두른 형상이 세계수의 최상층으로 떠올랐다.', unlockText: '세계수의 정점인 합일의 차륜으로 오르는 길이 열린다.', specialType: 'normal', tier: 6, maxKills: 1, ele: 'chaos' },
    { id: 'wheel_of_unity', order: 10, displayAct: '10', title: '합일의 차륜', subtitle: '아홉 삽목의 울음이 하나의 왕관으로 맞물린 세계수의 끝.', description: '고치에서 깨어난 최후의 존재와 맞서, 맞닿지 못한 손끝 너머의 경계를 마주한다.', areaTheme: '최상층 수관, 아홉 삽목의 합체, 새 세계 직전', bossId: 'crown_of_unity', bossName: '고치에서 태어난 존재', clearText: '쓰러진 존재가 손을 뻗었고 당신 또한 손을 내밀었으나, 끝내 맞닿지 못한 두 손끝 사이에는 좁혀지지 않는 한 뼘의 틈이 남았다.', unlockText: '뿌리 아래의 혼돈 층계로 내려갈 길이 열린다.', specialType: 'normal', tier: 7, maxKills: 1, ele: 'chaos' }
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
    { id: 'trial_1', name: "1차 전직 시련 (칼날 회랑)", type: "trial", tier: 3, maxKills: 1, reqZone: 3, ele: 'phys', repeatGemChance: 0.05, fixedDifficultyMul: 1, trapElements: ['phys'], trialHazard: { pattern: 'line', warningMs: 1800, intervalMs: 6800, initialDelayMs: 2400, avoidThresholdMul: 1.1 }, trialDesc: '초벌 벼림의 칼날 직선 함정, 한 칸 회피와 방어도 점검' },
    { id: 'trial_2', name: "2차 전직 시련 (삼원 제단)", type: "trial", tier: 6, maxKills: 1, reqZone: 8, ele: 'fire', repeatGemChance: 0.08, fixedDifficultyMul: 1, trapElements: ['fire', 'cold', 'light'], trialHazard: { pattern: 'doubleLine', warningMs: 1750, intervalMs: 6200, initialDelayMs: 2300, avoidThresholdMul: 1 }, trialDesc: '화염, 냉기, 번개 삼원 담금질 함정, 경고 속성과 저항 점검' },
    { id: 'trial_3', name: "3차 전직 시련 (독무 정원)", type: "trial", tier: 15, maxKills: 1, reqZone: -1, key: 'trialKey3', ele: 'chaos', repeatGemChance: 1, fixedDifficultyMul: 1, trapElements: ['chaos'], trialHazard: { pattern: 'pool', warningMs: 1650, intervalMs: 5600, initialDelayMs: 2200, avoidThresholdMul: 0.9 }, trialDesc: '부식 수액의 독무 정원, 오염 지대를 벗어나 회복할 자리 확보' },
    { id: 'trial_4', name: "4차 전직 미궁 시련 (십자 회랑)", type: "trial", tier: 20, maxKills: 1, reqZone: -1, key: 'trialKey3', ele: 'chaos', repeatGemChance: 1, fixedDifficultyMul: 1, trapElements: ['phys', 'chaos'], trialHazard: { pattern: 'cross', warningMs: 1550, intervalMs: 5000, initialDelayMs: 2100, avoidThresholdMul: 0.8 }, trialDesc: '피와 공허의 십자 회랑, 대각선 탈출과 복합 방어 점검' },
    { id: 'trial_5', name: "혹독한 겨울의 미궁 (재능 개화)", type: "trial", tier: 57, maxKills: 1, reqZone: -1, bloomTrial: true, difficultyBenchmark: 'underworld1', underworldPenaltyFloor: 1, trapDamageMul: 0.72, trapRegenSuppressPct: 1, trapRegenSuppressCap: 0.3, ele: 'cold', fixedDifficultyMul: 1, trapElements: ['cold'], trialHazard: { pattern: 'block', warningMs: 1550, intervalMs: 4600, initialDelayMs: 2000, avoidThresholdMul: 0.7 }, trialDesc: '영구동토의 혹한 봉쇄, 두 칸 탈출과 지하계 1층급 수호자 점검', bossMods: { hpMul: 0.9, damageMul: 0.84, patternMode: 'slam', traitName: '백야의 심장: 파쇄 강타를 버티고 함정 사이에 회복하세요' } }
];

const METEOR_FALL_ZONE_ID = 'meteor_fall_site';
const GRAND_BREACH_ENCOUNTER = Object.freeze({
    unlockChance: 0.08,
    durationSeconds: 35, intervalMs: 1400, openingPack: 16, refillPack: 8, eliteLimit: 4,
    portals: Object.freeze([{gx:0,gy:1}, {gx:8,gy:1}, {gx:4,gy:7}]),
    capacities: Object.freeze([16,24,32])
});

// 운석 낙하 지점: 루프 7에서 액트 7에 닿으면 하늘 균열 게이지가 차기 시작한다.
const METEOR_SITE_UNLOCK_LOOP = 7;

const METEOR_SITE_UNLOCK_ACT = 7;

// 별자리 관측(아틀라스 패시브 '떨어지는 별'): 운석 정산마다 하나를 고르고 루프가 바뀌어도 남는다.
const METEOR_CONSTELLATION_POOL = Object.freeze([
    Object.freeze({ stat: 'pctDmg', label: '피해', val: 4 }),
    Object.freeze({ stat: 'flatHp', label: '최대 생명력', val: 25 }),
    Object.freeze({ stat: 'move', label: '이동 속도', val: 3 }),
    Object.freeze({ stat: 'crit', label: '치명타 확률', val: 2 })
]);

const OCEAN_UNLOCK_LOOP = 11;
/** 심해 자동 재잠수(설정 autoRediveOcean): 새 리프트도 가디언 처치도 없이 산소가 떨어진 잠수가 missLimit번 이어지면 멈춘다. */
const OCEAN_AUTO_REDIVE = Object.freeze({ missLimit: 3 });

const OCEAN_ZONE_ID = 'ocean_depth';

const MAP_PRIMARY_CONTENTS = Object.freeze([
    { id: 'map-tab-zones', label: '탐험', initiallyUnlocked: true },
    { id: 'map-tab-chaos-realm', label: '혼돈계', noticeKey: 'unlock_chaos_realm', noticeTitle: '혼돈계', noticeBody: '루프가 바뀌어도 이어지는 혼돈계 영구 등반이 열렸습니다.\n‘지도 → 혼돈계’에서 도전하세요.' },
    { id: 'map-tab-sky', label: '창공', noticeKey: 'unlock_sky_tower', noticeTitle: '창공의 탑', noticeBody: '창공의 탑이 열렸습니다.\n‘지도 → 창공’에서 탑을 오르세요.\n이후 루프에서는 혼돈 입성부터 다시 도전할 수 있습니다.' },
    { id: 'map-tab-underworld', label: '지하계', noticeKey: 'unlock_underworld', noticeTitle: '지하계', noticeBody: '지하계가 열렸습니다.\n‘지도 → 지하계’에서 지하석을 모으세요.\n지하석과 영구 강화 진행도는 루프가 바뀌어도 유지됩니다.' },
    { id: 'map-tab-cosmos', label: '우주계', noticeKey: 'unlock_cosmos', noticeTitle: '우주계', noticeBody: '지하계 너머 우주계 관문이 열렸습니다.\n‘지도 → 우주계’에서 우주를 탐험하세요.' },
    { id: 'map-tab-ocean', label: '심해', noticeKey: 'unlock_ocean_fishing', noticeTitle: '심해와 낚시', noticeBody: '심해 탐사와 낚시가 열렸습니다.\n‘지도 → 심해’에서 수압에 도전하세요.\n‘지도 → 낚시’에서 어획물을 모으세요.', noticeTargetId: 'map-tab-ocean' },
    { id: 'map-tab-fishing', label: '낚시', noticeKey: 'unlock_ocean_fishing', noticeTitle: '심해와 낚시', noticeBody: '심해 탐사와 낚시가 열렸습니다.\n‘지도 → 심해’에서 수압에 도전하세요.\n‘지도 → 낚시’에서 어획물을 모으세요.', noticeTargetId: 'map-tab-ocean' },
    { id: 'map-tab-pvp', label: '대전', unlockLoop: 3 }
].map(Object.freeze));

// 우주계 적 특성의 단일 정의. 전투 효과는 id로, 아틀라스의 사전 안내는 설명·대응법으로 소비한다.
const COSMOS_MECHANIC_DB = Object.freeze([
    { id: 'critResist', name: '성운 굴절', summary: '치명타 확률과 치명타 피해를 크게 억제합니다.', counter: '관통/비치명타 피해/저항 감소를 준비하세요.', element: 'light', tags: ['crit', 'toxiccrit', 'mirror', 'reflect', 'balance', 'judgement'] },
    { id: 'critDamageResist', name: '항성 장갑', summary: '방어도와 피해 감소로 큰 한 방을 버팁니다.', counter: '방어 무시/저항 관통 또는 지속 피해가 효과적입니다.', element: 'phys', tags: ['guard', 'shield', 'relic', 'belt', 'tank', 'purify'] },
    { id: 'comboGuard', name: '연속 타격 저항', summary: '짧은 시간에 반복 적중하는 공격의 피해를 줄입니다.', counter: '느리지만 강한 타격이나 지속 피해로 공략하세요.', element: 'cold', tags: ['projectile', 'bind', 'path', 'node', 'gate', 'loop', 'warp'] },
    { id: 'heavySlow', name: '중력 강타', summary: '느린 대신 강하고 저항을 관통하는 공격을 사용합니다.', counter: '직격 EHP와 최대 저항을 우선 확보하세요.', element: 'phys', tags: ['charge', 'impact', 'aoe', 'fire', 'physical', 'core', 'end', 'boss'] },
    { id: 'fast', name: '광속 공세', summary: '빠른 연속 공격과 높은 치명타 확률로 압박합니다.', counter: '엔트로피 회피/막기/회복을 함께 준비하세요.', element: 'light', tags: ['speed', 'hunt', 'arcane', 'dual', 'companion', 'sting'] },
    { id: 'energyShield', name: '성간 보호막', summary: '생명력 위에 큰 에너지 보호막을 추가로 두릅니다.', counter: '지속 화력과 회복 억제로 전투가 길어지지 않게 하세요.', element: 'cold', tags: ['absorb', 'cold', 'vital', 'regen', 'seed', 'flower'] },
    { id: 'evasion', name: '성간 회피', summary: '높은 회피로 명중이 낮은 공격을 흘려냅니다.', counter: '정확도/다단 타격/회피 무시 수단을 준비하세요.', element: 'chaos', tags: ['map', 'wealth', 'reward', 'gateway', 'outer', 'skill'] },
    { id: 'armor', name: '운석 장갑', summary: '방어도와 피해 감소로 물리 타격을 억제합니다.', counter: '원소/카오스 피해나 방어 관통이 유리합니다.', element: 'chaos', tags: ['venom', 'poison', 'chaos', 'curse', 'sacrifice', 'asteroid'] }
]);

const COSMOS_GALAXY_ENVIRONMENT_DB = Object.freeze([
    { galaxy: 1, name: '충돌권', summary: '무거운 물리 충돌과 운석 장갑이 중심인 은하입니다.', counter: '방어도/물리 피해 감소/방어 관통을 점검하세요.', armorMul: 1.12, attackSpeedMul: 0.95, damageMul: 0.06 },
    { galaxy: 2, name: '심해권', summary: '모든 적이 생명력 위에 성간 보호막을 두르는 은하입니다.', counter: '지속 화력과 카오스 방어를 준비하세요.', hpMul: 0.08, energyShieldPct: 25, attackSpeedMul: 0.96 },
    { galaxy: 3, name: '쌍성권', summary: '주 피해와 카오스 피해가 겹치는 이중성 은하입니다.', counter: '한 속성만이 아니라 최저 EHP를 함께 보완하세요.', hybridElement: 'chaos', resAll: 3 },
    { galaxy: 4, name: '심판권', summary: '높은 치명타와 저항 관통으로 방어의 빈틈을 심판합니다.', counter: '치명타 저항과 초과 저항을 확보하세요.', critChanceBonus: 6, penetration: 4 },
    { galaxy: 5, name: '혜성권', summary: '빠른 공격과 높은 회피로 완성 빌드를 추격하는 은하입니다.', counter: '정확도/회피 대응/회복 속도를 점검하세요.', attackSpeedMul: 1.12, evasionMul: 1.10 }
]);

// 각 우주계 노드에서 선택하는 탐사 신호. 안정 관측은 항상 제시되고, 나머지 두 칸은
// weight에 따라 결정적으로 뽑힌다. 완료 전 새로고침으로 신호를 재굴림할 수 없다.
const COSMOS_EXPEDITION_DIRECTIVE_DB = Object.freeze([
    { id: 'survey', name: '안정 관측', signal: 'CALIBRATED', description: '위협을 낮춰 처음 연결하는 항로입니다.', weight: 0, enemyHpMul: 0.90, enemyDamageMul: 0.92, enemyAttackSpeedMul: 0.96, rewardMul: 0.82, jackpotChance: 0, jackpotBonusMul: 0 },
    { id: 'salvage', name: '잔해 회수', signal: 'SALVAGE', description: '성간 잔해를 회수해 탐사 보상을 높입니다.', weight: 36, enemyHpMul: 1.10, enemyDamageMul: 1.05, enemyAttackSpeedMul: 1, rewardMul: 1.22, jackpotChance: 0.04, jackpotBonusMul: 0.75 },
    { id: 'predator', name: '포식자 추적', signal: 'HUNT', description: '강한 개체를 추적해 밀도 높은 보상을 노립니다.', weight: 28, enemyHpMul: 1.23, enemyDamageMul: 1.14, enemyAttackSpeedMul: 1.08, rewardMul: 1.40, jackpotChance: 0.07, jackpotBonusMul: 1.10 },
    { id: 'rift', name: '균열 관통', signal: 'BREACH', description: '불안정한 균열을 가로질러 큰 수익을 노립니다.', weight: 18, enemyHpMul: 1.38, enemyDamageMul: 1.23, enemyAttackSpeedMul: 1.12, rewardMul: 1.62, jackpotChance: 0.11, jackpotBonusMul: 1.40 },
    { id: 'storm', name: '성운 폭풍', signal: 'STORM', description: '빨라지는 성운 폭풍 속에서 공명 잔광을 수확합니다.', weight: 18, enemyHpMul: 1.18, enemyDamageMul: 1.20, enemyAttackSpeedMul: 1.18, rewardMul: 1.48, jackpotChance: 0.08, jackpotBonusMul: 1.20 },
    { id: 'eclipse', name: '흑성 일식', signal: 'RARE SIGNAL', description: '드물게 관측되는 흑성 신호입니다. 위험과 보상이 크게 증폭됩니다.', weight: 2, enemyHpMul: 1.68, enemyDamageMul: 1.40, enemyAttackSpeedMul: 1.18, rewardMul: 2.15, jackpotChance: 0.20, jackpotBonusMul: 2, rare: true }
]);

// 탐험 사건(봉인된 보물함 · 매복 · 알집, js/exploration-objects.js): 지도마다 한 번 추첨해 하나만, 해금 뒤에도 매번 나오지는 않는다.
// 2026-10-05 사용자 결정: 루프 2~5에 모은다. 루프 3은 이미 여섯 가지가 열려 봉인 2 · 매복 4 · 알집 5로 나눴다. 루프 5부터 확률은 그대로다.
// odds: 그 루프부터의 [사건, 확률] — 앞에서부터 누적해 한 번의 추첨으로 고른다. notice: 처음 열리는 루프에 한 줄로 알린다.
const EXPLORATION_EVENT_LOOPS = Object.freeze([
    Object.freeze({ fromLoop: 5, odds: Object.freeze([['sealed', 0.15], ['ambush', 0.10], ['nest', 0.10]]) }),
    Object.freeze({ fromLoop: 4, odds: Object.freeze([['sealed', 0.12], ['ambush', 0.08]]) }),
    Object.freeze({ fromLoop: 2, odds: Object.freeze([['sealed', 0.10]]) })
]);
const EXPLORATION_EVENT_NOTICES = Object.freeze({
    sealed: Object.freeze({ loop: 2, title: '봉인된 보물함', body: '이제 탐험 중 봉인된 보물함을 발견할 수 있습니다.' }),
    ambush: Object.freeze({ loop: 4, title: '매복', body: '이제 탐험 중 매복을 만날 수 있습니다.' }),
    nest: Object.freeze({ loop: 5, title: '알집', body: '이제 탐험 중 알집을 발견할 수 있습니다.' })
});

// 보급 상자 등급(2026-10-05 사용자 결정, js/exploration-objects.js · js/exploration-object-combat.js): 지도를 만들 때 시드로 고정한다.
// weight: 등급 비율. rolls: 기본(수량 배율) 회차에 더하는 장비 회차. guaranteed: 앞에서부터 반드시 장비가 나오는 회차 수.
// rare: 앞에서부터 희귀 이상이 보장되는 장비 수. currency: 제작 재화 기본량. variantScale: 장비 드랍 변형(EQUIPMENT_DROP_VARIANTS) 확률 배수.
// 항아리와 나무 상자(2026-10-07 사용자 "가끔씩 낮은 확률로 장비 보상"): 깨질 때 장비 하나의 확률(지도의 아이템 수량을 곱함)과
// 재화 확률(재화가 열려 있을 때만). 예전에는 재화 30%뿐이라 재화가 잠긴 루프 1에는 늘 비어 있었고, 그 뒤에도 재화만 나왔다.
const EXPLORATION_PROP_LOOT = Object.freeze({ itemChance: 0.1, currencyChance: 0.3 });
const EXPLORATION_CHEST_GRADES = Object.freeze([
    Object.freeze({ id: 'wood', label: '보급 상자', weight: 0.70, rolls: 0, guaranteed: 0, rare: 0, currency: 1, variantScale: 1 }),
    Object.freeze({ id: 'silver', label: '은빛 상자', weight: 0.24, rolls: 0, guaranteed: 1, rare: 0, currency: 2, variantScale: 2 }),
    Object.freeze({ id: 'gold', label: '황금 보급 상자', weight: 0.06, rolls: 1, guaranteed: 2, rare: 1, currency: 4, variantScale: 4 })
]);

// 루프 조건 상한·세분화 (state.js: getSeasonAbyssDepthCap / hasCurrentLoopAbyssRequirementClear):
//  - 요구 혼돈 심도는 루프 30(심화 40) 이후에도 기존처럼 루프당 1층씩 증가한다.
//  - 루프 31+에서는 에니프론 행성을 이번 루프에 돌파하면 우주계 루프를 선택할 수 있다.
const LOOP_GATE_ABYSS_DEPTH_CAP = 40;
const LOOP_GATE_ALT_START_SEASON = 31;
const LOOP_GATE_ALT_COSMOS_PLANET_ID = 'planet-45';
const LOOP_GATE_ALT_COSMOS_PLANET_NAME = '에니프론';

// 심화 패시브(심화 루프 포인트, 루프를 넘어 유지): 혼돈 21층 이상 · 미궁 · 특수 보스 · 나무꾼 부분 피해가 주는 포인트로 산다.
// 나무꾼까지의 사다리(2026-10-04 사용자 결정: 나무꾼은 그대로 두고 다른 쪽에 계단을 만든다): 예전 생명력 +10 · 피해 +2는 루프 10
// 캐릭터(생명력 수천, DPS 수십만)에게 보이지 않았다. 생명력은 % 증가, 피해는 곱연산, 카오스 저항을 더했다. key는 저장 이름이라
// 그대로 둔다(flatHp = 생명력 %, flatDmg = 곱연산 피해). stat: 능력치 버킷에 더할 id, more: 곱연산 피해(combat.js), per: 레벨당 값.
const LOOP_DEEP_STATS = Object.freeze([
    Object.freeze({ key: 'flatHp', label: '생명력', stat: 'pctHp', per: 3, unit: '%' }),
    Object.freeze({ key: 'flatDmg', label: '피해(곱연산)', more: 'damage', per: 3, unit: '%' }),
    Object.freeze({ key: 'resChaos', label: '카오스 저항', stat: 'resChaos', per: 3, unit: '%' }),
    Object.freeze({ key: 'aspd', label: '공격 속도', stat: 'aspd', per: 1.2, unit: '%' }),
    Object.freeze({ key: 'move', label: '이동 속도', stat: 'move', per: 0.8, unit: '%' }),
    Object.freeze({ key: 'dr', label: '물리 피해 감소', stat: 'dr', per: 0.5, unit: '%' }),
    Object.freeze({ key: 'crit', label: '치명타 확률', stat: 'crit', per: 0.6, unit: '%' })
]);

// 세계수 껍질(2026-10-09, 루프 50 이후 레벨 디자인): 루프 50을 넘긴 뒤 이정표 루프에 이를 때마다 한 겹(루프 55~100은 5루프마다,
// 110~200은 10루프마다, 최대 20겹). 겹마다 최대 생명력 +pctHp%, 받는 피해 -taken%(다른 받는 피해 감소와 더한다). 관문(혼돈 깊이 =
// 루프 + 10)의 몬스터 피해는 계속 오르는데 계정 성장은 선형이라 버티는 힘이 먼저 무너졌다(docs/late-game-review-20261008.md).
// 이정표 줄은 SEASON_CONTENT_ROADMAP 아래에서 만든다. 능력치: js/combat-build-stats.js accumulateWorldTreeBarkStats.
const WORLD_TREE_BARK = Object.freeze({
    loops: Object.freeze([55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200]),
    pctHp: 3, taken: 1.5
});

// 스토리 액트(매 루프 레벨 1부터 다시 지나는 재성장 구간)의 루프 스케일 상한.
// 이 루프 수까지만 세지고 이후 고정된다 (combat.js: getLoopDifficultyInputs).
const ACT_LOOP_SCALE_CAP = 20;
// 혼돈 층의 루프 스케일 상한 = 액트 상한 + 층 × 이 값(2026-10-06): 액트 10 다음 혼돈 1이 높은 루프에서 한꺼번에 몇 배로
// 뛰지 않게, 층을 내려갈수록 지금 루프의 난이도까지 계단처럼 따라붙는다(루프 30이면 혼돈 5층부터 루프 30 그대로).
const CHAOS_LOOP_RAMP_PER_DEPTH = 2;
// 지도에 들어선 뒤와 문을 지나 다른 방에 들어선 뒤, 몬스터가 공격을 시작하지 못하는 시간(ms, 걸어오기는 한다).
// 2026-10-16 사용자 "맵 이동 시 잠깐의 유예시간 필요" (js/act-exploration-state.js arrive, js/combat.js performMonsterAttacks).
const EXPLORATION_ARRIVAL_GRACE_MS = 1500;

// 몬스터 생명력의 루프 배율(2026-10-06 재조율, js/combat.js getMonsterLoopHpMultiplier): [루프, 배율], 사이는 직선, 끝 뒤는 끝 값.
// 지역 단계와 무관한 한 곡선이라 같은 레벨의 몬스터는 어느 지역이든 같은 비율로 세진다(레벨이 강함을 말한다).
// 예전에는 지역 단계에 비례하는 성장 × 루프 카운트 배율 × 보정 곡선이 겹쳐 혼돈 1이 루프 20에 16배 · 30에 27배였고(액트 10은 상한 탓에
// 루프 20 이후 10.8배에 멈춤), 루프 패시브로 얻는 힘(루프 20 약 1.6배 · 40 약 2.2배, 측정 docs/loop-difficulty-20261006.md)과
// 레벨이 같은 지역의 체감 강함이 크게 어긋났다. 지하계 · 혼돈계 · 고정 난이도 벤치마크(루프 30 고정)도 같은 곡선이라 "혼돈계 1층 ≈ 심화 30"
// 같은 지역 사이의 기준은 그대로다. 우주계(노드 등급 사다리, js/cosmos-rules.js)만 예전 공식을 쓴다.
const MONSTER_LOOP_HP_CURVE = Object.freeze([[1, 1], [5, 1.7], [10, 2.6], [20, 4], [30, 5.5], [50, 7.5], [100, 11], [200, 15]]);
// 보스 생명력 완화(2026-10-16 사용자 요청, js/combat.js getBossHpEase). 스킬 포인트를 쓰지 않은 자동 플레이에서 액트 4~8 보스가 처치
// 목표 18초의 1.7~2.8배 걸렸다. 모든 콘텐츠의 보스가 지역 단계 곡선 BOSS_TIER_HP_EASE([단계, 배율], 사이는 직선)를 받아 단계 3(액트 4)부터
// 0.7배이고 액트 1~3은 그대로다. 액트 10과 혼돈 1이 같은 배율이라 둘 사이의 차이는 그대로다. 루프 생명력 배율 가운데 1을 넘는 몫은
// BOSS_LOOP_HP_SHARE만 받는다(루프 20 4배 → 3.4배, 루프 30 5.5배 → 4.6배).
const BOSS_TIER_HP_EASE = Object.freeze([[2, 1], [3, 0.7]]);
const BOSS_LOOP_HP_SHARE = 0.8;

// 몬스터의 루프당 성장(시즌 깊이 1당, 지역 단계 0~1에 비례하는 몫 tier와 고정 몫 base): 생명력 1 + 깊이 × (base + 단계 × tier).
// 2026-10-04 소폭 하향(사용자 요청): 생명력 tier 0.52 → 0.47, 피해 tier 0.07 → 0.06 — 혼돈 20 · 루프 10에서 생명력 약 −7%, 피해 약 −4%.
// 루프를 타지 않는 지역(나무꾼 · 시련)은 깊이가 0이라 그대로다. 루프 30에 고정하고 노드 등급으로 난이도를 올리는 우주계는
// 예전 값(fixed)을 그대로 쓴다(js/combat.js getMonsterLoopGrowthScale). 전투와 권장 전투력 · 우주계 예측이 같은 값을 쓴다.
const MONSTER_LOOP_GROWTH = Object.freeze({
    // 생명력 성장은 2026-10-06부터 MONSTER_LOOP_HP_CURVE가 맡고, 이 값은 우주계 최종 보스(잔향체 아스트라)의 예전 공식에만 남는다.
    hp: Object.freeze({ base: 0.08, tier: 0.47 }),
    damage: Object.freeze({ base: 0.05, tier: 0.06 }),
    fixed: Object.freeze({ hp: Object.freeze({ base: 0.08, tier: 0.52 }), damage: Object.freeze({ base: 0.05, tier: 0.07 }) })
});

/** 몬스터 생명력 · 피해의 루프 배율(보조 콘텐츠 통합 9단계, 2026-10-02). 별쐐기 · 생장판 · 가지치기 · 전문가 · 아르카나 ·
 * 플라스크가 빠진 힘 가운데 새 자리(부적 · 공허 소켓 · 코어 · 접붙이기 · 소켓)가 돌려주지 못한 몫을 몬스터 쪽에서 맞춘다.
 * [루프, 배율] 사이는 직선 보간, 마지막 점 뒤로는 그 값. 루프 3(플라스크) · 7(별쐐기)부터 빠진 힘이 커졌다.
 * 측정: docs/aux-consolidation-20260930.md 9단계. */
const MONSTER_LOOP_POWER_SCALE = Object.freeze({
    hp: Object.freeze([[1, 1], [3, 0.95], [7, 0.8], [10, 0.75], [25, 0.66], [50, 0.62]]),
    damage: Object.freeze([[1, 1], [3, 0.95], [10, 0.91], [25, 0.72], [50, 0.68], [100, 0.6]])
});

// 몬스터 방어 수치(%, js/combat.js createEnemy): 물리 피해 감소 dr와 원소 · 카오스 저항 res는 기존 지역 티어 곡선(제곱)으로
// 서서히 올라 티어 20(혼돈 20 · 심화)에서 이 값이 된다. 지역 속성 수호 같은 추가 저항은 별도로 더해진다.
// 보스 방어 특화(2026-10-05 사용자 결정, js/combat.js getBossDefenseTargets): 액트 · 혼돈 보스는 물리 피해 감소 · 화염 · 냉기 · 번개 저항 중
// 1~2개만 bossSpecialty 수치까지 오르고 나머지와 카오스 저항은 정예와 같은 수치다. 첫째 특화는 보스 속성(byElement,
// 카오스 속성은 지역 시드로 고름), 둘째는 지역 시드로 secondChance. 고정 난이도 · 벤치마크 · 정점 지역과 다른 콘텐츠의 보스는
// 모든 방어가 bossSpecialty 수치까지 오른다. 수치는 초기 가설이다.
const ENEMY_DEFENSE_TIER20 = Object.freeze({
    normal: Object.freeze({ dr: 20, res: 25 }),
    elite: Object.freeze({ dr: 40, res: 50 }),
    bossSpecialty: Object.freeze({ dr: 75, res: 80 })
});
const BOSS_DEFENSE_SPECIALTIES = Object.freeze({
    secondChance: 0.5,
    stats: Object.freeze(['dr', 'resF', 'resC', 'resL']),
    byElement: Object.freeze({ phys: 'dr', fire: 'resF', cold: 'resC', light: 'resL' })
});

// 시간의 균열 (루프 13+): 과거에 심고, 미래에 거둔다 — 고유+희귀 융합 던전.
//  - 과거 클리어 → 제단 개방 → 같은 부위의 고유 1개·희귀 1개를 올림 → 미래 클리어 → 융합 유물 획득.
//  - 시간압(1~10)이 난이도이자 보상 손잡이: 높을수록 몬스터가 강해지고 '완벽한 융합' 확률이 오른다.
//  - 융합 유물은 황금률, 잿불가지, 축복의 꽃잎 외의 제작 재화를 받지 않는다.
const TIME_RIFT_UNLOCK_LOOP = 13;
const TIME_RIFT_PAST_ZONE_ID = 'time_rift_past';
const TIME_RIFT_FUTURE_ZONE_ID = 'time_rift_future';
const TIME_RIFT_MAX_PRESSURE = 10;
// 시간압별 혼돈 환산 깊이. 초반은 약 5단계씩 오르며, 9→10은 의도적으로 큰 벽이다.
const TIME_RIFT_EQUIVALENT_CHAOS_DEPTHS = Object.freeze([1, 6, 11, 16, 22, 29, 37, 47, 62, 90]);
// 완벽(유실 0) = perfectBase + perfectPerPressure×(시간압-1) — 기본은 매우 낮게.
// 불안정(유실 2) = max(unstableMin, unstableBase - unstablePerPressure×(시간압-1)). 나머지는 보통(유실 1).
const TIME_RIFT_FUSION_ODDS = { perfectBase: 0.03, perfectPerPressure: 0.045, unstableBase: 0.42, unstablePerPressure: 0.035, unstableMin: 0.08 };

const SEASON_CONTENT_ROADMAP = {
    1: { title: '루프 1', features: ['시작: 기본 전투/장비/지도', '액트 3 클리어: 전투 전술 무료 해금 (스킬룬 → 전술 규칙)'] },
    2: { title: '루프 2', features: ['해금: 홀씨 제작', '그루터기 함: 루프마다 한 칸씩 열림 (9칸 → 루프 17에 25칸)'] },
    3: { title: '루프 3', features: ['해금: 고대 미궁(화석) / 대전'] },
    4: { title: '루프 4', features: ['해금: 창공 강화'] },
    5: { title: '루프 5', features: ['해금: 루프 패시브 확장 + 주얼'] },
    6: { title: '루프 6', features: ['해금: 부적 시스템'] },
    7: { title: '루프 7', features: ['해금: 운석 낙하 지점'] },
    8: { title: '루프 8', features: ['해금: 벌집'] },
    9: { title: '루프 9', features: ['해금: 균열'] },
    10: { title: '루프 10', features: ['해금: 심화 혼돈', '그루터기 함: 뿌리 기억 25% (루프가 바뀌어도 경험치 25% 유지)'] },
    11: { title: '루프 11', features: ['해금: 심해 / 낚시', '심화: 혼돈 단계 상승'] },
    12: { title: '루프 12', features: ['심화: 혼돈 단계 상승'] },
    13: { title: '루프 13', features: ['해금: 시간의 균열 (융합 제단)', '심화: 혼돈 단계 상승'] },
    14: { title: '루프 14', features: ['심화: 혼돈 단계 상승'] },
    15: { title: '루프 15', features: ['해금: 군락지 / 군락지 액막이', '조건부 해금: 창공의 탑 (혼돈 20층 클리어)', '전술 조건 해금: 최근 피격'] },
    16: { title: '루프 16', features: ['심화: 혼돈 단계 상승'] },
    17: { title: '루프 17', features: ['그루터기 함: 25칸 모두 열림', '심화: 혼돈 단계 상승'] },
    18: { title: '루프 18', features: ['그루터기 함: 접붙이기 (루프마다 3점)', '심화: 혼돈 단계 상승'] },
    19: { title: '루프 19', features: ['심화: 혼돈 단계 상승'] },
    20: { title: '루프 20', features: ['조건부 해금: 코어 (지하계 10층 클리어)', '심화: 혼돈 단계 상승'] },
    21: { title: '루프 21', features: ['아틀라스: 기억 던전 (보스가 남긴 기억으로 그 보스에게 다시 도전, 1~5단계)', '심화: 혼돈 단계 상승'] },
    22: { title: '루프 22', features: ['심화: 혼돈 단계 상승'] },
    23: { title: '루프 23', features: ['그루터기 함: 봉인 칸 1 (루프가 바뀌어도 성장 상태 유지), 포식 (불씨의 흉터)', '심화: 혼돈 단계 상승'] },
    24: { title: '루프 24', features: ['심화: 혼돈 단계 상승'] },
    25: { title: '루프 25', features: ['해금: 야생 부적 드랍 (적이 부적을 떨어뜨림)'] },
    26: { title: '루프 26', features: ['심화: 혼돈 단계 상승'] },
    27: { title: '루프 27', features: ['아틀라스: 세계수 기운 (지역 지도 장비에 그 지역 전용 옵션)', '심화: 혼돈 단계 상승'] },
    28: { title: '루프 28', features: ['심화: 혼돈 단계 상승'] },
    29: { title: '루프 29', features: ['그루터기 함: 봉인 칸 2', '심화: 혼돈 단계 상승'] },
    30: { title: '루프 30', features: ['아틀라스: 잿불 터 (타오른 잿불가지로 장비를 한 번 더 타락)', '전환점: 혼돈 루프 요구 심화 40층'] },
    31: { title: '루프 31', features: ['해금: 버려진 날붙이 / 단절된 방랑자', '조건부 해금: 혼돈/우주계 루프 경로 선택', '조건부 해금: 잔향체 아스트라 / 아틀라스 최종 관문'] },
    32: { title: '루프 32', features: ['아틀라스: 수액 상처 (기폭제로 장비의 품질 속성을 고른 태그로)', '심화: 혼돈 단계 상승'] },
    33: { title: '루프 33', features: ['보스 변이체 (모든 보스가 드물게 변이체로, 처음 잡은 변이마다 보상, 기억 던전에서 다시 부르기)', '심화: 혼돈 단계 상승'] },
    34: { title: '루프 34', features: ['아틀라스: 나이테 원정 (길잡이에게서 얻은 주사위로 이동, 지도 보상 누적, 보스 처치로 정산)', '심화: 혼돈 단계 상승'] },
    35: { title: '루프 35', features: ['그루터기 함: 품질 상한 140%', '심화: 혼돈 단계 상승'] },
    36: { title: '루프 36', features: ['아틀라스: 시든 정원 (목걸이에 기름 셋을 발라 패시브 노드 하나를 새김)', '심화: 혼돈 단계 상승'] },
    37: { title: '루프 37', features: ['그루터기 함: 봉인 칸 3', '심화: 혼돈 단계 상승'] },
    38: { title: '루프 38', features: ['심화: 혼돈 단계 상승'] },
    39: { title: '루프 39', features: ['아틀라스: 묘목장 (그 지역 색의 씨앗과 수액, 불씨의 흉터)', '심화: 혼돈 단계 상승'] },
    40: { title: '루프 40', features: ['심화: 혼돈 단계 상승'] },
    41: { title: '루프 41', features: ['심화: 혼돈 단계 상승'] },
    42: { title: '루프 42', features: ['그루터기 함: 고대 씨앗 (모든 색 공명, 이웃 접붙이기 +1, 묘목장과 최종 보스)', '심화: 혼돈 단계 상승'] },
    43: { title: '루프 43', features: ['심화: 혼돈 단계 상승'] },
    44: { title: '루프 44', features: ['아틀라스: 기억 던전 4, 5단계', '심화: 혼돈 단계 상승'] },
    45: { title: '루프 45', features: ['그루터기 함: 품질 상한 150%, 접붙이기 6단계', '심화: 혼돈 단계 상승'] },
    46: { title: '루프 46', features: ['심화: 혼돈 단계 상승'] },
    47: { title: '루프 47', features: ['심화: 혼돈 단계 상승'] },
    48: { title: '루프 48', features: ['아틀라스: 목걸이 기름 둘째 자리', '심화: 혼돈 단계 상승'] },
    49: { title: '루프 49', features: ['심화: 혼돈 단계 상승'] },
    50: { title: '루프 50', features: ['아틀라스: 지도마다 콘텐츠 방 +1', '심화: 혼돈 단계 상승'] }
};
// 루프 50 이후 이정표(2026-10-09): 세계수 껍질(WORLD_TREE_BARK) 한 겹마다 한 줄, 같은 루프의 그루터기 함 해금(data/stump-box.js
// STUMP_BOX_UNLOCKS)과 아틀라스 콘텐츠 방(data/atlas.js encounterLoopBonus) 줄을 뒤에 붙인다.
(() => {
    const extra = { 55: ['그루터기 함: 봉인 칸 4'], 60: ['그루터기 함: 품질 상한 160%, 접붙이기 7단계'], 70: ['그루터기 함: 봉인 칸 5'],
        75: ['아틀라스: 지도마다 콘텐츠 방 +1 (둘째)'], 80: ['그루터기 함: 품질 상한 170%, 접붙이기 8단계'], 90: ['그루터기 함: 봉인 칸 6'],
        100: ['그루터기 함: 품질 상한 180%, 접붙이기 9단계'] };
    WORLD_TREE_BARK.loops.forEach((loop, index) => {
        const layers = index + 1;
        const bark = `세계수 껍질 ${layers}겹: 최대 생명력 +${layers * WORLD_TREE_BARK.pctHp}%, 받는 피해 -${layers * WORLD_TREE_BARK.taken}%`;
        SEASON_CONTENT_ROADMAP[loop] = { title: `루프 ${loop}`, features: [bark, ...(extra[loop] || [])] };
    });
})();

const SEASON_BOSS_ZONES = [
    { id: 's2_boss_flame', name: '화염 군주 이그니스', signatureUnique: '화염 군주의 숨결', type: 'seasonBoss', tier: 12, key: 'bossKeyFlame', reqSeason: 2, ele: 'fire', reward: 'bossCore' },
    { id: 's2_boss_frost', name: '서리 여제 글라시아', signatureUnique: '서리 여제의 인장', type: 'seasonBoss', tier: 12, key: 'bossKeyFrost', reqSeason: 2, ele: 'cold', reward: 'bossCore' },
    { id: 's2_boss_storm', name: '폭풍 군단장 볼타', signatureUnique: '폭풍 군단장의 창끝', type: 'seasonBoss', tier: 13, key: 'bossKeyStorm', reqSeason: 2, ele: 'light', reward: 'bossCore' },
    // bossStages: the arena's boss rises three times (js/combat.js CERBERUS_STAGES: three heads, two heads, the body). Until 2026-10-13 it
    // was the one boss kept on the 9×8 board (user: "보스전은 방 두개 해서 다음 방에 바로 보스만 나오게 해").
    { id: 's6_beast_cerberus', name: '야수왕 케르베로스', signatureUnique: '야수왕의 세 목줄', type: 'seasonBoss', tier: 18, key: 'beastKeyCerberus', reqSeason: 6, ele: 'chaos', reward: 'bossCore', bossStages: 3 },
    // 버려진 날붙이들 (루프 31+): 나무꾼이 벼리다 버린 다른 날들. 플레이어(첫 번째 날붙이)를 시험하러 온다.
    //  - 매 루프 다시 도전하는 고정 난이도 결투 — 루프 31 진입 시점의 성장 배율에 고정하고 bossMods로 개성을 조절한다.
    //  - bossMods shape는 createEnemy의 cosmosMods와 동일: *Mul(hp/damage/attackSpeed/armor/evasion/regen)은 배율, 나머지는 가산.
    //  - 다섯 날을 한 루프 안에 모두 꺾으면 「완성작」이 모습을 드러낸다 (requiresRivals).
    { id: 'rival_overheat', name: '버려진 두 번째 날 「과열」', type: 'seasonBoss', tier: 30, key: 'rivalKey', reqSeason: 31, ele: 'fire', reward: 'goldenRule', journalId: 'rival_overheat', rivalBlade: true, difficultyBenchmark: 'rival31',
      bossMods: { hpMul: 0.75, damageMul: 1.3, attackSpeedMul: 1.3, critChanceBonus: 14, patternMode: 'burst', traitName: '과열: 먼저 베지 못하면 먼저 베인다' } },
    { id: 'rival_dull', name: '버려진 세 번째 날 「무딤」', type: 'seasonBoss', tier: 30, key: 'rivalKey', reqSeason: 31, ele: 'cold', reward: 'goldenRule', journalId: 'rival_dull', rivalBlade: true, difficultyBenchmark: 'rival31',
      bossMods: { hpMul: 1.5, damageMul: 1.1, attackSpeedMul: 0.78, dr: 12, resAll: 12, armorMul: 1.6, firstHitGuard: 0.3, patternMode: 'slam', traitName: '무딤: 부러지지 않는 것이 전부였던 날' } },
    { id: 'rival_glutton', name: '버려진 네 번째 날 「탐식」', type: 'seasonBoss', tier: 30, key: 'rivalKey', reqSeason: 31, ele: 'chaos', reward: 'goldenRule', journalId: 'rival_glutton', rivalBlade: true, difficultyBenchmark: 'rival31',
      bossMods: { hpMul: 1.25, regenMul: 8, resChaos: 20, ailmentChanceBonus: 0.1, patternMode: 'ramp', traitName: '탐식: 상처를 먹고 아무는 날' } },
    { id: 'rival_afterimage', name: '버려진 다섯 번째 날 「잔영」', type: 'seasonBoss', tier: 30, key: 'rivalKey', reqSeason: 31, ele: 'light', reward: 'goldenRule', journalId: 'rival_afterimage', rivalBlade: true, difficultyBenchmark: 'rival31',
      bossMods: { hpMul: 0.85, attackSpeedMul: 1.18, evasionMul: 1.7, critChanceBonus: 8, firstHitGuard: 0.15, patternMode: 'burst', traitName: '잔영: 스치는 것조차 허락하지 않는 날' } },
    { id: 'rival_backedge', name: '버려진 여섯 번째 날 「역린」', type: 'seasonBoss', tier: 30, key: 'rivalKey', reqSeason: 31, ele: 'phys', reward: 'goldenRule', journalId: 'rival_backedge', rivalBlade: true, difficultyBenchmark: 'rival31',
      bossMods: { hpMul: 1.1, damageMul: 1.2, penetration: 12, dr: 8, resAll: 8, armorMul: 1.25, patternMode: 'slam', traitName: '역린: 방어를 거꾸로 베는 날' } },
    { id: 'rival_masterwork', name: '일곱 번째 날 「완성작」', type: 'seasonBoss', tier: 32, key: 'rivalKey', reqSeason: 31, ele: 'chaos', reward: 'woodsmanTouch', journalId: 'rival_masterwork', rivalBlade: true, capstoneRival: true, difficultyBenchmark: 'rival31',
      requiresRivals: ['rival_overheat', 'rival_dull', 'rival_glutton', 'rival_afterimage', 'rival_backedge'],
      bossMods: { hpMul: 1.9, damageMul: 1.35, attackSpeedMul: 1.12, critChanceBonus: 10, dr: 10, resAll: 10, regenMul: 3, penetration: 8, firstHitGuard: 0.25, patternMode: 'ramp', traitName: '완성작: 여섯 날의 모든 것' } },
    // 잔향체 아스트라 (루프 31+): 우주계 5개 은하의 보스(하말리스/디프다르/주베누비아/주벤샤말/에니프론)를
    // 같은 루프 안에 모두 격파해야 모습을 드러내는 우주계의 최종 관문. 다섯 보스의 정체성을 번갈아 두르며 싸운다.
    { id: 'cosmos_astra', name: '잔향체 아스트라', type: 'seasonBoss', tier: 82, key: 'cosmosSovereignKey', reqSeason: 31, ele: 'chaos', reward: 'goldenRule', journalId: 'cosmos_astra', cosmosCapstone: true, difficultyBenchmark: 'cosmosFinal',
      requiresCosmosBosses: ['planet-45', 'planet-46', 'planet-47', 'planet-48', 'planet-49'],
      bossMods: { hpMul: 2.8, damageMul: 2.75, attackSpeedMul: 1.1, dr: 12, resAll: 14, armorMul: 1.45, evasionMul: 1.35, regenMul: 2, penetration: 12, critChanceBonus: 14, firstHitGuard: 0.3, patternMode: 'ramp', traitName: '잔향: 다섯 별의 마지막 메아리' } },
    // 아틀라스 최종 관문: 기존 무한 콘텐츠의 명확한 종착 목표다. 진행 이정표로 영구 해금되며
    // 입장권은 요구하지 않는다. 무료 반복 파밍을 막기 위해 보상은 최초 격파에만 지급한다.
    { id: 'pinnacle_underking', name: '지핵군주 모르그란', signatureUnique: '모르그란의 용광로 흉갑', type: 'seasonBoss', tier: 60, reqSeason: 31, ele: 'phys', journalId: 'pinnacle_underking', milestonePinnacle: true, pinnacleTrack: 'underworld', difficultyBenchmark: 'underworld30', underworldPenaltyFloor: 30,
      pinnacleRequirement: { kind: 'underworldFloor', target: 30 }, firstClearReward: { key: 'goldenRule', amount: 2 },
      bossMods: { hpMul: 1.35, damageMul: 1.18, attackSpeedMul: 0.82, dr: 14, resAll: 10, armorMul: 1.8, penetration: 14, firstHitGuard: 0.32, patternMode: 'slam', traitName: '지핵 붕괴: 느리지만 방어를 파쇄하는 강타' } },
    { id: 'pinnacle_leviathan', name: '무광해의 포식자 탈라사', signatureUnique: '탈라사의 해구 이빨', type: 'seasonBoss', tier: 60, reqSeason: 31, ele: 'cold', journalId: 'pinnacle_leviathan', milestonePinnacle: true, pinnacleTrack: 'ocean', difficultyBenchmark: 'ocean1000', oceanPressureDepthTier: 10,
      pinnacleRequirement: { kind: 'oceanDepth', target: 1000 }, firstClearReward: { key: 'goldenRule', amount: 2 },
      bossMods: { hpMul: 1.3, damageMul: 1.22, attackSpeedMul: 1.04, energyShieldPct: 35, regenMul: 2.4, resC: 18, resChaos: 12, penetration: 10, ailmentChanceBonus: 0.12, patternMode: 'ramp', traitName: '무광해 역류: 보호막과 냉각으로 장기전을 강요' } },
    { id: 'pinnacle_sky', name: '빈 왕좌의 집행자 카엘룸', signatureUnique: '빈 왕좌의 관', type: 'seasonBoss', tier: 61, reqSeason: 31, ele: 'light', journalId: 'pinnacle_sky', milestonePinnacle: true, pinnacleTrack: 'sky', difficultyBenchmark: 'sky30',
      pinnacleRequirement: { kind: 'skyFloor', target: 30 }, firstClearReward: { key: 'goldenRule', amount: 2 },
      bossMods: { hpMul: 1.25, damageMul: 1.32, attackSpeedMul: 1.24, evasionMul: 1.75, critChanceBonus: 18, penetration: 12, firstHitGuard: 0.18, patternMode: 'burst', traitName: '천정 집행: 빠른 연격과 치명타로 빈틈을 추적' } },
    { id: 'pinnacle_observer', name: '경계의 관측자 베일라', signatureUnique: '관측자의 마지막 기록', type: 'seasonBoss', tier: 86, reqSeason: 31, ele: 'chaos', journalId: 'pinnacle_observer', milestonePinnacle: true, pinnacleTrack: 'convergence', pinnacleCapstone: true, difficultyBenchmark: 'cosmosFinal',
      requiresPinnacles: ['pinnacle_underking', 'pinnacle_leviathan', 'pinnacle_sky', 'cosmos_astra'], firstClearReward: { key: 'goldenRule', amount: 5 },
      bossMods: { hpMul: 11, damageMul: 3, attackSpeedMul: 1.12, dr: 15, resAll: 16, armorMul: 1.55, evasionMul: 1.4, energyShieldPct: 25, regenMul: 2.5, penetration: 16, critChanceBonus: 16, firstHitGuard: 0.35, patternMode: 'cosmos', traitName: '경계 관측: 강습, 강타, 격앙을 순환하며 모든 성장축을 검증' } }
];

const LABYRINTH_ZONE_ID = 'labyrinth_endless';

const JOURNAL_DB = {
    prologue: { title: '프롤로그, 밑거름의 우물', lines: ['“이 나무에 뿌리내리지 못한 것은 열매의 자격을 얻지 못한다.”', '“가지도, 잎도, 씨앗도 아닌 것은 가장 깊은 우물로 떨어져 위쪽 가지의 밑거름이 될지어다.”', '(중정 판결록 제1장, 정원사의 추방 선고)'] },
    act_1: { title: '액트 1, 뿌리의 드루이드', lines: ['“하마터면 늙은이 혼자 저 미친 잔뿌리들의 밑거름이 될 뻔했군. 살려주어 고맙다.”', '“뿌리가 없다는 것은 저주가 아니라, 이 나무에 묶이지 않고 줄기를 거슬러 오를 유일한 자유지.”', '“너를 내던진 정원사에게 돌아가고 싶다면, 통로를 틀어막은 저 어미 잔뿌리 매듭부터 끊어내라.”', '(뿌리끝의 드루이드 하켄, 성소 기록판 제1록)'], bonus: { stat: 'flatHp', value: 5, label: '최대 생명력 +5' }, requiresJournal: ['prologue'] },
    act_2: { title: '액트 2, 다시 추락하다', lines: ['“네 갈래 허공뿌리에서 길어 올린 황금 수액이 마르지 않는 한, 중정의 가위는 녹슬지 않으며 부제의 숨은 끊어지지 않는다.”', '“정원사를 베고자 하는 자는 먼저 이 나무가 그를 부양하는 혈관부터 끊어야 할 것이다.”', '(황금 수액관에 새겨진 명문)'], bonus: { stat: 'flatDmg', value: 1, label: '기본 피해 +1' }, requiresJournal: ['act_1'] },
    act_3: { title: '액트 3, 영원의 힘', lines: ['“우리의 수액을 마지막 한 방울까지 중정으로 바쳤으나, 위에서 내려온 것은 은총이 아니라 정원사의 가위뿐이었다.”', '“기근에 마른 뿌리들이여, 황금 길의 수송로를 물어뜯어라. 위쪽의 불멸은 아래쪽의 아사(餓死) 위에 서 있다.”', '(허공뿌리에 거꾸로 매달린 탄원서)'], bonus: { stat: 'aspd', value: 1, label: '공격 속도 +1%' }, requiresJournal: ['act_2'] },
    act_4: { title: '액트 4, 조력자의 정체', lines: ['“마지막 수액 항아리가 깨졌다. 이제 중정의 성녀도 우리처럼 피를 흘리고, 우리처럼 죽음을 맞으리라.”', '“허나 잊지 마라. 깊은 성소의 주인은 너를 구원한 것이 아니다. 자신의 손에 피를 묻히지 않으려 너를 망치로 두드려 벼려냈을 뿐이다.”', '(부정한 은총의 부제녀, 절명록)'], bonus: { stat: 'move', value: 2, label: '이동 속도 +2%' }, requiresJournal: ['act_3'] },
    act_5: { title: '액트 5, 뿌리가 만든 길', lines: ['“정원사의 가위를 부러뜨릴 작은 단검을 벼린 줄 알았건만, 내 심장을 꿰뚫은 이 서슬은 나무의 것이 아니군.”', '“나무꾼의 손에서 빠진 첫 번째 날붙이여, 내 마지막 숨으로 무너진 중정까지 오르는 다리를 놓아주마.”', '“내 주검을 디딤돌 삼아 올라가, 너를 내던졌던 정원사의 목을 베어라.”', '(뿌리끝의 드루이드 하켄의 유언)'], bonus: { stat: 'flatHp', value: 8, label: '최대 생명력 +8' }, requiresJournal: ['act_4'] },
    act_6: { title: '액트 6, 복수 그 이후', lines: ['“아홉 가지를 잘라내어 한 가지라도 살릴 수 있다면, 나는 기꺼이 만대의 도살자로 기록되리라.”', '“바깥의 도끼 소리가 이미 나무껍질에 닿았다. 내가 쓰러지는 날, 통제를 잃은 수액은 수관의 고치를 향해 폭주할 것이다.”', '(정원사의 부러진 가위 안쪽에 새겨진 글귀)'], bonus: { stat: 'pctDmg', value: 1, label: '피해 +1%' }, requiresJournal: ['act_5'] },
    act_7: { title: '액트 7, 속 빈 줄기', lines: ['“수관의 고치가 모든 수액을 빨아들이고 있다. 이 고목의 심재는 이미 텅 비었다.”', '“우리는 썩어가는 어미나무에 남아 함께 찍혀 넘어가지 않겠다. 스스로 줄기를 찢고 떨어져 나가는 것은 배신이 아니라 번식이다.”', '(시든 도시 외벽에 남겨진 삽목 선봉대의 선언문)'], bonus: { stat: 'dr', value: 1, label: '물리 피해 감소 +1%' }, requiresJournal: ['act_6'] },
    act_8: { title: '액트 8, 장막의 성소', lines: ['“장막 바닥에 박힌 녹슨 칼날들마다 내 것과 똑같은 손금이 찍혀 있다.”', '“처음 들어선 길임에도 발자국은 이미 내 보폭과 한 치의 오차도 없이 포개어진다. 기억에 없는 내가 이미 이곳을 지나갔단 말인가.”', '(끝없는 장막에서 발견된 이름 없는 순례록)'], bonus: { stat: 'resAll', value: 1, label: '모든 저항 +1%' }, requiresJournal: ['act_7'] },
    act_9: { title: '액트 9, 고치에서 태어난 존재', lines: ['“잘려 나간 아홉 가지의 울음을 한데 묶어 마지막 고치를 기웠다.”', '“살아남으려는 가지의 몸부림은 죄가 아니다. 부디 고치에서 깨어날 아이가 바깥의 도끼날을 견뎌내기를.”', '(비탄의 교차, 접목원 석판의 기도문)'], bonus: { stat: 'crit', value: 1, label: '치명타 확률 +1%' }, requiresJournal: ['act_8'] },
    act_10: { title: '액트 10, 손끝 사이', lines: ['“왕관은 부서졌으나 맞뻗은 두 손끝 사이에는 끝내 좁혀지지 않는 한 뼘의 틈이 남았다.”', '“그 아득한 틈을 건너기 위해, 칼날은 이제 차륜 아래의 가장 깊은 혼돈으로 내려간다.”', '(합일의 차륜, 마지막 차륜의 비문)'], bonus: { stat: 'flatHp', value: 12, label: '최대 생명력 +12' }, requiresJournal: ['act_9'] },
    woodsman: { title: '나무꾼, 모루터의 기록', intro: '혼돈 5층 끝에서 처음 나무꾼과 마주한 날의 기록입니다.', source: '(나무꾼, 모루터에서)', lines: ['“첫 번째 날붙이가 마침내 수관의 끝까지 기어올라 왔다.”', '“허나 한 번의 벼림으로는 세계수의 심재를 가를 수 없다. 다시 불길과 진흙 속으로 던져 넣어라. 도구로 남을지, 날이 될지 스스로 증명할 때까지.”'], requiresJournal: ['act_10'] },
    woodsman_echo: { title: '나무꾼의 잔상, 부서진 그림자', intro: '혼돈 밖에서 나무꾼의 잔상을 끝까지 베어 넘긴 기록입니다.', source: '(관측자 베일라의 경계 기록)', lines: ['“모루 위에 남았던 창조주의 도끼 그림자가 마침내 산산이 부서졌다.”', '“자루에서 벗어난 칼날은 더 이상 주인의 손아귀를 필요로 하지 않는다.”'], bonus: { stat: 'passivePoint', value: 1, label: '영구 스킬트리 포인트 +1' }, hidden: true, hint: '혼돈 밖에서 나무꾼을 완전히 격파하라', requiresJournal: ['woodsman'] },
    meteor_fall: { title: '운석 낙하 지점, 검은 별의 파편', intro: '줄기 옆구리에 박힌 운석 분화구를 처음 정리한 기록입니다.', source: '(관측자 베일라의 천구 일지)', lines: ['“수관 바깥의 천공에서 추락한 검은 별의 파편이 줄기 옆구리를 꿰뚫었다.”', '“식지 않은 분화구 주변에는 외계의 금속을 벼리려다 재가 된 성좌 학자들의 유품이 흩어져 있다.”'] },
    immortal: { title: '히든 저널, 불사자', intro: '한 루프 동안 한 번도 쓰러지지 않고 액트 10에 닿은 기록입니다.', source: '(접목사 베른이 그루터기 함에 옮겨 심은 기억)', lines: ['“단 한 번의 이도 나가지 않고 우물 바닥에서 차륜의 끝까지 단숨에 닿은 칼날.”', '“쓰러짐 없이 정점에 도달한 무결한 등반의 기록.”'], bonus: { stat: 'passivePoint', value: 1, label: '영구 스킬트리 포인트 +1' }, hidden: true, hint: '한 루프에서 죽지 않고 액트 10 클리어' },
    beehive_queen: { title: '벌집 군락, 여왕의 밀실', intro: '벌집 원정 끝에서 여왕의 밀실을 비운 기록입니다.', source: '(배교자 이벨이 모아 둔 원정 장부)', lines: ['“썩은 수액을 먹고 자란 군집은 여왕의 독침 아래 하나의 신경망으로 움직인다.”', '“달콤한 로열젤리 속에는 잘려 나간 가지들의 오래된 기억이 응고되어 있다.”'], bonus: { stat: 'aspd', value: 1, label: '공격 속도 +1%' } },
    void_grand_breach: { title: '공허 대균열, 지워진 시간의 심장', intro: '공허 균열 깊은 곳에서 대균열의 지배자를 쓰러뜨린 기록입니다.', source: '(관측자 베일라의 경계 기록)', lines: ['“되돌아간 시간과 시간의 봉합선이 어긋난 틈새로 세계수 바깥의 공허가 스며든다.”', '“갈라진 틈을 메우려 몰려든 공백의 무리 너머에서, 지워진 시간의 심장이 박동한다.”'], bonus: { stat: 'chaosPctDmg', value: 3, label: '카오스 피해 +3%' } },
    labyrinth_10: { title: '고대 미궁, 열 번째 문', intro: '고대 미궁의 열 번째 석문을 넘은 기록입니다.', source: '(접목사 베른이 그루터기 함에 옮겨 심은 기억)', lines: ['“정원사 이전의 시대에 지어진 지하 서고는 침입자의 기억을 먹고 회랑의 모양을 바꾼다.”', '“열 번째 석문을 넘은 자는 길을 외우지 않는다. 미궁의 균사가 그의 발걸음을 기억할 뿐이다.”'] },
    ocean_500: { title: '심해, 압력의 경계', intro: '심해 오백 미터의 가디언을 쓰러뜨린 기록입니다.', source: '(접목사 베른이 그루터기 함에 옮겨 심은 기억)', lines: ['“세계수의 가장 깊은 뿌리는 흙이 아니라 빛이 닿지 않는 검은 해구(海溝)에 닿아 있었다.”', '“오백 미터의 수압을 견뎌낸 강철만이 심해가 삼킨 태고의 열매를 건져 올린다.”'] },
    sky_tower_10: { title: '창공의 탑, 역중력', intro: '창공의 탑 열 번째 층계를 넘은 기록입니다.', source: '(관측자 베일라의 천구 일지)', lines: ['“수관이 닿지 못한 허공 위로, 부러진 가지들을 쌓아 올린 역중력의 첨탑이 솟아 있다.”', '“열 번째 층계를 넘어선 칼날은 더 이상 대지의 인력에 묶이지 않는다.”'] },
    time_rift_fusion: { title: '시간의 균열, 남겨진 기억', intro: '시간의 균열에서 처음 두 시대의 유물을 하나로 합친 기록입니다.', source: '(벼림꾼 오르가의 모루터 장부)', lines: ['“과거의 시간과 미래의 시간이 균열된 제단 위에서 정면으로 충돌했다.”', '“두 시대의 유물을 하나로 합치는 일은 복원이 아니다. 한쪽의 가능성을 영원히 도려내는 단조다.”'] },
    colony_wave_10: { title: '군락지, 열 번째 파동', intro: '군락지의 열 번째 파동을 막아낸 기록입니다.', source: '(뿌리끝의 드루이드 하켄이 남긴 방벽 일지)', lines: ['“죽은 뿌리 껍질을 파먹는 갑충 군락은 개체의 죽음을 세지 않고 오직 살아남은 외피만 대물림한다.”', '“열 번의 범람을 막아낸 방벽 위에는 벌레의 체액 대신 꺾이지 않는 살의가 굳어 붙었다.”'] },
    level_200: { title: '히든 저널, 초월의 가지', intro: '레벨 200에 닿은 날의 기록입니다.', source: '(접목사 베른이 그루터기 함에 옮겨 심은 기억)', lines: ['“필멸의 한계를 넘어 두 번째 백(百)의 고리에 도달한 기록.”', '“비대해진 영혼의 무게를 이기지 못해 주변의 나이테가 스스로 길을 비킨다.”'], bonus: { stat: 'expGain', value: 2, label: '경험치 획득 +2%' }, hidden: true, hint: '레벨 200 달성' },
    passive_star_evolution: { title: '히든 저널, 성좌 각성', intro: '여섯 외곽 성률의 패시브를 모두 깨운 기록입니다.', source: '(관측자 베일라의 천구 일지)', lines: ['“여섯 외곽 성률의 파편들이 하나의 완전한 천구(天球) 문양으로 맞물렸다.”', '“세계수 바깥의 별빛이 칼날의 표면에 지워지지 않는 성좌의 각인을 남긴다.”'], displayEffect: '성좌 각성 효과: 피해 +24%, 최대 생명력 +140, 이동 속도 +10%', hidden: true, hint: '여섯 외곽 성률에서 생성된 패시브를 하나씩 활성화' },
    hidden_last_breath: { title: '히든 저널, 마지막 숨', intro: '생명력이 거의 남지 않은 채 종반 보스를 먼저 쓰러뜨린 기록입니다.', source: '(접목사 베른이 그루터기 함에 옮겨 심은 기억)', lines: ['“부러지기 직전의 강철이 가장 서늘한 궤적을 그린다.”', '“꺼져가던 박동 끝에서 마침내 거대한 적의 숨통을 먼저 끊어낸 기록.”'], hidden: true, hint: '종반 보스를 생명력 5% 이하인 상태로 처치' },
    hidden_unscarred: { title: '히든 저널, 상처 없는 승리', intro: '최종 관문 보스를 생명력 피해 없이 쓰러뜨린 기록입니다.', source: '(관측자 베일라의 경계 기록)', lines: ['“단 한 방울의 피도 흘리지 않고 정점의 포식자를 베어 넘겼다.”', '“상처조차 남기지 않은 완벽한 절단면의 기록.”'], hidden: true, hint: '최종 관문 보스를 생명력 피해 없이 처치' },
    hidden_fourfold_affliction: { title: '히든 저널, 네 겹의 흉터', intro: '네 가지 상태이상을 한 몸에 새긴 뒤 종반 보스를 쓰러뜨린 기록입니다.', source: '(접목사 베른이 그루터기 함에 옮겨 심은 기억)', lines: ['“화염과 서리, 맹독과 뇌전이 한 육신 위에서 얽혀 들어갔다.”', '“네 가지 재앙으로 속살까지 파고든 끝에야 비로소 무너진 거목의 기록.”'], hidden: true, hint: '한 종반 보스에게 서로 다른 상태이상 4종을 부여한 뒤 처치' },
    rival_overheat: { title: '버려진 날, 과열(제2호 폐기록)', intro: '모루터에서 버려진 두 번째 날, 과열을 꺾은 기록입니다.', lines: ['“제2호 시제품: 극한의 속도를 얻었으나 제 열기를 이기지 못해 손잡이까지 녹아내림. 우물 외곽에 폐기한다.”', '(벼림꾼 오르가의 모루터 폐기 장부 제2항)'], bonus: { stat: 'aspd', value: 1, label: '공격 속도 +1%' } },
    rival_dull: { title: '버려진 날, 무딤(제3호 폐기록)', intro: '모루터에서 버려진 세 번째 날, 무딤을 꺾은 기록입니다.', lines: ['“제3호 시제품: 결코 부러지지 않는 두께를 지녔으나, 아무것도 베지 못하는 쇳덩이에 불과함. 폐기한다.”', '(벼림꾼 오르가의 모루터 폐기 장부 제3항)'], bonus: { stat: 'dr', value: 1, label: '물리 피해 감소 +1%' } },
    rival_glutton: { title: '버려진 날, 탐식(제4호 폐기록)', intro: '모루터에서 버려진 네 번째 날, 탐식을 꺾은 기록입니다.', lines: ['“제4호 시제품: 베어낸 적의 피와 수액을 삼켜 스스로 상처를 메우나, 배가 부르면 날이 무뎌짐. 폐기한다.”', '(벼림꾼 오르가의 모루터 폐기 장부 제4항)'], bonus: { stat: 'flatHp', value: 10, label: '최대 생명력 +10' } },
    rival_afterimage: { title: '버려진 날, 잔영(제5호 폐기록)', intro: '모루터에서 버려진 다섯 번째 날, 잔영을 꺾은 기록입니다.', lines: ['“제5호 시제품: 허공을 가르는 그림자처럼 부딪힘을 피하나, 나무껍질의 저항 앞에서는 미끄러질 뿐임. 폐기한다.”', '(벼림꾼 오르가의 모루터 폐기 장부 제5항)'], bonus: { stat: 'crit', value: 1, label: '치명타 확률 +1%' } },
    rival_backedge: { title: '버려진 날, 역린(제6호 폐기록)', intro: '모루터에서 버려진 여섯 번째 날, 역린을 꺾은 기록입니다.', lines: ['“제6호 시제품: 갑주의 안쪽을 파고드는 역날 구조이나, 쥐는 이의 손목까지 함께 벤다. 폐기한다.”', '(벼림꾼 오르가의 모루터 폐기 장부 제6항)'], bonus: { stat: 'pctDmg', value: 1, label: '피해 +1%' } },
    rival_masterwork: { title: '일곱 번째 날, 완성작(제7호 봉인록)', intro: '나무꾼이 끝내 손에서 놓지 않은 일곱 번째 날, 완성작을 꺾은 기록입니다.', lines: ['“제7호 최종본: 앞선 다섯 시제품의 결함을 모두 도려낸 무결점의 날붙이. 끝내 손에서 놓지 않고 보관한다.”', '“…허나 어째서 우물 바닥에 버려졌던 첫 번째 파편이, 모루 위의 완성작보다 더 날카롭게 울리는가.”', '(벼림꾼 오르가의 모루터 폐기 장부 제7항)'], bonus: { stat: 'passivePoint', value: 1, label: '영구 스킬트리 포인트 +1' }, requiresJournal: ['rival_overheat', 'rival_dull', 'rival_glutton', 'rival_afterimage', 'rival_backedge'] },
    cosmos_astra: { title: '잔향체, 아스트라', intro: '다섯 별의 잔향이 뭉친 아스트라를 쓰러뜨린 기록입니다.', source: '(관측자 베일라의 천구 일지)', lines: ['“다섯 은하의 군주가 소멸한 궤도 위에, 별들의 유언이 뭉쳐 하나의 잔향체가 깨어났다.”', '“하말리스의 장갑, 디프다르의 심연, 주베누비아의 균형, 주벤샤말의 심판, 에니프론의 붕괴.”', '“다섯 별의 무게를 모두 베어낸 칼날만이 성간(星間)의 침묵을 통과한다.”'], bonus: { stat: 'passivePoint', value: 2, label: '영구 스킬트리 포인트 +2' } },
    pinnacle_underking: { title: '지핵군주, 모르그란', intro: '지하계 끝에서 지핵군주 모르그란을 쓰러뜨린 기록입니다.', source: '(관측자 베일라의 경계 기록)', lines: ['“지하계의 끝은 암반이 아니라 세계수의 뿌리를 아래에서 태우던 거대한 지핵(地核)의 심장이었다.”', '“모르그란의 용광로가 식자, 뿌리 아래를 짓누르던 영겁의 침묵에 첫 균열이 갔다.”'] },
    pinnacle_leviathan: { title: '무광해의 포식자, 탈라사', intro: '무광해의 해구에서 포식자 탈라사를 쓰러뜨린 기록입니다.', source: '(관측자 베일라의 경계 기록)', lines: ['“빛이 닿지 않는 천 미터 해구(海溝)에서, 뿌리가 흘린 썩은 수액을 먹고 자란 고대 포식자의 기록.”', '“검은 조류를 가르고 돌아온 칼날에는 심해의 수압조차 꺾지 못한 서슬이 남았다.”'] },
    pinnacle_sky: { title: '빈 왕좌의 집행자, 카엘룸', intro: '창공의 탑 꼭대기에서 빈 왕좌의 집행자 카엘룸을 멈춰 세운 기록입니다.', source: '(관측자 베일라의 경계 기록)', lines: ['“창공의 탑 꼭대기에 놓인 왕좌는 태초부터 주인이 없었다.”', '“텅 빈 왕좌의 질서를 수호하던 자동 집행자가 멈춰 서자, 수관 너머의 천공이 비로소 열렸다.”'] },
    pinnacle_observer: { title: '경계의 관측자, 베일라', intro: '마지막 경계에서 관측자 베일라를 넘어선 기록입니다.', source: '(경계 너머에 남은 마지막 기록)', lines: ['“지핵의 바닥, 무광해의 심연, 창공의 빈 왕좌, 그리고 다섯 별의 잔향까지 모든 기록이 수렴되었다.”', '“관측이 종료된 순간, 세계는 우물에서 기어 나온 첫 번째 날붙이를 더 이상 누군가의 도구라 부를 수 없었다.”'], requiresJournal: ['pinnacle_underking', 'pinnacle_leviathan', 'pinnacle_sky', 'cosmos_astra'] }
};

const JOURNAL_ENTRY_ORDER = ['prologue', 'act_1', 'act_2', 'act_3', 'act_4', 'act_5', 'act_6', 'act_7', 'act_8', 'act_9', 'act_10', 'woodsman', 'woodsman_echo', 'meteor_fall', 'beehive_queen', 'void_grand_breach', 'labyrinth_10', 'ocean_500', 'sky_tower_10', 'time_rift_fusion', 'colony_wave_10', 'immortal', 'level_200', 'passive_star_evolution', 'hidden_last_breath', 'hidden_unscarred', 'hidden_fourfold_affliction', 'rival_overheat', 'rival_dull', 'rival_glutton', 'rival_afterimage', 'rival_backedge', 'rival_masterwork', 'cosmos_astra', 'pinnacle_underking', 'pinnacle_leviathan', 'pinnacle_sky', 'pinnacle_observer'];

safeExposeData({ MONSTER_LOOP_HP_CURVE, CHAOS_LOOP_RAMP_PER_DEPTH, MONSTER_LOOP_POWER_SCALE, ENEMY_DEFENSE_TIER20, BOSS_DEFENSE_SPECIALTIES, MONSTER_LOOP_GROWTH, LOOP_DEEP_STATS, WORLD_TREE_BARK, EXPLORATION_EVENT_LOOPS, EXPLORATION_EVENT_NOTICES, EXPLORATION_PROP_LOOT, EXPLORATION_CHEST_GRADES });
safeExposeData({ ACT_BATTLE_MAP_SOURCES, ACT_BATTLE_MAP_LAYOUT, STORY_ACTS, WORLD_MAP_HOTSPOTS, TRIAL_ZONES, METEOR_FALL_ZONE_ID, METEOR_SITE_UNLOCK_LOOP, METEOR_SITE_UNLOCK_ACT, METEOR_CONSTELLATION_POOL, SEASON_CONTENT_ROADMAP, SEASON_BOSS_ZONES, LABYRINTH_ZONE_ID, JOURNAL_DB, JOURNAL_ENTRY_ORDER, LOOP_GATE_ABYSS_DEPTH_CAP, LOOP_GATE_ALT_START_SEASON, LOOP_GATE_ALT_COSMOS_PLANET_ID, LOOP_GATE_ALT_COSMOS_PLANET_NAME, OCEAN_UNLOCK_LOOP, OCEAN_AUTO_REDIVE, OCEAN_ZONE_ID, MAP_PRIMARY_CONTENTS, COSMOS_MECHANIC_DB, COSMOS_GALAXY_ENVIRONMENT_DB, COSMOS_EXPEDITION_DIRECTIVE_DB });
