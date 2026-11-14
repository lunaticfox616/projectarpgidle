import { windowClearTimeout, windowSetTimeout } from './browser/window-methods.mjs';
import { CloudAccountRequest } from './application/cloud-account-request.mjs';
import { CloudToolsFormat } from './ui/cloud-tools-format.mjs';
import { CloudPlayerView } from './ui/cloud-player-view.mjs';
import { CloudOpsView } from './ui/cloud-ops-view.mjs';
import { CloudFeedbackView } from './ui/cloud-feedback-view.mjs';
import { CloudToolsDialog } from './ui/cloud-tools-dialog.mjs';
import { CloudAccountMaintenance } from './application/cloud-account-maintenance.mjs';
import { CloudModeration } from './application/cloud-moderation.mjs';
import { CloudFeedback } from './application/cloud-feedback.mjs';
import { CloudPlayerLookup } from './application/cloud-player-lookup.mjs';
import { CloudOpsDashboard } from './application/cloud-ops-dashboard.mjs';
import { CloudToolsController } from './ui/cloud-tools-controller.mjs';
const state = { active: true, adminFeedbackFilter: '', playerDetailUserId: null };
const deps = {
    get clearTimeout() { return windowClearTimeout; },
    get Blob() { return typeof Blob === 'undefined' ? undefined : Blob; },
    get CLASS_TEMPLATES() { return typeof CLASS_TEMPLATES === 'undefined' ? undefined : CLASS_TEMPLATES; },
    get URL() { return typeof URL === 'undefined' ? undefined : URL; },
    get URLSearchParams() { return typeof URLSearchParams === 'undefined' ? undefined : URLSearchParams; },
    get _t() { return typeof _t === 'undefined' ? undefined : _t; },
    get assertCloudSaveContext() { return typeof assertCloudSaveContext === 'undefined' ? undefined : assertCloudSaveContext; },
    get cancelScheduledCloudSync() { return typeof cancelScheduledCloudSync === 'undefined' ? undefined : cancelScheduledCloudSync; },
    get captureCloudSaveContext() { return typeof captureCloudSaveContext === 'undefined' ? undefined : captureCloudSaveContext; },
    get clearCloudSessionLocally() { return typeof clearCloudSessionLocally === 'undefined' ? undefined : clearCloudSessionLocally; },
    get cloudJsonRequest() { return typeof cloudJsonRequest === 'undefined' ? undefined : cloudJsonRequest; },
    get cloudState() { return typeof cloudState === 'undefined' ? undefined : cloudState; },
    get console() { return typeof console === 'undefined' ? undefined : console; },
    get document() { return typeof document === 'undefined' ? undefined : document; },
    get escapeHTML() { return typeof escapeHTML === 'undefined' ? undefined : escapeHTML; },
    get forgetDeletedAccountSave() { return typeof forgetDeletedAccountSave === 'undefined' ? undefined : forgetDeletedAccountSave; },
    get forgetSocialChatMessages() { return typeof forgetSocialChatMessages === 'undefined' ? undefined : forgetSocialChatMessages; },
    get getClientDiagnosticContext() { return typeof getClientDiagnosticContext === 'undefined' ? undefined : getClientDiagnosticContext; },
    get getLocalCloudRevision() { return typeof getLocalCloudRevision === 'undefined' ? undefined : getLocalCloudRevision; },
    get getLocalSaveStatus() { return typeof getLocalSaveStatus === 'undefined' ? undefined : getLocalSaveStatus; },
    get getPlaytestBuildVersion() { return typeof getPlaytestBuildVersion === 'undefined' ? undefined : getPlaytestBuildVersion; },
    get getSupabaseClient() { return typeof getSupabaseClient === 'undefined' ? undefined : getSupabaseClient; },
    get i18n() { return typeof i18n === 'undefined' ? undefined : i18n; },
    get location() { return typeof location === 'undefined' ? undefined : location; },
    get navigator() { return typeof navigator === 'undefined' ? undefined : navigator; },
    get pullCloudSave() { return typeof pullCloudSave === 'undefined' ? undefined : pullCloudSave; },
    get requestGameConfirmation() { return typeof requestGameConfirmation === 'undefined' ? undefined : requestGameConfirmation; },
    get requestGameText() { return typeof requestGameText === 'undefined' ? undefined : requestGameText; },
    get saveGame() { return typeof saveGame === 'undefined' ? undefined : saveGame; },
    get setCloudMessage() { return typeof setCloudMessage === 'undefined' ? undefined : setCloudMessage; },
    get setTimeout() { return typeof setTimeout === 'undefined' ? undefined : windowSetTimeout; },
    get showGameToast() { return typeof showGameToast === 'undefined' ? undefined : showGameToast; },
    get socialState() { return typeof socialState === 'undefined' ? undefined : socialState; },
    get updateCloudSaveUI() { return typeof updateCloudSaveUI === 'undefined' ? undefined : updateCloudSaveUI; },
    get window() { return typeof window === 'undefined' ? undefined : window; },
};
const session = new CloudAccountRequest(window.GameModules.cloudAccountState, state, (path, options) => cloudJsonRequest(path, options));
const format = new CloudToolsFormat(deps, {  }, state);
const playerView = new CloudPlayerView(deps, { format }, state);
const opsView = new CloudOpsView(deps, { format, playerView }, state);
const feedbackView = new CloudFeedbackView(deps, { format }, state);
const dialog = new CloudToolsDialog(deps, {  }, state);
const maintenance = new CloudAccountMaintenance(deps, { session, dialog, format }, state);
const moderation = new CloudModeration(deps, { session, opsView, format }, state);
const feedback = new CloudFeedback(deps, { session, dialog, feedbackView, format }, state);
const players = new CloudPlayerLookup(deps, { session, playerView, format }, state);
const dashboard = new CloudOpsDashboard(deps, { session, dialog, opsView, moderation, feedback, players, format }, state);
const controller = new CloudToolsController(deps, { dialog, moderation, feedback, players, dashboard, session }, state);
// These aliases retire when remaining classic UI consumers use this application directly.
window.GameModules.cloudTools = Object.freeze({
    dispose: () => controller.dispose(),
    closeCloudToolsDialog: dialog.closeCloudToolsDialog.bind(dialog),
    openCloudSaveHistory: maintenance.openCloudSaveHistory.bind(maintenance),
    restoreCloudSaveVersion: maintenance.restoreCloudSaveVersion.bind(maintenance),
    deleteCloudAccount: maintenance.deleteCloudAccount.bind(maintenance),
    openAccountDeletionRequest: maintenance.openAccountDeletionRequest.bind(maintenance),
    forgetDeletedAccountSession: maintenance.forgetDeletedAccountSession.bind(maintenance),
    setCheatHold: moderation.setCheatHold.bind(moderation),
    reportCurrentProfile: moderation.reportCurrentProfile.bind(moderation),
    clearCheatFlags: moderation.clearCheatFlags.bind(moderation),
    setBannedTerm: moderation.setBannedTerm.bind(moderation),
    setChatMuteByNickname: moderation.setChatMuteByNickname.bind(moderation),
    peekPlayerChat: moderation.peekPlayerChat.bind(moderation),
    setChatMute: moderation.setChatMute.bind(moderation),
    deleteChatMessage: moderation.deleteChatMessage.bind(moderation),
    clearAllChat: moderation.clearAllChat.bind(moderation),
    openOpsDashboard: dashboard.openOpsDashboard.bind(dashboard),
    jumpToOpsSection: dashboard.jumpToOpsSection.bind(dashboard),
    openFeedbackDialog: feedback.openFeedbackDialog.bind(feedback),
    submitPlayerFeedback: feedback.submitPlayerFeedback.bind(feedback),
    setAdminFeedbackFilter: feedback.setAdminFeedbackFilter.bind(feedback),
    setFeedbackStatus: feedback.setFeedbackStatus.bind(feedback),
    replyFeedback: feedback.replyFeedback.bind(feedback),
    searchPlayers: players.searchPlayers.bind(players),
    openPlayerDetail: players.openPlayerDetail.bind(players),
    downloadPlayerSave: players.downloadPlayerSave.bind(players),
    initializeCloudTools: controller.initializeCloudTools.bind(controller),
});
safeExposeGlobals({
    closeCloudToolsDialog: window.GameModules.cloudTools.closeCloudToolsDialog,
    openCloudSaveHistory: window.GameModules.cloudTools.openCloudSaveHistory,
    restoreCloudSaveVersion: window.GameModules.cloudTools.restoreCloudSaveVersion,
    deleteCloudAccount: window.GameModules.cloudTools.deleteCloudAccount,
    openAccountDeletionRequest: window.GameModules.cloudTools.openAccountDeletionRequest,
    forgetDeletedAccountSession: window.GameModules.cloudTools.forgetDeletedAccountSession,
    setCheatHold: window.GameModules.cloudTools.setCheatHold,
    reportCurrentProfile: window.GameModules.cloudTools.reportCurrentProfile,
    clearCheatFlags: window.GameModules.cloudTools.clearCheatFlags,
    setBannedTerm: window.GameModules.cloudTools.setBannedTerm,
    setChatMuteByNickname: window.GameModules.cloudTools.setChatMuteByNickname,
    peekPlayerChat: window.GameModules.cloudTools.peekPlayerChat,
    setChatMute: window.GameModules.cloudTools.setChatMute,
    deleteChatMessage: window.GameModules.cloudTools.deleteChatMessage,
    clearAllChat: window.GameModules.cloudTools.clearAllChat,
    openOpsDashboard: window.GameModules.cloudTools.openOpsDashboard,
    jumpToOpsSection: window.GameModules.cloudTools.jumpToOpsSection,
    openFeedbackDialog: window.GameModules.cloudTools.openFeedbackDialog,
    submitPlayerFeedback: window.GameModules.cloudTools.submitPlayerFeedback,
    setAdminFeedbackFilter: window.GameModules.cloudTools.setAdminFeedbackFilter,
    setFeedbackStatus: window.GameModules.cloudTools.setFeedbackStatus,
    replyFeedback: window.GameModules.cloudTools.replyFeedback,
    searchPlayers: window.GameModules.cloudTools.searchPlayers,
    openPlayerDetail: window.GameModules.cloudTools.openPlayerDetail,
    downloadPlayerSave: window.GameModules.cloudTools.downloadPlayerSave,
    initializeCloudTools: window.GameModules.cloudTools.initializeCloudTools,
});
controller.install();
