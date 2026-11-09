// 쓰러짐과 휴식, 받는 피해, 몬스터의 공격 차례, 시련 함정과 바닥 위험 (2026-11-10에 js/combat.js에서 그대로 옮겼다. js/combat.js 뒤에 옮기기 전과 같은 순서로 읽는다.)

/** 패널티가 붙는 구역을 처음 열면 한 번 알린다. 액트 6과 혼돈에서 갑자기 자주 쓰러지는 까닭이 캐릭터 창의 저항 상세에만 있었다
 * (자연 플레이 측정 2026-10-17: 패시브를 찍지 않은 성직자는 혼돈 1에서 한 시간에 76번 쓰러졌다, 찍은 성직자는 0번). */
function noteCampaignResistPenalty(zoneId) {
    if (!CAMPAIGN_RESIST_PENALTY.zones.includes(zoneId)) return;
    const each = CAMPAIGN_RESIST_PENALTY.each, total = getCampaignResistPenalty(zoneId);
    const more = total > each ? _t(' 더 낮아졌습니다(모두 합쳐 -{total}%)', { total }) : ' 낮아졌습니다';
    queueTutorialNotice(`notice_resist_penalty_${zoneId}`, _t('모든 저항 -{total}%', { total }),
        `캠페인 패널티로 모든 원소 저항과 카오스 저항이 ${each}%${more}.\n저항이 모자라면 받는 피해가 커집니다. 캐릭터 창의 저항에서 볼 수 있습니다.`, 'tab-character');
}


/** 물러난 뒤 탐험을 마치면: 덜 올랐으면 지금 액트를 한 번 더, 충분히 올랐으면 기록을 지우고 평소처럼 앞으로 간다. */
function holdActRetreat(zone) {
    const retreat = game.actRetreat;
    if (!retreat) return false;
    // 레벨이 충분히 올랐거나, 직접 다른 지역으로 옮겨 그곳을 마쳤으면 물러남을 끝낸다.
    if (game.level >= retreat.level + ACT_RETREAT_LEVELS || zone.id !== retreat.frontierZoneId - 1) {
        game.actRetreat = null;
        return false;
    }
    game.currentZoneId = zone.id;
    return true;
}

/** 스토리 액트의 방과 방 사이(살아 있는 적이 없을 때) 숨 고르기: 0.1초 틱마다 최대 생명의 ACT_REST_RECOVERY_PCT_PER_SEC/10 %. */
function applyActRestRecovery(pStats, hpCap) {
    if (game.playerHp <= 0 || game.playerHp >= hpCap) return;
    if (getZone(game.currentZoneId)?.type !== 'act') return;
    if ((game.enemies || []).some(enemy => enemy && enemy.hp > 0)) return;
    game.playerHp = Math.min(hpCap, game.playerHp + pStats.maxHp * ACT_REST_RECOVERY_PCT_PER_SEC / 100 * 0.1);
}

/** The hero fell in zone: this loop's death count, the content's own defeat (back to where it came from, its run closed) or else the
 * experience penalty, then the death log and notice, full life and the walk on. Split by content on 2026-10-18 with the same steps
 * in the same order; log lines reach the content parts as say. */
/** The local test panel's god mode (js/dev-test-panel-ui.js, ?dev=1 on localhost only): a defeat refills life instead of happening.
 * The panel's 200 ms life top-up alone let one big hit through (2026-10-19: the hero fell to the 500 m guardian with god mode on). */
/* @dev-only */
let combatTestImmortal = false;
function setCombatTestImmortal(on) { combatTestImmortal = !!on; }
/* @end-dev-only */
function handlePlayerDefeat(zone, pStats, message, options) {
    /* @dev-only */ if (combatTestImmortal) { game.playerHp = getPlayerHpCap(pStats || getPlayerStats()); return; } /* @end-dev-only */
    actExplorationProgress.defeat(game);
    let opts = options || {};
    recordPlayerDefeatStart(zone, opts);
    let expLost = 0;
    game.loopDeaths = Math.max(0, Math.floor(game.loopDeaths || 0)) + 1;
    if (typeof recordImmortalHeroDeathPenalty === 'function') recordImmortalHeroDeathPenalty();
    // The hive run's exit is read only for a hive defeat (the hive screen script owns it).
    const defeatUi = { say: addLog, get exitBeehiveRun() { return typeof exitBeehiveRun === 'function' ? exitBeehiveRun : null; } };
    const contentDefeat = getContentDefeat(zone);
    if (contentDefeat) expLost = contentDefeat(zone, message, opts, defeatUi) || 0;
    else expLost = applyDeathExpPenalty(message, opts, defeatUi);
    game.lastDeathLog = buildPlayerDeathLog(zone, opts, expLost, pStats);
    if (game.lastDeathLog.retreatZoneName) addLog(_t('🛡️ {retreatZoneName} 물러나 레벨을 {ACT_RETREAT_LEVELS} 올린 뒤 다시 도전합니다.', { retreatZoneName: withDirectionParticle(game.lastDeathLog.retreatZoneName), ACT_RETREAT_LEVELS }), 'season-up');
    if (game.settings.showDeathNotice !== false) openDeathOverlay.request(game.lastDeathLog);
    game.playerHp = getPlayerHpCap(pStats);
    atlasRun.defeat(zone);
    startMoving(false);
    holdAfterDefeat();
    updateStaticUI();
    queueImportantSave(160);
}
/** 쓰러진 뒤 화면이 까매졌다 밝아지는 동안(js/defeat-fade-ui.js) 주인공은 다시 놓인 자리에 서 있다(2026-11-05 사용자: "사망 시 바로
 * 부활이 아니라 … 몇 초 뒤에 움직일 수 있게"). 이동 대기(moveTimer)로 잡으므로 귀환과 다른 지역 이동은 바로 된다. 방치 정산은 늘리지 않는다. */
const DEFEAT_RECOVERY_SECONDS = 3;
function holdAfterDefeat() {
    if (game.isBackgroundCalculation) return;
    game.moveTimer = game.moveTotalTime = Math.max(game.moveTimer || 0, DEFEAT_RECOVERY_SECONDS);
}
/** The content whose own rules a defeat in zone follows (a run by its id, else by its kind), or null for the experience penalty. */
function getContentDefeat(zone) {
    if (!zone) return null;
    return getRunDefeat(zone) || getOceanDiveDefeat(zone) || getContentKindDefeat(zone);
}
function getRunDefeat(zone) {
    if (zone.id === OUTSIDE_CHAOS_ZONE_ID) return defeatAgainstWoodsman;
    if (zone.id === 'colony_run' && game.colony && game.colony.inRun) return defeatInColony;
    if (zone.id === 'beehive_run' && game.beehive && game.beehive.inRun) return defeatInBeehive;
    return zone.id === 'grand_breach_run' ? defeatInGrandBreach : null;
}
function getContentKindDefeat(zone) {
    if (zone.type === 'seasonBoss') return game.inTicketBossFight ? defeatInRootBossFight : null;
    return Object.hasOwn(CONTENT_DEFEAT_BY_KIND, zone.type) ? CONTENT_DEFEAT_BY_KIND[zone.type] : null;
}
/** 자동 재잠수로 들어간 잠수에서, 또는 가디언에게 쓰러지면 그 잠수를 끝낸다. 2026-10-19 검토: 넘지 못하는 가디언 앞에서 거듭
 * 쓰러지며 쓰러질 때마다 경험치를 잃고(한 번 잠수에 2~8번), 가디언은 생명력이 다 찬 채로 다시 나왔다. 손으로 시작한 잠수에서 무리에게
 * 쓰러지면 예전처럼 심해에서 다시 일어선다. 자동 잠수가 무리에게 쓰러지면 자동 재잠수도 멈추고, 가디언에게 쓰러지면 자동 재잠수가
 * 지난 가디언 자리부터 잇는다(recordOceanSurface). */
const getOceanDiveDefeat = zone => (zone.id === OCEAN_ZONE_ID && (isAutoOceanDive(ensureOceanState()) || game.oceanBossRunPending) ? defeatInOceanDive : null);
function defeatInOceanDive(zone, message, opts, ui) {
    const guardian = !!game.oceanBossRunPending;
    const fallback = guardian ? '☠️ 심해 가디언에게 쓰러져 수면으로 올라왔습니다.' : '☠️ 자동 재잠수로 들어간 잠수에서 쓰러졌습니다.';
    ui.say(message || fallback, 'death', { noToast: !!opts.noToast });
    clearDefeatedEncounter();
    forceSurfaceOcean(guardian ? 'guardian' : 'defeat');
}
/** Leaves the encounter (a defeat, the loop gate): no enemies, plan or progress left. On an exploration map the fighters go back to
 * their packs (waiting), as when a hunt leaves the map: emptying the list alone left the packs counting monsters the save no longer held,
 * and that save would not load (2026-10-27, the loop gate and a save round-trip sweep). */
function clearDefeatedEncounter() {
    if (actExplorationState.current(game)) actExplorationState.retireCombat(game);
    else game.enemies = [];
    game.encounterPlan = [];
    game.encounterIndex = 0;
    game.runProgress = 0;
}
/** Back where the run started, else the defeat recovery zone. */
const defeatReturnZone = returnZoneId => (returnZoneId !== undefined && returnZoneId !== null ? returnZoneId : getDefeatRecoveryZoneId());
function defeatAgainstWoodsman(zone, message, opts, ui) {
    let woodsman = (game.enemies || []).find(e => e && e.isBoss);
    if (woodsman && woodsman.maxHp > 0) {
        let dealtRatio = Math.max(0, Math.min(0.999, 1 - (woodsman.hp / woodsman.maxHp)));
        let score = Math.floor(dealtRatio * 1000000);
        addWoodsmanPendingScore(score);
        maybeUnlockChaosRealmFromWoodsman(woodsman, { log: true, finalize: true });
        ui.say(_t('🪓 나무꾼 전투 정산 대기 점수 +{score} (루프 정산 시 반영)', { score }), 'season-up');
    }
    clearWoodsmanBuildLock();
    game.currentZoneId = getDefeatRecoveryZoneId();
    game.killsInZone = 0;
}
function defeatInColony(zone, message, opts, ui) {
    ui.say(message || "☠️ 군락지 방어전에서 패배했습니다.", "death", { noToast: !!opts.noToast });
    window.GameModules.colonyRun.recordEnd('defeat');
    actExplorationState.groundLoot.discardEncounter(game,'colony_run');
    game.colony.inRun = false;
    game.colony.lootPending = false;
    game.colony.bossLootCell = null;
    game.currentZoneId = defeatReturnZone(game.colony.returnZoneId);
    game.colony.returnZoneId = null;
    clearDefeatedEncounter();
    game.killsInZone = 0;
}
function defeatInBeehive(zone, message, opts, ui) {
    ui.say(message || "☠️ 벌집 전투에서 패배했습니다. 원정이 즉시 종료됩니다.", "death", { noToast: !!opts.noToast });
    const exitRun = ui.exitBeehiveRun;
    if (exitRun) {
        exitRun('', 'death');
        return;
    }
    game.beehive.inRun = false;
    game.beehive.awaitingClear = false;
    game.beehive.pendingChoice = null;
    game.currentZoneId = defeatReturnZone(game.beehive.returnZoneId);
    game.beehive.returnZoneId = null;
    clearDefeatedEncounter();
    game.killsInZone = 0;
}
function defeatInGrandBreach(zone, message, opts, ui) {
    let v = game.voidRift || (game.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    let grand = v.grandRun || {};
    ui.say(message || "☠️ 대균열에서 패배했습니다. 균열이 닫히며 추방됩니다.", "death", { noToast: !!opts.noToast });
    actExplorationState.groundLoot.discardEncounter(game,'grand_breach_run');
    v.grandRun = { ...grand, inRun: false, phase: 'failed' };
    clearDefeatedEncounter();
    game.currentZoneId = grand.returnZoneId !== undefined ? grand.returnZoneId : getDefeatRecoveryZoneId();
    game.killsInZone = 0;
}
function defeatBeyondBoundary(zone, message, opts, ui) {
    let returnZoneId = abandonBeyondBoundaryRun(game);
    ui.say(message || '경계 너머 도전에 실패했습니다. 진행 중이던 단계가 종료됩니다.', 'death', { noToast: !!opts.noToast });
    game.currentZoneId = defeatReturnZone(returnZoneId);
    game.killsInZone = 0;
    clearDefeatedEncounter();
}
function defeatAtMeteor(zone, message, opts, ui) {
    ui.say(message || "☠️ 운석 낙하 지점에서 패배했습니다. 운석 지점이 닫힙니다.", "death", { noToast: !!opts.noToast });
    let st = ensureMeteorSiteState();
    st.activeMeteorTier = null;
    st.kind = null;
    let returnZoneId = st.meteorReturnZoneId;
    st.meteorReturnZoneId = null;
    game.currentZoneId = defeatReturnZone(returnZoneId);
    game.killsInZone = 0;
    clearDefeatedEncounter();
}
/** A defeat in the time rift shatters the altar's items and closes the altar, so the past must be cleared again (2026-10-26 사용자:
 * 실패 시 아이템 파괴 패널티). The altar is empty in the past (items go on it once the past is cleared), so its line names no items.
 * The lines are the user's own, whatever killed the hero (the death record keeps the cause). */
function defeatInTimeRift(zone, message, opts, ui) {
    Object.assign(ensureTimeRiftState(), { altarOpen: false, altarUnique: null, altarRare: null, activePressure: null });
    ui.say(zone.riftPhase === 'past' ? '시간의 균열(과거)에서 사망했습니다.' : '시간의 균열(미래)에서 사망했습니다. 제단의 아이템이 산산조각났습니다.', 'death', { noToast: !!opts.noToast });
    game.currentZoneId = getDefeatRecoveryZoneId();
    game.killsInZone = 0;
    clearDefeatedEncounter();
}
function defeatInRootBossFight(zone, message, opts, ui) {
    let fallbackMessage = zone.milestonePinnacle
        ? '☠️ 최종 관문 도전에 실패했습니다. 장비와 방어를 정비해 다시 도전하세요.'
        : '☠️ 뿌리 보스 도전에 실패했습니다. 액트 1로 되돌아갑니다.';
    ui.say(message || fallbackMessage, "death", { noToast: !!opts.noToast });
    game.currentZoneId = 0;
    game.killsInZone = 0;
    game.inTicketBossFight = false;
}
function defeatInTrial(zone, message, opts, ui) {
    ui.say(message || "☠️ 시련 실패! 마을로 귀환합니다.", "death", { noToast: !!opts.noToast });
    game.currentZoneId = getDefeatRecoveryZoneId();
    game.killsInZone = 0;
}
/** 지하계에서 쓰러지면 경험치를 잃고, 다음 층으로 나아가는 설정이면 한 층 얕은 곳부터 다시 내려간다(액트의 물러나기와 같은 뜻,
 * 2026-10-19 사용자 결정). 막힌 층에서 거듭 쓰러지는 쪽이 층을 깨는 쪽보다 경험치를 더 벌었다. 최고층 기록은 그대로다.
 * @returns {number} 잃은 경험치 */
function defeatOnUnderworldFloor(zone, message, opts, ui) {
    const lost = applyDeathExpPenalty(message, opts, ui);
    const uw = game.underworldProgress, floor = Math.floor(Number(zone.floor) || 0);
    if (!uw || floor <= 1 || !['nextZone', 'nextLoopBestPlusOne'].includes(game.settings.mapCompleteAction || 'nextZone')) return lost;
    uw.currentFloor = floor - 1;
    ui.say(_t('🛡️ 지하계 {value}층으로 물러나 다시 내려갑니다.', { value: floor - 1 }), 'season-up');
    return lost;
}
/** Content kinds whose defeat closes their run or moves it (a root boss fight is chosen in getContentKindDefeat). */
const CONTENT_DEFEAT_BY_KIND = Object.freeze({ beyondBoundary: defeatBeyondBoundary, meteor: defeatAtMeteor, timeRift: defeatInTimeRift, trial: defeatInTrial,
    underworld: defeatOnUnderworldFloor });
/** Anywhere else: a tenth of this level's experience is lost (never below 0). Returns the experience lost. */
function applyDeathExpPenalty(message, opts, ui) {
    let expPenalty = Math.floor(getExpReq(game.level) * 0.1);
    ui.say(message || "☠️ 사망! 경험치 페널티 적용", "death", { noToast: !!opts.noToast });
    let expBeforePenalty = Math.max(0, Math.floor(Number(game.exp) || 0));
    game.exp = Math.max(0, expBeforePenalty - expPenalty);
    return expBeforePenalty - game.exp;
}

/** 사망 기록: 마지막 3초(속성별, 상태이상, 몬스터별)와 그 전투 전체의 피해(takeDeathFightSummary), 최대 생명. */
function buildPlayerDeathLog(zone, opts, expLost, pStats) {
    let damageSummary = buildDeathDamageSummary(3000);
    let primaryEntry = damageSummary[0] || null;
    let primaryElement = primaryEntry ? primaryEntry.ele : normalizeDamageElementKey(opts.fatalElement);
    return {
        at: getCombatTime(),
        zoneName: zone && zone.name ? zone.name : '알 수 없는 지역',
        expLost: expLost,
        primaryElement: primaryElement,
        fatalElement: opts.fatalElement,
        reasonText: DEATH_REASON_TEXT[primaryElement] || DEATH_REASON_TEXT.phys,
        damageSummary: damageSummary,
        ailmentDamageSummary: buildDeathDamageSummary(3000, { ailmentOnly: true }),
        monsterSummary: buildDeathMonsterSummary(3000),
        activeAilments: snapshotPlayerAilmentsForDeathLog(),
        sourceName: opts.sourceName || '',
        retreatZoneName: retreatAfterActDefeat(zone),
        maxLife: Math.max(1, Math.floor(getPlayerHpCap(pStats))),
        fight: takeDeathFightSummary()
    };
}

function getPlayerAilmentResistChance(type, pStats) {
    if (!pStats) return 0;
    let res = 0;
    if (type === 'ignite') res = pStats.ailResIgnite || 0;
    else if (type === 'chill' || type === 'freeze') res = pStats.ailResFreeze || 0;
    else if (type === 'shock') res = pStats.ailResShock || 0;
    else if (type === 'poison') res = pStats.ailResPoison || 0;
    else if (type === 'bleed') res = pStats.ailResBleed || 0;
    return getSelfExperimentAilmentResist(Math.max(0, Math.min(1.00, (res + (pStats.ailmentResistBonusPct || 0)) / 100)), pStats);
}

/** 자가실험: 걸릴 확률 50% 감소. */
function getSelfExperimentAilmentResist(resist, pStats) {
    return pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.selfExperiment ? 1 - (1 - resist) * 0.5 : resist;
}

/** 자가실험: 나에게 걸리는 상태이상 지속시간 100% 증가. */
function getSelfExperimentAilmentDuration(duration, pStats) {
    return pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.selfExperiment ? duration * 2 : duration;
}

/** 적 치명타의 배율: 받는 치명타 피해 감소(갑옷 옵션, 90%까지)는 치명타로 늘어나는 몫을 줄인다. */
function getEnemyCritTakenMul(enemy, pStats) {
    const mul = enemy.critDamageMul || ENEMY_CRITICAL_DAMAGE_MULTIPLIER;
    return 1 + Math.max(0, mul - 1) * (1 - clampNumber(pStats.critTakenDamageReducePct || 0, 0, 90) / 100);
}

/** 주인공에게 걸리는 상태이상의 지속 시간 감소(갑옷 옵션, 75%까지). 냉기는 냉각과 동결이 함께 줄어든다. */
const PLAYER_AILMENT_DURATION_STATS = Object.freeze({ ignite: 'igniteTakenDurationReducePct', shock: 'shockTakenDurationReducePct', chill: 'coldTakenDurationReducePct',
    freeze: 'coldTakenDurationReducePct', poison: 'poisonTakenDurationReducePct', bleed: 'bleedTakenDurationReducePct' });
function getPlayerAilmentTakenDuration(type, duration, pStats) {
    return duration * (1 - clampNumber(pStats[PLAYER_AILMENT_DURATION_STATS[type]] || 0, 0, 75) / 100);
}

function applyPlayerAilment(type, duration, power, pStats, sourceHitDamage, options) {
    if (!type || duration <= 0) return;
    duration = getPlayerAilmentTakenDuration(type, getSelfExperimentAilmentDuration(duration, pStats), pStats);
    if ((type === 'ignite' && pStats.immuneIgnite) || (type === 'chill' && pStats.immuneChill) || (type === 'freeze' && pStats.immuneFreeze) || (type === 'shock' && pStats.immuneShock) || (type === 'bleed' && pStats.immuneBleed)) return;
    if (Math.random() < getPlayerAilmentResistChance(type, pStats)) return;
    game.playerAilments = Array.isArray(game.playerAilments) ? game.playerAilments : [];
    let damageAilment = isDamageAilmentType(type);
    let opts = (options && typeof options === 'object') ? options : {};
    let hitSource = Math.max(0, Math.floor(Number(opts.ailmentSourceDamage !== undefined ? opts.ailmentSourceDamage : sourceHitDamage) || 0));
    let critDotBonusPct = Math.max(0, Number(opts.critDotBonusPct) || 0);
    let ailmentDotScore = getDamageAilmentScore(hitSource, critDotBonusPct, 1, 1);
    let existing = game.playerAilments.find(row => row.type === type);
    if (type === 'poison') {
        // Offensive poison stack bonuses affect enemy ailments only; incoming player poison stays at 1 stack.
        let maxStacks = 1;
        let poisonRows = game.playerAilments.filter(row => row && row.type === 'poison');
        if (poisonRows.length >= maxStacks) {
            existing = poisonRows.reduce((a, b) => ((a.time || 0) <= (b.time || 0) ? a : b), poisonRows[0]);
        } else {
            existing = null;
        }
    }
    if (existing) {
        existing.time = Math.max(existing.time || 0, duration);
        existing.duration = existing.time;
        existing.power = Math.max(existing.power || 0, power || 0.1);
        if (damageAilment) {
            let existingScore = Math.max(0, Number(existing.ailmentDotScore) || getStoredAilmentHitDamage(existing));
            let incomingScore = ailmentDotScore;
            if (incomingScore >= existingScore) {
                existing.sourceHitDamage = hitSource;
                existing.critDotBonusPct = critDotBonusPct;
                existing.ailmentDotScore = incomingScore;
                existing.sourceEnemyId = opts.sourceEnemyId === undefined ? null : opts.sourceEnemyId;
                existing.sourceEnemyName = opts.sourceEnemyName || '';
            }
        }
    } else {
        let row = { type: type, time: duration, duration: duration, power: Math.max(0.1, power || 0.1) };
        if (damageAilment) {
            row.sourceHitDamage = hitSource;
            row.critDotBonusPct = critDotBonusPct;
            row.ailmentDotScore = ailmentDotScore;
            row.sourceEnemyId = opts.sourceEnemyId === undefined ? null : opts.sourceEnemyId;
            row.sourceEnemyName = opts.sourceEnemyName || '';
        }
        game.playerAilments.push(row);
    }
    if (typeof recordPassiveCycleAilmentStart === 'function') recordPassiveCycleAilmentStart(type, pStats.cycle, getCombatTime());
}

function recordPlayerAilmentIncomingDamage(ailment, element, amount) {
    let label = getAilmentDisplayLabel(ailment && ailment.type);
    let hasMonster = ailment && ailment.sourceEnemyId !== null && ailment.sourceEnemyId !== undefined;
    recordIncomingDamage(element, amount, (ailment && ailment.sourceEnemyName) || label, {
        sourceType: hasMonster ? 'monster' : 'ailment',
        sourceId: hasMonster ? ailment.sourceEnemyId : null,
        sourceName: (ailment && ailment.sourceEnemyName) || label,
        ailmentType: ailment && ailment.type
    });
}

/** Burning and bleeding drain the energy shield before life, like a hit (2026-10-04); poison (chaos) still reaches life directly.
 * A boss's burn took a 1,900-life, 9,500-shield build down while the shield stood full. Returns what is left for life. */
function takeAilmentDamageFromEnergyShield(damage) {
    game.playerEnergyShield = Math.max(0, Math.floor(Number(game.playerEnergyShield) || 0));
    const absorbed = Math.min(game.playerEnergyShield, Math.max(0, damage));
    if (absorbed <= 0) return damage;
    game.playerEnergyShield -= absorbed;
    game.playerEsLastHitAt = getCombatTime();
    return damage - absorbed;
}

function tickAilments(pStats, dt) {
    game.playerAilments = Array.isArray(game.playerAilments) ? game.playerAilments : [];
    let next = [];
    game.playerAilments.forEach(ail => {
        let previousTime = Math.max(0, Number(ail.time) || 0);
        ail.time = Math.max(0, (ail.time || 0) - dt);
        let power = Math.max(0.1, ail.power || 0.1);
        if (ail.type === 'ignite') {
            let burn = getPlayerDamageAilmentDps(ail, pStats);
            if (burn > 0) {
                burn = Math.max(1, Math.floor(burn * dt * (1 - Math.max(0, Math.min(0.75, (pStats.resF || 0) / 100))) * getWoodsmanCurseDamageTakenMul()));
                burn = Math.max(0, Math.floor(burn * (1 - Math.max(0, Math.min(0.9, (pStats.dotTakenDamageReducePct || 0) / 100)))));
                burn = Math.max(0, Math.floor(burn * (1 - Math.max(0, Math.min(0.9, (pStats.igniteDamageReducePct || 0) / 100)))));
                if (getCombatTime() < Math.max(0, Number(game.realmInvulnerableBarrierUntil) || 0)) burn = 0;
                burn = floorIncomingDamage(burn);
                const burnTotal = burn;
                burn = absorbDamageWithTalentStoneShield(takeAilmentDamageFromEnergyShield(burn));
                burn = absorbDamageWithRealmDeathWard(burn, pStats);
                game.playerHp -= burn;
                trackHiddenJournalPlayerDamage(burn);
                recordPlayerAilmentIncomingDamage(ail, 'fire', burnTotal);
            }
        } else if (ail.type === 'poison') {
            let poison = getPlayerDamageAilmentDps(ail, pStats);
            if (poison > 0) {
                poison = Math.max(1, Math.floor(poison * dt * (1 - Math.max(0, Math.min(0.75, (pStats.resChaos || 0) / 100))) * getWoodsmanCurseDamageTakenMul()));
                poison = Math.max(0, Math.floor(poison * (1 - Math.max(0, Math.min(0.9, (pStats.dotTakenDamageReducePct || 0) / 100)))));
                poison = Math.max(0, Math.floor(poison * (1 - Math.max(0, Math.min(0.9, (pStats.poisonDamageReducePct || 0) / 100)))));
                if (pStats.poisonToHeal) {
                    game.playerHp = Math.min(getPlayerRecoveryHpCap(pStats), game.playerHp + poison);
                }
                else {
                    if (getCombatTime() < Math.max(0, Number(game.realmInvulnerableBarrierUntil) || 0)) poison = 0;
                    poison = floorIncomingDamage(poison);
                    poison = absorbDamageWithTalentStoneShield(poison);
                    poison = absorbDamageWithRealmDeathWard(poison, pStats);
                    game.playerHp -= poison;
                    trackHiddenJournalPlayerDamage(poison);
                    recordPlayerAilmentIncomingDamage(ail, 'chaos', poison);
                }
            }
        } else if (ail.type === 'bleed') {
            let bleed = getPlayerDamageAilmentDps(ail, pStats);
            if (bleed > 0) {
                let effectiveBleedDr = (pStats.dr || 0);
                bleed = Math.max(1, Math.floor(bleed * dt * (1 - Math.max(0, Math.min(0.75, effectiveBleedDr / 100))) * getWoodsmanCurseDamageTakenMul()));
                bleed = Math.max(0, Math.floor(bleed * (1 - Math.max(0, Math.min(0.9, (pStats.dotTakenDamageReducePct || 0) / 100)))));
                bleed = Math.max(0, Math.floor(bleed * (1 - Math.max(0, Math.min(0.9, (pStats.bleedDamageReducePct || 0) / 100)))));
                if (getCombatTime() < Math.max(0, Number(game.realmInvulnerableBarrierUntil) || 0)) bleed = 0;
                bleed = floorIncomingDamage(bleed);
                const bleedTotal = bleed;
                bleed = absorbDamageWithTalentStoneShield(takeAilmentDamageFromEnergyShield(bleed));
                bleed = absorbDamageWithRealmDeathWard(bleed, pStats);
                game.playerHp -= bleed;
                trackHiddenJournalPlayerDamage(bleed);
                recordPlayerAilmentIncomingDamage(ail, 'phys', bleedTotal);
            }
        } else if (ail.type === 'chill') {
            // chill handled via aspd modifier in core loop
        } else if (ail.type === 'shock') {
            // shock handled via dr modifier in core loop
        } else if (ail.type === 'freeze') {
            // freeze duration only
        }
        if (ail.time > 0) next.push(ail);
        else if (previousTime > 0 && typeof recordPassiveCycleAilmentEnd === 'function') {
            recordPassiveCycleAilmentEnd(ail.type, pStats && pStats.cycle, getCombatTime());
        }
    });
    game.playerAilments = next;
}


/** 강화 변이시간선의 추가 피해(js/loop-mutation.js empoweredHit) 가운데 이번 타격의 물리에 더할 몫: 물리면 그 양이다. 물리 추가분은
 * 받는 물리 전환(physTakenAs), 방어도(합친 타격 크기로), 피해 감소를 이번 타격의 물리와 함께 거친다(2026-11-07 리뷰: 따로 붙어 비켜 갔다). */
function getEmpoweredPhysicalDamage(empowered) {
    return empowered && empowered.ele === 'phys' ? empowered.amount : 0;
}
/** 우주계 균등 분배가 나눌 추가분: 강화 변이의 추가 피해 전부(분배가 속성마다 경감한다). */
function getEmpoweredRawDamage(empowered) {
    return empowered ? empowered.amount : 0;
}
/** 강화 변이의 원소, 카오스 추가 피해를 따로 줄로: 그 속성 저항(적 보정 뒤, 우주계 균형 경감이면 그 값 balancedRes). 물리는 이번 타격의
 * 물리에 들어가고 균등 분배는 추가분까지 나누므로 그때는 줄이 없다. 성전사 cr4 전환은 저항 전에 한다. */
function getEmpoweredElementRows(empowered, pStats, enemy, balancedRes) {
    if (!empowered || empowered.ele === 'phys' || pStats.cosmosEqualDamageSplit) return [];
    const resOf = row => (pStats.cosmosBalanceMitigation ? balancedRes : getPlayerResistanceAfterEnemyModifiers(pStats, row.ele, enemy));
    return mitigateTakenRows(splitCrusaderLightningTaken([{ ele: empowered.ele, amount: empowered.amount }]), resOf);
}
const CRUSADER_LIGHTNING_TAKEN_ELEMENTS = Object.freeze(['fire', 'cold', 'chaos']);
/** 성전사 cr4(전하 보루): 받는 화염, 냉기, 카오스 피해의 30%를 번개로. 저항 전 피해 줄에 쓴다: 옮긴 몫은 번개 저항과 번개 받는 피해
 * 감소를 거친다(2026-11-07 리뷰: 경감 뒤에 옮겨 둘 다 비켜 갔다). */
function splitCrusaderLightningTaken(rows) {
    if (!hasKeystone('cr4')) return rows;
    return rows.flatMap(row => {
        if (!CRUSADER_LIGHTNING_TAKEN_ELEMENTS.includes(row.ele)) return [row];
        const shift = Math.floor(row.amount * 0.3);
        return [{ ele: row.ele, amount: row.amount - shift }, { ele: 'light', amount: shift }];
    });
}
/** 출혈 봉쇄 투구: 받는 물리 피해의 15%를 카오스로. 저항 전 피해 줄에 쓴다: 옮긴 몫은 카오스 저항과 카오스 받는 피해 감소를 거친다. */
function splitHelmChaosTaken(rows, pStats) {
    if (!pStats.uniqueBleedBlockHelm) return rows;
    return rows.flatMap(row => {
        if (row.ele !== 'phys') return [row];
        const chaos = Math.floor(row.amount * 0.15);
        return [{ ele: 'phys', amount: row.amount - chaos }, { ele: 'chaos', amount: chaos }];
    });
}
/** 받는 피해 전환을 저항 전 줄에: cr4 다음 투구(투구가 옮긴 카오스는 번개가 되지 않는다, 예전 순서 그대로). */
function convertTakenRowsRaw(rows, pStats) {
    return splitHelmChaosTaken(splitCrusaderLightningTaken(rows), pStats);
}
/** 저항 전 피해 줄을 줄마다 resOf(row)의 경감 %로 줄인다. 0이 된 줄은 뺀다. */
function mitigateTakenRows(rows, resOf) {
    return rows.map(row => ({ ele: row.ele, amount: Math.max(0, Math.floor(row.amount * (1 - resOf(row) / 100))) })).filter(row => row.amount > 0);
}
/** 받는 물리 전환 physTakenAs(합 75% 상한): 옮긴 몫은 cr4를 거쳐 그 속성 저항(적 보정 뒤)으로 줄인 줄로, physical은 남은 물리. */
function shiftPhysicalTakenAs(physical, pStats, enemy) {
    const takenAs = pStats.physTakenAs || {};
    const entries = ['fire', 'cold', 'light', 'chaos'].map(ele => [ele, Math.max(0, Number(takenAs[ele]) || 0)]);
    const total = entries.reduce((sum, row) => sum + row[1], 0);
    const scale = total > 75 ? 75 / total : 1;
    const rows = [];
    let shiftedTotal = 0;
    for (const [ele, raw] of entries) {
        const pct = raw * scale;
        const shifted = Math.min(physical - shiftedTotal, Math.floor(physical * pct / 100));
        if (shifted <= 0) continue;
        shiftedTotal += shifted;
        rows.push({ ele, amount: shifted });
    }
    const resOf = row => getPlayerResistanceAfterEnemyModifiers(pStats, row.ele, enemy);
    return { physical: Math.max(0, physical - shiftedTotal), rows: mitigateTakenRows(splitCrusaderLightningTaken(rows), resOf) };
}
function getPlayerResistanceAfterEnemyModifiers(pStats, element, enemy, effectMultiplier) {
    let keyByElement = { fire: 'F', cold: 'C', light: 'L', chaos: 'Chaos' };
    let suffix = keyByElement[element];
    if (!suffix) return 0;
    let finalResistance = Number((pStats && pStats[`res${suffix}`]) || 0);
    let uncappedResistance = Number.isFinite(Number(pStats && pStats[`rawRes${suffix}`]))
        ? Number(pStats[`rawRes${suffix}`])
        : finalResistance;
    let maxResistance = Number.isFinite(Number(pStats && pStats[`maxRes${suffix}`]))
        ? Number(pStats[`maxRes${suffix}`])
        : 75;
    let multiplier = Math.max(0, Number(effectMultiplier == null ? 1 : effectMultiplier) || 0);
    let resistanceReduction = Math.max(0, Number((enemy && enemy.resistanceReduction) || 0)) * multiplier;
    let penetration = Math.max(0, Number((enemy && enemy.penetration) || 0)) * multiplier;
    let reducedResistance = Math.min(maxResistance, uncappedResistance - resistanceReduction);
    return Math.max(MIN_PENETRATED_RESISTANCE, reducedResistance - penetration);
}


function getCosmosBalancedMitigationPct(pStats, enemy, physRes) {
    let resValues = ['fire', 'cold', 'light', 'chaos'].map(ele => getPlayerResistanceAfterEnemyModifiers(pStats, ele, enemy));
    let total = Math.max(-60, Number(physRes) || 0) + resValues.reduce((sum, value) => sum + (Number(value) || 0), 0);
    return Math.max(-60, Math.min(90, total / 5));
}

function getCosmosEqualSplitDamageBreakdown(rawDamage, pStats, enemy) {
    let total = Math.max(1, Math.floor(Number(rawDamage) || 1));
    let elements = ['phys', 'fire', 'cold', 'light', 'chaos'];
    let remaining = total, mitigationOf = {};
    let rows = elements.map((ele, idx) => {
        let portion = idx === elements.length - 1 ? remaining : Math.floor(total / elements.length);
        remaining = Math.max(0, remaining - portion);
        let mitigation = ele === 'phys'
            ? Math.max(-60, (pStats.dr || 0) + getArmorPhysicalReductionPct(pStats.armor || 0, portion))
            : getPlayerResistanceAfterEnemyModifiers(pStats, ele, enemy);
        mitigationOf[ele] = pStats.cosmosBalanceMitigation ? getCosmosBalancedMitigationPct(pStats, enemy, mitigation) : mitigation;
        return { ele, amount: portion };
    });
    // 받는 피해 전환(cr4, 출혈 봉쇄 투구)은 나눈 몫에 저항 전에: 옮긴 몫은 새 속성 몫의 경감을 받는다.
    return mitigateTakenRows(convertTakenRowsRaw(rows, pStats), row => mitigationOf[row.ele]);
}

function getColonyDefenseCoreTarget() {
    const run=getColonyRoomRun();
    if(!game.colony?.inRun || !run)return null;
    const core=actExplorationMap.forRun(run).colonyDefense?.core;
    return core ? {...core,isColonyCore:true} : null;
}
function nearestEnemyCombatTarget(enemy,initial,reach) {
    let best=initial,distance=getGridUnitDistance(enemy,initial);
    const candidates=[game.gridPlayer,...(game.summons||[]).filter(unit=>unit && unit.alive && !unit.isGhost && unit.hp>0)];
    for(const unit of candidates) {
        if(!hasGridCell(unit))continue;
        const next=getGridUnitDistance(enemy,unit);
        if(next>=distance || next>reach)continue;
        best=unit;distance=next;
    }
    return best;
}
function getEnemyPreferredGridTarget(enemy) {
    const player=game.gridPlayer;
    if(!hasGridCell(enemy) || !hasGridCell(player))return player;
    const core=getColonyDefenseCoreTarget();
    if(!core)return nearestEnemyCombatTarget(enemy,player,Infinity);
    // Borers keep heading for the core until a closer body is within their ordinary melee reach.
    if(!enemy.isBoss && !enemy.isSeveredWanderer && enemy.monsterVisualSetId==='colony' && enemy.monsterVisualId==='colony-borer-grub')
        return nearestEnemyCombatTarget(enemy,core,1);
    const reach=Math.max(2,Math.min(5,Number(enemy.attackRange)||1));
    return nearestEnemyCombatTarget(enemy,core,reach);
}

/** 적이 자기 사거리(근접 1칸/원거리 3~5칸/보스는 data/bosses.js BOSS_REACH) 안에 선택한 목표를 두고 있는지 판정한다. */
function isEnemyInGridAttackRange(enemy, target) {
    // 칸 미배정 상태(레거시 저장 복원 직후 등)에서는 다음 틱의 그리드 복구 전까지 기존 동작을 유지한다.
    target = target || game.gridPlayer;
    if (!hasGridCell(enemy) || !hasGridCell(target)) return true;
    let range = Number.isFinite(enemy.attackRange) ? enemy.attackRange : COMBAT_GRID_CONFIG.bossAttackRange;
    return getGridUnitDistance(enemy, target) <= range && enemyAttackRules.meleeReach(enemy, target);
}

/** 사거리 밖에서도 그 자리에서 쓰는 공격인가: 보스의 다음 공격이 예고하는 특수기이고 대상이 BOSS_REACH.castRange칸 안일 때.
 * 근접 보스도 지면 강타는 떨어진 곳에 내리친다(달아나기만 하면 아무것도 맞지 않는 싸움이 되지 않게). */
function canBossCastFromAfar(enemy, target) {
    if (!enemy.isBoss || enemy.roomInvader || !hasGridCell(enemy) || !hasGridCell(target)) return false; // 뿌리 절단자는 붙어서 간다
    const next = getBossPatternPreview(enemy);
    return !!next && next.isSpecial === true && getGridUnitDistance(enemy, target) <= BOSS_REACH.castRange;
}

/** 적이 지금 선 자리에서 공격을 이어 가는가: 목표가 사거리 안이거나, 보스가 떨어진 곳에서 쓰는 특수기의 차례다. 아니면 다가간다. */
function canEnemyAttackFromHere(enemy, target) {
    if (woodsmanBattle.owns(enemy)) return true;
    return isEnemyInGridAttackRange(enemy, target) || canBossCastFromAfar(enemy, target || game.gridPlayer);
}

/** 사거리 밖의 적을 선택한 목표 쪽으로 한 칸씩 접근시킨다. slowPct(0~1)만큼 이동 주기가 길어진다. */
function advanceEnemyGridApproach(enemy, target, slowPct) {
    if (typeof target === 'number') {
        slowPct = target;
        target = game.gridPlayer;
    }
    target = target || game.gridPlayer;
    if (enemyAmbush.tryBlink(enemy, target)) return; // 기습 정예는 걸어가지 않고 옆 칸에 나타난다(js/enemy-ambush.js)
    let slow = Math.max(0, Math.min(0.9, slowPct || 0));
    let interval = getGridUnitStepSec(enemy) / (1 - slow);
    advanceGridUnitMovement(enemy, target, 0.1, interval);
}

function getSummonRespawnAt(summon, shortened) {
    let baseMs = Math.max(4000, Math.floor((summon && summon.respawnMs) || 8000));
    let delayMs = shortened ? Math.floor(baseMs * 0.7) : baseMs;
    return getCombatTime() + delayMs;
}

function getClosestLivingSummonToPlayer() {
    let player = game.gridPlayer;
    return (game.summons || []).filter(summon => summon && !summon.isGhost && summon.alive && summon.hp > 0).sort((a, b) => {
        let aDist = hasGridCell(player) && hasGridCell(a) ? getGridUnitDistance(player, a) : Infinity;
        let bDist = hasGridCell(player) && hasGridCell(b) ? getGridUnitDistance(player, b) : Infinity;
        return aDist - bDist || a.id - b.id;
    })[0] || null;
}

function applyMonsterDamageToSummon(summon, rawDamage, enemy, pStats, bossPattern) {
    if (summon && summon.isGhost) return 0;
    let evade = getSummonEvadeChance(summon, enemy);
    if (resolveEntropyEvasion(summon, evade, getCombatTime())) return 0;
    let damage = Math.max(1, Math.floor(rawDamage || 1));
    const attackElement = enemyAttackRules.element(enemy, bossPattern);
    if (attackElement === 'phys') {
        let armorReduction = Math.min(85, (summon.armor || 0) / ((summon.armor || 0) + damage * 8) * 100);
        damage = Math.max(1, Math.floor(damage * (1 - armorReduction / 100)));
    } else {
        let resKey = { fire: 'resFire', cold: 'resCold', light: 'resLight', chaos: 'resChaos' }[attackElement];
        let resistance = resKey ? Math.max(-60, Math.min(85, Number(summon[resKey]) || 0)) : 0;
        damage = Math.max(1, Math.floor(damage * (1 - resistance / 100)));
    }
    damage = Math.min(damage, summon.hp);
    summon.hp = Math.max(0, summon.hp - damage);
    if (damage > 0) {
        addBattleFx('summonHit', {
            summonId: summon.id,
            damage: damage,
            element: attackElement,
            duration: 260
        });
    }
    if (summon.hp > 0) return damage;
    summon.alive = false;
    summon.respawnAt = getSummonRespawnAt(summon, false);
    if (pStats.uniqueSummonDeathDamageBuff) {
        let config = pStats.uniqueSummonDeathDamageBuff;
        game.summonDeathDamageBuffPct = Math.max(Number(game.summonDeathDamageBuffPct || 0), Math.max(0, Number(config.pct || 40)));
        game.summonDeathDamageBuffExpiresAt = getCombatTime() + Math.max(1, Number(config.duration || 4)) * 1000;
    }
    return damage;
}

/** Apply each summon hit once; return whether the player's defense pipeline must also run. */
function dispatchMonsterHitTargets(targets, damage, enemy, pStats, bossPattern) {
    const coreHit=targets.some(unit=>unit.isColonyCore);
    if(coreHit)strikeColonyDefenseCore(damage);
    if(coreHit && !game.colony?.inRun)return false;
    targets.filter(unit => unit !== game.gridPlayer && !unit.isColonyCore)
        .forEach(summon => applyMonsterDamageToSummon(summon, damage, enemy, pStats, bossPattern));
    return targets.includes(game.gridPlayer);
}

/** A real landed enemy hit damages the objective by its final outgoing damage before player mitigation. */
function strikeColonyDefenseCore(damage) {
    const colony=game.colony;
    if(!colony?.inRun || colony.coreHp<=0)return;
    colony.coreHp=Math.max(0,colony.coreHp-Math.max(1,Math.floor(Number(damage)||1)));
    if(colony.coreHp===0)failColonyDefense();
}

function getEnemyCombatDelivery(enemy, bossPattern) {
    return enemyAttackRules.delivery(enemy, bossPattern);
}

function getEnemyCombatTargetType(target) {
    if(target.isColonyCore)return 'colonyCore';
    return target===game.gridPlayer ? 'player' : 'summon';
}

function queueEnemyCombatAttack(enemy, target, bossPattern, delivery) {
    let sourceCell = copyCombatGridCell(enemy);
    let targetCell = copyCombatGridCell(target);
    if (enemy.attackCast) targetCell = enemy.attackCast.targetCell;
    if (!sourceCell || !targetCell) return false;
    let now = getCombatTime();
    let travelMs = enemy.isBoss ? BOSS_ATTACK_IMPACT_DELAY_MS : getCombatTravelMs(sourceCell, targetCell);
    let targetType=getEnemyCombatTargetType(target);
    const attack = {
        at: now + travelMs, castStartAt: now, enemyId: enemy.id, source: enemy, sourceCell, targetType,
        targetId: targetType === 'summon' ? target.id : null,
        targetCell, bossPattern: bossPattern || null, delivery, woodsmanElement: woodsmanAttackFxElement(enemy)
    };
    const flight = enemyAttackRules.trajectory(attack,enemy,travelMs);
    travelMs = flight.duration;
    pendingEnemyCombatAttacks.push(attack);
    bossMoves.begin(attack, now);
    const releaseMs = announceEnemyAttackRelease(enemy, bossPattern, delivery, target);
    if (delivery === 'patternArea') return true;
    addBattleFx('combatTravel', {
        owner: 'enemy', sourceId: enemy.id, sourceCell, targetCells: [attack.targetCell], travelPath:flight.path, enemyFlight:attack,
        targetType, targetId: attack.targetId,
        delivery, element: enemyAttackRules.element(enemy, bossPattern), cerberusHead: bossPattern?.cerberusHead, releaseDelayMs: 0,
        flightMs: travelMs, duration: Math.max(travelMs + 260, releaseMs)
    });
    return true;
}

/** A boss strikes visually at release, including when a warned area later misses every target. */
function announceBossRelease(enemy, bossPattern, delivery) {
    const slam = delivery === 'patternArea' && !['line', 'fan'].includes(bossPattern.area.kind);
    const woodsman = woodsmanAttackFxElement(enemy);
    addBattleFx('bossRelease', { enemyId: enemy.id, slam, special: !!bossPattern?.isSpecial, duration: 560,
        cerberusHead: bossPattern?.cerberusHead, woodsman: !!woodsman, element: woodsman || enemyAttackRules.element(enemy, bossPattern) });
}

/** Keep the complete post-impact clip for every instant target, including summons, the core and the rescued NPC.
 * motionMs limits the legacy lunge to 220ms. Flights carry their own release; return their minimum visual lifetime
 * without changing flightMs or the hit time. Boss animation continues to use its existing bossRelease signal. */
function announceEnemyAttackRelease(enemy, bossPattern, delivery, target) {
    if (enemy.isBoss) announceBossRelease(enemy, bossPattern, delivery);
    const actor = getBossStageActor(enemy);
    const remaining = actor?.attackMs ? actor.attackMs.slice(actor.impactFrame).reduce((sum, ms) => sum + ms, 0) : 0;
    const duration = Math.max(220, remaining);
    if (delivery === 'instantTarget') {
        const targetCell = copyCombatGridCell(target);
        addBattleFx('enemyAttack', { enemyId: enemy.id, duration, motionMs: 220,
            targetType: target === enemy.rescue ? 'rescue' : getEnemyCombatTargetType(target), targetCell });
        const element = woodsmanAttackFxElement(enemy);
        if (element && targetCell) addBattleFx('woodsmanImpact', { cells: [targetCell], element, duration: 460 });
    }
    return enemy.isBoss ? 0 : duration;
}

/** A dead enemy attacks no more. A boss's released area ends with the boss: enemyAttackRules.cancelPending drops it on the
 * boss's next turn, but the last enemy's turn never comes, so the warning stayed on the field and held the hero in place
 * (2026-10-07 user report). The attack gauge empties too, so landing a shot already in flight cannot start a new one. */
function retireDeadEnemyAttacks(enemy) {
    enemy.attackTimer = 0;
    for (let i = pendingEnemyCombatAttacks.length - 1; i >= 0; i--) {
        const row = pendingEnemyCombatAttacks[i];
        const mine = row && (row.source ? row.source === enemy : row.enemyId === enemy.id);
        if (mine && (enemy.isBoss || row.delivery === 'patternArea')) dropEnemyAttack(i, getCombatTime());
    }
    if (enemy.isBoss) Object.assign(enemy, { patternArea: null, patternTelegraphKey: null, patternTelegraphStartedAt: 0, attackCast: null });
}

/** Remove the pending hit and its future pictures together; normal monsters' released projectiles survive their source. */
function dropEnemyAttack(index, now) {
    const [row] = pendingEnemyCombatAttacks.splice(index, 1);
    bossMoves.cut(row.bossPattern && row.bossPattern.move, now);
    for (let i = battleFx.length - 1; i >= 0; i--) if (battleFx[i]?.enemyFlight === row) battleFx.splice(i, 1);
}

/** Shots the last enemy let go before it died still land now, not at the first tick of the next fight: the tick runs enemy
 * attacks only while enemies are left. */
function settleLastEnemyAttacks(pStats) {
    if ((game.enemies || []).length > 0 || pendingEnemyCombatAttacks.length === 0) return;
    performMonsterAttacks(pStats);
}

function takePendingEnemyCombatAttack(enemyId, now) {
    let index = pendingEnemyCombatAttacks.findIndex(row => row && row.enemyId === enemyId);
    if (index < 0) return null;
    let attack = pendingEnemyCombatAttacks[index];
    if (attack.source.isBoss && attack.source.hp <= 0) { dropEnemyAttack(index,now); return null; }
    if (enemyAttackRules.cancelPending(attack,now)) {
        clearCancelledBossRecovery(attack.source, now);
        dropEnemyAttack(index,now);
        return null;
    }
    if (attack.at > now) return null;
    if (attack.path && !enemyAttackRules.advanceFlight(attack,game,now)) return null;
    pendingEnemyCombatAttacks.splice(index, 1);
    if (attack.delivery === 'patternArea') landBossPatternArea(attack, now);
    announceWoodsmanImpact(attack);
    return attack;
}

/** The released element owns its visual through landing, even if life crosses a phase boundary in flight. */
function announceWoodsmanImpact(attack) {
    if (!attack.woodsmanElement) return;
    const cells = attack.delivery === 'patternArea' ? attack.bossPattern.area.cells
        : getEnemyCombatImpactTargets(attack).map(copyCombatGridCell).filter(Boolean);
    if (cells.length) addBattleFx('woodsmanImpact', { cells, element: attack.woodsmanElement, duration: 460 });
}

/** Interrupted ordinary specials never keep the recovery reserved for their unplayed stages. */
function clearCancelledBossRecovery(enemy, now) {
    if (enemy.isBoss && enemy.patternMode !== 'apex') enemy.apexRecoveryUntil = now;
}

/** A released special lands: all at once, or (a move, js/boss-moves.js) its next stage with the rest queued again. Ground bursts
 * (and the whole of a special without a move) flash, shake and sound as a slam; shots, beams and bursts in a row show their own
 * effects (js/canvas-boss-moves.js). */
function landBossPatternArea(attack, now) {
    attack.source.attackCast = null;
    const stage = bossMoves.takeStage(attack, pendingEnemyCombatAttacks, now);
    if (woodsmanStumps.resolve(attack, now)) return;
    if (stage && !stage.burst) return;
    addBattleFx('bossAreaImpact', { footprint: attack.bossPattern.area, element: attack.source.ele || 'phys', duration: 560 });
}

/** Resolve current occupants of the released attack, never its original victim's id. */
function getEnemyCombatImpactTargets(pendingAttack) {
    return pendingAttack.observerTargets || woodsmanBattle.takeTargets(pendingAttack, enemyAttackRules.impactTargets(pendingAttack,game));
}

/** Base hit before the enemy's own modifiers and the victim's defenses. */
function getMonsterBaseHitDamage(zone, seasonDepth, tierPressure, benchmarkProfile) {
    let seasonDmgScale = getMonsterLoopGrowthScale(zone, 'damage', seasonDepth, tierPressure);
    let dmg = Math.floor((2.4 + zone.tier * 3.35) * 1.15 * seasonDmgScale);
    if (benchmarkProfile) dmg = Math.floor(dmg * benchmarkProfile.damage);
    else if (zone.type === 'underworld') dmg = Math.floor(dmg * 0.78 * getUnderworldEnemyDamageMultiplier(zone));
    if (zone.type === 'skyTower') dmg = Math.floor(dmg * 1.08);
    return Math.max(1, Math.floor(dmg * getMonsterLoopPowerScale(zone, 'damage')));
}

/** The heart changes its warning sequence after half life, between casts so a drawn warning never disappears. */
function updateMeteorHeartPhase(enemy, zone, pendingAttack) {
    if (zone.type !== 'meteor' || enemy.monsterVisualId !== 'meteor-heart' || enemy.patternMode !== 'slam'
        || enemy.hp > enemy.maxHp / 2 || enemy.patternTelegraphKey || enemy.patternArea || enemy.attackCast || pendingAttack
        || pendingEnemyCombatAttacks.some(row => row.enemyId === enemy.id)) return;
    enemy.patternMode = 'coreFrenzy';
    enemy.nextPatternState = null;
}

function prepareMonsterAttackShield(pStats) {
    if(!Number.isFinite(game.playerEnergyShield))game.playerEnergyShield=Math.floor(pStats.energyShield || 0);
    game.playerEnergyShield=Math.max(0,Math.min(Math.floor(Number(game.playerEnergyShield)||0),getPlayerEnergyShieldRecoveryCap(pStats)));
}
function readyMonsterAttackSources() {
    const sources=(game.enemies || []).slice();
    pendingEnemyCombatAttacks.forEach(row=>{
        if(row && row.at<=getCombatTime() && row.source && !sources.some(enemy=>enemy && enemy.id===row.enemyId))sources.push(row.source);
    });
    return sources;
}
const colonyRunEndedDuringAttacks=zone=>zone.type==='colony' && !game.colony?.inRun;
/** 수호자 gd6: 맞을 때마다 인내 중첩, 5중첩이면 받은 피해만큼 되돌려 친다. 반사로 쓰러진 적은 바로 죽음 처리를 한다(뒤의 몬스터
 * 흡혈이 되살리고 연속 공격이 이어지던 일, 2026-11-07 리뷰). */
function applyGuardianEnduranceReflect(enemy, remaining, pStats) {
    let stacks = Math.max(0, Math.min(5, Math.floor(game.guardianEnduranceStacks || 0))) + 1;
    game.guardianEnduranceExpiresAt = getCombatTime() + 4000;
    if (stacks < 5) {
        game.guardianEnduranceStacks = stacks;
        return;
    }
    let reflect = Math.max(1, Math.floor((pStats.guardianReflectDamage || 1) + remaining));
    applyDamageToEnemyResource(enemy, reflect);
    addBattleFx('hit', { enemyId: enemy.id, color: getElementColor('phys'), damage: reflect, duration: 260, element: 'phys', syncToSwing: false });
    game.guardianEnduranceStacks = 2;
    if (enemy.hp <= 0) handleEnemyDeath(enemy, pStats);
}

function resolveObserverFatal(attack, zone, stats) {
    if (!attack?.observerFatal) return false;
    const sourceName = enemyAttackRules.damageName(attack.source, attack.bossPattern);
    recordIncomingDamage('chaos', game.playerHp, sourceName);
    game.playerHp = 0;
    handlePlayerDefeat(zone, stats, null, { fatalElement: 'chaos', sourceName });
    return true;
}

function performMonsterAttacks(pStats) {
    let zone = getZone(game.currentZoneId);
    let abyssScale = getAbyssMonsterScales(zone);
    prepareMonsterAttackShield(pStats);
    let aliveCount = (game.enemies || []).filter(enemy => enemy.hp > 0).length;
    let crowdPenalty = Math.max(0.34, 1 - Math.max(0, aliveCount - 1) * 0.055);
    let attackSources=readyMonsterAttackSources();
    for (let enemy of attackSources) {
        if(colonyRunEndedDuringAttacks(zone))break;
        woodsmanBattle.prepare(enemy);
        if (game.currentZoneId !== zone.id || game.playerHp <= 0) return; // A cube landing can end the encounter here.
        let pendingAttack = takePendingEnemyCombatAttack(enemy.id, getCombatTime());
        if (resolveObserverFatal(pendingAttack, zone, pStats)) return;
        if (enemy.hp <= 0 && !pendingAttack) continue;
        if ((enemy.noAttack || actExplorationState.inArrivalGrace(actExplorationState.current(game), getCombatTime())) && !pendingAttack) continue;
        let ailMap = {};
        (enemy.ailments || []).forEach(ail => { if ((ail.time || 0) > 0) ailMap[ail.type] = Math.max(ailMap[ail.type] || 0, ail.power || 0); });
        if (!pendingAttack && enemyAttackRules.interrupt(enemy,getCombatTime())) continue;
        applyEnemyRegen(enemy, pStats);
        enemy.recentHitsTimer = Math.max(0, (enemy.recentHitsTimer || 0) - 0.1);
        if (enemy.recentHitsTimer <= 0) enemy.recentHitsTaken = Math.max(0, (enemy.recentHitsTaken || 0) - 1);
        let seasonDepth = getSoftenedLoopDepth(getLoopDifficultyInputs(zone).seasonLoops);
        let tierPressure = clampNumber(((zone.tier || 1) - 1) / 10, 0, 1);
        const monsterBaseAttackSpeedMul = 1.10;
        let seasonAtkScale = 1 + seasonDepth * (0.012 + (tierPressure * 0.018));
        let curseDebuffs = (game.enemyConditionDebuffs && game.enemyConditionDebuffs[enemy.id]) ? game.enemyConditionDebuffs[enemy.id] : [];
        let curseSlow = 0;
        let enemyDmgMul = 1;
        curseDebuffs.forEach(deb => { curseSlow += (getConditionDebuffDelta(deb).enemyAspdSlow || 0); });
        curseDebuffs.forEach(deb => { enemyDmgMul *= (getConditionDebuffDelta(deb).enemyDmgMul || 1); });
        let chillSlow = ailMap.chill ? Math.min(0.45, 0.12 + ailMap.chill * 0.14) : 0;
        chillSlow += Math.max(0, Math.min(0.5, Number(enemy.skillSlowPct || 0) / 100));
        chillSlow = Math.min(0.65, chillSlow + curseSlow);
        if (!pendingAttack && pendingEnemyCombatAttacks.some(row => row.enemyId === enemy.id)) continue;
        if (!pendingAttack && strikeRescueTarget(enemy)) continue;
        if (!pendingAttack && (Number(enemy.skillHeldUntil) || 0) > getCombatTime()) continue; // 띄워진 몬스터(launchEnemyOnHit)
        if (!pendingAttack && (enemy.apexRecoveryUntil || 0) > getCombatTime()) continue;
        if (!pendingAttack && bossMoves.observer.wait(enemy, getCombatTime())) continue;
        let impactTargets = pendingAttack ? getEnemyCombatImpactTargets(pendingAttack) : [getEnemyPreferredGridTarget(enemy)];
        let attackTarget = impactTargets[0];
        enemyAttackRules.noteAim(enemy,getColonyDefenseCoreTarget() ? attackTarget : null);
        if (!attackTarget) continue;
        // 그리드 사거리 밖이면 공격 대신 선택한 목표에게 접근한다(냉각/둔화는 이동도 늦춘다).
        // 공격 게이지는 1회분까지만 유지해 도착 직후 바로 공격하게 한다.
        if (!pendingAttack && !enemy.patternArea && !enemy.attackCast && !bossMoves.canPrepare(enemy, attackTarget)) {
            advanceEnemyGridApproach(enemy, attackTarget, chillSlow + (enemyTimeSlowed(enemy) ? TIME_SLOW_MOVE : 0));
            enemy.attackTimer = Math.min(Number(enemy.attackTimer) || 0, 1);
            continue;
        }
        let atkRate = (0.26 + zone.tier * 0.013) * monsterBaseAttackSpeedMul * seasonAtkScale * (enemy.isElite || enemy.isBoss ? 1.16 : 1) * (enemy.atkMul || 1) * (enemy.attackSpeedVar || 1) * 1.03 * (1 - chillSlow);
        const benchmarkProfile = getDifficultyBenchmarkProfile(zone);
        if (benchmarkProfile) atkRate *= benchmarkProfile.attackRate;
        else if (zone.type === 'underworld') atkRate *= 0.76;
        if (zone.type === 'skyTower') atkRate *= 1.05;
        if (!Number.isFinite(atkRate) || atkRate <= 0) atkRate = 0.12;
        if (!Number.isFinite(enemy.attackTimer) || enemy.attackTimer < 0) enemy.attackTimer = 0;
        if (!pendingAttack) enemy.attackTimer += 0.1 * atkRate;
        updateMeteorHeartPhase(enemy, zone, pendingAttack);
        if (enemy.isBoss && typeof refreshBossPatternPreview === 'function') refreshBossPatternPreview(enemy);
        let bossPatternTelegraphReady = !!pendingAttack || (enemy.isBoss
            ? updateBossPatternTelegraph(enemy, getCombatTime(), attackTarget, atkRate) : enemyAttackRules.ready(enemy,getCombatTime(),attackTarget));
        let bossAttacksThisTick = 0;
        while (pendingAttack || (enemy.hp > 0 && enemy.attackTimer >= 1)) {
            if (enemy.isBoss && bossAttacksThisTick >= 1) {
                enemy.attackTimer = Math.min(enemy.attackTimer, 1);
                break;
            }
            if (!bossPatternTelegraphReady) {
                enemy.attackTimer = Math.min(enemy.attackTimer, 1);
                break;
            }
            if (enemy.isBoss) bossAttacksThisTick++;
            let resolvingPendingAttack = pendingAttack;
            let bossPattern = resolvingPendingAttack ? resolvingPendingAttack.bossPattern
                : (typeof consumeBossPatternAttack === 'function' ? consumeBossPatternAttack(enemy) : null);
            if (!resolvingPendingAttack && zone && zone.type === 'cosmos') {
                bossPattern = applyCosmosBossAttackSetup(enemy, bossPattern, pStats);
            }
            if (!resolvingPendingAttack && zone && zone.type === 'cosmos') applyCosmosBossPlayerDebuff(enemy);
            if (!resolvingPendingAttack && zone && zone.id === 'cosmos_astra' && enemy.isBoss) applyCosmosAstraStance(enemy);
            if (zone.type === 'outsideChaos' && enemy.isWoodsman) {
                enemy.nextCurseAt = Number.isFinite(enemy.nextCurseAt) ? enemy.nextCurseAt : 0;
                if (getCombatTime() >= enemy.nextCurseAt) {
                    enemy.nextCurseAt = getCombatTime() + 6500;
                    let curseType = rndChoice(['ignite','chill','shock','poison','bleed']);
                    applyPlayerAilment(curseType, 4, 0.18, pStats, 0, {
                        sourceEnemyId: enemy.id,
                        sourceEnemyName: enemy.name
                    });
                    addLog(_t('☠️ 알 수 없는 권능: {ailment}', { ailment: _t(curseType === 'ignite' ? '점화' : curseType === 'chill' ? '냉각' : curseType === 'shock' ? '감전' : curseType === 'poison' ? '중독' : '출혈') }), 'attack-monster', { noToast: true });
                }
            }
            if (!resolvingPendingAttack) {
                enemy.attackTimer -= 1;
                let delivery = getEnemyCombatDelivery(enemy, bossPattern);
                if (delivery !== 'instantTarget' && queueEnemyCombatAttack(enemy, attackTarget, bossPattern, delivery)) break;
                // 붙어서 바로 치는 보스도 놓는 순간을 알린다: 그림 보스의 공격 동작이 이때 타격 프레임을 친다(js/canvas-monster-actors.js).
                announceEnemyAttackRelease(enemy, bossPattern, 'instantTarget', attackTarget);
            } else pendingAttack = null;
            if (attackTarget === game.gridPlayer) {
                if (skillGemCombatRuntime) enemy.facingDirection=skillGemCasts.facing(enemy,game.gridPlayer);
            }
            let dmg = getMonsterBaseHitDamage(zone, seasonDepth, tierPressure, benchmarkProfile);
            dmg = Math.floor(dmg * enemyDmgMul * (enemy.damageMul || 1));
            if (zone.type === 'act' && zone.id <= 1 && (game.season || 1) >= 3) dmg = Math.floor(dmg * 0.58);
            if (enemy.isElite) dmg = Math.floor(dmg * 1.28);
            if (enemy.isBoss) dmg = Math.floor(dmg * (1.14 + zone.tier * 0.16));
            dmg = Math.floor(dmg * getEntryBossTuning(zone, enemy.isBoss).damage);
            if (bossPattern && Number.isFinite(bossPattern.damageMul) && bossPattern.damageMul !== 1) {
                dmg = Math.max(1, Math.floor(dmg * bossPattern.damageMul));
                if (bossPattern.isSpecial && game.settings.showCombatLog) {
                    addLog(`⚠️ ${enemy.name}: ${bossPattern.label}`, 'attack-monster', { noToast: true });
                }
            }
            if (!enemy.isBoss) dmg = Math.floor(dmg * crowdPenalty);
            dmg = Math.floor(dmg * (abyssScale.dmgMul || 1) * (abyssScale.playerTakenMul || 1) * (enemy.isBoss ? (abyssScale.bossMul || 1) : 1));
            if (!dispatchMonsterHitTargets(impactTargets, dmg, enemy, pStats, bossPattern)) break;
            if (getCombatTime() < Math.max(0, Number(game.realmInvulnerableBarrierUntil) || 0)) {
                addBattleFx('statusText', { text: _t('균열 장막'), color: '#c49bff', duration: 220 });
                continue;
            }
            // 원본 피해를 먼저 50:50 분할한다. 머리별 속성은 본체 속성과 분리한다.
            let attackElement = enemyAttackRules.element(enemy, bossPattern);
            let physicalPortion = Math.floor(dmg * 0.5);
            let elementalPortion = Math.max(0, dmg - physicalPortion);
            if (attackElement === 'phys') {
                physicalPortion = dmg;
                elementalPortion = 0;
            }
            let empowered = loopMutation.empoweredHit(enemy, dmg);
            let physTaken = shiftPhysicalTakenAs(physicalPortion + getEmpoweredPhysicalDamage(empowered), pStats, enemy);
            physicalPortion = physTaken.physical;
            let elementalRes = ['fire', 'cold', 'light', 'chaos'].includes(attackElement)
                ? getPlayerResistanceAfterEnemyModifiers(pStats, attackElement, enemy)
                : 0;
            let physRes = Math.max(-60, pStats.dr + getArmorPhysicalReductionPct(pStats.armor, physicalPortion));
            if (pStats.cosmosBalanceMitigation) {
                let balanced = getCosmosBalancedMitigationPct(pStats, enemy, physRes);
                physRes = balanced;
                elementalRes = balanced;
            }
            // 받는 피해 전환(cr4, 출혈 봉쇄 투구)은 저항 전에: 옮긴 몫은 새 속성의 저항과 받는 피해 감소를 거친다.
            let hitResOf = row => (row.ele === 'phys' ? physRes
                : (row.ele === attackElement || pStats.cosmosBalanceMitigation ? elementalRes : getPlayerResistanceAfterEnemyModifiers(pStats, row.ele, enemy)));
            let damageBreakdown = pStats.cosmosEqualDamageSplit
                ? getCosmosEqualSplitDamageBreakdown(dmg + getEmpoweredRawDamage(empowered), pStats, enemy)
                : mitigateTakenRows(convertTakenRowsRaw([{ ele: 'phys', amount: physicalPortion }, { ele: attackElement, amount: elementalPortion }], pStats), hitResOf);
            damageBreakdown = damageBreakdown.concat(physTaken.rows, getEmpoweredElementRows(empowered, pStats, enemy, physRes));
            damageBreakdown = damageBreakdown.map(row => {
                let less = 0;
                if (row.ele === 'fire') less = pStats.fireTakenDamageReducePct || 0;
                else if (row.ele === 'cold') less = pStats.coldTakenDamageReducePct || 0;
                else if (row.ele === 'light') less = pStats.lightTakenDamageReducePct || 0;
                else if (row.ele === 'chaos') {
                    less = (pStats.chaosTakenDamageReducePct || 0) + (pStats.uniqueChaosTakenDamageReducePct || 0);
                }
                if (less > 0) return { ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) * (1 - Math.max(0, Math.min(0.9, less / 100))))) };
                return row;
            }).filter(row => row.amount > 0);
            let takenFlatReduce = (pStats && pStats.takenFlatReduce) || {};
            damageBreakdown = damageBreakdown.map(row => {
                if (!row || row.amount <= 0) return row;
                let elementFlatLess = Math.max(0, Number(takenFlatReduce[row.ele] || 0));
                if (elementFlatLess <= 0) return row;
                return { ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) - elementFlatLess)) };
            }).filter(row => row && row.amount > 0);
            let allFlatLess = Math.max(0, Number(takenFlatReduce.all || 0));
            while (allFlatLess > 0 && damageBreakdown.length > 0) {
                let targetIndex = damageBreakdown.reduce((largest, row, index) =>
                    (row.amount || 0) > (damageBreakdown[largest].amount || 0) ? index : largest, 0);
                let spend = Math.min(allFlatLess, Math.max(0, Math.floor(damageBreakdown[targetIndex].amount || 0)));
                if (spend <= 0) break;
                damageBreakdown[targetIndex].amount = Math.max(0, Math.floor((damageBreakdown[targetIndex].amount || 0) - spend));
                allFlatLess -= spend;
                damageBreakdown = damageBreakdown.filter(row => row && row.amount > 0);
            }
            if (pStats.passiveAshura && typeof applyPassiveAshuraDamageBreakdown === 'function') {
                damageBreakdown = applyPassiveAshuraDamageBreakdown(damageBreakdown, game.playerAilments, pStats.cycle);
            }
            if (damageBreakdown.length === 0) damageBreakdown.push({ ele: attackElement, amount: 1 });
            let sumBreakdown = () => damageBreakdown.reduce((sum, row) => sum + Math.max(0, Math.floor(row.amount || 0)), 0);
            let scaleBreakdown = (mul) => {
                damageBreakdown = damageBreakdown.map(row => ({ ele: row.ele, amount: Math.max(0, Math.floor((row.amount || 0) * mul)) })).filter(row => row.amount > 0);
                if (damageBreakdown.length === 0) damageBreakdown.push({ ele: attackElement, amount: 1 });
            };
            let scaleBreakdownToTotal = (targetTotal) => {
                targetTotal = Math.max(1, Math.floor(targetTotal || 1));
                let sourceTotal = Math.max(1, sumBreakdown());
                let remainingTotal = targetTotal;
                damageBreakdown = damageBreakdown.map((row, idx) => {
                    let amount = idx === damageBreakdown.length - 1
                        ? remainingTotal
                        : Math.max(0, Math.floor(((row.amount || 0) / sourceTotal) * targetTotal));
                    remainingTotal = Math.max(0, remainingTotal - amount);
                    return { ele: row.ele, amount };
                }).filter(row => row.amount > 0);
                if (damageBreakdown.length === 0) damageBreakdown.push({ ele: attackElement, amount: targetTotal });
                return Math.max(1, sumBreakdown());
            };
            dmg = Math.max(1, sumBreakdown());
            let directHitDistanceMul = getGridDirectHitDistanceMultiplier(enemy, game.gridPlayer);
            scaleBreakdown(directHitDistanceMul);
            dmg = Math.max(1, sumBreakdown());
            let playerShockTakenIncreasePct = Number(pStats.playerShockTakenDamageIncreasePct || 0);
            if (playerShockTakenIncreasePct !== 0) {
                let playerShockTakenMul = Math.max(0.1, 1 + playerShockTakenIncreasePct / 100);
                dmg = scaleBreakdownToTotal(Math.max(1, Math.floor(dmg * playerShockTakenMul)));
            }
            let ailmentSourceDamageBeforeCrit = dmg;
            let enemyCritDotBonusPct = 0;
            let enemyCritChance = Math.max(0, (enemy.critChance || 0) - Math.max(0, Math.min(80, pStats.critResist || 0)));
            if (enemyCritChance > 0 && Math.random() < (enemyCritChance / 100)) {
                scaleBreakdown(getEnemyCritTakenMul(enemy, pStats));
                dmg = Math.max(1, sumBreakdown());
                enemyCritDotBonusPct = 50;
            }
            if (enemy.hybridElement && Math.random() < 0.35) {
                let hybridRes = getPlayerResistanceAfterEnemyModifiers(pStats, enemy.hybridElement, enemy, 0.7);
                let hybrid = Math.max(0, Math.floor(dmg * 0.32 * (1 - (hybridRes / 100))));
                if (hybrid > 0) damageBreakdown.push({ ele: normalizeDamageElementKey(enemy.hybridElement), amount: hybrid });
                dmg = Math.max(1, sumBreakdown());
            }
            dmg = scaleBreakdownToTotal(Math.max(1, Math.floor(dmg * getWoodsmanCurseDamageTakenMul() * Math.max(0, Number(pStats.warriorTakenDamageMultiplier) || 1) * Math.max(0, Number(pStats.genericTakenDamageMultiplier) || 1))));
            if (enemy.isBoss) dmg = Math.max(1, Math.floor(dmg * Math.max(0, Number(pStats.bossTakenDamageMultiplier) || 1)));
            if (pStats.uniqueGuardianArmor) {
                let less = enemy.isBoss
                    ? Math.max(0, Math.min(95, Number(pStats.uniqueGuardianArmor.bossTakenLessPct || 0)))
                    : Math.max(0, Math.min(95, Number(pStats.uniqueGuardianArmor.takenLessPct || 0)));
                dmg = Math.max(1, Math.floor(dmg * (1 - less / 100)));
            }
            if (pStats.uniquePhysDrHalfTakenAsMore && attackElement === 'phys') {
                let ratio = Math.max(0, Number(pStats.uniquePhysDrHalfTakenAsMore.ratio || 0.5));
                let takenMore = Math.max(0, (Math.max(0, Number(pStats.dr) || 0) / 100) * ratio);
                dmg = Math.max(1, Math.floor(dmg * (1 + takenMore)));
            }
            if (hasKeystone('g5') && game.gladiatorSwiftGuardReady) {
                dmg = Math.max(1, Math.floor(dmg * Math.max(0, Number(pStats.swiftOpeningTakenMultiplier) || 0.70)));
                game.gladiatorSwiftGuardReady = false;
            }
            let aliveEnemies = (game.enemies || []).filter(e => e && e.hp > 0).length;
            dmg = applySituationalTakenReduction(dmg, pStats, enemy, aliveEnemies);
            let evadeChance = Math.max(0, pStats.evadeChance || 0);
            if (hasKeystone('ct4') && game.catalystEvadeBoostReady) {
                evadeChance *= 1.3;
                game.catalystEvadeBoostReady = false;
            }
            if (hasKeystone('h3')) evadeChance = 100 - Math.pow(1 - evadeChance / 100, 2) * 100;
            if (!(typeof isTalentMonsterAlwaysHit === 'function' && isTalentMonsterAlwaysHit())
                && resolveEntropyEvasion(game, evadeChance, getCombatTime())) {
                addBattleFx('statusText', { text: _t('회피!'), color: '#c4e2ff', duration: 260, bodyCue: true });
                addEvasionCombatLog(null, true);
                recordPlayerEvadeUniqueEffects(pStats, aliveEnemies, getCombatTime());
                if (pStats.passiveKeystoneFlags && pStats.passiveKeystoneFlags.fullEvasion) {
                    game.passiveFullEvasionCritReady = true;
                }
                if (hasKeystone('ct4')) game.catalystEvadeBoostReady = true;
                continue;
            }
            repelMeleeAttacker(enemy, pStats);
            let blockRollCap = Math.max(0, Math.min(75, Number(pStats.blockChanceMax || 50)));
            let blockRollChance = Math.max(0, Math.min(blockRollCap, pStats.blockChance || pStats.guardianBlockChance || 0));
            // 실전 특화: 막기 판정에 행운 적용(2회 굴려 유리한 값 사용)
            let gladiatorBattleLuck = hasKeystone('g9');
            let blockRoll = Math.random() * 100;
            if (gladiatorBattleLuck) blockRoll = Math.min(blockRoll, Math.random() * 100);
            let wasBlocked = blockRoll < blockRollChance;
            if (wasBlocked) {
                recoverEnergyShieldOnBlock(pStats);
                regionAffixEffects.onBlock(pStats, getCombatTime());
                grantTalentStoneShieldOnBlock(pStats);
                let blockedTakenPct = Math.max(0, Math.min(100, Number(pStats.uniqueBlockedDamageTakenPct) || 0));
                // 다 막으면 '막아냄!'(피해 없음), 일부만 막으면 받는 몫을 적는다.
                let blockText = blockedTakenPct <= 0 ? _t('막아냄!') : _t('막아냄, 피해 {blockedTakenPct}%', { blockedTakenPct });
                addBattleFx('statusText', { text: blockText, color: '#ebdfc2', duration: 260, bodyCue: true });
                if (game.settings.showCombatLog) addLog(`🛡️ ${blockText}`, "loot-magic", { noToast: true, aggregateKey: `combat:block:${blockText}`, aggregateWindowMs: 450 });
                if (blockedTakenPct <= 0) continue;
                dmg = scaleBreakdownToTotal(Math.max(1, Math.floor(dmg * blockedTakenPct / 100)));
                ailmentSourceDamageBeforeCrit = Math.max(1, Math.floor(ailmentSourceDamageBeforeCrit * blockedTakenPct / 100));
            }
            let guardianNullifyChance = Math.max(0, Math.min(100, Number(pStats.guardianDamageNullifyChance) || 0));
            if (guardianNullifyChance > 0 && Math.random() * 100 < guardianNullifyChance) {
                addBattleFx('statusText', { text: _t('무효!'), color: '#bdf7ff', duration: 300 });
                if (game.settings.showCombatLog) addLog(_t('🛡️ 절대 수호: 피해 무효!'), 'loot-magic', { noToast: true, aggregateKey: 'combat:block:nullify', aggregateWindowMs: 450 });
                continue;
            }
            let deflected = false;
            let deflectReducePct = 0;
            let deflectRoll = wasBlocked ? 100 : Math.random() * 100;
            if (!wasBlocked && gladiatorBattleLuck) deflectRoll = Math.min(deflectRoll, Math.random() * 100);
            if (!wasBlocked && deflectRoll < Math.max(0, Math.min(75, pStats.deflectChance || 0))) {
                let deflectReduce = Math.max(0, Math.min(85, 40 + Number(pStats.deflectDamageReduce || 0)));
                dmg = scaleBreakdownToTotal(Math.max(1, Math.floor(dmg * (1 - deflectReduce / 100))));
                if (pStats.uniqueDeflectStealth) {
                    let cfg = pStats.uniqueDeflectStealth || {};
                    game.shadowStealthExpiresAt = getCombatTime() + Math.max(1, Number(cfg.duration || 3)) * 1000;
                }
                deflected = true;
                deflectReducePct = Math.floor(deflectReduce);
            }
            if ((pStats.cosmosMasteryTakenLessPct || 0) > 0) {
                let masteryReduction = Math.max(0, Math.min(50, Number(pStats.cosmosMasteryTakenLessPct) || 0));
                dmg = scaleBreakdownToTotal(Math.max(0, Math.floor(dmg * (1 - masteryReduction / 100))));
            }
            let flooredDamage = floorIncomingDamage(dmg);
            if (flooredDamage !== dmg) {
                dmg = scaleBreakdownToTotal(Math.max(1, flooredDamage));
                ailmentSourceDamageBeforeCrit = Math.max(1, floorIncomingDamage(ailmentSourceDamageBeforeCrit));
            }
            let ailRoll = Math.random();
            if (hasKeystone('h3')) ailRoll = Math.max(ailRoll, Math.random());
            let enemyAilmentChance = Math.max(0, Number(enemy.ailmentChance) || 0);
            if (pStats.passiveAshura && typeof getPassiveAshuraAilmentChance === 'function') {
                enemyAilmentChance = getPassiveAshuraAilmentChance(enemyAilmentChance, pStats.cycle);
            }
            if (enemyAilmentChance > 0 && ailRoll < enemyAilmentChance) {
                let ail = attackElement === 'fire' ? 'ignite' : attackElement === 'cold' ? 'chill'
                    : attackElement === 'light' ? 'shock' : attackElement === 'phys' ? 'bleed' : 'poison';
                let hitRatio = Math.max(0.001, Math.min(0.35, dmg / Math.max(1, pStats.maxHp || 1)));
                let damageAilment = isDamageAilmentType(ail);
                let ailPower = damageAilment
                    ? 0.90
                    : Math.max(0.1, Math.min(1.5, (Math.sqrt(Math.max(1, dmg)) * 0.01) + (hitRatio * 1.8)));
                applyPlayerAilment(ail, enemy.isBoss ? 5 : 3, ailPower, pStats, dmg, {
                    ailmentSourceDamage: ailmentSourceDamageBeforeCrit,
                    critDotBonusPct: enemyCritDotBonusPct,
                    sourceEnemyId: enemy.id,
                    sourceEnemyName: enemy.name
                });
                let ailmentLabel = _t(ail === 'ignite' ? '점화' : ail === 'chill' ? '냉각'
                    : ail === 'shock' ? '감전' : ail === 'bleed' ? '출혈' : '중독');
                if (game.settings.showCombatLog) addLog(_t('☣️ 상태이상: {ailment} ({seconds}초)', { ailment: ailmentLabel, seconds: enemy.isBoss ? 5 : 3 }), 'attack-monster', { element:attackElement });
            }

            grantWarriorRageOnHit(getCombatTime());
            if (typeof getPreciseTalentRatio === 'function' && getPreciseTalentLevel('hero5__guardian')) {
                let missingLife = Math.max(0, getPlayerRecoveryHpCap(pStats) - Math.max(0, game.playerHp || 0));
                let preHitRecovery = missingLife * 0.04 * getPreciseTalentRatio('hero5__guardian');
                if (preHitRecovery > 0) {
                    game.playerHp = Math.min(getPlayerRecoveryHpCap(pStats), game.playerHp + preHitRecovery);
                }
            }
            let remaining = dmg;
            let guardRedirectPct = getSummonRedirectPct(pStats);
            let soulbinderShare = hasKeystone('sb2');
            let closestSummon = soulbinderShare ? getClosestLivingSummonToPlayer() : null;
            let aliveGuards = soulbinderShare
                ? (closestSummon ? [closestSummon] : [])
                : (game.summons || []).filter(s => s && !s.isGhost && s.alive && s.hp > 0 && s.role === 'guard');
            if (guardRedirectPct > 0 && aliveGuards.length > 0) {
                let redirect = Math.min(remaining, Math.floor(remaining * (guardRedirectPct / 100)));
                if (redirect > 0) {
                    let each = Math.max(1, Math.floor(redirect / aliveGuards.length));
                    let redirectedTotal = 0;
                    aliveGuards.forEach((guard, idx) => {
                        if (!guard.alive || guard.hp <= 0) return;
                        let share = idx === (aliveGuards.length - 1) ? Math.max(0, redirect - redirectedTotal) : each;
                        let local = soulbinderShare ? 100 : Math.max(0, Math.min(100, Number(guard.redirectPct || 0)));
                        if (local > 0) share = Math.floor(share * (local / 100));
                        // 직접 맞을 때와 같은 회피(명중 기반, 고르게 피하는 굴림). 2026-10-18 사용자 결정, 전에는 회피/(회피+300) 따로 굴렸다.
                        if (resolveEntropyEvasion(guard, getSummonEvadeChance(guard, enemy), getCombatTime())) share = 0;
                        let guardRes = 0;
                        if (attackElement === 'fire') guardRes = guard.resFire || 0;
                        else if (attackElement === 'cold') guardRes = guard.resCold || 0;
                        else if (attackElement === 'light') guardRes = guard.resLight || 0;
                        else if (attackElement === 'chaos') guardRes = guard.resChaos || 0;
                        let reduced = Math.max(0, Math.floor(share * (1 - (Math.max(-60, guardRes) / 100))));
                        let armorRed = Math.min(85, (guard.armor || 0) / ((guard.armor || 0) + Math.max(1, reduced) * 8) * 100);
                        reduced = Math.max(0, Math.floor(reduced * (1 - armorRed / 100)));
                        reduced = Math.max(0, Math.min(reduced, guard.hp));
                        if (reduced <= 0) return;
                        guard.hp = Math.max(0, guard.hp - reduced);
                        redirectedTotal += reduced;
                        if (guard.hp <= 0) {
                            guard.alive = false;
                            guard.respawnAt = getSummonRespawnAt(guard, soulbinderShare);
                            if (pStats.uniqueSummonDeathDamageBuff) {
                                let cfg = pStats.uniqueSummonDeathDamageBuff || {};
                                game.summonDeathDamageBuffPct = Math.max(Number(game.summonDeathDamageBuffPct || 0), Math.max(0, Number(cfg.pct || 40)));
                                game.summonDeathDamageBuffExpiresAt = getCombatTime() + Math.max(1, Number(cfg.duration || 4)) * 1000;
                            }
                        }
                    });
                    remaining = Math.max(0, remaining - redirectedTotal);
                }
            }
            game.playerEnergyShield = Math.max(0, Math.floor(Number(game.playerEnergyShield) || 0));
            let playerResourceBeforeHit = Math.max(0, Number(game.playerHp) || 0) + game.playerEnergyShield;
            let beforeEsForCr8 = game.playerEnergyShield;
            if (remaining > 0 && game.playerEnergyShield > 0) {
                let bypass = Math.floor(remaining * Math.max(0, Math.min(100, pStats.cosmosEnergyShieldBypassPct || 0)) / 100);
                let shieldPart = Math.max(0, remaining - bypass);
                let absorbed = Math.min(game.playerEnergyShield, shieldPart);
                game.playerEnergyShield -= absorbed;
                remaining = bypass + Math.max(0, shieldPart - absorbed);
            }
            triggerUniqueEnergyShieldBreakRecharge(pStats, beforeEsForCr8, getCombatTime());
            if (remaining > 0) remaining = absorbDamageWithTalentStoneShield(remaining);
            if (remaining > 0) remaining = absorbDamageWithRealmDeathWard(remaining, pStats);
            if (remaining > 0 && game.playerUniqueGuard && getCombatTime() < (game.playerUniqueGuard.expiresAt || 0) && (game.playerUniqueGuard.amount || 0) > 0) {
                let absorbed = Math.min(remaining, Math.floor(game.playerUniqueGuard.amount || 0));
                game.playerUniqueGuard.amount = Math.max(0, Math.floor((game.playerUniqueGuard.amount || 0) - absorbed));
                remaining -= absorbed;
            }
            if (remaining > 0 && (pStats.guardianHitCapPct || 0) > 0) {
                const hitCap = Math.max(1, Math.floor((pStats.maxHp || 1) * pStats.guardianHitCapPct / 100));
                if (remaining > hitCap) {
                    remaining = hitCap;
                    addBattleFx('statusText', { text: _t('성채화!'), color: '#d8c08b', duration: 300, bodyCue: true });
                }
            }
            let nextPlayerHp = Math.floor(game.playerHp - remaining);
            if (nextPlayerHp <= 0 && (pStats.cosmosDeathResistPct || 0) > 0 && Math.random() * 100 < Math.max(0, pStats.cosmosDeathResistPct || 0)) {
                remaining = 0;
                nextPlayerHp = Math.max(1, Math.floor(game.playerHp || 1));
                addBattleFx('statusText', { text: _t('죽음 저항!'), color: '#d7b8ff', duration: 420 });
            }
            game.playerHp = nextPlayerHp;
            if (typeof recordPassiveKarmaLoss === 'function') {
                let playerResourceAfterHit = Math.max(0, Number(game.playerHp) || 0)
                    + Math.max(0, Number(game.playerEnergyShield) || 0);
                recordPassiveKarmaLoss(enemy, Math.max(0, playerResourceBeforeHit - playerResourceAfterHit));
            }
            trackHiddenJournalPlayerDamage(remaining);
            if (remaining > 0 && pStats.uniqueLifeRecoupTakenDamage) {
                let cfg = pStats.uniqueLifeRecoupTakenDamage || {};
                addPlayerRecoupInstance(remaining * Math.max(0, Number(cfg.pct || 25)) / 100, Math.max(1, Number(cfg.duration || 4)));
            }
            if (remaining > 0 && pStats.uniqueInvulnerableBarrierOnHit && Math.random() * 100 < Math.max(0, Number(pStats.uniqueInvulnerableBarrierOnHit.chance) || 0)) {
                let durationMs = Math.max(250, Math.floor(Math.max(0.1, Number(pStats.uniqueInvulnerableBarrierOnHit.duration) || 1.5) * 1000));
                game.realmInvulnerableBarrierUntil = getCombatTime() + durationMs;
                addBattleFx('statusText', { text: _t('무적 장막!'), color: '#c49bff', duration: 360 });
            }
            if (hasKeystone('cr8') && beforeEsForCr8 > 0 && game.playerEnergyShield <= 0 && (game.crusaderEsRegenCooldownUntil || 0) <= getCombatTime()) {
                game.crusaderEsRegenUntil = getCombatTime() + 4000;
                game.crusaderLightningAegisUntil = getCombatTime() + 4000;
                game.crusaderEsRegenCooldownUntil = getCombatTime() + 4000;
            }
            if (remaining > 0 && hasKeystone('gd6')) applyGuardianEnduranceReflect(enemy, remaining, pStats);
            if ((enemy.leechPct || 0) > 0 && remaining > 0 && enemy.hp > 0) {
                let leeched = Math.max(1, Math.floor(remaining * (enemy.leechPct || 0) / 100));
                if ((enemy.energyShield || 0) < (enemy.maxEnergyShield || 0)) enemy.energyShield = Math.min(enemy.maxEnergyShield || 0, (enemy.energyShield || 0) + leeched);
                else enemy.hp = Math.min(enemy.maxHp || enemy.hp || 1, (enemy.hp || 0) + leeched);
            }
            if ((enemy.doubleStrikeChance || 0) > 0 && Math.random() * 100 < enemy.doubleStrikeChance) enemy.attackTimer += 1;
            if ((pStats.delayedRegenFromTakenDamage || 0) > 0 && remaining > 0) {
                let recover = Math.max(0, remaining * pStats.delayedRegenFromTakenDamage);
                game.delayedGuardHealPool = Math.max(0, (game.delayedGuardHealPool || 0) + recover);
            }
            game.playerEsLastHitAt = getCombatTime();
            game.playerLastHitAt = getCombatTime();
            if (hasKeystone('a2')) game.assassinBlurred = false;
            let topDamageEntry = damageBreakdown
                .filter(row => row && row.amount > 0)
                .sort((a, b) => (b.amount || 0) - (a.amount || 0))[0] || { ele: attackElement, amount: dmg };
            const damageSource = enemyAttackRules.damageName(enemy, bossPattern);
            damageBreakdown.forEach(row => recordIncomingDamage(row.ele, row.amount, damageSource, {
                sourceType: 'monster', sourceId: enemy.id, sourceName: enemy.name
            }));
            addBattleFx('playerHit', { enemyId: enemy.id, color: getElementColor(topDamageEntry.ele), damage: dmg, duration: 220, deflected: deflected,
                targetMaxHp: getPlayerHpCap(pStats) });
            if (game.settings.showCombatLog && dmg > 0) {
                let damageLog = _t('{icon} {source}의 공격으로 {amount} 피해', { icon: getDamageElementIcon(topDamageEntry.ele), source: damageSource, amount: formatNumberKR(dmg) });
                if (game.settings.showDetailedDamageLog === true) {
                    let breakdownText = damageBreakdown
                        .filter(row => row.amount > 0)
                        .sort((a, b) => b.amount - a.amount)
                        .map(row => `${getDamageElementLabel(row.ele)} ${formatNumberKR(row.amount)}`)
                        .join(' / ');
                    let deflectText = deflected ? _t(', 🪶비껴냄 -{deflectReducePct}%', { deflectReducePct }) : '';
                    damageLog = _t('🩸 [{ele}] {damageSource}에게 피격 ({dmg} 피해, {breakdownText}{deflectText})', { ele: getDamageElementLabel(topDamageEntry.ele), damageSource, dmg: formatNumberKR(dmg), breakdownText, deflectText });
                }
                addLog(damageLog, "attack-monster", { element:topDamageEntry.ele });
            }
            if (game.playerHp <= 0) {
                handlePlayerDefeat(zone, pStats, null, { fatalElement: topDamageEntry.ele, sourceName: damageSource });
                return;
            }
        }
    }
}

function calculateTrialTrapDamage(zone, pStats, trapElement) {
    let resistanceKey = { fire: 'resF', cold: 'resC', light: 'resL', chaos: 'resChaos' }[trapElement];
    let baseDamage = (pStats.maxHp * (0.035 + zone.tier * 0.005)) + 10 + zone.tier * 3;
    let damageMultiplier = Math.max(0.1, Number(zone.trapDamageMul) || 1);
    let scaledDamage = Math.floor(baseDamage * damageMultiplier);
    let physicalMitigation = (Number(pStats.dr) || 0) + getArmorPhysicalReductionPct(pStats.armor, scaledDamage);
    let mitigation = trapElement === 'phys' ? physicalMitigation : (Number(pStats[resistanceKey]) || 0);
    return Math.max(10, Math.floor(scaledDamage * (1 - Math.max(-60, Math.min(85, mitigation)) / 100)));
}

function getBloomTrialRegenSuppressNext(zone, currentSuppress) {
    let gain = Math.max(0, Number(zone && zone.trapRegenSuppressPct) || 0) / 100;
    let requestedCap = Number(zone && zone.trapRegenSuppressCap);
    let cap = Number.isFinite(requestedCap) ? Math.max(0, Math.min(0.95, requestedCap)) : 0.95;
    return Math.min(cap, Math.max(0, Number(currentSuppress) || 0) + gain);
}

/** 함정이 덮는 칸: 주인공 칸을 가운데 두고 reach칸씩 넓힌다(2026-11-02 사용자: 범위가 작아 피하기 쉽다). line은 맵을 가로지르는 띠(차례마다 가로와 세로),
 * cross는 그 띠 둘, pool은 마름모, block은 네모. */
function buildTrialHazardCells(zone, origin, sequence) {
    const { columns, rows } = getCombatGridSize(), { pattern, reach } = getTrialHazardProfile(zone);
    const cells = [], seen = new Set();
    const push = (gx, gy) => {
        const key = gridCellKey(gx, gy);
        if (!isGridCellInBounds(gx, gy) || seen.has(key)) return;
        seen.add(key);
        cells.push({ gx, gy });
    };
    const band = horizontal => {
        for (let offset = -reach; offset <= reach; offset++) {
            for (let index = 0; index < (horizontal ? columns : rows); index++) {
                if (horizontal) push(index, origin.gy + offset);
                else push(origin.gx + offset, index);
            }
        }
    };
    if (pattern === 'line') band(sequence % 2 === 0);
    else if (pattern === 'cross') { band(true); band(false); }
    else {
        for (let dx = -reach; dx <= reach; dx++) {
            for (let dy = -reach; dy <= reach; dy++) {
                if (pattern !== 'pool' || Math.abs(dx) + Math.abs(dy) <= reach) push(origin.gx + dx, origin.gy + dy);
            }
        }
    }
    return cells;
}

function createTrialHazard(zone, now) {
    let index = Math.max(0, Math.floor(game.trialHazardIndex || 0));
    let elements = Array.isArray(zone.trapElements) && zone.trapElements.length > 0 ? zone.trapElements : ['phys'];
    let element = elements[index % elements.length];
    let profile = getTrialHazardProfile(zone);
    const terrain = getGridPlacementTerrain();
    let cells = buildTrialHazardCells(zone, game.gridPlayer, index)
        .filter(cell => canPlaceGridFootprint(new Set(), cell.gx, cell.gy, { columns: 1, rows: 1 }, terrain));
    game.trialHazardIndex = index + 1;
    let color = { phys: '#ffd36b', fire: '#ff754f', cold: '#86dcff', light: '#e5d35b', chaos: '#c47cff' }[element] || '#ffd36b';
    addBattleFx('trialTrapWarning', { targetCells: cells, color, element, duration: profile.warningMs });
    const persistent = profile.persistent && !!COMBAT_GRID_CONFIG.ground[element];
    // 시련 함정은 주인공이 알아서 피하지 않는다(2026-11-02 사용자): 피하려면 직접 걷는다. 오래 남는 지대는 전처럼 비켜 간다.
    return { cells, element, color, impactAt: now + profile.warningMs, intervalMs: profile.intervalMs, shouldAvoid: persistent, persistent };
}

function isPlayerInsideCombatHazard(hazard) {
    if (!hazard || !hasGridCell(game.gridPlayer)) return false;
    let playerKey = gridCellKey(game.gridPlayer.gx, game.gridPlayer.gy);
    return hazard.cells.some(cell => gridCellKey(cell.gx, cell.gy) === playerKey);
}

function isTrialHazardPositionHeld() {
    let hazard = trialHazardRuntime.active;
    return !!(hazard && hazard.shouldAvoid && getCombatTime() < hazard.impactAt && !isPlayerInsideCombatHazard(hazard));
}

/** Advance one shared escape timer for all warning cells; never move twice in a combat tick. */
function updateCombatHazardEscape(hazard, pStats, now, reason = '함정 회피') {
    if (!hazard.shouldAvoid || !isPlayerInsideCombatHazard(hazard)) return false;
    if (hasPlayerChannelBreakingAilment()) return true;
    // 공격 후딜이 끝나야 피한다(2026-10-17 사용자 "자동 회피는 경직을 무시하면 안되는거 아니야?"). 그동안 공격도 쉰다.
    if (isPlayerAttackRecovering(now)) return true;
    let moveSpeed = Number.isFinite(pStats.moveSpeed) && pStats.moveSpeed > 0 ? pStats.moveSpeed : 100;
    let interval = COMBAT_GRID_CONFIG.playerMoveIntervalSec * (100 / moveSpeed);
    let result = advanceGridHazardEscape(game.gridPlayer, hazard.cells, 0.1, interval);
    if (result.blocked || !result.moved) return true;
    cancelCombatChannel(reason);
    let attackDelayMs = getTacticalMoveAttackDelayMs(moveSpeed);
    combatTacticsRuntime.attackDelayUntil = Math.max(combatTacticsRuntime.attackDelayUntil, now + attackDelayMs);
    addBattleFx('playerMobility', { fromCell: result.from, toCell: result.to, duration: 240 });
    return true;
}

/** Existing automatic escape is limited to trial traps and final-boss combos; ordinary warnings only gate the approach. */
const isApexFight = () => game.enemies.some(enemy => enemy.hp > 0 && enemy.patternMode === 'apex');
/** Ordinary warnings forbid entry, not all walking. Do not escape an occupied warning or retreat to find a way around it. */
function bossWarningApproach(warned) {
    if (!warned.length || !hasGridCell(game.gridPlayer)) return { hold: false, block: [] };
    const keys = new Set(warned.map(cell => gridCellKey(cell.gx, cell.gy)));
    return { hold: isGridUnitInCellSet(game.gridPlayer, keys), block: warned };
}
function hardHazardCells() {
    let cells = [];
    if (trialHazardRuntime.active && trialHazardRuntime.active.shouldAvoid) cells.push(...trialHazardRuntime.active.cells);
    // 최종 보스의 연계는 이동 룬이 없어도 걸어서 대응한다. 기존 공격 후딜과 실제 이동 속도는 지킨다.
    if (isApexFight()) cells.push(...getBossWarningCells(game, pendingEnemyCombatAttacks));
    return cells;
}
/** Lasting ground (lava, frost, corrosion, shock): a soft danger. The hero walks around it when it can and fights in it when it must
 * (2026-10-18: as a hard danger a melee hero kept 0-16% of its damage against the final bosses). */
const groundHazardCells = () => (trialHazardRuntime.ground || []).flatMap(ground => ground.cells);
function updateCombatHazardEvasion(pStats) {
    if (game.playerHp <= 0) return { avoiding: false, holdPosition: false };
    applyTrialTrapTick(pStats, true);
    if (game.playerHp <= 0) return { avoiding: false, holdPosition: false };
    const cells = hardHazardCells(), warned = getBossWarningCells(game, pendingEnemyCombatAttacks);
    const approach = isApexFight() ? { hold: warned.length > 0, block: [] } : bossWarningApproach(warned);
    let holdPosition = approach.hold || isTrialHazardPositionHeld();
    let avoiding = updateCombatHazardEscape({ cells, shouldAvoid: true }, pStats, getCombatTime(), '위험 범위 회피');
    let frozen = game.playerAilments.some(ail => ail.type === 'freeze' && ail.time > 0);
    return { avoiding: avoiding || frozen, holdPosition, warning: warned.length > 0, avoidCells: { hard: cells.concat(approach.block), soft: groundHazardCells(), warned: approach.block } };
}

/** The trap's name in the log and the defeat line: a trial's '시련 함정', or the zone's own (the atlas late arenas' '바닥 함정'). */
const trialTrapName = zone => zone.trapName || '시련 함정';

function dealTrialTrapDamage(zone, pStats, hazard, trapDamage) {
    let remaining = floorIncomingDamage(trapDamage), trapName = trialTrapName(zone);
    game.playerEnergyShield = Math.max(0, Math.floor(Number(game.playerEnergyShield) || 0));
    let energyShieldBeforeTrap = game.playerEnergyShield;
    if (remaining > 0 && game.playerEnergyShield > 0) {
        let absorbed = Math.min(game.playerEnergyShield, remaining);
        game.playerEnergyShield -= absorbed;
        remaining -= absorbed;
    }
    triggerUniqueEnergyShieldBreakRecharge(pStats, energyShieldBeforeTrap, getCombatTime());
    if (remaining > 0) remaining = absorbDamageWithTalentStoneShield(remaining);
    if (remaining > 0) remaining = absorbDamageWithRealmDeathWard(remaining, pStats);
    game.playerHp = hpAfterTrap(remaining);
    game.playerEsLastHitAt = getCombatTime();
    recordIncomingDamage(hazard.element, trapDamage, trapName);
    if (zone.bloomTrial && (zone.trapRegenSuppressPct || 0) > 0) {
        game.bloomTrialRegenSuppress = getBloomTrialRegenSuppressNext(zone, game.bloomTrialRegenSuppress);
        addLog(_t('혹독한 한기: 생명력 재생 억제 {round}%', { round: Math.round((game.bloomTrialRegenSuppress || 0) * 100) }), 'attack-monster', { noToast: true });
    }
    logTrialDamage(trapName, hazard, trapDamage);
    if (game.playerHp <= 0) {
        handlePlayerDefeat(zone, pStats, _t('{trapName}에 쓰러졌습니다. 마을로 귀환합니다.', { trapName }), { fatalElement: hazard.element, sourceName: trapName, noToast: true });
    }
}
/** 적이 다 쓰러진 뒤에 터진 함정은 아프기만 하다: 이긴 싸움을 남은 함정 하나로 잃지 않는다. */
function hpAfterTrap(damage) {
    const hp = Math.floor(game.playerHp - damage);
    return hp <= 0 && !isAnyEnemyAlive() ? 1 : hp;
}
function logTrialDamage(name, hazard, damage) {
    if (!hazard.persistent) {
        dispatchRuntimeEvent('ground-damage', { name, element: hazard.element, damage, persistent: false });
        return;
    }
    hazard.logDamage = (hazard.logDamage || 0) + damage;
    if (getCombatTime() < (hazard.nextLogAt || 0)) return;
    dispatchRuntimeEvent('ground-damage', { name, element: hazard.element, damage: hazard.logDamage, persistent: true });
    hazard.logDamage = 0; hazard.nextLogAt = getCombatTime() + 2000;
}

function resolveTrialHazardImpact(zone, pStats, hazard, now) {
    if (hazard.persistent) {
        const rules = COMBAT_GRID_CONFIG.ground;
        const ground = [...(trialHazardRuntime.ground || []), { ...hazard, start: now, endsAt: now + rules.durationMs }];
        trialHazardRuntime = { nextAt: now + hazard.intervalMs, active: null, ground: ground.slice(-rules.maxAreas), nextGroundTick: now };
        return;
    }
    let playerHit = isPlayerInsideCombatHazard(hazard);
    let barrierActive = playerHit && now < Math.max(0, Number(game.realmInvulnerableBarrierUntil) || 0);
    addBattleFx('trialTrap', {
        targetCells: hazard.cells,
        color: barrierActive ? '#c49bff' : hazard.color,
        element: hazard.element,
        duration: 760 // eight frames of the trap's art (js/canvas-trial-traps.js): rise, hold, fall back
    });
    if (!playerHit) {
        addBattleFx('statusText', { text: _t('함정 회피'), color: '#b8f5c4', duration: 360 });
    } else if (barrierActive) {
        addBattleFx('statusText', { text: _t('균열 장막'), color: '#c49bff', duration: 260 });
    } else {
        dealTrialTrapDamage(zone, pStats, hazard, calculateTrialTrapDamage(zone, pStats, hazard.element));
    }
    trialHazardRuntime = { ...trialHazardRuntime, nextAt: now + hazard.intervalMs, active: null };
}

/** Ground is a DoT, not a hit/ignite/poison: resistance, DoT protection and the armour-to-DoT unique apply; block/leech do not. */
function tickPersistentGround(zone, pStats, now) {
    const runtime = trialHazardRuntime, rules = COMBAT_GRID_CONFIG.ground;
    runtime.ground = (runtime.ground || []).filter(area => now < area.endsAt);
    if (now < (runtime.nextGroundTick || 0) || !runtime.ground.length) return;
    runtime.nextGroundTick = now + rules.tickMs;
    const elements = new Set();
    for (const area of runtime.ground) {
        if (elements.has(area.element) || !isPlayerInsideCombatHazard(area)) continue;
        elements.add(area.element);
        applyGroundContact(zone, pStats, area, now);
        if (game.playerHp <= 0) return;
    }
}
function applyGroundContact(zone, stats, area, now) {
    const rule = COMBAT_GRID_CONFIG.ground[area.element];
    if (rule.ailment) applyPlayerAilment(rule.ailment, 0.75, 0.5, stats);
    if (!rule.damageShare || now < (game.realmInvulnerableBarrierUntil || 0)) return;
    let damage = calculateTrialTrapDamage(zone, stats, area.element) * rule.damageShare;
    damage *= 1 - clampNumber(stats.dotTakenDamageReducePct || 0, 0, 90) / 100;
    if (stats.uniqueArmorAppliesToDot) damage *= 1 - Math.min(0.8, stats.armor / (stats.armor + 1200));
    if (game.playerAilments.some(ail => ail.type === 'shock' && ail.time > 0)) damage *= 1 + getPlayerShockTakenDamageIncreasePct(stats) / 100;
    dealTrialTrapDamage({ ...zone, trapName: rule.name }, stats, area, Math.max(0, Math.floor(damage)));
}

function hasGroundHazard(zone) {
    return !!zone && (zone.type === 'trial' || !!zone.trialHazard);
}
const isAnyEnemyAlive = () => (game.enemies || []).some(enemy => enemy && enemy.hp > 0);
/** 적이 다 쓰러진 뒤: 새 함정은 없고 남은 지대는 걷히지만, 경고를 시작한 함정은 마저 터진다(2026-11-02 사용자). */
function settleTrapAfterFight(zone, pStats, now) {
    const hazard = trialHazardRuntime.active;
    trialHazardRuntime.ground = [];
    trialHazardRuntime.nextAt = Math.max(trialHazardRuntime.nextAt, now + 500);
    if (hazard && hazard.persistent) trialHazardRuntime.active = null;
    else if (hazard && now >= hazard.impactAt) resolveTrialHazardImpact(zone, pStats, hazard, now);
}
function applyTrialTrapTick(pStats, deferEscape) {
    let zone = getZone(game.currentZoneId);
    if (!hasGroundHazard(zone) || game.moveTimer > 0) return false;
    let now = getCombatTime();
    if (!isAnyEnemyAlive()) {
        settleTrapAfterFight(zone, pStats, now);
        return false;
    }
    tickPersistentGround(zone, pStats, now);
    if (game.playerHp <= 0) return false;
    if (!trialHazardRuntime.nextAt) trialHazardRuntime.nextAt = now + getTrialHazardProfile(zone).initialDelayMs;
    if (!trialHazardRuntime.active && now >= trialHazardRuntime.nextAt) {
        trialHazardRuntime.active = createTrialHazard(zone, now);
    }
    let hazard = trialHazardRuntime.active;
    if (!hazard) return false;
    if (now >= hazard.impactAt) {
        resolveTrialHazardImpact(zone, pStats, hazard, now);
        return false;
    }
    return !deferEscape && updateCombatHazardEscape(hazard, pStats, now);
}


safeExposeGlobals({ handlePlayerDefeat, applyPlayerAilment, tickAilments, performMonsterAttacks, applyTrialTrapTick });
