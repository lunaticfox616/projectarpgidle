import { restoreMainMap } from './atlas-passages.mjs';
import { atlasSessionClearRoom } from './atlas-run-drops.mjs';
import { atlasSessionNotify } from './atlas-run-events.mjs';

/** A cleared expedition gets the same settlement whether the hero waits or leaves through a portal. */
export function* atlasSessionFinishExpedition(env, owner, zone, leaving = false) {
    const expedition = owner.actExploration, room = zone?.pocket;
    if (!room || !expedition?.home || expedition.status !== 'cleared') return;
    const maps = [];
    const rewards = yield {kind:'atlasSessionEffectCaptureAtlasCompletion', args:[owner, atlasSessionClearRoom(env, owner, zone, room, maps)]};
    if (leaving) env.deps.actExplorationProgress.depart(owner);
    restoreMainMap(owner, expedition);
    if (!leaving) yield {kind:'atlasSessionEffectResumeExpedition', args:[]};
    yield* atlasSessionNotify(env, {kind:'drops', room, maps, rewards, fragments:[], golden:env.deps.atlasEncounters.isGolden(zone,room)});
    yield {kind:'atlasSessionEffectQueueImportantSave', args:[100]};
}
