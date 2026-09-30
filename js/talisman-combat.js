// 부적 조건부 줄의 전투 적용(2026-09-30, 예전 컨디션 젬 자리): 수호 · 함성 줄은 조건이 맞는 틱마다 컨디션 효과로 더하고
// (coreLoop가 예전 컨디션 버프와 같은 방식으로 적용), 저주 줄은 간격마다 살아 있는 적 하나에 건다(getEnemyConditionDebuffFactor).
// 같은 저주 줄이 여럿이면 가장 센 것 하나만 걸린다. 저주 최대치 · 저주 면역 · 컨디션 교본 · 흑마 재능은 예전 저주 규칙 그대로.
const talismanCombat = (() => {
    const readyAt = new Map();

    function lifePct(pStats) {
        return (Number(game.playerHp) || 0) / Math.max(1, Number(pStats.maxHp) || 1) * 100;
    }

    function conditionMet(when, pStats) {
        if (when === 'lowLife') return lifePct(pStats) <= TALISMAN_HEX_RULES.lowLifePct;
        if (when === 'fullLife') return lifePct(pStats) >= 99.5;
        const alive = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0);
        if (when === 'boss') return alive.some(enemy => enemy.isBoss);
        return when === 'crowd' && alive.length >= TALISMAN_HEX_RULES.crowdCount;
    }

    /** Guard and warcry lines whose condition holds now, in the condition-effect shape coreLoop applies. */
    function effects(pStats) {
        if (pStats.uniqueClosedEyes) return [];
        return talismanEffects.summarize().conditions
            .filter(line => line.kind !== 'curse' && conditionMet(line.when, pStats))
            .map(line => ({ buff: { name: 'talisman:' + line.id, type: line.kind }, delta: { [line.stat]: line.value } }));
    }

    function hexDelta(line) {
        if (line.effect === 'enemyTakenMul') return { enemyTakenMul: 1 + line.value / 100 };
        if (line.effect === 'enemyDmgMul') return { enemyDmgMul: 1 - line.value / 100 };
        return { [line.effect]: line.value };
    }

    function hexTarget() {
        const ignoreImmunity = typeof getPreciseTalentLevel === 'function' && getPreciseTalentLevel('hero3__warlock');
        return (game.enemies || []).find(enemy => enemy && enemy.hp > 0 && (!enemy.curseImmune || ignoreImmunity)) || null;
    }

    function applyHex(target, line, pStats, now) {
        const manual = pStats.uniqueConditionManual || {};
        const permanent = typeof getPreciseTalentLevel === 'function' && getPreciseTalentLevel('hero5__warlock');
        const durationMs = Math.floor(TALISMAN_HEX_RULES.durationMs * (1 + Math.max(0, Number(manual.durationPct) || 0) / 100));
        const name = 'talisman:' + line.id;
        const list = (game.enemyConditionDebuffs[target.id] || []).filter(row => row && row.name !== name);
        list.push({ name, delta: hexDelta(line), expiresAt: permanent ? Number.MAX_SAFE_INTEGER : now + durationMs, durationMs });
        game.enemyConditionDebuffs[target.id] = list.slice(-Math.max(1, Math.floor(pStats.curseCap || 1)));
    }

    function strongestHexes() {
        const byId = new Map();
        talismanEffects.summarize().conditions.forEach(line => {
            if (line.kind === 'curse' && !(byId.get(line.id)?.value >= line.value)) byId.set(line.id, line);
        });
        return [...byId.values()];
    }

    /** Curse lines: each fires on its own interval at the first living target. */
    function applyHexes(pStats, now) {
        if (pStats.uniqueClosedEyes) return;
        const lines = strongestHexes();
        const target = lines.length ? hexTarget() : null;
        if (!target) return;
        game.enemyConditionDebuffs = game.enemyConditionDebuffs || {};
        const cdr = Math.min(0.9, Math.max(0, Number((pStats.uniqueConditionManual || {}).cdrPct) || 0) / 100);
        const interval = Math.floor(TALISMAN_HEX_RULES.intervalMs * (1 - cdr));
        lines.forEach(line => {
            const wait = (readyAt.get(line.id) || 0) - now;
            // 전투 시계가 되돌아가면(불러오기 등) 남은 대기가 간격보다 길어진다. 그때는 대기를 버린다.
            if (wait > 0 && wait <= interval) return;
            readyAt.set(line.id, now + interval);
            applyHex(target, line, pStats, now);
        });
    }

    return Object.freeze({ effects, applyHexes, conditionMet });
})();
safeExposeGlobals({ talismanCombat });
