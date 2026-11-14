

export function hexLifePct(env, pStats) {
        return (Number(env.owner.playerHp) || 0) / Math.max(1, Number(pStats.maxHp) || 1) * 100;
    }

export function hexConditionMet(env, when, pStats) {
        if (when === 'lowLife') return hexLifePct(env, pStats) <= env.deps.TALISMAN_HEX_RULES.lowLifePct;
        if (when === 'fullLife') return hexLifePct(env, pStats) >= env.deps.TALISMAN_HEX_RULES.fullLifePct;
        const alive = (env.owner.enemies || []).filter(enemy => enemy && enemy.hp > 0);
        if (when === 'boss') return alive.some(enemy => enemy.isBoss);
        return when === 'crowd' && alive.length >= env.deps.TALISMAN_HEX_RULES.crowdCount;
    }

/** One line per id: the strongest of its kind on the board. */
    export function hexStrongest(env, kindTest) {
        const byId = new Map();
        env.deps.talismanEffects.summarize().conditions.forEach(line => {
            if (kindTest(line.kind) && !(byId.get(line.id)?.value >= line.value)) byId.set(line.id, line);
        });
        return [...byId.values()];
    }

// 서로 다른 줄끼리 세기를 견줄 때: 룬 줄은 위력 %, 한 가지 능력치 줄은 굴림 범위 최대치에 대한 비율.
    export function hexStrength(line) {
        return line.delta ? line.value / 100 : line.value / Math.max(1e-9, line.max);
    }

export function hexToEffect(env, line) {
        return { buff: { name: 'talisman:' + line.id, type: line.kind }, delta: env.deps.talismans.conditionDelta(line) };
    }

export function hexInstantWarcry(env) {
        return typeof env.deps.isTalentInstantWarcryActive === 'function' && env.deps.isTalentInstantWarcryActive();
    }

export function hexAlwaysOn(line, pStats, quake) {
        return (quake && line.kind === 'warcry') || (!!pStats.cosmosGuardianAlways && line.kind === 'guard');
    }

/** Guard and warcry lines active now, in the condition-effect shape coreLoop applies. */
    export function hexEffects(env, pStats) {
        if (pStats.uniqueClosedEyes) return (env.memo.lastActive = []);
        const quake = hexInstantWarcry(env);
        const lines = hexStrongest(env, kind => kind !== 'curse').filter(line => hexAlwaysOn(line, pStats, quake) || hexConditionMet(env, line.when, pStats));
        const warcries = lines.filter(line => line.kind === 'warcry');
        const applied = quake ? lines.filter(line => line.kind !== 'warcry').concat(warcries.sort((a, b) => hexStrength(b) - hexStrength(a)).slice(0, 1)) : lines;
        const out = applied.map(line => hexToEffect(env, line));
        const resonance = Number(pStats.uniqueWarcryResonancePct) || 0;
        if (resonance > 0 && warcries.length) out.push({ buff: { name: 'talisman:resonance', type: 'warcry' }, delta: { pctDmg: warcries.length * resonance } });
        return (env.memo.lastActive = out);
    }

/** The effects applied on the latest tick (HUD icons, slam echo). */
    export function hexActive(env) {
        return env.memo.lastActive;
    }

export function hexHexTarget(env) {
        return (env.owner.enemies || []).find(enemy => enemy && enemy.hp > 0 && !enemy.curseImmune) || null;
    }

export function hexApplyHex(env, target, line, pStats, now) {
        const manual = pStats.uniqueConditionManual || {};
        const permanent = typeof env.deps.getPreciseTalentLevel === 'function' && env.deps.getPreciseTalentLevel('hero5__warlock');
        const durationMs = Math.floor(env.deps.TALISMAN_HEX_RULES.durationMs * (1 + Math.max(0, Number(manual.durationPct) || 0) / 100));
        const name = 'talisman:' + line.id;
        const list = (env.owner.enemyConditionDebuffs[target.id] || []).filter(row => row && row.name !== name);
        list.push({ name, delta: env.deps.talismans.conditionDelta(line), expiresAt: permanent ? Number.MAX_SAFE_INTEGER : now + durationMs, durationMs });
        env.owner.enemyConditionDebuffs[target.id] = list.slice(-Math.max(1, Math.floor(pStats.curseCap || 1)));
    }

/** 저주 간격: 컨디션 교본의 간격 감소(그 줄에만, 감소 상한 90%)에 재사용 대기시간 줄(js/skills.js getSkillCooldownMs, 2026-10-21)을 더한다. */
    export function hexHexInterval(env, pStats) {
        const manualPct = Math.max(0, Number((pStats.uniqueConditionManual || {}).cdrPct) || 0);
        return env.deps.getSkillCooldownMs(env.deps.TALISMAN_HEX_RULES.intervalMs, pStats, { extraReductionPct: manualPct, reductionCapPct: 90, floorMs: 1000 });
    }

/** Curse lines: each fires on its own interval at the first living target. */
    export function hexApplyHexes(env, pStats, now) {
        if (pStats.uniqueClosedEyes) return;
        const lines = hexStrongest(env, kind => kind === 'curse');
        const target = lines.length ? hexHexTarget(env) : null;
        if (!target) return;
        env.owner.enemyConditionDebuffs = env.owner.enemyConditionDebuffs || {};
        const interval = hexHexInterval(env, pStats);
        lines.forEach(line => {
            const wait = (env.memo.readyAt.get(line.id) || 0) - now;
            // 전투 시계가 되돌아가면(불러오기 등) 남은 대기가 간격보다 길어진다. 그때는 대기를 버린다.
            if (wait > 0 && wait <= interval) return;
            env.memo.readyAt.set(line.id, now + interval);
            hexApplyHex(env, target, line, pStats, now);
        });
    }

/** One owner per application: cooldowns survive owner replacement as before; never store game in the memo. */
export function createTalismanCombatOwner(bindings) {
    const env = { get owner() { return bindings.owner; }, deps: bindings.deps, memo: { readyAt: new Map(), lastActive: [] } };
    return Object.freeze({
        effects(stats) { return hexEffects(env, stats); },
        active() { return hexActive(env); },
        applyHexes(stats, now) { return hexApplyHexes(env, stats, now); },
        conditionMet(when, stats) { return hexConditionMet(env, when, stats); }
    });
}
