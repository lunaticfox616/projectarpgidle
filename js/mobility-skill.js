/** 이동 스킬 칸 (스킬 변경분 2, 2026-09-30). Gems tagged 'mobility' are worn in their own slot next to the main attack
 * gem. The player casts it with its key or the HUD slot (request); while auto-move is on it also casts by itself when the
 * main gem has nothing in reach but the mobility gem does (it closes the gap), then waits out its cooldown. The cast runs with the mobility gem's own stats, grid and native cast state — swapped into the
 * main slot for the synchronous call and swapped back — so every rule the gem already has applies unchanged, and the
 * main gem's casts in flight are never touched. Combat owns damage and movement; this only decides when to cast.
 * 예전 긴급 회피(2026-09-30): 보스 예고 범위가 영웅의 칸에 걸리면 먼저 그 범위 밖 가장 가까운 칸(3칸 이내)으로 피하고,
 * 이동 룬의 재사용 대기를 쓴다. 동결 · 기절 · 속박 중이거나 탈출로가 없으면 피하지 않고 대기도 쓰지 않는다.
 * 2026-10-07 사용자 요청: 저절로 피하면 보스 패턴이 의미가 없어(너무 강했다) 플레이어가 키나 HUD 칸을 눌렀을 때만 피한다.
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
    /** The rune's own cooldown, before the build's 재사용 대기시간 lines. */
    function baseCooldownMs(name) { return Math.max(500, Number(SKILL_DB[name]?.mobilityCooldownMs) || DEFAULT_COOLDOWN_MS); }
    /** After the build's lines (js/skills.js getSkillCooldownMs). Any gem's stats serve: the lines belong to the build, not the gem. */
    function cooldownMs(name, stats) { return getSkillCooldownMs(baseCooldownMs(name), stats, { mobility: true }); }
    /** 난사(2026-10-21 사용자: 세팅이 갖춰지면 쿨타임을 극한으로 줄여 난사): 줄들이 제 대기를 40% 아래로 줄이면, 자동 이동이 켜진 동안
     * 피해를 주는 이동 룬은 주 공격이 닿아도 준비될 때마다 나간다. 피해 없는 순간이동은 예전처럼 틈을 메울 때만 저절로 나간다. */
    const SPAM_COOLDOWN_SHARE = 0.4;
    function spams(name, stats) {
        const def = SKILL_DB[name] || {};
        return (Number(def.baseDmg) > 0 || Number(def.spellFlatBase) > 0) && cooldownMs(name, stats) <= baseCooldownMs(name) * SPAM_COOLDOWN_SHARE;
    }
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
     * (암살 · 차원찢기 · 향로구름 · 작살화살). */
    function advance() {
        const name = equipped();
        if (!name) { runtime = null; return; }
        if (runtime) withGem(name, () => updateSkillGemCombat(lastStats));
    }
    /** The player asked for it (key or HUD slot): '' when the next combat tick casts it, else why it cannot. */
    function request(now = getCombatTime()) {
        const name = equipped();
        if (!name) return '이동 스킬룬을 장착하지 않았습니다';
        if (now < cooldownUntil) return `재사용 대기 ${(Math.ceil((cooldownUntil - now) / 100) / 10).toFixed(1)}초`;
        if (game.playerHp <= 0 || game.combatHalted) return '지금은 쓸 수 없습니다';
        if (!canUseSkillWithCurrentEquipment(name)) return '지금 무기로는 쓸 수 없는 이동 스킬룬입니다'; // ready() refuses it too
        if (!reachable(name) && !evadeRoute()) return '닿는 적이 없습니다'; // a warned hero may press it just to step out
        requestedAt = now;
        return '';
    }
    /** The player pressed the key or the HUD slot a moment ago. */
    function requested(now) { return requestedAt !== null && now - requestedAt < REQUEST_MS; }
    /** Asked for by the player, or — auto-move on — the main gem has no enemy in reach (a gap to close), or the rune spams. */
    function wanted(name, gate, now) {
        return requested(now) || (gate.auto && (!gate.inRange || spams(name, gate.stats)));
    }
    function ready(name, gate, now) {
        return !gate.blocked && wanted(name, gate, now) && now >= cooldownUntil && game.playerHp > 0 && !game.combatHalted
            && canUseSkillWithCurrentEquipment(name);
    }
    /** The way out of a boss warning on the hero's cell: the nearest safe cell within reach, or null. */
    function evadeRoute() {
        if (!isPlayerThreatenedByBoss(game) || hasPlayerChannelBreakingAilment()) return null;
        const route = findNearestSafeGridRoute(game.gridPlayer, getBossWarningCells(game, pendingEnemyCombatAttacks));
        return route && route.distance > 0 && route.distance <= EVADE_RANGE ? route : null;
    }
    function evade(name, now, stats) {
        const route = evadeRoute();
        if (!route) return false;
        const from = { gx: game.gridPlayer.gx, gy: game.gridPlayer.gy };
        actExplorationMotion.cancel(game.actExploration);
        Object.assign(game.gridPlayer, route.destination, { gridMoveTimer: 0 });
        combatTacticsRuntime.attackDelayUntil = Math.max(combatTacticsRuntime.attackDelayUntil, now + 180);
        combatTacticsRuntime.recoverUntil = 0; // 이동기는 공격 후딜을 끊는다(js/combat.js isPlayerAttackRecovering)
        addBattleFx('playerMobility', { fromCell: from, toCell: route.destination, duration: 180 });
        cooldownUntil = now + cooldownMs(name, stats);
        requestedAt = null;
        return true;
    }
    /** After the main attack loop. gate: { blocked, inRange, auto, stats } — the main cast delay or a hazard, whether the main gem
     * already reaches an enemy, whether auto-move is on (the gap-closer is part of moving by itself), and the tick's stats
     * (their 재사용 대기시간 lines decide whether the rune spams). True when the mobility gem was cast. */
    function cast(gate) {
        const name = equipped(), now = getCombatTime();
        if (!name || now < cooldownUntil || game.playerHp <= 0 || game.combatHalted) return false;
        if (requested(now) && evade(name, now, gate.stats)) return true; // only on the player's press: never by itself (2026-10-07)
        if (!ready(name, gate, now) || !reachable(name)) return false;
        return withGem(name, () => {
            const stats = getPlayerStats(false);
            if (!getSkillTargets(stats).length) { cooldownUntil = now + RETRY_MS; return false; }
            lastStats = stats;
            cooldownUntil = now + cooldownMs(name, stats);
            requestedAt = null;
            actExplorationMotion.cancel(game.actExploration); // a step in progress stops: the move starts from the caster's cell
            combatTacticsRuntime.recoverUntil = 0; // 이동기는 공격 후딜을 끊는다
            performPlayerAttack(stats, { skillName: name });
            return true;
        });
    }
    const busy = state => !!state && state.casts.some(c => (c.move || c.holds) && !c.done);
    /** True while a movement gem is mid-move (a tear, smoke, rope or leap, 전도성 난격's cuts): the caster neither walks nor attacks.
     * 칼이 된 발걸음 puts a mobility gem in the main slot: its moves in the main runtime hold the caster the same way. */
    function moving() { return busy(runtime) || (isMobilityGem(game.activeSkill) && busy(skillGemCombatRuntime)); }
    /** Remaining cooldown for the HUD (0 when ready). */
    function cooldownLeft(now = getCombatTime()) { return Math.max(0, cooldownUntil - now); }
    /** Build switches cancel the old cast while retaining its cooldown. Save/zone resets still clear everything. */
    function reset(keepCooldown = false) { runtime = null; if (!keepCooldown) cooldownUntil = 0; lastStats = null; requestedAt = null; }
    /** The native cast state the renderer draws next to the main gem's. */
    function castState() { return runtime; }
    /** The pressed key rides in the snapshot too, so an offline replay cannot spend the live request. */
    function capture() { return { runtime, cooldownUntil, lastStats, requestedAt }; }
    function restore(snapshot) {
        ({ runtime, cooldownUntil, lastStats } = snapshot || { runtime: null, cooldownUntil: 0, lastStats: null });
        requestedAt = Number.isFinite(snapshot?.requestedAt) ? snapshot.requestedAt : null;
    }
    return Object.freeze({ isMobilityGem, equipped, baseCooldownMs, cooldownMs, advance, request, cast, moving, mainGem, cooldownLeft, reset, castState,
        capture, restore });
})();
safeExposeGlobals({ mobilitySkill });
