// The loop cinematic's course: shots on a timeline that runs on visible time only, then the unlock step, the class step, the
// graft and the fade back onto the game. Every step re-checks that the game it started on is still the one loaded.
import { SHOTS, buildTimeline, lineAt, graftTimes } from './loop-cinematic-timeline.mjs';
import { takeSnapshot, currentHeroSheet, startSheets } from './loop-cinematic-snapshot.mjs';
import { LoopCinematicHud, overlayHtml } from './loop-cinematic-hud.mjs';
import { unlockReady, hostUnlockPanel, returnUnlockPanel, refreshHostedPanel, requestClassWindow } from './loop-cinematic-steps.mjs';

export const FIRST_LOOP_KEY = 'first_loop_cinematic';
const BLOCKING = new Set(['full', 'short', 'plain']);

/** The mode for a foreground loop, or '' when none plays (background replay, hidden tab). */
export function chooseMode(runtime) {
    const { deps } = runtime, game = deps.game;
    if (!game || game.isBackgroundCalculation || deps.document.hidden) return '';
    if (deps.uiDisplay.reducedEffects() || !runtime.scene.canDraw()) return 'plain';
    if (firstLoopDue(game)) return 'full';
    return game.settings.autoLoop ? 'auto' : 'short';
}

function firstLoopDue(game) {
    return (game.season || 1) === 1 && !(game.seenTutorials || []).includes(FIRST_LOOP_KEY);
}

function heroOf(runtime, sheet) {
    const img = runtime.assets.hero(sheet);
    return img ? { sheet, img, pixels: frame => runtime.assets.framePixels(sheet, img, frame) } : null;
}

function mountOverlay(runtime, play) {
    const { deps } = runtime, root = deps.document.createElement('div');
    root.id = 'loop-cinematic';
    root.className = 'loop-cine active';
    root.dataset.mode = play.mode;
    root.dataset.phase = play.phase;
    root.tabIndex = -1;
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', play.mode === 'auto' ? 'false' : 'true');
    root.setAttribute('aria-label', deps._t('루프 {season}', { season: play.snap.nextSeason }));
    root.innerHTML = overlayHtml(deps, play);
    root.style.opacity = '0';
    deps.document.body.appendChild(root);
    deps.document.body.classList.add('loop-cinematic-active');
    runtime.scene.attach(root.querySelector('.loop-cine-canvas'));
    play.root = root;
    play.layer = root.querySelector('.loop-cine-unlock');
    play.hud = new LoopCinematicHud(deps, root, play);
    relayout(runtime);
}

/** Canvas size and camera for the overlay's box; the text layer follows the scene box through CSS variables. */
export function relayout(runtime) {
    const play = runtime.state.play;
    if (!play || !play.root) return;
    const { deps } = runtime, root = play.root, ratio = Math.min(3, (deps.window.devicePixelRatio || 1) * (deps.uiDisplay.factor || 1));
    const box = runtime.scene.resize(root.clientWidth || 1, root.clientHeight || 1, ratio);
    root.classList.toggle('is-phone', box.phone);
    [['--sx', box.x], ['--sy', box.y], ['--sw', box.w], ['--sh', box.h]].forEach(([name, value]) => root.style.setProperty(name, value + 'px'));
}

/** Starts a cinematic. options.preview: the test panel's look at the scenes (no state changes, no class step). */
export function beginPlay(runtime, mode, options = {}) {
    const { deps } = runtime, preloaded = runtime.state.preloaded;
    const snap = takeSnapshot(deps, { region: preloaded && preloaded.owner === deps.game ? preloaded.region : '' });
    const play = { mode, preview: !!options.preview, owner: deps.game, snap, T: buildTimeline(mode, deps.STORY_LOOP_CINEMATIC.voice.lines),
        phase: mode === 'plain' ? 'plain' : 'cine', t: 0, age: 0, idle: 0, gt: 0, exitT: 0, exitMs: SHOTS.exitMs,
        blocking: !options.preview && BLOCKING.has(mode), returnFocus: deps.document.activeElement, graftSheet: null, refreshPanel: false };
    runtime.state.play = play;
    runtime.assets.preload(snap, startSheets(deps));
    runtime.sound.load();
    runtime.sound.hush(true);
    mountOverlay(runtime, play);
    if (mode !== 'auto') play.root.focus({ preventScroll: true });
    runtime.sound.sync(play.T, 0);
    runtime.state.last = deps.performance.now();
    schedule(runtime);
    return true;
}

/** The next animation frame runs runtime.onFrame (frame below, bound once by the view). */
export function schedule(runtime) {
    if (!runtime.state.raf && runtime.state.play) runtime.state.raf = runtime.deps.requestAnimationFrame(runtime.onFrame);
}

function setPhase(play, phase) {
    play.phase = phase;
    if (play.root) play.root.dataset.phase = phase;
}

/** End of the shots: the unlock step when an unlock can be bought, else the class; the auto variant just fades. */
export function finishCine(runtime) {
    const play = runtime.state.play;
    runtime.sound.stopMusic();
    if (play.mode === 'auto') return beginExit(runtime);
    if (play.mode === 'full' && unlockReady(runtime.deps)) return enterUnlock(runtime);
    return enterClass(runtime);
}

function enterUnlock(runtime) {
    const play = runtime.state.play;
    setPhase(play, 'unlock');
    play.idle = 0;
    hostUnlockPanel(runtime, play.layer);
    runtime.sound.effect('hitLightBeam');
    play.layer.querySelector('[data-cine-go]')?.focus({ preventScroll: true });
}

/** Step 8: the real class window over backdrop B (the test panel's preview has no class step and grafts the current class). */
export function enterClass(runtime) {
    const play = runtime.state.play;
    if (!play || play.phase === 'class' || play.phase === 'graft' || play.phase === 'exit') return;
    returnUnlockPanel(runtime);
    play.layer.hidden = true;
    play.layer.innerHTML = '';
    setPhase(play, 'class');
    play.idle = 0;
    play.blocking = false;
    runtime.sound.effect('stumpFrameSwitch');
    if (play.preview || !requestClassWindow(runtime)) classChosen(runtime);
}

/** The class is applied ('loop-hero-selection-completed', or the pending flag found cleared). */
export function classChosen(runtime) {
    const play = runtime.state.play;
    if (!play || play.phase !== 'class') return;
    if (play.mode !== 'full') return beginExit(runtime);
    play.graftSheet = currentHeroSheet(runtime.deps);
    runtime.assets.loadHero(play.graftSheet);
    setPhase(play, 'graft');
    play.gt = 0;
    play.root.focus({ preventScroll: true });
}

export function beginExit(runtime, ms = SHOTS.exitMs) {
    const play = runtime.state.play;
    if (!play || play.phase === 'exit') return;
    setPhase(play, 'exit');
    play.blocking = false;
    play.exitT = 0;
    play.exitMs = ms;
    play.root.classList.add('is-leaving');
}

/** Removes everything the cinematic placed and gives the game its music, focus, notices and (if still owed) the class window. */
export function endPlay(runtime) {
    const play = runtime.state.play, { deps } = runtime;
    if (!play) return;
    runtime.state.play = null;
    if (runtime.state.raf) deps.cancelAnimationFrame(runtime.state.raf);
    runtime.state.raf = 0;
    returnUnlockPanel(runtime);
    runtime.sound.dispose();
    play.root?.remove();
    deps.document.body.classList.remove('loop-cinematic-active');
    runtime.assets.dispose();
    runtime.backdrop.dispose();
    runtime.scene.release();
    handBack(runtime, play);
}

function handBack(runtime, play) {
    const { deps } = runtime, active = deps.document.activeElement;
    if (!active || active === deps.document.body) deps.selectionDialog.restoreFocus(play.returnFocus);
    const owed = !play.preview && play.owner === deps.game && deps.game.pendingLoopHeroSelection;
    if (owed && !deps.isLoopHeroSelectOpen()) requestClassWindow(runtime);
    if (typeof deps.showNextTutorial === 'function') deps.showNextTutorial();
}

/** Full mode: straight to the unlock step (or the class); the short mode: to its end. */
export function skipCine(runtime) {
    const play = runtime.state.play;
    if (play && play.phase === 'cine') finishCine(runtime);
}

/** Finish the typing line, then go to the next line. */
export function advanceVoice(runtime) {
    const play = runtime.state.play, line = play ? lineAt(play.T, play.t) : null;
    if (!line || play.phase !== 'cine') return;
    play.t = play.t < line.typeEnd ? line.typeEnd : line.next;
    runtime.sound.sync(play.T, play.t);
}

const ADVANCE = {
    cine(runtime, play, dt) {
        const prev = play.t;
        play.t += dt;
        runtime.sound.crossings(play.T, prev, play.t);
        if (play.t >= play.T.end) finishCine(runtime);
    },
    plain(runtime, play, dt) {
        play.t += dt;
        if (play.t < play.T.end) return;
        play.blocking = false;
        if (!play.preview) requestClassWindow(runtime);
        beginExit(runtime, SHOTS.plain.outMs);
    },
    unlock(runtime, play, dt) { play.idle += dt; },
    class(runtime, play, dt) {
        play.idle += dt;
        if (!play.preview && !runtime.deps.game.pendingLoopHeroSelection) classChosen(runtime);
    },
    graft(runtime, play, dt) {
        const prev = play.gt, T = graftTimes();
        play.gt += dt;
        if (prev < T.formed && play.gt >= T.formed) runtime.sound.effect('stageClear');
        if (play.gt >= T.end) beginExit(runtime);
    },
    exit(runtime, play, dt) {
        play.exitT += dt;
        if (play.exitT >= play.exitMs) endPlay(runtime);
    }
};

function opacityOf(play) {
    if (play.phase === 'exit') return 1 - Math.min(1, play.exitT / play.exitMs);
    const enter = play.mode === 'plain' ? SHOTS.plain.fadeMs : SHOTS.enterMs;
    return Math.min(1, play.age / enter);
}

function render(runtime, play) {
    const scene = runtime.scene;
    if (play.phase === 'cine') scene.renderCine({ T: play.T, t: play.t, snap: play.snap, hero: heroOf(runtime, play.snap.hero) });
    else if (play.phase === 'unlock' || play.phase === 'class') scene.renderPanels(play.idle);
    else if (play.phase === 'graft') scene.renderGraft(play.T, play.snap, play.gt, heroOf(runtime, play.graftSheet));
    if (play.mode !== 'plain') play.hud.update(play.t, scene.sceneCentreCss());
    else play.hud.updateTitle(play.t);
    if (play.phase === 'unlock') play.hud.typeSay(play.layer.querySelector('[data-cine-say]'), play.idle - 300);
    if (play.refreshPanel) { play.refreshPanel = false; refreshHostedPanel(runtime); }
    play.root.style.opacity = String(Math.round(opacityOf(play) * 20) / 20);
}

/** One animation frame. Time only moves while the page is visible; a replaced save drops the scene without a trace. */
export function frame(runtime, now) {
    runtime.state.raf = 0;
    const play = runtime.state.play, { deps } = runtime;
    if (!play || !runtime.active) return;
    if (play.owner !== deps.game) { endPlay(runtime); return; }
    const dt = deps.document.hidden ? 0 : Math.min(100, Math.max(0, now - runtime.state.last));
    runtime.state.last = now;
    try {
        if (dt > 0) { play.age += dt; ADVANCE[play.phase](runtime, play, dt); }
        if (runtime.state.play === play) render(runtime, play);
    } catch (error) {
        deps.console.error('[loop-cinematic] stopped', error);
        endPlay(runtime);
        return;
    }
    schedule(runtime);
}
