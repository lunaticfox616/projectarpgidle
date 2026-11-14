import { MobileBattlePreview } from './mobile-battle-preview.mjs';
import { BattleCanvasInteraction } from './battle-canvas-interaction.mjs';
import { BattlePresentationLoop } from '../application/battle-presentation-loop.mjs';
import { pauseSettingOverlayOpen, tutorialPausingCombat } from './battle-presentation-gates.mjs';

export function createBattlePresentation(deps) {
    const preview = new MobileBattlePreview(deps), canvas = new BattleCanvasInteraction(deps);
    const loop = new BattlePresentationLoop(deps, preview);
    return Object.freeze({
        setMobileBattlePipCollapsed: preview.collapse.bind(preview),
        updateMobileBattlePipVisibility: preview.updateVisibility.bind(preview),
        refreshMobileBattlePip: preview.refresh.bind(preview),
        isMobileBattlePipVisible: preview.visible.bind(preview),
        renderMobileBattlePipFrame: preview.copy.bind(preview),
        startMobilePipRefreshLoop: preview.start.bind(preview),
        isPauseSettingOverlayOpen: () => pauseSettingOverlayOpen(deps),
        isTutorialPausingCombat: () => tutorialPausingCombat(deps),
        setupCanvasEvents: canvas.setup.bind(canvas),
        resizeCanvas: canvas.resize.bind(canvas),
        scheduleStableResize: canvas.scheduleResize.bind(canvas),
        renderBattlefieldThrottled: loop.throttle.bind(loop),
        scheduleGameLoop: loop.schedule.bind(loop),
        gameLoop: loop.tick,
        stopGameLoop: loop.stop.bind(loop),
        dispose() { loop.dispose(); preview.dispose(); canvas.dispose(); }
    });
}
