export function syncHeroSelectionState(runtime, source, options = {}) {
    const { deps } = runtime;
    if (deps.rules.normalize(deps.game, options)) {
        deps.addLog(deps._t('모든 직업을 경험했습니다. 설정에서 외형을 자유롭게 변경할 수 있습니다.'), 'season-up');
    }
    if (source !== 'init') renderHeroSummary(runtime);
}

function renderHeroSummary({ deps }) {
    const owner = deps.game, el = deps.document.getElementById('ui-hero-talent-summary');
    if (!el) return;
    const def = deps.rules.definition(owner.selectedClassId);
    const look = deps.rules.definition(deps.rules.appearance(owner));
    const discovered = Math.min(deps.PLAYER_CLASS_ORDER.length, owner.discoveredClassIds.length);
    const unlockText = owner.classFreeSwitchUnlocked ? deps._t('외형 변경 해금됨, 외형: {label}', { label: look.label })
        : deps._t('경험한 직업 {discovered}/{length}', { discovered, length: deps.PLAYER_CLASS_ORDER.length });
    const modeText = owner.settings?.heroAppearanceMode === 'fixed' ? deps._t('고정') : deps._t('현재 직업 연동');
    el.innerText = deps._t('{label}, {unlockText}, 외형: {modeText}', { label: deps._t(def.label), unlockText, modeText });
}

export function renderHeroSelectionControls(runtime) {
    const { deps } = runtime, owner = deps.game;
    const el = deps.document.getElementById('sel-active-hero');
    if (!el) return;
    const mode = owner.settings?.heroAppearanceMode === 'fixed' ? 'fixed' : 'loop';
    const modeEl = deps.document.getElementById('sel-hero-appearance-mode');
    if (modeEl) modeEl.value = mode;
    el.innerHTML = deps.PLAYER_CLASS_ORDER.map(id => `<option value="${id}">${deps._t(deps.PLAYER_CLASS_DEFS[id].label)}</option>`).join('');
    el.value = deps.rules.appearance(owner);
    el.disabled = mode !== 'fixed' || !owner.classFreeSwitchUnlocked;
    el.dataset.tip = mode !== 'fixed' ? deps._t('루프마다 선택한 현재 직업의 외형을 사용합니다.')
        : !owner.classFreeSwitchUnlocked ? deps._t('다른 외형 선택은 여섯 직업을 한 번씩 경험하면 해금됩니다.') : '';
    syncHeroSelectionState(runtime);
}

export function onHeroAppearanceModeChanged(runtime) {
    const el = runtime.deps.document.getElementById('sel-hero-appearance-mode');
    if (!el) return;
    runtime.handlers.applyHeroAppearanceMode(el.value);
    runtime.deps.updateStaticUI();
}

export function onHeroSelectionChanged(runtime) {
    const { deps } = runtime, el = deps.document.getElementById('sel-active-hero');
    if (!el) return;
    if (!deps.game.classFreeSwitchUnlocked) {
        deps.addLog(deps._t('아직 자유 변경이 잠겨 있습니다. 루프를 돌며 여섯 직업을 모두 경험하세요.'), 'attack-monster');
        el.value = deps.rules.appearance(deps.game);
        return;
    }
    runtime.handlers.applyHeroSelection(el.value, { cosmeticOnly: true });
    deps.updateStaticUI();
}
