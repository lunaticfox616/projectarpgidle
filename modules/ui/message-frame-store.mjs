export function defaultFrameState() {
    // 새 모험은 탭 줄만 둔다. 펼친 전투 기록이 첫 방 오른쪽 출구를 덮지 않게 한다.
    return { split: false, active: 'log', side: 'chat', main: null, sideRect: null, collapsed: { main: true, side: false } };
}

export function validFrameRect(rect) {
    if (!rect || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(Number(rect[key])))) return null;
    return { x: Number(rect.x), y: Number(rect.y), width: Number(rect.width), height: Number(rect.height) };
}

export function normalizeFrameState(runtime, saved) {
    const base = defaultFrameState();
    if (!saved || typeof saved !== 'object') return base;
    const collapsed = saved.collapsed || {};
    return {
        split: saved.split === true, active: runtime.state.TABS[saved.active] ? saved.active : base.active, side: runtime.state.TABS[saved.side] ? saved.side : base.side,
        main: validFrameRect(saved.main), sideRect: validFrameRect(saved.sideRect),
        collapsed: { main: typeof collapsed.main === 'boolean' ? collapsed.main : base.collapsed.main, side: collapsed.side === true }
    };
}

export function readFrameState(runtime) {
    try {
        return normalizeFrameState(runtime, JSON.parse(runtime.deps.localStorage.getItem(runtime.state.STORAGE_KEY) || 'null'));
    } catch (error) {
        runtime.deps.console.warn('message frame layout ignored:', error);
        return defaultFrameState();
    }
}

export function saveFrameState(runtime) {
    if (!runtime.active || runtime.state.pointer) return;
    try {
        runtime.deps.localStorage.setItem(runtime.state.STORAGE_KEY, JSON.stringify(runtime.state.state));
    } catch (error) {
        runtime.deps.console.warn('message frame layout was not saved:', error);
    }
}
