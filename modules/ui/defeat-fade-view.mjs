import { listenView, releaseViewEvents, releaseViewTarget } from './view-events.mjs';

/** Presentation only. The combat domain owns defeat, respawn and the movement hold. */
export function createDefeatFadeView(deps) {
    const runtime = { active: true, listeners: [], fade: null };
    const clear = () => {
        releaseViewTarget(runtime, runtime.fade);
        runtime.fade?.remove();
        runtime.fade = null;
    };
    const show = event => {
        if (!runtime.active || event.detail?.background || deps.uiDisplay.reducedEffects()) return;
        const wrap = deps.document.getElementById('battlefield-wrap');
        const canvas = deps.document.getElementById('battlefield-canvas');
        if (!wrap || !canvas || !canvas.width || !canvas.height) return;
        clear();
        const fade = deps.document.createElement('div'), dark = deps.document.createElement('div');
        fade.className = 'battle-defeat-fade';
        fade.setAttribute('aria-hidden', 'true');
        dark.className = 'battle-defeat-dark';
        fade.append(stillOf(deps.document, canvas), dark);
        runtime.fade = fade;
        listenView(runtime, fade, 'animationend', end => { if (end.target === fade) clear(); });
        wrap.append(fade);
    };
    listenView(runtime, deps.window, 'project-idle:player-defeated', show);
    return Object.freeze({ dispose() { clear(); releaseViewEvents(runtime); } });
}

function stillOf(document, canvas) {
    const still = document.createElement('canvas');
    still.width = canvas.width;
    still.height = canvas.height;
    still.className = 'battle-defeat-still';
    Object.assign(still.style, { left: `${canvas.offsetLeft}px`, top: `${canvas.offsetTop}px`,
        width: `${canvas.offsetWidth}px`, height: `${canvas.offsetHeight}px` });
    still.getContext('2d').drawImage(canvas, 0, 0);
    return still;
}
