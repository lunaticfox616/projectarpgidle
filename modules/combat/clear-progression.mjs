/** This loop's progress record, made when missing. */
export function clearEnsureLoopProgressCurrent(env) {
    env.owner.loopProgressCurrent = env.owner.loopProgressCurrent || { specialBosses: [], chaos20Cleared: false, bestAbyssDepth: 0, bestLabyrinthFloor: 0, bestChaosRealmFloor: 0, cosmosPlanets: [] };
    return env.owner.loopProgressCurrent;
}

/** This loop's best floor of a content, which the map action 최고층 returns to (resolveNextLoopBestPlusOneZone; the loop settlement
 * clears it). The labyrinth and the chaos realm stopped writing theirs when finishEncounterRun was split (b4d1a2af). */
export function clearRecordLoopBestFloor(env, key, floor) {
    const progress = clearEnsureLoopProgressCurrent(env);
    progress[key] = Math.max(Math.floor(progress[key] || 0), floor);
}

/** With the next-best-floor map action: the zone it resolves to, else fallback. */
export function clearNextBestZoneOr(env, zone, fallback) {
    let nextZone = clearResolveNextLoopBestPlusOneZone(env, zone);
    return nextZone !== null ? nextZone : fallback;
}

export function clearEnsureNextEndlessChaosDepthUnlocked(env, depth) {
    let clearedDepth = Math.max(1, Math.floor(depth || 1));
    if ((env.owner.season || 1) < 10 || clearedDepth < 20) return 0;
    env.owner.abyssUnlockedDepths = Array.isArray(env.owner.abyssUnlockedDepths) ? env.owner.abyssUnlockedDepths : [20];
    let nextDepth = Math.max(21, clearedDepth + 1);
    if (!env.owner.abyssUnlockedDepths.includes(nextDepth)) env.owner.abyssUnlockedDepths.push(nextDepth);
    env.owner.abyssUnlockedDepths = Array.from(new Set(env.owner.abyssUnlockedDepths.map(v => Math.floor(v || 0)).filter(v => v >= 20))).sort((a, b) => a - b);
    return nextDepth;
}

export function clearResolveNextLoopBestPlusOneZone(env, zone) {
    clearEnsureLoopProgressCurrent(env);
    let currentLoopAbyssDepth = clearBestAbyssDepth(env, zone);
    if (clearCanResumeClimb(zone, 'abyss') && currentLoopAbyssDepth >= 20) {
        // 이번 루프에 깬 최고 층의 다음 층(js/state.js getAutoProgressZoneId와 같은 한 층씩 규칙, 현재 심화층 기록도 맞춘다).
        return env.deps.getAutoProgressZoneId(env.deps.getAbyssZoneIdForDepth(Math.max(21, currentLoopAbyssDepth + 1)));
    }
    if (clearCanResumeClimb(zone, 'labyrinth') && Math.max(0, Math.floor(env.owner.loopProgressCurrent.bestLabyrinthFloor || 0)) >= 1) {
        env.owner.labyrinthFloor = Math.max(1, Math.floor(env.owner.loopProgressCurrent.bestLabyrinthFloor || 1) + 1);
        return env.deps.LABYRINTH_ZONE_ID;
    }
    if (clearCanResumeClimb(zone, 'chaosRealm') && Math.max(0, Math.floor(env.owner.loopProgressCurrent.bestChaosRealmFloor || 0)) >= 1) {
        return clearResumeChaosRealm(env);
    }
    return null;
}

function clearBestAbyssDepth(env, zone) {
    const currentDepth = zone && zone.type === 'abyss' ? Math.max(1, Math.floor(zone.depth || env.deps.getAbyssDepthFromZoneId(zone.id) || 1)) : 0;
    return Math.max(0, Math.floor(env.owner.loopProgressCurrent.bestAbyssDepth || 0), currentDepth);
}

function clearCanResumeClimb(zone, kind) {
    return zone && (zone.type === kind || zone.type === 'meteor');
}

function clearResumeChaosRealm(env) {
    let st = env.deps.ensureChaosRealmState();
    st.currentFloor = Math.min(Math.max(1, Math.floor(st.highestFloor || 1)), Math.max(1, Math.floor(env.owner.loopProgressCurrent.bestChaosRealmFloor || 1) + 1));
    return env.deps.CHAOS_REALM_ZONE_ID;
}
