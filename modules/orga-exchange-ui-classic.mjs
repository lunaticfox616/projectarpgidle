import { createCurrencyExchangeView } from './ui/currency-exchange-view.mjs';
const orgaExchangeUi = createCurrencyExchangeView({
    get getActiveCloudUserId() { return getActiveCloudUserId; },
    get _t() { return _t; },
    get game() { return window.GameModules.state.game; },
    get NPC_CURRENCY_EXCHANGE() { return NPC_CURRENCY_EXCHANGE; },
    get currencyExchange() { return currencyExchange; },
    get shopView() { return shopView; },
    get document() { return document; },
    get requestGameConfirmation() { return requestGameConfirmation; },
    get addLog() { return addLog; },
    get notifyCurrencyAcquisition() { return notifyCurrencyAcquisition; },
    get queueImportantSave() { return queueImportantSave; },
    get checkUnlocks() { return checkUnlocks; },
    get updateStaticUI() { return updateStaticUI; },
    get escapeHTML() { return escapeHTML; },
    get ORB_DB() { return ORB_DB; },
    get WALLET_CURRENCY_INFO() { return WALLET_CURRENCY_INFO; },
    get i18n() { return i18n; }
});
safeExposeGlobals({ orgaExchangeUi });
