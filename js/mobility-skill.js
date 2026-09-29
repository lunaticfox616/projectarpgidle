/** 이동 스킬 칸 (스킬 변경분 2, 2026-09-30). Gems tagged 'mobility' are worn in their own slot next to the main attack
 * gem and cast by themselves: when the main gem has nothing in reach but the mobility gem does, it closes the gap, then
 * waits out its cooldown. The cast runs with the mobility gem's own stats, grid and native cast state — swapped into the
 * main slot for the synchronous call and swapped back — so every rule the gem already has applies unchanged, and the
 * main gem's casts in flight are never touched. Combat owns damage and movement; this only decides when to cast.
 */
const mobilitySkill = (() => {
    const DEFAULT_COOLDOWN_MS = 4000;
    const RETRY_MS = 400;
    let runtime = null, cooldownUntil = 0, lastStats = null, swappedMain = null;

    function isMobilityGem(name) {
        const def = SKILL_DB[name];
        return !!(def && def.isGem && Array.isArray(def.tags) && def.tags.includes('mobility'));
    }
    /** The worn mobility gem, or '' (an unowned or wrong-kind name never counts). */
    function equipped(state = game) {
        const name = state && state.mobilitySkill;
        return isMobilityGem(name) && Array.isArray(state.skills) && state.skills.includes(name) ? name : '';
    }
    function cooldownMs(name) { return Math.max(500, Number(SKILL_DB[name]?.mobilityCooldownMs) || DEFAULT_COOLDOWN_MS); }
    /** Runs fn with the mobility gem in the main slot (its stats, targets, grid and native runtime), then restores both. */
    function withGem(name, fn) {
        const main = game.activeSkill, mainRuntime = skillGemCombatRuntime;
        swappedMain = main; game.activeSkill = name; skillGemCombatRuntime = runtime;
        try { return fn(); }
        finally { runtime = skillGemCombatRuntime; skillGemCombatRuntime = mainRuntime; game.activeSkill = main; swappedMain = null; }
    }
    /** The main gem, even while a mobility cast holds its slot for a moment (a kill then still feeds the main gem). */
    function mainGem() { return swappedMain ?? game.activeSkill; }
    /** A cheap check before the full stats: does the gem's own rule reach any living enemy from here? */
    function reachable(name) {
        const live = (game.enemies || []).filter(e => e && e.hp > 0);
        return live.length > 0 && selectCombatGemTargets(name, SKILL_DB[name], game.gridPlayer, live).length > 0;
    }
    /** Every combat tick, with the main gem's casts: the mobility gem's own native casts move on
     * (암살 · 차원찢기 · 향로구름 · 작살화살 · 공중강타). */
    function advance() {
        const name = equipped();
        if (!name) { runtime = null; return; }
        if (runtime) withGem(name, () => updateSkillGemCombat(lastStats));
    }
    function ready(name, gate, now) {
        return !gate.blocked && !gate.inRange && now >= cooldownUntil && game.playerHp > 0 && !game.combatHalted
            && canUseSkillWithCurrentEquipment(name);
    }
    /** After the main attack loop. gate: { blocked, inRange } — the main cast delay or a hazard, and whether the main gem
     * already reaches an enemy (then there is no gap to close). True when the mobility gem was cast. */
    function cast(gate) {
        const name = equipped(), now = getCombatTime();
        if (!name || !ready(name, gate, now) || !reachable(name)) return false;
        return withGem(name, () => {
            const stats = getPlayerStats(false);
            if (!getSkillTargets(stats).length) { cooldownUntil = now + RETRY_MS; return false; }
            lastStats = stats;
            cooldownUntil = now + cooldownMs(name);
            actExplorationMotion.cancel(game.actExploration); // a step in progress stops: the move starts from the caster's cell
            performPlayerAttack(stats, { skillName: name });
            return true;
        });
    }
    /** True while a movement gem is mid-move (a tear, smoke, rope or leap): the caster neither walks nor attacks. */
    function moving() { return !!runtime && runtime.casts.some(c => c.move && !c.done); }
    /** Remaining cooldown for the HUD (0 when ready). */
    function cooldownLeft(now = getCombatTime()) { return Math.max(0, cooldownUntil - now); }
    function reset() { runtime = null; cooldownUntil = 0; lastStats = null; }
    /** The native cast state the renderer draws next to the main gem's. */
    function castState() { return runtime; }
    function capture() { return { runtime, cooldownUntil, lastStats }; }
    function restore(snapshot) {
        ({ runtime, cooldownUntil, lastStats } = snapshot || { runtime: null, cooldownUntil: 0, lastStats: null });
    }
    return Object.freeze({ isMobilityGem, equipped, cooldownMs, advance, cast, moving, mainGem, cooldownLeft, reset, castState, capture,
        restore });
})();
safeExposeGlobals({ mobilitySkill });
