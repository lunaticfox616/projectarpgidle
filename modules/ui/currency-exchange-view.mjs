const CURRENCY_EXCHANGE_GROUPS = Object.freeze([
        { label: '기본 재화', keys: ['magicBud', 'sapBud', 'formlessDew', 'goldenRule', 'blessing', 'blightSpore', 'pruningShears', 'fairyRing'] },
        { label: '제작 재화', keys: ['emberBranch', 'burningEmberBranch', 'ouroboros', 'enchantedHoney', 'venomStinger', 'voidChisel', 'oceanRerollShard', 'altarEmber',
                'altarIchor', 'memoryImprint', 'deepWhetstone', 'rootIron', 'jewelPolish', 'abyssCatalyst', 'catalystPhys', 'catalystFire', 'catalystCold',
                'catalystLight', 'catalystChaos', 'catalystCrit', 'catalystSummon', 'oilFire', 'oilCold', 'oilLight', 'oilChaos'] },
        { label: '화석', keys: ['fossil', 'fossilPrimal', 'fossilAncientPrimal', 'fossilPrimordial', 'fossilJagged', 'fossilBound', 'fossilGale', 'fossilPrismatic',
                'fossilBulwark', 'fossilWedge', 'fossilAbyssal', 'fossilOld', 'fossilRift'] },
        { label: '뿌리', keys: ['omenPruning', 'omenCompost', 'omenWeave', 'omenPyre', 'omenHunger'] },
        { label: '입장권', keys: ['bossKeyFlame', 'bossKeyFrost', 'bossKeyStorm', 'beastKeyCerberus', 'trialKey3', 'chaosKey', 'coreKey', 'hiveKey', 'colonyTrace',
                'rivalKey', 'cosmosSovereignKey', 'uberRootTicketFlame', 'uberRootTicketFrost', 'uberRootTicketStorm', 'uberRootTicketChaos'] },
        { label: '재료', keys: ['bossCore', 'runeShard', 'underCopper', 'underSilver', 'underGold', 'skyEssence', 'jewelShard', 'pollen', 'beeswax', 'awakenedEcho',
                'sealShard', 'strongSealShard', 'radiantSealShard', 'reefFragment', 'colonyShard'] }
    ]);

import { listenView, releaseViewEvents } from './view-events.mjs';
import { listed, orgaCellHtml, orgaDoorHtml, orgaBodyHtml } from './currency-exchange-markup.mjs';
import { orgaClick, orgaInput } from './currency-exchange-actions.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createCurrencyExchangeView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { listed, orgaCellHtml, orgaDoorHtml, orgaBodyHtml, orgaClick, orgaInput };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);

    runtime.api = CurrencyExchangeViewApi(runtime);
    installCurrencyExchangeViewEvents(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.GROUPS = CURRENCY_EXCHANGE_GROUPS;
    runtime.state.WALLET = Object.freeze(['magicBud', 'formlessDew', 'goldenRule']);
    runtime.state.side = 'sell';
    runtime.state.chosen = '';
    runtime.state.quantity = 1;
    runtime.state.trading = false;
}

function installCurrencyExchangeViewEvents(runtime) {
    listenView(runtime, runtime.deps.document, 'click', runtime.handlers.orgaClick);
    listenView(runtime, runtime.deps.document, 'input', runtime.handlers.orgaInput);
}
function CurrencyExchangeViewApi(runtime) {
    return Object.freeze({
        door: runtime.handlers.orgaDoorHtml,
        body: runtime.handlers.orgaBodyHtml,
        groups: runtime.state.GROUPS,
        dispose: () => disposeCurrencyExchangeView(runtime)
    });
}

function disposeCurrencyExchangeView(runtime) {
    releaseViewEvents(runtime);
}
