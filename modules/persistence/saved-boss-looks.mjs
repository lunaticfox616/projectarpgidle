/** Snapshot once at runtime composition, as in the original save boundary. */
export function createSavedBossLooks(deps) {
    return new Map([
    [deps.OUTSIDE_CHAOS_ZONE_ID, 'woodsman'],
    [deps.WOODSMAN_ECHO_ZONE_ID, 'woodsman_echo'],
    ...deps.SEASON_BOSS_ZONES.filter(zone => zone.bossVisualId && !zone.bossStages).map(zone => [zone.id, zone.bossVisualId])
]);
}
