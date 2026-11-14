export function frameTabs(runtime, frame) {
    if (!runtime.state.state.split) return frame === 'main' ? ['log', 'chat'] : [];
    return [frame === 'side' ? runtime.state.state.side : otherTab(runtime.state.state.side)];
}

/** The tab a frame shows now: none while folded or while the frame is not in use. */
export function shownTab(runtime, frame) {
    const tabs = frameTabs(runtime, frame);
    if (!tabs.length || runtime.state.state.collapsed[frame]) return null;
    return tabs.length > 1 ? runtime.state.state.active : tabs[0];
}

/** On screen now: a PC frame's tab, or on phones the tab picked on the battle screen's log panel while the fight is shown. */
export function isFrameTabVisible(runtime, tab) {
    if (!runtime.state.mounted) return runtime.state.phoneTab === tab && !!runtime.deps.document.getElementById('tab-battle')?.classList.contains('active');
    return runtime.state.FRAMES.some(frame => shownTab(runtime, frame) === tab);
}

export function otherTab(tab) { return tab === 'log' ? 'chat' : 'log'; }

export function frameEl(runtime, frame) { return runtime.deps.document.getElementById(`message-frame-${frame}`); }

export function frameScale(runtime) { return (typeof runtime.deps.uiDisplay === 'object' && runtime.deps.uiDisplay.factor) || 1; }
