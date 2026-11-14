import { mark } from './opening-lessons.mjs';
import { listenView, releaseViewTarget } from './view-events.mjs';
import { scheduleViewFrame, cancelViewFrames } from './view-frames.mjs';

/** The prologue as a short scene: the plate drifts in out of the dark, the verdict and two lines of narration rise one by one;
 * a press shows the rest at once, the next press (or 건너뛰기) fades to black and the dark lifts off the stage behind. */
export function startIntro(runtime) {
    const replaced = [...runtime.state.REPLACED, ...runtime.state.STAGE_REPLACED];
    replaced.forEach(runtime.handlers.mark);
    for (let i = runtime.deps.tutorialQueue.length - 1; i >= 0; i--) if (replaced.includes(runtime.deps.tutorialQueue[i].key)) runtime.deps.tutorialQueue.splice(i, 1);
    if (runtime.deps.activeTutorial && replaced.includes(runtime.deps.activeTutorial.key)) (0, runtime.deps.dismissTutorial)(false);
    runtime.deps.contentProgression.opening.enroll(runtime.deps.game);
    (0, runtime.deps.updateTabUnlockButtons)();
    runtime.state.heldAuto = { settings: runtime.deps.game.settings, autoMove: runtime.deps.game.settings.autoMove };
    runtime.deps.game.settings.autoMove = false;
    runtime.deps.stageActors.preloadRise(runtime.deps.game.selectedClassId);
    runtime.deps.stageActors.setRise({ start: null }); // the stage under the intro already shows the hero lying when the dark lifts
    runtime.state.introReturnFocus = runtime.deps.document.activeElement;
    runtime.state.introOwner = runtime.deps.game;
    runtime.state.intro = runtime.deps.document.createElement('dialog');
    runtime.state.intro.id = 'opening-intro';
    runtime.state.intro.className = 'opening-intro';
    runtime.state.intro.setAttribute('aria-label', (0, runtime.deps._t)('프롤로그'));
    runtime.state.intro.innerHTML = introHtml(runtime);
    listenView(runtime, runtime.state.intro, 'click', event => (event.target.closest('[data-opening-skip]') ? endIntro(runtime) : advanceIntro(runtime)));
    listenView(runtime, runtime.state.intro, 'cancel', event => { event.preventDefault(); endIntro(runtime); });
    runtime.deps.document.body.appendChild(runtime.state.intro);
    runtime.state.intro.showModal();
    runtime.state.intro.querySelector('[data-opening-next]').focus({ preventScroll: true });
    const scene = runtime.state.intro;
    scheduleViewFrame(runtime, () => scheduleViewFrame(runtime, () => {
        if (runtime.state.intro === scene) scene.classList.add('is-playing');
    }));
}

export function introHtml(runtime) {
    const scene = runtime.deps.STORY_JOURNAL_SCENES.find(row => row.id === 'prologue'), quote = runtime.deps.STORY_SCENE_QUOTES.prologue;
    const title = (0, runtime.deps._t)(scene.title).split(', ').pop(), verdict = quote.lines.filter(text => text.startsWith('“')).map(text => (0, runtime.deps._t)(text)), source = quote.lines.find(text => text.startsWith('('));
    let step = 0;
    const line = (cls, text) => `<p class="${cls}" data-step style="--step:${step++}">${(0, runtime.deps.escapeHTML)(text)}</p>`;
    return `<button type="button" class="opening-intro-skip" data-opening-skip>${(0, runtime.deps._t)('건너뛰기')}</button>
            <div class="opening-intro-stage"><figure class="opening-intro-plate"><img src="${(0, runtime.deps.escapeHTML)(scene.image)}" alt=""></figure>
            <div class="opening-intro-text"><p class="opening-intro-kicker">${(0, runtime.deps._t)('프롤로그')}</p><h1 class="opening-intro-title">${(0, runtime.deps.escapeHTML)(title)}</h1>
            <blockquote class="opening-intro-verdict">${verdict.map(text => line('', text)).join('')}${source ? line('opening-intro-source', (0, runtime.deps._t)(source)) : ''}</blockquote>
            ${scene.lines.map(text => line('opening-intro-line', (0, runtime.deps._t)(text))).join('')}
            <button type="button" class="opening-intro-next" data-opening-next>${(0, runtime.deps._t)('계속')} <kbd>Enter / Space</kbd></button></div></div>`;
}

/** Closing the native modal releases its inert background; restore the previous control or the battlefield. */
export function removeIntro(runtime, scene) {
    if (!scene || runtime.state.intro !== scene) return;
    clearIntroTasks(runtime);
    releaseViewTarget(runtime, scene);
    runtime.state.intro = null;
    runtime.state.introOwner = null;
    scene.close();
    scene.remove();
    const previous = runtime.state.introReturnFocus;
    runtime.state.introReturnFocus = null;
    runtime.deps.selectionDialog.restoreFocus(previous);
}

/** A save loaded under the intro (a sign-in, a test fixture): the game is no longer new, so the intro goes without a trace and the
 * auto hunt setting it turned off comes back (only on the settings it touched; a loaded save brings its own). */
export function dropIntro(runtime) {
    removeIntro(runtime, runtime.state.intro);
    clearIntroTasks(runtime);
    runtime.state.rising = null;
    runtime.deps.stageActors.setRise(null);
    if (runtime.state.heldAuto && runtime.state.heldAuto.settings === runtime.deps.game?.settings) runtime.deps.game.settings.autoMove = runtime.state.heldAuto.autoMove;
    runtime.state.heldAuto = null;
}

export function advanceIntro(runtime) {
    if (!runtime.state.intro || runtime.state.intro.classList.contains('is-leaving')) return;
    if (!runtime.state.intro.classList.contains('is-all')) { runtime.state.intro.classList.add('is-all', 'is-playing'); return; }
    endIntro(runtime);
}

export function endIntro(runtime) {
    if (!runtime.state.intro || runtime.state.intro.classList.contains('is-leaving')) return;
    const scene = runtime.state.intro;
    scene.classList.add('is-leaving');
    deferIntro(runtime, () => {
        if (runtime.state.intro !== scene) return;
        if (runtime.state.introOwner !== runtime.deps.game) { dropIntro(runtime); return; }
        mark(runtime, runtime.state.KEY.intro);
        runtime.state.heldAuto = null;
        scene.classList.add('is-revealing');
        deferIntro(runtime, () => removeIntro(runtime, scene), runtime.deps.uiDisplay.reducedEffects() ? 0 : runtime.state.REVEAL_MS);
        }, runtime.deps.uiDisplay.reducedEffects() ? 0 : runtime.state.LEAVE_MS);
}

function deferIntro(runtime, callback, ms) {
    const handle = runtime.deps.setTimeout(() => {
        runtime.state.introTimers.delete(handle);
        if (runtime.active) callback();
        }, ms);
    runtime.state.introTimers.add(handle);
}

function clearIntroTasks(runtime) {
    cancelViewFrames(runtime);
    for (const handle of runtime.state.introTimers) runtime.deps.clearTimeout(handle);
    runtime.state.introTimers.clear();
}

/** Window capture precedes game hotkeys; the shared dialog owner contains Tab at both edges. */
export function onIntroKey(runtime, event) {
    event.stopImmediatePropagation();
    if (event.code === 'Tab') { runtime.deps.selectionDialog.containFocus(event, runtime.state.intro); return; }
    if (!['Escape', 'Space', 'Enter'].includes(event.code)) return;
    event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'Escape' || event.target.closest('[data-opening-skip]')) endIntro(runtime);
    else advanceIntro(runtime);
}
