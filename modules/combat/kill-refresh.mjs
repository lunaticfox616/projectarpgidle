/** The full UI redraw after a kill that changed more than the fight: a boss or elite, new currency, a gem level, the colony, a badge. */
export function* killFlagHeavyUiAfterKill(env, enemy, zone, gemLeveled, currencyDropVersionBefore) {
    const currencyChanged = Math.max(0, Math.floor(env.owner.currencyDropVersion || 0)) !== currencyDropVersionBefore;
    const colonyStateChanged = Boolean(zone && zone.id === 'colony_run' && env.owner.colony && env.owner.colony.inRun);
    const badge = ['char', 'skills', 'items', 'map'].some(key => env.owner.noti[key]);
    if ([enemy.isBoss, enemy.isElite, currencyChanged, gemLeveled, colonyStateChanged, badge].some(Boolean)) (yield { kind: 'requestHeavyUiRefresh', args: [] });
}
