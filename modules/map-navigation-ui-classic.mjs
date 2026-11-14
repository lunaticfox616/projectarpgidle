import { createMapNavigationView } from './ui/map-navigation-view.mjs';

const mapNavigationView = createMapNavigationView({
    get document() { return document; },
    get switchMapSubtab() { return switchMapSubtab; },
    get updateStaticUI() { return updateStaticUI; },
    get game() { return window.GameModules.state.game; },
    get _t() { return _t; }
});
window.GameModules.mapNavigationView = mapNavigationView;
safeExposeGlobals({ renderMobileMapNavigation: mapNavigationView.renderMobileMapNavigation });
