import { createSettingsView } from './ui/settings-view.mjs';

// Compatibility entry until the application composes this view and its callers directly.
const settingsUi = createSettingsView({
    get MutationObserver() { return MutationObserver; },
    get _t() { return _t; },
    get appPlatform() { return appPlatform; },
    get isTabGroupingActive() { return isTabGroupingActive; },
    get getActiveTabGroup() { return getActiveTabGroup; },
    get requestGameChoice() { return requestGameChoice; },
    get closeWindow() { return closeWindow; },
    get console() { return console; },
    get document() { return document; },
    get equipmentLootUi() { return equipmentLootUi; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get gameBgm() { return gameBgm; },
    get i18n() { return i18n; },
    get playUiFeedbackSound() { return playUiFeedbackSound; },
    get queueImportantSave() { return queueImportantSave; },
    get renderHeroSelectionControls() { return renderHeroSelectionControls; },
    get renderTabOrderSettings() { return renderTabOrderSettings; },
    get showGameToast() { return showGameToast; },
    get switchTab() { return switchTab; },
    get syncSocialChatNotificationSetting() { return syncSocialChatNotificationSetting; },
    get toggleDeathNoticeSetting() { return toggleDeathNoticeSetting; },
    get uiDisplay() { return uiDisplay; },
    get updateStaticUI() { return updateStaticUI; },
    get window() { return window; }
});
safeExposeGlobals({ settingsUi, syncMapCompleteActionQuickControl: settingsUi.syncMapCompleteActionQuickControl,
    openMapCompleteActionPicker: settingsUi.openMapCompleteActionPicker });
