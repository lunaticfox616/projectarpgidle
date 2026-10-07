// 세계수 기운(12번 루프 27, 2026-10-08, docs/loop-content-12-plan-20261008.md): 지역 전용 줄 20개(data/region-affixes.js)의 전투 효과.
// 줄 값은 getPlayerStats가 pStats.regionAffix로 모으고(collect), 전투(js/combat.js)는 적중, 처치, 막기, 피격 자리에서 여기를 한 번씩
// 부른다. 상태 이상은 enemy.ailments의 줄({ type, time, ... })이고, 번짐과 얼음 파편은 쓰러진 적의 칸에서 거리 안(칸, 체비쇼프)의
// 살아 있는 적에게만 간다. 효과의 고정 수치는 REGION_AFFIX_EFFECTS.
const regionAffixEffects = (() => {
    const E = REGION_AFFIX_EFFECTS;
    const IDS = Object.freeze(REGION_AFFIX_MODS.map(row => row.statId));
    const SPREADS = Object.freeze([['poison', 'regionPoisonSpread', '독 번짐', 'chaos'], ['shock', 'regionShockSpread', '감전 번짐', 'light'],
        ['ignite', 'regionIgniteSpread', '불씨 옮김', 'fire']]);

    /** The region stat totals of one stat evaluation (sum = getPlayerStats' bucket sum). */
    function collect(sum) {
        return Object.freeze(Object.fromEntries(IDS.map(id => [id, Math.max(0, Number(sum(id)) || 0)])));
    }
    function value(pStats, id) {
        return Math.max(0, Number(pStats && pStats.regionAffix && pStats.regionAffix[id]) || 0);
    }
    function num(raw) { return Number(raw) || 0; }
    function activeRow(enemy, type) {
        return (enemy && Array.isArray(enemy.ailments) ? enemy.ailments : []).find(row => row && row.type === type && (row.time || 0) > 0) || null;
    }
    function hasAilment(enemy, type) { return !!activeRow(enemy, type); }
    /** Living enemies other than source within range cells of it, nearest first. */
    function nearby(source, range) {
        return (game.enemies || []).filter(target => target && target.id !== source.id && target.hp > 0)
            .map(target => ({ target, distance: getGridUnitDistance(source, target) })).filter(row => row.distance <= range)
            .sort((a, b) => a.distance - b.distance).map(row => row.target);
    }
    function zoneTier() { return (getZone(game.currentZoneId) || {}).tier || 1; }
    /** Elemental damage to another enemy (its resistance counts), with its hit mark; a kill goes through the death handler. */
    function strike(target, pStats, element, raw, from) {
        const damage = Math.max(1, Math.floor(raw * (1 - getEffectiveEnemyMitigation(element, zoneTier(), target, pStats) / 100)));
        applyDamageToEnemyResource(target, damage);
        addBattleFx('hit', { enemyId: target.id, color: getElementColor(element), damage, element,
            ...(from ? { stageKind: 'chainJump', chainFromEnemyId: from.id } : {}) });
        if (target.hp <= 0) handleEnemyDeath(target, pStats);
    }

    // ── 적중 ─────────────────────────────────────────────
    /** Resistance this hit ignores: a shocked target's lightning resistance, the chaos shred stacks. */
    function resistanceShred(pStats, enemy, element) {
        if (element === 'light' && hasAilment(enemy, 'shock')) return value(pStats, 'regionShockedLightPen');
        const shred = element === 'chaos' ? activeRow(enemy, 'regionChaosShred') : null;
        return shred ? num(shred.stacks) * num(shred.power) : 0;
    }
    /** The hit's element bonus: armor for physical, overcapped chaos resistance for chaos, full life for fire. */
    function elementMultiplier(pStats, element) {
        if (element === 'phys') return 1 + Math.floor(num(pStats.armor) / E.armorStep) * value(pStats, 'regionArmorToPhys') / 100;
        if (element === 'chaos') return 1 + Math.max(0, num(pStats.rawResChaos) - num(pStats.maxResChaos)) * value(pStats, 'regionChaosOvercap') / 100;
        const fullLife = element === 'fire' && num(game.playerHp) >= num(pStats.maxHp);
        return fullLife ? 1 + value(pStats, 'regionFullLifeFire') / 100 : 1;
    }
    /** Conditional damage of one hit as a multiplier: bleeding, ignited, a crit on a frozen target, and the element bonus. */
    function damageMultiplier(pStats, enemy, element, isCrit) {
        if (!pStats || !pStats.regionAffix) return 1;
        let mul = elementMultiplier(pStats, element);
        if (hasAilment(enemy, 'bleed')) mul *= 1 + value(pStats, 'regionBleedingDamage') / 100;
        if (hasAilment(enemy, 'ignite')) mul *= 1 + value(pStats, 'regionIgnitedDamage') / 100;
        if (isCrit && hasAilment(enemy, 'freeze')) mul *= 1 + value(pStats, 'regionFrozenCritDamage') / 100;
        return mul;
    }
    function stackChaosShred(pStats, enemy) {
        const pct = value(pStats, 'regionChaosShred');
        if (pct <= 0) return;
        enemy.ailments = Array.isArray(enemy.ailments) ? enemy.ailments : [];
        let row = enemy.ailments.find(a => a && a.type === 'regionChaosShred');
        if (!row) enemy.ailments.push(row = { type: 'regionChaosShred', stacks: 0, power: 0, time: 0 });
        row.stacks = Math.min(E.chaosShredStacks, num(row.stacks) + 1);
        row.power = Math.max(num(row.power), pct);
        row.time = E.chaosShredSec;
    }
    function chainLightning(pStats, enemy, hit) {
        const chance = value(pStats, 'regionShockChain');
        if (chance <= 0 || Math.random() * 100 >= chance) return;
        const target = nearby(enemy, E.chainRange)[0];
        if (target) strike(target, pStats, 'light', num(hit.damage) * E.chainDamagePct / 100, enemy);
    }
    /** After a hit lands (hit = { crit, damage }): chaos shred stacks, a lightning bolt off a shocked target, the crit move buff,
     * leech from a poisoned target. */
    function afterHit(pStats, enemy, hit) {
        if (!enemy || !pStats || !pStats.regionAffix) return;
        stackChaosShred(pStats, enemy);
        if (hasAilment(enemy, 'shock')) chainLightning(pStats, enemy, hit);
        const move = value(pStats, 'regionCritMove');
        if (hit.crit && move > 0) game.regionCritMove = { pct: move, until: getCombatTime() + E.critMoveMs };
        const leech = hasAilment(enemy, 'poison') ? value(pStats, 'regionPoisonedLeech') : 0;
        if (leech > 0 && num(hit.damage) > 0) addPlayerLeechInstance(num(hit.damage) * leech / 100, pStats, getPlayerHitLeechTarget(pStats));
    }
    /** Off-element ailment chances for applyEnemyAilmentFromHit: chill on any hit. */
    function extraAilmentChances(pStats) {
        const pct = value(pStats, 'regionChillOnHit');
        return pct > 0 ? { chill: Math.min(1, pct / 100) } : undefined;
    }
    function ailmentDurationMultiplier(pStats, type) {
        return type === 'ignite' ? 1 + value(pStats, 'regionIgniteDuration') / 100 : 1;
    }

    // ── 처치 ─────────────────────────────────────────────
    /** A share of the dead enemy's ailment of that type goes to the living enemies within spreadRange. */
    function spreadAilment(enemy, pStats, [type, id, text, element]) {
        const share = value(pStats, id) / 100, row = share > 0 ? activeRow(enemy, type) : null;
        const copy = row && cloneEnemyAilmentForSpread(row, pStats);
        if (!copy) return;
        copy.power *= share;
        if (copy.sourceHitDamage) copy.sourceHitDamage = Math.floor(copy.sourceHitDamage * share);
        if (copy.ailmentDotScore) copy.ailmentDotScore *= share;
        const targets = nearby(enemy, E.spreadRange);
        targets.forEach(target => mergeEnemyAilment(target, { ...copy }, pStats));
        if (targets.length) addBattleFx('statusText', { enemyId: enemy.id, text, color: getElementColor(element), duration: 320, dedupeKey: `region-spread-${type}` });
    }
    /** A frozen enemy's death: ice shards hit the living enemies within shatterRange for a share of its maximum life (cold). */
    function shatter(enemy, pStats) {
        const pct = value(pStats, 'regionShatter');
        if (pct <= 0 || !hasAilment(enemy, 'freeze')) return;
        const raw = Math.floor(num(enemy.maxHp) * pct / 100);
        nearby(enemy, E.shatterRange).forEach(target => strike(target, pStats, 'cold', raw, null));
    }
    function onEnemyDeath(enemy, pStats) {
        if (!enemy || !pStats || !pStats.regionAffix) return;
        SPREADS.forEach(spread => spreadAilment(enemy, pStats, spread));
        shatter(enemy, pStats);
    }

    // ── 막기, 피격, 이동 ───────────────────────────────────
    function onBlock(pStats, now) {
        const pct = value(pStats, 'regionBlockEmpower');
        if (pct > 0) game.regionBlockEmpower = { pct, until: now + E.blockEmpowerMs };
    }
    /** The next attack after a block (once). */
    function consumeBlockEmpower(now) {
        const buff = game.regionBlockEmpower;
        if (!buff || num(buff.until) <= now) return 1;
        game.regionBlockEmpower = null;
        return 1 + Math.max(0, num(buff.pct)) / 100;
    }
    /** Damage taken as a multiplier: at half life or less, and from a chilled attacker (capped together). */
    function takenDamageMultiplier(pStats, attacker) {
        if (!pStats || !pStats.regionAffix) return 1;
        let pct = num(game.playerHp) <= num(pStats.maxHp) * E.lowLifeRatio ? value(pStats, 'regionLowLifeDR') : 0;
        if (hasAilment(attacker, 'chill')) pct += value(pStats, 'regionChilledAttackerDR');
        return 1 - Math.min(E.takenReductionCapPct, pct) / 100;
    }
    function moveBonus(now) {
        const buff = game.regionCritMove;
        return buff && num(buff.until) > now ? Math.max(0, num(buff.pct)) : 0;
    }

    return Object.freeze({ collect, resistanceShred, damageMultiplier, afterHit, extraAilmentChances, ailmentDurationMultiplier, onEnemyDeath,
        onBlock, consumeBlockEmpower, takenDamageMultiplier, moveBonus, hasAilment });
})();
safeExposeGlobals({ regionAffixEffects });
