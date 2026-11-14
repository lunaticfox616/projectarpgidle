/** Movement presentation only. Never updates the combat cell or applies a hit. */
export function pullEase(M, ft) {
    if (!M.moved || ft < M.pull0) return 0;
    const u = Math.min(1, (ft - M.pull0) / Math.max(1, M.pull1 - M.pull0));
    return 1 - (1 - u) * (1 - u);
}

function vanish(M, now) {                                 // 54·55: fades out over the first 42% of the window, back in over the last
    const u = (now - M.vanish[0]) / Math.max(1, M.vanish[1] - M.vanish[0]);
    if (u < 0 || u >= 1) return null;
    return { u, alpha: u < 0.42 ? 1 - u / 0.42 : (u < 0.58 ? 0 : (u - 0.58) / 0.42) };
}

function riftSlide(M, v) {                                // 54 slides half a cell into the tear, then out of the exit into its cell
    const L = Math.hypot(M.to.gx - M.from.gx, M.to.gy - M.from.gy) || 1, dx = (M.to.gx - M.from.gx) / L, dy = (M.to.gy - M.from.gy) / L;
    const k = v.u < 0.5 ? Math.min(1, v.u / 0.42) * 0.45 : -Math.min(1, (1 - v.u) / 0.42) * 0.45;
    return { dx: dx * k * 16, dy: dy * k * 16 };
}

function glide(M, now) {                                  // 56, 77: pulled along the rope (fast, then slowing), still in the shot pose
    if (!M.moved || now < M.pull0 || now >= M.pull1) return null;
    const k = pullEase(M, now);
    return { alpha: 1, dx: (M.to.gx - M.from.gx) * k * 16, dy: (M.to.gy - M.from.gy) * k * 16, lift: 0 };
}

/** After the pull, until combat has moved the caster into its new cell (up to one tick): stay there. */
function arrived(M, now) {
    const end = M.pull1;
    return now >= end && now < end + 300 ? { alpha: 1, lift: 0, dx: (M.to.gx - M.from.gx) * 16, dy: (M.to.gy - M.from.gy) * 16 } : null;
}

/** Where the caster is drawn during a movement cast, relative to the cell it occupies (board dots) — null otherwise.
 * waiting: combat has not moved the caster out of M.from yet (the visual clock runs up to a tick ahead). */
export function moveCaster(id, M, now, waiting) {
    if (id === 56 || id === 77) return glide(M, now) || (waiting ? arrived(M, now) : null);
    const v = vanish(M, now);
    if (!v) return null;
    if (waiting && v.u >= 0.5) return { alpha: 0, lift: 0, dx: 0, dy: 0 };   // out of sight until it steps out of the other side
    return { alpha: v.alpha, lift: 0, ...(id === 54 ? riftSlide(M, v) : { dx: 0, dy: 0 }) };
}
