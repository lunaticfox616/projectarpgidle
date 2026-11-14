

export function stallRulesRandom(stall) {
    stall.rng = (Math.imul(stall.rng, 1664525) + 1013904223) >>> 0;
    return stall.rng / 4294967296;
}

export function stallRulesVisitDelay(env, stall) {
    // Hash the saved RNG without consuming it: listing/relisting cannot reroll buyer choices.
    let seed = stall.rng ^ 0x9e3779b9;
    seed = Math.imul(seed ^ seed >>> 16, 0x21f0aaad);
    seed = Math.imul(seed ^ seed >>> 15, 0x735a2d97);
    const roll = ((seed ^ seed >>> 15) >>> 0) / 4294967296;
    return Math.round(Math.min(env.rules.maxVisitMs, env.rules.minVisitMs - Math.log1p(-roll) * env.rules.visitSpreadMs));
}

export function stallRulesReadyAt(env, row) {
    return Math.max(row.listedAt + env.rules.minimumAgeMs, (row.priceChangedAt || row.listedAt) + env.rules.repriceDelayMs);
}

export function stallRulesValidPriceChangeAt(row, lastAt) {
    return Number.isSafeInteger(row.priceChangedAt) && row.priceChangedAt >= row.listedAt && row.priceChangedAt <= lastAt;
}

/** The stall's clock for a request at wall time now: never behind the settlement watermark. A device clock set back (put right
 * after running ahead, or a save from a device that ran ahead) still manages the stall at once, dated at the watermark, so nothing
 * is backdated or replayed; visits resume when the clock reaches the watermark again. */
export function stallRulesStallClock(stall, now) { return Math.max(now, stall.lastAt); }
