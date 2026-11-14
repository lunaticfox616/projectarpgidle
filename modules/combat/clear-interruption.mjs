export function killEnterAutomaticMeteorEncounter(env) {
    env.deps.prepareMeteorEncounterEntry(env.owner.currentZoneId);
    env.owner.currentZoneId = env.deps.METEOR_FALL_ZONE_ID;
}

/** 혼돈 20 · 심화 클리어: 창공의 탑 해금 검사와 세계수 아틀라스(첫 해금 · 이번 루프의 첫 지도석). */
export function killOnChaos20Cleared(env) {
    env.deps.maybeUnlockSkyTowerFromChaos20();
    env.deps.atlasRun.onChaos20();
}

export function* killEnterAutomaticMapInterruptionAfterClear(env, clearedZone) {
    let star = env.owner.meteorSite || {};
    const locks = killMapInterruptionLocks(env);
    if (killMeteorInterruptionReady(env.owner, star, locks, clearedZone)) {
        killEnterAutomaticMeteorEncounter(env);
        (yield { kind: 'addLog', args: [env.deps._t('☄️ 자동입장: 하늘 균열 100% 충전으로 운석 낙하 지점에 진입합니다.'), 'season-up'] });
        return true;
    }
    if (typeof env.deps.autoEnterGrandBreachIfReady === 'function' && env.deps.autoEnterGrandBreachIfReady()) return true;
    return killAutoRediveOceanAfterClear(env, clearedZone);
}

function killMapInterruptionLocks(env) {
    const beehive = typeof env.deps.isBeehiveRunLockedForMapTravel === 'function' ? env.deps.isBeehiveRunLockedForMapTravel() : !!(env.owner.beehive && env.owner.beehive.inRun);
    const grand = !!(env.owner.voidRift && env.owner.voidRift.grandRun && env.owner.voidRift.grandRun.inRun);
    return { beehive, grand };
}

function killMeteorInterruptionReady(state, star, locks, zone) {
    return state.settings && state.settings.autoEnterMeteor && !locks.beehive && !locks.grand && star.unlocked && star.skyRiftReady && (!zone || zone.type !== 'meteor');
}

/** 자동 재잠수(설정 autoRediveOcean, 2026-10-19 사용자: "떠오른 뒤 자동 재잠수 설정"): 산소가 떨어지거나 가디언에게 쓰러져 떠오른 뒤
 * 사냥터 하나를 깨면 다시 잠수한다. 가장 깊은 리프트가 넘지 못한 가디언 앞이면 얕은 리프트부터 내려가 물고기를 모은다
 * (getOceanShallowLiftM, 2026-10-19 사용자 결정 "얕게 돌기"). 부른 쪽(지역 클리어 뒤 출발)이 걸어 들어간다. 소득 없이 떠오른 잠수가
 * 이어지거나 무리에게 쓰러지면 멈춘다(OCEAN_AUTO_REDIVE, data/maps.js). @returns {boolean} 잠수를 시작했는지 */
export function killAutoRediveOceanAfterClear(env, clearedZone) {
    if (!killCanAutoRediveOcean(env, env.deps.ensureOceanState()) || !killIsOceanRediveMoment(env, clearedZone)) return false;
    if (!env.deps.enterOceanDive({ auto: true, shallow: true })) return false;
    env.owner.killsInZone = 0;
    return true;
}

/** 설정과 잠수 기록이 다시 잠수를 허락하는가: 켜져 있고, 산소가 떨어지거나 가디언에게 쓰러져 떠올랐고, 멈추지 않았다(isOceanAutoRediveHalted). 방치 정산
 * 에서는 잠수하지 않는다: 심해는 투영하지 않아 잠수가 정산의 실제 전투 한도(OFFLINE_PROJECTION.realCapMs)를 써 버리고, 가디언에게
 * 거듭 쓰러지면 정산의 연속 사망 멈춤에 걸린다. */
export function killCanAutoRediveOcean(env, st) {
    if (!env.owner.settings.autoRediveOcean || env.owner.isBackgroundCalculation || !st.unlocked || st.diving) return false;
    return ['oxygen', 'guardian'].includes(st.lastSurfaceReason) && !env.deps.isOceanAutoRediveHalted(st);
}

/** 지금 다시 잠수해도 되는 때: 사냥터(액트, 혼돈)를 막 깼고, 귀환 뒤 멈춤이 아니고, 다른 도전 중이 아니고, 생명력이 거의 찼고,
 * 심해로 가는 길이 막히지 않았다(거절 사유는 알리지 않는다: 다음 클리어에 다시 묻는다). */
export function killIsOceanRediveMoment(env, clearedZone) {
    if (!clearedZone || !['act', 'abyss'].includes(clearedZone.type) || env.owner.settings.townReturnAction === 'stop') return false;
    if (killIsColonyOrGrandBreachRunning(env) || env.owner.playerHp < env.deps.getPlayerHpCap(env.deps.getPlayerStats()) * 0.9) return false;
    return !env.deps.getZoneTravelBlockReason(env.deps.OCEAN_ZONE_ID) && !env.deps.getContentStartBlockReason();
}

/** 군락지 원정이나 대균열 도전 중인가: 그 지역을 떠나면 도전이 끝나므로(holdZoneBoundRuns) 자동 입장이 끊지 않는다. */
export function killIsColonyOrGrandBreachRunning(env) { return !!(env.owner.colony && env.owner.colony.inRun) || !!(env.owner.voidRift && env.owner.voidRift.grandRun && env.owner.voidRift.grandRun.inRun); }
