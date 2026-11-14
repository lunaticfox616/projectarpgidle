export function cleanupPassiveBursts(runtime) {
    let now = runtime.deps.performance.now();
    runtime.state.passiveRevealBursts = runtime.state.passiveRevealBursts.filter(burst => now - burst.startTime <= burst.duration + 250);
}

export function getNodeRevealAmount(runtime, node) {
    let visibility = (0, runtime.deps.getPassiveVisibility)(node.id);
    if (visibility === 'hidden') return 0;
    let amount = visibility === 'preview' ? 0.14 : 1;
    let now = runtime.deps.performance.now();
    runtime.state.passiveRevealBursts.forEach(burst => {
        if (burst.nodeIds.includes(node.id)) {
            let progress = (0, runtime.deps.clampNumber)((now - burst.startTime) / burst.duration, 0, 1);
            let dist = Math.hypot(node.x - burst.x, node.y - burst.y);
            let delay = (0, runtime.deps.clampNumber)((dist / Math.max(1, burst.radius)) * 0.55, 0, 0.65);
            let anim = (0, runtime.deps.clampNumber)((progress - delay) / 0.24, 0, 1);
            amount = Math.max(amount, anim);
        }
    });
    return amount;
}
