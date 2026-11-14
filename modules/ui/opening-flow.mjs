import { onIntroKey, dropIntro, startIntro } from './opening-intro.mjs';
import { lying, wakesHero, startRise, active, actRun, holdManual, trackLesson, newGame, fresh } from './opening-lessons.mjs';
import { showHint, hintFor } from './opening-hints.mjs';
import { listenView } from './view-events.mjs';

export function onKey(runtime, event) {
    if (runtime.state.intro) { onIntroKey(runtime, event); return; }
    if (!lying(runtime) || runtime.state.rising || runtime.state.intro || !wakesHero(runtime, event.code)) return;
    // 깨우는 키는 깨우기만 한다: 같은 누름으로 걷기 시작하지 않게 단축키로 넘기지 않는다(누름도 같다, onBattlefieldPress).
    event.stopImmediatePropagation();
    event.preventDefault();
    startRise(runtime);
}

export function tick(runtime) {
    if (!ticking(runtime)) return;
    followGame(runtime);
    if (active(runtime)) {
        const run = actRun(runtime);
        holdManual(runtime, run);
        trackLesson(runtime, run);
    } else if (runtime.deps.stageActors.down()) runtime.deps.stageActors.setRise(null); // a save loaded mid-opening: no one lies there any more
    showHint(runtime, hintFor(runtime));
}

/** Starts the intro for a new game; drops it when the game under it stopped being new. */
export function followGame(runtime) {
    if (runtime.state.owner !== runtime.deps.game) {
        dropIntro(runtime);
        runtime.state.owner = runtime.deps.game;
        runtime.state.movedFrom = runtime.state.autoHint = null;
        runtime.state.hintEl?.remove();
        runtime.state.wakeEl?.remove();
        runtime.state.hintEl = runtime.state.wakeEl = null;
        runtime.state.hintField = '';
    }
    if (runtime.state.intro && (runtime.state.introOwner !== runtime.deps.game || !newGame(runtime))) dropIntro(runtime);
    else if (!runtime.state.intro && fresh(runtime)) startIntro(runtime);
}

export function openCue(runtime, route) {
    if (!Object.hasOwn(runtime.state.SYSTEM_CUES, route)) return;
    if (route !== 'tab-map') return (0, runtime.deps.openTabPane)(route);
    runtime.deps.explorationAtlasUi.open();
    runtime.deps.worldMapUi.pick('act-02');
    runtime.deps.document.querySelector('#ui-exploration-atlas .wm-side .atlas-hunt-now')?.focus();
}

export function init(runtime) {
    if (!runtime.active || runtime.state.tickTimer !== null) return;
    const canvas = runtime.deps.document.getElementById('battlefield-canvas');
    if (!canvas) return;
    ['pointerdown', 'mousedown', 'click'].forEach(type => listenView(runtime, canvas, type, event => {
        if (runtime.state.owner !== runtime.deps.game && ticking(runtime)) followGame(runtime);
        runtime.handlers.onBattlefieldPress(event);
            }, true));
    const wrap = runtime.deps.document.getElementById('battlefield-wrap');
    if (wrap) listenView(runtime, wrap, 'click', event => {
        if (event.target.closest('[data-opening-weapon]')) (0, runtime.deps.openTabPane)('tab-items');
        const route = event.target.closest('[data-opening-route]')?.dataset.openingRoute;
        openCue(runtime, route);
    });
    listenView(runtime, runtime.deps.window, 'keydown', event => {
        if (runtime.state.owner !== runtime.deps.game && ticking(runtime)) followGame(runtime);
        runtime.handlers.onKey(event);
        }, true);
    listenView(runtime, runtime.deps.window, 'keyup', event => { if (runtime.state.intro) event.stopImmediatePropagation(); }, true);
    runtime.state.tickTimer = runtime.deps.setInterval(runtime.handlers.tick, runtime.state.TICK_MS);
}

/** The start class pick (js/ui.js ensureInitialHeroSelection) starts the intro in the same moment the pick closes: waiting for the next
 * tick drew the room for a few frames first (2026-10-27 사용자: 직업을 빨리 고르면 스토리 연출 전에 방 그림이 보였다). */
export function afterStartPick(runtime) { if (ticking(runtime)) followGame(runtime); }

export function ticking(runtime) { return typeof runtime.deps.game === 'object' && !!runtime.deps.game && Array.isArray(runtime.deps.game.seenTutorials) && !runtime.deps.game.isBackgroundCalculation; }
