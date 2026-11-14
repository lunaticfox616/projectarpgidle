import { frameScale, frameEl } from './message-frame-queries.mjs';

export function readStageBox(runtime) {
    const canvas = runtime.deps.document.getElementById('battlefield-canvas'), box = canvas ? canvas.getBoundingClientRect() : null;
    runtime.state.stageBox = box && canvas.clientWidth ? { left: box.left, top: box.top, scale: box.width / canvas.clientWidth } : null;
}

export function frameCoversHero(runtime, frame, at) {
    if (frame === 'side' && !runtime.state.state.split) return false;
    const rect = runtime.state.placedRects[frame];
    if (!rect) return false;
    const scale = frameScale(runtime), top = runtime.state.state.collapsed[frame] ? rect.y + rect.height - runtime.state.COLLAPSED_HEIGHT : rect.y;
    return at.x + runtime.state.HERO_HALF > rect.x * scale && at.x - runtime.state.HERO_HALF < (rect.x + rect.width) * scale && at.y > top * scale && at.top < (rect.y + rect.height) * scale;
}

export function fadeFramesOverHero(runtime, x, y, top) {
    if (!runtime.state.mounted) return;
    // 자리가 없으면(위에서 보는 전장) 캔버스의 자리도 읽지 않는다: 옅어진 창만 되돌린다
    const known = Number.isFinite(x);
    if (known && !runtime.state.stageBox) readStageBox(runtime);
    const at = known && runtime.state.stageBox ? { x: runtime.state.stageBox.left + x * runtime.state.stageBox.scale, y: runtime.state.stageBox.top + y * runtime.state.stageBox.scale, top: runtime.state.stageBox.top + top * runtime.state.stageBox.scale } : null;
    for (const frame of runtime.state.FRAMES) {
        const over = !!at && frameCoversHero(runtime, frame, at);
        if (over === runtime.state.faded[frame]) continue;
        runtime.state.faded[frame] = over;
        frameEl(runtime, frame).classList.toggle('over-hero', over);
    }
}

/** 창 하나가 전장에서 차지하는 상자(전장의 px). 보이지 않거나 접혔거나 주인공 때문에 옅어진 창이면 null. */
export function frameBoxOnStage(runtime, frame) {
    if ((frame === 'side' && !runtime.state.state.split) || runtime.state.state.collapsed[frame]) return null;
    // Reading the frame restores its opacity in CSS, so its edge still blocks the door marker.
    if (runtime.state.faded[frame] && !frameEl(runtime, frame).matches(':hover, :focus-within')) return null;
    const rect = runtime.state.placedRects[frame];
    if (!rect) return null;
    const k = frameScale(runtime) / runtime.state.stageBox.scale, dx = runtime.state.stageBox.left / runtime.state.stageBox.scale, dy = runtime.state.stageBox.top / runtime.state.stageBox.scale;
    return { left: rect.x * k - dx, right: (rect.x + rect.width) * k - dx, top: rect.y * k - dy, bottom: (rect.y + rect.height) * k - dy };
}

export function stageCoveredFrom(runtime, y, width) {
    if (!runtime.state.mounted) return width;
    if (!runtime.state.stageBox) readStageBox(runtime);
    if (!runtime.state.stageBox) return width;
    const boxes = runtime.state.FRAMES.map(runtime.handlers.frameBoxOnStage).filter(box => box && y >= box.top && y <= box.bottom).sort((a, b) => b.right - a.right);
    let limit = width;
    for (const box of boxes) if (box.right >= limit - runtime.state.COVER_JOIN) limit = Math.min(limit, box.left);
    return limit;
}
