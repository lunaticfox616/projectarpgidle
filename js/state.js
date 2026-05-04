// Central runtime namespace/state bridge (phase 2).
// Keeps global compatibility while giving each module a stable anchor.
window.GameModules = window.GameModules || {};
window.GameState = window.GameState || {
  get game() { return window.game; },
  set game(v) { window.game = v; },
  get defaultGame() { return window.defaultGame; }
};
window.GameModules.state = window.GameState;

// Phase-3 extracted world/season progression helpers.
function formatStoryActLabel(storyAct) {
    if (!storyAct) return '액트 ?';
    return storyAct.displayAct === '엔드게임' ? '엔드게임' : `액트 ${storyAct.displayAct}`;
}
function getStoryActByZoneId(zoneId) {
    if (!Number.isFinite(zoneId)) return null;
    return STORY_ACTS[zoneId] || null;
}
function getStoryActByOrder(order) {
    return STORY_ACTS.find(act => act.order === order) || null;
}
function getActZoneDisplayName(zoneId) {
    let act = getStoryActByZoneId(zoneId);
    if (!act) return `액트 ${zoneId + 1}`;
    return `${formatStoryActLabel(act)}: ${act.title}`;
}

const ACT_ZONE_COUNT = STORY_ACTS.length;
const LAST_STORY_ZONE_ID = ACT_ZONE_COUNT - 1;
const ABYSS_START_ZONE_ID = ACT_ZONE_COUNT;

const MAP_ZONES = STORY_ACTS.map((act, idx) => ({
    id: idx,
    name: getActZoneDisplayName(idx),
    type: 'act',
    tier: act.tier,
    maxKills: act.maxKills,
    ele: act.ele,
    storyActId: act.id,
    storyOrder: act.order
}));

const abyssTiers = [8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 16, 16, 17, 18, 19, 20];
for (let i = 1; i <= 20; i++) MAP_ZONES.push({ id: ABYSS_START_ZONE_ID + (i - 1), name: "혼돈 " + i, type: "abyss", tier: abyssTiers[i - 1], maxKills: 1, ele: "chaos" });












function getStarWedgeUnlockReady() {
    return (game.season || 1) >= STAR_WEDGE_UNLOCK_LOOP && (game.maxZoneId || 0) >= STAR_WEDGE_UNLOCK_ACT;
}

function getZone(id) {
    if (typeof id === 'string' && id.startsWith('trial_')) return TRIAL_ZONES.find(t => t.id === id);
    if (typeof id === 'string' && id.includes('_boss_')) return SEASON_BOSS_ZONES.find(t => t.id === id);
    if (id === METEOR_FALL_ZONE_ID) {
        let star = (game && game.starWedge) || {};
        let tier = Math.max(8, Math.min(20, Math.floor(star.activeMeteorTier || star.skyRiftMinTier || 13)));
        return {
            id: METEOR_FALL_ZONE_ID,
            name: '운석 낙하 지점',
            type: 'meteor',
            tier: tier,
            maxKills: 1,
            ele: 'chaos'
        };
    }
    if (id === LABYRINTH_ZONE_ID) {
        let floor = Math.max(1, game.labyrinthFloor || 1);
        return { id: LABYRINTH_ZONE_ID, name: `고대 미궁 ${floor}층`, type: 'labyrinth', tier: Math.min(20, 7 + Math.floor(floor / 3)), maxKills: 1, ele: 'chaos', floor: floor };
    }
    let zone = MAP_ZONES[id];
    if (!zone) return zone;
    if (zone.type === 'abyss') {
        let abyssDepth = Math.max(1, (zone.id || ABYSS_START_ZONE_ID) - (ABYSS_START_ZONE_ID - 1));
        if (abyssDepth >= 20 && Math.floor(game.abyssEndlessDepth || 20) > 20) {
            let endlessDepth = Math.floor(game.abyssEndlessDepth || 20);
            return { ...zone, name: `혼돈 ${endlessDepth}` };
        }
    }
    return zone;
}







function getSeasonAbyssDepthCap(seasonValue) {
    let season = Math.max(1, Math.floor(seasonValue || 1));
    return Math.min(20, 10 + (season - 1));
}

function getLoopAbyssRequirementText(seasonValue) {
    return `루프 조건: 혼돈 ${getSeasonAbyssDepthCap(seasonValue)} 클리어`;
}

function getSeasonFinalZoneId(seasonValue) {
    return LAST_STORY_ZONE_ID + getSeasonAbyssDepthCap(seasonValue);
}

function getCurrentSeasonFinalZoneId() {
    return getSeasonFinalZoneId(game.season || 1);
}



function getAbyssPassiveState() {
    if (!game.abyssPassives || typeof game.abyssPassives !== 'object') {
        game.abyssPassives = { power: 0, tenacity: 0, horde: 0, frailty: 0, weakness: 0, resistance: 0, elite: 0, coreRaid: 0, arrogance: 0, magnifier: 0 };
    }
    return game.abyssPassives;
}

function getAbyssPassiveSpent() {
    let state = getAbyssPassiveState();
    return ABYSS_PASSIVE_NODES.reduce((sum, node) => sum + (Math.max(0, Math.floor(state[node.key] || 0)) * Math.max(1, Math.floor(node.cost || 1))), 0);
}

function getAbyssPassiveFreePoints() {
    return Math.max(0, Math.floor(game.abyssPassivePoints || 0) - getAbyssPassiveSpent());
}

function tryAllocateAbyssPassive(nodeKey) {
    if ((game.season || 1) < 1) return;
    let node = ABYSS_PASSIVE_NODES.find(row => row.key === nodeKey);
    if (!node) return;
    let state = getAbyssPassiveState();
    if ((state[node.key] || 0) >= node.max) return addLog('해당 심연 노드는 이미 최대 단계입니다.', 'attack-monster');
    let pointCost = Math.max(1, Math.floor(node.cost || 1));
    if (getAbyssPassiveFreePoints() < pointCost) return addLog(`혼돈 패시브 포인트가 부족합니다. (필요: ${pointCost})`, 'attack-monster');
    state[node.key] = (state[node.key] || 0) + 1;
    addLog(`🌌 혼돈 패시브 [${node.name}] ${state[node.key]}/${node.max} (소모 ${pointCost})`, 'season-up');
    updateStaticUI();
}

function getAbyssMonsterScales(zone) {
    let state = getAbyssPassiveState();
    let active = zone && zone.type === 'abyss';
    if (!active) return { dmgMul: 1, hpMul: 1, hordeMul: 1, dropMul: 1, expMul: 1, playerTakenMul: 1, playerDamageMul: 1, resistBonus: 0, eliteBonus: 0, bossMul: 1, bossExtraCurrencyChance: 0, mapProgressMul: 1, mapLengthMul: 1 };
    let depth = zone && zone.type === 'abyss' ? Math.max(1, (zone.id || ABYSS_START_ZONE_ID) - (ABYSS_START_ZONE_ID - 1)) : 1;
    let endlessDepth = Math.max(depth, Math.floor(game.abyssEndlessDepth || depth));
    let endlessOver = Math.max(0, endlessDepth - 20);
    let endlessMul = endlessOver > 0 ? Math.pow(1.18, endlessOver) : 1;
    return {
        dmgMul: 1 + (state.power || 0) * 0.02,
        hpMul: (1 + (state.tenacity || 0) * 0.02) * endlessMul,
        hordeMul: (1 + (state.horde || 0) * 0.03) * (1 + (state.magnifier || 0) * 0.2),
        dropMul: Math.max(0.2, 1 + ((state.power || 0) + (state.frailty || 0) + (state.resistance || 0) - (state.horde || 0)) * 0.01),
        expMul: Math.max(0.2, 1 + ((state.tenacity || 0) * 0.01) - ((state.horde || 0) * 0.02) + ((state.weakness || 0) * 0.02)),
        playerTakenMul: (1 + (state.frailty || 0) * 0.01) * (1 + endlessOver * 0.025),
        playerDamageMul: Math.max(0.2, 1 - (state.weakness || 0) * 0.01),
        resistBonus: (state.resistance || 0),
        eliteBonus: (state.elite || 0) * 0.02,
        bossMul: (1 - (state.coreRaid || 0) * 0.10) * (1 + (state.arrogance || 0) * 0.20),
        bossExtraCurrencyChance: (state.arrogance || 0) * 0.05,
        mapProgressMul: Math.max(0.35, 1 - (state.magnifier || 0) * 0.5),
        mapLengthMul: 1 + (state.magnifier || 0)
    };
}

function applySeasonContentProgression(options) {
    let opts = options || {};
    game.unlockedSeasonContents = Array.isArray(game.unlockedSeasonContents) ? game.unlockedSeasonContents : [];
    game.seenSeasonContentNotices = Array.isArray(game.seenSeasonContentNotices) ? game.seenSeasonContentNotices : [];
    let maxSeason = Math.max(1, Math.min(20, game.season || 1));
    for (let s = 1; s <= maxSeason; s++) {
        let key = `season_${s}`;
        if (!game.unlockedSeasonContents.includes(key)) game.unlockedSeasonContents.push(key);
        if (!opts.silent && !game.seenSeasonContentNotices.includes(key) && SEASON_CONTENT_ROADMAP[s]) {
            let def = SEASON_CONTENT_ROADMAP[s];
            addLog(`🧩 루프 ${s} [${def.title}] 이정표 개방`, 'season-up');
            (def.features || []).slice(0, 2).forEach(line => addLog(`   - ${line}`, 'loot-magic'));
            game.seenSeasonContentNotices.push(key);
        }
    }
    let finalZone = getCurrentSeasonFinalZoneId();
    game.maxZoneId = clampNumber(Number.isFinite(game.maxZoneId) ? game.maxZoneId : 0, 0, finalZone);
    if (typeof game.currentZoneId !== 'string') game.currentZoneId = clampNumber(Number.isFinite(game.currentZoneId) ? game.currentZoneId : 0, 0, finalZone);
}

function getLoop10StatCost(statKey) {
    game.loop10BonusStats = game.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
    let lv = Math.max(0, Math.floor(game.loop10BonusStats[statKey] || 0));
    return 1 + Math.floor(lv / 3);
}

function allocateLoop10BonusStat(statKey) {
    if ((game.season || 1) < 10) return;
    let cost = getLoop10StatCost(statKey);
    if ((game.seasonPoints || 0) < cost) return addLog(`루프 포인트가 부족합니다. (필요: ${cost})`, 'attack-monster');
    game.loop10BonusStats = game.loop10BonusStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 };
    game.loop10BonusStats[statKey] = Math.max(0, Math.floor(game.loop10BonusStats[statKey] || 0)) + 1;
    game.seasonPoints -= cost;
    addLog(`🧬 루프10 강화: ${getStatName(statKey)} 투자 +1 (비용 ${cost})`, 'season-up');
    updateStaticUI();
}

function enterNextEndlessChaosDepth() {
    if ((game.season || 1) < 10) return;
    game.abyssEndlessDepth = Math.max(20, Math.floor(game.abyssEndlessDepth || 20) + 1);
    game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
    if (!game.abyssUnlockedDepths.includes(game.abyssEndlessDepth)) game.abyssUnlockedDepths.push(game.abyssEndlessDepth);
    game.currentZoneId = ABYSS_START_ZONE_ID + 19;
    game.killsInZone = 0;
    addLog(`♾️ 혼돈 심화 ${game.abyssEndlessDepth}층 진입`, 'season-up');
    startMoving(true);
    updateStaticUI();
}

function enterUnlockedEndlessDepth(depth) {
    if ((game.season || 1) < 10) return;
    game.abyssUnlockedDepths = Array.isArray(game.abyssUnlockedDepths) ? game.abyssUnlockedDepths : [20];
    depth = Math.max(20, Math.floor(depth || 20));
    if (!game.abyssUnlockedDepths.includes(depth)) return addLog('아직 도달하지 않은 심화 층수입니다.', 'attack-monster');
    game.abyssEndlessDepth = depth;
    game.currentZoneId = ABYSS_START_ZONE_ID + 19;
    game.killsInZone = 0;
    addLog(`🧭 기록된 혼돈 심화 ${depth}층으로 이동`, 'season-up');
    startMoving(true);
    updateStaticUI();
}

function getLoopDeepStatCost(statKey) {
    game.loopDeepStats = game.loopDeepStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
    let lv = Math.max(0, Math.floor(game.loopDeepStats[statKey] || 0));
    return 1 + Math.floor(lv / 2);
}

function allocateLoopDeepStat(statKey) {
    if ((game.season || 1) < 10) return;
    let cost = getLoopDeepStatCost(statKey);
    if ((game.loopDeepPoints || 0) < cost) return addLog(`심화 루프 포인트가 부족합니다. (필요: ${cost})`, 'attack-monster');
    game.loopDeepStats = game.loopDeepStats || { flatHp: 0, flatDmg: 0, aspd: 0, move: 0, dr: 0, crit: 0 };
    game.loopDeepStats[statKey] = Math.max(0, Math.floor(game.loopDeepStats[statKey] || 0)) + 1;
    game.loopDeepPoints -= cost;
    addLog(`🧬 심화 루프 강화: ${getStatName(statKey)} Lv.${game.loopDeepStats[statKey]} (비용 ${cost})`, 'season-up');
    updateStaticUI();
}

const CLASS_TEMPLATES = {
    warrior: { name: '워리어', desc: '강력한 물리 공격과 높은 생존력', m1: 'physPctDmg', m2: 'flatHp', d: 'dr' },
    gladiator: { name: '글래디에이터', desc: '빠른 공격속도와 연속 타격', m1: 'meleePctDmg', m2: 'ds', d: 'aspd' },
    assassin: { name: '어쌔신', desc: '치명타 확률과 막대한 치명타 피해', m1: 'crit', m2: 'critDmg', d: 'chaosPctDmg' },
    ranger: { name: '레인저', desc: '신속한 이동과 투사체 장악', m1: 'projectilePctDmg', m2: 'move', d: 'crit' },
    elementalist: { name: '엘리멘탈리스트', desc: '원소 피해와 원소 저항 특화', m1: 'elementalPctDmg', m2: 'resAll', d: 'regen' },
    warlock: { name: '워록', desc: '혼돈 피해와 생명력 흡수', m1: 'chaosPctDmg', m2: 'dotPctDmg', d: 'pctHp' },
    guardian: { name: '가디언', desc: '압도적인 최대 생명력과 방어', m1: 'flatHp', m2: 'pctHp', d: 'regen' },
    inquisitor: { name: '인퀴지터', desc: '원소 치명타 및 보조 스킬 전문', m1: 'elementalPctDmg', m2: 'critDmg', d: 'suppCap' }
};

const SEASON_NODES = {
    s_root: { name: '시작의 축복', desc: '경험치 +20%', stat: 'expGain', val: 20, req: null },
    s_dmg: { name: '전사의 혼', desc: '피해 +30%', stat: 'pctDmg', val: 30, req: 's_root' },
    s_hp: { name: '거인의 혼', desc: '생명력 +30%', stat: 'pctHp', val: 30, req: 's_root' },
    s_crit: { name: '정밀 타격', desc: '치명타 +10%', stat: 'crit', val: 10, req: 's_dmg' },
    s_dot: { name: '부패 확장', desc: '지속 피해 배율 +12%', stat: 'dotPctDmg', val: 12, req: 's_dmg' },
    s_leech: { name: '질주의 피', desc: '이동 속도 +8%', stat: 'move', val: 8, req: 's_hp' },
    s_guard: { name: '철벽 맥', desc: '물리 피해 감소 +8%', stat: 'dr', val: 8, req: 's_hp' },
    s_speed: { name: '가속 박동', desc: '공격 속도 +8%', stat: 'aspd', val: 8, req: 's_dmg' },
    s_rend: { name: '갑주 균열', desc: '물리 피해 감소 무시 +5%', stat: 'physIgnore', val: 5, req: 's_crit' },
    s_breach: { name: '저항 균열', desc: '저항 관통 +5%', stat: 'resPen', val: 5, req: 's_crit' },
    s_momentum: { name: '전투 탄성', desc: '연속 타격 +10%', stat: 'ds', val: 10, req: ['s_speed', 's_leech'] },
    s_focus: { name: '살의 응축', desc: '치명타 피해 +35%', stat: 'critDmg', val: 35, req: ['s_speed', 's_leech'] },
    s_vital: { name: '생명의 잔향', desc: '최대 생명력 +80', stat: 'flatHp', val: 80, req: 's_guard' },
    s_blood: { name: '혈류 순환', desc: '초당 재생 +1.2%', stat: 'regen', val: 1.2, req: 's_guard' },
    s_skirmish: { name: '기동 사수', desc: '투사체 피해 +22%', stat: 'projectilePctDmg', val: 22, req: 's_leech' },
    s_fury: { name: '난전 갈증', desc: '근접 피해 +22%', stat: 'meleePctDmg', val: 22, req: 's_leech' },
    s_bruise: { name: '골절 충격', desc: '물리 피해 +24%', stat: 'physPctDmg', val: 24, req: 's_rend' },
    s_prism: { name: '분광 붕괴', desc: '원소 피해 +24%', stat: 'elementalPctDmg', val: 24, req: 's_breach' },
    s_ruin: { name: '공허 침식', desc: '카오스 피해 +24%', stat: 'chaosPctDmg', val: 24, req: 's_breach' },
    s_king: { name: '군주의 압제', desc: '물리 피해 감소 무시 +10%', stat: 'physIgnore', val: 10, req: ['s_fury', 's_bruise'] },
    s_cataclysm: { name: '대균열의 끝', desc: '저항 관통 +10%', stat: 'resPen', val: 10, req: ['s_prism', 's_ruin'] },
    s_floor: { name: '확정 타격', desc: '최소 피해 보정 +8%', stat: 'minDmgRoll', val: 8, req: 's_focus' },
    s_ceil: { name: '극한 상한', desc: '최대 피해 보정 +8%', stat: 'maxDmgRoll', val: 8, req: 's_cataclysm' }
};
const SEASON_NODE_ROWS = [
    ['s_root'],
    ['s_dmg', 's_hp'],
    ['s_crit', 's_dot', 's_speed'],
    ['s_guard', 's_leech'],
    ['s_rend', 's_breach', 's_momentum', 's_focus'],
    ['s_vital', 's_blood', 's_skirmish', 's_fury'],
    ['s_bruise', 's_prism', 's_ruin'],
    ['s_king', 's_cataclysm'],
    ['s_floor', 's_ceil']
];

const JEWEL_INVENTORY_LIMIT = 40;
const JEWEL_RARITY_ORDER = ['normal', 'magic', 'rare'];






const P_STATS = {
    flatHp: { name: '최대 생명력', tiers: [1, 2], s: 5, m: 15 },
    pctHp: { name: '생명력(%)', tiers: [2, 3], m: 2, k: 5, isPct: true },
    regen: { name: '초당 재생(%)', tiers: [1, 2], s: 0.1, m: 0.3, isPct: true },
    regenSuppress: { name: '재생 억제(%)', tiers: [3], k: 0.5, isPct: true },
    flatDmg: { name: '기본 피해', tiers: [1, 2], s: 2, m: 8 },
    pctDmg: { name: '피해(%)', tiers: [2, 3], m: 5, k: 15, isPct: true },
    meleePctDmg: { name: '근접 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    projectilePctDmg: { name: '투사체 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    physPctDmg: { name: '물리 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    elementalPctDmg: { name: '원소 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    firePctDmg: { name: '화염 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    coldPctDmg: { name: '냉기 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    lightPctDmg: { name: '번개 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    chaosPctDmg: { name: '카오스 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    aoePctDmg: { name: '범위 피해(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    dotPctDmg: { name: '지속 피해 배율(%)', tiers: [1, 2, 3], s: 4, m: 8, k: 16, isPct: true },
    aspd: { name: '공격 속도(%)', tiers: [1, 2, 3], s: 1.5, m: 4, k: 8, isPct: true },
    move: { name: '이동 속도(%)', tiers: [1, 2], s: 1.5, m: 4, isPct: true },
    crit: { name: '치명타 확률(%)', tiers: [2, 3], m: 1.5, k: 4, isPct: true },
    critDmg: { name: '치명타 피해 배율(%)', tiers: [3], k: 25, isPct: true },
    leech: { name: '생명력 흡수(%)', tiers: [2, 3], m: 0.4, k: 1.5, isPct: true },
    gemLevel: { name: '스킬 젬 레벨', tiers: [3], k: 1 },
    dr: { name: '물리 피해 감소(%)', tiers: [3], k: 4, isPct: true },
    physIgnore: { name: '물리 피해 감소 무시(%)', tiers: [2, 3], m: 3, k: 6, isPct: true },
    ds: { name: '연속 타격(%)', tiers: [3], k: 8, isPct: true },
    suppCap: { name: '보조 스킬 젬 한도', tiers: [3], k: 1 },
    resPen: { name: '저항 관통(%)', tiers: [2, 3], m: 2, k: 5, isPct: true },
    resF: { name: '화염 저항(%)', tiers: [2], m: 5, isPct: true },
    resC: { name: '냉기 저항(%)', tiers: [2], m: 5, isPct: true },
    resL: { name: '번개 저항(%)', tiers: [2], m: 5, isPct: true },
    resAll: { name: '모든 원소 저항(%)', tiers: [3], k: 4, isPct: true },
    resChaos: { name: '카오스 저항(%)', tiers: [3], k: 4, isPct: true },
    expGain: { name: '경험치 획득(%)', tiers: [2, 3], m: 5, k: 12, isPct: true },
    minDmgRoll: { name: '최소 피해 보정(%)', tiers: [1, 2, 3], s: 1, m: 2, k: 4, isPct: true },
    maxDmgRoll: { name: '최대 피해 보정(%)', tiers: [1, 2, 3], s: 1, m: 2, k: 4, isPct: true }
};

Object.keys(SKILL_DB).forEach(name => {
    let skill = SKILL_DB[name];
    if (!skill || !skill.isGem) return;
    if (Number.isFinite(skill.baseDmg)) skill.baseDmg = Number((skill.baseDmg * 1.62).toFixed(3));
    if (Number.isFinite(skill.dmgScale) && skill.dmgScale > 0) skill.dmgScale = Number((skill.dmgScale * 1.9).toFixed(4));
});

const SUPPORT_GEM_DB = {
    '가속': { baseVal: 1, scale: 0.5, stat: 'aspd', name: '공격 속도', isPct: true, desc: '공격 속도를 올립니다.' },
    '가벼운 발걸음': { baseVal: 1, scale: 1.0, stat: 'move', name: '이동 속도', isPct: true, desc: '맵 진행 속도를 높입니다.' },
    '날카로움': { baseVal: 0.2, scale: 0.3, stat: 'crit', name: '치명타 확률', isPct: true, desc: '치명타 확률을 올립니다.' },
    '근접 물리 피해': { baseVal: 5, scale: 2.0, stat: 'meleePctDmg', name: '근접 피해', isPct: true, desc: '근접 태그가 달린 스킬의 피해를 높입니다.' },
    '투사체 강화': { baseVal: 5, scale: 2.0, stat: 'projectilePctDmg', name: '투사체 피해', isPct: true, desc: '투사체 태그 스킬을 강화합니다.' },
    '원소 집중': { baseVal: 5, scale: 2.0, stat: 'elementalPctDmg', name: '원소 피해', isPct: true, desc: '원소 태그 스킬을 강화합니다.' },
    '화염 주입': { baseVal: 5, scale: 2.0, stat: 'firePctDmg', name: '화염 피해', isPct: true, desc: '화염 스킬의 피해를 높입니다.' },
    '냉기 증폭': { baseVal: 5, scale: 2.0, stat: 'coldPctDmg', name: '냉기 피해', isPct: true, desc: '냉기 스킬의 피해를 높입니다.' },
    '번개 전도': { baseVal: 5, scale: 2.0, stat: 'lightPctDmg', name: '번개 피해', isPct: true, desc: '번개 스킬의 피해를 높입니다.' },
    '혼돈 전환': { baseVal: 5, scale: 2.0, stat: 'chaosPctDmg', name: '카오스 피해', isPct: true, desc: '카오스 스킬의 피해를 높입니다.' },
    '범위 확장': { baseVal: 5, scale: 2.0, stat: 'aoePctDmg', name: '범위 피해', isPct: true, desc: '범위 태그 스킬의 피해를 높입니다.' },
    '지속 확산': { baseVal: 6, scale: 2.2, stat: 'dotPctDmg', name: '지속 피해 배율', isPct: true, desc: 'dot 태그 스킬의 지속 피해 배율을 올립니다.' },
    '무자비': { baseVal: 10, scale: 3.0, stat: 'critDmg', name: '치명타 피해', isPct: true, desc: '치명타 배율을 높입니다.' },
    '생명력 흡수': { baseVal: 0.5, scale: 0.2, stat: 'leech', name: '생명력 흡수', isPct: true, desc: '공격 시 흡혈을 부여합니다.' },
    '연속타격': { baseVal: 5, scale: 1.0, stat: 'ds', name: '연속 타격 확률', isPct: true, desc: '한 번 더 타격할 확률을 부여합니다.' },
    '방어 상승': { baseVal: 2, scale: 0.5, stat: 'dr', name: '받는 피해 감소', isPct: true, desc: '물리 피해 감소를 올립니다.' },
    '갑주 파쇄': { baseVal: 3, scale: 0.8, stat: 'physIgnore', name: '물피감 무시', isPct: true, desc: '물리 공격이 적의 물리 피해 감소를 더 깊게 파고듭니다.' },
    '저항 침식': { baseVal: 3, scale: 0.8, stat: 'resPen', name: '저항 관통', isPct: true, desc: '원소/카오스 공격이 적의 저항을 꿰뚫습니다.' },
    '활력': { baseVal: 0.2, scale: 0.1, stat: 'regen', name: '초당 생명력 재생', isPct: true, desc: '초당 생명력 재생을 제공합니다.' },
    '재생 억제': { baseVal: 0.1, scale: 0.03, stat: 'regenSuppress', name: '재생 억제', isPct: true, desc: '공격 시 적의 생명력 재생을 해당 수치(%)만큼 감소시킵니다.' },
    '정밀 하한': { baseVal: 2, scale: 0.8, stat: 'minDmgRoll', name: '최소 피해 보정', isPct: true, desc: '무기 피해 하한을 올려 딜 편차를 줄입니다.' },
    '과충전 상한': { baseVal: 2, scale: 0.8, stat: 'maxDmgRoll', name: '최대 피해 보정', isPct: true, desc: '무기 피해 상한을 올려 고점 피해를 확장합니다.' },
    '화염 장막': { baseVal: 4, scale: 1.2, stat: 'resF', name: '화염 저항', isPct: true, desc: '화염 저항을 강화합니다.' },
    '냉기 장막': { baseVal: 4, scale: 1.2, stat: 'resC', name: '냉기 저항', isPct: true, desc: '냉기 저항을 강화합니다.' },
    '번개 장막': { baseVal: 4, scale: 1.2, stat: 'resL', name: '번개 저항', isPct: true, desc: '번개 저항을 강화합니다.' },
    '공허 장막': { baseVal: 3, scale: 1.0, stat: 'resChaos', name: '카오스 저항', isPct: true, desc: '카오스 저항을 강화합니다.' },
    '물리 전령': { baseVal: 8, scale: 3.2, stat: 'flatDmg', name: '물리 플랫 피해', isPct: false, desc: '물리 플랫 피해를 높이고 처치 시 시체폭발 확률을 부여합니다.', heraldExplodeBase: 0.06, heraldExplodeScale: 0.004 },
    '화염 전령': { baseVal: 8, scale: 3.2, stat: 'flatDmg', name: '화염 플랫 피해', isPct: false, desc: '화염 플랫 피해를 높이고 처치 시 시체폭발 확률을 부여합니다.', heraldExplodeBase: 0.06, heraldExplodeScale: 0.004 },
    '냉기 전령': { baseVal: 8, scale: 3.2, stat: 'flatDmg', name: '냉기 플랫 피해', isPct: false, desc: '냉기 플랫 피해를 높이고 처치 시 시체폭발 확률을 부여합니다.', heraldExplodeBase: 0.06, heraldExplodeScale: 0.004 },
    '번개 전령': { baseVal: 8, scale: 3.2, stat: 'flatDmg', name: '번개 플랫 피해', isPct: false, desc: '번개 플랫 피해를 높이고 처치 시 시체폭발 확률을 부여합니다.', heraldExplodeBase: 0.06, heraldExplodeScale: 0.004 },
    '카오스 전령': { baseVal: 8, scale: 3.2, stat: 'flatDmg', name: '카오스 플랫 피해', isPct: false, desc: '카오스 플랫 피해를 높이고 처치 시 시체폭발 확률을 부여합니다.', heraldExplodeBase: 0.06, heraldExplodeScale: 0.004 }
};

const MOD_DB = [
    { id: 'flatDmg', type: 'prefix', statName: '기본 피해', slots: ['무기', '반지', '목걸이', '허리띠', '장갑'], base: 3, step: 3 },
    { id: 'pctDmg', type: 'prefix', statName: '피해 증가(%)', slots: ['무기', '반지', '목걸이'], base: 5, step: 4 },
    { id: 'meleePctDmg', type: 'prefix', statName: '근접 피해(%)', slots: ['무기', '장갑', '목걸이', '허리띠'], base: 5, step: 4 },
    { id: 'projectilePctDmg', type: 'prefix', statName: '투사체 피해(%)', slots: ['무기', '반지', '장갑', '목걸이'], base: 5, step: 4 },
    { id: 'physPctDmg', type: 'prefix', statName: '물리 피해(%)', slots: ['무기', '허리띠', '반지'], base: 5, step: 4 },
    { id: 'elementalPctDmg', type: 'prefix', statName: '원소 피해(%)', slots: ['무기', '반지', '목걸이'], base: 5, step: 4 },
    { id: 'firePctDmg', type: 'prefix', statName: '화염 피해(%)', slots: ['무기', '반지', '목걸이'], base: 4, step: 3 },
    { id: 'coldPctDmg', type: 'prefix', statName: '냉기 피해(%)', slots: ['무기', '반지', '목걸이'], base: 4, step: 3 },
    { id: 'lightPctDmg', type: 'prefix', statName: '번개 피해(%)', slots: ['무기', '반지', '목걸이'], base: 4, step: 3 },
    { id: 'chaosPctDmg', type: 'prefix', statName: '카오스 피해(%)', slots: ['무기', '반지', '목걸이', '장갑'], base: 4, step: 3 },
    { id: 'aoePctDmg', type: 'prefix', statName: '범위 피해(%)', slots: ['무기', '투구', '목걸이', '갑옷'], base: 4, step: 3 },
    { id: 'dotPctDmg', type: 'prefix', statName: '지속 피해 배율(%)', slots: ['무기', '반지', '목걸이'], base: 4, step: 3 },
    { id: 'flatHp', type: 'prefix', statName: '최대 생명력', slots: ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠'], base: 15, step: 10 },
    { id: 'armor', type: 'prefix', statName: '방어도', slots: ['투구', '갑옷', '장갑', '신발'], base: 12, step: 10 },
    { id: 'evasion', type: 'prefix', statName: '회피', slots: ['투구', '갑옷', '장갑', '신발'], base: 12, step: 10 },
    { id: 'energyShield', type: 'prefix', statName: '에너지 보호막', slots: ['투구', '갑옷', '장갑', '신발'], base: 9, step: 8 },
    { id: 'armorPct', type: 'suffix', statName: '방어도 증가(%)', slots: ['투구', '갑옷', '장갑', '신발'], base: 6, step: 4 },
    { id: 'evasionPct', type: 'suffix', statName: '회피 증가(%)', slots: ['투구', '갑옷', '장갑', '신발'], base: 6, step: 4 },
    { id: 'energyShieldPct', type: 'suffix', statName: '에너지 보호막 증가(%)', slots: ['투구', '갑옷', '장갑', '신발'], base: 6, step: 4 },
    { id: 'pctHp', type: 'suffix', statName: '생명력 증가(%)', slots: ['갑옷', '허리띠'], base: 4, step: 3 },
    { id: 'aspd', type: 'suffix', statName: '공격 속도(%)', slots: ['무기', '반지', '목걸이', '허리띠', '장갑'], base: 2, step: 2 },
    { id: 'crit', type: 'suffix', statName: '치명타 확률(%)', slots: ['무기', '투구', '갑옷', '장갑', '신발', '목걸이', '반지', '허리띠'], base: 1, step: 1 },
    { id: 'move', type: 'suffix', statName: '이동 속도(%)', slots: ['신발'], base: 4, step: 2 },
    { id: 'gemLevel', type: 'special', statName: '모든 스킬 젬 레벨', slots: ['목걸이'], base: 1, step: 0 },
    { id: 'physIgnore', type: 'suffix', statName: '물리 피해 감소 무시(%)', slots: ['무기', '장갑', '목걸이'], base: 1, step: 0.9 },
    { id: 'resF', type: 'suffix', statName: '화염 저항(%)', slots: ['반지', '목걸이', '갑옷', '투구', '신발', '장갑', '허리띠'], base: 5, step: 3 },
    { id: 'resC', type: 'suffix', statName: '냉기 저항(%)', slots: ['반지', '목걸이', '갑옷', '투구', '신발', '장갑', '허리띠'], base: 5, step: 3 },
    { id: 'resL', type: 'suffix', statName: '번개 저항(%)', slots: ['반지', '목걸이', '갑옷', '투구', '신발', '장갑', '허리띠'], base: 5, step: 3 },
    { id: 'resAll', type: 'suffix', statName: '모든 원소 저항(%)', slots: ['반지', '목걸이', '갑옷'], base: 3, step: 2 },
    { id: 'resChaos', type: 'suffix', statName: '카오스 저항(%)', slots: ['반지'], base: 2, step: 1.4 },
    { id: 'resPen', type: 'suffix', statName: '저항 관통(%)', slots: ['무기', '반지', '목걸이'], base: 0, step: 0.8 },
    { id: 'regen', type: 'suffix', statName: '초당 재생(%)', slots: ['갑옷', '허리띠', '목걸이'], base: 0.2, step: 0.1 },
    { id: 'regenSuppress', type: 'suffix', statName: '재생 억제(%)', slots: ['허리띠'], base: 0.3, step: 0.06 },
    { id: 'regenSuppressGloves', statId: 'regenSuppress', type: 'suffix', statName: '재생 억제(%)', slots: ['장갑'], base: 0.05, step: 0.07 },
    { id: 'regenSuppressAmulet', statId: 'regenSuppress', type: 'suffix', statName: '재생 억제(%)', slots: ['목걸이'], base: 0.1, step: 0 },
    { id: 'targetAny', type: 'special', statName: '스킬 타겟 수', slots: ['장갑'], base: 1, step: 0, weight: 0.45 },
    { id: 'targetProjectile', type: 'special', statName: '투사체 스킬 타겟 수', slots: ['무기'], base: 1, step: 0, weight: 0.45 },
    { id: 'targetSlam', type: 'special', statName: '강타 스킬 타겟 수', slots: ['무기'], base: 1, step: 0, weight: 0.45 },
    { id: 'leech', type: 'suffix', statName: '생명력 흡수(%)', slots: ['무기', '장갑', '반지'], base: 0.3, step: 0.2 },
    { id: 'dr', type: 'suffix', statName: '물리 피해 감소(%)', slots: ['갑옷', '허리띠', '투구'], base: 2, step: 2 },
    { id: 'critDmg', type: 'suffix', statName: '치명타 피해 배율(%)', slots: ['무기', '목걸이', '투구'], base: 10, step: 6 },
    { id: 'ds', type: 'suffix', statName: '연속 타격(%)', slots: ['장갑', '무기'], base: 5, step: 3 },
    { id: 'minDmgRollWeapon', statId: 'minDmgRoll', type: 'suffix', statName: '최소 피해 보정(%)', slots: ['무기'], base: 4, step: 2 },
    { id: 'maxDmgRollWeapon', statId: 'maxDmgRoll', type: 'suffix', statName: '최대 피해 보정(%)', slots: ['무기'], base: 4, step: 2 },
    { id: 'suppCap', type: 'special', statName: '보조 스킬 젬 한도', slots: ['목걸이'], base: 1, step: 0 }
];

const FOSSIL_DB = [
    { key: 'fossilJagged', name: '톱니 화석', desc: '카오스 재련 + 물리/근접 계열 옵션 1개 확정', guaranteedStats: ['physPctDmg', 'meleePctDmg', 'flatDmg', 'physIgnore'] },
    { key: 'fossilBound', name: '속박 화석', desc: '카오스 재련 + 생명/방어 계열 옵션 1개 확정', guaranteedStats: ['flatHp', 'pctHp', 'dr'] },
    { key: 'fossilGale', name: '돌풍 화석', desc: '카오스 재련 + 속도/치명 계열 옵션 1개 확정', guaranteedStats: ['aspd', 'crit', 'move'] },
    { key: 'fossilPrismatic', name: '프리즘 화석', desc: '카오스 재련 + 저항/원소 계열 옵션 1개 확정', guaranteedStats: ['resAll', 'resF', 'resC', 'resL', 'elementalPctDmg', 'resPen'] },
    { key: 'fossilAbyssal', name: '심연 화석', desc: '카오스 재련 + 화석 전용 특수 옵션 등장 확률 대폭 증가', guaranteedStats: ['chaosPctDmg', 'leech', 'regen'], bonusExclusiveChance: 0.42 }
];

const FOSSIL_EXCLUSIVE_MODS = [
    { id: 'fossilVoidHeart', statId: 'chaosPctDmg', type: 'special', statName: '심연 맥동 (카오스 피해%)', slots: ['무기', '목걸이', '반지'], base: 10, step: 5, fossilExclusive: true },
    { id: 'fossilWarMarch', statId: 'move', type: 'special', statName: '군단 진군 (이동 속도%)', slots: ['신발', '허리띠'], base: 8, step: 3, fossilExclusive: true },
    { id: 'fossilSoulWard', statId: 'resAll', type: 'special', statName: '영혼 수호 (모든 원소 저항%)', slots: ['갑옷', '투구', '허리띠'], base: 8, step: 3, fossilExclusive: true },
    { id: 'fossilGemPulse', statId: 'gemLevel', type: 'special', statName: '룬 맥동 (스킬 젬 레벨)', slots: ['목걸이'], base: 1, step: 0, fossilExclusive: true },
    { id: 'fossilSupportLink', statId: 'suppCap', type: 'special', statName: '결속 잔향 (보조 젬 한도)', slots: ['목걸이'], base: 1, step: 0, fossilExclusive: true },
    { id: 'fossilArmorRift', statId: 'physIgnore', type: 'special', statName: '전쟁 균열 (물피감 무시%)', slots: ['무기', '장갑', '목걸이'], base: 4, step: 1.6, fossilExclusive: true },
    { id: 'fossilPrismNeedle', statId: 'resPen', type: 'special', statName: '프리즘 송곳 (저항 관통%)', slots: ['무기', '목걸이', '반지'], base: 4, step: 1.4, fossilExclusive: true },
    { id: 'fossilBoundFloor', statId: 'minDmgRoll', type: 'special', statName: '결속 하한 (최소 피해 보정%)', slots: ['무기', '장갑'], base: 3, step: 1.2, fossilExclusive: true },
    { id: 'fossilSkyCeil', statId: 'maxDmgRoll', type: 'special', statName: '천공 상한 (최대 피해 보정%)', slots: ['무기', '장갑'], base: 3, step: 1.2, fossilExclusive: true }
];

const BASE_ITEM_DB = [
    { id: 'rusted_blade', slot: '무기', name: '녹슨 검', reqTier: 1, baseStats: [{ id: 'flatDmg', base: 4 }] },
    { id: 'hunter_axe', slot: '무기', name: '사냥꾼의 도끼', reqTier: 3, baseStats: [{ id: 'flatDmg', base: 8 }, { id: 'crit', base: 3 }] },
    { id: 'abyss_spear', slot: '무기', name: '심연의 창', reqTier: 7, baseStats: [{ id: 'flatDmg', base: 14 }, { id: 'aspd', base: 6 }] },
    { id: 'cloth_hood', slot: '투구', name: '천 후드', reqTier: 1, baseStats: [{ id: 'flatHp', base: 12 }, { id: 'energyShield', base: 36 }] },
    { id: 'war_helm', slot: '투구', name: '전투 투구', reqTier: 4, baseStats: [{ id: 'flatHp', base: 28 }, { id: 'armor', base: 70 }, { id: 'dr', base: 2 }] },
    { id: 'void_crown', slot: '투구', name: '공허 왕관', reqTier: 8, baseStats: [{ id: 'flatHp', base: 50 }, { id: 'energyShield', base: 108 }, { id: 'resChaos', base: 6 }] },
    { id: 'leather_vest', slot: '갑옷', name: '가죽 갑옷', reqTier: 1, baseStats: [{ id: 'flatHp', base: 20 }, { id: 'evasion', base: 74 }] },
    { id: 'plate_mail', slot: '갑옷', name: '판금 갑옷', reqTier: 4, baseStats: [{ id: 'flatHp', base: 42 }, { id: 'armor', base: 146 }, { id: 'dr', base: 3 }] },
    { id: 'astral_plate', slot: '갑옷', name: '별빛 흉갑', reqTier: 8, baseStats: [{ id: 'flatHp', base: 70 }, { id: 'armor', base: 120 }, { id: 'evasion', base: 120 }, { id: 'resAll', base: 6 }] },
    { id: 'hide_gloves', slot: '장갑', name: '가죽 장갑', reqTier: 1, baseStats: [{ id: 'aspd', base: 2 }, { id: 'evasion', base: 18 }] },
    { id: 'grip_gauntlets', slot: '장갑', name: '강철 건틀릿', reqTier: 4, baseStats: [{ id: 'aspd', base: 4 }, { id: 'flatHp', base: 16 }, { id: 'armor', base: 34 }] },
    { id: 'storm_touch', slot: '장갑', name: '폭풍 장갑', reqTier: 8, baseStats: [{ id: 'aspd', base: 7 }, { id: 'crit', base: 5 }, { id: 'evasion', base: 53 }, { id: 'energyShield', base: 53 }] },
    { id: 'rag_boots', slot: '신발', name: '헝겊 장화', reqTier: 1, baseStats: [{ id: 'move', base: 5 }, { id: 'energyShield', base: 27 }] },
    { id: 'ranger_boots', slot: '신발', name: '추적자 장화', reqTier: 4, baseStats: [{ id: 'move', base: 10 }, { id: 'flatHp', base: 14 }, { id: 'evasion', base: 51 }] },
    { id: 'phase_boots', slot: '신발', name: '위상 장화', reqTier: 8, baseStats: [{ id: 'move', base: 16 }, { id: 'energyShield', base: 76 }, { id: 'resC', base: 8 }] },
    { id: 'bone_amulet', slot: '목걸이', name: '뼈 목걸이', reqTier: 1, baseStats: [{ id: 'flatDmg', base: 1 }, { id: 'flatHp', base: 8 }] },
    { id: 'sage_amulet', slot: '목걸이', name: '현자의 목걸이', reqTier: 5, baseStats: [{ id: 'crit', base: 4 }, { id: 'resAll', base: 4 }] },
    { id: 'star_pendant', slot: '목걸이', name: '성좌 펜던트', reqTier: 9, baseStats: [{ id: 'gemLevel', base: 1 }, { id: 'pctDmg', base: 8 }] },
    { id: 'copper_ring', slot: '반지', name: '구리 반지', reqTier: 1, baseStats: [{ id: 'flatDmg', base: 1 }] },
    { id: 'opal_ring', slot: '반지', name: '오팔 반지', reqTier: 5, baseStats: [{ id: 'pctDmg', base: 6 }] },
    { id: 'sapphire_band', slot: '반지', name: '푸른 띠 반지', reqTier: 9, baseStats: [{ id: 'resAll', base: 6 }, { id: 'crit', base: 3 }] },
    { id: 'void_loop_ring', slot: '반지', name: '공허 고리', reqTier: 12, baseStats: [{ id: 'resChaos', base: 4 }, { id: 'chaosPctDmg', base: 7 }] },
    { id: 'eclipse_ring', slot: '반지', name: '식월 반지', reqTier: 15, baseStats: [{ id: 'resAll', base: 8 }, { id: 'resChaos', base: 5 }, { id: 'crit', base: 5 }] },
    { id: 'rope_belt', slot: '허리띠', name: '로프 허리띠', reqTier: 1, baseStats: [{ id: 'flatHp', base: 16 }] },
    { id: 'war_belt', slot: '허리띠', name: '전사의 허리띠', reqTier: 5, baseStats: [{ id: 'flatHp', base: 32 }, { id: 'dr', base: 2 }] },
    { id: 'stygian_vise', slot: '허리띠', name: '심연의 혁대', reqTier: 9, baseStats: [{ id: 'flatHp', base: 55 }, { id: 'resChaos', base: 8 }] },
    { id: 'blood_girdle', slot: '허리띠', name: '혈석 허리띠', reqTier: 12, baseStats: [{ id: 'flatHp', base: 72 }, { id: 'dr', base: 3 }, { id: 'resChaos', base: 10 }] },
    { id: 'nightmare_bind', slot: '허리띠', name: '악몽 결속대', reqTier: 15, baseStats: [{ id: 'flatHp', base: 92 }, { id: 'resAll', base: 7 }, { id: 'resChaos', base: 12 }] }
];


const HERO_SELECTION_ORDER = Object.keys(HERO_SELECTION_DEFS);

let cloudState = {
    initialized: false,
    configured: false,
    busy: false,
    session: null,
    user: null,
    isLoaded: false,
    lastMessage: '설정 전',
    lastRemoteUpdatedAt: 0,
    lastSyncAttemptAt: 0
};
let startupOverlayActive = true;
let gameplayStarted = false;
let loadingOverlayTimer = null;
let loadingOverlayProgress = 0;
let pendingMapRevealZoneId = null;
let pendingMapRevealToken = 0;
let lastRenderedMapListHtml = '';

safeExposeGlobals({ formatStoryActLabel, getStoryActByZoneId, getStoryActByOrder, getActZoneDisplayName, getStarWedgeUnlockReady, getZone, getSeasonAbyssDepthCap, getLoopAbyssRequirementText, getSeasonFinalZoneId, getCurrentSeasonFinalZoneId, getAbyssPassiveState, getAbyssPassiveSpent, getAbyssPassiveFreePoints, tryAllocateAbyssPassive, getAbyssMonsterScales, applySeasonContentProgression, getLoop10StatCost, allocateLoop10BonusStat, enterNextEndlessChaosDepth, enterUnlockedEndlessDepth, getLoopDeepStatCost, allocateLoopDeepStat });

// Phase-4 extracted default state schema.
const defaultGame = {
    saveVersion: 16,
    loopChallenge: null,
    loopChallengeHistory: [],
    level: 1,
    exp: 0,
    season: 1,
    loopCount: 0,
    woodsmanDefeatAttempts: 0,
    woodsmanSimulatorSeenLoop: false,
    currentZoneId: 0,
    maxZoneId: 0,
    killsInZone: 0,
    loopDeaths: 0,
    loopKills: 0,
    settings: {
        showCombatScene: true,
        showCombatLog: true,
        combatLogAggregate: true,
        combatLogRateLimit: true,
        showSpawnLog: true,
        showExpLog: true,
        showLootLog: true,
        showCrowdPauseLog: true,
        showDeathNotice: true,
        themeMode: 'dark',
        leftPaneCollapsed: false,
        combatLogCollapsed: false,
        autoSalvageEnabled: false,
        autoSalvageRarities: { normal: true, magic: true, rare: false, unique: false },
        itemFilterEnabled: false,
        itemFilterRarities: { normal: true, magic: true, rare: true, unique: true },
        itemFilterTierThreshold: 10,
        itemFilterMinTierCount: 0,
        itemFilterMinHiddenTier: 1,
        itemFilterOnlyNewCodexUnique: false,
        jewelAutoSalvageEnabled: false,
        jewelAutoSalvageRarities: { normal: false, magic: false, rare: false },
        mapCompleteAction: 'nextZone',
        townReturnAction: 'retry',
        notiFilters: { char: true, season: true, items: true, skills: true, map: true, codex: true, traits: true, talisman: true, jewel: true, journal: true, currency: true, fossil: true, ascend: true, loop: true }
    },
    selectedHeroId: 'hero1',
    discoveredHeroIds: ['hero1'],
    heroSelectionInitialized: false,
    heroFreeSwitchUnlocked: false,
    pendingLoopHeroSelection: false,
    passivePoints: 0,
    playerHp: 100,
    playerEnergyShield: 0,
    moveTimer: 0,
    moveTotalTime: 0,
    isTownReturning: false,
    combatHalted: false,
    inTicketBossFight: false,
    runProgress: 0,
    encounterIndex: 0,
    encounterPlan: [],
    enemies: [],
    playerAilments: [],
    nextEnemyId: 1,
    passives: [],
    discoveredPassives: [],
    passiveLayoutVersion: PASSIVE_LAYOUT_VERSION,
    passiveStarEvolution: false,
    skills: ['기본 공격'],
    activeSkill: '기본 공격',
    gemData: {},
    supports: [],
    sealedSkills: [],
    sealedSupports: [],
    resonancePower: 10,
    equippedSupports: [],
    supportGemData: {},
    itemSubtab: 'item-tab-equip',
    skillSubtab: 'skill-tab-equip',
    mapSubtab: 'map-tab-zones',
    gemFoldInactiveAttack: false,
    gemFoldInactiveSupport: false,
    autoRepeatSeasonBoss: false,
    talismanUnlocked: false,
    talismanBoardUnlock: 3,
    talismanUnlockedCells: [],
    talismanInventory: [],
    talismanBoard: [],
    talismanPlacements: {},
    talismanSelectedId: null,
    talismanUnseal: null,
    talismanUnlockPickMode: false,
    equipment: { '무기': null, '투구': null, '갑옷': null, '장갑1': null, '장갑2': null, '신발': null, '목걸이': null, '반지1': null, '반지2': null, '허리띠': null },
    inventory: [],
    inventoryExpandLevel: 0,
    jewelInventoryExpandLevel: 0,
    abyssPassivePoints: 0,
    abyssClearedDepths: [],
    abyssPassives: { power: 0, tenacity: 0, horde: 0, frailty: 0, weakness: 0, resistance: 0, elite: 0, coreRaid: 0, arrogance: 0, magnifier: 0 },
    currencies: { transmute: 0, augment: 0, alteration: 0, alchemy: 0, exalted: 0, regal: 0, chaos: 0, divine: 0, scour: 0, bossKeyFlame: 0, bossKeyFrost: 0, bossKeyStorm: 0, beastKeyCerberus: 0, bossCore: 0, fossil: 0, fossilJagged: 0, fossilBound: 0, fossilGale: 0, fossilPrismatic: 0, fossilAbyssal: 0, skyEssence: 0, tainted: 0, jewelCore: 0, jewelShard: 0, sealShard: 0, strongSealShard: 0, meteorShard: 0, incompleteStarWedge: 0, starWedge: 0 , hiveKey: 0, enchantedHoney: 0, venomStinger: 0, pollen: 0, voidChisel: 0 },
    ascendClass: null,
    ascendPoints: 0,
    ascendRank: 0,
    ascendNodes: [],
    completedTrials: [],
    unlockedTrials: [],
    seasonPoints: 0,
    loopDeepPoints: 0,
    seasonNodes: [],
    labyrinthFloor: 1,
    jewelInventory: [],
    jewelSlots: [null, null],
    jewelSlotAmplify: [0, 0],
    beehive: { unlockedPermanent: false, inRun: false, branchStep: 0, cleared: false, routeSeed: 0 },
    voidRift: { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 },
    shrineState: { active: null, nextRollAt: 0 },
    shrineBuff: null,
    blackMarket: { nextRefreshAt: 0, extraSlots: 0, offers: [] },
    loop10ChaosStayEnabled: false,
    loop10BonusStats: { flatHp: 0, flatDmg: 0, aspd: 0, move: 0 },
    abyssEndlessDepth: 20,
    abyssUnlockedDepths: [20],
    loopDeepStats: { flatHp: 0, flatDmg: 0, aspd: 0, move: 0, dr: 0, crit: 0 },
    loopProgressBase: { abyssEndlessDepth: 20, labyrinthUnlockedMaxFloor: 1, specialBosses: [] },
    loopProgressCurrent: { specialBosses: [] },
    pendingLoopDecision: false,

    skyGemEnhancements: {},
    recentDamageEvents: [],
    lastDeathLog: null,
    unlockedSeasonContents: ['season_1'],
    seenSeasonContentNotices: ['season_1'],
    seenTutorials: [],
    journalEntries: ['prologue'],
    journalBonuses: [],
    journalBonusClaims: {},
    claimableActRewards: [],
    claimedActRewards: [],
    actRewardBonuses: [],
    seasonChaseUniqueDropped: false,
    gemEnhanceUnlocked: false,
    uniqueCodex: {},
    codexCollapsedSlots: {},
    uniqueCodexCompletedRewardClaimed: false,
    starWedge: {
        unlocked: false,
        unlockNoticeSeen: false,
        skyRiftGauge: 0,
        skyRiftReady: false,
        skyRiftMinTier: null,
        activeMeteorTier: null,
        entriesCleared: 0,
        firstClearDone: false,
        wedges: [],
        sockets: [],
        nodeMutations: {},
        selectedWedgeId: null
    },
    saveMeta: { lastModifiedAt: 0, lastCloudSyncAt: 0 },
    unlocks: { char: false, season: false, items: false, map: false, skills: false, codex: false, traits: false, talisman: false },
    noti: { char: false, season: false, items: false, skills: false, map: false, codex: false, traits: false, talisman: false, jewel: false, journal: false, currency: false, fossil: false, ascend: false, loop: false }
};


safeExposeGlobals({ defaultGame });

// Phase-4 extracted progression math helpers.
function getExpReq(level) {
    let lv = Math.max(1, Math.floor(level || 1));
    if (lv <= 10) return Math.floor((24 + Math.pow(lv, 1.34) * 14) * 4);
    if (lv <= 20) return Math.floor((24 + Math.pow(lv, 1.34) * 14) * 2);
    let base20 = Math.floor(24 + Math.pow(20, 1.34) * 14);
    if (lv <= 50) return Math.floor(base20 + 90 * Math.pow(lv - 20, 1.42));
    let base50 = Math.floor(base20 + 90 * Math.pow(30, 1.42));
    if (lv <= 100) return Math.floor(base50 + 252 * Math.pow(lv - 50, 1.55));
    let base100 = Math.floor(base50 + 252 * Math.pow(50, 1.55));
    let delta = lv - 100;
    return base100 + Math.floor(4200 * Math.pow(delta, 1.85) + 900 * delta * delta);
}
function getGemReqExp(level) { return Math.floor(100 * Math.pow(1.3, level - 1)); }
function normalizeGemRecord(raw) {
    if (!raw || typeof raw !== 'object') return { level: 1, exp: 0, bossCoreLevel: 0, skyCoreLevel: 0, skyEnhanceCap: 1, unlockedTier: 1, activeTier: 1 };
    let level = Number.isFinite(raw.level) ? Math.max(1, Math.floor(raw.level)) : 1;
    let exp = Number.isFinite(raw.exp) ? Math.max(0, raw.exp) : 0;
    let bossCoreLevel = Number.isFinite(raw.bossCoreLevel) ? Math.min(5, Math.max(0, Math.floor(raw.bossCoreLevel))) : 0;
    let skyCoreLevel = Number.isFinite(raw.skyCoreLevel) ? Math.min(5, Math.max(0, Math.floor(raw.skyCoreLevel))) : 0;
    let skyEnhanceCap = Number.isFinite(raw.skyEnhanceCap) ? Math.min(5, Math.max(1, Math.floor(raw.skyEnhanceCap))) : 1;
    let unlockedTier = Number.isFinite(raw.unlockedTier) ? Math.max(1, Math.min(3, Math.floor(raw.unlockedTier))) : 1;
    let activeTier = Number.isFinite(raw.activeTier) ? Math.max(1, Math.min(unlockedTier, Math.floor(raw.activeTier))) : 1;
    return { level: level, exp: exp, bossCoreLevel: bossCoreLevel, skyCoreLevel: skyCoreLevel, skyEnhanceCap: skyEnhanceCap, unlockedTier: unlockedTier, activeTier: activeTier };
}


safeExposeGlobals({ getExpReq, getGemReqExp, normalizeGemRecord });
