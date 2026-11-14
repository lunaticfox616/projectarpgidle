import { renderCharacterStats, renderCharacterEhpSummary, renderCharacterPassiveSpecialStats } from './character-stats-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createCharacterStatsView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { renderCharacterStats, renderCharacterEhpSummary, renderCharacterPassiveSpecialStats };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);

    runtime.api = { renderCharacterStats: runtime.handlers.renderCharacterStats,
        renderCharacterEhpSummary: runtime.handlers.renderCharacterEhpSummary,
        renderCharacterPassiveSpecialStats: runtime.handlers.renderCharacterPassiveSpecialStats };

    return runtime.api;
}
