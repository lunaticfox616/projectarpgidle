// 전직 노드 상향(2026-11-11 사용자 "전부다"): 기존 전투 흐름에 한 줄씩 끼우는 전투 규칙. 키스톤은 hasKeystone으로 고르고, 수치는
// data/ascendancies.js ASCENDANCY_KEYSTONE_VALUES 한 곳에서 읽는다. 짧게 사는 전투 상태(갈라진 땅, 이중 폭발 대기, 철갑에 모인 피해,
// 반격과 불굴의 대기 시간)는 저장하지 않는다. 능력치 계산이 읽는 값(흐르는 칼끝 중첩, 불굴 발동)은 js/player-stat-cache.js 읽기 함수로 읽는다.
// 부르는 곳: 공격 시작 js/combat-tick.js queuePlayerAttackSequence, 주인공의 적중 js/combat-support-runes.js dealHit, 맞음과 회피
// js/combat-enemy-turn.js, 소환수 적중 js/combat-summon-stats.js, 지속 피해와 냉기 중독 js/combat-skill-effects.js. 능력치 쪽(불굴, 광분, 흐르는 칼끝의
// 배율)은 js/player-stats.js getAscendancyNodeStatMultipliers가 이 파일의 읽기 값으로 센다.
// 방치 정산이 다른 게임 사본으로 싸울 때는 전투 모듈 상태처럼 따라간다(js/combat.js captureCombatRuntime, restoreCombatRuntime).
const ascendancyNodeRules = (() => {
    const value = id => ASCENDANCY_KEYSTONE_VALUES[id];
    const tagged = (skill, tag) => Array.isArray(skill && skill.tags) && skill.tags.includes(tag);
    const living = enemy => !!enemy && enemy.hp > 0;
    const ECHO_WAIT_MS = 3000; // 이중 폭발: 굴린 투척의 첫 적중을 기다리는 시간
    let cracks, echoes, currentEcho, rams, castRamMul, counterReadyAt, flow, unyielding, focus;
    /** 모두 처음으로. cracks: 대지 가르기(jg1) { gx, gy, until }. echoes: 이중 폭발(bm4) { rolledAt, at, hits: [{ enemyId, gx, gy, damage, element }] },
     * currentEcho는 지금 투척이 굴린 것(다음 공격이 바꾼다). rams: 철갑(jg2)이 모은 중첩, castRamMul: 지금 강타에 실린 배율. counterReadyAt: 반격(bd5, bd6)의
     * 다음 가능 시각. flow: 흐르는 칼끝(bd1). unyielding: 불굴의 진군(w7) 발동과 대기. focus: 멈추지 않는 칼날(bz5)이 이어 베는 적. */
    function reset() {
        cracks = []; echoes = []; currentEcho = null; rams = 0; castRamMul = 1; counterReadyAt = 0;
        flow = { stacks: 0, until: 0 }; unyielding = { until: 0, readyAt: 0 }; focus = { enemyId: null, since: 0, last: 0 };
    }
    reset();
    function capture() {
        const echoIndex = echoes.indexOf(currentEcho);
        return structuredClone({ cracks, echoes, echoIndex, rams, castRamMul, counterReadyAt, flow, unyielding, focus });
    }
    function restore(snapshot) {
        if (!snapshot) return reset();
        const copy = structuredClone(snapshot);
        ({ cracks, echoes, rams, castRamMul, counterReadyAt, flow, unyielding, focus } = copy);
        currentEcho = copy.echoIndex >= 0 ? echoes[copy.echoIndex] : null;
    }

    /** 공격 한 번(연속 타격의 추가 공격도): 흐르는 칼끝 중첩, 이중 폭발 굴림, 철갑 중첩을 이번 강타에 싣기. */
    function onAttack(pStats, now) {
        if (hasKeystone('bd1')) flow = { stacks: Math.min(value('bd1').maxStacks, flowStacks(now) + 1), until: now + value('bd1').idleMs };
        currentEcho = rollPotionEcho(pStats, now);
        castRamMul = loadRams(pStats);
    }
    function loadRams(pStats) {
        if (!hasKeystone('jg2') || !tagged(pStats.sSkill, 'slam')) return 1;
        const mul = 1 + rams * value('jg2').pctPerStack / 100;
        rams = 0;
        return mul;
    }
    function flowStacks(now) { return flow.until > now ? flow.stacks : 0; }
    function unyieldingActive(now) { return unyielding.until > now; }
    /** 이중 폭발(bm4): 이번 포션 투척이 한 번 더 터질지. 터지면 이 투척의 적중이 모이고, 첫 적중 delayMs 뒤 tick이 터뜨린다. */
    function rollPotionEcho(pStats, now) {
        if (!hasKeystone('bm4') || !tagged(pStats.sSkill, 'potion') || Math.random() * 100 >= value('bm4').chance) return null;
        const echo = { rolledAt: now, at: 0, hits: [] };
        echoes.push(echo);
        return echo;
    }

    /** 불굴의 진군(w7): 생명력이 절반 아래로 떨어지는 순간 잠시 버틴다(대기 시간마다 한 번). */
    function onLifeDrop(pStats, before, after, now) {
        if (!hasKeystone('w7') || after <= 0 || now < unyielding.readyAt) return;
        const half = Math.max(1, Number(pStats.maxHp) || 1) * 0.5;
        if (before <= half || after > half) return;
        unyielding = { until: now + value('w7').burstMs, readyAt: now + value('w7').cooldownMs };
        addBattleFx('statusText', { text: _t('불굴'), color: '#ffcf8a', duration: 700, bodyCue: true });
    }

    /** 철갑(jg2): 물리 피해를 받을 때마다 한 중첩(최대 maxStacks). 다음 강타가 시작될 때 모두 실린다(onAttack). */
    function storeArmorBlow(pStats, physicalPortion) {
        if (hasKeystone('jg2') && physicalPortion > 0) rams = Math.min(value('jg2').maxStacks, rams + 1);
    }

    /** 반격(bd5 회피, bd6 비껴내기): 피한 공격의 주인을 타격 피해의 일부로 벤다. */
    function counter(pStats, enemy, kind, now) {
        const id = kind === 'deflect' ? 'bd6' : 'bd5';
        if (!hasKeystone(id) || !living(enemy) || now < counterReadyAt) return;
        counterReadyAt = now + value(id).icdMs;
        strikeBack(pStats, enemy, value(id).counterPct);
    }
    function strikeBack(pStats, enemy, pct) {
        const ele = (pStats.sSkill && pStats.sSkill.ele) || 'phys', tier = (getZone(game.currentZoneId) || {}).tier || 1;
        const res = getEffectiveEnemyMitigation(ele, tier, enemy, pStats);
        const dealt = applyDamageToEnemyResource(enemy, Math.max(1, Math.floor((pStats.baseDmg || 1) * pct / 100 * (1 - res / 100))));
        addBattleFx('hit', { enemyId: enemy.id, color: getElementColor(ele), damage: dealt, duration: 240, element: ele, syncToSwing: false });
        addBattleFx('statusText', { enemyId: enemy.id, text: _t('반격'), color: '#d6f0ff', duration: 600 });
        if (enemy.hp <= 0) handleEnemyDeath(enemy, pStats);
    }

    /** 적중 직전 피해: 갈라진 땅(jg1) 위의 적은 더 받고, 철갑(jg2) 중첩이 실린 강타는 그만큼 세다. */
    function beforeHit(damage, enemy, pStats, now) {
        let out = damage;
        if (hasKeystone('jg1') && onCrack(enemy, now)) out *= 1 + value('jg1').takenMorePct / 100;
        if (castRamMul !== 1 && tagged(pStats.sSkill, 'slam')) out *= castRamMul;
        return out;
    }
    function onCrack(enemy, now) {
        return hasGridCell(enemy) && cracks.some(crack => crack.until > now && crack.gx === enemy.gx && crack.gy === enemy.gy);
    }

    /** 갑주 분쇄(w4): 물리 타격이면 그 적의 물리 피해 감소가 깎인 만큼(%p). */
    function armorBreak(enemy, element, now) {
        const row = enemy && enemy.armorBreak;
        return element === 'phys' && hasKeystone('w4') && row && row.until > now ? row.stacks * value('w4').perHit : 0;
    }

    /** 주인공의 적중 뒤(js/combat-support-runes.js dealHit): 갑주 분쇄 중첩, 한 적을 계속 베는 시간, 강타가 가른 땅, 이중 폭발에 실을 적중. */
    function afterHit(pStats, enemy, dealt, now) {
        if (!(dealt > 0) || !hasGridCell(enemy)) return;
        const element = enemy.lastHitElement || 'phys';
        if (element === 'phys' && hasKeystone('w4')) stackArmorBreak(enemy, now);
        if (hasKeystone('bz5')) keepFocus(enemy, now);
        if (hasKeystone('jg1') && tagged(pStats.sSkill, 'slam')) cracks.push({ gx: enemy.gx, gy: enemy.gy, until: now + value('jg1').crackMs });
        if (currentEcho) noteEchoHit(currentEcho, enemy, dealt, element, now);
    }
    function stackArmorBreak(enemy, now) {
        const v = value('w4'), stacks = armorBreak(enemy, 'phys', now) / v.perHit;
        enemy.armorBreak = { stacks: Math.min(v.maxStacks, stacks + 1), until: now + v.durationMs };
    }
    /** 멈추지 않는 칼날(bz5): 같은 적을 focusMs 넘게 이어 베면 처치 때와 같은 흡혈 효율 창이 열려 있다. 1초 쉬면 다시 센다. */
    function keepFocus(enemy, now) {
        if (focus.enemyId !== enemy.id || now - focus.last > 1000) focus = { enemyId: enemy.id, since: now, last: now };
        focus.last = now;
        if (now - focus.since >= value('bz5').focusMs) game.uniqueLeechEfficiencyUntil = Math.max(Number(game.uniqueLeechEfficiencyUntil) || 0, now + 1000);
    }
    function noteEchoHit(echo, enemy, dealt, element, now) {
        if (!echo.at) echo.at = now + value('bm4').delayMs;
        echo.hits.push({ enemyId: enemy.id, gx: enemy.gx, gy: enemy.gy, damage: dealt, element });
    }

    /** 전투 틱마다: 식은 땅을 치우고, 때가 된 이중 폭발을 터뜨린다(적중 없이 기다리던 굴림은 버린다). */
    function tick(pStats, now) {
        cracks = cracks.filter(crack => crack.until > now);
        if (!echoes.length) return;
        const due = echoes.filter(echo => echo.at && echo.at <= now);
        echoes = echoes.filter(echo => !due.includes(echo) && (echo.at || now - echo.rolledAt < ECHO_WAIT_MS));
        due.forEach(echo => burst(echo, pStats));
    }
    /** 두 번째 폭발: 처음 맞은 적과 그 둘레 한 칸의 적이 처음 받은 피해(가까운 적중 가운데 큰 값)를 한 번 더 받는다. */
    function burst(echo, pStats) {
        const element = echo.hits[0].element;
        const first = (game.enemies || []).find(enemy => living(enemy) && enemy.id === echo.hits[0].enemyId);
        if (first) addBattleFx('statusText', { enemyId: first.id, text: _t('이중 폭발'), color: '#ffb36b', duration: 700 });
        (game.enemies || []).filter(enemy => living(enemy) && hasGridCell(enemy)).forEach(enemy => {
            const damage = echo.hits.reduce((best, hit) => (getGridUnitDistance(hit, enemy) <= 1 ? Math.max(best, hit.damage) : best), 0);
            if (damage <= 0) return;
            const dealt = applyDamageToEnemyResource(enemy, damage);
            addBattleFx('hit', { enemyId: enemy.id, color: getElementColor(element), damage: dealt, duration: 260, element, syncToSwing: false });
            if (enemy.hp <= 0) handleEnemyDeath(enemy, pStats);
        });
    }

    /** 맹독 수액(gw5): 한기나 빙결에 걸린 적인가(그 적의 중독은 시간이 줄지 않는다). */
    function poisonHeld(enemy) {
        return hasKeystone('gw5') && (enemy.ailments || []).some(row => row && (row.type === 'chill' || row.type === 'freeze') && (row.time || 0) > 0);
    }
    /** 상태 이상 한 줄이 이번 틱에 줄어드는 시간(초). */
    function ailmentStep(ail, held, dt) { return held && ail.type === 'poison' ? 0 : dt; }
    /** 고목의 맹세(gw8): 그 보호막이 남아 있는 동안 지속 피해 배율. */
    function dotMultiplier(now) {
        const guard = game.playerUniqueGuard;
        return hasKeystone('gw8') && guard && (guard.amount || 0) > 0 && now < (guard.expiresAt || 0) ? 1 + value('gw8').dotMorePct / 100 : 1;
    }

    /** 군주(sb8): 한도를 다 채우지 못한 빈 자리 하나마다 소환수 피해 배율. */
    function summonHitMultiplier(pStats) {
        if (!hasKeystone('sb8')) return 1;
        const alive = (game.summons || []).filter(summon => summon && summon.alive && summon.hp > 0).length;
        return 1 + Math.max(0, getSummonRuntimeCap(pStats) - alive) * value('sb8').perEmptyPct / 100;
    }
    /** 나눠갖기(sb2): 소환수가 대신 받은 피해의 일부를 그 소환수의 다음 공격에 싣는다. */
    function storeSharedBlow(summon, taken) {
        if (hasKeystone('sb2') && taken > 0) summon.sharedBlow = (Number(summon.sharedBlow) || 0) + taken * value('sb2').storePct / 100;
    }
    function takeSharedBlow(summon) {
        const stored = Math.floor(Number(summon.sharedBlow) || 0);
        summon.sharedBlow = 0;
        return stored;
    }
    /** 야생성(sb3): 소환수가 적을 쓰러뜨리면 생명력과 에너지 보호막을 되찾고, 쓰러진 소환수 하나가 조금 일찍 돌아온다. */
    function onSummonKill(pStats) {
        if (!hasKeystone('sb3')) return;
        const v = value('sb3'), es = Math.max(0, Number(pStats.energyShield) || 0);
        game.playerHp = Math.min(getPlayerRecoveryHpCap(pStats), (game.playerHp || 0) + (pStats.maxHp || 0) * v.healPct / 100);
        game.playerEnergyShield = Math.min(es, (game.playerEnergyShield || 0) + es * v.healPct / 100);
        const fallen = (game.summons || []).filter(summon => summon && !summon.alive && summon.respawnAt).sort((a, b) => a.respawnAt - b.respawnAt)[0];
        if (fallen) fallen.respawnAt -= v.reviveMs;
    }

    return Object.freeze({ reset, capture, restore, onAttack, flowStacks, unyieldingActive, onLifeDrop, storeArmorBlow, counter, beforeHit, armorBreak, afterHit, tick,
        poisonHeld, ailmentStep, dotMultiplier, summonHitMultiplier, storeSharedBlow, takeSharedBlow, onSummonKill });
})();
safeExposeGlobals({ ascendancyNodeRules });
