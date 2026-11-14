import { createFeedback } from './browser/feedback.mjs';
// All legacy callers share one dialog queue and one held-toast queue.
const feedback = createFeedback({ window, document }, {
    translate: (...args) => _t(...args), sound: kind => playUiFeedbackSound(kind)
});
const { requestGameDialog, requestGameConfirmation, requestGameNumber, requestGameText, requestGameChoice, bindGamePicker, showGameToast } = feedback;
// Final bootstrap owns shutdown. Loading a save is not disposal.
requestGameDialog.dispose = feedback.dispose;
safeExposeGlobals({ requestGameDialog, requestGameConfirmation, requestGameNumber, requestGameText, requestGameChoice, bindGamePicker, showGameToast });
