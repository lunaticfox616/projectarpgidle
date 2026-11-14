const reachedSkyTowerFloor10 = s => !!(s.skyTower && (Math.floor(s.skyTower.highestFloor || 1) >= 11
    || (Array.isArray(s.skyTower.clearedFloors) ? s.skyTower.clearedFloors : []).some(floor => Math.floor(floor || 0) >= 10)));
const holdsFusedRelic = s => (s.inventory || []).some(item => item && item.fusedRelic)
    || Object.values(s.equipment || {}).some(item => item && item.fusedRelic);
const reachedColonyWave10 = s => Math.max(Math.floor((s.colony || {}).highestWave || 0), Math.floor((s.colony || {}).wave || 0)) >= 11;

/** Keep recovery insertion order stable for existing journals and unread indicators. */
const progressRules = Object.freeze([
    ['passive_star_evolution', s => !!s.passiveStarEvolution],
    ['meteor_fall', s => Math.floor((s.meteorSite || {}).entriesCleared || 0) > 0],
    ['woodsman', s => !!(s.chaosInfuserUnlocked || s.woodsmanSimulatorSeenLoop || Math.floor(s.woodsmanDefeatAttempts || 0) > 0)],
    ['beehive_queen', s => !!(s.beehive && s.beehive.cleared)],
    ['void_grand_breach', s => !!(s.voidRift && s.voidRift.grandBreachCleared)],
    ['labyrinth_10', s => Math.max(Math.floor(s.labyrinthUnlockedMaxFloor || 1), Math.floor(s.labyrinthFloor || 1)) >= 11],
    ['ocean_500', s => !!(s.ocean && Math.floor(s.ocean.bossClearM || 0) >= 500)],
    ['sky_tower_10', reachedSkyTowerFloor10],
    ['time_rift_fusion', journalReachedTimeRiftFusion],
    ['colony_wave_10', reachedColonyWave10]
]);

/** The fused-relic scan runs before checking the fusion count, as in the save repair path. */
export function journalReachedTimeRiftFusion(owner) {
    const fused = holdsFusedRelic(owner);
    return (owner.timeRift && Math.floor(owner.timeRift.fusionCount || 0) > 0) || fused;
}

export function journalRepairEntriesFromProgress(env, state) {
    const owner = state && typeof state === 'object' ? state : {};
    const recovered = new Set(Array.isArray(owner.journalEntries) ? owner.journalEntries.filter(id => env.deps.JOURNAL_DB[id]) : []);
    recovered.add('prologue');
    const loopStage = Math.max(Math.floor(owner.season || 1), Math.floor(owner.loopCount || 0));
    if (loopStage >= 2) Object.keys(env.deps.JOURNAL_DB).filter(id => /^act_/.test(id)).forEach(id => recovered.add(id));
    progressRules.forEach(([id, reached]) => { if (reached(owner)) recovered.add(id); });
    addRootBossEntries(env, owner, recovered);
    env.deps.memoryLeaves.restoreJournal(owner, recovered);
    owner.journalEntries = Array.from(recovered).filter(id => env.deps.JOURNAL_DB[id]);
    return owner.journalEntries;
}

function addRootBossEntries(env, owner, recovered) {
    const rootBossIds = new Set(Array.isArray(owner.clearedRootBosses) ? owner.clearedRootBosses : []);
    if (typeof env.deps.SEASON_BOSS_ZONES === 'undefined' || !Array.isArray(env.deps.SEASON_BOSS_ZONES)) return;
    env.deps.SEASON_BOSS_ZONES.forEach(zone => {
        if (zone && zone.journalId && rootBossIds.has(zone.id) && env.deps.JOURNAL_DB[zone.journalId]) recovered.add(zone.journalId);
    });
}
