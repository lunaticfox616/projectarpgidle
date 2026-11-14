/** @param {number} tier worn tier 1~3 (0 = no pips) @returns {string} the tier pips shown in the corner */
export function sigilPips(runtime, tier) {
    const count = Math.max(0, Math.min(3, Math.floor(Number(tier) || 0)));
    return count ? `<em>${'◆'.repeat(count)}</em>` : '';
}

/** @param {string} name support gem name @param {string} className extra classes of the box @param {number} [tier] pips to show
* @returns {string} the rune's picture from the atlas (a rune with none yet shows a star) with the tier pips in the corner */
export function sigilHtml(runtime, name, className, tier) {
    const cell = (0, runtime.deps.getSupportRuneArtCell)(name);
    const art = cell ? `<span class="support-rune-art" style="--col:${cell.col};--row:${cell.row}"></span>` : (0, runtime.deps.renderPixelIcon)('star', 'support-sigil-icon');
    return `<span class="support-sigil${cell ? ' is-art' : ''} is-tone-${(0, runtime.deps.getSupportRuneTone)(name)} ${className || ''}" aria-hidden="true">${art}${sigilPips(runtime, tier)}</span>`;
}

export function summonHtml(runtime, name, className) {
    const look = runtime.state.SUMMON_LOOKS[name];
    return look ? `<span class="support-sigil is-tone-${look[1]} ${className}" aria-label="${(0, runtime.deps.escapeHTML)(name)}">${(0, runtime.deps.renderPixelIcon)(look[0], 'support-sigil-icon')}</span>` : '';
}
