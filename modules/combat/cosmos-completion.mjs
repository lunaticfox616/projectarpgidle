import { killEnterAutomaticMapInterruptionAfterClear } from './clear-interruption.mjs';
export function* clearFinishCosmosEncounter(env, zone, mapAction) {
    const atlas = env.deps.cosmosAtlas;
    if (atlas) yield* atlas.rewards.exploreSelectedCosmosNode(zone.cosmosNodeId || null);
    if (atlas && (yield* atlas.encounters.continueCosmosChallengeAfterClear(mapAction))) {
        (yield { kind: 'finishRedraw', args: [] });
        (yield { kind: 'queueImportantSave', args: [200] });
        return;
    }
    if (env.owner.cosmosAtlas && typeof env.owner.cosmosAtlas === 'object') env.owner.cosmosAtlas.activeChallenge = null;
    env.owner.currentZoneId = env.deps.getAutoProgressZoneId(env.owner.maxZoneId);
    env.owner.killsInZone = 0;
    if (mapAction === 'stop') env.owner.combatHalted = true;
    yield* killEnterAutomaticMapInterruptionAfterClear(env, zone);
    if (mapAction !== 'stop') env.deps.startMoving(false);
    (yield { kind: 'finishRedraw', args: [] });
    (yield { kind: 'queueImportantSave', args: [200] });
}
