// UI-owned comparison of deliberate equipment/skill choices. No persisted state or network events.
// The DPS change shows as a small chip right above the life orb — the player's own stats — instead of the shared toast
// corner (top right on PC, over the minimap and window close buttons; bottom on phones, over the orb itself).
(function () {
    let previousGame = null;
    let previousSignature = '';
    let previousStats = null;
    let chipTimer = null;

    function visibleRect(selector) {
        const node = document.querySelector(selector);
        if (!node) return null;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && getComputedStyle(node).visibility !== 'hidden' ? rect : null;
    }
    /** The top of what sits right under the chip: the life orb, or on phones the collapsed combat log stacked on it. */
    function floorTop(orb) {
        const log = visibleRect('.combat-feed'), bar = visibleRect('#tab-header-bottom');
        if (!orb) return bar ? bar.top : window.innerHeight - 96;
        const stacked = log && log.bottom <= orb.top + 12 && log.bottom > orb.top - 60 && log.left < orb.right;
        return stacked ? log.top : orb.top;
    }
    /** Where the chip's bottom edge sits (CSS px from the top, after the display zoom), and its left edge (null → centred):
     * above the life orb; above the phone tab bar when the orb is hidden; never under an open guide card it would overlap. */
    function chipAnchor(width) {
        const factor = uiDisplay.factor || 1, orb = visibleRect('#ui-hp-bar'), card = visibleRect('#tutorial-overlay.active .tutorial-card');
        const floor = floorTop(orb), left = orb ? orb.left : null;
        const underCard = card && card.top < floor && (left === null || (card.left < left + width && card.right > left));
        return { top: ((underCard ? card.top : floor) - 8) / factor, left: left === null ? null : left / factor };
    }
    function showDpsDelta(before, after) {
        const delta = (after || 0) - (before || 0);
        if (Math.abs(delta) < 1) return;
        const change = `${delta > 0 ? '▲' : '▼'} ${COMPARE_STAT_META.dps.format(Math.abs(delta))}`;
        document.querySelectorAll('.build-dps-chip').forEach(node => node.remove());
        const chip = document.createElement('div'), value = document.createElement('span');
        chip.className = `build-dps-chip ${delta > 0 ? 'is-up' : 'is-down'}`;
        chip.setAttribute('role', 'status');
        value.className = 'build-dps-chip-value';
        value.textContent = change;
        chip.append(value, document.createTextNode(' DPS'));
        document.body.appendChild(chip);
        const anchor = chipAnchor(chip.getBoundingClientRect().width);
        chip.classList.toggle('is-centered', anchor.left === null);
        chip.style.top = `${anchor.top}px`;
        if (anchor.left !== null) chip.style.left = `${anchor.left}px`;
        clearTimeout(chipTimer);
        chipTimer = setTimeout(() => chip.remove(), 3200);
    }

    /** @param {ReturnType<typeof getPlayerStats>} stats Current displayed combat estimates. */
    function updateBuildFeedback(stats) {
        if (game.isBackgroundCalculation || stats.__uiFallbackStats) return;
        const signature = JSON.stringify([game.equipment, game.activeSkill, game.mobilitySkill, game.equippedSupports, game.equippedSummonSkills, game.summonSkillCounts]);
        if (previousGame === game && previousStats && previousSignature !== signature) {
            showDpsDelta(previousStats.dps, stats.dps);
        }
        previousGame = game;
        previousSignature = signature;
        previousStats = { dps: stats.dps };
    }

    safeExposeGlobals({updateBuildFeedback});
})();
