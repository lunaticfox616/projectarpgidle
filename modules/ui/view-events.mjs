/** Views own their listeners until application disposal. */
export function listenView(runtime, target, type, listener, options) {
    target.addEventListener(type, listener, options);
    runtime.listeners.push({ target, type, listener, options });
}

export function releaseViewEvents(runtime) {
    runtime.active = false;
    for (const { target, type, listener, options } of runtime.listeners) {
        target.removeEventListener(type, listener, options);
    }
    runtime.listeners.length = 0;
}

export function releaseViewTarget(runtime, target) {
    const retained = [];
    for (const binding of runtime.listeners) {
        if (binding.target === target) target.removeEventListener(binding.type, binding.listener, binding.options);
        else retained.push(binding);
    }
    runtime.listeners = retained;
}
