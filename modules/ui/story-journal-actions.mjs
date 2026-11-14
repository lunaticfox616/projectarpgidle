import { sceneHeading } from './story-journal-markup.mjs';

export function setAutoShow({ deps }, enabled) {
    deps.rules.setAutoShow(deps.game, enabled);
    deps.document.getElementById('chk-act-journal').checked = deps.game.settings.showActJournal;
    deps.document.getElementById('chk-hide-act-journal').checked = !deps.game.settings.showActJournal;
    deps.queueImportantSave(0);
}

export function syncStoryScenes(runtime) {
    const { deps } = runtime, owner = deps.game;
    for (const scene of deps.rules.sync(owner)) {
        if (!runtime.active || owner !== deps.game) return;
        deps.queueTutorialNotice('story_' + scene.id, deps._t(scene.title), scene.lines.map(line => deps._t(line)).join('\n\n'));
    }
}

export function foldPassedScenes(runtime) {
    return runtime.deps.rules.foldPassed(runtime.deps.game, runtime.deps.tutorialQueue).map(scene => sceneHeading(runtime, scene));
}
