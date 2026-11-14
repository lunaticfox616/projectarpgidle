import { releaseViewEvents } from './view-events.mjs';
import { shardCard, exchangeRow, tone, detailHtml, tooltipHtml, summaryHtml, unsealHtml } from './stump-talisman-markup.mjs';
import { unseal, exchange, wax, turn, discard } from './stump-talisman-actions.mjs';

export function createStumpTalismanView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { shardCard, exchangeRow, tone, detailHtml, tooltipHtml, summaryHtml, unsealHtml, unseal, exchange, wax, turn, discard };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);

    runtime.api = StumpTalismanViewApi(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.RARITY_LABELS = { magic: '마법', rare: '희귀', unique: '고유' };
    runtime.state.SHARD_RARITY = Object.freeze({ sealShard: 'magic', strongSealShard: 'rare', radiantSealShard: 'unique' });
}


function StumpTalismanViewApi(runtime) {
    return Object.freeze({
        tone: runtime.handlers.tone,
        detailHtml: runtime.handlers.detailHtml,
        tooltipHtml: runtime.handlers.tooltipHtml,
        summaryHtml: runtime.handlers.summaryHtml,
        unsealHtml: runtime.handlers.unsealHtml,
        unseal: runtime.handlers.unseal,
        exchange: runtime.handlers.exchange,
        wax: runtime.handlers.wax,
        turn: runtime.handlers.turn,
        discard: runtime.handlers.discard,
        dispose: () => disposeStumpTalismanView(runtime)
    });
}

function disposeStumpTalismanView(runtime) {
    releaseViewEvents(runtime);
}
