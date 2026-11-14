// Current owner and explicit service ports are supplied per call; no game or restored queues are captured.
const DEFEAT_RECOVERY_SECONDS = 3;

/** 자동 재잠수로 들어간 잠수에서, 또는 가디언에게 쓰러지면 그 잠수를 끝낸다. 2026-10-19 검토: 넘지 못하는 가디언 앞에서 거듭
 * 쓰러지며 쓰러질 때마다 경험치를 잃고(한 번 잠수에 2~8번), 가디언은 생명력이 다 찬 채로 다시 나왔다. 손으로 시작한 잠수에서 무리에게
 * 쓰러지면 예전처럼 심해에서 다시 일어선다. 자동 잠수가 무리에게 쓰러지면 자동 재잠수도 멈추고, 가디언에게 쓰러지면 자동 재잠수가
 * 지난 가디언 자리부터 잇는다(recordOceanSurface). */
function stateGetOceanDiveDefeat(c, zone) { return (zone.id === c.deps.OCEAN_ZONE_ID && (c.deps.isAutoOceanDive(c.deps.ensureOceanState()) || c.owner.oceanBossRunPending) ? stateDefeatInOceanDive : null); }

/** Back where the run started, else the defeat recovery zone. */
function stateDefeatReturnZone(c, returnZoneId) { return (returnZoneId !== undefined && returnZoneId !== null ? returnZoneId : c.deps.getDefeatRecoveryZoneId()); }

const CONTENT_DEFEAT_BY_KIND = Object.freeze({ beyondBoundary: stateDefeatBeyondBoundary, meteor: stateDefeatAtMeteor, timeRift: stateDefeatInTimeRift, trial: stateDefeatInTrial,
    underworld: stateDefeatOnUnderworldFloor });

/** 패널티가 붙는 구역을 처음 열면 한 번 알린다. 액트 6과 혼돈에서 갑자기 자주 쓰러지는 까닭이 캐릭터 창의 저항 상세에만 있었다
 * (자연 플레이 측정 2026-10-17: 패시브를 찍지 않은 성직자는 혼돈 1에서 한 시간에 76번 쓰러졌다, 찍은 성직자는 0번). */
function stateNoteCampaignResistPenalty(c, zoneId) {
    if (!c.deps.CAMPAIGN_RESIST_PENALTY.zones.includes(zoneId)) return;
    const each = c.deps.CAMPAIGN_RESIST_PENALTY.each, total = c.deps.getCampaignResistPenalty(zoneId);
    const more = total > each ? c.deps._t(' 더 낮아졌습니다(모두 합쳐 -{total}%)', { total }) : ' 낮아졌습니다';
    c.deps.queueTutorialNotice(`notice_resist_penalty_${zoneId}`, c.deps._t('모든 저항 -{total}%', { total }),
        `캠페인 패널티로 모든 원소 저항과 카오스 저항이 ${each}%${more}.\n저항이 모자라면 받는 피해가 커집니다. 캐릭터 창의 저항에서 볼 수 있습니다.`, 'tab-character');
}

/** 물러난 뒤 탐험을 마치면: 덜 올랐으면 지금 액트를 한 번 더, 충분히 올랐으면 기록을 지우고 평소처럼 앞으로 간다. */
function stateHoldActRetreat(c, zone) {
    const retreat = c.owner.actRetreat;
    if (!retreat) return false;
    // 레벨이 충분히 올랐거나, 직접 다른 지역으로 옮겨 그곳을 마쳤으면 물러남을 끝낸다.
    if (c.owner.level >= retreat.level + c.deps.ACT_RETREAT_LEVELS || zone.id !== retreat.frontierZoneId - 1) {
        c.owner.actRetreat = null;
        return false;
    }
    c.owner.currentZoneId = zone.id;
    return true;
}

/** 스토리 액트의 방과 방 사이(살아 있는 적이 없을 때) 숨 고르기: 0.1초 틱마다 최대 생명의 ACT_REST_RECOVERY_PCT_PER_SEC/10 %. */
function stateApplyActRestRecovery(c, pStats, hpCap) {
    if (c.owner.playerHp <= 0 || c.owner.playerHp >= hpCap) return;
    if (c.deps.getZone(c.owner.currentZoneId)?.type !== 'act') return;
    if ((c.owner.enemies || []).some(enemy => enemy && enemy.hp > 0)) return;
    c.owner.playerHp = Math.min(hpCap, c.owner.playerHp + pStats.maxHp * c.deps.ACT_REST_RECOVERY_PCT_PER_SEC / 100 * 0.1);
}

function* stateHandlePlayerDefeat(c, zone, pStats, message, options) {
    c.deps.actExplorationProgress.defeat(c.owner);
    let opts = options || {};
    c.deps.recordPlayerDefeatStart(zone, opts);
    let expLost = 0;
    c.owner.loopDeaths = Math.max(0, Math.floor(c.owner.loopDeaths || 0)) + 1;
    if (typeof c.deps.recordImmortalHeroDeathPenalty === 'function') c.deps.recordImmortalHeroDeathPenalty();
    // The hive run's exit is read only for a hive defeat (the hive screen script owns it).
    const defeatUi = { say: c.deps.addLog, get exitBeehiveRun() { return typeof c.deps.exitBeehiveRun === 'function' ? c.deps.exitBeehiveRun : null; } };
    const contentDefeat = stateGetContentDefeat(c, zone);
    if (contentDefeat) expLost = contentDefeat(c, zone, message, opts, defeatUi) || 0;
    else expLost = stateApplyDeathExpPenalty(c, message, opts, defeatUi);
    c.owner.lastDeathLog = stateBuildPlayerDeathLog(c, zone, opts, expLost, pStats);
    if (c.owner.lastDeathLog.retreatZoneName) c.deps.addLog(c.deps._t('🛡️ {retreatZoneName} 물러나 레벨을 {ACT_RETREAT_LEVELS} 올린 뒤 다시 도전합니다.', { retreatZoneName: c.deps.withDirectionParticle(c.owner.lastDeathLog.retreatZoneName), ACT_RETREAT_LEVELS: c.deps.ACT_RETREAT_LEVELS }), 'season-up');
    if (c.owner.settings.showDeathNotice !== false) yield { kind: 'requestDeathReport', args: [c.owner.lastDeathLog] };
    c.owner.playerHp = c.deps.getPlayerHpCap(pStats);
    c.deps.atlasRun.defeat(zone);
    c.deps.startMoving(false);
    stateHoldAfterDefeat(c);
    c.deps.updateStaticUI();
    c.deps.queueImportantSave(160);
}

function stateHoldAfterDefeat(c) {
    if (c.owner.isBackgroundCalculation) return;
    c.owner.moveTimer = c.owner.moveTotalTime = Math.max(c.owner.moveTimer || 0, DEFEAT_RECOVERY_SECONDS);
}

/** The content whose own rules a defeat in zone follows (a run by its id, else by its kind), or null for the experience penalty. */
function stateGetContentDefeat(c, zone) {
    if (!zone) return null;
    return stateGetRunDefeat(c, zone) || stateGetOceanDiveDefeat(c, zone) || stateGetContentKindDefeat(c, zone);
}

function stateGetRunDefeat(c, zone) {
    if (zone.id === c.deps.OUTSIDE_CHAOS_ZONE_ID) return stateDefeatAgainstWoodsman;
    if (zone.id === 'colony_run' && c.owner.colony && c.owner.colony.inRun) return stateDefeatInColony;
    if (zone.id === 'beehive_run' && c.owner.beehive && c.owner.beehive.inRun) return stateDefeatInBeehive;
    return zone.id === 'grand_breach_run' ? stateDefeatInGrandBreach : null;
}

function stateGetContentKindDefeat(c, zone) {
    if (zone.type === 'seasonBoss') return c.owner.inTicketBossFight ? stateDefeatInRootBossFight : null;
    return Object.hasOwn(CONTENT_DEFEAT_BY_KIND, zone.type) ? CONTENT_DEFEAT_BY_KIND[zone.type] : null;
}

function stateDefeatInOceanDive(c, zone, message, opts, ui) {
    const guardian = !!c.owner.oceanBossRunPending;
    const fallback = guardian ? '☠️ 심해 가디언에게 쓰러져 수면으로 올라왔습니다.' : '☠️ 자동 재잠수로 들어간 잠수에서 쓰러졌습니다.';
    ui.say(message || fallback, 'death', { noToast: !!opts.noToast });
    stateClearDefeatedEncounter(c);
    c.deps.forceSurfaceOcean(guardian ? 'guardian' : 'defeat');
}

/** Leaves the encounter (a defeat, the loop gate): no enemies, plan or progress left. On an exploration map the fighters go back to
 * their packs (waiting), as when a hunt leaves the map: emptying the list alone left the packs counting monsters the save no longer held,
 * and that save would not load (2026-10-27, the loop gate and a save round-trip sweep). */
function stateClearDefeatedEncounter(c) {
    if (c.deps.actExplorationState.current(c.owner)) c.deps.actExplorationState.retireCombat(c.owner);
    else c.owner.enemies = [];
    c.owner.encounterPlan = [];
    c.owner.encounterIndex = 0;
    c.owner.runProgress = 0;
}

function stateDefeatAgainstWoodsman(c, zone, message, opts, ui) {
    let woodsman = (c.owner.enemies || []).find(e => e && e.isBoss);
    if (woodsman && woodsman.maxHp > 0) {
        let dealtRatio = Math.max(0, Math.min(0.999, 1 - (woodsman.hp / woodsman.maxHp)));
        let score = Math.floor(dealtRatio * 1000000);
        c.deps.addWoodsmanPendingScore(score);
        c.deps.maybeUnlockChaosRealmFromWoodsman(woodsman, { log: true, finalize: true });
        ui.say(c.deps._t('🪓 나무꾼 전투 정산 대기 점수 +{score} (루프 정산 시 반영)', { score }), 'season-up');
    }
    c.deps.clearWoodsmanBuildLock();
    c.owner.currentZoneId = c.deps.getDefeatRecoveryZoneId();
    c.owner.killsInZone = 0;
}

function stateDefeatInColony(c, zone, message, opts, ui) {
    ui.say(message || "☠️ 군락지 방어전에서 패배했습니다.", "death", { noToast: !!opts.noToast });
    c.deps.colonyRun.recordEnd('defeat');
    c.deps.actExplorationState.groundLoot.discardEncounter(c.owner,'colony_run');
    c.owner.colony.inRun = false;
    c.owner.colony.lootPending = false;
    c.owner.colony.bossLootCell = null;
    c.owner.currentZoneId = stateDefeatReturnZone(c, c.owner.colony.returnZoneId);
    c.owner.colony.returnZoneId = null;
    stateClearDefeatedEncounter(c);
    c.owner.killsInZone = 0;
}

function stateDefeatInBeehive(c, zone, message, opts, ui) {
    ui.say(message || "☠️ 벌집 전투에서 패배했습니다. 원정이 즉시 종료됩니다.", "death", { noToast: !!opts.noToast });
    const exitRun = ui.exitBeehiveRun;
    if (exitRun) {
        exitRun('', 'death');
        return;
    }
    c.owner.beehive.inRun = false;
    c.owner.beehive.awaitingClear = false;
    c.owner.beehive.pendingChoice = null;
    c.owner.currentZoneId = stateDefeatReturnZone(c, c.owner.beehive.returnZoneId);
    c.owner.beehive.returnZoneId = null;
    stateClearDefeatedEncounter(c);
    c.owner.killsInZone = 0;
}

function stateDefeatInGrandBreach(c, zone, message, opts, ui) {
    let v = c.owner.voidRift || (c.owner.voidRift = { meter: 0, active: false, breachClears: 0, grandBreachUnlock: false, activeKills: 0, requiredKills: 0 });
    let grand = v.grandRun || {};
    ui.say(message || "☠️ 대균열에서 패배했습니다. 균열이 닫히며 추방됩니다.", "death", { noToast: !!opts.noToast });
    c.deps.actExplorationState.groundLoot.discardEncounter(c.owner,'grand_breach_run');
    v.grandRun = { ...grand, inRun: false, phase: 'failed' };
    stateClearDefeatedEncounter(c);
    c.owner.currentZoneId = grand.returnZoneId !== undefined ? grand.returnZoneId : c.deps.getDefeatRecoveryZoneId();
    c.owner.killsInZone = 0;
}

function stateDefeatBeyondBoundary(c, zone, message, opts, ui) {
    let returnZoneId = c.deps.abandonBeyondBoundaryRun(c.owner);
    ui.say(message || '경계 너머 도전에 실패했습니다. 진행 중이던 단계가 종료됩니다.', 'death', { noToast: !!opts.noToast });
    c.owner.currentZoneId = stateDefeatReturnZone(c, returnZoneId);
    c.owner.killsInZone = 0;
    stateClearDefeatedEncounter(c);
}

function stateDefeatAtMeteor(c, zone, message, opts, ui) {
    ui.say(message || "☠️ 운석 낙하 지점에서 패배했습니다. 운석 지점이 닫힙니다.", "death", { noToast: !!opts.noToast });
    let st = c.deps.ensureMeteorSiteState();
    st.activeMeteorTier = null;
    st.kind = null;
    let returnZoneId = st.meteorReturnZoneId;
    st.meteorReturnZoneId = null;
    c.owner.currentZoneId = stateDefeatReturnZone(c, returnZoneId);
    c.owner.killsInZone = 0;
    stateClearDefeatedEncounter(c);
}

/** A defeat in the time rift shatters the altar's items and closes the altar, so the past must be cleared again (2026-10-26 사용자:
 * 실패 시 아이템 파괴 패널티). The altar is empty in the past (items go on it once the past is cleared), so its line names no items.
 * The lines are the user's own, whatever killed the hero (the death record keeps the cause). */
function stateDefeatInTimeRift(c, zone, message, opts, ui) {
    Object.assign(c.deps.ensureTimeRiftState(), { altarOpen: false, altarUnique: null, altarRare: null, activePressure: null });
    ui.say(zone.riftPhase === 'past' ? '시간의 균열(과거)에서 사망했습니다.' : '시간의 균열(미래)에서 사망했습니다. 제단의 아이템이 산산조각났습니다.', 'death', { noToast: !!opts.noToast });
    c.owner.currentZoneId = c.deps.getDefeatRecoveryZoneId();
    c.owner.killsInZone = 0;
    stateClearDefeatedEncounter(c);
}

function stateDefeatInRootBossFight(c, zone, message, opts, ui) {
    let fallbackMessage = zone.milestonePinnacle
        ? '☠️ 최종 관문 도전에 실패했습니다. 장비와 방어를 정비해 다시 도전하세요.'
        : '☠️ 뿌리 보스 도전에 실패했습니다. 액트 1로 되돌아갑니다.';
    ui.say(message || fallbackMessage, "death", { noToast: !!opts.noToast });
    c.owner.currentZoneId = 0;
    c.owner.killsInZone = 0;
    c.owner.inTicketBossFight = false;
}

function stateDefeatInTrial(c, zone, message, opts, ui) {
    ui.say(message || "☠️ 시련 실패! 마을로 귀환합니다.", "death", { noToast: !!opts.noToast });
    c.owner.currentZoneId = c.deps.getDefeatRecoveryZoneId();
    c.owner.killsInZone = 0;
}

/** 지하계에서 쓰러지면 경험치를 잃고, 다음 층으로 나아가는 설정이면 한 층 얕은 곳부터 다시 내려간다(액트의 물러나기와 같은 뜻,
 * 2026-10-19 사용자 결정). 막힌 층에서 거듭 쓰러지는 쪽이 층을 깨는 쪽보다 경험치를 더 벌었다. 최고층 기록은 그대로다.
 * @returns {number} 잃은 경험치 */
function stateDefeatOnUnderworldFloor(c, zone, message, opts, ui) {
    const lost = stateApplyDeathExpPenalty(c, message, opts, ui);
    const uw = c.owner.underworldProgress, floor = Math.floor(Number(zone.floor) || 0);
    if (!uw || floor <= 1 || !['nextZone', 'nextLoopBestPlusOne'].includes(c.owner.settings.mapCompleteAction || 'nextZone')) return lost;
    uw.currentFloor = floor - 1;
    ui.say(c.deps._t('🛡️ 지하계 {value}층으로 물러나 다시 내려갑니다.', { value: floor - 1 }), 'season-up');
    return lost;
}

/** Anywhere else: a tenth of this level's experience is lost (never below 0). Returns the experience lost. */
function stateApplyDeathExpPenalty(c, message, opts, ui) {
    let expPenalty = Math.floor(c.deps.getExpReq(c.owner.level) * 0.1);
    ui.say(message || "☠️ 사망! 경험치 페널티 적용", "death", { noToast: !!opts.noToast });
    let expBeforePenalty = Math.max(0, Math.floor(Number(c.owner.exp) || 0));
    c.owner.exp = Math.max(0, expBeforePenalty - expPenalty);
    return expBeforePenalty - c.owner.exp;
}

/** 사망 기록: 마지막 3초(속성별, 상태이상, 몬스터별)와 그 전투 전체의 피해(takeDeathFightSummary), 최대 생명. */
function stateBuildPlayerDeathLog(c, zone, opts, expLost, pStats) {
    let damageSummary = c.deps.buildDeathDamageSummary(3000);
    let primaryEntry = damageSummary[0] || null;
    let primaryElement = primaryEntry ? primaryEntry.ele : c.deps.normalizeDamageElementKey(opts.fatalElement);
    return {
        at: c.deps.getCombatTime(),
        zoneName: zone && zone.name ? zone.name : '알 수 없는 지역',
        expLost: expLost,
        primaryElement: primaryElement,
        fatalElement: opts.fatalElement,
        reasonText: c.deps.DEATH_REASON_TEXT[primaryElement] || c.deps.DEATH_REASON_TEXT.phys,
        damageSummary: damageSummary,
        ailmentDamageSummary: c.deps.buildDeathDamageSummary(3000, { ailmentOnly: true }),
        monsterSummary: c.deps.buildDeathMonsterSummary(3000),
        activeAilments: c.deps.snapshotPlayerAilmentsForDeathLog(),
        sourceName: opts.sourceName || '',
        retreatZoneName: c.deps.retreatAfterActDefeat(zone),
        maxLife: Math.max(1, Math.floor(c.deps.getPlayerHpCap(pStats))),
        fight: c.deps.takeDeathFightSummary()
    };
}

export function createCombatDefeat(deps) {
    return Object.freeze({
        noteCampaignResistPenalty: (owner, zoneId) => stateNoteCampaignResistPenalty({owner, deps}, zoneId),
        holdActRetreat: (owner, zone) => stateHoldActRetreat({owner, deps}, zone),
        applyActRestRecovery: (owner, pStats, hpCap) => stateApplyActRestRecovery({owner, deps}, pStats, hpCap),
        handlePlayerDefeat: (owner, zone, pStats, message, options) => stateHandlePlayerDefeat({owner, deps}, zone, pStats, message, options),
        holdAfterDefeat: (owner) => stateHoldAfterDefeat({owner, deps}),
        defeatInOceanDive: (owner, zone, message, opts, ui) => stateDefeatInOceanDive({owner, deps}, zone, message, opts, ui),
        clearDefeatedEncounter: (owner) => stateClearDefeatedEncounter({owner, deps}),
        defeatInGrandBreach: (owner, zone, message, opts, ui) => stateDefeatInGrandBreach({owner, deps}, zone, message, opts, ui),
        defeatBeyondBoundary: (owner, zone, message, opts, ui) => stateDefeatBeyondBoundary({owner, deps}, zone, message, opts, ui),
        defeatAtMeteor: (owner, zone, message, opts, ui) => stateDefeatAtMeteor({owner, deps}, zone, message, opts, ui),
        defeatInTimeRift: (owner, zone, message, opts, ui) => stateDefeatInTimeRift({owner, deps}, zone, message, opts, ui),
        defeatInRootBossFight: (owner, zone, message, opts, ui) => stateDefeatInRootBossFight({owner, deps}, zone, message, opts, ui),
        defeatInTrial: (owner, zone, message, opts, ui) => stateDefeatInTrial({owner, deps}, zone, message, opts, ui),
        defeatOnUnderworldFloor: (owner, zone, message, opts, ui) => stateDefeatOnUnderworldFloor({owner, deps}, zone, message, opts, ui),
        defeatReturnZone: (owner, returnZoneId) => stateDefeatReturnZone({owner, deps}, returnZoneId),
    });
}
