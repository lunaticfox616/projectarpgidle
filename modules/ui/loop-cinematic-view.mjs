// The loop transition cinematic (replaces the old 1.95 s rewind overlay). Chosen when 'loop-rewrite-started' fires: the first
// loop's full scene, a short one on later loops (a passing one under the auto loop), or a plain fade with reduced effects.
// deps reads the current game on each call; the scene holds no game across a replaced save.
import { listenView, releaseViewEvents } from './view-events.mjs';
import { LoopCinematicAssets } from './loop-cinematic-assets.mjs';
import { LoopCinematicBackdrop } from './loop-cinematic-backdrop.mjs';
import { LoopCinematicScene } from './loop-cinematic-scene.mjs';
import { LoopCinematicSound } from './loop-cinematic-sound.mjs';
import { takeSnapshot, startSheets } from './loop-cinematic-snapshot.mjs';
import { FIRST_LOOP_KEY, chooseMode, beginPlay, endPlay, relayout, schedule, frame, skipCine, advanceVoice, enterClass, classChosen } from './loop-cinematic-flow.mjs';

const PRELOAD_OVERLAYS = ['loop-ready-overlay', 'loop-decision-overlay'];

function onRewriteStarted(runtime) {
    if (runtime.state.play) return;
    const mode = chooseMode(runtime), game = runtime.deps.game;
    if (!mode) return;
    // Marked before the loop save that follows this event, so a reload mid-scene never plays it again.
    if (mode === 'full') game.seenTutorials.push(FIRST_LOOP_KEY);
    beginPlay(runtime, mode);
}

/** Starts loading the pictures while the loop card is read (and remembers the room picture before the map closes). */
function preloadPictures(runtime) {
    if (runtime.state.play || !runtime.deps.game) return;
    const snap = takeSnapshot(runtime.deps);
    runtime.state.preloaded = { owner: runtime.deps.game, region: snap.region };
    runtime.assets.preload(snap, startSheets(runtime.deps));
    runtime.sound.load();
}

function blocksKeys(play) {
    return !!play && play.mode !== 'auto' && play.phase !== 'exit';
}

function containIn(runtime, play) {
    return play.phase === 'class' ? runtime.deps.document.querySelector('#loop-hero-select-overlay .tutorial-card') || play.root : play.root;
}

function cineKey(runtime, play, event) {
    if (!['Escape', 'Space', 'Enter', 'NumpadEnter'].includes(event.code)) return;
    event.preventDefault();
    if (event.repeat) return;
    if (event.code === 'Escape' || play.T.mode !== 'full') skipCine(runtime);
    else advanceVoice(runtime);
}

/** Window capture runs before the game's hotkeys (document capture): none of them fire under the scene. */
function onKey(runtime, event) {
    const play = runtime.state.play;
    if (!blocksKeys(play)) return;
    event.stopImmediatePropagation();
    if (event.code === 'Tab') { runtime.deps.selectionDialog.containFocus(event, containIn(runtime, play)); return; }
    const onSkipButton = event.code !== 'Escape' && !!event.target.closest?.('[data-cine-skip]'); // Space and Enter press the focused button
    if (play.phase === 'cine' && !onSkipButton) cineKey(runtime, play, event);
    else if (event.code === 'Escape' && play.phase !== 'class') event.preventDefault();
}

function onClick(runtime, event) {
    const play = runtime.state.play;
    if (!play || play.mode === 'auto') return;
    if (event.target.closest('[data-cine-skip]')) { skipCine(runtime); return; }
    if (event.target.closest('[data-cine-go]')) { enterClass(runtime); return; }
    if (event.target.closest('.loop-cine-window')) { play.refreshPanel = true; return; }
    if (play.phase !== 'cine') return;
    if (play.T.mode === 'full') advanceVoice(runtime);
    else skipCine(runtime);
}

function onVisibility(runtime) {
    const play = runtime.state.play;
    if (!play) return;
    if (runtime.deps.document.hidden) { runtime.sound.stopMusic(); return; }
    runtime.state.last = runtime.deps.performance.now();
    if (play.phase === 'cine') runtime.sound.sync(play.T, play.t);
    schedule(runtime);
}

function onClassCompleted(runtime) {
    const play = runtime.state.play;
    if (play && play.owner === runtime.deps.game) classChosen(runtime);
}

function watchLoopCards(runtime) {
    const { deps } = runtime, targets = PRELOAD_OVERLAYS.map(id => deps.document.getElementById(id)).filter(Boolean);
    if (!targets.length || typeof deps.MutationObserver !== 'function') return;
    runtime.state.observer = new deps.MutationObserver(() => {
        if (targets.some(node => node.classList.contains('active'))) preloadPictures(runtime);
    });
    targets.forEach(node => runtime.state.observer.observe(node, { attributes: true, attributeFilter: ['class'] }));
}

function startView(runtime) {
    if (runtime.started || !runtime.active) return;
    runtime.started = true;
    const { deps } = runtime;
    listenView(runtime, deps.window, 'project-idle:loop-rewrite-started', () => onRewriteStarted(runtime));
    listenView(runtime, deps.window, 'project-idle:loop-hero-selection-completed', () => onClassCompleted(runtime));
    listenView(runtime, deps.window, 'keydown', event => onKey(runtime, event), true);
    listenView(runtime, deps.window, 'resize', () => relayout(runtime));
    listenView(runtime, deps.document, 'visibilitychange', () => onVisibility(runtime));
    listenView(runtime, deps.document, 'click', event => { if (runtime.state.play?.root?.contains(event.target)) onClick(runtime, event); }, true);
    watchLoopCards(runtime);
}

function disposeView(runtime) {
    if (!runtime.active) return;
    endPlay(runtime);
    runtime.state.observer?.disconnect();
    runtime.state.observer = null;
    releaseViewEvents(runtime);
}

/** Lets the test panel play a mode over the current game without changing or saving anything. */
function previewPlay(runtime, mode) {
    if (runtime.state.play || !['full', 'short'].includes(mode) || !runtime.deps.game) return false;
    return beginPlay(runtime, mode, { preview: true });
}

export function createLoopCinematicView(deps) {
    const runtime = { deps, active: true, started: false, listeners: [], state: { play: null, raf: 0, last: 0, preloaded: null, observer: null, hosted: null } };
    runtime.assets = new LoopCinematicAssets(deps);
    runtime.backdrop = new LoopCinematicBackdrop(deps, runtime.assets);
    runtime.scene = new LoopCinematicScene(deps, runtime.assets, runtime.backdrop);
    runtime.sound = new LoopCinematicSound(deps);
    runtime.onFrame = now => frame(runtime, now);
    return Object.freeze({
        start: () => startView(runtime),
        dispose: () => disposeView(runtime),
        /** Any mode is on screen (notices and toasts wait). */
        onScreen: () => !!runtime.state.play,
        /** A blocking mode holds the class window and the loop automation until its class step. */
        holdsHeroSelection: () => !!runtime.state.play?.blocking && runtime.state.play.owner === deps.game,
        preview: mode => previewPlay(runtime, mode),
        preload: () => preloadPictures(runtime)
    });
}
