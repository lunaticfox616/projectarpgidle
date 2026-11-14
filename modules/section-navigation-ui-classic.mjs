import { createSectionNavigationView } from './ui/section-navigation-view.mjs';

window.GameModules.sectionNavigationView = createSectionNavigationView({
    document, window, MutationObserver, i18n, uiDisplay
});
