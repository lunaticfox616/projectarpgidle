function safeExposeData(map) {
  Object.keys(map || {}).forEach(function (key) {
    if (typeof window[key] === "undefined") window[key] = map[key];
  });
}

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
    { id: 'trial_1', name: "1차 전직 시련", type: "trial", tier: 3, maxKills: 1, reqZone: 3 },
    { id: 'trial_2', name: "2차 전직 시련", type: "trial", tier: 6, maxKills: 1, reqZone: 8 },
    { id: 'trial_3', name: "3차 전직 시련 (여신)", type: "trial", tier: 15, maxKills: 1, reqZone: -1 },
    { id: 'trial_4', name: "4차 전직 미궁 시련", type: "trial", tier: 20, maxKills: 1, reqZone: -1 }
];

const METEOR_FALL_ZONE_ID = 'meteor_fall_site';

const MAX_STAR_WEDGES = 999;

const STAR_WEDGE_RADIUS = 3;

const MAX_MUTATIONS_PER_WEDGE = 3;

const STAR_WEDGE_UNLOCK_LOOP = 7;

const STAR_WEDGE_UNLOCK_ACT = 7;

const STAR_WEDGE_OPTION_POOL = [
    { stat: 'pctDmg', min: 7, max: 16 },
    { stat: 'flatHp', min: 32, max: 96 },
    { stat: 'aspd', min: 2, max: 8 },
    { stat: 'crit', min: 2, max: 9 },
    { stat: 'critDmg', min: 10, max: 28 },
    { stat: 'dr', min: 1, max: 7 },
    { stat: 'move', min: 2, max: 9 },
    { stat: 'physIgnore', min: 2, max: 8 },
    { stat: 'resPen', min: 2, max: 8 },
    { stat: 'regen', min: 0.2, max: 1.2, step: 0.1 },
    { stat: 'chaosPctDmg', min: 6, max: 18 }
];

const STAR_WEDGE_CORE_OPTION_POOL = STAR_WEDGE_OPTION_POOL.slice();

const SEASON_CONTENT_ROADMAP = {
    1: { title: '루프 1', features: ['해금: 기본 전투/장비/지도 탭'] },
    2: { title: '루프 2', features: ['해금: 시즌 패시브 트리'] },
    3: { title: '루프 3', features: ['해금: 유니크 도감'] },
    4: { title: '루프 4', features: ['해금: 전직 심화 노드'] },
    5: { title: '루프 5', features: ['해금: 혼돈 패시브 + 미궁 심화'] },
    6: { title: '루프 6', features: ['해금: 탈리스만 시스템'] },
    7: { title: '루프 7', features: ['해금: 운석 낙하 지점 / 별쐐기 시스템'] },
    8: { title: '루프 8', features: ['해금: 혼돈 드랍 강화 구간'] },
    9: { title: '루프 9', features: ['해금: 후반 성장 가속 구간'] },
    10: { title: '루프 10', features: ['해금: 최종 루프 사이클'] },
    11: { title: '루프 11', features: ['해금: 혼돈 심화 단계'] },
    12: { title: '루프 12', features: ['해금: 혼돈 심화 단계'] },
    13: { title: '루프 13', features: ['해금: 혼돈 심화 단계'] },
    14: { title: '루프 14', features: ['해금: 혼돈 심화 단계'] },
    15: { title: '루프 15', features: ['해금: 혼돈 심화 단계'] },
    16: { title: '루프 16', features: ['해금: 혼돈 심화 단계'] },
    17: { title: '루프 17', features: ['해금: 혼돈 심화 단계'] },
    18: { title: '루프 18', features: ['해금: 혼돈 심화 단계'] },
    19: { title: '루프 19', features: ['해금: 혼돈 심화 단계'] },
    20: { title: '루프 20', features: ['해금: 혼돈 20 종착 루프'] }
};

const SEASON_BOSS_ZONES = [
    { id: 's2_boss_flame', name: '화염 군주 이그니스', type: 'seasonBoss', tier: 12, key: 'bossKeyFlame', reqSeason: 2, ele: 'fire', reward: 'bossCore' },
    { id: 's2_boss_frost', name: '서리 여제 글라시아', type: 'seasonBoss', tier: 12, key: 'bossKeyFrost', reqSeason: 2, ele: 'cold', reward: 'bossCore' },
    { id: 's2_boss_storm', name: '폭풍 군단장 볼타', type: 'seasonBoss', tier: 13, key: 'bossKeyStorm', reqSeason: 2, ele: 'light', reward: 'bossCore' },
    { id: 's6_beast_cerberus', name: '야수왕 케르베로스', type: 'seasonBoss', tier: 18, key: 'beastKeyCerberus', reqSeason: 6, ele: 'chaos', reward: 'bossCore' }
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
    star_wedge: { title: '별쐐기', lines: ['“나무 바깥에서 떨어진 검은 별의 파편.”', '“패시브 트리에 박아 넣으면 주변 노드의 성장 규칙을 비틀 수 있다.”'] },
    immortal: { title: '히든저널 - 불사자', lines: ['“한 번도 무너지지 않고, 끝까지 걸어온 칼날.”', '“죽음을 허락하지 않은 루프의 기록.”'], bonus: { stat: 'flatHp', value: 20, label: '최대 생명력 +20' }, hidden: true, hint: '한 루프에서 죽지 않고 액트 10 클리어' },
    beehive_queen: { title: '루프8 - 벌집 여왕', lines: ['“길은 셋으로 갈라졌지만, 독은 하나로 모였다.”', '“여왕의 날개 아래서 선택은 대가를 부른다.”'], bonus: { stat: 'aspd', value: 1, label: '공격 속도 +1%' } },
    void_grand_breach: { title: '루프9 - 큰 구멍', lines: ['“공허는 틈으로 시작해 심장으로 끝난다.”', '“쏟아지는 무리를 지나면, 공백도 얼굴을 드러낸다.”'], bonus: { stat: 'chaosPctDmg', value: 3, label: '카오스 피해 +3%' } }
};

const JOURNAL_ENTRY_ORDER = ['prologue', 'act_1', 'act_2', 'act_3', 'act_4', 'act_5', 'act_6', 'act_7', 'act_8', 'act_9', 'act_10', 'woodsman', 'star_wedge', 'beehive_queen', 'void_grand_breach', 'immortal'];

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
    { key: 'magnifier', name: '핵심: 확대경', max: 1, cost: 5, desc: '맵 길이 2배(진행속도 절반), 무리규모 +50%' }
];

safeExposeData({ STORY_ACTS, WORLD_MAP_HOTSPOTS, TRIAL_ZONES, METEOR_FALL_ZONE_ID, MAX_STAR_WEDGES, STAR_WEDGE_RADIUS, MAX_MUTATIONS_PER_WEDGE, STAR_WEDGE_UNLOCK_LOOP, STAR_WEDGE_UNLOCK_ACT, STAR_WEDGE_OPTION_POOL, STAR_WEDGE_CORE_OPTION_POOL, SEASON_CONTENT_ROADMAP, SEASON_BOSS_ZONES, LABYRINTH_ZONE_ID, JOURNAL_DB, JOURNAL_ENTRY_ORDER, ABYSS_PASSIVE_NODES });
