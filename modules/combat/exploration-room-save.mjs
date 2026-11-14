import { SEALED_STYLE } from './act-exploration-rooms-values.mjs';

export function roomRoomSeal(run) {
    return run && run.rooms ? { ...run, source: { style: SEALED_STYLE, of: run.source || null } } : run;
}

/** 불러온 탐험의 봉인을 푼다(js/act-exploration-state.js dropRetired가 맨 먼저 부른다). */
export function roomRoomUnseal(run) {
    if (!run || !run.source || run.source.style !== SEALED_STYLE) return;
    if (run.source.of) run.source = run.source.of;
    else delete run.source;
}
