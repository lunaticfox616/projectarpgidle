import { createRecordsView } from './ui/records-view.mjs';

// Compatibility entry until the application composes this view and its callers directly.
const recordsView = createRecordsView({
    get i18n() { return i18n; },
    get _t() { return _t; },
    get chronicleUi() { return chronicleUi; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get getRecordsView() { return getRecordsView; },
    get getZone() { return getZone; },
    get updateGamePanelMarkup() { return updateGamePanelMarkup; },
    get weaponMasteryUi() { return weaponMasteryUi; }
});
window.GameModules.recordsView = recordsView;
safeExposeGlobals({ renderRecordsTab: recordsView.renderRecordsTab, buildRecordsHtml: recordsView.buildRecordsHtml, formatRecordDuration: recordsView.formatRecordDuration });
