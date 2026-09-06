// UI-owned comparison of deliberate equipment/skill choices. No persisted state or network events.
(function () {
    let previousGame = null;
    let previousSignature = '';
    let previousStats = null;

    function showDpsDelta(before, after) {
        const delta = (after || 0) - (before || 0);
        if (Math.abs(delta) < 1) return;
        const change = `${delta > 0 ? '▲' : '▼'} ${COMPARE_STAT_META.dps.format(Math.abs(delta))}`;
        const message = `${change} DPS`;
        const toast = showGameToast(message, {duration: 3200});
        if (!toast) return;
        toast.classList.add(delta > 0 ? 'game-toast-dps-up' : 'game-toast-dps-down');
        const value = document.createElement('span');
        value.className = 'game-toast-dps-value';
        value.textContent = change;
        toast.lastElementChild.replaceChildren(value, document.createTextNode(' DPS'));
    }

    /** @param {ReturnType<typeof getPlayerStats>} stats Current displayed combat estimates. */
    function updateBuildFeedback(stats) {
        if (game.isBackgroundCalculation || stats.__uiFallbackStats) return;
        const signature = JSON.stringify([game.equipment, game.activeSkill, game.equippedSupports, game.equippedSummonSkills, game.summonSkillCounts]);
        if (previousGame === game && previousStats && previousSignature !== signature) {
            showDpsDelta(previousStats.dps, stats.dps);
        }
        previousGame = game;
        previousSignature = signature;
        previousStats = { dps: stats.dps };
    }

    safeExposeGlobals({updateBuildFeedback});
})();
