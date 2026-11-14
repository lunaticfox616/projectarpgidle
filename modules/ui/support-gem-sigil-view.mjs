import { sigilHtml, summonHtml } from './support-gem-sigil-markup.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createSupportGemSigilView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null };
    const handlers = { sigilHtml, summonHtml };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = Object.freeze({ html: runtime.handlers.sigilHtml, tone: runtime.deps.getSupportRuneTone, summonHtml: runtime.handlers.summonHtml });

    return runtime.api;
}

function initialize(runtime) {
    runtime.state.SUMMON_LOOKS = Object.freeze({
        '수액 골렘 소환': ['shield', 'summon']
    });
}
