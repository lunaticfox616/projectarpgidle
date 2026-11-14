import { createMarketView } from './ui/market-view.mjs';
const marketUi = createMarketView({
    get document() { return document; },
    get isMarketUnlocked() { return isMarketUnlocked; },
    get contentProgression() { return contentProgression; },
    get game() { return window.GameModules.state.game; },
    get loadPlayerExchange() { return loadPlayerExchange; },
    get switchTab() { return switchTab; },
    get window() { return window; },
    get _t() { return _t; },
    get hallItemIssue() { return hallItemIssue; },
    get refreshBlackMarket() { return refreshBlackMarket; },
    get blackMarketUi() { return blackMarketUi; },
    get hideItemTooltip() { return hideItemTooltip; },
    get selectPlayerHallItem() { return selectPlayerHallItem; },
    get playerStallUi() { return playerStallUi; },
    get npcRosterUi() { return npcRosterUi; }
});
safeExposeGlobals({ marketUi,
    marketPickHallItem: marketUi.marketPickHallItem,
    renderMarketUI: marketUi.renderMarketUI
});
