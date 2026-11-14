import * as queries from './ui-stat-queries.mjs';
import * as input from './ui-refresh-input.mjs';
import * as queue from './ui-refresh-queue.mjs';
import { syncUiRuntimeOwner, installUiRefreshEvents, disposeUiRuntime } from './ui-refresh-lifetime.mjs';

const PUBLIC_CALLS = [
    'canEditBuild',
    'normalizeUiPlayerStats', 'getUiPlayerStats', 'isUiDamageAilmentType', 'getUiStoredAilmentHitDamage',
    'getUiPlayerDamageAilmentDps', 'getUiEnemyDamageAilmentDps', 'getUiPlayerShockTakenDamageIncreasePct',
    'getUiEnemyShockTakenDamageIncreasePct', 'formatUiTakenDamageShockLine', 'getUiSkillTargets',
    'getUiCrowdProgressPaused', 'runUiGlobalFunction', 'runUiStartEncounter', 'runUiCoreLoop', 'getUiGemPresentation',
    'beginUiPointerInteraction', 'scheduleDeferredStaticUiFlush', 'finishUiPointerInteraction',
    'isUiPointerInteractionActive', 'getUiDisclosureKey', 'captureUiDisclosureState', 'restoreUiDisclosureState',
    'processQueuedUIRefresh', 'shouldRedrawPassiveTree', 'updateStaticUI'
];

/** Shared presentation state; no save fields or domain calculations are owned here. */
export function createUiRuntime(deps) {
    const runtime = { deps, state: initialState(), handlers: {}, owner: deps.game, active: true, epoch: 0, listeners: [] };
    const pure = new Set(['getDefaultUiPlayerStats', 'coerceUiPlayerStatNumbers', 'isClickSensitiveTarget', 'getUiDisclosureKey']);
    for (const [name, handler] of Object.entries({ ...queries, ...input, ...queue })) {
        runtime.handlers[name] = pure.has(name) ? handler : handler.bind(undefined, runtime);
    }
    const api = {};
    for (const name of PUBLIC_CALLS) {
        const handler = runtime.handlers[name];
        api[name] = (...args) => { if (syncUiRuntimeOwner(runtime)) return handler(...args); };
    }
    api.stats = Object.freeze({
        snapshot: () => syncUiRuntimeOwner(runtime) ? runtime.state.cachedTooltipStats : null,
        store: value => { if (syncUiRuntimeOwner(runtime)) runtime.state.cachedTooltipStats = value; }
    });
    api.status = () => {
        syncUiRuntimeOwner(runtime);
        const { uiRefreshQueued: queued, uiRefreshRunning: running } = runtime.state;
        return { queued, running, idle: !queued && !running };
    };
    api.disclosure = Object.freeze({
        setOpen: (key, open) => { if (syncUiRuntimeOwner(runtime)) runtime.state.uiDisclosureState[key] = !!open; }
    });
    api.dispose = () => disposeUiRuntime(runtime);
    installUiRefreshEvents(runtime);
    return Object.freeze(api);
}

function initialState() {
    return {
        cachedTooltipStats: null,
        uiPlayerStatDefaults: null,
        lastPassiveTreeSignature: '',
        uiRefreshQueued: false,
        uiRefreshRunning: false,
        refreshFrame: null,
        uiPointerInteraction: null,
        uiPointerFlushTimer: null,
        // Expansion choices belong to the UI session, as before; they are not save data.
        uiDisclosureState: Object.create(null),
        UI_REFRESH_POINTER_FLUSH_DELAY_MS: 35,
        UI_REFRESH_LONG_POINTER_LIMIT_MS: 8000
    };
}
