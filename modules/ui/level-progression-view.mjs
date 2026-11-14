import { item, area, rewardHint, rewardData, decorateSlots } from './level-progression-markup.mjs';

/** Stateless equipment requirements and map rewards; every query reads the current save. */
export function createLevelProgressionView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { item, area, rewardHint, rewardData, decorateSlots };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);

    runtime.api = Object.freeze({ item: runtime.handlers.item, area: runtime.handlers.area, rewardHint: runtime.handlers.rewardHint, rewardData: runtime.handlers.rewardData, decorateSlots: runtime.handlers.decorateSlots });

    return runtime.api;
}
