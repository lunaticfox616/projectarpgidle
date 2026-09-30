/** 이동 스킬 칸 (스킬 변경분 2, 2026-09-30). Gems tagged 'mobility' are worn in their own slot next to the main attack
 * gem. The player casts it with its key or the HUD slot (request); while auto-move is on it also casts by itself when the
 * main gem has nothing in reach but the mobility gem does (it closes the gap), then waits out its cooldown. The cast runs with the mobility gem's own stats, grid and native cast state — swapped into the
 * main slot for the synchronous call and swapped back — so every rule the gem already has applies unchanged, and the
 * main gem's casts in flight are never touched. Combat owns damage and movement; this only decides when to cast.
 * 예전 긴급 회피(2026-09-30): 보스 예고 범위가 영웅의 칸에 걸리면 먼저 그 범위 밖 가장 가까운 칸(3칸 이내)으로 피하고,
 * 이동 젬의 재사용 대기를 쓴다. 동결 · 기절 · 속박 중이거나 탈출로가 없으면 피하지 않고 대기도 쓰지 않는다.
 */
const mobilitySkill = (() => {
    const DEFAULT_COOLDOWN_MS = 4000;
    const RETRY_MS = 400;
    const REQUEST_MS = 1500; // a pressed key waits this long for the caster to be free (a cast delay, a hazard)
    const EVADE_RANGE = 3;
    let runtime = null, cooldownUntil = 0, lastStats = null, swappedMain = null, requestedAt = null;

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
    /** The player asked for it (key or HUD slot): '' when the next combat tick casts it, else why it cannot. */
    function request(now = getCombatTime()) {
        const name = equipped();
        if (!name) return '이동 스킬 젬을 장착하지 않았습니다';
        if (now < cooldownUntil) return `재사용 대기 ${(Math.ceil((cooldownUntil - now) / 100) / 10).toFixed(1)}초`;
        if (game.playerHp <= 0 || game.combatHalted) return '지금은 쓸 수 없습니다';
        if (!reachable(name)) return '닿는 적이 없습니다';
        requestedAt = now;
        return '';
    }
    /** Asked for by the player, or — auto-move on — the main gem has no enemy in reach (a gap to close). */
    function wanted(gate, now) {
        return (requestedAt !== null && now - requestedAt < REQUEST_MS) || (gate.auto && !gate.inRange);
    }
    function ready(name, gate, now) {
        return !gate.blocked && wanted(gate, now) && now >= cooldownUntil && game.playerHp > 0 && !game.combatHalted
            && canUseSkillWithCurrentEquipment(name);
    }
    /** The way out of a boss warning on the hero's cell: the nearest safe cell within reach, or null. */
    function evadeRoute() {
        if (!isPlayerThreatenedByBoss(game) || hasPlayerChannelBreakingAilment()) return null;
        const route = findNearestSafeGridRoute(game.gridPlayer, getBossWarningCells(game, pendingEnemyCombatAttacks));
        return route && route.distance > 0 && route.distance <= EVADE_RANGE ? route : null;
    }
    function evade(name, now) {
        const route = evadeRoute();
        if (!route) return false;
        const from = { gx: game.gridPlayer.gx, gy: game.gridPlayer.gy };
        actExplorationMotion.cancel(game.actExploration);
        Object.assign(game.gridPlayer, route.destination, { gridMoveTimer: 0 });
        combatTacticsRuntime.attackDelayUntil = Math.max(combatTacticsRuntime.attackDelayUntil, now + 180);
        addBattleFx('playerMobility', { fromCell: from, toCell: route.destination, duration: 180 });
        cooldownUntil = now + cooldownMs(name);
        requestedAt = null;
        return true;
    }
    /** After the main attack loop. gate: { blocked, inRange, auto } — the main cast delay or a hazard, whether the main gem
     * already reaches an enemy, and whether auto-move is on (the gap-closer is part of moving by itself).
     * True when the mobility gem was cast. */
    function cast(gate) {
        const name = equipped(), now = getCombatTime();
        if (!name || now < cooldownUntil || game.playerHp <= 0 || game.combatHalted) return false;
        if (evade(name, now)) return true;
        if (!ready(name, gate, now) || !reachable(name)) return false;
        return withGem(name, () => {
            const stats = getPlayerStats(false);
            if (!getSkillTargets(stats).length) { cooldownUntil = now + RETRY_MS; return false; }
            lastStats = stats;
            cooldownUntil = now + cooldownMs(name);
            requestedAt = null;
            actExplorationMotion.cancel(game.actExploration); // a step in progress stops: the move starts from the caster's cell
            performPlayerAttack(stats, { skillName: name });
            return true;
        });
    }
    /** True while a movement gem is mid-move (a tear, smoke, rope or leap): the caster neither walks nor attacks. */
    function moving() { return !!runtime && runtime.casts.some(c => c.move && !c.done); }
    /** Remaining cooldown for the HUD (0 when ready). */
    function cooldownLeft(now = getCombatTime()) { return Math.max(0, cooldownUntil - now); }
    function reset() { runtime = null; cooldownUntil = 0; lastStats = null; requestedAt = null; }
    /** The native cast state the renderer draws next to the main gem's. */
    function castState() { return runtime; }
    /** The pressed key rides in the snapshot too, so an offline replay cannot spend the live request. */
    function capture() { return { runtime, cooldownUntil, lastStats, requestedAt }; }
    function restore(snapshot) {
        ({ runtime, cooldownUntil, lastStats } = snapshot || { runtime: null, cooldownUntil: 0, lastStats: null });
        requestedAt = Number.isFinite(snapshot?.requestedAt) ? snapshot.requestedAt : null;
    }
    return Object.freeze({ isMobilityGem, equipped, cooldownMs, advance, request, cast, moving, mainGem, cooldownLeft, reset, castState,
        capture, restore });
})();
safeExposeGlobals({ mobilitySkill });
