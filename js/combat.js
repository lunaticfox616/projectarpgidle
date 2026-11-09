// TODO: phased extraction target. Kept for load-order compatibility in phase 1.
// 이 파일의 함수들: 밖에서 이름으로 부르는 것만 끝의 exposeFileGlobals가 전역으로 내놓는다(scripts/privatize-functions.cjs).
(() => {
// Legacy runtime state that must follow the game snapshot during offline calculation.
function captureCombatRuntime() {
    return { pTimer, progressStallTicks, itemIdCounter, lastTime, pendingSkillStageHits,
        pendingEnemyCombatAttacks, combatTacticsRuntime, combatChannelRuntime,
        combatChannelResumeSkillName, nextCombatChannelId, nextPlayerDamageTextGroupId, trialHazardRuntime, skillGemCombatRuntime,
        mobilitySkill: mobilitySkill.capture(), wispSummons: wispSummons.capture() };
}

function restoreCombatRuntime(snapshot) {
    ({ pTimer, progressStallTicks, itemIdCounter, lastTime, pendingSkillStageHits,
        pendingEnemyCombatAttacks, combatTacticsRuntime, combatChannelRuntime,
        combatChannelResumeSkillName, nextCombatChannelId, nextPlayerDamageTextGroupId, trialHazardRuntime, skillGemCombatRuntime } = snapshot);
    mobilitySkill.restore(snapshot.mobilitySkill);
    wispSummons.restore(snapshot.wispSummons);
}

function createCombatTacticsRuntime(now) {
    let timestamp = Number.isFinite(now) ? now : getCombatTime();
    return {
        encounterKey: '', targetId: null, targetLockedUntil: 0, approachTargetId: null,
        attackDelayUntil: 0, nextMoveAt: 0, recoverUntil: 0,
        lastAttackAt: timestamp, previousCell: null, consecutiveRetreats: 0
    };
}

function resetCombatTacticsRuntime() {
    combatTacticsRuntime = createCombatTacticsRuntime();
    skillGemCombatRuntime = null;
    mobilitySkill.reset();
    wispSummons.reset();
}

/** The fight's module runtimes (attack timer, tactics and movement, skill stages, channels, the mobility rune, wisps in flight, battle
 * visuals) start over when another save replaces the game in play (js/cloud-save-ui.js applyExternalSave). Kept, their clocks from the old save
 * held the hero still when the loaded save's combat clock was earlier (2026-10-20 hunt: nextMoveAt 2 hours ahead, no kills). */
function resetCombatRuntimesForLoadedSave() {
    pTimer = 0;
    resetCombatTacticsRuntime();
    resetCombatChannelRuntime();
    resetBattleRuntimeVisuals();
}

function hasPlayerChannelBreakingAilment() {
    let breakingTypes = new Set(['freeze', 'stun', 'root', 'immobilize']);
    return (game.playerAilments || []).some(ailment => ailment && ailment.time > 0 && breakingTypes.has(ailment.type));
}

// Combat and animation have different clocks; mark cancellation without mixing their timestamps.
function cancelCombatChannelVisuals() {
    if (!combatChannelRuntime.id) return;
    for (const fx of battleFx) if (fx.channelId===combatChannelRuntime.id) fx.cancelled=true;
}

function updateCombatChannelRuntime(now) {
    let timestamp = Number.isFinite(now) ? now : getCombatTime();
    if (!combatChannelRuntime.id) return false;
    if (hasPlayerChannelBreakingAilment()) {
        cancelCombatChannel('군중 제어');
        return false;
    }
    if (timestamp >= combatChannelRuntime.endAt) {
        combatChannelResumeSkillName = combatChannelRuntime.skillName;
        combatChannelRuntime = { ...combatChannelRuntime, id: 0 };
    }
    return combatChannelRuntime.id > 0;
}

/** A double strike shares the current cycle; continued cycles retain their absolute deadline.
 * @param {string} skillName @param {number} motionMs @param {number} cycleMs
 * @param {{repeatChannelCast:boolean,channelContinuation:boolean}} context
 * @returns {{id:number,skillName:string,startAt?:number,endAt:number}}
 */
function beginCombatChannel(skillName, motionMs, cycleMs, context) {
    if (context.repeatChannelCast && combatChannelRuntime.id) return combatChannelRuntime;
    let startAt = getCombatTime() + motionMs;
    if (context.channelContinuation) startAt = combatChannelRuntime.endAt || getCombatTime();
    combatChannelRuntime = {
        id: nextCombatChannelId++, skillName, startAt, endAt: startAt + cycleMs
    };
    return combatChannelRuntime;
}

function getCombatChannelCycleMs(attackSpeed) {
    let attacksPerSecond = Math.max(0.01, Number(attackSpeed) || 1);
    return Math.max(1, Math.min(5000, 1000 / attacksPerSecond));
}

function createContinuousChannelStages(stages, cycleMs) {
    let source = Array.isArray(stages) ? stages : [];
    let stepMs = Math.max(1, Math.floor(Math.max(1, cycleMs) / Math.max(1, source.length)));
    return source.map((stage, index) => ({ ...stage, delayMs: index * stepMs }));
}

function consumeCombatChannelContinuation(skillName) {
    let continues = combatChannelResumeSkillName === String(skillName || '') || (!!combatChannelRuntime.id && combatChannelRuntime.skillName === skillName);
    combatChannelResumeSkillName = '';
    return continues;
}

function getCombatChannelGate(pStats, now) {
    let timestamp = Number.isFinite(now) ? now : getCombatTime();
    let active = !!combatChannelRuntime.id && timestamp < combatChannelRuntime.endAt;
    let ready = combatChannelResumeSkillName === String(game.activeSkill || '');
    if (!active && !ready) return { endAt: 0, locked: false, hasTargets: false };
    if (ready && hasPlayerChannelBreakingAilment()) {
        combatChannelResumeSkillName = '';
        return { endAt: 0, locked: false, hasTargets: false };
    }
    let hasTargets = getSkillTargets(pStats).length > 0;
    if (ready && !hasTargets) combatChannelResumeSkillName = '';
    return { endAt: active ? combatChannelRuntime.endAt : 0, locked: active || (ready && hasTargets), hasTargets };
}

/** 공격 후딜(ms): 공격 간격의 35%를 게임 프레임(20ms)으로 반올림한 길이, 가장 길게 20프레임. 최소값은 없다: 공속이 몇이든 쏘는 동안
 * 같은 몫이 묶인다(공속 1은 18프레임, 2는 9, 4는 4, 12는 1). 2026-10-17 사용자 "플레이어의 모든 공격에 후딜레이 넣어서 무빙샷 하기
 * 조금 어렵게", "최소값 없는걸로해", 초가 아니라 프레임 단위로. */
function getPlayerAttackRecoveryMs(aspd) {
    const rule = PLAYER_ATTACK_RECOVERY, interval = 1000 / Math.max(0.01, Number(aspd) || 1);
    return Math.min(rule.maxFrames, Math.round(interval * rule.share / rule.frameMs)) * rule.frameMs;
}

/** 공격 후딜 중인가: 그동안 주인공은 새 걸음을 시작하지 않는다(명령 걸음, 줍기 걸음, 다가가기, 거리 유지, 함정 피하기). 이미 내디딘
 * 한 칸은 마저 걷는다. 이동기는 후딜을 끊는다(js/mobility-skill.js). now: 그 걸음의 시각(걸음 시계 또는 전투 시각). */
function isPlayerAttackRecovering(now = getCombatTime()) {
    return now < (Number(combatTacticsRuntime.recoverUntil) || 0);
}

/** 이번 전투 틱에 공격 게이지가 차는 배수: 걸은 몫(20ms 걸음 프레임으로 센다)만큼 PLAYER_WALKING_CHARGE(절반)로 찬다. 사거리 안에
 * 적이 있을 때만이다(쏠 수 있는데 걸었다, 무빙샷): 적에게 다가가는 걸음은 그대로 찬다. 2026-10-17 사용자 "응 게이지 절반도 넣어줘".
 * walkedMs: 이번 틱에 걸은 ms(actExplorationProgress.takeWalkedMs). */
function getWalkingChargeScale(pStats, walkedMs) {
    const share = Math.min(1, Math.max(0, Number(walkedMs) || 0) / 100);
    if (!share || !getSkillTargets(pStats).length) return 1;
    return 1 - (1 - PLAYER_WALKING_CHARGE) * share;
}

function getTacticalMoveAttackDelayMs(moveSpeed) {
    let speed = Number.isFinite(moveSpeed) && moveSpeed > 0 ? moveSpeed : 100;
    return Math.round(Math.max(300, Math.min(650, 500 * Math.sqrt(100 / speed))));
}

function syncCombatTacticsEncounterRuntime() {
    let key = `${game.currentZoneId}:${Math.max(0, Math.floor(game.encounterIndex || 0))}`;
    if (combatTacticsRuntime.encounterKey === key) return;
    combatTacticsRuntime = createCombatTacticsRuntime();
    combatTacticsRuntime.encounterKey = key;
}

function noteCombatTacticAttack(attackMotionMs) {
    let now = getCombatTime();
    combatTacticsRuntime.lastAttackAt = now;
    combatTacticsRuntime.consecutiveRetreats = 0;
    combatTacticsRuntime.nextMoveAt = Math.max(combatTacticsRuntime.nextMoveAt, now + Math.max(0, attackMotionMs || 0));
}

/** @param {number} damage @param {number} chancePct @param {number} damagePct @param {boolean} overflow */
function getAverageCriticalHitDamage(damage, chancePct, damagePct, overflow) {
    let chance = Math.max(0, chancePct / 100);
    if (!overflow) chance = Math.min(1, chance);
    return damage * (1 + (Math.max(1, damagePct / 100) - 1) * chance);
}

function applyCritDamageSoftcap(rawCritDamage) {
    let raw = Math.max(0, Number(rawCritDamage) || 0);
    let capped = Math.min(raw, 200);
    if (raw > 200) capped += (Math.min(raw, 400) - 200) * 0.95;
    if (raw > 400) capped += (Math.min(raw, 800) - 400) * 0.90;
    if (raw > 800) capped += (Math.min(raw, 1200) - 800) * 0.80;
    if (raw > 1200) capped += (raw - 1200) * 0.67;
    return capped;
}

function getCritDamageSoftcapReduction(rawCritDamage) {
    let raw = Math.max(0, Number(rawCritDamage) || 0);
    return Math.max(0, raw - applyCritDamageSoftcap(raw));
}

function getArmorPhysicalReductionPct(armor, incomingPhysical) {
    let armorValue = Math.max(0, Number(armor) || 0);
    let hitValue = Math.max(1, Number(incomingPhysical) || 1);
    return Math.min(90, (armorValue / (armorValue + hitValue * ARMOR_MITIGATION_SCALE)) * 100);
}

function getEvasionChancePct(evasion, enemyAccuracy) {
    let evasionValue = Math.max(0, Number(evasion) || 0);
    let accuracyValue = Math.max(1, Number(enemyAccuracy) || 1);
    return Math.min(90, (evasionValue / (evasionValue + accuracyValue * EVASION_ACCURACY_SCALE)) * 100);
}

function getEnemyAccuracyForZone(zone) {
    let tier = Math.max(1, Number(zone && zone.tier) || 1);
    return Math.max(60, Math.floor(90 + tier * 24));
}

function getCombatEnemyAccuracy(enemy) {
    let explicitAccuracy = Number(enemy && enemy.accuracy);
    if (Number.isFinite(explicitAccuracy) && explicitAccuracy > 0) return explicitAccuracy;
    return getEnemyAccuracyForZone(getZone(game.currentZoneId) || getZone(0));
}

function getSummonEvadeChance(summon, enemy) {
    let rating = Math.max(0, Number(summon && summon.evasion) || 0);
    return Math.min(SUMMON_EVASION_CAP_PCT, getEvasionChancePct(rating, getCombatEnemyAccuracy(enemy)));
}

function resolveEntropyEvasion(defender, evadeChance, now) {
    let chance = Math.max(0, Math.min(90, Number(evadeChance) || 0));
    if (chance <= 0 || !defender || typeof defender !== 'object') return false;
    let hitChance = 100 - chance;
    let currentTime = Number.isFinite(now) ? now : getCombatTime();
    let state = evasionEntropyByDefender.get(defender);
    if (!state || currentTime - state.lastAt > EVASION_ENTROPY_RESET_MS) {
        state = { value: Math.floor(Math.random() * 100), lastAt: currentTime };
    }
    state.lastAt = currentTime;
    state.value += hitChance;
    let wasHit = state.value >= 100;
    if (wasHit) state.value -= 100;
    evasionEntropyByDefender.set(defender, state);
    return !wasHit;
}

function calculatePlayerAccuracy(level, dexterity, flatAccuracy, bonusPct) {
    let levelPart = Math.max(1, Math.floor(Number(level) || 1)) * PLAYER_ACCURACY_PER_LEVEL;
    let dexterityPart = Math.max(0, Number(dexterity) || 0) * PLAYER_ACCURACY_PER_DEXTERITY;
    let itemPart = Math.max(0, Number(flatAccuracy) || 0);
    let multiplier = 1 + Math.max(0, Number(bonusPct) || 0) / 100;
    return Math.max(1, Math.floor((PLAYER_ACCURACY_BASE + levelPart + dexterityPart + itemPart) * multiplier));
}

function getEnemyTotalEvadeChance(enemy, playerAccuracy) {
    if (!enemy) return 0;
    let flatChance = Math.max(0, Number(enemy.evasionChance) || 0);
    let ratingChance = getEvasionChancePct(Math.max(0, enemy.evasion || 0), Math.max(1, playerAccuracy || 1));
    return Math.min(70, flatChance + Math.min(45, ratingChance * 0.65));
}

function formatNumberKR(value) {
    let n = Number(value || 0);
    if (!Number.isFinite(n)) n = 0;
    return Math.floor(n).toLocaleString(i18n.locale);
}

function addEvasionCombatLog(target, isPlayer) {
    if (game.settings && game.settings.showCombatLog === false) return;
    let targetName = String(target && target.name ? target.name : '적');
    let isWoodsman = !isPlayer && (targetName.includes('나무꾼') || (target && target.zoneType === 'outsideChaos'));
    let message = isPlayer
        ? _t('🌀 플레이어 회피')
        : (isWoodsman ? _t('🪓 나무꾼 회피') : _t('🌀 {name} 회피', { name: targetName }));
    let aggregateKey = isPlayer ? 'combat:evasion:player' : (isWoodsman ? 'combat:evasion:woodsman' : `combat:evasion:enemy:${targetName}`);
    addLog(message, isPlayer ? 'loot-magic' : 'attack-monster', {
        noToast: true,
        aggregateKey: aggregateKey,
        aggregateWindowMs: 450
    });
}

/** One landed player hit, for the hit line in the combat log (getPlayerHitCombatLog): how much, how often, and on whom. */
function notePlayerHitSummary(summary, enemy, dealt) {
    summary.totalHits += 1;
    summary.totalDamage += dealt;
    summary.uniqueTargets.add(enemy.id);
    summary.targetName = enemy.name;
}

/** Who a player hit landed on: the one enemy's name, or how many when it spread over several. */
function getPlayerHitTargetLabel(summary) {
    let count = summary.uniqueTargets.size;
    return count >= 2 ? _t('적 {count}마리', { count }) : (summary.targetName || '적');
}

/** Damage scales for the detailed hit line: the flat life bonus, then the regen and fire resistance multipliers the skill shows. */
function getPlayerHitScaleText(pStats) {
    let scales = pStats.damageScales || {};
    let hidden = Array.isArray(pStats.sSkill.hideCombatScales) ? pStats.sSkill.hideCombatScales : [];
    let labels = PLAYER_HIT_SCALE_LABELS.filter(([key]) => !hidden.includes(key) && (scales[key] || 1) > 1.0001)
        .map(([key, label]) => `${label}x${(scales[key] || 1).toFixed(2)}`);
    if ((scales.hpFlatBonus || 0) > 0) labels.unshift(_t('생명력추가+{floor}', { floor: Math.floor(scales.hpFlatBonus) }));
    return labels.length > 0 ? _t('계수 {labels}', { labels: labels.join(', ') }) : '';
}

/** DoT stack note for the detailed hit line: the deepest stack among the hit enemies and its multiplier. */
function getPlayerHitDotStackText(targets) {
    let deepest = targets.reduce((max, row) => Math.max(max, (row.enemy && row.enemy.dotStacks) || 0), 0);
    return deepest > 0 ? _t('도트중첩 {deepest}/{DOT_STACK_MAX} ({deepest2}x)', { deepest, DOT_STACK_MAX, deepest2: getDotStackMultiplier(deepest).toFixed(2) }) : '';
}

/** Instant leech for the detailed hit line: two decimals below 1, one below 10, whole numbers above. */
function formatPlayerHitLeech(value) {
    if (value < 1) return value.toFixed(2);
    return value < 10 ? value.toFixed(1).replace(/\.0$/, '') : `${Math.floor(value)}`;
}

/** The detailed hit line's extra parts (설정의 상세 피해 기록), in reading order. */
function getPlayerHitDetailParts(summary, hit) {
    let parts = [];
    if (summary.totalHits >= 2) parts.push(`${summary.totalHits}히트`);
    if (hit.isDotSkill) parts.push('직격', getPlayerHitDotStackText(hit.targets));
    parts.push(getPlayerHitScaleText(hit.pStats));
    if (hit.instantLeechRecovered > 0) parts.push(`즉시흡수 +${formatPlayerHitLeech(hit.instantLeechRecovered)}`);
    return parts.filter(Boolean);
}

/** The player's hit line: skill, target and total damage ("이중 베기로 썩은 잔뿌리에게 1,033 피해"), the counterpart of the monster's
 * "○○의 공격으로 N 피해". 2026-10-06 user: "플레이어가 준 피해도 누구한테 준건지 표시됐으면 좋겠고". A critical hit keeps the line
 * colour and hands its number to the log, which colours only that ("치명타는 그냥 숫자 색만 바꿔도 충분할거같은데?"). Repeats merge
 * per target, crits apart. null when there is nothing to write (log off, or 0 damage: review 5). */
function getPlayerHitCombatLog(summary, hit) {
    if (!game.settings.showCombatLog || summary.totalDamage <= 0) return null;
    let amount = formatNumberKR(summary.totalDamage);
    let line = _t('{icon} {skill} {target}에게 {amount} 피해', { icon: getDamageElementIcon(hit.swingElement), skill: withDirectionParticle(_t(hit.skillName)), target: getPlayerHitTargetLabel(summary), amount });
    if (game.settings.showDetailedDamageLog === true) line = [line, ...getPlayerHitDetailParts(summary, hit)].join(' / ');
    let kind = hit.isCrit ? 'combat:hit-crit' : 'combat:hit';
    let target = summary.uniqueTargets.size === 1 ? [...summary.uniqueTargets][0] : 'many';
    return { line, options: { logIcon: 'attack', critValue: hit.isCrit ? amount : '', rateKey: kind,
        minIntervalMs: hit.isCrit ? 120 : 180, aggregateKey: `${kind}:${target}`, aggregateWindowMs: 500 } };
}

/** A corpse explosion: every other living enemy takes `splash` (onKill handles each death). Returns the combat log line naming whom it
 * reached ("전령 시체 폭발로 적 2마리에게 1,234 피해"), or '' when it reached nobody: it used to report damage over an empty field. */
function explodeCorpse(enemy, splash, label, onKill, noun = '피해') {
    let reached = [];
    (game.enemies || []).forEach(target => {
        if (!target || target.id === enemy.id || target.hp <= 0) return;
        applyDamageToEnemyResource(target, splash);
        reached.push(target.name);
        if (target.hp <= 0) onKill(target);
    });
    if (reached.length === 0) return '';
    let who = reached.length === 1 ? reached[0] : _t('적 {length}마리', { length: reached.length });
    return _t('💥 {label} {who}에게 {splash} {noun}', { label: withDirectionParticle(label), who, splash: formatNumberKR(splash), noun });
}

function applyLeechSoftcap(rawLeech) {
    let raw = Math.max(0, Number(rawLeech) || 0);
    if (raw <= LEECH_SOFTCAP_START) return raw;
    let midSpan = Math.max(0, Math.min(raw, LEECH_SOFTCAP_MID) - LEECH_SOFTCAP_START);
    let highSpan = Math.max(0, raw - LEECH_SOFTCAP_MID);
    return LEECH_SOFTCAP_START + midSpan * LEECH_SOFTCAP_MID_EFF + highSpan * LEECH_SOFTCAP_HIGH_EFF;
}

function getPlayerHitLeechPercent(pStats) {
    const tags = pStats.sSkill?.tags || [];
    if (tags.includes('spell')) return Math.max(0, pStats.spellLeech || 0);
    if (pStats.passiveKeystoneFlags?.soulSanctuary) return 0;
    return tags.includes('attack') ? Math.max(0, pStats.leech || 0) : 0;
}

function getPlayerHitLeechTarget(pStats) {
    let target = hasKeystone('wlk3') && pStats.energyShield > 0 ? 'energyShield' : 'life';
    if (pStats.passiveKeystoneFlags?.soulSanctuary && pStats.sSkill.tags.includes('spell')) target = 'energyShield';
    return target;
}

/** Only direct hit damage enters leech; spell and attack sources are independent. Returns immediate recovery. */
function applyPlayerHitLeech(pStats, hitDamage, chaosDamage) {
    const target = getPlayerHitLeechTarget(pStats);
    const attackAllowed = pStats.sSkill.tags.includes('attack') && !pStats.passiveKeystoneFlags?.soulSanctuary;
    const chaosPct = attackAllowed ? pStats.uniqueChaosDamageInstantLeechPct : 0;
    let recovered = applyInstantPlayerLeech(chaosDamage * chaosPct / 100, pStats, target);
    const amount = hitDamage * getPlayerHitLeechPercent(pStats) / 100;
    if (!(amount > 0)) return recovered;
    recovered += applyInstantPlayerLeech(amount * pStats.uniqueInstantLeechPct / 100, pStats, target);
    if (pStats.sSkill.instantLeech) recovered += applyInstantPlayerLeech(amount, pStats, target);
    else addPlayerLeechInstance(amount, pStats, target);
    return recovered;
}

function getLeechCaps(pStats, target) {
    let maxHp = Math.max(1, Number(pStats && pStats.maxHp) || 1);
    let maxEnergyShield = Math.max(0, Number(pStats && pStats.energyShield) || 0);
    let leechPool = target === 'energyShield' ? Math.max(1, maxEnergyShield) : maxHp;
    let instancePct = Math.max(0, LEECH_BASE_INSTANCE_CAP_PCT + (Number(pStats && pStats.leechInstanceCap) || 0));
    let totalPct = Math.max(0, LEECH_BASE_TOTAL_CAP_PCT + (Number(pStats && pStats.leechTotalCap) || 0));
    let ratePct = Math.max(0, LEECH_BASE_RATE_CAP_PCT + (Number(pStats && pStats.leechRateCap) || 0));
    return {
        instanceCap: leechPool * instancePct / 100,
        totalCap: leechPool * totalPct / 100,
        rateCap: leechPool * ratePct / 100,
        instancePct: instancePct,
        totalPct: totalPct,
        ratePct: ratePct
    };
}

function getActiveLeechInstances() {
    game.playerLeechInstances = Array.isArray(game.playerLeechInstances) ? game.playerLeechInstances : [];
    game.playerLeechInstances = game.playerLeechInstances
        .map(inst => ({
            remaining: Math.max(0, Number(inst && inst.remaining) || 0),
            rate: Math.max(0, Number(inst && inst.rate) || 0),
            target: inst && inst.target === 'energyShield' ? 'energyShield' : 'life'
        }))
        .filter(inst => inst.remaining > 0 && inst.rate > 0);
    return game.playerLeechInstances;
}

function getLeechOutstandingTotal() {
    return getActiveLeechInstances().reduce((sum, inst) => sum + Math.max(0, inst.remaining || 0), 0);
}

function addPlayerLeechInstance(rawAmount, pStats, target) {
    let amount = Math.max(0, Number(rawAmount) || 0);
    if (amount <= 0) return 0;
    let caps = getLeechCaps(pStats, target === 'energyShield' ? 'energyShield' : 'life');
    if (caps.instanceCap <= 0 || caps.totalCap <= 0 || caps.rateCap <= 0) return 0;
    let instances = getActiveLeechInstances();
    let outstanding = instances.reduce((sum, inst) => sum + Math.max(0, inst.remaining || 0), 0);
    let allowed = Math.max(0, caps.totalCap - outstanding);
    let stored = Math.min(amount, caps.instanceCap, allowed);
    if (stored <= 0) return 0;
    instances.push({
        remaining: stored,
        rate: caps.rateCap,
        target: target === 'energyShield' ? 'energyShield' : 'life'
    });
    game.playerLeechInstances = instances;
    return stored;
}

function applyInstantPlayerLeech(rawAmount, pStats, target) {
    let leechTarget = target === 'energyShield' ? 'energyShield' : 'life';
    let instantAmount = Math.max(0, Number(rawAmount) || 0);
    if (instantAmount <= 0) return 0;
    let caps = getLeechCaps(pStats, leechTarget);
    if (caps.instanceCap <= 0) return 0;
    instantAmount = Math.min(instantAmount, caps.instanceCap);
    if (leechTarget === 'energyShield') {
        let esCap = getPlayerEnergyShieldRecoveryCap(pStats);
        if (esCap <= 0) return 0;
        let before = Math.max(0, Number(game.playerEnergyShield) || 0);
        game.playerEnergyShield = Math.min(esCap, before + instantAmount);
        return Math.max(0, game.playerEnergyShield - before);
    }
    let hpCap = getPlayerRecoveryHpCap(pStats);
    let before = Math.max(0, Number(game.playerHp) || 0);
    game.playerHp = Math.min(hpCap, before + instantAmount);
    let recovered = Math.max(0, game.playerHp - before);
    return recovered;
}

function tickPlayerLeech(pStats, dt) {
    let instances = getActiveLeechInstances();
    if (instances.length === 0 || dt <= 0) return 0;
    let hpCap = getPlayerRecoveryHpCap(pStats);
    let esCap = getPlayerEnergyShieldRecoveryCap(pStats);
    let healed = 0;
    let next = [];
    instances.forEach(inst => {
        let tick = Math.min(inst.remaining, inst.rate * dt);
        if (tick <= 0) return;
        let consumed = tick;
        if (inst.target === 'energyShield') {
            if (esCap > 0) {
                let before = Math.max(0, Number(game.playerEnergyShield) || 0);
                game.playerEnergyShield = Math.min(esCap, before + tick);
                let gained = Math.max(0, game.playerEnergyShield - before);
                healed += gained;
                consumed = gained > 0 || !(pStats && pStats.leechKeepFullLife) ? tick : 0;
            }
        } else {
            let before = Math.max(0, Number(game.playerHp) || 0);
            game.playerHp = Math.min(hpCap, before + tick);
            let gained = Math.max(0, game.playerHp - before);
            healed += gained;
            consumed = gained > 0 || !(pStats && pStats.leechKeepFullLife) ? tick : 0;
        }
        inst.remaining = Math.max(0, inst.remaining - consumed);
        if (inst.remaining > 0) next.push(inst);
    });
    game.playerLeechInstances = next;
    return healed;
}

function getActiveRecoupInstances() {
    game.playerRecoupInstances = Array.isArray(game.playerRecoupInstances) ? game.playerRecoupInstances : [];
    game.playerRecoupInstances = game.playerRecoupInstances
        .map(inst => ({ remaining: Math.max(0, Number(inst && inst.remaining) || 0), rate: Math.max(0, Number(inst && inst.rate) || 0) }))
        .filter(inst => inst.remaining > 0 && inst.rate > 0);
    return game.playerRecoupInstances;
}

function addPlayerRecoupInstance(rawAmount, durationSec) {
    let amount = Math.max(0, Number(rawAmount) || 0);
    let duration = Math.max(0.5, Number(durationSec) || 4);
    if (amount <= 0) return 0;
    let instances = getActiveRecoupInstances();
    instances.push({ remaining: amount, rate: amount / duration });
    game.playerRecoupInstances = instances;
    return amount;
}

function tickPlayerRecoup(pStats, dt) {
    let instances = getActiveRecoupInstances();
    if (instances.length === 0 || dt <= 0) return 0;
    let hpCap = getPlayerRecoveryHpCap(pStats);
    let healed = 0;
    let next = [];
    instances.forEach(inst => {
        let tick = Math.min(inst.remaining, inst.rate * dt);
        if (tick <= 0) return;
        let before = Math.max(0, Number(game.playerHp) || 0);
        game.playerHp = Math.min(hpCap, before + tick);
        healed += Math.max(0, game.playerHp - before);
        inst.remaining = Math.max(0, inst.remaining - tick);
        if (inst.remaining > 0) next.push(inst);
    });
    game.playerRecoupInstances = next;
    return healed;
}

function refreshRealmDeathWard(pStats) {
    let cfg = pStats && pStats.uniqueDeathWard;
    if (!cfg) {
        game.realmDeathWard = null;
        return null;
    }
    let state = game.realmDeathWard && typeof game.realmDeathWard === 'object'
        ? game.realmDeathWard
        : { amount: 0, maxAmount: 0, readyAt: 0 };
    let maxAmount = Math.max(1, Math.floor(Math.max(1, Number(pStats.maxHp) || 1) * Math.max(0, Number(cfg.hpPct || 12)) / 100));
    state.maxAmount = maxAmount;
    if ((state.amount || 0) <= 0 && getCombatTime() >= (state.readyAt || 0)) {
        state.amount = maxAmount;
        state.readyAt = 0;
        if (game.settings && game.settings.showCombatLog !== false) addLog(_t('🪨 망자 감시 보호막 재생: {maxAmount}', { maxAmount }), 'loot-magic', { noToast: true });
    } else {
        state.amount = Math.min(maxAmount, Math.max(0, Math.floor(state.amount || 0)));
    }
    game.realmDeathWard = state;
    return state;
}

function absorbDamageWithRealmDeathWard(amount, pStats) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    if (remaining <= 0) return 0;
    let state = refreshRealmDeathWard(pStats);
    if (!state || (state.amount || 0) <= 0) return remaining;
    let absorbed = Math.min(remaining, Math.max(0, Math.floor(state.amount || 0)));
    state.amount = Math.max(0, Math.floor((state.amount || 0) - absorbed));
    remaining -= absorbed;
    if (state.amount <= 0) {
        let cooldownMs = Math.max(1000, Math.floor(Math.max(1, Number(pStats.uniqueDeathWard.cooldown || 20)) * 1000));
        state.readyAt = getCombatTime() + cooldownMs;
    }
    if (absorbed > 0) addBattleFx('statusText', { text: _t('감시 보호막 -{absorbed}', { absorbed }), color: '#b9c8d8', duration: 300 });
    return remaining;
}

function absorbDamageWithTalentStoneShield(amount) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    let runtime = game.talentCardRuntime;
    if (remaining <= 0 || !runtime || typeof runtime !== 'object') return remaining;
    if ((runtime.stoneShieldExpiresAt || 0) <= getCombatTime()) {
        delete runtime.stoneShieldAmount;
        delete runtime.stoneShieldMax;
        delete runtime.stoneShieldExpiresAt;
        return remaining;
    }
    let absorbed = Math.min(remaining, Math.max(0, Math.floor(Number(runtime.stoneShieldAmount) || 0)));
    runtime.stoneShieldAmount = Math.max(0, Math.floor((runtime.stoneShieldAmount || 0) - absorbed));
    if (absorbed > 0) addBattleFx('statusText', { text: _t('돌 보호막 -{absorbed}', { absorbed }), color: '#d8b77a', duration: 300 });
    return remaining - absorbed;
}

/** 받는 피해를 0 이상의 정수로 맞춘다. */
function floorIncomingDamage(amount) {
    return Math.max(0, Math.floor(Math.max(0, Number(amount) || 0)));
}

/** 키스톤 id → 전직. 정의 객체가 바뀌면 다시 만든다(정의는 불러올 때 한 번 정해진다). */
function getAscendKeystoneOwnerClass(id) {
    if (typeof CLASS_KEYSTONE_DEFS === 'undefined' || !CLASS_KEYSTONE_DEFS || !id) return null;
    if (!ascendKeystoneOwnerIndex || ascendKeystoneOwnerIndex.source !== CLASS_KEYSTONE_DEFS) ascendKeystoneOwnerIndex = buildAscendKeystoneOwnerIndex(CLASS_KEYSTONE_DEFS);
    return ascendKeystoneOwnerIndex.byId.get(id) || null;
}

function buildAscendKeystoneOwnerIndex(defs) {
    const byId = new Map();
    Object.keys(defs).forEach(classKey => (defs[classKey] || []).forEach(node => { if (node && node.id && !byId.has(node.id)) byId.set(node.id, classKey); }));
    return { source: defs, byId };
}

/** 고른 키스톤은 그 전직일 때만, 우주계 쌍둥이 키스톤은 전직과 상관없이 켜진다. */
function hasKeystone(id, owner = game) {
    if (Array.isArray(owner.cosmosTwinKeystones) && owner.cosmosTwinKeystones.includes(id)) return true;
    if (!Array.isArray(owner.ascendKeystones) || !owner.ascendKeystones.includes(id)) return false;
    return getAscendKeystoneOwnerClass(id) === owner.ascendClass;
}

function getElementalistOverloadStacks() {
    return Math.max(0, Math.min(ELEMENTALIST_OVERLOAD_STACK_MAX,
        Math.floor(game.elementalistOverloadStacks || 0)));
}

function recordElementalistOverloadAttack(isCrit) {
    if (!hasKeystone('e8')) return getElementalistOverloadStacks();
    game.elementalistOverloadStacks = isCrit
        ? Math.min(ELEMENTALIST_OVERLOAD_STACK_MAX, getElementalistOverloadStacks() + 1)
        : 0;
    game.elementalistOverloadExpiresAt = 0;
    return game.elementalistOverloadStacks;
}

function getWarriorRageStacks(now) {
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    if ((game.warriorRageExpiresAt || 0) <= timestamp) return 0;
    return Math.max(0, Math.min(WARRIOR_RAGE_STACK_MAX, Math.floor(game.warriorRageStacks || 0)));
}

function getWarriorRagePhysicalDamageMultiplier(now) {
    return 1 + getWarriorRageStacks(now) * WARRIOR_RAGE_STACK_DAMAGE_PCT / 100;
}

function grantWarriorRageOnHit(now) {
    if (!hasKeystone('w5')) return 0;
    let timestamp = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
    game.warriorRageStacks = Math.min(WARRIOR_RAGE_STACK_MAX, getWarriorRageStacks(timestamp) + 1);
    game.warriorRageExpiresAt = timestamp + WARRIOR_RAGE_DURATION_MS;
    return game.warriorRageStacks;
}

function clearAscendKeystoneRuntimeState(removedIds, options) {
    let opts = options && typeof options === 'object' ? options : {};
    let ids = Array.isArray(removedIds) ? removedIds.filter(Boolean) : [];
    if (ids.length === 0 && !opts.forceAll) return;
    let removed = new Set(ids);
    let shouldClear = id => (opts.forceAll || removed.has(id)) && (opts.force || !hasKeystone(id));
    let clearFields = fields => fields.forEach(field => { game[field] = 0; });

    if (shouldClear('w2')) clearFields(['warriorRhythmStacks', 'warriorRhythmExpiresAt', 'warriorRhythmDoubleStacks', 'warriorRhythmDoubleExpiresAt']);
    if (shouldClear('w5')) clearFields(['warriorRageStacks', 'warriorRageExpiresAt']);
    if (shouldClear('g2')) clearFields(['gladiatorFlurryStacks', 'gladiatorFlurryExpiresAt']);
    if (shouldClear('g3')) clearFields(['gladiatorVeteranCritBonus']);
    if (shouldClear('g5')) {
        game.gladiatorSwiftOpeningReady = false;
        game.gladiatorSwiftGuardReady = false;
    }
    if (shouldClear('a2')) game.assassinBlurred = false;
    if (shouldClear('r5')) game.rangerWeakpointMarks = {};
    if (shouldClear('e8')) clearFields(['elementalistOverloadStacks', 'elementalistOverloadExpiresAt']);
    if (shouldClear('ct4')) game.catalystEvadeBoostReady = false;
    if (shouldClear('ct8')) clearFields(['catalystBurstReadyAt']);
    if (shouldClear('cr8')) clearFields(['crusaderEsRegenUntil', 'crusaderLightningAegisUntil', 'crusaderEsRegenCooldownUntil']);
    if (shouldClear('gd6')) clearFields(['guardianEnduranceStacks', 'guardianEnduranceExpiresAt']);
    if (shouldClear('gd7')) clearFields(['guardianLastStandCleanseAt']);
    if (shouldClear('wlk9')) game.enemyWitherStacks = {};

    let removeEnemyAilment = type => {
        (game.enemies || []).forEach(enemy => {
            if (!enemy || !Array.isArray(enemy.ailments)) return;
            enemy.ailments = enemy.ailments.filter(ailment => !ailment || ailment.type !== type);
        });
    };
    if (shouldClear('a3')) {
        let debuffs = game.enemyKeystoneDebuffs && typeof game.enemyKeystoneDebuffs === 'object'
            ? game.enemyKeystoneDebuffs
            : {};
        Object.keys(debuffs).forEach(enemyId => {
            let next = Array.isArray(debuffs[enemyId]) ? debuffs[enemyId].filter(row => !row || row.type !== 'a3') : [];
            if (next.length > 0) debuffs[enemyId] = next;
            else delete debuffs[enemyId];
        });
        game.enemyKeystoneDebuffs = debuffs;
        removeEnemyAilment('assassinWeakness');
    }
    if (shouldClear('h2')) removeEnemyAilment('hunterExpose');
}

/** 장비 맵의 소켓에 낀 주얼 전부(공허 · 타락 · 심연 소켓 순, source는 소켓 종류). 주얼은 2026-09-30부터 장비 소켓에만 낀다. */
function collectSocketedJewels(equipment) {
    return Object.entries(equipment || {}).flatMap(([slot, item]) => equipmentSockets.jewels(item)
        .map(row => ({ jewel: row.jewel, slot, source: row.kind, index: row.index })));
}

/** 요구치를 채워 실제로 적용되는 장비의 소켓 주얼. */
function getSocketedJewels(owner = game) {
    return collectSocketedJewels(combatEquipmentStats.activeEquipment(owner));
}

// 거울 심장: 반지 소켓에 끼우면 반대쪽 반지 소켓의 주얼을 한 번 더 적용한다(예전 '반대 슬롯 주얼 복제').
function getMirroredRingJewels(owner = game) {
    let rings = {};
    getSocketedJewels(owner).forEach(row => { if (row.source === 'void') rings[row.slot] = row.jewel; });
    return [['반지1', '반지2'], ['반지2', '반지1']]
        .filter(([host, partner]) => rings[host] && rings[host].uniqueId === 'uj_mirror_heart' && rings[partner])
        .map(([, partner]) => rings[partner]);
}

// 우주계 쌍둥이 주얼: 주베누비아의 균형 + 주벤샤말의 심판을 장비 소켓에 함께 끼우고
// 두 주얼에 고정 배정된 전직 키스톤이 일치하면 해당 키스톤을 무료로 할당한다.
function recomputeCosmosTwinKeystones() {
    let granted = [];
    let slots = collectSocketedJewels(game.equipment).map(row => row.jewel);
    let ensureKeystone = (jewel) => {
        if (!jewel || !jewel.cosmosKeystoneJewel) return;
        if (!jewel.cosmosKeystone && typeof pickRandomAscendKeystoneId === 'function') jewel.cosmosKeystone = pickRandomAscendKeystoneId();
    };
    slots.forEach(ensureKeystone);
    let balance = slots.find(j => j && j.uniqueId === 'cbj_zubenubia_balance' && j.cosmosKeystone);
    let judgment = slots.find(j => j && j.uniqueId === 'cbj_zubenshamali_judgment' && j.cosmosKeystone);
    if (balance && judgment && balance.cosmosKeystone === judgment.cosmosKeystone) granted.push(balance.cosmosKeystone);
    game.cosmosTwinKeystones = granted;
    // 키스톤과 고유 주얼이 켜는 옛 재능 카드 효과도 같은 때 다시 센다(js/talent-cards.js, 2026-10-02 재능 정리).
    if (typeof refreshGrantedBloomMechanics === 'function') refreshGrantedBloomMechanics(game);
    return granted;
}

function getAliveEnemyByRuntimeKey(enemyId) {
    let numericId = Number(enemyId);
    if (!Number.isFinite(numericId)) return null;
    return (game.enemies || []).find(e => e && e.id === numericId && e.hp > 0) || null;
}

function getCombatTalentCardLevel(cardId) {
    if (typeof window.isTalentCardActive !== 'function') return 0;
    let level = Number(window.isTalentCardActive(cardId));
    return Number.isFinite(level) ? Math.max(0, level) : 0;
}

function getActiveTalentUniqueEffects() {
    // 모든 카드 고유 효과는 getActiveTalentKeystoneUniqueEffects() 한 경로에서만 주입한다.
    // 별도 주입하면 조건부 카드(플레쳐 등)가 일반 고유 효과와 중복 적용될 수 있다.
    return [];
}

function prepareTalentPlayerAttackContext(pStats) {
    game.talentFletcherAttackBoostActive = false;
    if (getCombatTalentCardLevel('hero1__gladiator') <= 0) return;
    if (!pStats || !pStats.sSkill || !Array.isArray(pStats.sSkill.tags) || !pStats.sSkill.tags.includes('projectile')) return;
    game.talentFletcherCount = Math.max(0, Math.floor(game.talentFletcherCount || 0)) + 1;
    if (game.talentFletcherCount % 3 !== 0) return;
    game.talentFletcherAttackBoostActive = true;
    pStats.sSkill.targets = Math.min(12, Math.max(1, Math.floor(pStats.sSkill.targets || 1)) + 3);
}

function getTalentPlayerAttackDamageMultiplier() {
    let mul = typeof window.getTalentAttackDamageMul === 'function' ? Number(window.getTalentAttackDamageMul()) : 1;
    if (!Number.isFinite(mul)) return 1;
    return Math.max(0, mul);
}

function performTalentMoonReturn(pStats, options, didHit) {
    let config = options && options.talentMoonReturn;
    if (!didHit || !config || options.skipTalentMoon || Number(options.stageIndex) !== 0) return;
    let target = (game.enemies || []).find(enemy => enemy && enemy.id === config.targetId && enemy.hp > 0);
    let alive = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0);
    if (!target || alive.length !== 1) return;
    performPlayerAttack(pStats, {
        stageReplay: true,
        skipTalentMoon: true,
        skipSlamEcho: true,
        targetEntries: [{ enemyId: target.id, mult: 1 }],
        skillName: options.skillName,
        forcedElement: options.forcedElement,
        stageKind: 'moonReturn',
        stageLabel: '달빛 귀환',
        stageIndex: 0,
        stageCount: 1,
        hitDamageMultiplier: config.damageMultiplier,
        attackDamageMultiplier: options.attackDamageMultiplier,
        talentAttackMultiplier: options.talentAttackMultiplier
    });
}

function updateTalentButcherHitMark(enemy) {
    if (getCombatTalentCardLevel('hero2__assassin') <= 0) return;
    if (!enemy) return;
    game.talentButcherMarks = game.talentButcherMarks || {};
    let row = game.talentButcherMarks[enemy.id] || { hits: 0 };
    row.hits = Math.max(0, Math.floor(row.hits || 0)) + 1;
    game.talentButcherMarks[enemy.id] = row;
}

function canApplyTalentExecuteThreshold(enemy, threshold) {
    if (!enemy || enemy.isBoss || threshold <= 0) return false;
    return true;
}

function getPlayerHpCap(pStats) {
    if (!pStats) return 0;
    let maxHp = Math.max(0, pStats.maxHp || 0);
    return (hasKeystone('w8')) ? (maxHp * 0.5) : maxHp;
}

/** @param {{get: (name: string) => unknown}} [tick] The stat calculator's tick (js/player-stat-cache.js); others read live. */
function getPlayerRecoveryHpCap(pStats, tick) {
    let baseCap = getPlayerHpCap(pStats);
    if (hasKeystone('w8')) return baseCap;
    let overhealPct = Math.max(0, Number(pStats && pStats.uniqueOverhealCapPct) || 0);
    let cap = baseCap * (100 + overhealPct) / 100;
    let occupied = tick ? tick.get('mossRecoveryOccupied') : getMossRecoveryOccupied();
    return Math.max(1, cap - occupied);
}

function getMossRecoveryOccupied() {
    let mossRows = game.talentCardRuntime && Array.isArray(game.talentCardRuntime.mossRecoveries)
        ? game.talentCardRuntime.mossRecoveries : [];
    return mossRows.reduce((sum, row) => sum + Math.max(0, Number(row && row.amount) || 0), 0);
}

function getPlayerEnergyShieldRecoveryCap(pStats) {
    let baseCap = Math.max(0, Number(pStats && pStats.energyShield) || 0);
    let overhealPct = Math.max(0, Number(pStats && pStats.uniqueOverhealCapPct) || 0);
    return baseCap * (100 + overhealPct) / 100;
}

function isDualWielding() {
    let equipment = combatEquipmentStats.activeEquipment(game);
    let mainWeapon = equipment && equipment['무기'];
    let shieldWeapon = equipment && equipment['방패'];
    return !!(mainWeapon && shieldWeapon && shieldWeapon.slot === '무기');
}

/** 야생 부적(루프 25+, 예전 생장 아이템 드랍 자리): 장비 드랍과 따로 굴린다. 이야기 액트 원정은 그루터기 함 드랍처럼
 * 굴리지 않는다. 알림은 그루터기 함 화면이 stump-box-changed로 남긴다. */
function rollWildTalismanDrop(enemy, chance) {
    if (!talismans.wildDropsOpen(game) || actExplorationState.current(game)?.act != null || Math.random() >= chance) return;
    const rolled = talismans.rollWildDrop(enemy, Math.random);
    if (placeFloorItem(enemy, 'talisman', rolled.talisman, rolled.overflow)) return;
    const drop = talismans.receiveWild(game, rolled);
    if (drop.item) queueEnemyGroundLoot(enemy, { item: drop.item, itemKind: 'talisman', color: TALISMAN_RARITY_TONES[drop.item.rarity] });
    announceWildTalisman(drop);
}

/** Expires talisman curses every combat tick (and in grand breach runs). Rows from the removed condition gems carry no delta and go too. */
function expireConditionEffects(now) {
    let map = game.enemyConditionDebuffs || {};
    Object.keys(map).forEach(id => {
        map[id] = (map[id] || []).filter(deb => deb && deb.delta && (deb.expiresAt || 0) > now);
        if (map[id].length === 0) delete map[id];
    });
    game.enemyConditionDebuffs = map;
}

function pruneEnemyRuntimeDebuffMaps() {
    let alive = new Set((game.enemies || []).filter(e => e && e.hp > 0).map(e => String(e.id)));
    function pruneMap(obj, maxKeys) {
        let src = (obj && typeof obj === 'object') ? obj : {};
        let keys = Object.keys(src);
        if (keys.length === 0) return {};
        let out = {};
        let kept = 0;
        for (let i = 0; i < keys.length; i++) {
            let k = keys[i];
            if (!alive.has(String(k))) continue;
            out[k] = src[k];
            kept++;
            if (kept >= maxKeys) break;
        }
        return out;
    }
    game.enemyKeystoneDebuffs = pruneMap(game.enemyKeystoneDebuffs, 180);
    game.rangerWeakpointMarks = pruneMap(game.rangerWeakpointMarks, 180);
    game.enemyUniqueChaosResDown = pruneMap(game.enemyUniqueChaosResDown, 180);
    game.enemyUniqueElementalResDown = pruneMap(game.enemyUniqueElementalResDown, 180);
    game.enemyConditionDebuffs = pruneMap(game.enemyConditionDebuffs, 180);
    game.talentButcherMarks = pruneMap(game.talentButcherMarks, 180);
}

/** A curse entry's stat delta (talisman curses carry it). */
function getConditionDebuffDelta(deb) {
    return deb.delta || {};
}

function getEnemyConditionDebuffFactor(enemy, pStats) {
    let list = (game.enemyConditionDebuffs && enemy) ? (game.enemyConditionDebuffs[enemy.id] || []) : [];
    let fx = { mul: 1, resShred: 0, resFShred: 0, resCShred: 0, resLShred: 0, resChaosShred: 0, physDrShred: 0, projectileTakenMul: 1, lightTakenMul: 1, chaosTakenMul: 1, enemyDmgMul: 1, enemyRegenRateMul: 1, projectileExtraHits: 0, critDmgTakenMul: 1, ailmentChanceAdd: {}, ailmentTakenMul: {} };
    list.forEach(deb => {
        let d = getConditionDebuffDelta(deb);
        fx.mul *= (d.enemyTakenMul || 1);
        fx.resShred += (d.enemyResShred || 0);
        fx.resFShred += (d.enemyResFShred || 0);
        fx.resCShred += (d.enemyResCShred || 0);
        fx.resLShred += (d.enemyResLShred || 0);
        fx.resChaosShred += (d.enemyResChaosShred || 0);
        fx.physDrShred += (d.enemyPhysDrShred || 0);
        fx.projectileTakenMul *= (d.enemyProjectileTakenMul || 1);
        fx.lightTakenMul *= (d.enemyLightTakenMul || 1);
        fx.chaosTakenMul *= (d.enemyChaosTakenMul || 1);
        fx.enemyDmgMul *= (d.enemyDmgMul || 1);
        fx.enemyRegenRateMul *= (d.enemyRegenRateMul || 1);
        fx.projectileExtraHits += (d.projectileExtraHits || 0);
        fx.critDmgTakenMul *= (d.enemyCritDmgTakenMul || 1);
        if (d.igniteChanceAdd) fx.ailmentChanceAdd.ignite = (fx.ailmentChanceAdd.ignite || 0) + d.igniteChanceAdd;
        if (d.chillChanceAdd) fx.ailmentChanceAdd.chill = (fx.ailmentChanceAdd.chill || 0) + d.chillChanceAdd;
        if (d.freezeChanceAdd) fx.ailmentChanceAdd.freeze = (fx.ailmentChanceAdd.freeze || 0) + d.freezeChanceAdd;
        if (d.shockChanceAdd) fx.ailmentChanceAdd.shock = (fx.ailmentChanceAdd.shock || 0) + d.shockChanceAdd;
        if (d.poisonChanceAdd) fx.ailmentChanceAdd.poison = (fx.ailmentChanceAdd.poison || 0) + d.poisonChanceAdd;
        if (d.bleedChanceAdd) fx.ailmentChanceAdd.bleed = (fx.ailmentChanceAdd.bleed || 0) + d.bleedChanceAdd;
        if (d.igniteTakenMul || d.fireDotTakenMul) fx.ailmentTakenMul.ignite = (fx.ailmentTakenMul.ignite || 1) * (d.igniteTakenMul || 1) * (d.fireDotTakenMul || 1);
        if (d.poisonTakenMul) fx.ailmentTakenMul.poison = (fx.ailmentTakenMul.poison || 1) * d.poisonTakenMul;
        if (d.bleedTakenMul) fx.ailmentTakenMul.bleed = (fx.ailmentTakenMul.bleed || 1) * d.bleedTakenMul;
    });
    if (pStats && pStats.uniqueCursedTakenAndRefresh && list.length > 0) fx.mul *= Math.max(1, Number(pStats.uniqueCursedTakenAndRefresh.takenMul) || 1);
    fx.mul = Math.min(1.35, fx.mul);
    fx.resShred = Math.min(20, fx.resShred);
    return fx;
}

function getKeystoneEnemyTakenMultiplier(enemy, hitElement) {
    if (!enemy) return 1;
    let now = getCombatTime();
    let mul = 1;
    let debuffs = game.enemyKeystoneDebuffs || {};
    let list = debuffs[enemy.id] || [];
    list = list.filter(row => row && (row.expiresAt || 0) > now);
    debuffs[enemy.id] = list;
    game.enemyKeystoneDebuffs = debuffs;
    let a3Stacks = list.filter(row => row.type === 'a3').length;
    if (a3Stacks > 0) mul *= (1 + Math.min(10, a3Stacks) * ASCENDANCY_KEYSTONE_VALUES.a3.takenPctPerStack / 100);
    return mul;
}

function getConditionPhysicalReductionCap(conditionEffects) {
    let hasGuardCap = false;
    let warcryCapBonus = 0;
    conditionEffects.forEach(({ buff, delta }) => {
        if (!delta || !(delta.dr > 0)) return;
        if (buff.type !== 'warcry') {
            hasGuardCap = true;
            return;
        }
        let bonus = Math.min(WARCRY_PHYSICAL_REDUCTION_CAP_BONUS_PCT, Math.max(0, Number(delta.drCapBonus) || 0));
        warcryCapBonus += bonus;
    });
    if (hasGuardCap) return CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT;
    return Math.min(CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT, PLAYER_PHYSICAL_REDUCTION_CAP_PCT + warcryCapBonus);
}

function applyConditionPhysicalReductionEffects(pStats, conditionEffects) {
    let cap = getConditionPhysicalReductionCap(conditionEffects);
    let rawDr = Number.isFinite(Number(pStats.rawDr)) ? Number(pStats.rawDr) : (Number(pStats.dr) || 0);
    conditionEffects.forEach(({ delta }) => { rawDr += Number(delta && delta.dr) || 0; });
    conditionEffects.forEach(({ delta }) => {
        let armorMultiplier = Number(delta && delta.armorMul) || 0;
        if (armorMultiplier > 0) rawDr += Math.max(0, Math.min(cap, rawDr) * armorMultiplier);
    });
    pStats.rawDr = rawDr;
    pStats.dr = Math.min(cap, rawDr);
    return cap;
}

function snapshotWoodsmanBuildState() {
    return JSON.parse(JSON.stringify({
        passives: game.passives || [],
        passiveAttributePreference: game.passiveAttributePreference || 'strength',
        passiveAttributeChoices: game.passiveAttributeChoices || {},
        ascendNodes: game.ascendNodes || [],
        ascendKeystones: game.ascendKeystones || [],
        passivePoints: game.passivePoints || 0,
        seasonPoints: game.seasonPoints || 0,
        ascendPoints: game.ascendPoints || 0,
        ascendKeystonePoints: game.ascendKeystonePoints || 0,
        scour: game.scour || 0,
        equipment: game.equipment || {},
        inventory: game.inventory || [],
        skills: game.skills || [],
        activeSkill: game.activeSkill || '기본 공격', mobilitySkill: game.mobilitySkill,
        supports: game.supports || [],
        equippedSupports: game.equippedSupports || [],
        ...window.GameModules.combat.supports.lockState(game),
        supportGemData: game.supportGemData || {},
        playerLeechInstances: game.playerLeechInstances || [],
        playerRecoupInstances: game.playerRecoupInstances || [],
        gemData: game.gemData || {},
        jewelInventory: game.jewelInventory || []
    }));
}

/** Points earned during the woodsman fight stay (a level-up, the woodsman's journal reward): spending and refunds are refused while
 * locked (assertBuildEditable, activatePassivePath), so a pool above the snapshot can only be earned, and the snapshot follows it. The
 * lock used to put the entry pool back every tick (2026-10-20 hunt: a level-up point vanished on the next tick). */
function keepEarnedWoodsmanPoints(snap) {
    for (const key of ['passivePoints', 'seasonPoints', 'ascendPoints', 'ascendKeystonePoints']) {
        const now = Math.floor(Number(game[key]) || 0);
        if (now > Math.floor(Number(snap[key]) || 0)) snap[key] = now;
    }
}

function woodsmanSnapshotPrint(snap) {
    let prints = woodsmanSnapshotPrints.get(snap);
    if (prints) return prints;
    prints = {};
    for (const [field, fallback] of WOODSMAN_LOCKED_FIELDS) prints[field] = JSON.stringify(snap[field] || fallback);
    const lock = window.GameModules.combat.supports.lockState(snap);
    for (const key of Object.keys(lock)) prints[key] = JSON.stringify(lock[key]);
    woodsmanSnapshotPrints.set(snap, prints);
    return prints;
}

/** Every tick of the fight: a field that drifted from the entry snapshot goes back to it. Only the drifted field is copied back
 * (2026-10-26: the whole build was deep-cloned into game ten times a second, so during the fight the bag, gear and gems were fresh
 * objects every tick, the per-object stat memos never hit, and a big bag made a few hundred KB of garbage per tick). */
function enforceWoodsmanBuildLock() {
    if (!game.woodsmanBuildLock || !game.woodsmanBuildSnapshot) return;
    let snap = game.woodsmanBuildSnapshot;
    keepEarnedWoodsmanPoints(snap);
    const prints = woodsmanSnapshotPrint(snap);
    game.passiveAttributePreference = snap.passiveAttributePreference || 'strength';
    for (const key of WOODSMAN_LOCKED_POINTS) game[key] = Math.floor(snap[key] || 0);
    game.activeSkill = snap.activeSkill;
    game.mobilitySkill = snap.mobilitySkill;
    for (const [field, fallback] of WOODSMAN_LOCKED_FIELDS) {
        if (JSON.stringify(game[field] || fallback) !== prints[field]) game[field] = JSON.parse(prints[field]);
    }
    const lock = window.GameModules.combat.supports.lockState(game);
    for (const key of Object.keys(lock)) {
        if (JSON.stringify(lock[key]) !== prints[key]) game[key] = JSON.parse(prints[key]);
    }
}

function clearWoodsmanBuildLock() {
    game.woodsmanEntrancePending = false;
    resetWoodsmanCurse();
    if (game.woodsmanBuildLock && game.woodsmanBuildSnapshot) {
        // 마지막으로 스냅샷 기준으로 복원
        enforceWoodsmanBuildLock();
    }
    game.woodsmanBuildLock = false;
    game.woodsmanBuildSnapshot = null;
}

/** The woodsman fight lives in 혼돈 밖: in it the entry build is held each tick. A hero who left (town, a hunting zone, the deep sea)
 * ended the fight, so the lock lifts as a reload lifts it (save-migrations); held there, loot picked up would vanish each tick. */
function holdWoodsmanBuildLock(say) {
    if (game.currentZoneId === OUTSIDE_CHAOS_ZONE_ID) return enforceWoodsmanBuildLock();
    clearWoodsmanBuildLock();
    say('☠️ 혼돈 밖을 떠나 나무꾼 전투를 중단했습니다. 세팅 잠금이 해제되었습니다.', 'season-up');
}

/** A colony run goes on only in 군락지: a hero who left it (travel, a map, the deep sea) ended the run there, rewards kept, and the next
 * entry starts at wave 1. Unlike 철수 it moves nobody. */
function endColonyRunLeftBehind(say) {
    window.GameModules.colonyRun.finish('left', false, say);
}

/** A grand breach run goes on only in its own zone: a hero who left it lost the run, as a defeat does (nobody moved). Left on, the
 * panel showed no entry for the next breach and auto entry (breach and meteor) waited for the loop to end. */
function endGrandBreachLeftBehind(grand, say) {
    const lordDown = grand.phase === 'loot';
    actExplorationState.groundLoot.discardEncounter(game,'grand_breach_run');
    Object.assign(grand, { inRun: false, phase: lordDown ? 'done' : 'failed' });
    say(lordDown ? '🌌 대균열을 떠났습니다. 군주의 전리품은 받았습니다.' : '🌌 대균열을 떠나 도전이 실패로 끝났습니다.', 'season-up');
}

/** Runs that live in one zone, checked each tick: the woodsman fight (혼돈 밖), the colony (군락지) and the grand breach. */
function holdZoneBoundRuns(say) {
    if (game.woodsmanBuildLock) holdWoodsmanBuildLock(say);
    if (game.colony?.inRun && game.currentZoneId !== 'colony_run') endColonyRunLeftBehind(say);
    const grand = game.voidRift?.grandRun;
    if (grand?.inRun && game.currentZoneId !== 'grand_breach_run') endGrandBreachLeftBehind(grand, say);
    holdWoodsmanEchoRun();
}

function holdWoodsmanEchoRun() {
    if (game.woodsmanEchoRun?.active && game.currentZoneId !== WOODSMAN_ECHO_ZONE_ID) {
        Object.assign(game.woodsmanEchoRun, { active: false, timeLeft: 0, returnZoneId: null });
    }
}

function sanitizeCombatRuntimeState() {
    atlasRun.recoverClosedMap();
    if (!Number.isFinite(game.playerHp)) game.playerHp = 1;
    game.enemies = Array.isArray(game.enemies) ? game.enemies : [];
    game.enemies.forEach(enemy => {
        if (!enemy) return;
        if (!Number.isFinite(enemy.hp)) enemy.hp = 0;
        if (!Number.isFinite(enemy.energyShield)) enemy.energyShield = 0;
        if (!Number.isFinite(enemy.attackTimer)) enemy.attackTimer = 0;
    });
    // NaN 체력 엔트리가 남아 있으면 hp>0 판정에는 걸리지 않지만 배열 길이는 유지되어
    // 보스전 종료/맵 진행 정산이 멈춘 것처럼 보일 수 있다.
    let invalidOrDead = (game.enemies || []).filter(enemy => enemy && (!Number.isFinite(enemy.hp) || enemy.hp <= 0));
    if (invalidOrDead.length > 0) {
        invalidOrDead.forEach(enemy => {
            if (enemy && Number.isFinite(enemy.id)) handleEnemyDeath(enemy, getPlayerStats());
        });
        game.enemies = (game.enemies || []).filter(enemy => enemy && Number.isFinite(enemy.hp) && enemy.hp > 0);
    }
    ensureCombatGridRuntime();
}

/** The five rooms repeat a readable threat order from data/bosses.js. */
function tuneColonyWaveEnemy(enemy, visual, originalHp) {
    enemy.monsterVisualId = visual.id;
    enemy.monsterVisualSetId = 'colony';
    enemy.baseMonsterName = visual.name;
    enemy.name = enemy.isBoss ? `👿 ${visual.name}` : enemy.isElite && enemy.traitName ? `${enemy.traitName} ${visual.name}` : visual.name;
    assignEnemyGridCombatProfile(enemy);
    if (visual.id === 'hive-scout' || visual.id === 'hive-nurse') {
        enemy.ele = 'chaos';
        enemy.attackRange = COMBAT_GRID_CONFIG.rangedEnemyMaxRange;
        enemy.attackDelivery = 'projectileCell';
        enemy.projectileToEdge = true;
        enemy.attackCastMs = 800;
        enemy.attackCastSpecial = true;
        enemy.attackLabel = '독침 관통';
    }
    if (visual.id === 'colony-carapace-beetle') {
        enemy.maxHp = Math.floor(enemy.maxHp * 1.3);
        enemy.dr = Math.min(90, enemy.dr + 10);
        enemy.armor = Math.floor(enemy.armor * 1.25);
        enemy.attackSpeedVar *= 0.82;
    }
    if (enemy.maxEnergyShield > 0) {
        enemy.maxEnergyShield = Math.floor(enemy.maxEnergyShield * enemy.maxHp / originalHp);
        enemy.energyShield = enemy.maxEnergyShield;
    }
    enemy.hp = enemy.maxHp;
}

function colonyWaveEliteCount(count, waveNumber, pattern) {
    if (waveNumber === 1) return 0;
    const boss = pattern === 'overlord';
    const escorts = boss || pattern === 'carapace' ? 2 : 1;
    return Math.min(Math.max(0, count - Number(boss)), escorts + Math.min(2, Math.floor((waveNumber - 1) / 10)));
}

/** Combat owns wave spawns; persisted in-progress waves keep their original required kill count. */
function spawnColonyWave(){
    const c = game.colony || {}, zone = getZone('colony_run') || getZone(0);
    const waveNumber = Math.max(1, Math.floor(c.wave || 1));
    const required = Math.max(1, Math.floor(c.requiredKills || getColonyWaveEnemyCount(waveNumber)));
    const count = Math.max(0, required - Math.max(0, Math.floor(c.kills || 0)));
    const pattern = zone.wavePattern, formation = REALM_MONSTER_VISUAL_SETS.colony.formations[pattern];
    const boss = pattern === 'overlord';
    const eliteCount = colonyWaveEliteCount(count, waveNumber, pattern);
    const members = REALM_MONSTER_VISUAL_SETS.colony.members, wave = [];
    game.enemies = [];
    for (let i = 0; i < count; i++) {
        const marker = { elite: i < eliteCount, boss: boss && i === count - 1 };
        const ids = marker.boss ? ['colony-boss'] : marker.elite ? formation.elite : formation.normal;
        const visual = members.find(member => member.id === ids[i % ids.length]);
        const enemy = createEnemy(zone, marker, i);
        const originalHp = enemy.maxHp;
        enemy.maxHp = Math.floor(enemy.maxHp * (marker.elite ? 4.8 : 3.4));
        enemy.atkMul *= marker.boss ? 1.45 : (marker.elite ? 1.2 : 1.05);
        tuneColonyWaveEnemy(enemy, visual, originalHp);
        wave.push(enemy);
    }
    // A saved chain run finishes with its original room rules; a new arena sends each wave down three lanes.
    if (zone.exploration) placeColonyRoomWave(wave);
    else game.enemies = wave;
}

/** 군락지가 걷는 방 단위 지도(방 단위 무대). 판에서 싸우면 null. */
function getColonyRoomRun() {
    const run=actExplorationState.current(game);
    return run && run.rooms && game.currentZoneId==='colony_run' ? run : null;
}

/** An arena's core is persistent across waves and restored from a saved defense run. */
function ensureColonyDefenseCore(zone) {
    const colony=game.colony;
    if (Number.isFinite(colony.coreMaxHp) && colony.coreMaxHp>0) {
        colony.coreHp=Math.max(0,Math.min(colony.coreMaxHp,Math.floor(Number(colony.coreHp) || 0)));
        return;
    }
    const estimate=estimateMapZonePowerRequirements(zone);
    colony.coreMaxHp=Math.max(1000,Math.round((estimate?.ehp || 400)*2.5));
    colony.coreHp=colony.coreMaxHp;
}

/** Spawn a wave at the three entrances, clear of the hero, summons, other enemies, and the core. */
function placeColonyDefenseWave(map,enemies,zone) {
    ensureColonyDefenseCore(zone);
    const blocked=getGridBlockedCells(),lanes=map.colonyDefense.spawnCells;
    for(let i=0;i<enemies.length;i++) {
        const enemy=enemies[i],near=lanes[i%lanes.length];
        fitBossFootprint(enemy);
        let spot=findFreeGridCell(blocked,near,getGridUnitFootprint(enemy));
        if(!spot && enemy.isBoss){delete enemy.footprint;spot=findFreeGridCell(blocked,near,getGridUnitFootprint(enemy));}
        if(!spot)throw Error('군락지 웨이브의 진입 공간이 부족합니다.');
        Object.assign(enemy,spot,{gridMoveTimer:0,regenBank:0,spawnStamp:0});
        delete enemy.explorationPack;
        getGridUnitCells(enemy).forEach(cell=>blocked.add(gridCellKey(cell.gx,cell.gy)));
    }
    game.enemies=enemies;
}

/** Existing saved chain maps keep their wave rooms; new defense arenas keep one map through every wave. */
function placeColonyRoomWave(enemies) {
    let run=getColonyRoomRun();
    if(!run || run.status!=='active') {
        actExplorationProgress.depart(game);
        startEncounterRun();
        run=getColonyRoomRun();
    }
    const map=actExplorationMap.forRun(run);
    if(map.colonyDefense){placeColonyDefenseWave(map,enemies,getZone('colony_run'));return;}
    const rooms=chainRoomsOf(map);
    const slot=(Math.max(1,Math.floor(game.colony.wave||1))-1)%STAGE_BOARD_ROOMS.colonyWaves,room=rooms[Math.min(slot,rooms.length-1)];
    fillRoomPack(map,room,run.packs.find(pack=>pack.roomId===room.id),enemies);
    if(room.role==='boss')delete run.sealed;
}

/** 군락지에 살아 있는 적: 싸우는 것과, 방 단위 지도에서 다음 방에 서서 기다리는 것(관문이 닫힌 끝 방에 미리 선 자리지킴은 세지 않는다). */
function countColonyWaveAlive() {
    const run=getColonyRoomRun(),fighting=game.enemies.length;
    if(run && actExplorationMap.forRun(run).colonyDefense)return fighting;
    return run ? fighting+run.packs.filter(pack=>pack.stage===null || !run.sealed).reduce((sum,pack)=>sum+pack.waiting.length,0) : fighting;
}

function colonyDefenseCoreLost(run) {
    return !!run && !!actExplorationMap.forRun(run).colonyDefense && game.colony.coreMaxHp>0 && game.colony.coreHp<=0;
}

/** 군락지의 한 틱: 살아 있는 적이 없으면 웨이브를 부른다. 방 단위 지도에서는 걸음도 여기서 돈다(군락지는 진행 막대가 멈춰 있어
 * advanceMapProgress를 거치지 않는다). 끝 방(지배체)을 비운 뒤에는 떨어진 것을 주울 때까지 다음 지도를 열지 않는다. */
function tickColonyRun(pStats) {
    const run=getColonyRoomRun(),settling=!!run && run.status==='cleared' && !actExplorationProgress.canFinish();
    if(colonyDefenseCoreLost(run)) {
        failColonyDefense();
        return;
    }
    finishColonyLootWait(run);
    if (window.GameModules.colonyRun.finishScheduled(run)) return;
    if(!settling && !game.colony.lootPending && countColonyWaveAlive()===0)spawnColonyWave();
    if(getColonyRoomRun())actExplorationProgress.advance(pStats);
}

function collectManualColonyFloorLate(run, colony) {
    if(actExplorationProgress.runMode(run)!=='manual')return;
    if(!colonyLootWaits.has(colony))colonyLootWaits.set(colony,getCombatTime());
    if(getCombatTime()-colonyLootWaits.get(colony)>=COLONY_MANUAL_LOOT_WAIT_MS)collectExplorationFloorLoot(actExplorationState.groundLoot.takeAll(run));
}

function finishColonyLootWait(run) {
    const colony=game.colony;
    if(!colony.lootPending)return;
    if(run?.groundLoot?.length)collectManualColonyFloorLate(run,colony);
    if(run?.groundLoot?.length)return;
    colony.lootPending=false;
    colonyLootWaits.delete(colony);
}

/** A destroyed core ends the attempt immediately; prior completed-wave rewards remain in the bag. */
function failColonyDefense() {
    const colony=game.colony;
    if(!colony?.inRun)return;
    const failedWave=Math.max(1,Math.floor(colony.wave || 1));
    const returnZoneId=defeatReturnZone(colony.returnZoneId);
    window.GameModules.colonyRun.recordEnd('core');
    Object.assign(colony,{coreHp:0,failedWave,inRun:false,returnZoneId:null});
    colony.lootPending=false;
    colony.bossLootCell=null;
    actExplorationState.groundLoot.discardEncounter(game,'colony_run');
    actExplorationProgress.defeat(game);
    actExplorationProgress.depart(game);
    clearDefeatedEncounter();
    resetBattleRuntimeVisuals();
    game.currentZoneId=returnZoneId;
    game.killsInZone=0;
    game.combatHalted=false;
    pendingHeavyUiRefresh=true;
    dispatchRuntimeEvent('colony-defense-failed',{wave:failedWave,returnZoneId,background:!!game.isBackgroundCalculation});
    queueImportantSave(200);
}

function getActiveSummonGemDefs() {
    let owned = Array.isArray(game.skills) ? game.skills : [];
    game.summonSkillCounts = (game.summonSkillCounts && typeof game.summonSkillCounts === 'object') ? game.summonSkillCounts : {};
    let equippedSummonAttack = Array.isArray(game.equippedSummonSkills) ? game.equippedSummonSkills : [];
    let attackNames = Array.from(new Set(equippedSummonAttack.filter(name => {
        let db = SKILL_DB[name];
        return owned.includes(name) && db && Array.isArray(db.tags) && db.tags.includes('summon');
    })));
    let defs = [];
    // 무기가 맞지 않는 소환 룬(위습은 맨손으로 못 쓴다)은 장착된 채 소환하지 않는다
    attackNames.filter(name => canUseSkillWithCurrentEquipment(name)).forEach(name => {
        let count = SKILL_DB[name].tags.includes('summon_attack') ? Math.max(1, Math.floor(Number(game.summonSkillCounts[name]) || 1)) : 1;
        game.summonSkillCounts[name] = count;
        for (let i = 0; i < count; i++) defs.push({ name, db: SKILL_DB[name], source: 'skill', duplicateIndex: i });
    });
    game.equippedSummonSkills = attackNames;
    Object.keys(game.summonSkillCounts).forEach(name => { if (!attackNames.includes(name)) delete game.summonSkillCounts[name]; });
    return defs;
}

function getSummonProfile(gemName) {
    // 위습 정령 6종(스킬 변경분 2, 2026-09-30)은 대신한 동물의 수치를 그대로 물려받았다(임시): 화염←불곰, 냉기←서리늑대,
    // 번개←벼락멧돼지, 물리←칼날까마귀, 카오스←공허 유충. 사거리는 인계 4/4/3/3/4.
    // baseHp는 기존 수치의 50% 수준으로 너프됨(성장 배율 hpScaleBase/Exp는 그대로라 모든
    // 레벨에서 균일하게 50% 낮은 생명력이 됨). dmgRollMinPct는 일격 편차의 하한(%) —
    // 버스트형(화염 위습)은 편차가 크고, 연사형(냉기 위습)은 편차가 작음.
    let table = {
        '화염 위습 소환': { role: 'attack', ele: 'fire', gridRange: 4, trait: '강한 1타', baseHp: 83, baseArmor: 66, baseEvasion: 24, baseRes: { fire: 28, cold: 8, light: 10, chaos: 0 }, baseDamage: 86, dmgRollMinPct: 30, attackSpeedMul: 0.78, baseCrit: 5, baseCritDmg: 145, resPenBonus: 2, respawnMs: 4000, hpScaleBase: 0.045, hpScaleExp: 1.14, dmgPerLevelPct: 0.135, armorScaleBase: 0.026, armorScaleExp: 1.12, evasionScaleBase: 0.012, evasionScaleExp: 1.08 },
        '냉기 위습 소환': { role: 'attack', ele: 'cold', gridRange: 4, trait: '빠른 공속', baseHp: 58, baseArmor: 36, baseEvasion: 63, baseRes: { fire: 10, cold: 24, light: 10, chaos: 0 }, baseDamage: 54, dmgRollMinPct: 50, attackSpeedMul: 1.35, baseCrit: 8, baseCritDmg: 150, resPenBonus: 4, respawnMs: 4000, hpScaleBase: 0.038, hpScaleExp: 1.12, dmgPerLevelPct: 0.105, armorScaleBase: 0.018, armorScaleExp: 1.1, evasionScaleBase: 0.026, evasionScaleExp: 1.12 },
        '번개 위습 소환': { role: 'attack', ele: 'light', gridRange: 3, trait: '높은 저항 관통', baseHp: 65, baseArmor: 36, baseEvasion: 45, baseRes: { fire: 8, cold: 8, light: 30, chaos: 0 }, baseDamage: 62, dmgRollMinPct: 40, attackSpeedMul: 1.02, baseCrit: 7, baseCritDmg: 150, resPenBonus: 18, respawnMs: 4000, hpScaleBase: 0.04, hpScaleExp: 1.12, dmgPerLevelPct: 0.112, armorScaleBase: 0.017, armorScaleExp: 1.1, evasionScaleBase: 0.018, evasionScaleExp: 1.11 },
        '물리 위습 소환': { role: 'attack', ele: 'phys', gridRange: 3, trait: '치명타 특화', baseHp: 55, baseArmor: 27, baseEvasion: 87, baseRes: { fire: 12, cold: 12, light: 12, chaos: 0 }, baseDamage: 50, dmgRollMinPct: 35, attackSpeedMul: 1.18, baseCrit: 22, baseCritDmg: 190, physIgnoreBonus: 8, respawnMs: 4000, hpScaleBase: 0.036, hpScaleExp: 1.1, dmgPerLevelPct: 0.108, armorScaleBase: 0.014, armorScaleExp: 1.08, evasionScaleBase: 0.03, evasionScaleExp: 1.13 },
        '카오스 위습 소환': { role: 'attack', ele: 'chaos', gridRange: 4, trait: '카오스 관통', baseHp: 71, baseArmor: 39, baseEvasion: 30, baseRes: { fire: 10, cold: 10, light: 10, chaos: 34 }, baseDamage: 63, dmgRollMinPct: 45, attackSpeedMul: 0.95, baseCrit: 6, baseCritDmg: 155, resPenBonus: 14, respawnMs: 4000, hpScaleBase: 0.042, hpScaleExp: 1.14, dmgPerLevelPct: 0.118, armorScaleBase: 0.019, armorScaleExp: 1.11, evasionScaleBase: 0.013, evasionScaleExp: 1.08 },
        '수액 골렘 소환': { role: 'guard', ele: 'phys', gridRange: 1, trait: '피해 대리', baseHp: 111, baseArmor: 90, baseEvasion: 18, baseRes: { fire: 15, cold: 15, light: 15, chaos: 10 }, baseDamage: 15, dmgRollMinPct: 45, attackSpeedMul: 0, baseCrit: 0, baseCritDmg: 130, respawnMs: 8000, redirectPct: 0, hpScaleBase: 0.055, hpScaleExp: 1.12, dmgPerLevelPct: 0.06, armorScaleBase: 0.032, armorScaleExp: 1.1, evasionScaleBase: 0.01, evasionScaleExp: 1.06 }
    };
    return table[gemName] || { role: 'attack', ele: 'phys', gridRange: 1, trait: '균형형', baseHp: 58, baseArmor: 30, baseEvasion: 30, baseRes: { fire: 10, cold: 10, light: 10, chaos: 0 }, baseDamage: 45, dmgRollMinPct: 40, attackSpeedMul: 1, baseCrit: 5, baseCritDmg: 140, respawnMs: 4000, hpScaleBase: 0.04, hpScaleExp: 1.12, dmgPerLevelPct: 0.1, armorScaleBase: 0.015, armorScaleExp: 1.1, evasionScaleBase: 0.015, evasionScaleExp: 1.1 };
}

function getSummonRuntimeCap(pStats) {
    if (pStats && pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.soleMinion) return 1;
    return Math.max(1, Math.min(getSummonCapMaximum(), Math.floor((pStats && pStats.summonCap) || 1)));
}

/** 소환 한도(능력치의 summonCap): 버킷들의 summonCap 합(sum)에 소울바인더 키스톤 몫(sb4 +1, sb8 +3)을 더하고, sb9면 1.5배. 1부터 최대까지. */
function getSummonCapFromSum(sum) {
    const keystones = (hasKeystone('sb4') ? 1 : 0) + (hasKeystone('sb8') ? 3 : 0);
    return Math.max(1, Math.min(getSummonCapMaximum(), Math.floor((1 + Math.floor(sum + keystones)) * (hasKeystone('sb9') ? 1.5 : 1))));
}

function getSummonCapMaximum() {
    return hasKeystone('sb9') ? 12 : 8;
}

function applyGrandlordGhostState() {
    let grandlordActive = hasKeystone('sb9');
    let livingSummons = (game.summons || []).filter(summon => summon && summon.alive && summon.hp > 0);
    if (!grandlordActive) {
        livingSummons.forEach(summon => { summon.isGhost = false; });
        return;
    }
    let ghostCount = Math.min(4, Math.floor(livingSummons.length / 3));
    let ghostIds = new Set(livingSummons
        .slice()
        .sort((left, right) => left.hp - right.hp || left.id - right.id)
        .slice(0, ghostCount)
        .map(summon => summon.id));
    livingSummons.forEach(summon => { summon.isGhost = ghostIds.has(summon.id); });
}

function buildActiveSummonRuntimeDefs(pStats) {
    return window.GameModules.combat.summonSupports.runtimeDefs(getActiveSummonGemDefs(), pStats);
}

function getEquippedJewelGemLevelBonusSources(target) {
    let gear = 0;
    let activeTags = typeof getGemLevelTargetTags === 'function' ? getGemLevelTargetTags(target) : [];
    // A settlement reads this for every summon every tick; it depends only on the socketed jewels (static build input).
    const memo = getBackgroundBuildMemo(game), memoKey = `jewel-gem-level:${activeTags.includes('summon')}`;
    if (memo?.has(memoKey)) return memo.get(memoKey);
    let addJewelGemLevels = (jewel, multiplier) => {
        if (!jewel || typeof getJewelStats !== 'function') return;
        let mul = Number.isFinite(Number(multiplier)) ? Number(multiplier) : 1;
        getJewelStats(jewel).forEach(stat => {
            if (!stat) return;
            let value = Number(stat.val || 0) * mul;
            if (stat.id === 'gemLevel') gear += value;
            if (stat.id === 'summonGemLevel' && activeTags.includes('summon')) gear += value;
        });
    };
    let socketMultiplier = getSocketJewelMultiplier();
    let equipment = combatEquipmentStats.activeEquipment(game) || {};
    getSocketedJewels().forEach(row => {
        addJewelGemLevels(row.jewel, socketMultiplier * (row.source === 'abyss' ? getAbyssJewelMultiplier(equipment[row.slot]) : 1));
    });
    getMirroredRingJewels().forEach(jewel => addJewelGemLevels(jewel, 1));
    memo?.set(memoKey, gear);
    return gear;
}

function hasEmptyThroneSoloBonus() {
    if (typeof getEquippedUniqueJewels !== 'function') return false;
    let equipped = getEquippedUniqueJewels();
    return equipped.some(entry => entry && entry.jewel && entry.jewel.uniqueId === 'uj_crown_empty')
        && equipped.every(entry => entry && entry.jewel && entry.jewel.uniqueId === 'uj_crown_empty');
}

/** "모든 스킬룬 레벨 +N" (uniqueGemLevelBonus) on the equipped unique items that count for stats. */
function getEquippedUniqueGemLevelBonus() {
    return getPlayerStatSourceItemEntries().reduce((sum, [, item]) => sum
        + (item && item.rarity === 'unique' && item.uniqueEffectKey === 'uniqueGemLevelBonus' ? Number((item.uniqueEffectParams || {}).level || 1) : 0), 0);
}

/** resolvedStats, when supplied, belongs to the current synchronous equipment evaluation only. */
function getTargetGemBonusSources(target, fallbackSources, resolvedStats, evaluation) {
    let sources = (typeof getGemBonusSources === 'function') ? getGemBonusSources(target, resolvedStats, evaluation) : fallbackSources;
    sources = sources ? { ...sources } : { gear: 0, passive: 0, reward: 0, total: 0 };
    let jewelGemLevel = getEquippedJewelGemLevelBonusSources(target) + getEquippedUniqueGemLevelBonus();
    sources.gear = Number(sources.gear || 0) + jewelGemLevel;
    sources.total = Number(sources.total || 0) + jewelGemLevel;
    if (hasEmptyThroneSoloBonus()) {
        sources.reward = Number(sources.reward || 0) + 1;
        sources.total = Number(sources.total || 0) + 1;
    }
    let targetName = Array.isArray(target) ? null : (target || game.activeSkill);
    let isSupportGem = !!(targetName && typeof SUPPORT_GEM_DB !== 'undefined' && SUPPORT_GEM_DB[targetName]);
    let targetTags = (typeof getGemLevelTargetTags === 'function') ? getGemLevelTargetTags(target) : [];
    let isElementalGem = targetTags.includes('elemental');
    if (game.ascendClass && typeof getClassTreeDef === 'function') {
        let ascendTree = getClassTreeDef(game.ascendClass);
        let ascendGemLevel = (game.ascendNodes || []).reduce((total, id) => {
            let node = ascendTree[id];
            return total + (node && node.stat === 'gemLevel' ? Number(node.val || 0) : 0);
        }, 0);
        sources.passive = Number(sources.passive || 0) + ascendGemLevel;
        sources.total = Number(sources.total || 0) + ascendGemLevel;
    }
    if (hasKeystone('iq6') && (isElementalGem || isSupportGem)) {
        sources.reward = Number(sources.reward || 0) + 1;
        sources.total = Number(sources.total || 0) + 1;
    }
    return sources;
}

exposeFileGlobals({ captureCombatRuntime, restoreCombatRuntime, createCombatTacticsRuntime, resetCombatTacticsRuntime, resetCombatRuntimesForLoadedSave, hasPlayerChannelBreakingAilment, cancelCombatChannelVisuals, updateCombatChannelRuntime, beginCombatChannel, getCombatChannelCycleMs, createContinuousChannelStages, consumeCombatChannelContinuation, getCombatChannelGate, getPlayerAttackRecoveryMs, isPlayerAttackRecovering, getWalkingChargeScale, getTacticalMoveAttackDelayMs, syncCombatTacticsEncounterRuntime, noteCombatTacticAttack, getAverageCriticalHitDamage, applyCritDamageSoftcap, getCritDamageSoftcapReduction, getArmorPhysicalReductionPct, getEvasionChancePct, getEnemyAccuracyForZone, getSummonEvadeChance, resolveEntropyEvasion, calculatePlayerAccuracy, getEnemyTotalEvadeChance, formatNumberKR, addEvasionCombatLog, notePlayerHitSummary, getPlayerHitCombatLog, explodeCorpse, applyLeechSoftcap, getPlayerHitLeechTarget, applyPlayerHitLeech, getLeechCaps, getLeechOutstandingTotal, addPlayerLeechInstance, applyInstantPlayerLeech, tickPlayerLeech, addPlayerRecoupInstance, tickPlayerRecoup, refreshRealmDeathWard, absorbDamageWithRealmDeathWard, absorbDamageWithTalentStoneShield, floorIncomingDamage, getAscendKeystoneOwnerClass, hasKeystone, getElementalistOverloadStacks, recordElementalistOverloadAttack, getWarriorRageStacks, getWarriorRagePhysicalDamageMultiplier, grantWarriorRageOnHit, clearAscendKeystoneRuntimeState, collectSocketedJewels, getSocketedJewels, getMirroredRingJewels, recomputeCosmosTwinKeystones, getAliveEnemyByRuntimeKey, getCombatTalentCardLevel, getActiveTalentUniqueEffects, prepareTalentPlayerAttackContext, getTalentPlayerAttackDamageMultiplier, performTalentMoonReturn, updateTalentButcherHitMark, canApplyTalentExecuteThreshold, getPlayerHpCap, getPlayerRecoveryHpCap, getMossRecoveryOccupied, getPlayerEnergyShieldRecoveryCap, isDualWielding, rollWildTalismanDrop, expireConditionEffects, pruneEnemyRuntimeDebuffMaps, getConditionDebuffDelta, getEnemyConditionDebuffFactor, getKeystoneEnemyTakenMultiplier, applyConditionPhysicalReductionEffects, snapshotWoodsmanBuildState, enforceWoodsmanBuildLock, clearWoodsmanBuildLock, holdZoneBoundRuns, sanitizeCombatRuntimeState, spawnColonyWave, getColonyRoomRun, countColonyWaveAlive, tickColonyRun, failColonyDefense, getActiveSummonGemDefs, getSummonProfile, getSummonRuntimeCap, getSummonCapFromSum, getSummonCapMaximum, applyGrandlordGhostState, buildActiveSummonRuntimeDefs, getEquippedJewelGemLevelBonusSources, getTargetGemBonusSources });
})();

const LEECH_SOFTCAP_START = 1.2;
const LEECH_SOFTCAP_MID = 2.5;
const LEECH_SOFTCAP_MID_EFF = 0.6;
const LEECH_SOFTCAP_HIGH_EFF = 0.3;
const LEECH_BASE_INSTANCE_CAP_PCT = 20;
const LEECH_BASE_TOTAL_CAP_PCT = 40;
const LEECH_BASE_RATE_CAP_PCT = 4;
const ARMOR_MITIGATION_SCALE = 24;
const SKILL_DELAY_REDUCE_CAP = 50;   // 스킬 딜레이 감소(%)의 한도: 공격 간격이 절반 아래로 줄지 않는다
const EVASION_ACCURACY_SCALE = 3.5;
const EVASION_ENTROPY_RESET_MS = 3330;
const SUMMON_EVASION_CAP_PCT = 85;
const SUMMON_EVASION_POST_20_STEP_MULTIPLIER = 4;
const SUMMON_EFFICIENCY_EVASION_RATIO = 0.5;
const PLAYER_ACCURACY_BASE = 80;
const PLAYER_ACCURACY_PER_LEVEL = 3;
const PLAYER_ACCURACY_PER_DEXTERITY = 5;
const MIN_PENETRATED_RESISTANCE = -200;
const CRIT_DAMAGE_BASE_MULTIPLIER = 125;
const PLAYER_PHYSICAL_REDUCTION_CAP_PCT = 75;
const CONDITION_GUARD_PHYSICAL_REDUCTION_CAP_PCT = 90;
const WARCRY_PHYSICAL_REDUCTION_CAP_BONUS_PCT = 3;
const COMBAT_PROJECTILE_MIN_TRAVEL_MS = 120;
const COMBAT_PROJECTILE_MS_PER_CELL = 55;
const BOSS_ATTACK_IMPACT_DELAY_MS = 500;
/** The first floors' bosses of a floor ladder by zone type, from floor 1 on: life and damage eased so the entry is no wall; floors past
 * the list are not eased. The sky tower's (2026-10-19, user: "지하계 1층만큼 버틸 수 있게 더 낮춰줘", then "2층부터 6층까지 층마다 피해
 * 0.15배씩 올려"): the T15 build at loop 15 clears floor 1 as the underworld's, 6 of 6 in ten minutes, five without a death, where the
 * underworld's damage 0.74 cleared 0 of 6; floor 2 then clears 3 of 6 (underworld floor 2: 4 of 6). */
const ENTRY_BOSS_EASING = Object.freeze({
    underworld: Object.freeze([Object.freeze({ hp: 0.81, damage: 0.74 })]),
    skyTower: Object.freeze([
        Object.freeze({ hp: 0.81, damage: 0.3 }), Object.freeze({ hp: 0.85, damage: 0.45 }), Object.freeze({ hp: 0.89, damage: 0.6 }),
        Object.freeze({ hp: 0.92, damage: 0.75 }), Object.freeze({ hp: 0.96, damage: 0.9 })
    ])
});
const UNDERWORLD_ENTRY_BENCHMARK_HP_MULTIPLIER = 0.85;
const UNDERWORLD_ENTRY_BENCHMARK_DAMAGE_MULTIPLIER = 0.82;
/** 판(위에서 보는 전장)의 심해 가디언 판이 시작하는 진행도: 막대 끝 바로 앞이라 다음 틱에 가디언이 선다(beginOceanRunRules).
 * 정확히 100이면 advanceMapProgress가 무리를 부르기 전에 돌아가 가디언이 서지 않는다. */
const OCEAN_GUARDIAN_BOARD_START_PROGRESS = 99.9;
let pendingSkillStageHits = [];
let pendingEnemyCombatAttacks = [];
const COMBAT_TACTIC_TARGET_LOCK_MS = 750;
const COMBAT_TACTIC_STALL_MS = 2000;
const COMBAT_TACTIC_MAX_RETREATS = 2;
/** 공격 후딜(getPlayerAttackRecoveryMs): 공격 간격에서 차지하는 몫, 게임 프레임 하나(걸음 시계, ms), 가장 긴 프레임 수. */
const PLAYER_ATTACK_RECOVERY = Object.freeze({ share: 0.35, frameMs: 20, maxFrames: 20 });
/** 사거리 안에 적이 있는데 걷는 동안 공격 게이지가 차는 빠르기(배수, getWalkingChargeScale). */
const PLAYER_WALKING_CHARGE = 0.5;
let combatTacticsRuntime = createCombatTacticsRuntime();
let combatChannelRuntime = { id: 0, skillName: '', endAt: 0 };
let combatChannelResumeSkillName = '';
let nextCombatChannelId = 1;
let nextPlayerDamageTextGroupId = 1;
let trialHazardRuntime = { nextAt: 0, active: null };
let skillGemCombatRuntime = null;

safeExposeGlobals({ captureCombatRuntime, restoreCombatRuntime });


function resetCombatChannelRuntime() {
    cancelCombatChannelVisuals();
    combatChannelRuntime = { id: 0, skillName: '', endAt: 0 };
    combatChannelResumeSkillName = '';
    pendingSkillStageHits = pendingSkillStageHits.filter(row => !row || !row.channelId);
    if (game) game.passiveChannelPath = null;
}


function cancelCombatChannel(reason) {
    if (!combatChannelRuntime.id) return false;
    cancelCombatChannelVisuals();
    pendingSkillStageHits = pendingSkillStageHits.filter(row => !row || !row.channelId);
    combatChannelRuntime = { id: 0, skillName: '', endAt: 0 };
    combatChannelResumeSkillName = '';
    game.passiveChannelPath = null;
    if (reason) addBattleFx('statusText', { text: _t('집중 취소, {reason}', { reason }), color: '#d7b8ff', duration: 480 });
    return true;
}


const evasionEntropyByDefender = new WeakMap();


const PLAYER_HIT_SCALE_LABELS = Object.freeze([['regen', '재생'], ['fireRes', '화저']]);


let ascendKeystoneOwnerIndex = null;


const WARRIOR_RAGE_STACK_MAX = 5;
const WARRIOR_RAGE_STACK_DAMAGE_PCT = 6; // ASCENDANCY_KEYSTONE_VALUES.w5
const WARRIOR_RAGE_DURATION_MS = 5000;
const ELEMENTALIST_OVERLOAD_STACK_MAX = 20;


/** A stored wild talisman (or its overflow shard) marks the stump box; the stump box view writes the notice. */
function announceWildTalisman(drop) {
    if (game.noti) game.noti.stump = true;
    dispatchRuntimeEvent('stump-box-changed', { ripened: [], drop: drop.item || null, overflow: drop.currency || null });
}


/** The build fields the lock holds: [field, default]. The support lock state (sealed and summon gems) is read through lockState below. */
const WOODSMAN_LOCKED_FIELDS = Object.freeze([
    ['passives', []], ['passiveAttributeChoices', {}], ['ascendNodes', []], ['ascendKeystones', []], ['equipment', {}], ['inventory', []],
    ['skills', []], ['supports', []], ['equippedSupports', []], ['supportGemData', {}], ['playerLeechInstances', []],
    ['playerRecoupInstances', []], ['gemData', {}], ['jewelInventory', []]
]);
const WOODSMAN_LOCKED_POINTS = Object.freeze(['passivePoints', 'seasonPoints', 'ascendPoints', 'ascendKeystonePoints', 'scour']);
/** The snapshot's fields as JSON, built once per snapshot object (the lock runs every tick). */
const woodsmanSnapshotPrints = new WeakMap();

/** Colony attempt controls live with combat. Wards and their reward rolls stay in colonyWards. */
window.GameModules.colonyRun = (() => {
    const nextBossWave = colony => Math.ceil(Math.max(1, colony.wave) / 5) * 5;
    const returnWave = colony => colony.lootPending ? Math.max(5, colony.wave - 1) : nextBossWave(colony);
    function uncollected() {
        const run = getColonyRoomRun();
        return { held: game.colony.pendingLoot.length, floor: run ? run.groundLoot.length : 0 };
    }
    function toggleReturn() {
        const colony = game.colony;
        if (!colony.inRun || game.currentZoneId !== 'colony_run') return false;
        colony.returnAfterWave = colony.returnAfterWave ? 0 : returnWave(colony);
        queueImportantSave(200);
        return true;
    }
    /** End receipts record completed waves and only the unreleased loot that is actually forfeited. */
    function recordEnd(kind) {
        const colony = game.colony;
        if (!colony.inRun || !['withdraw', 'scheduled', 'left', 'core', 'defeat'].includes(kind)) return null;
        colony.lastResult = { kind, wave: colony.wave, completed: Math.max(0, colony.wave - 1), lostHeld: colony.pendingLoot.length };
        colony.returnAfterWave = 0;
        return colony.lastResult;
    }
    /** The log line for a colony run's end: leaving by travel is not a withdrawal. */
    function endLine(kind, result) {
        if (kind === 'left') return '🪲 군락지를 떠났습니다.';
        return result.completed ? _t('🪲 군락지 {completed}웨이브를 마치고 철수했습니다.', { completed: result.completed }) : '🪲 군락지에서 철수했습니다.';
    }
    function finish(kind = 'withdraw', move = true, say = addLog) {
        const colony = game.colony;
        if (move && game.currentZoneId !== 'colony_run') return false;
        const result = recordEnd(kind);
        if (!result) return false;
        const returnZone = colony.returnZoneId ?? getAutoProgressZoneId(game.maxZoneId);
        // Won floor loot is settled by this existing owner; the unreleased buffer is forfeited.
        actExplorationState.groundLoot.discardEncounter(game, 'colony_run');
        Object.assign(colony, { inRun: false, lootPending: false, bossLootCell: null, returnZoneId: null });
        if (move) {
            game.currentZoneId = returnZone;
            game.enemies = []; game.encounterPlan = []; game.encounterIndex = 0; game.runProgress = 0;
            actExplorationProgress.depart(game);
        }
        say(endLine(kind, result), 'season-up');
        pendingHeavyUiRefresh = true;
        queueImportantSave(200);
        return true;
    }
    function finishScheduled(run) {
        const colony = game.colony;
        if (!colony.inRun || !colony.returnAfterWave || colony.wave <= colony.returnAfterWave || colony.lootPending) return false;
        const floor = run ? run.groundLoot.length : 0;
        if (colony.pendingLoot.length || floor || countColonyWaveAlive()) return false;
        return finish('scheduled');
    }
    return Object.freeze({ returnWave, uncollected, toggleReturn, recordEnd, finish, finishScheduled });
})();


// The next wave waits for the overlord's floor. Auto-move walks to it; in 직접 이동 the floor is collected after this much combat
// time (a hero left alone held the colony forever).
const COLONY_MANUAL_LOOT_WAIT_MS=20000;
const colonyLootWaits=new WeakMap(); // colony → combat ms its floor wait began (transient, never saved)


safeExposeGlobals({ getSummonCapMaximum, getTacticalMoveAttackDelayMs, resetCombatTacticsRuntime, resetCombatChannelRuntime, updateCombatChannelRuntime, cancelCombatChannel, tickPlayerLeech, addPlayerLeechInstance, applyInstantPlayerLeech, getLeechCaps, getLeechOutstandingTotal, refreshRealmDeathWard, absorbDamageWithRealmDeathWard, getAscendKeystoneOwnerClass, hasKeystone, getWarriorRageStacks, clearAscendKeystoneRuntimeState });
