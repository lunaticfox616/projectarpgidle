import { rowHtml, bosses, trials, labyrinth, hive, grand, meteor, timeRift, ocean, underworld, chaosRealm, chaos, atlasNext, cosmos, sky, html } from './world-map-brief-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createWorldMapBrief(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { rowHtml, bosses, trials, labyrinth, hive, grand, meteor, timeRift, ocean, underworld, chaosRealm, chaos, atlasNext, cosmos, sky, html };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = { html: runtime.handlers.html };

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.LIMIT = 5;
    runtime.state.BRIEFS = Object.freeze({ 'map-explore-root-boss': runtime.handlers.bosses, 'map-explore-trials': runtime.handlers.trials, 'map-explore-labyrinth': runtime.handlers.labyrinth, 'map-explore-beehive': runtime.handlers.hive,
        'map-explore-voidrift': runtime.handlers.grand, 'map-explore-meteor': runtime.handlers.meteor, 'map-explore-timerift': runtime.handlers.timeRift, 'map-tab-ocean': runtime.handlers.ocean, 'map-tab-underworld': runtime.handlers.underworld,
        'map-tab-chaos-realm': runtime.handlers.chaosRealm, 'map-explore-chaos': runtime.handlers.chaos, 'map-explore-worldtree': runtime.handlers.atlasNext, 'map-tab-cosmos': runtime.handlers.cosmos, 'map-tab-sky': runtime.handlers.sky });
}
