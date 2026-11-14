import { salvageCandidates } from './system-tutorial-steps.mjs';
import { scheduleViewFrame } from './view-frames.mjs';

export function startShopSalvage(runtime, dialog, currency) {
    if (!dialog?.open || !salvageCandidates(runtime, currency).length || runtime.deps.game.isGuideReplay) return;
    const owner = runtime.deps.game, npc = runtime.deps.STORY_NPCS[dialog.dataset.npcId];
    dialog.close();
    runtime.deps.equipmentInventoryInteraction.focus(null);
    runtime.deps.tutorialActionUi.start({ ...runtime.state.guides.tutorial_salvage_gear, currency, onComplete: () => {
            if (!runtime.active || runtime.deps.game !== owner) return;
            (0, runtime.deps.showGameToast)((0, runtime.deps._t)('해체 재화를 얻었습니다.'), { tone: 'success' });
            scheduleViewFrame(runtime, () => {
                if (runtime.deps.game !== owner || !npc) return;
                (0, runtime.deps.openTabPane)('tab-trade');
                runtime.deps.contentUnlockUi.openNpc(npc, 'shop');
            });
    } });
}

export function offer(runtime, key) {
    const lesson = runtime.state.guides[key];
    if (runtime.deps.game.isGuideReplay || runtime.deps.tutorialActionUi.active || runtime.deps.activeTutorial || !lesson.view()) return false;
    if (runtime.deps.game.seenTutorials.includes('action_' + key) || runtime.deps.game.seenTutorials.includes('dismiss_' + key) || !lesson.available()) return false;
    runtime.deps.tutorialActionUi.start(lesson, false);
    return true;
}

export function visit(runtime, panel) {
    const keys = runtime.state.visits.get(panel);
    if (keys && !runtime.deps.game.isGuideReplay) scheduleViewFrame(runtime, () => keys.some(runtime.handlers.offer));
}

export function refreshSystemGuide(runtime, event) {
    const action = runtime.deps.tutorialActionUi.active;
    if (!runtime.state.guides[action?.notice.key] || (event.type === 'keydown' && event.key !== 'Escape')) return;
    scheduleViewFrame(runtime, () => { if (runtime.deps.tutorialActionUi.active === action) runtime.deps.tutorialActionUi.refresh(); });
}
