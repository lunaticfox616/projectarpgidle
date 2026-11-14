/** One load state shared by all aliases in a group, owned by the supplied bank, never global. */
function deferredImage(group, environment) {
    let cached = null, active = null, retryAfter = 0, deadline = null, disposed = false;
    function request() {
        const image = environment.createImage();
        active = image;
        if (environment.protocol() !== 'file:') image.crossOrigin = 'anonymous';
        image.decoding = 'async';
        const timeout = deadline = environment.schedule(() => fail('timeout'), 15000);
        function fail(reason) {
            if (active !== image) return;
            environment.cancel(timeout);
            deadline = null;
            active = null;
            retryAfter = environment.now() + 5000;
            environment.warn('battle image load failed:', group.src, reason);
        }
        image.onload = () => {
            if (active !== image) return;
            environment.cancel(timeout);
            deadline = null;
            cached = image;
            active = null;
        };
        image.onerror = () => fail('network');
        image.src = group.src;
    }
    return {
        get() {
            if (!disposed && !cached && !active && environment.now() >= retryAfter) request();
            return cached;
        },
        set(image) { if (!disposed) cached = image; },
        dispose() {
            disposed = true;
            if (deadline !== null) environment.cancel(deadline);
            if (active) { active.onload = null; active.onerror = null; }
            deadline = null; active = null; cached = null;
        }
    };
}

export function registerDeferredBattleImage(images, group, environment) {
    const access = deferredImage(group, environment);
    for (const key of group.keys) Object.defineProperty(images, key, { configurable: true, enumerable: true, ...access });
    return access.dispose;
}

/** Same URL aliases share a request. Backdrops and inactive skill sheets stay demand-loaded. */
export function prepareBattleAssetGroups(manifest, criticalKeys, images, activeSkill, options) {
    const { profiles, signatures, backdrops, environment } = options;
    const activeSignature = profiles[activeSkill]?.signature;
    const deferredKeys = new Set(Object.entries(signatures)
        .filter(([signature]) => signature !== activeSignature).map(([, spec]) => spec.asset));
    const groups = new Map();
    for (const [key, path] of Object.entries(manifest)) {
        const src = key.startsWith('skillFx') ? path.replace(/\.png$/, '.webp') : path;
        if (!groups.has(src)) groups.set(src, { src, keys: [], priority: 3 });
        const group = groups.get(src);
        group.keys.push(key);
        if (criticalKeys.has(key)) group.priority = Math.min(group.priority, 0);
        else if (key.startsWith('backdrop')) group.priority = Math.min(group.priority, 1);
        else if (key.startsWith('bossAct')) group.priority = Math.min(group.priority, 2);
    }
    return Array.from(groups.values()).filter(group => {
        if (group.keys.every(key => /^(bg|backdrop)/.test(key) && !criticalKeys.has(key))) {
            const dispose = registerDeferredBattleImage(backdrops, group, environment);
            options.onDeferred?.(dispose);
            return false;
        }
        if (group.keys.some(key => !deferredKeys.has(key))) return true;
        const dispose = registerDeferredBattleImage(images, group, environment);
        options.onDeferred?.(dispose);
        return false;
    }).sort((a, b) => a.priority - b.priority || a.src.localeCompare(b.src));
}
