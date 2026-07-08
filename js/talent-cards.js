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

function parseTalentComboKey(comboKey) {
    let parts = String(comboKey || '').split('__');
    return { heroId: parts[0] || 'hero1', classKey: parts[1] || 'none' };
}
function makeTalentComboKey(heroId, classKey) {
    return `${heroId || 'hero1'}__${classKey || 'none'}`;
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

// ── 표면효과 = 키스톤(설명 표시), 이면효과 = 실제 스탯(배열, lv10 = 만렙 수치, 레벨 비례) ──
// surface 스키마: { desc } (표시 전용). hidden: [{ stat, lv10 }]
function scaleTalentOps(ops, lv, kind) {
    return (ops || []).filter(o => o && o.stat).map(o => ({ stat: o.stat, val: (o.perLevel || 0) * lv, kind }));
}

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

// 장착 스탯 합산용: 이면 스탯들(레벨 비례). (표면은 설명 표시 전용이라 스탯 미반영)
function getTalentCardStatBonuses(heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = getTalentCardDef(heroId, classKey);
    if (!def) return [];
    let out = [];
    talentHiddenList(def).forEach(h => { if (h && h.stat) out.push({ stat: h.stat, val: talentHiddenVal(h, lv), kind: 'hidden' }); });
    if (def.surface) {
        if (Array.isArray(def.surface.ops)) out.push(...scaleTalentOps(def.surface.ops, lv, 'surface'));
        else if (def.surface.stat) out.push({ stat: def.surface.stat, val: (def.surface.perLevel || 0) * lv, kind: 'surface' });
    }
    return out;
}

// 표면 키스톤의 조건부 피해 배율 설정(레벨 반영). 없으면 null.
function getTalentCardKeystoneDamage(heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = getTalentCardDef(heroId, classKey);
    if (!def || !def.surface || !def.surface.dmg) return null;
    let d = def.surface.dmg;
    return { moreMul: (d.perLevel || 0) * lv, when: d.when || 'always', threshold: d.threshold };
}

const TALENT_STAT_LABELS = {
    pctDmg: '피해 증가', physPctDmg: '물리 피해', meleePctDmg: '근접 피해', projectilePctDmg: '투사체 피해',
    elementalPctDmg: '원소 피해', firePctDmg: '화염 피해', coldPctDmg: '냉기 피해', lightPctDmg: '번개 피해',
    chaosPctDmg: '카오스 피해', dotPctDmg: '지속 피해 배율', summonPctDmg: '소환수 피해', aoePctDmg: '범위 피해',
    slamPctDmg: '강타 피해', weaponFlatDmgPct: '무기 기본 피해', crit: '치명타 확률', critDmg: '치명타 피해',
    aspd: '공격 속도', ds: '연속 타격', move: '이동 속도', pctHp: '생명력 증가', armorPct: '방어도',
    evasionPct: '회피', energyShieldPct: '에너지 보호막', resPen: '저항 관통', leech: '생명력 흡수',
    dr: '받는 피해 감소', physIgnore: '물리 피해 감소 무시', regen: '생명력 재생', regenSuppress: '재생 억제',
    blockChance: '막기 확률', deflectDamageReduce: '빗겨내기 피해 감소', resAll: '모든 원소 저항', resChaos: '카오스 저항',
    igniteChance: '점화 확률', poisonChance: '중독 확률', bleedChance: '출혈 확률', shockChance: '감전 확률',
    freezeChance: '동결 확률', chillChance: '한기 확률',
    ailResIgnite: '점화 저항 확률', ailResShock: '감전 저항 확률', ailResFreeze: '동결 저항 확률',
    ailResPoison: '중독 저항 확률', ailResBleed: '출혈 저항 확률',
    summonAspd: '소환수 공격 속도', summonHpPct: '소환수 생명력', summonResPen: '소환수 저항 관통',
    summonCritDmg: '소환수 치명타 피해', summonCrit: '소환수 치명타 확률', summonEfficiency: '소환수 효율'
};
function getTalentStatLabel(stat) {
    if (TALENT_STAT_LABELS[stat]) return TALENT_STAT_LABELS[stat];
    if (typeof P_STATS !== 'undefined' && P_STATS[stat] && P_STATS[stat].name) return P_STATS[stat].name;
    if (typeof getStatName === 'function') return getStatName(stat);
    return stat;
}

function getTalentKeystoneConditionText(when, threshold) {
    switch (when) {
        case 'lowLife': return `생명력 ${threshold || 50}% 이하에서 `;
        case 'highLife': return `생명력 ${threshold || 80}% 이상에서 `;
        case 'vsBoss': return '보스에게 ';
        case 'onCrit': return '치명타 시 ';
        case 'fewEnemies': return `적이 ${threshold || 3} 이하일 때 `;
        case 'manyEnemies': return `적이 ${threshold || 5} 이상일 때 `;
        case 'moving': return '이동 중 ';
        default: return '';
    }
}

function escapeTalentHtml(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function getTalentCardEffectLines(heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = getTalentCardDef(heroId, classKey);
    if (!def) return [];
    let lines = [];
    // 표면효과: 설명 표시(기획 텍스트)
    if (def.surface && def.surface.desc) {
        lines.push(`<span style="color:#ffd36b;">⭐ [표면] ${escapeTalentHtml(def.surface.desc)}</span>`);
    } else if (def.surface) {
        // 구버전(uniq/dmg/ops) 호환 표시
        let pos = [];
        (def.surface.uniq || []).forEach(u => {
            if (!u || !u.key) return;
            let p = Object.assign({}, u.params || {});
            if (u.perLevelParams) Object.keys(u.perLevelParams).forEach(k => { p[k] = (u.perLevelParams[k] || 0) * lv; });
            pos.push(getTalentUniqLabel(u.key, p));
        });
        if (def.surface.dmg) pos.push(`${getTalentKeystoneConditionText(def.surface.dmg.when, def.surface.dmg.threshold)}모든 피해 +${(def.surface.dmg.perLevel || 0) * lv}%`);
        if (pos.length) lines.push(`<span style="color:#ffd36b;">⭐ ${pos.join(' · ')}</span>`);
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
const TALENT_CARD_SLOT_UNLOCKS = [1, 4, 12, 25, 50, 100];
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
    if (typeof renderTalentTab === 'function') renderTalentTab();
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
    return out;
}

// 전투 호출용: 장착된 표면 키스톤들의 조건부 피해 배율 곱. (calcDamage 최종 배율 단계에서 적용)
function getTalentKeystoneDamageMul(target, ele, crit, pStats) {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let loadout = Array.isArray(game.talentCardLoadout) ? game.talentCardLoadout : [];
    let unlocked = getUnlockedTalentSlotCount();
    if (unlocked <= 0) return 1;
    let maxHp = Math.max(1, (pStats && pStats.maxHp) || 1);
    let lifeRatio = Math.max(0, Math.min(1, (game.playerHp || 0) / maxHp));
    let aliveEnemies = (game.enemies || []).filter(e => e && e.hp > 0).length;
    let mul = 1;
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        let key = loadout[i];
        if (!key || !owned[key]) continue;
        let { heroId, classKey } = parseTalentComboKey(key);
        let ks = getTalentCardKeystoneDamage(heroId, classKey, owned[key].level);
        if (!ks || !(ks.moreMul > 0)) continue;
        let ok = false;
        switch (ks.when) {
            case 'always': ok = true; break;
            case 'lowLife': ok = lifeRatio <= ((ks.threshold || 50) / 100); break;
            case 'highLife': ok = lifeRatio >= ((ks.threshold || 80) / 100); break;
            case 'vsBoss': ok = !!(target && target.isBoss); break;
            case 'onCrit': ok = !!crit; break;
            case 'fewEnemies': ok = aliveEnemies <= (ks.threshold || 3); break;
            case 'manyEnemies': ok = aliveEnemies >= (ks.threshold || 5); break;
            case 'moving': ok = (game.moveTimer || 0) > 0; break;
            default: ok = false;
        }
        if (ok) mul *= (1 + ks.moreMul / 100);
    }
    return mul;
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
    if (!wasFull || !enemy) return 0;
    let lv = isTalentCardActive('hero2__hunter');
    if (!lv) return 0;
    let pct = (enemy.isBoss ? 0.04 : 0.08) * (lv / TALENT_CARD_MAX_LEVEL);
    return Math.max(0, Math.floor((enemy.maxHp || enemy.hp || 0) * pct));
}

// 상태이상 시너지형 표면효과: 적이 받는 피해 배율(라이브 판정, 적 상태이상 기반).
//  5 프리즈믹 아처 / 29 브리지트 / 99 서리암살자
function getTalentEnemyTakenMul(enemy, ele, crit) {
    let a = (enemy && Array.isArray(enemy.ailments)) ? enemy.ailments : [];
    let has = t => a.some(x => x && x.type === t && (x.time || 0) > 0);
    let m = 1;
    if (isTalentCardActive('hero1__elementalist')) {           // 5: 냉기→허약, 점화→그을림
        if (crit && (has('chill') || has('freeze'))) m *= 1.15;
        if (ele === 'fire' && has('ignite')) m *= 1.20;
    }
    if (isTalentCardActive('hero3__elementalist') && ele !== 'phys' && ele !== 'chaos'
        && has('ignite') && has('freeze') && has('shock')) {   // 29: 세 상태이상 → 원소 피해 +20%
        m *= 1.20;
    }
    if (isTalentCardActive('hero9__assassin') && (has('chill') || has('freeze'))) { // 99: 냉각된 적 받는 피해 +
        m *= 1.12;
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
    if (isTalentCardActive('hero2__assassin')) t = Math.max(t, 0.30); // 15 도살자
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

// DPS 표시용: 장착 키스톤 조건부 배율 요약(상시분 곱 + 조건부 목록).
function getTalentKeystoneDamageSummary() {
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let loadout = Array.isArray(game.talentCardLoadout) ? game.talentCardLoadout : [];
    let unlocked = getUnlockedTalentSlotCount();
    let alwaysMul = 1, conditional = [];
    for (let i = 0; i < Math.min(unlocked, loadout.length); i++) {
        let key = loadout[i];
        if (!key || !owned[key]) continue;
        let { heroId, classKey } = parseTalentComboKey(key);
        let ks = getTalentCardKeystoneDamage(heroId, classKey, owned[key].level);
        if (!ks || !(ks.moreMul > 0)) continue;
        if (ks.when === 'always') alwaysMul *= (1 + ks.moreMul / 100);
        else conditional.push({ when: ks.when, threshold: ks.threshold, moreMul: ks.moreMul });
    }
    return { alwaysMul, conditional };
}

// 장착 카드들의 이면+표면 스탯 기여 합산 맵 {statId: val} (브레이크다운 표기용).
function getActiveTalentStatMap() {
    let map = {};
    getActiveTalentCardStatBonuses().forEach(b => { map[b.id] = (map[b.id] || 0) + b.val; });
    return map;
}

// 표면 키스톤이 부여하는 "고유 효과"(게임의 unique-effect 엔진 키)들을 레벨 반영해 반환.
// surface.uniq: [{ key, perLevelParams?: { paramName: perLevelValue }, params?: { 고정값 } }]
function getTalentCardUniqEffects(heroId, classKey, level) {
    let lv = Math.max(1, Math.min(TALENT_CARD_MAX_LEVEL, Math.floor(level || 1)));
    let def = getTalentCardDef(heroId, classKey);
    if (!def || !def.surface || !Array.isArray(def.surface.uniq)) return [];
    let cardName = def.name || `${heroId} ${classKey}`;
    return def.surface.uniq.map(u => {
        if (!u || !u.key) return null;
        let params = Object.assign({}, u.params || {});
        if (u.perLevelParams) Object.keys(u.perLevelParams).forEach(p => { params[p] = (u.perLevelParams[p] || 0) * lv; });
        return { key: u.key, params: params, itemName: '개화 키스톤: ' + cardName, sourceSlot: 'talentKeystone' };
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

function renderTalentTab() {
    let summaryEl = document.getElementById('ui-talent-summary');
    let gridEl = document.getElementById('ui-talent-card-grid');
    if (!summaryEl || !gridEl) return;
    let owned = (game.talentCards && typeof game.talentCards === 'object') ? game.talentCards : {};
    let ownedKeys = Object.keys(owned);
    let bd = getTalentBloomScoreBreakdown();
    let curScore = getTalentBloomScore();
    summaryEl.innerHTML = `보유 카드 <strong>${ownedKeys.length}</strong> / ${TALENT_BLOOM_TOTAL_CARDS} · 총 개화 ${Math.max(0, Math.floor(game.talentBloomClears || 0))}회`
        + `<br><span style="font-size:0.85em; color:#9fb4d1;">현재 개화 점수 <strong>${curScore}</strong> = 혼돈심화 ${bd.deepChaos} + 미궁 ${bd.labyrinth} + 혼돈계 ${bd.chaosFloor} + 지하계 ${bd.underFloor} + 우주계 ${bd.cosmos} + 전투력 ${bd.dpsTerm}</span>`
        + `<br><span style="font-size:0.82em; color:#9fe2b1;">🌸 한 번 획득한 개화 카드는 루프가 진행되어도 사라지지 않고 영구히 보유 · 적용됩니다.</span>`;

    // 장착 슬롯 영역
    ensureTalentCardLoadout();
    let loadout = game.talentCardLoadout;
    let unlockedSlots = getUnlockedTalentSlotCount();
    let slotHtml = '';
    for (let i = 0; i < TALENT_CARD_SLOT_COUNT; i++) {
        let unlocked = i < unlockedSlots;
        let key = loadout[i];
        if (!unlocked) {
            slotHtml += `<div class="talent-slot locked">🔒<br><span>보유 ${TALENT_CARD_SLOT_UNLOCKS[i]}장</span></div>`;
        } else if (key && owned[key]) {
            let { heroId, classKey } = parseTalentComboKey(key);
            let { heroLabel, classLabel } = getTalentCardName(heroId, classKey);
            slotHtml += `<div class="talent-slot filled" onclick="unequipTalentSlot(${i})" title="클릭하여 해제"><strong>${heroLabel}</strong><br><span>${classLabel} · Lv.${Math.max(1, Math.floor(owned[key].level || 1))}</span></div>`;
        } else {
            slotHtml += `<div class="talent-slot empty">빈 슬롯<br><span>카드를 눌러 장착</span></div>`;
        }
    }
    let nextSlot = unlockedSlots < TALENT_CARD_SLOT_COUNT ? `<span style="color:#9fb4d1;"> · 다음 슬롯: 보유 ${TALENT_CARD_SLOT_UNLOCKS[unlockedSlots]}장</span>` : '';
    let loadoutHtml = `<div style="grid-column:1/-1;">
        <div style="display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px;">
            <strong>장착 슬롯</strong><span style="font-size:0.82em;">열린 슬롯 ${unlockedSlots}/${TALENT_CARD_SLOT_COUNT}${nextSlot}</span>
        </div>
        <div class="talent-slot-row">${slotHtml}</div>
    </div>`;

    if (ownedKeys.length === 0) {
        gridEl.innerHTML = loadoutHtml + `<div style="grid-column:1/-1; color:#9fb4d1; padding:18px; text-align:center;">아직 개화한 카드가 없습니다. 지도 탭의 🌸 <strong>혹독한 겨울의 미궁</strong>(재능 개화 시련)을 클리어하면 현재 재능 × 직업 조합의 카드를 얻습니다.</div>`;
        return;
    }
    // 레벨 내림차순 정렬
    ownedKeys.sort((a, b) => (owned[b].level - owned[a].level) || (owned[b].score - owned[a].score));
    let cardsHtml = ownedKeys.map(key => {
        let card = owned[key];
        let { heroId, classKey } = parseTalentComboKey(key);
        let { heroLabel, classLabel, bloomName } = getTalentCardName(heroId, classKey);
        let level = Math.max(1, Math.floor(card.level || 1));
        let lines = getTalentCardEffectLines(heroId, classKey, level);
        let nextThreshold = level < TALENT_CARD_MAX_LEVEL ? TALENT_CARD_LEVEL_THRESHOLDS[level] : null;
        let nextText = nextThreshold !== null ? `다음 레벨 점수 ${nextThreshold}` : '최대 레벨';
        let equipped = getTalentCardSlotIndex(key) >= 0;
        return `<div class="talent-card${equipped ? ' equipped' : ''}" onclick="equipTalentCard('${key}')" title="클릭하여 ${equipped ? '해제' : '장착'}">
            <div class="talent-card-head">
                <span class="talent-card-title">${bloomName}</span>
                <span class="talent-card-level">Lv.${level}/${TALENT_CARD_MAX_LEVEL}</span>
            </div>
            <div class="talent-card-sub">재능 ${heroLabel} · 전직 ${classLabel}</div>
            <div class="talent-card-effects">${lines.join('<br>')}</div>
            <div class="talent-card-foot">${equipped ? '✅ 장착됨 · ' : ''}점수 ${Math.max(0, Math.floor(card.score || 0))} · 개화 ${Math.max(0, Math.floor(card.count || 0))}회 · ${nextText}</div>
        </div>`;
    }).join('');
    gridEl.innerHTML = loadoutHtml + cardsHtml;
}
