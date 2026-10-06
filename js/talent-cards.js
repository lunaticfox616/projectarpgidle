// ============================================================================
// 재능 개화 카드 시스템 (P3)
// 카드는 전직마다 한 장(18종): 그 전직이 속한 직업의 대표 재능 × 전직(2026-10-02 재능 정리, 그 전에는 재능 10 × 전직 12).
// 개화 시련 클리어로 카드를 획득/강화한다.
// 카드 점수는 계정 진행도(여러 무한 콘텐츠의 최고 도달 + 나무꾼 잔상 전투력)로 매겨지고,
// 점수가 카드 레벨을 결정한다. 표면(전직 테마)과 이면(재능 테마) 효과는 레벨에 비례한다.
// 카드/조합 기록은 루프(시즌 리셋)로 초기화되지 않는다.
// (효과의 실제 스탯 반영 및 장착 슬롯은 P4에서 연결)
// ============================================================================

// 카드 레벨 임계값(점수 기준). 점수는 "층 환산" 단위(무한 콘텐츠 최고층 합 + DPS 로그 환산).
const TALENT_CARD_LEVEL_THRESHOLDS = [0, 20, 45, 80, 125, 180, 250, 340, 450, 600];
const TALENT_CARD_MAX_LEVEL = TALENT_CARD_LEVEL_THRESHOLDS.length;
// 전직마다 한 장 = 18(2026-10-02 재능 정리). 직업, 전직 정의가 없는 좁은 실행 환경에서는 카드 정의 수.
const TALENT_BLOOM_TOTAL_CARDS = typeof ASCENDANCIES_BY_PLAYER_CLASS === 'object' && typeof PLAYER_CLASS_DEFS === 'object'
    ? getTalentBloomCardKeys().length : Object.keys(TALENT_BLOOM_CARD_DEFS).length;

// 나무꾼 잔상 전투력(최고 DPS)의 로그 환산 기준. DPS가 2배 될 때마다 +1점(층과 동일 스케일).
const TALENT_BLOOM_DPS_BASE = 1000;

/** 전직이 속한 직업(data/ascendancies.js ASCENDANCIES_BY_PLAYER_CLASS). */
function getTalentBloomClassOfAscendancy(ascendId) {
    return Object.keys(ASCENDANCIES_BY_PLAYER_CLASS).find(classId => ASCENDANCIES_BY_PLAYER_CLASS[classId].includes(ascendId)) || null;
}

/** 개화 재능은 직업이 정한다(2026-10-02 재능 정리): 전직이 속한 직업의 대표 재능. 개화 시련에서 고르지 않는다. */
function getTalentBloomHeroIdForAscendancy(ascendId) {
    const classDef = PLAYER_CLASS_DEFS[getTalentBloomClassOfAscendancy(ascendId)];
    return classDef && HERO_SELECTION_DEFS[classDef.recommendedTalentHeroId] ? classDef.recommendedTalentHeroId : null;
}

/** 전직의 개화 카드(직업의 대표 재능 × 전직). 카드 정의가 없으면 null. */
function getTalentBloomCardKeyForAscendancy(ascendId) {
    const heroId = getTalentBloomHeroIdForAscendancy(ascendId);
    const key = heroId ? makeTalentComboKey(heroId, ascendId) : null;
    return key && TALENT_BLOOM_CARD_DEFS[key] ? key : null;
}

/** 얻을 수 있는 카드 열여덟 장(직업 순서). */
function getTalentBloomCardKeys() {
    return Object.values(ASCENDANCIES_BY_PLAYER_CLASS).flat().map(getTalentBloomCardKeyForAscendancy).filter(Boolean);
}

// 카드 효과는 data/talent-cards.js의 TALENT_BLOOM_CARD_DEFS(표면 1 + 이면 1)에서 조회한다.
function getTalentCardDef(heroId, classKey) {
    let key = makeTalentComboKey(heroId, classKey);
    if (typeof TALENT_BLOOM_CARD_DEFS !== 'undefined' && TALENT_BLOOM_CARD_DEFS[key]) return TALENT_BLOOM_CARD_DEFS[key];
    return null;
}

function getTalentCardRuntimeDefinition(comboKey) {
    let { heroId, classKey } = parseTalentComboKey(comboKey);
    let def = getTalentCardDef(heroId, classKey);
    return def && def.surface && def.surface.runtime ? def.surface.runtime : null;
}

function parseTalentComboKey(comboKey) {
    let parts = String(comboKey || '').split('__');
    return { heroId: parts[0] || 'hero1', classKey: parts[1] || 'none' };
}
function makeTalentComboKey(heroId, classKey) {
    return `${heroId || 'hero1'}__${classKey || 'none'}`;
}

function getTalentPreciseRule(comboKey) {
    if (typeof TALENT_PRECISE_CARD_RULES === 'undefined') return null;
    return TALENT_PRECISE_CARD_RULES[String(comboKey || '')] || null;
}

// 계정 진행도 기반 개화 점수. (무한 콘텐츠 최고층 합 + 나무꾼 잔상 전투력 로그 환산)
function getTalentBloomScore() {
    let deepChaos = Math.max(0, Math.floor(Number(game.abyssEndlessDepth) || 0));
    let labyrinth = Math.max(0, Math.floor(Number(game.labyrinthUnlockedMaxFloor) || 0));
    let chaosFloor = (typeof ensureChaosRealmState === 'function')
        ? Math.max(0, Math.floor(Number(ensureChaosRealmState().highestFloor) || 0)) : 0;
    let underFloor = Math.max(0, Math.floor(Number(game.underworldProgress && game.underworldProgress.highestFloor) || 0));
    let cosmos = (game.cosmosAtlas && Array.isArray(game.cosmosAtlas.cleared))
        ? game.cosmosAtlas.cleared.length + ((game.cosmosAtlas.bossClears || []).length) : 0;
    let bestDps = Math.max(0, Number((game.woodsmanEchoRun && game.woodsmanEchoRun.bestDps) || 0));
    let dpsTerm = bestDps > TALENT_BLOOM_DPS_BASE ? Math.floor(Math.log2(bestDps / TALENT_BLOOM_DPS_BASE)) : 0;
    return deepChaos + labyrinth + chaosFloor + underFloor + cosmos + Math.max(0, dpsTerm);
}

function getTalentBloomScoreBreakdown() {
    let deepChaos = Math.max(0, Math.floor(Number(game.abyssEndlessDepth) || 0));
    let labyrinth = Math.max(0, Math.floor(Number(game.labyrinthUnlockedMaxFloor) || 0));
    let chaosFloor = (typeof ensureChaosRealmState === 'function')
        ? Math.max(0, Math.floor(Number(ensureChaosRealmState().highestFloor) || 0)) : 0;
    let underFloor = Math.max(0, Math.floor(Number(game.underworldProgress && game.underworldProgress.highestFloor) || 0));
    let cosmos = (game.cosmosAtlas && Array.isArray(game.cosmosAtlas.cleared))
        ? game.cosmosAtlas.cleared.length + ((game.cosmosAtlas.bossClears || []).length) : 0;
    let bestDps = Math.max(0, Number((game.woodsmanEchoRun && game.woodsmanEchoRun.bestDps) || 0));
    let dpsTerm = bestDps > TALENT_BLOOM_DPS_BASE ? Math.floor(Math.log2(bestDps / TALENT_BLOOM_DPS_BASE)) : 0;
    return { deepChaos, labyrinth, chaosFloor, underFloor, cosmos, dpsTerm: Math.max(0, dpsTerm) };
}

function getTalentCardLevel(score) {
    let s = Math.max(0, Math.floor(Number(score) || 0));
    let level = 1;
    for (let i = 0; i < TALENT_CARD_LEVEL_THRESHOLDS.length; i++) {
        if (s >= TALENT_CARD_LEVEL_THRESHOLDS[i]) level = i + 1;
    }
    return Math.min(TALENT_CARD_MAX_LEVEL, level);
}

// 개화 시련 클리어 시 호출: 조합 카드의 점수를 최고값으로 갱신하고 레벨을 다시 계산한다.
function recordTalentBloomCard(comboKey) {
    if (!game.talentCards || typeof game.talentCards !== 'object') game.talentCards = {};
    let score = getTalentBloomScore();
    let card = game.talentCards[comboKey] || { score: 0, level: 1, count: 0 };
    card.count = Math.max(0, Math.floor(card.count || 0)) + 1;
    if (score > (card.score || 0)) card.score = score;
    let prevLevel = Math.max(1, Math.floor(card.level || 1));
    card.level = getTalentCardLevel(card.score);
    game.talentCards[comboKey] = card;
    return { card, leveledUp: card.level > prevLevel, score };
}

// ── 표면효과 = 실제 적용 키스톤, 이면효과 = 실제 스탯(배열, lv10 = 만렙 수치, 레벨 비례) ──
// surface.desc는 기획 원문이며, 실제 합산 수치는 TALENT_PRECISE_CARD_RULES만 사용한다.

function talentHiddenList(def) {
    if (!def || !def.hidden) return [];
    if (Array.isArray(def.hidden)) return def.hidden;
    return [def.hidden];
}
function talentHiddenVal(h, lv) {
    // lv10 = 만렙(10레벨) 수치 → 현재 레벨 비례. (구버전 perLevel 도 호환)
    let base = (h.lv10 !== undefined) ? (Number(h.lv10) || 0) * lv / TALENT_CARD_MAX_LEVEL : (Number(h.perLevel) || 0) * lv;
    return Math.round(base * 100) / 100;
}

// 장착 스탯 합산용: 이면 및 표면 ops 스탯들(레벨 비례).
function getTalentCardStatBonuses(heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = getTalentCardDef(heroId, classKey);
    if (!def) return [];
    let out = [];
    talentHiddenList(def).forEach(h => { if (h && h.stat) out.push({ stat: h.stat, val: talentHiddenVal(h, lv), kind: 'hidden' }); });
    let rule = getTalentPreciseRule(makeTalentComboKey(heroId, classKey));
    Object.entries((rule && rule.stats) || {}).forEach(([stat, valueAtLevel10]) => {
        out.push({ stat, val: (Number(valueAtLevel10) || 0) * lv / TALENT_CARD_MAX_LEVEL, kind: 'surface' });
    });
    return out;
}

const TALENT_STAT_LABELS = {
    pctDmg: '피해 증가', physPctDmg: '물리 피해', meleePctDmg: '근접 피해', projectilePctDmg: '투사체 피해',
    elementalPctDmg: '원소 피해', firePctDmg: '화염 피해', coldPctDmg: '냉기 피해', lightPctDmg: '번개 피해',
    chaosPctDmg: '카오스 피해', dotPctDmg: '지속 피해 배율', summonPctDmg: '소환수 피해', aoePctDmg: '범위 피해',
    slamPctDmg: '강타 피해', weaponFlatDmgPct: '무기 기본 피해', crit: '치명타 확률', critDmg: '치명타 피해',
    aspd: '공격 속도', ds: '연속 타격', move: '이동 속도', pctHp: '생명력 증가', armorPct: '방어도',
    evasionPct: '회피', energyShieldPct: '에너지 보호막', resPen: '저항 관통', leech: '생명력 흡수',
    dr: '받는 피해 감소', physIgnore: '물리 피해 감소 무시', regen: '생명력 재생', regenSuppress: '재생 억제',
    blockChance: '막기 확률', blockChancePct: '방패 기본 막기 확률 증가', blockChanceMax: '막기 확률 최대치',
    deflectDamageReduce: '비껴내기 피해 감소', resAll: '모든 원소 저항', resChaos: '카오스 저항',
    igniteChance: '점화 확률', poisonChance: '중독 확률', bleedChance: '출혈 확률', shockChance: '감전 확률',
    freezeChance: '동결 확률', chillChance: '한기 확률',
    ailResIgnite: '점화 저항 확률', ailResShock: '감전 저항 확률', ailResFreeze: '동결 저항 확률',
    ailResPoison: '중독 저항 확률', ailResBleed: '출혈 저항 확률',
    summonAspd: '소환수 공격 속도', summonHpPct: '소환수 생명력', summonResPen: '소환수 저항 관통',
    summonCritDmg: '소환수 치명타 피해', summonCrit: '소환수 치명타 확률', summonEfficiency: '소환수 효율',
    addedFireDamagePct: '추가 화염 피해', addedColdDamagePct: '추가 냉기 피해', addedLightDamagePct: '추가 번개 피해'
};
function getTalentStatLabel(stat) {
    if (TALENT_STAT_LABELS[stat]) return TALENT_STAT_LABELS[stat];
    if (typeof P_STATS !== 'undefined' && P_STATS[stat] && P_STATS[stat].name) return P_STATS[stat].name;
    if (typeof getStatName === 'function') return getStatName(stat);
    return stat;
}

function getTalentRuntimeAppliedText(runtime, level) {
    if (!runtime || !runtime.key) return '';
    let levelRatio = level / TALENT_CARD_MAX_LEVEL;
    if (runtime.key === 'mistral') {
        let aspd = Math.round((Number(runtime.aspdPerStackAtLevel10) || 0) * levelRatio * 100) / 100;
        let move = Math.round((Number(runtime.movePerStackAtLevel10) || 0) * levelRatio * 100) / 100;
        return `중첩마다 공격 속도 +${aspd}%, 이동 속도 +${move}%(최대 ${runtime.maxStacks}중첩)`;
    }
    if (runtime.key === 'stoneShield') {
        let pct = Math.round((Number(runtime.maxHpPctAtLevel10) || 0) * levelRatio * 100) / 100;
        return `막기 시 최대 생명력의 ${pct}% 돌 보호막`;
    }
    if (runtime.key === 'moonReturn') return `단일 적에게 원 피해의 ${runtime.damagePct}% 추가 타격`;
    if (runtime.key === 'ailmentWhitelist') return '적에게 점화와 중독만 걸 수 있음';
    if (runtime.key === 'instantWarcry') return runtime.latestEffectOnly
        ? '함성 시전 시간 0초, 마지막 함성 하나의 고유 효과만 유효, 활성 함성 수는 모두 셈'
        : '함성 시전 시간 0초';
    return '';
}

function escapeTalentHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The level's applied effects as { text, stat } (stat = the stat id for a plain stat line, null for a unique or runtime one). */
function getTalentPreciseAppliedParts(comboKey, surface, level) {
    let applied = [];
    let rule = getTalentPreciseRule(comboKey);
    Object.entries((rule && rule.stats) || {}).forEach(([stat, levelTenValue]) => {
        let value = Math.round((Number(levelTenValue) || 0) * level / TALENT_CARD_MAX_LEVEL * 100) / 100;
        applied.push({ text: `${getTalentStatLabel(stat)} ${value >= 0 ? '+' : ''}${value}%`, stat });
    });
    ((rule && rule.uniques) || []).forEach(unique => {
        if (!unique || !unique.key) return;
        let params = Object.assign({}, unique.params || {});
        if (unique.perLevelParams) Object.keys(unique.perLevelParams).forEach(key => {
            params[key] = (Number(unique.perLevelParams[key]) || 0) * level;
        });
        applied.push({ text: getTalentUniqLabel(unique.key, params), stat: null });
    });
    let runtimeText = getTalentRuntimeAppliedText(surface.runtime, level);
    if (runtimeText) applied.push({ text: runtimeText, stat: null });
    return applied;
}

/** A card's effects as plain data (js/talent-ui.js colours them, 2026-10-06): the surface prose, the level's applied effects and the
 * hidden stats (이면효과, level-scaled). null for an unknown card. */
function getTalentCardEffectParts(heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = getTalentCardDef(heroId, classKey);
    if (!def) return null;
    let applied = def.surface ? getTalentPreciseAppliedParts(makeTalentComboKey(heroId, classKey), def.surface, lv) : [];
    let hidden = talentHiddenList(def).filter(h => h && h.stat)
        .map(h => ({ text: `${getTalentStatLabel(h.stat)} +${talentHiddenVal(h, lv)}%`, stat: h.stat }));
    return { level: lv, surface: (def.surface && def.surface.desc) || '', applied, hidden };
}

function getTalentCardEffectLines(heroId, classKey, level) {
    let parts = getTalentCardEffectParts(heroId, classKey, level);
    if (!parts) return [];
    let lines = [];
    if (parts.surface) lines.push(`<span style="color:#ffd36b;">⭐ [표면] ${escapeTalentHtml(parts.surface)}</span>`);
    if (parts.applied.length) lines.push(`<span style="color:#ffe7a8;">[현재 Lv.${parts.level}] ${parts.applied.map(part => escapeTalentHtml(part.text)).join(', ')}</span>`);
    if (parts.hidden.length) lines.push(`<span style="color:#9fe0ff;">[이면] ${parts.hidden.map(part => part.text).join(', ')}</span>`);
    return lines;
}

// 고유 효과 키 → 실제 효과를 나타내는 간략한 한국어 설명(파라미터 반영).
const TALENT_UNIQ_LABELS = {
    projectilePatternMode: p => `투사체 패턴: ${typeof PROJECTILE_PATTERN_MODE_DB !== 'undefined' && PROJECTILE_PATTERN_MODE_DB[p.mode] ? PROJECTILE_PATTERN_MODE_DB[p.mode].label : p.mode}`,
    cosmosPenetration: p => `저항 관통 +${p.pen}%`,
    poisonDamageMorePct: p => `중독 피해 +${p.pct}%`,
    igniteDamageMorePct: p => `점화 피해 +${p.pct}%`,
    hitShockedEnemyDamageMorePct: p => `감전된 적에게 주는 피해 +${p.pct}%`,
    alwaysShock: () => `타격마다 감전 판정을 한 번 더 함`,
    stackingElementalResDownOnHit: p => `원소 타격마다 그 적의 원소 저항 -${p.perHit}%(최대 -${p.max}%)`,
    hitApplyChaosResDown: p => `타격 시 적 카오스 저항 -${p.perHit}%(최대 ${p.maxStacks}중첩)`,
    realmAllResDownOnHit: p => `타격 시 적 모든 저항 -${p.perHit}%(최대 ${p.max}%, ${p.duration}초)`,
    minRollEqualsMaxRoll: () => `항상 최대 피해로 적중`,
    maxRollBonusHit: () => `피해 굴림이 130% 이상이면 그 피해의 50%로 한 번 더 침`,
    instantLeechAndDoubleDamage: p => `흡혈의 ${p.instantLeechPct}%를 바로 회복, ${p.doubleDamageChance}% 확률로 피해 2배`,
    projectileDoubleStrikePct: p => `투사체 연속 타격 확률 +${p.pct}%`,
    projectileExtraShotBonus: p => `투사체 추가 발사 +${p.shots}`,
    lifePctAsEnergyShield: p => `최대 생명력의 ${p.pct}%를 에너지 보호막으로`,
    overhealCapPct: p => `생명력과 에너지 보호막 초과 회복 +${p.pct}%`,
    hpToPhysPct: () => `최대 생명력이 물리 피해를 강화`,
    labyrinthShackles: () => `이동 속도가 피해로 전환`,
    grandBreachCrown: p => `에너지 보호막 +${p.esPct}%, 에너지 보호막의 ${p.spellFromEsPct}%를 주문 피해로`,
    guardianArmor: p => `몬스터에게 받는 피해 -${p.takenLessPct}%(보스 -${p.bossTakenLessPct}%)`,
    curseCrown: p => `저주 한도 +${p.extraCurseCap}, 저주마다 피해 +${p.finalDmgPerCursePct}%`,
    genericTakenDamageReducePct: p => `받는 피해 -${p.pct}%`,
    chaosTakenDamageReducePct: p => `받는 카오스 피해 -${p.pct}%`,
    uniqueTakenReduceWhen1Enemy: p => `적이 하나일 때 받는 피해 -${p.pct}%`,
    uniqueTakenReduceWhen2Enemies: p => `적이 둘 이상일 때 받는 피해 -${p.pct}%`,
    lifeRecoupTakenDamage: p => `받은 피해의 ${p.pct}%를 ${p.duration}초간 생명력으로 회수`,
    realmAllMaxRes: p => `모든 최대 저항 +${p.maxRes}%`,
    immuneBleed: () => `출혈에 걸리지 않음`,
    immuneFreeze: () => `빙결에 걸리지 않음`,
    immuneIgnite: () => `점화에 걸리지 않음`,
    uniqueBlockChance: p => `막기 확률 +${p.chance}%`,
    blockedDamageTakenPct: p => `막기 시 피해의 ${p.pct}%를 받음`,
    dragonVeinGuard: p => `타격 시 ${p.chance}% 확률로 ${p.duration}초 동안 최대 생명력 ${p.hpPct}%의 보호막`,
    leechEfficiencyOnKill: p => `처치 시 ${p.duration}초간 흡혈 효율 +${p.efficiencyPct}%`,
    cosmosSustain: p => `생명력 재생 +${p.regen}%, 흡혈 +${p.leech}%`,
    realmRegenRateAndRegen: p => `재생 속도 +${p.regenRatePct}%, 생명력 재생 +${p.regen}%`,
    corpseExplodeOnKill: p => `처치 시 ${p.chance}% 확률로 시체 폭발(생명력 ${p.lifePct}%)`,
    meteorFootsteps: p => `치명타 시 ${p.chance}% 확률로 모든 적에게 그 피해의 ${p.damagePct}%`,
    queenBeeSummonOnHit: p => `타격 시 ${p.chance}% 확률로 벌 소환(최대 ${p.maxBees})`,
    shockTracerGreaves: p => `감전된 적을 맞히면 그 피해의 ${p.strikeDamagePct}%로 한 번 더 침, 감전에 걸리지 않음`,
    frostSentinelBoots: () => `한기와 빙결에 걸리지 않음`,
    realmKillMoveStacks: p => `처치 시 이동 속도 +${p.movePerStack}%(최대 ${p.maxStacks}중첩)`,
    overkillSplash: () => `적을 처치하고 남은 피해가 다른 적 모두에게 튐`,
    summonDeathDamageBuff: p => `소환수 사망 시 피해 +${p.pct}%(${p.duration}초)`,
    summonCritAspdStacks: p => `소환수 치명타 시 공격 속도 +${p.aspd}%(최대 ${p.maxStacks}중첩)`,
    summonCapBonus: p => `소환수 한도 +${p.cap}`,
    summonEfficiencyBonus: p => `소환수 효율 +${p.pct}%`,
    projectileTargetBonus: p => `투사체 대상 +${p.target}`,
    dsAndTargetAnyBonus: p => (p.ds ? `연속 타격 +${p.ds}%, ` : '') + `공격 대상 +${p.target}`,
    esAmpAndRecoverOnCrit: p => `에너지 보호막 +${p.ampPct}%, 치명타 시 에너지 보호막 ${p.recoverPctOnCrit}% 회복`,
    warcryResonanceBelt: p => `활성 함성마다 피해 +${p.perWarcryAmpPct}%`,
    // 2026-10-02 전직 18종의 새 카드
    uniqueMinDmgRoll: p => `최소 피해 보정 +${p.pct}%`,
    underdogNonMaxRollMorePct: p => `최대가 아닌 피해 굴림의 피해 ${p.pct}% 증폭`,
    cosmosSpeedBurst: p => `이동 속도 +${p.move}%, 공격 속도 +${p.aspd}%`,
    uniqueDeflectDamageReduce: p => `비껴내기 피해 감소 +${p.pct}%`,
    instakillNormalOnHitPct: p => `타격 시 ${p.pct}% 확률로 일반 몬스터 즉시 처치`,
    cosmosFinalDmg: p => `피해 +${p.pct}%`,
    realmPoisonDuration: p => `중독 지속 시간 +${p.durationPct}%`
};

function getTalentUniqLabel(key, p) {
    const label = TALENT_UNIQ_LABELS[key];
    return label ? label(p || {}) : key;
}

function getTalentCardName(heroId, classKey) {
    let heroLabel = (typeof getHeroSelectionDef === 'function') ? getHeroSelectionDef(heroId).label : heroId;
    let classLabel = (typeof CLASS_TEMPLATES !== 'undefined' && CLASS_TEMPLATES[classKey]) ? CLASS_TEMPLATES[classKey].name : '미전직';
    // 카드 이름 = 재능 + 전직을 융합한 전직명. (부제에 원본 재능/전직을 함께 표기)
    let def = getTalentCardDef(heroId, classKey);
    let bloomName = (def && def.name) ? def.name : `${heroLabel} ${classLabel}`;
    return { heroLabel, classLabel, bloomName };
}


function getOwnedTalentCardCount() {
    return (game.talentCards && typeof game.talentCards === 'object') ? Object.keys(game.talentCards).length : 0;
}

// ---- 장착 슬롯 (P4) ----
// 슬롯은 보유 카드 수가 다음 임계값에 도달할 때마다 1칸씩 열린다. 카드 18장 기준(2026-10-02 재능 정리, 120장일 때 1, 4, 12, 25, 40, 60).
const TALENT_CARD_SLOT_UNLOCKS = [1, 2, 4, 6, 9, 12];
const TALENT_CARD_SLOT_COUNT = TALENT_CARD_SLOT_UNLOCKS.length;

function ensureTalentCardLoadout() {
    if (!Array.isArray(game.talentCardLoadout)) game.talentCardLoadout = [];
    while (game.talentCardLoadout.length < TALENT_CARD_SLOT_COUNT) game.talentCardLoadout.push(null);
    if (game.talentCardLoadout.length > TALENT_CARD_SLOT_COUNT) game.talentCardLoadout.length = TALENT_CARD_SLOT_COUNT;
    // 보유하지 않은 카드가 슬롯에 남아있으면 비운다.
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    for (let i = 0; i < game.talentCardLoadout.length; i++) {
        if (game.talentCardLoadout[i] && !owned[game.talentCardLoadout[i]]) game.talentCardLoadout[i] = null;
    }
    return game.talentCardLoadout;
}

function getUnlockedTalentSlotCount() {
    let owned = getOwnedTalentCardCount();
    let count = 0;
    for (let i = 0; i < TALENT_CARD_SLOT_UNLOCKS.length; i++) if (owned >= TALENT_CARD_SLOT_UNLOCKS[i]) count++;
    return count;
}

function getTalentCardSlotIndex(comboKey) {
    let loadout = ensureTalentCardLoadout();
    return loadout.indexOf(comboKey);
}

function equipTalentCard(comboKey) {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    if (!owned[comboKey]) return;
    let loadout = ensureTalentCardLoadout();
    let unlocked = getUnlockedTalentSlotCount();
    if (unlocked <= 0) { if (typeof addLog === 'function') addLog('🔒 아직 장착 슬롯이 열리지 않았습니다.', 'attack-monster'); return; }
    // 이미 장착돼 있으면 해제(토글)
    let existing = loadout.indexOf(comboKey);
    if (existing >= 0) { loadout[existing] = null; afterTalentLoadoutChange(); return; }
    // 빈 슬롯 우선, 없으면 마지막 열린 슬롯 교체
    let target = -1;
    for (let i = 0; i < unlocked; i++) { if (!loadout[i]) { target = i; break; } }
    if (target < 0) target = unlocked - 1;
    loadout[target] = comboKey;
    afterTalentLoadoutChange();
}

function unequipTalentSlot(slotIndex) {
    let loadout = ensureTalentCardLoadout();
    if (slotIndex < 0 || slotIndex >= loadout.length) return;
    loadout[slotIndex] = null;
    afterTalentLoadoutChange();
}

function afterTalentLoadoutChange() {
    clearTalentCardRuntimeState();
    if (typeof updateStaticUI === 'function') updateStaticUI();
    if (typeof queueImportantSave === 'function') queueImportantSave(200);
}

// 장착된(열린 슬롯에 한함) 카드들의 표면+이면 효과를 {id, val} 목록으로 합산. (getPlayerStats에서 reward 버킷에 주입)
function getActiveTalentCardStatBonuses() {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let loadout = Array.isArray(game.talentCardLoadout) ? game.talentCardLoadout : [];
    let unlocked = getUnlockedTalentSlotCount();
    let out = [];
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        let key = loadout[i];
        if (!key || !owned[key]) continue;
        let { heroId, classKey } = parseTalentComboKey(key);
        let level = Math.max(1, Math.floor(owned[key].level || 1));
        getTalentCardStatBonuses(heroId, classKey, level).forEach(b => out.push({ id: b.stat, val: b.val }));
    }
    pushGrantedBloomMechanicStats(out);
    let mistralLevel = isTalentCardActive('hero1__ranger');
    let mistralRuntime = getTalentCardRuntimeDefinition('hero1__ranger');
    let mistralStacks = getTalentMistralStackCount();
    if (mistralLevel > 0 && mistralRuntime && mistralStacks > 0) {
        let ratio = mistralLevel / TALENT_CARD_MAX_LEVEL;
        out.push({ id: 'aspd', val: mistralStacks * mistralRuntime.aspdPerStackAtLevel10 * ratio });
        out.push({ id: 'move', val: mistralStacks * mistralRuntime.movePerStackAtLevel10 * ratio });
    }
    return out;
}

function getTalentCardRuntimeState() {
    if (!game.talentCardRuntime || typeof game.talentCardRuntime !== 'object') game.talentCardRuntime = {};
    return game.talentCardRuntime;
}

function getTalentMistralStackCount(now) {
    if (!isTalentCardActive('hero1__ranger')) return 0;
    let runtime = getTalentCardRuntimeState();
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    if ((runtime.mistralExpiresAt || 0) > timestamp) {
        let config = getTalentCardRuntimeDefinition('hero1__ranger');
        return Math.max(0, Math.min(config.maxStacks, Math.floor(Number(runtime.mistralStacks) || 0)));
    }
    delete runtime.mistralStacks;
    delete runtime.mistralExpiresAt;
    return 0;
}

function recordTalentMistralAttack(now) {
    if (!isTalentCardActive('hero1__ranger')) return 0;
    let config = getTalentCardRuntimeDefinition('hero1__ranger');
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    let runtime = getTalentCardRuntimeState();
    runtime.mistralStacks = Math.min(config.maxStacks, getTalentMistralStackCount(timestamp) + 1);
    runtime.mistralExpiresAt = timestamp + config.durationMs;
    return runtime.mistralStacks;
}

function grantTalentStoneShield(maxHp, now) {
    let level = isTalentCardActive('hero2__guardian');
    if (level <= 0) return null;
    let config = getTalentCardRuntimeDefinition('hero2__guardian');
    let capacity = Math.max(1, Math.floor(Math.max(0, Number(maxHp) || 0) * config.maxHpPctAtLevel10 * level / TALENT_CARD_MAX_LEVEL / 100));
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    let runtime = getTalentCardRuntimeState();
    runtime.stoneShieldAmount = capacity;
    runtime.stoneShieldMax = capacity;
    runtime.stoneShieldExpiresAt = timestamp + config.durationMs;
    return { amount: capacity, expiresAt: runtime.stoneShieldExpiresAt };
}

function getTalentMoonReturnConfig(targets) {
    if (!isTalentCardActive('hero4__hunter') || !Array.isArray(targets)) return null;
    let alive = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0);
    if (alive.length !== 1 || !targets.some(row => row && row.enemy === alive[0])) return null;
    let config = getTalentCardRuntimeDefinition('hero4__hunter');
    return { targetId: alive[0].id, damageMultiplier: Math.max(0, Number(config.damagePct) || 0) / 100 };
}

function canTalentCardApplyEnemyAilment(type) {
    if (!isTalentCardActive('hero10__catalyst')) return true;
    let ailmentType = String(type || '').toLowerCase();
    let standardTypes = ['ignite', 'poison', 'bleed', 'chill', 'freeze', 'shock', 'scorch', 'brittle', 'sap', 'flamedecay'];
    if (!standardTypes.includes(ailmentType)) return true;
    let config = getTalentCardRuntimeDefinition('hero10__catalyst');
    return config.allowed.includes(ailmentType);
}

function getActiveTalentRuntimeConfig(comboKey) {
    let level = isTalentCardActive(comboKey);
    let config = level > 0 ? getTalentCardRuntimeDefinition(comboKey) : null;
    return config ? { config, level, levelRatio: level / TALENT_CARD_MAX_LEVEL } : null;
}

function isTalentInstantWarcryActive() {
    return !!getActiveTalentRuntimeConfig('hero2__warrior');
}

function clearTalentCardRuntimeState() {
    delete game.talentCardRuntime;
}

// 특정 조합 카드가 "열린 슬롯"에 장착돼 있으면 그 레벨을 반환(아니면 0). 정밀 메커니즘 게이트용.
// 키스톤이나 고유 주얼이 켠 옛 카드 효과(아래 getGrantedBloomMechanics)는 최대 레벨로 답한다.
function isTalentCardActive(comboKey) {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let loadout = Array.isArray(game.talentCardLoadout) ? game.talentCardLoadout : [];
    let unlocked = getUnlockedTalentSlotCount();
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        if (loadout[i] === comboKey && owned[comboKey]) return Math.max(1, Math.floor(owned[comboKey].level || 1));
    }
    return getGrantedBloomMechanics(game).has(comboKey) ? TALENT_CARD_MAX_LEVEL : 0;
}

// ── 카드가 아닌 곳에서 켜지는 옛 카드 효과(2026-10-02 재능 정리) ──
// 얻을 수 없게 된 옛 카드 중 살린 효과는 전직 키스톤(CLASS_KEYSTONE_DEFS의 bloomMechanic)이나 고유 주얼(UNIQUE_JEWEL_DB의
// bloomMechanic)이 켠다. 효과 코드는 카드 id로 켜졌는지 묻기 때문에(isTalentCardActive) 그대로 두고, 그 id를 최대 레벨로 켠 것처럼
// 답한다. 정밀 규칙의 능력치 줄과 고유 효과 줄도 최대 레벨로 들어가고, 카드의 이면 효과는 들어가지 않는다.
const talentGrantedMechanicsByOwner = new WeakMap();

function collectGrantedBloomMechanics(owner) {
    const keys = new Set();
    if (typeof forEachActiveKeystoneDef === 'function') forEachActiveKeystoneDef(owner, def => { if (def.bloomMechanic) keys.add(def.bloomMechanic); });
    const rows = typeof collectSocketedJewels === 'function' && typeof UNIQUE_JEWEL_DB !== 'undefined' ? collectSocketedJewels(owner.equipment) : [];
    rows.forEach(row => {
        const unique = row.jewel && row.jewel.uniqueId ? UNIQUE_JEWEL_DB.find(entry => entry.id === row.jewel.uniqueId) : null;
        if (unique && unique.bloomMechanic) keys.add(unique.bloomMechanic);
    });
    return keys;
}

/** getPlayerStats가 장비와 키스톤을 읽을 때(recomputeCosmosTwinKeystones) 다시 센다. */
function refreshGrantedBloomMechanics(owner = game) {
    const keys = collectGrantedBloomMechanics(owner);
    talentGrantedMechanicsByOwner.set(owner, keys);
    return keys;
}

/** 키스톤과 고유 주얼이 켠 옛 카드 효과 id. 아직 센 적이 없으면 지금 센다. */
function getGrantedBloomMechanics(owner = game) {
    return owner && typeof owner === 'object' ? (talentGrantedMechanicsByOwner.get(owner) || refreshGrantedBloomMechanics(owner)) : new Set();
}

function pushGrantedBloomMechanicStats(out) {
    getGrantedBloomMechanics(game).forEach(key => {
        const rule = getTalentPreciseRule(key);
        Object.entries((rule && rule.stats) || {}).forEach(([stat, value]) => out.push({ id: stat, val: Number(value) || 0 }));
    });
}

// 플레이어 공격 1회 발생 시 호출(combat.performPlayerAttack). 카운터/스택 등 정밀 메커니즘의 런타임 상태만 갱신(제어흐름 변경 없음).
function talentOnPlayerAttack(pStats, isCrit) {
    if (!game.talentRuntime || typeof game.talentRuntime !== 'object') game.talentRuntime = {};
    let rt = game.talentRuntime;
    recordTalentMistralAttack();
    // 2 플레쳐: 3회째 공격마다 피해 +33% (이번 공격에만 적용되는 부스트)
    if (isTalentCardActive('hero1__gladiator')) {
        rt.fletcherCount = (Math.floor(rt.fletcherCount || 0) % 3) + 1;
        rt.fletcherBoost = (rt.fletcherCount >= 3) ? 1.33 : 1;
    } else {
        rt.fletcherBoost = 1;
    }
}

// 26 숲마당 투사: 플레이어 공격이 반드시 명중(적 회피 무시).
function getTalentAlwaysHit() {
    return isTalentCardActive('hero3__gladiator') > 0;
}

// 이번 공격에 적용할 재능 정밀 피해 배율(calcDamage에서 곱).
function getTalentAttackDamageMul() {
    let rt = (game.talentRuntime && typeof game.talentRuntime === 'object') ? game.talentRuntime : {};
    let mul = 1;
    if (isTalentCardActive('hero1__gladiator') && rt.fletcherBoost) mul *= rt.fletcherBoost;
    return mul;
}

// 장착 카드들의 이면+표면 스탯 기여 합산 맵 {statId: val} (브레이크다운 표기용).
function getActiveTalentStatMap() {
    let map = {};
    getActiveTalentCardStatBonuses().forEach(b => { map[b.id] = (map[b.id] || 0) + b.val; });
    return map;
}

// 정밀 규칙이 부여하는 "고유 효과"(게임의 unique-effect 엔진 키)들을 레벨 반영해 반환.
function getTalentCardUniqEffects(heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = getTalentCardDef(heroId, classKey);
    let rule = getTalentPreciseRule(makeTalentComboKey(heroId, classKey));
    if (!def || !rule || !Array.isArray(rule.uniques)) return [];
    let cardName = def.name || `${heroId} ${classKey}`;
    return rule.uniques.map(u => {
        if (!u || !u.key) return null;
        let params = Object.assign({}, u.params || {});
        if (u.perLevelParams) Object.keys(u.perLevelParams).forEach(p => { params[p] = (u.perLevelParams[p] || 0) * lv; });
        let cardId = makeTalentComboKey(heroId, classKey);
        return {
            key: u.key,
            params: params,
            itemName: '개화 키스톤: ' + cardName,
            sourceSlot: 'talentKeystone',
            cardId: cardId,
            talentCardId: cardId
        };
    }).filter(Boolean);
}

// 전투 호출용: 장착된 표면 키스톤들의 고유 효과 목록(고유효과 엔진에 주입).
function getActiveTalentKeystoneUniqueEffects() {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let loadout = Array.isArray(game.talentCardLoadout) ? game.talentCardLoadout : [];
    let unlocked = getUnlockedTalentSlotCount();
    let out = [];
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        let key = loadout[i];
        if (!key || !owned[key]) continue;
        let { heroId, classKey } = parseTalentComboKey(key);
        out.push(...getTalentCardUniqEffects(heroId, classKey, owned[key].level));
    }
    // 키스톤과 고유 주얼이 켠 옛 카드 효과의 고유 효과 줄(최대 레벨)
    getGrantedBloomMechanics(game).forEach(key => {
        let { heroId, classKey } = parseTalentComboKey(key);
        out.push(...getTalentCardUniqEffects(heroId, classKey, TALENT_CARD_MAX_LEVEL));
    });
    return out;
}


safeExposeGlobals({
    grantTalentStoneShield,
    getTalentMoonReturnConfig,
    canTalentCardApplyEnemyAilment,
    isTalentInstantWarcryActive,
    getTalentBloomHeroIdForAscendancy,
    getTalentBloomCardKeyForAscendancy,
    getTalentBloomCardKeys,
    refreshGrantedBloomMechanics,
    getGrantedBloomMechanics,
    clearTalentCardRuntimeState
});
