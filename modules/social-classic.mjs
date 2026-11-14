import { windowClearInterval, windowClearTimeout, windowRequestAnimationFrame, windowSetInterval, windowSetTimeout } from './browser/window-methods.mjs';
import * as data from './data/social.mjs';
import { SocialSessionState } from './state/social-session.mjs';
import { SocialLifecycle } from './browser/social-lifecycle.mjs';
import { SocialSession } from './ui/social-session.mjs';
import { SocialFormat } from './ui/social-format.mjs';
import { SocialReset } from './ui/social-reset.mjs';
import { SocialIdentity } from './ui/social-identity.mjs';
import { SocialProfileValues } from './ui/social-profile-values.mjs';
import { SocialSnapshot } from './ui/social-snapshot.mjs';
import { SocialStatsMarkup } from './ui/social-stats-markup.mjs';
import { SocialUpload } from './ui/social-upload.mjs';
import { SocialNickname } from './ui/social-nickname.mjs';
import { SocialChatStatus } from './ui/social-chat-status.mjs';
import { SocialPresenceMarkup } from './ui/social-presence-markup.mjs';
import { SocialPresence } from './ui/social-presence.mjs';
import { SocialBlocking } from './ui/social-blocking.mjs';
import { SocialNoticeView } from './ui/social-notice-view.mjs';
import { SocialNotifications } from './ui/social-notifications.mjs';
import { SocialChatData } from './ui/social-chat-data.mjs';
import { SocialSpecialCards } from './ui/social-special-cards.mjs';
import { SocialItemCards } from './ui/social-item-cards.mjs';
import { SocialChatMarkup } from './ui/social-chat-markup.mjs';
import { SocialPolling } from './ui/social-polling.mjs';
import { SocialRealtime } from './ui/social-realtime.mjs';
import { SocialBackground } from './ui/social-background.mjs';
import { SocialComposerControls } from './ui/social-composer-controls.mjs';
import { SocialAttachments } from './ui/social-attachments.mjs';
import { SocialScreen } from './ui/social-screen.mjs';
import { SocialScreenActions } from './ui/social-screen-actions.mjs';
import { SocialChatSend } from './ui/social-chat-send.mjs';
import { SocialProfileView } from './ui/social-profile-view.mjs';
import { SocialTooltip } from './ui/social-tooltip.mjs';
import { SocialStyles } from './ui/social-styles.mjs';

const state = new SocialSessionState();
const session = new SocialSession({
    get cloudJsonRequest() { return typeof cloudJsonRequest === 'undefined' ? undefined : cloudJsonRequest; },
    get cloudState() { return typeof cloudState === 'undefined' ? undefined : cloudState; },
}, state, data, {  });

const format = new SocialFormat({
    get CLASS_TEMPLATES() { return typeof CLASS_TEMPLATES === 'undefined' ? undefined : CLASS_TEMPLATES; },
    get escapeHTML() { return typeof escapeHTML === 'undefined' ? undefined : escapeHTML; },
    get getRarityColor() { return typeof getRarityColor === 'undefined' ? undefined : getRarityColor; },
}, state, data, {  });

const reset = new SocialReset({
    get clearInterval() { return typeof clearInterval === 'undefined' ? undefined : windowClearInterval; },
    get clearTimeout() { return typeof clearTimeout === 'undefined' ? undefined : windowClearTimeout; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get game() { return window.GameModules.state.game; },
}, state, data, {  });

const identity = new SocialIdentity({
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get localStorage() { return typeof localStorage === 'undefined' ? undefined : localStorage; },
}, state, data, { session, reset, format });

const profileValues = new SocialProfileValues({
    get formatJewelStatValue() { return typeof formatJewelStatValue === 'undefined' ? undefined : formatJewelStatValue; },
    get formatValue() { return typeof formatValue === 'undefined' ? undefined : formatValue; },
    get gardenOils() { return typeof gardenOils === 'undefined' ? undefined : gardenOils; },
    get getStatName() { return typeof getStatName === 'undefined' ? undefined : getStatName; },
    get getWeaponCategoryName() { return typeof getWeaponCategoryName === 'undefined' ? undefined : getWeaponCategoryName; },
    get weaponCategorySlotLabel() { return typeof weaponCategorySlotLabel === 'undefined' ? undefined : weaponCategorySlotLabel; },
    get window() { return typeof window === 'undefined' ? undefined : window; },
}, state, data, { format });

const snapshot = new SocialSnapshot({
    get console() { return console; },
    get CLASS_TEMPLATES() { return typeof CLASS_TEMPLATES === 'undefined' ? undefined : CLASS_TEMPLATES; },
    get COMPARE_STAT_META() { return typeof COMPARE_STAT_META === 'undefined' ? undefined : COMPARE_STAT_META; },
    get PLAYER_CLASS_DEFS() { return typeof PLAYER_CLASS_DEFS === 'undefined' ? undefined : PLAYER_CLASS_DEFS; },
    get STUMP_BOX_GRAFT() { return typeof STUMP_BOX_GRAFT === 'undefined' ? undefined : STUMP_BOX_GRAFT; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get bagItems() { return typeof bagItems === 'undefined' ? undefined : bagItems; },
    get colonyWards() { return typeof colonyWards === 'undefined' ? undefined : colonyWards; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get contentProgression() { return typeof contentProgression === 'undefined' ? undefined : contentProgression; },
    get coreItems() { return typeof coreItems === 'undefined' ? undefined : coreItems; },
    get equipmentCrafting() { return typeof equipmentCrafting === 'undefined' ? undefined : equipmentCrafting; },
    get equipmentSockets() { return typeof equipmentSockets === 'undefined' ? undefined : equipmentSockets; },
    get game() { return window.GameModules.state.game; },
    get getAscendKeystoneName() { return typeof getAscendKeystoneName === 'undefined' ? undefined : getAscendKeystoneName; },
    get getAscendKeystoneOwnerClass() { return typeof getAscendKeystoneOwnerClass === 'undefined' ? undefined : getAscendKeystoneOwnerClass; },
    get getItemBaseChainInfo() { return typeof getItemBaseChainInfo === 'undefined' ? undefined : getItemBaseChainInfo; },
    get getItemCraftTier() { return typeof getItemCraftTier === 'undefined' ? undefined : getItemCraftTier; },
    get getJewelStats() { return typeof getJewelStats === 'undefined' ? undefined : getJewelStats; },
    get getJewelUniqueEffectText() { return typeof getJewelUniqueEffectText === 'undefined' ? undefined : getJewelUniqueEffectText; },
    get getPlayerStats() { return typeof getPlayerStats === 'undefined' ? undefined : getPlayerStats; },
    get getSaveLoopNumber() { return typeof getSaveLoopNumber === 'undefined' ? undefined : getSaveLoopNumber; },
    get getWorldTreeBarkEffect() { return typeof getWorldTreeBarkEffect === 'undefined' ? undefined : getWorldTreeBarkEffect; },
    get isFixedEquipmentAffix() { return typeof isFixedEquipmentAffix === 'undefined' ? undefined : isFixedEquipmentAffix; },
    get levelProgression() { return typeof levelProgression === 'undefined' ? undefined : levelProgression; },
    get previewBuildStats() { return typeof previewBuildStats === 'undefined' ? undefined : previewBuildStats; },
    get stumpBox() { return typeof stumpBox === 'undefined' ? undefined : stumpBox; },
    get talismanEffects() { return typeof talismanEffects === 'undefined' ? undefined : talismanEffects; },
    get talismans() { return typeof talismans === 'undefined' ? undefined : talismans; },
}, state, data, { profileValues, format, identity });

const statsMarkup = new SocialStatsMarkup({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get window() { return typeof window === 'undefined' ? undefined : window; },
}, state, data, { format });

const upload = new SocialUpload({
    get clearTimeout() { return typeof clearTimeout === 'undefined' ? undefined : windowClearTimeout; },
    get cloudJsonRequest() { return typeof cloudJsonRequest === 'undefined' ? undefined : cloudJsonRequest; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get game() { return window.GameModules.state.game; },
    get gameplayStarted() { return typeof gameplayStarted === 'undefined' ? undefined : gameplayStarted; },
    get setTimeout() { return typeof setTimeout === 'undefined' ? undefined : windowSetTimeout; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
    get startupOverlayActive() { return typeof startupOverlayActive === 'undefined' ? undefined : startupOverlayActive; },
}, state, data, { session, snapshot, identity });

const nickname = new SocialNickname({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get cloudJsonRequest() { return typeof cloudJsonRequest === 'undefined' ? undefined : cloudJsonRequest; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
}, state, data, { session, identity });

const chatStatus = new SocialChatStatus({
    get console() { return console; },
    get URLSearchParams() { return typeof URLSearchParams === 'undefined' ? undefined : URLSearchParams; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get game() { return window.GameModules.state.game; },
    get localStorage() { return typeof localStorage === 'undefined' ? undefined : localStorage; },
    get location() { return typeof location === 'undefined' ? undefined : location; },
    get messageFrames() { return typeof messageFrames === 'undefined' ? undefined : messageFrames; },
}, state, data, {  });

const presenceMarkup = new SocialPresenceMarkup({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get i18n() { return typeof i18n === 'undefined' ? undefined : i18n; },
}, state, data, { session, format });

const presence = new SocialPresence({
    get console() { return console; },
    get clearTimeout() { return typeof clearTimeout === 'undefined' ? undefined : windowClearTimeout; },
    get cloudJsonRequest() { return typeof cloudJsonRequest === 'undefined' ? undefined : cloudJsonRequest; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get setInterval() { return typeof setInterval === 'undefined' ? undefined : windowSetInterval; },
    get setTimeout() { return typeof setTimeout === 'undefined' ? undefined : windowSetTimeout; },
}, state, data, { session, identity, chatStatus, presenceMarkup });

const blocking = new SocialBlocking({
    get console() { return console; },
    get localStorage() { return typeof localStorage === 'undefined' ? undefined : localStorage; },
}, state, data, {  });

const noticeView = new SocialNoticeView({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get game() { return window.GameModules.state.game; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
    get updateTabNotificationDots() { return typeof updateTabNotificationDots === 'undefined' ? undefined : updateTabNotificationDots; },
}, state, data, { session, chatStatus, blocking });

const notifications = new SocialNotifications({
    get cloudJsonRequest() { return typeof cloudJsonRequest === 'undefined' ? undefined : cloudJsonRequest; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get game() { return window.GameModules.state.game; },
    get setInterval() { return typeof setInterval === 'undefined' ? undefined : windowSetInterval; },
}, state, data, { session, chatStatus, noticeView });

const chatData = new SocialChatData({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get cloudJsonRequest() { return typeof cloudJsonRequest === 'undefined' ? undefined : cloudJsonRequest; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
}, state, data, { session });

const specialCards = new SocialSpecialCards({
    get CORE_ITEM_RULES() { return typeof CORE_ITEM_RULES === 'undefined' ? undefined : CORE_ITEM_RULES; },
    get STUMP_BOX_COLORS() { return typeof STUMP_BOX_COLORS === 'undefined' ? undefined : STUMP_BOX_COLORS; },
    get STUMP_BOX_SCAR() { return typeof STUMP_BOX_SCAR === 'undefined' ? undefined : STUMP_BOX_SCAR; },
    get TALISMAN_RARITY_TONES() { return typeof TALISMAN_RARITY_TONES === 'undefined' ? undefined : TALISMAN_RARITY_TONES; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get window() { return typeof window === 'undefined' ? undefined : window; },
}, state, data, { format, profileValues });

const itemCards = new SocialItemCards({
    get COLONY_WARD_RULES() { return typeof COLONY_WARD_RULES === 'undefined' ? undefined : COLONY_WARD_RULES; },
    get EMBER_CORRUPTION_TONE() { return typeof EMBER_CORRUPTION_TONE === 'undefined' ? undefined : EMBER_CORRUPTION_TONE; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get colonyWards() { return typeof colonyWards === 'undefined' ? undefined : colonyWards; },
    get equipmentCrafting() { return typeof equipmentCrafting === 'undefined' ? undefined : equipmentCrafting; },
    get getBaseStepClassName() { return typeof getBaseStepClassName === 'undefined' ? undefined : getBaseStepClassName; },
    get getExceptionalBaseStars() { return typeof getExceptionalBaseStars === 'undefined' ? undefined : getExceptionalBaseStars; },
    get getTierBadgeHtml() { return typeof getTierBadgeHtml === 'undefined' ? undefined : getTierBadgeHtml; },
    get itemTooltipRules() { return typeof itemTooltipRules === 'undefined' ? undefined : itemTooltipRules; },
}, state, data, { format, profileValues, specialCards });

const chatMarkup = new SocialChatMarkup({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get game() { return window.GameModules.state.game; },
    get requestAnimationFrame() { return typeof requestAnimationFrame === 'undefined' ? undefined : windowRequestAnimationFrame; },
    get setTimeout() { return typeof setTimeout === 'undefined' ? undefined : windowSetTimeout; },
}, state, data, { format, itemCards, session, chatStatus, noticeView, blocking });

const polling = new SocialPolling({
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get setInterval() { return typeof setInterval === 'undefined' ? undefined : windowSetInterval; },
    get setTimeout() { return typeof setTimeout === 'undefined' ? undefined : windowSetTimeout; },
}, state, data, { chatStatus, chatMarkup, chatData, session, presence, reset });

const realtime = new SocialRealtime({
    get clearTimeout() { return typeof clearTimeout === 'undefined' ? undefined : windowClearTimeout; },
    get cloudState() { return typeof cloudState === 'undefined' ? undefined : cloudState; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get game() { return window.GameModules.state.game; },
    get setTimeout() { return typeof setTimeout === 'undefined' ? undefined : windowSetTimeout; },
    get window() { return typeof window === 'undefined' ? undefined : window; },
}, state, data, { chatData, session, chatStatus, noticeView, chatMarkup, presence, reset, polling });

const background = new SocialBackground({
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get game() { return window.GameModules.state.game; },
}, state, data, { chatStatus, noticeView, notifications, realtime, session, identity, upload, nickname, presence, reset, polling });

const composerControls = new SocialComposerControls({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
}, state, data, { session, identity });

const attachments = new SocialAttachments({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get bagItems() { return typeof bagItems === 'undefined' ? undefined : bagItems; },
    get colonyWards() { return typeof colonyWards === 'undefined' ? undefined : colonyWards; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get game() { return window.GameModules.state.game; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
    get stumpBox() { return typeof stumpBox === 'undefined' ? undefined : stumpBox; },
}, state, data, { snapshot, identity, format });

const screen = new SocialScreen({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get cloudState() { return typeof cloudState === 'undefined' ? undefined : cloudState; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get selectionDialog() { return typeof selectionDialog === 'undefined' ? undefined : selectionDialog; },
}, state, data, { session, identity, nickname, presence, background, composerControls, attachments, polling, reset, format, blocking });

const screenActions = new SocialScreenActions({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get addLog() { return typeof addLog === 'undefined' ? undefined : addLog; },
    get requestGameText() { return typeof requestGameText === 'undefined' ? undefined : requestGameText; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
    get withDirectionParticle() { return typeof withDirectionParticle === 'undefined' ? undefined : withDirectionParticle; },
}, state, data, { session, identity, upload, nickname, screen, polling, blocking, chatMarkup });

const chatSend = new SocialChatSend({
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get cloudJsonRequest() { return typeof cloudJsonRequest === 'undefined' ? undefined : cloudJsonRequest; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
}, state, data, { session, identity, upload, screenActions, nickname, screen, attachments, composerControls, presence, chatData, polling });

const profileView = new SocialProfileView({
    get BASE_ITEM_DB() { return typeof BASE_ITEM_DB === 'undefined' ? undefined : BASE_ITEM_DB; },
    get CORE_ITEM_RULES() { return typeof CORE_ITEM_RULES === 'undefined' ? undefined : CORE_ITEM_RULES; },
    get ITEM_VISUAL_ASSET_DB() { return typeof ITEM_VISUAL_ASSET_DB === 'undefined' ? undefined : ITEM_VISUAL_ASSET_DB; },
    get STUMP_BOX_COLORS() { return typeof STUMP_BOX_COLORS === 'undefined' ? undefined : STUMP_BOX_COLORS; },
    get STUMP_BOX_STAGES() { return typeof STUMP_BOX_STAGES === 'undefined' ? undefined : STUMP_BOX_STAGES; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get cloudJsonRequest() { return typeof cloudJsonRequest === 'undefined' ? undefined : cloudJsonRequest; },
    get contentProgression() { return typeof contentProgression === 'undefined' ? undefined : contentProgression; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get game() { return window.GameModules.state.game; },
    get getEquipmentGridVisualAsset() { return typeof getEquipmentGridVisualAsset === 'undefined' ? undefined : getEquipmentGridVisualAsset; },
    get i18n() { return typeof i18n === 'undefined' ? undefined : i18n; },
    get isMapPrimaryContentUnlocked() { return typeof isMapPrimaryContentUnlocked === 'undefined' ? undefined : isMapPrimaryContentUnlocked; },
    get selectionDialog() { return typeof selectionDialog === 'undefined' ? undefined : selectionDialog; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
    get weaponCategorySlotLabel() { return typeof weaponCategorySlotLabel === 'undefined' ? undefined : weaponCategorySlotLabel; },
}, state, data, { reset, session, identity, upload, screenActions, nickname, format, profileValues, itemCards, specialCards, statsMarkup, blocking, chatMarkup });

const tooltip = new SocialTooltip({
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get uiDisplay() { return typeof uiDisplay === 'undefined' ? undefined : uiDisplay; },
    get window() { return typeof window === 'undefined' ? undefined : window; },
}, state, data, { reset, profileView });

const styles = new SocialStyles({
    get document() { return typeof document === 'undefined' ? undefined : document; },
}, state, data, {  });

const legacyNames = {
    SOCIAL_NICK_KEY: data.SOCIAL_NICK_KEY,
    SOCIAL_LAST_SEEN_CHAT_KEY: data.SOCIAL_LAST_SEEN_CHAT_KEY,
    SOCIAL_CHAT_LIMIT: data.SOCIAL_CHAT_LIMIT,
    SOCIAL_CHAT_POLL_MS: data.SOCIAL_CHAT_POLL_MS,
    SOCIAL_ONLINE_POLL_MS: data.SOCIAL_ONLINE_POLL_MS,
    SOCIAL_CHAT_FULL_SYNC_MS: data.SOCIAL_CHAT_FULL_SYNC_MS,
    SOCIAL_CHAT_FORGET_MS: data.SOCIAL_CHAT_FORGET_MS,
    SOCIAL_CHAT_LIVE_POLL_MS: data.SOCIAL_CHAT_LIVE_POLL_MS,
    SOCIAL_CHAT_LIVE_HIDDEN_MS: data.SOCIAL_CHAT_LIVE_HIDDEN_MS,
    SOCIAL_CHAT_LIVE_MISSES: data.SOCIAL_CHAT_LIVE_MISSES,
    SOCIAL_CHAT_LIVE_SETTLE_MS: data.SOCIAL_CHAT_LIVE_SETTLE_MS,
    SOCIAL_BG_NOTI_POLL_MS: data.SOCIAL_BG_NOTI_POLL_MS,
    SOCIAL_CHAT_TOAST_MS: data.SOCIAL_CHAT_TOAST_MS,
    SOCIAL_CHAT_TOAST_GAP_MS: data.SOCIAL_CHAT_TOAST_GAP_MS,
    SOCIAL_MSG_MAX: data.SOCIAL_MSG_MAX,
    SOCIAL_NICK_MIN: data.SOCIAL_NICK_MIN,
    SOCIAL_NICK_MAX: data.SOCIAL_NICK_MAX,
    SOCIAL_SEND_MIN_INTERVAL_MS: data.SOCIAL_SEND_MIN_INTERVAL_MS,
    SOCIAL_SEND_MAX_PER_MIN: data.SOCIAL_SEND_MAX_PER_MIN,
    SOCIAL_MAX_ITEMS_PER_MSG: data.SOCIAL_MAX_ITEMS_PER_MSG,
    SOCIAL_TALISMAN_LINE_LIMIT: data.SOCIAL_TALISMAN_LINE_LIMIT,
    SOCIAL_LEGACY_ITEM_LINE_LIMIT: data.SOCIAL_LEGACY_ITEM_LINE_LIMIT,
    SOCIAL_ITEM_ARRAY_LIMITS: data.SOCIAL_ITEM_ARRAY_LIMITS,
    SOCIAL_PROFILE_SYNC_DELAY_MS: data.SOCIAL_PROFILE_SYNC_DELAY_MS,
    SOCIAL_HEARTBEAT_MS: data.SOCIAL_HEARTBEAT_MS,
    SOCIAL_ONLINE_WINDOW_S: data.SOCIAL_ONLINE_WINDOW_S,
    SOCIAL_RECENT_WINDOW_S: data.SOCIAL_RECENT_WINDOW_S,
    SOCIAL_CHAT_RETENTION_MS: data.SOCIAL_CHAT_RETENTION_MS,
    SOCIAL_ITEM_TOKEN_RE: data.SOCIAL_ITEM_TOKEN_RE,
    SOCIAL_NICK_RE: data.SOCIAL_NICK_RE,
    SOCIAL_EQUIP_SLOTS: data.SOCIAL_EQUIP_SLOTS,
    SOCIAL_BLOCKED_KEY: data.SOCIAL_BLOCKED_KEY,
    PROFILE_STAT_KEYS: data.PROFILE_STAT_KEYS,
    PROFILE_STAT_ICONS: data.PROFILE_STAT_ICONS,
    PROFILE_STAT_GROUPS: data.PROFILE_STAT_GROUPS,
    PROFILE_STAT_TONES: data.PROFILE_STAT_TONES,
    SOCIAL_CHAT_ERROR_TEXTS: data.SOCIAL_CHAT_ERROR_TEXTS,
    socialChatMaxId: data.socialChatMaxId,
    PROFILE_TALISMAN_STATES: data.PROFILE_TALISMAN_STATES,
    PROFILE_OFF_STYLE: data.PROFILE_OFF_STYLE,
    PROFILE_TALISMAN_RARITY: data.PROFILE_TALISMAN_RARITY,
    profileOwn: data.profileOwn,
    PROFILE_CORE_TONE: data.PROFILE_CORE_TONE,
    PROFILE_STUMP_CELLS: data.PROFILE_STUMP_CELLS,
    CHAT_SETTINGS_ID: data.CHAT_SETTINGS_ID,
    socialLoggedInUserId: session.socialLoggedInUserId,
    socialCloudReady: session.socialCloudReady,
    getMyNickname: identity.getMyNickname,
    socialClassLabel: format.socialClassLabel,
    buildItemSnapshot: snapshot.buildItemSnapshot,
    profileSnapshotIsOwn: upload.profileSnapshotIsOwn,
    uploadPlayerProfile: upload.uploadPlayerProfile,
    syncPlayerProfileQuiet: upload.syncPlayerProfileQuiet,
    syncInitialPlayerProfile: upload.syncInitialPlayerProfile,
    syncPlayerProfile: screenActions.syncPlayerProfile,
    promptAndSetNickname: screenActions.promptAndSetNickname,
    restoreNicknameFromServer: nickname.restoreNicknameFromServer,
    sendPresenceHeartbeat: presence.sendPresenceHeartbeat,
    refreshOnlineUsers: presence.refreshOnlineUsers,
    isSocialTabActive: chatStatus.isSocialTabActive,
    checkSocialChatNotification: notifications.checkSocialChatNotification,
    syncSocialChatNotificationSetting: background.syncSocialChatNotificationSetting,
    syncSocialBackgroundTasks: background.syncSocialBackgroundTasks,
    syncLiveChat: realtime.syncLiveChat,
    unblockUser: screenActions.unblockUser,
    sendChatMessage: chatSend.sendChatMessage,
    getChatAttachSnapshot: attachments.getChatAttachSnapshot,
    attachChatSnapshot: attachments.attachChatSnapshot,
    attachChatItem: attachments.attachChatItem,
    attachChatItemOf: attachments.attachChatItemOf,
    removePendingChatItem: attachments.removePendingChatItem,
    updateChatCounter: attachments.updateChatCounter,
    renderChatMessages: chatMarkup.renderChatMessages,
    forgetSocialChatMessages: polling.forgetSocialChatMessages,
    refreshChatPanel: polling.refreshChatPanel,
    startChatPolling: polling.startChatPolling,
    stopChatPolling: reset.stopChatPolling,
    syncSocialChatPolling: background.syncSocialChatPolling,
    onSocialChatKeydown: chatSend.onSocialChatKeydown,
    ensureSocialTooltip: tooltip.ensureSocialTooltip,
    showSocialTip: tooltip.showSocialTip,
    moveSocialTip: tooltip.moveSocialTip,
    hideSocialTip: reset.hideSocialTip,
    openTipModal: tooltip.openTipModal,
    renderProfileItemCard: itemCards.renderProfileItemCard,
    closePlayerProfile: reset.closePlayerProfile,
    openMyProfilePreview: profileView.openMyProfilePreview,
    switchProfileTab: profileView.switchProfileTab,
    renderProfileActionsRow: profileView.renderProfileActionsRow,
    toggleProfileBlock: profileView.toggleProfileBlock,
    openPlayerProfile: profileView.openPlayerProfile,
    renderSocialTab: screen.renderSocialTab,
    openChatSettings: screen.openChatSettings,
    injectSocialStyles: styles.injectSocialStyles,
    get socialState() { return state.current; },
};
const stateDescriptor = { configurable: true, get: () => state.current, set: value => { state.current = value; } };
Object.defineProperty(window, 'socialState', stateDescriptor);
if (globalThis !== window) Object.defineProperty(globalThis, 'socialState', stateDescriptor);
safeExposeGlobals(legacyNames);
if (globalThis !== window) Object.assign(globalThis, legacyNames);
const lifecycle = new SocialLifecycle({ document, console, setTimeout: windowSetTimeout, clearTimeout: windowClearTimeout }, state, { reset, styles, tooltip, background, realtime });
window.GameModules.social = { state, lifecycle, session, format, reset, identity, profileValues, snapshot, statsMarkup, upload, nickname, chatStatus, presenceMarkup, presence, blocking, noticeView, notifications, chatData, specialCards, itemCards, chatMarkup, polling, realtime, background, composerControls, attachments, screen, screenActions, chatSend, profileView, tooltip, styles };
lifecycle.start();
