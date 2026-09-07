// ============================================================================
// 재능 개화 카드 시스템 (P3)
// 재능(10) × 직업(12) = 120종. 개화 시련 클리어로 카드를 획득/강화한다.
// 카드 점수는 계정 진행도(여러 무한 콘텐츠의 최고 도달 + 나무꾼 잔상 전투력)로 매겨지고,
// 점수가 카드 레벨을 결정한다. 표면(직업 테마)·이면(재능 테마) 효과는 레벨에 비례한다.
// 카드/조합 기록은 루프(시즌 리셋)로 초기화되지 않는다.
// (효과의 실제 스탯 반영 및 장착 슬롯은 P4에서 연결)
// ============================================================================

// 카드 레벨 임계값(점수 기준). 점수는 "층 환산" 단위(무한 콘텐츠 최고층 합 + DPS 로그 환산).
const TALENT_CARD_LEVEL_THRESHOLDS = [0, 20, 45, 80, 125, 180, 250, 340, 450, 600];
const TALENT_CARD_MAX_LEVEL = TALENT_CARD_LEVEL_THRESHOLDS.length;
const TALENT_BLOOM_TOTAL_CARDS = 120;

// 나무꾼 잔상 전투력(최고 DPS)의 로그 환산 기준. DPS가 2배 될 때마다 +1점(층과 동일 스케일).
const TALENT_BLOOM_DPS_BASE = 1000;

// 카드 효과는 data/talent-cards.js의 TALENT_BLOOM_CARD_DEFS(120개 조합 = 5차전직 1개당 표면 1 + 이면 1)에서 조회한다.
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
    deflectDamageReduce: '빗겨내기 피해 감소', resAll: '모든 원소 저항', resChaos: '카오스 저항',
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
        return `중첩당 공격 속도 +${aspd}% · 이동 속도 +${move}% (최대 ${runtime.maxStacks}중첩)`;
    }
    if (runtime.key === 'stoneShield') {
        let pct = Math.round((Number(runtime.maxHpPctAtLevel10) || 0) * levelRatio * 100) / 100;
        return `막기 시 최대 생명력의 ${pct}% 돌 보호막`;
    }
    if (runtime.key === 'moonReturn') return `단일 적에게 원 피해의 ${runtime.damagePct}% 추가 타격`;
    if (runtime.key === 'ailmentWhitelist') return '적에게 점화·중독만 부여 가능';
    if (runtime.key === 'shadowSlayer') return `치명타 피해 배율 무작위 ×1.0~×${(1 + (runtime.maxMultiplierAtLevel10 - 1) * levelRatio).toFixed(2)}`;
    if (runtime.key === 'summonCritLucky') return '소환수 치명타 확률 행운 판정';
    if (runtime.key === 'instantWarcry') return runtime.latestEffectOnly
        ? '함성 시전 시간 0초 · 마지막 함성 하나의 고유 효과만 유효 · 활성 함성 수 판정은 모두 유지'
        : '함성 시전 시간 0초';
    if (runtime.key === 'rangerCharge') return `돌격 명중 시 공격·이동 속도 ${runtime.speedPctAtLevel10 * levelRatio}% 증폭`;
    if (runtime.key === 'fenrirTooth') return `펜리르의 맹독: 중독 확률 +${runtime.poisonChanceAtLevel10 * levelRatio}%`;
    if (runtime.key === 'executionOrder') return `집행 명령 대상이 받는 피해 +${runtime.damagePctAtLevel10 * levelRatio}%`;
    if (runtime.key === 'vanguardBanner') return `소환수 피해 ${runtime.summonDamagePctAtLevel10 * levelRatio}% 증폭`;
    if (runtime.key === 'quicksilver') return `공격·이동 속도 ${runtime.speedPctAtLevel10 * levelRatio}% 증폭`;
    if (runtime.key === 'sunOath') return `생명력 ${runtime.lifeThresholdPct}% 이하에서 받는 피해 ${runtime.takenLessPctAtLevel10 * levelRatio}% 감소`;
    return '';
}

function escapeTalentHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getTalentPreciseAppliedTexts(comboKey, surface, level) {
    let applied = [];
    let rule = getTalentPreciseRule(comboKey);
    Object.entries((rule && rule.stats) || {}).forEach(([stat, levelTenValue]) => {
        let value = Math.round((Number(levelTenValue) || 0) * level / TALENT_CARD_MAX_LEVEL * 100) / 100;
        applied.push(`${getTalentStatLabel(stat)} ${value >= 0 ? '+' : ''}${value}%`);
    });
    ((rule && rule.uniques) || []).forEach(unique => {
        if (!unique || !unique.key) return;
        let params = Object.assign({}, unique.params || {});
        if (unique.perLevelParams) Object.keys(unique.perLevelParams).forEach(key => {
            params[key] = (Number(unique.perLevelParams[key]) || 0) * level;
        });
        applied.push(getTalentUniqLabel(unique.key, params));
    });
    let runtimeText = getTalentRuntimeAppliedText(surface.runtime, level);
    if (runtimeText) applied.push(runtimeText);
    return applied;
}

function getTalentCardEffectLines(heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = getTalentCardDef(heroId, classKey);
    if (!def) return [];
    let lines = [];
    if (def.surface) {
        if (def.surface.desc) {
            lines.push(`<span style="color:#ffd36b;">⭐ [표면] ${escapeTalentHtml(def.surface.desc)}</span>`);
        }
        let applied = getTalentPreciseAppliedTexts(makeTalentComboKey(heroId, classKey), def.surface, lv);
        if (applied.length) lines.push(`<span style="color:#ffe7a8;">[현재 Lv.${lv}] ${applied.map(escapeTalentHtml).join(' · ')}</span>`);
    }
    // 이면효과: 실제 스탯(레벨 비례)
    let hid = talentHiddenList(def).filter(h => h && h.stat);
    if (hid.length) {
        let parts = hid.map(h => `${getTalentStatLabel(h.stat)} +${talentHiddenVal(h, lv)}%`);
        lines.push(`<span style="color:#9fe0ff;">[이면] ${parts.join(' · ')}</span>`);
    }
    return lines;
}

// 고유 효과 키 → 실제 효과를 나타내는 간략한 한국어 설명(파라미터 반영).
function getTalentUniqLabel(key, p) {
    p = p || {};
    const M = {
        cosmosPenetration: () => `저항 관통 +${p.pen}%`,
        poisonDamageMorePct: () => `중독 피해 +${p.pct}%`,
        igniteDamageMorePct: () => `점화 피해 +${p.pct}%`,
        hitShockedEnemyDamageMorePct: () => `감전된 적 대상 피해 +${p.pct}%`,
        alwaysShock: () => `타격 시 항상 감전`,
        stackingElementalResDownOnHit: () => `타격 시 적 원소 저항 -${p.perHit}%(최대 ${p.max}%)`,
        hitApplyChaosResDown: () => `타격 시 적 카오스 저항 -${p.perHit}%(최대 ${p.maxStacks}중첩)`,
        realmAllResDownOnHit: () => `타격 시 적 모든 저항 -${p.perHit}%(최대 ${p.max}%, ${p.duration}초)`,
        minRollEqualsMaxRoll: () => `항상 최대 피해로 적중`,
        maxRollBonusHit: () => `최대 피해 굴림 시 추가 타격`,
        instantLeechAndDoubleDamage: () => `즉시 흡혈 ${p.instantLeechPct}% · 2배 피해 ${p.doubleDamageChance}% 확률`,
        projectileDoubleStrikePct: () => `투사체 연속타격 확률 +${p.pct}%`,
        projectileExtraShotBonus: () => `투사체 추가 발사 +${p.shots}`,
        lifePctAsEnergyShield: () => `최대 생명력의 ${p.pct}%를 에너지 보호막으로`,
        overhealCapPct: () => `생명력·에너지 보호막 초과 회복 +${p.pct}%`,
        hpToPhysPct: () => `최대 생명력이 물리 피해를 강화`,
        labyrinthShackles: () => `이동 속도가 피해로 전환`,
        grandBreachCrown: () => `에너지 보호막 +${p.esPct}% · ES의 ${p.spellFromEsPct}%를 주문 피해로`,
        guardianArmor: () => `받는 피해 -${p.takenLessPct}%(보스 -${p.bossTakenLessPct}%)`,
        curseCrown: () => `저주 한도 +${p.extraCurseCap} · 저주당 피해 +${p.finalDmgPerCursePct}%`,
        genericTakenDamageReducePct: () => `받는 피해 -${p.pct}%`,
        chaosTakenDamageReducePct: () => `받는 카오스 피해 -${p.pct}%`,
        uniqueTakenReduceWhen1Enemy: () => `적 1마리일 때 받는 피해 -${p.pct}%`,
        uniqueTakenReduceWhen2Enemies: () => `적 2마리 이상일 때 받는 피해 -${p.pct}%`,
        lifeRecoupTakenDamage: () => `받은 피해의 ${p.pct}%를 ${p.duration}초간 생명력으로 회수`,
        realmAllMaxRes: () => `모든 최대 저항 +${p.maxRes}%`,
        immuneBleed: () => `출혈 면역`,
        immuneFreeze: () => `빙결 면역`,
        immuneIgnite: () => `점화 면역`,
        uniqueBlockChance: () => `막기 확률 +${p.chance}%`,
        blockedDamageTakenPct: () => `막기 시 피해의 ${p.pct}%를 받음`,
        dragonVeinGuard: () => `피격 시 ${p.chance}% 확률로 ${p.duration}초 피해 경감`,
        leechEfficiencyOnKill: () => `처치 시 ${p.duration}초간 흡혈 효율 +${p.efficiencyPct}%`,
        cosmosSustain: () => `생명력 재생 +${p.regen}% · 흡혈 +${p.leech}%`,
        realmRegenRateAndRegen: () => `재생 속도 +${p.regenRatePct}% · 생명력 재생 +${p.regen}%`,
        corpseExplodeOnKill: () => `처치 시 ${p.chance}% 확률로 시체 폭발(생명력 ${p.lifePct}%)`,
        meteorFootsteps: () => `이동 시 ${p.chance}% 확률로 메테오(${p.damagePct}%)`,
        queenBeeSummonOnHit: () => `타격 시 ${p.chance}% 확률로 벌 소환(최대 ${p.maxBees})`,
        shockTracerGreaves: () => `타격 시 감전 추적탄(${p.strikeDamagePct}%)`,
        frostSentinelBoots: () => `냉기 파수꾼 소환`,
        realmKillMoveStacks: () => `처치 시 이동 속도 +${p.movePerStack}%(최대 ${p.maxStacks}중첩)`,
        overkillSplash: () => `초과 처치 피해 광역 확산`,
        summonDeathDamageBuff: () => `소환수 사망 시 피해 +${p.pct}%(${p.duration}초)`,
        summonCritAspdStacks: () => `소환수 치명타 시 공격 속도 +${p.aspd}%(최대 ${p.maxStacks}중첩)`,
        summonCapBonus: () => `소환수 한도 +${p.cap}`,
        summonEfficiencyBonus: () => `소환수 효율 +${p.pct}%`,
        projectileTargetBonus: () => `투사체 대상 +${p.target}`,
        dsAndTargetAnyBonus: () => `연속 타격 +${p.ds}% · 대상 +${p.target}`,
        esAmpAndRecoverOnCrit: () => `에너지 보호막 +${p.ampPct}% · 치명타 시 ES 회복 ${p.recoverPctOnCrit}%`,
        warcryResonanceBelt: () => `함성당 피해 +${p.perWarcryAmpPct}%`
    };
    return M[key] ? M[key]() : key;
}

function getTalentCardName(heroId, classKey) {
    let heroLabel = (typeof getHeroSelectionDef === 'function') ? getHeroSelectionDef(heroId).label : heroId;
    let classLabel = (typeof CLASS_TEMPLATES !== 'undefined' && CLASS_TEMPLATES[classKey]) ? CLASS_TEMPLATES[classKey].name : '무직';
    // 카드 이름 = 재능 + 전직을 융합한 전직명. (부제에 원본 재능/전직을 함께 표기)
    let def = getTalentCardDef(heroId, classKey);
    let bloomName = (def && def.name) ? def.name : `${heroLabel} ${classLabel}`;
    return { heroLabel, classLabel, bloomName };
}


function getOwnedTalentCardCount() {
    return (game.talentCards && typeof game.talentCards === 'object') ? Object.keys(game.talentCards).length : 0;
}

// ---- 장착 슬롯 (P4) ----
// 슬롯은 보유 카드 수가 다음 임계값에 도달할 때마다 1칸씩 열린다.
const TALENT_CARD_SLOT_UNLOCKS = [1, 4, 12, 25, 40, 60];
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

function getTalentShadowCritDamageMultiplier(isCrit) {
    let active = isCrit ? getActiveTalentRuntimeConfig('hero1__assassin') : null;
    if (!active) return 1;
    let upper = 1 + (Math.max(1, Number(active.config.maxMultiplierAtLevel10) || 1) - 1) * active.levelRatio;
    return 1 + Math.random() * (upper - 1);
}

function getTalentSummonCritChance(baseChance) {
    let chance = Math.max(0, Math.min(1, Number(baseChance) || 0));
    if (!getActiveTalentRuntimeConfig('hero1__soulbinder')) return chance;
    return 1 - ((1 - chance) * (1 - chance));
}

function rollTalentSummonCrit(baseChance) {
    let chance = Math.max(0, Math.min(1, Number(baseChance) || 0));
    if (!getActiveTalentRuntimeConfig('hero1__soulbinder')) return Math.random() < chance;
    return Math.random() < chance || Math.random() < chance;
}

function isTalentInstantWarcryActive() {
    return !!getActiveTalentRuntimeConfig('hero2__warrior');
}

function getTalentSummonDamageMultiplier() {
    let active = getActiveTalentRuntimeConfig('hero2__soulbinder');
    if (!active) return 1;
    return 1 + Math.max(0, Number(active.config.summonDamagePctAtLevel10) || 0) * active.levelRatio / 100;
}

function getTalentQuicksilverConfig() {
    let active = getActiveTalentRuntimeConfig('hero2__catalyst');
    if (!active) return null;
    return {
        speedMultiplier: 1 + active.config.speedPctAtLevel10 * active.levelRatio / 100,
        regenMultiplier: 1 - active.config.regenLessPctAtLevel10 * active.levelRatio / 100,
        regenPointPenalty: active.config.regenPointPenaltyAtLevel10 * active.levelRatio
    };
}

function getTalentConditionalDamageTakenMultiplier(maxHp) {
    let active = getActiveTalentRuntimeConfig('hero2__crusader');
    if (!active) return 1;
    let lifeRatio = Math.max(0, Number(game.playerHp) || 0) / Math.max(1, Number(maxHp) || 1) * 100;
    if (lifeRatio > active.config.lifeThresholdPct) return 1;
    return 1 - active.config.takenLessPctAtLevel10 * active.levelRatio / 100;
}

function tickTalentRangerCharge(now) {
    let active = getActiveTalentRuntimeConfig('hero2__ranger');
    let runtime = getTalentCardRuntimeState();
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    if (!active) return clearTalentRangerChargeState(runtime);
    let alive = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0);
    if (!alive.some(enemy => enemy.id === runtime.rangerChargeTargetId)) {
        delete runtime.rangerChargeTargetId;
        delete runtime.rangerChargeTargetPending;
    }
    if (!runtime.rangerChargeNextAt) runtime.rangerChargeNextAt = timestamp + active.config.intervalMs;
    if (alive.length > 0 && timestamp >= runtime.rangerChargeNextAt) {
        runtime.rangerChargeTargetId = alive[Math.floor(Math.random() * alive.length)].id;
        runtime.rangerChargeTargetPending = true;
        runtime.rangerChargeNextAt = timestamp + active.config.intervalMs;
    }
    if ((runtime.rangerChargeBuffUntil || 0) <= timestamp) delete runtime.rangerChargeBuffUntil;
}

function clearTalentRangerChargeState(runtime) {
    delete runtime.rangerChargeTargetId;
    delete runtime.rangerChargeTargetPending;
    delete runtime.rangerChargeNextAt;
    delete runtime.rangerChargeBuffUntil;
    delete runtime.rangerChargeBuffPct;
}

function getTalentRangerChargeTarget(enemies) {
    let runtime = game.talentCardRuntime;
    if (!getActiveTalentRuntimeConfig('hero2__ranger') || !runtime || !runtime.rangerChargeTargetPending) return null;
    return (Array.isArray(enemies) ? enemies : game.enemies || [])
        .find(enemy => enemy && enemy.hp > 0 && enemy.id === runtime.rangerChargeTargetId) || null;
}

function isTalentRangerGuaranteedTarget(target) {
    let runtime = getTalentCardRuntimeState();
    return !!(getActiveTalentRuntimeConfig('hero2__ranger') && runtime.rangerChargeTargetPending
        && target && target.id === runtime.rangerChargeTargetId);
}

function recordTalentRangerChargeHit(target, now) {
    if (!isTalentRangerGuaranteedTarget(target)) return false;
    let active = getActiveTalentRuntimeConfig('hero2__ranger');
    let runtime = getTalentCardRuntimeState();
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    runtime.rangerChargeTargetPending = false;
    delete runtime.rangerChargeTargetId;
    runtime.rangerChargeBuffUntil = timestamp + active.config.buffDurationMs;
    runtime.rangerChargeBuffPct = active.config.speedPctAtLevel10 * active.levelRatio;
    return true;
}

function getTalentRangerChargeSpeedMultiplier(now) {
    let runtime = getTalentCardRuntimeState();
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    if ((runtime.rangerChargeBuffUntil || 0) <= timestamp) return 1;
    return 1 + Math.max(0, Number(runtime.rangerChargeBuffPct) || 0) / 100;
}

function getTalentExecutionOrderMultiplier(target) {
    let active = getActiveTalentRuntimeConfig('hero2__inquisitor');
    let marked = target && getTalentCardRuntimeState().executionOrders;
    if (!active || !marked || !marked[target.id]) return 1;
    return 1 + active.config.damagePctAtLevel10 * active.levelRatio / 100;
}

function markTalentExecutionOrder(target) {
    if (!getActiveTalentRuntimeConfig('hero2__inquisitor') || !target || !(target.isBoss || target.isElite || target.elite)) return false;
    let runtime = getTalentCardRuntimeState();
    runtime.executionOrders = runtime.executionOrders || {};
    if (runtime.executionOrders[target.id]) return false;
    runtime.executionOrders[target.id] = true;
    return true;
}

function getTalentFenrirConfig() {
    return getActiveTalentRuntimeConfig('hero2__warlock');
}

function applyTalentFenrirSkill(skill, skillName) {
    if (skillName !== '기본 공격') return skill;
    const active = getTalentFenrirConfig();
    if (!active) return skill;
    return { ...skill, name: '펜리르의 독니', visualName: '펜리르의 독니', fenrirTooth: true,
        dmg: skill.dmg * (1 + active.config.directDamageMorePctAtLevel10 * active.levelRatio / 100) };
}

function isTalentFenrirEngravingEnabled(skillName) {
    return skillName === '기본 공격' && !!getTalentFenrirConfig();
}

function clearTalentCardRuntimeState() {
    delete game.talentCardRuntime;
}

// 특정 조합 카드가 "열린 슬롯"에 장착돼 있으면 그 레벨을 반환(아니면 0). 정밀 메커니즘 게이트용.
function isTalentCardActive(comboKey) {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let loadout = Array.isArray(game.talentCardLoadout) ? game.talentCardLoadout : [];
    let unlocked = getUnlockedTalentSlotCount();
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        if (loadout[i] === comboKey && owned[comboKey]) return Math.max(1, Math.floor(owned[comboKey].level || 1));
    }
    return 0;
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

// 23 산맥추적자: 생명력이 최대인 적 첫 타격 시 적 최대 생명력 비례 추가 피해(보스 4%, 그 외 8%).
function getTalentFullLifeBurst(enemy, wasFull) {
    if (!wasFull || !enemy || enemy.talentFullLifeBurstConsumed) return 0;
    let lv = isTalentCardActive('hero2__hunter');
    if (!lv) return 0;
    enemy.talentFullLifeBurstConsumed = true;
    let pct = (enemy.isBoss ? 0.04 : 0.08) * (lv / TALENT_CARD_MAX_LEVEL);
    return Math.max(0, Math.floor((enemy.maxHp || enemy.hp || 0) * pct));
}

// 상태이상 시너지형 표면효과: 적이 받는 피해 배율(라이브 판정, 적 상태이상 기반).
//  5 프리즈믹 아처 / 29 브리지트 / 99 서리암살자
function getTalentEnemyTakenMul(enemy, ele, crit) {
    let a = (enemy && Array.isArray(enemy.ailments)) ? enemy.ailments : [];
    let has = t => a.some(x => x && x.type === t && (x.time || 0) > 0);
    let m = 1;
    if (isTalentCardActive('hero1__elementalist') && ele === 'fire' && has('scorch')) {
        m *= 1 + 0.20 * isTalentCardActive('hero1__elementalist') / TALENT_CARD_MAX_LEVEL;
    }
    if (isTalentCardActive('hero3__elementalist') && ele !== 'phys' && ele !== 'chaos'
        && has('warmSeed') && has('frostSeed') && has('stormSeed')) {
        m *= 1 + 0.20 * isTalentCardActive('hero3__elementalist') / TALENT_CARD_MAX_LEVEL;
    }
    if (isTalentCardActive('hero9__assassin') && (has('chill') || has('freeze'))) { // 99: 냉각된 적 받는 피해 +
        m *= 1 + 0.12 * isTalentCardActive('hero9__assassin') / TALENT_CARD_MAX_LEVEL;
    }
    return m;
}

// 26 숲마당 투사: 플레이어 공격이 반드시 명중(적 회피 무시).
function getTalentAlwaysHit() {
    return isTalentCardActive('hero3__gladiator') > 0;
}

// 재능 처형: 활성 카드 중 "낮은 체력 일반 몬스터 마무리" 임계값(체력 비율). 없으면 0.
function getTalentExecuteThreshold() {
    let t = 0;
    if (isTalentCardActive('hero6__hunter')) t = Math.max(t, 0.25);   // 71 하운드
    return t;
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
    if (unlocked <= 0) return [];
    let out = [];
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        let key = loadout[i];
        if (!key || !owned[key]) continue;
        let { heroId, classKey } = parseTalentComboKey(key);
        out.push(...getTalentCardUniqEffects(heroId, classKey, owned[key].level));
    }
    return out;
}


safeExposeGlobals({
    grantTalentStoneShield,
    getTalentMoonReturnConfig,
    canTalentCardApplyEnemyAilment,
    getTalentShadowCritDamageMultiplier,
    getTalentSummonCritChance,
    rollTalentSummonCrit,
    isTalentInstantWarcryActive,
    getTalentSummonDamageMultiplier,
    getTalentQuicksilverConfig,
    getTalentConditionalDamageTakenMultiplier,
    tickTalentRangerCharge,
    getTalentRangerChargeTarget,
    isTalentRangerGuaranteedTarget,
    recordTalentRangerChargeHit,
    getTalentRangerChargeSpeedMultiplier,
    getTalentExecutionOrderMultiplier,
    markTalentExecutionOrder,
    getTalentFenrirConfig,
    applyTalentFenrirSkill,
    isTalentFenrirEngravingEnabled,
    clearTalentCardRuntimeState
});
