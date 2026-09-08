/**
 * Effect images are independent of the character/enemy atlas. Existing renderers read the
 * same image keys; their normal fallback remains available while the requested image loads.
 * @param {Record<string, HTMLImageElement|null>} images Image bank owned by this load generation.
 * @param {{src:string, keys:string[]}} group Aliases sharing one lossless effect sheet.
 */
function registerDeferredBattleEffect(images, group) {
    let cached = null, active = null, retryAfter = 0;
    function request() {
        const image = new Image();
        active = image;
        if (location.protocol !== 'file:') image.crossOrigin = 'anonymous';
        image.decoding = 'async';
        const timeout = setTimeout(() => fail('timeout'), 15000);
        function fail(reason) {
            if (active !== image) return;
            clearTimeout(timeout);
            active = null;
            retryAfter = Date.now() + 5000;
            console.warn('battle effect load failed:', group.src, reason);
        }
        image.onload = () => {
            if (active !== image) return;
            clearTimeout(timeout);
            cached = image;
            active = null;
        };
        image.onerror = () => fail('network');
        image.src = group.src;
    }
    for (const key of group.keys) {
        Object.defineProperty(images, key, {
            configurable: true, enumerable: true,
            get() {
                if (!cached && !active && Date.now() >= retryAfter) request();
                return cached;
            },
            set(image) { cached = image; }
        });
    }
}
/** Build the bounded startup queue; unused signature sheets remain demand-loaded.
 * @param {Record<string,string>} manifest
 * @param {Set<string>} criticalKeys
 * @param {Record<string, HTMLImageElement|null>} images
 * @param {string} activeSkill
 * @returns {Array<{src:string,keys:string[],priority:number}>}
 */
function prepareBattleAssetGroups(manifest, criticalKeys, images, activeSkill) {
    const activeSignature = SKILL_GEM_VFX_PROFILES[activeSkill]?.signature;
    const deferredKeys = new Set(Object.entries(SKILL_SIGNATURE_SPRITES)
        .filter(([signature]) => signature !== activeSignature).map(([, spec]) => spec.asset));
    const groups = new Map();
    for (const [key, path] of Object.entries(manifest)) {
        const src = key.startsWith('skillFx') ? path.replace(/\.png$/, '.webp') : path;
        if (!groups.has(src)) groups.set(src, {src, keys:[], priority:3});
        const group = groups.get(src);
        group.keys.push(key);
        if (criticalKeys.has(key)) group.priority = Math.min(group.priority, 0);
        else if (key.startsWith('backdrop')) group.priority = Math.min(group.priority, 1);
        else if (key.startsWith('bossAct') || key === 'enemies2' || key === 'enemies3') group.priority = Math.min(group.priority, 2);
    }
    return Array.from(groups.values()).filter(group => {
        if (group.keys.some(key => !deferredKeys.has(key))) return true;
        registerDeferredBattleEffect(images, group);
        return false;
    }).sort((a, b) => a.priority - b.priority || a.src.localeCompare(b.src));
}
safeExposeGlobals({ registerDeferredBattleEffect, prepareBattleAssetGroups });
