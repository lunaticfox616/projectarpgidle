import { createExplorationObjectActions } from './ui/exploration-objects.mjs';

const native = createExplorationObjectActions({
    get actExplorationState() { return actExplorationState; },
    get actExplorationSight() { return actExplorationSight; },
    get stageObjects() { return stageObjects.renderer; },
    get stageActors() { return stageActors; },
    get targetMarks() { return targetMarks; },
    get performance() { return performance; },
    get getCombatTime() { return getCombatTime; },
    get i18n() { return i18n; },
    get drawCrispCanvasText() { return drawCrispCanvasText; },
    get document() { return document; },
    get events() { return window; },
    get _t() { return _t; },
    get addLog() { return addLog; },
    // Resolve the current game at the action boundary, not when the DOM button was created.
    request: id => actExplorationProgress.objects.request(id)
});
native.install();
actExplorationView.objects = {
    append: (actors, view) => native.append(game, actors, view),
    flushButtons: () => native.flushButtons(game),
    draw: (ctx, actor, view) => native.draw(game, ctx, actor, view),
    drawGround: (ctx, run, p, area) => native.drawGround(game, ctx, run, p, area),
    renderer: Object.freeze({ append: native.append, draw: native.draw, drawGround: native.drawGround }),
    lifecycle: Object.freeze({ install: native.install, dispose: native.dispose })
};
