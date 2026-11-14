import { listenView, releaseViewEvents } from './view-events.mjs';
import { confirmLibrarySeal, bumpSealedTab, createRenderGemLibrary } from './skill-library-actions.mjs';
import { renderSkillGemScreen } from './skill-screen-render.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createSkillScreenView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, active: true, listeners: [] };
    const handlers = { renderSkillGemScreen };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    initialize(runtime);
    runtime.handlers.renderGemLibrary = createRenderGemLibrary(runtime);
    runtime.api = { renderSkillGemScreen: runtime.handlers.renderSkillGemScreen , dispose: () => disposeSkillScreen(runtime) };
    listenView(runtime, runtime.deps.document, 'click', event => {
        const tab = event.target.closest('[data-picker-kind]');
        if (tab && !tab.disabled) { runtime.deps.skillGemBoardUi.pick(tab.dataset.pickerKind); return; }
        const foldButton = event.target.closest('[data-gem-fold]');
        if (foldButton) { (0, runtime.deps.toggleGemFoldMode)(foldButton.dataset.gemFold); return; }
        const sealButton = event.target.closest('[data-gem-bulk-seal]');
        if (sealButton && !sealButton.disabled) { confirmLibrarySeal(runtime, sealButton.dataset.gemBulkSeal); return; }
        const button = event.target.closest('[data-gem-page]');
        if (!button || button.disabled) return;
        runtime.state.libraryPages[button.dataset.gemPage].index += Number(button.dataset.step);
        (0, runtime.deps.updateStaticUI)();
    });
    listenView(runtime, runtime.deps.document, 'click', event => {
        const button = event.target.closest('[data-tile-seal], [data-tile-unseal]');
        if (!button || button.disabled) return;
        event.stopPropagation();
        const name = button.dataset.gemName;
        if (button.dataset.tileSeal) {
            if (button.dataset.tileSeal === 'support') (0, runtime.deps.sealSupportGem)(name);
            else (0, runtime.deps.sealSkillGem)(name);
            bumpSealedTab(runtime);
        } else if (button.dataset.tileUnseal === 'support') (0, runtime.deps.unsealSupportGem)(name);
        else (0, runtime.deps.unsealSkillGem)(name);
        }, true);
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.lastSkillPanelRenderSignature = '';
    runtime.state.libraryPages = { skill: { index: 0, query: '' }, support: { index: 0, query: '' } };
    runtime.state.sealConfirmationPending = false;
    runtime.state.PICKER_TABS = Object.freeze([
        { kind: 'active', label: '공격|룬 종류', icon: 'sword' },
        { kind: 'mobility', label: '이동|룬 종류', icon: 'boot' },
        { kind: 'summon', label: '소환|룬 종류', icon: 'skull' },
        { kind: 'support', label: '보조|룬 종류', icon: 'gem' },
        { kind: 'sealed', label: '봉인|룬 종류', icon: 'lock' }
    ]);
    runtime.state.MOBILE_PAGE_SIZE = 8;
    runtime.state.supportDpsGains = new Map();
}

function disposeSkillScreen(runtime) {
    releaseViewEvents(runtime); runtime.state.lastSkillPanelRenderSignature = ''; runtime.state.supportDpsGains.clear();
}
