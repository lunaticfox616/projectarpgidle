import { clearRecordLoopBestFloor, clearResolveNextLoopBestPlusOneZone } from '../combat/clear-progression.mjs';
import { clearContinueMapAfterClear } from '../combat/clear-travel.mjs';
import { LABYRINTH_FOSSIL_NOTE_NAMES } from '../data/clear-values.mjs';

export function* clearFinishLabyrinthEncounter(env, zone, mapAction) {
    let clearedFloor = Math.max(1, Math.floor(env.owner.labyrinthFloor || zone.floor || 1));
    const currenciesBefore = { ...env.owner.currencies };
    if (clearedFloor >= 10) env.deps.unlockJournalEntry('labyrinth_10');
    clearRecordLoopBestFloor(env, 'bestLabyrinthFloor', clearedFloor);
    env.owner.labyrinthUnlockedMaxFloor = Math.max(env.owner.labyrinthUnlockedMaxFloor || 1, clearedFloor + 1);
    env.owner.labyrinthFloor = ['repeatZone', 'stop'].includes(mapAction) ? clearedFloor : clearedFloor + 1;
    clearRollLabyrinthSealShards(env, clearedFloor);
    env.owner.labyrinthLastResult = clearLabyrinthFloorResult(env, clearedFloor, currenciesBefore);
    (yield { kind: 'finishSay', args: [env.deps._t('🏛️ 미궁 {clearedFloor}층 돌파!{fossilSummary}', { clearedFloor, fossilSummary: clearLabyrinthFossilNote(env, env.owner.labyrinthLastResult.currencies) }), 'season-up'] });
    if (mapAction === 'nextLoopBestPlusOne') {
        let nextZone = clearResolveNextLoopBestPlusOneZone(env, zone);
        if (nextZone !== null) env.owner.currentZoneId = nextZone;
    }
    env.owner.killsInZone = 0;
    yield* clearContinueMapAfterClear(env, zone);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [200] });
}

/** The floor's result card: what the clear itself gave (currencies against `before`) and what its guardian dropped (pending). */
export function clearLabyrinthFloorResult(env, clearedFloor, before) {
    const last = env.owner.labyrinthLastResult, dropped = last?.pending && last.season === env.owner.season && last.floor === clearedFloor ? last.currencies : {};
    const currencies = { ...dropped };
    for (const key of Object.keys(env.deps.ORB_DB)) {
        const gain = (env.owner.currencies[key] || 0) - (before[key] || 0);
        if (gain > 0) currencies[key] = (currencies[key] || 0) + gain;
    }
    return { season: env.owner.season, floor: clearedFloor, pending: false, currencies };
}

export function clearLabyrinthFossilNote(env, currencies) {
    const typedName = key => env.deps.FOSSIL_DB.find(fossil => fossil.key === key && !fossil.ancientPrimalOnly)?.name;
    const found = Object.keys(currencies).map(key => LABYRINTH_FOSSIL_NOTE_NAMES[key] || typedName(key)).filter(Boolean).map(name => `${env.deps._t(name)} +1`);
    if (!found.length && !env.deps.contentProgression.isUnlocked('fossil')) return '';
    return ` [${found.join(' / ') || env.deps._t('화석 없음')}]`;
}

/** From loop 6 a labyrinth floor may give seal shards: 2.5%, strong 0.75%, radiant 0.16% from floor 30. */
export function clearRollLabyrinthSealShards(env, clearedFloor) {
    if ((env.owner.season || 1) < 6) return;
    if (Math.random() < 0.025) env.deps.awardCurrency('sealShard', 1, 'drop');
    if (Math.random() < 0.0075) env.deps.awardCurrency('strongSealShard', 1, 'drop');
    if (clearedFloor >= 30 && Math.random() < 0.0016) env.deps.awardCurrency('radiantSealShard', 1, 'drop');
}
