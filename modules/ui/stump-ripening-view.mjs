import { releaseViewEvents } from './view-events.mjs';
import { isGolden, lineText, badgesHtml, extraLinesHtml, scarBodyHtml, sealHtml, bulkHtml, bulkConfirmationCurrent, autoMergeCurrent, codexHtml, rulesLines, ripenNote, regressLog } from './stump-ripening-markup.mjs';
import { discardScar, confirmDiscard, confirmMonetize, confirmBulk, confirmAutoMerge } from './stump-ripening-actions.mjs';

export function createStumpRipeningView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { isGolden, lineText, badgesHtml, extraLinesHtml, scarBodyHtml, discardScar, confirmDiscard, confirmMonetize, sealHtml, bulkHtml, confirmBulk, bulkConfirmationCurrent, confirmAutoMerge, autoMergeCurrent, codexHtml, rulesLines, ripenNote, regressLog };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = (...args) => runtime.active ? handler(runtime, ...args) : undefined;
    initialize(runtime);

    runtime.api = StumpRipeningViewApi(runtime);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.DISCARD_KEEPS = ['잠금', '황금', '고대 씨앗', '성장 완료', '성장 중', '고유 부적', runtime.deps.STUMP_BOX_SCAR.name];
    runtime.state.NO_MERGE = '같은 색 씨앗 3개가 보관함에 없습니다.';
}


function StumpRipeningViewApi(runtime) {
    return Object.freeze({
        lineText: runtime.handlers.lineText,
        isGolden: runtime.handlers.isGolden,
        badgesHtml: runtime.handlers.badgesHtml,
        extraLinesHtml: runtime.handlers.extraLinesHtml,
        scarBodyHtml: runtime.handlers.scarBodyHtml,
        discardScar: runtime.handlers.discardScar,
        confirmDiscard: runtime.handlers.confirmDiscard,
        confirmMonetize: runtime.handlers.confirmMonetize,
        sealHtml: runtime.handlers.sealHtml,
        bulkHtml: runtime.handlers.bulkHtml,
        confirmBulk: runtime.handlers.confirmBulk,
        bulkConfirmationCurrent: runtime.handlers.bulkConfirmationCurrent,
        confirmAutoMerge: runtime.handlers.confirmAutoMerge,
        autoMergeCurrent: runtime.handlers.autoMergeCurrent,
        codexHtml: runtime.handlers.codexHtml,
        rulesLines: runtime.handlers.rulesLines,
        ripenNote: runtime.handlers.ripenNote,
        regressLog: runtime.handlers.regressLog,
        dispose: () => disposeStumpRipeningView(runtime)
    });
}

function disposeStumpRipeningView(runtime) {
    releaseViewEvents(runtime);
}
