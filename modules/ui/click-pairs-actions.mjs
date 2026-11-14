export function onClick(runtime, event) {
    runtime.state.second = event.detail > 1 && !runtime.state.second;
    if (!runtime.state.second || event.detail === 2) return;
    const { target, clientX, clientY } = event;
    // 진짜 dblclick처럼 이 click의 처리가 끝난 뒤에 보낸다.
    const timer = runtime.deps.setTimeout(() => {
        runtime.state.timers.delete(timer);
        if (runtime.active && target.isConnected) target.dispatchEvent(new runtime.deps.MouseEvent('dblclick', { bubbles: true, cancelable: true, view: runtime.deps.window, detail: 2, clientX, clientY }));
        }, 0);
    runtime.state.timers.add(timer);
}
