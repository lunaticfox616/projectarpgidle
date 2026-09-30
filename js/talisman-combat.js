// 부적 조건부 줄의 전투 적용(2026-09-30, 예전 컨디션 젬 자리): 수호 · 함성 줄은 조건이 맞는 틱마다 컨디션 효과로 더하고
// (coreLoop가 효과표를 적용), 저주 줄은 간격마다 살아 있는 적 하나에 건다(getEnemyConditionDebuffFactor · 적 공격 둔화가 읽는다).
// 같은 줄(id)이 여럿이면 가장 센 것 하나만 쓴다. 저주 최대치 · 저주 면역 · 컨디션 교본 · 흑마 재능은 예전 저주 규칙 그대로.
// 땅울림(전사 재능): 함성 줄이 조건 없이 늘 켜지지만 가장 센 함성 하나의 효과만 적용되고, 함성 수 판정은 모두 센다.
// 함성 공명 허리띠: 켜진 함성 줄 하나당 피해 증폭. 다크드러그 워록: 저주 간격이 절반. 인력(우주계 신발): 수호 줄이 늘 켜짐.
const talismanCombat = (() => {
    const readyAt = new Map();
    let lastActive = [];

    function lifePct(pStats) {
        return (Number(game.playerHp) || 0) / Math.max(1, Number(pStats.maxHp) || 1) * 100;
    }

    function conditionMet(when, pStats) {
        if (when === 'lowLife') return lifePct(pStats) <= TALISMAN_HEX_RULES.lowLifePct;
        if (when === 'fullLife') return lifePct(pStats) >= TALISMAN_HEX_RULES.fullLifePct;
        const alive = (game.enemies || []).filter(enemy => enemy && enemy.hp > 0);
        if (when === 'boss') return alive.some(enemy => enemy.isBoss);
        return when === 'crowd' && alive.length >= TALISMAN_HEX_RULES.crowdCount;
    }

    /** One line per id: the strongest of its kind on the board. */
    function strongest(kindTest) {
        const byId = new Map();
        talismanEffects.summarize().conditions.forEach(line => {
            if (kindTest(line.kind) && !(byId.get(line.id)?.value >= line.value)) byId.set(line.id, line);
        });
        return [...byId.values()];
    }

    // 서로 다른 줄끼리 세기를 견줄 때: 젬 줄은 위력 %, 한 가지 능력치 줄은 굴림 범위 최대치에 대한 비율.
    function strength(line) {
        return line.delta ? line.value / 100 : line.value / Math.max(1e-9, line.max);
    }

    function toEffect(line) {
        return { buff: { name: 'talisman:' + line.id, type: line.kind }, delta: talismans.conditionDelta(line) };
    }

    function instantWarcry() {
        return typeof isTalentInstantWarcryActive === 'function' && isTalentInstantWarcryActive();
    }

    function alwaysOn(line, pStats, quake) {
        return (quake && line.kind === 'warcry') || (!!pStats.cosmosGuardianAlways && line.kind === 'guard');
    }

    /** Guard and warcry lines active now, in the condition-effect shape coreLoop applies. */
    function effects(pStats) {
        if (pStats.uniqueClosedEyes) return (lastActive = []);
        const quake = instantWarcry();
        const lines = strongest(kind => kind !== 'curse').filter(line => alwaysOn(line, pStats, quake) || conditionMet(line.when, pStats));
        const warcries = lines.filter(line => line.kind === 'warcry');
        const applied = quake ? lines.filter(line => line.kind !== 'warcry').concat(warcries.sort((a, b) => strength(b) - strength(a)).slice(0, 1)) : lines;
        const out = applied.map(toEffect);
        const resonance = Number(pStats.uniqueWarcryResonancePct) || 0;
        if (resonance > 0 && warcries.length) out.push({ buff: { name: 'talisman:resonance', type: 'warcry' }, delta: { pctDmg: warcries.length * resonance } });
        return (lastActive = out);
    }

    /** The effects applied on the latest tick (HUD icons, slam echo). */
    function active() {
        return lastActive;
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
        list.push({ name, delta: talismans.conditionDelta(line), expiresAt: permanent ? Number.MAX_SAFE_INTEGER : now + durationMs, durationMs });
        game.enemyConditionDebuffs[target.id] = list.slice(-Math.max(1, Math.floor(pStats.curseCap || 1)));
    }

    function hexInterval(pStats) {
        const cdr = Math.min(0.9, Math.max(0, Number((pStats.uniqueConditionManual || {}).cdrPct) || 0) / 100);
        const fast = typeof getPreciseTalentLevel === 'function' && getPreciseTalentLevel('hero10__warlock') ? 0.5 : 1;
        return Math.floor(TALISMAN_HEX_RULES.intervalMs * (1 - cdr) * fast);
    }

    /** Curse lines: each fires on its own interval at the first living target. */
    function applyHexes(pStats, now) {
        if (pStats.uniqueClosedEyes) return;
        const lines = strongest(kind => kind === 'curse');
        const target = lines.length ? hexTarget() : null;
        if (!target) return;
        game.enemyConditionDebuffs = game.enemyConditionDebuffs || {};
        const interval = hexInterval(pStats);
        lines.forEach(line => {
            const wait = (readyAt.get(line.id) || 0) - now;
            // 전투 시계가 되돌아가면(불러오기 등) 남은 대기가 간격보다 길어진다. 그때는 대기를 버린다.
            if (wait > 0 && wait <= interval) return;
            readyAt.set(line.id, now + interval);
            applyHex(target, line, pStats, now);
        });
    }

    return Object.freeze({ effects, active, applyHexes, conditionMet });
})();
safeExposeGlobals({ talismanCombat });
