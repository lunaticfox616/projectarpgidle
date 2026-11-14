export function startStaticTiming(runtime) {
    const __perfNow = (typeof runtime.deps.performance !== 'undefined' && runtime.deps.performance.now) ? () => runtime.deps.performance.now() : () => runtime.deps.Date.now();
    const __pm = [['start', __perfNow()]];
    const __mark = (n) => __pm.push([n, __perfNow()]);
    return { mark: __mark, now: __perfNow, marks: __pm };
}

export function reportStaticTiming(runtime, timing) {
    const { now: __perfNow, marks: __pm } = timing;
    let __ptot = __perfNow() - __pm[0][1];
    if (__ptot > 150 || runtime.deps.perfLog) {
        let __parts = [];
        for (let i = 1; i < __pm.length; i++) __parts.push(`${__pm[i][0]}:${Math.round(__pm[i][1] - __pm[i - 1][1])}`);
        runtime.deps.console.warn(`[perf] updateStaticUI ${Math.round(__ptot)}ms | ${__parts.join(' ')}`);
    }
}
