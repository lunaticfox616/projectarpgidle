// 전직 노드 상향(2026-11-11 사용자 "전부다"): 기존 전투 흐름에 한 줄씩 끼우는 전투 규칙. 키스톤은 hasKeystone으로 고르고, 수치는
// data/ascendancies.js ASCENDANCY_KEYSTONE_VALUES 한 곳에서 읽는다. 짧게 사는 전투 상태(갈라진 땅, 이중 폭발 대기, 철갑에 모인 피해,
// 반격과 불굴의 대기 시간)는 저장하지 않는다. 능력치 계산이 읽는 값(흐르는 칼끝 중첩, 불굴 발동)은 js/player-stat-cache.js 읽기 함수로 읽는다.
// 같은 날 단순 능력치 키스톤 열 개도 여기서 규칙을 받았다(사용자: 증폭도 아니고 너무 단순한 규칙): 잔상, 비껴내기, 연무, 질풍 시위, 바람 발,
// 폭풍의 눈, 서리 이끼, 수액 재생, 뿌리 갑주, 넓은 투척.
// 부르는 곳: 공격 시작 js/combat-tick.js queuePlayerAttackSequence, 주인공의 적중 js/combat-support-runes.js dealHit, 맞음과 회피
// js/combat-enemy-turn.js, 소환수 적중 js/combat-summon-stats.js, 지속 피해와 냉기 중독 js/combat-skill-effects.js, 연속 타격 js/combat-tick.js,
// 폭발에 맞은 적의 수 js/combat-player-attack.js. 능력치 쪽(불굴, 광분, 흐르는 칼끝, 뿌리 갑주의 배율)은 js/player-stats.js
// getAscendancyNodeStatMultipliers가 이 파일의 읽기 값으로 센다.
// 방치 정산이 다른 게임 사본으로 싸울 때는 전투 모듈 상태처럼 따라간다(js/combat.js captureCombatRuntime, restoreCombatRuntime).
const ascendancyNodeRules = (() => {
    const value = id => ASCENDANCY_KEYSTONE_VALUES[id];
    const tagged = (skill, tag) => Array.isArray(skill && skill.tags) && skill.tags.includes(tag);
    const living = enemy => !!enemy && enemy.hp > 0;
    const ECHO_WAIT_MS = 3000; // 이중 폭발: 굴린 투척의 첫 적중을 기다리는 시간
    const NO_GALE = Object.freeze({ charges: 0, active: false, splashed: false });
    let cracks, echoes, currentEcho, rams, castRamMul, counterReadyAt, flow, unyielding, focus;
    let images, gale, mosses, sap, still, stormAt;
    /** 모두 처음으로. cracks: 대지 가르기(jg1) { gx, gy, until }. echoes: 이중 폭발(bm4) { rolledAt, at, hits: [{ enemyId, gx, gy, damage, element }] },
     * currentEcho는 지금 투척이 굴린 것(다음 공격이 바꾼다). rams: 철갑(jg2)이 모은 중첩, castRamMul: 지금 강타에 실린 배율. counterReadyAt: 반격(bd5, bd6)의
     * 다음 가능 시각. flow: 흐르는 칼끝(bd1). unyielding: 불굴의 진군(w7) 발동과 대기. focus: 멈추지 않는 칼날(bz5)이 이어 베는 적.
     * images: 잔상(bd2) { count, until }. gale: 바람 발(sa3)의 남은 바람 화살과 지금 공격이 바람 화살인가. mosses: 서리 이끼(gw1) { gx, gy, until }.
     * sap: 수액 재생(gw3)이 고인 생명력. still: 뿌리 갑주(gw6)가 보는 주인공의 마지막 자리와 그 뒤로 움직이지 않은 때. stormAt: 폭풍의 눈(sa8)의 다음 번개. */
    function reset() {
        cracks = []; echoes = []; currentEcho = null; rams = 0; castRamMul = 1; counterReadyAt = 0;
        flow = { stacks: 0, until: 0 }; unyielding = { until: 0, readyAt: 0 }; focus = { enemyId: null, since: 0, last: 0 };
        images = { count: 0, until: 0 }; gale = NO_GALE; mosses = []; sap = 0; still = { gx: null, gy: null, since: 0 }; stormAt = 0;
    }
    reset();
    function capture() {
        const echoIndex = echoes.indexOf(currentEcho);
        return structuredClone({ cracks, echoes, echoIndex, rams, castRamMul, counterReadyAt, flow, unyielding, focus, images, gale, mosses, sap, still, stormAt });
    }
    function restore(snapshot) {
        if (!snapshot) return reset();
        reset();
        const copy = structuredClone(snapshot);
        ({ cracks, echoes, rams, castRamMul, counterReadyAt, flow, unyielding, focus } = copy);
        ({ images = images, gale = gale, mosses = mosses, sap = sap, still = still, stormAt = stormAt } = copy);
        currentEcho = copy.echoIndex >= 0 ? echoes[copy.echoIndex] : null;
    }

    /** 공격 한 번(연속 타격의 추가 공격도): 흐르는 칼끝 중첩, 이중 폭발 굴림, 철갑 중첩을 이번 강타에 싣기, 바람 화살. */
    function onAttack(pStats, now) {
        if (hasKeystone('bd1')) flow = { stacks: Math.min(value('bd1').maxStacks, flowStacks(now) + 1), until: now + value('bd1').idleMs };
        currentEcho = rollPotionEcho(pStats, now);
        castRamMul = loadRams(pStats);
        gale = nextGale(pStats);
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
    /** 바람 발(sa3): 이동 스킬로 친 공격이 바람 화살 shots발을 채우고, 그 뒤 공격마다 한 발씩 쓴다. */
    function nextGale(pStats) {
        if (!hasKeystone('sa3')) return NO_GALE;
        if (tagged(pStats.sSkill, 'mobility')) return { charges: value('sa3').shots, active: false, splashed: false };
        return gale.charges > 0 ? { charges: gale.charges - 1, active: true, splashed: false } : NO_GALE;
    }

    /** 생명력이 줄어드는 순간(js/combat-enemy-turn.js): 수액 재생(gw3)의 수액이 먼저 깎이고, 불굴의 진군(w7)이 절반 아래로 떨어지는 순간을
     * 본다(대기 시간마다 한 번). @returns {number} 수액이 막고 남은 다음 생명력 */
    function onLifeDrop(pStats, before, after, now) {
        const next = drainSap(before, after);
        if (!hasKeystone('w7') || next <= 0 || now < unyielding.readyAt) return next;
        const half = Math.max(1, Number(pStats.maxHp) || 1) * 0.5;
        if (before <= half || next > half) return next;
        unyielding = { until: now + value('w7').burstMs, readyAt: now + value('w7').cooldownMs };
        addBattleFx('statusText', { text: _t('불굴'), color: '#ffcf8a', duration: 700, bodyCue: true });
        return next;
    }
    function drainSap(before, after) {
        if (!hasKeystone('gw3') || sap <= 0 || after >= before) return after;
        const soaked = Math.min(sap, before - after);
        sap -= soaked;
        return Math.floor(after + soaked);
    }
    /** 수액 재생(gw3): 생명력이 회복 상한에 닿아 있는 동안 그 틱의 재생(0.1초분)이 최대 생명력의 sapMaxPct까지 수액으로 고인다. */
    function fillSap(pStats) {
        if (!hasKeystone('gw3') || !(game.playerHp > 0) || game.playerHp < getPlayerRecoveryHpCap(pStats)) return;
        const maxHp = Number(pStats.maxHp) || 0;
        sap = Math.min(maxHp * value('gw3').sapMaxPct / 100, sap + maxHp * (Number(pStats.regen) || 0) / 100 * 0.1);
    }

    /** 철갑(jg2): 물리 피해를 받을 때마다 한 중첩(최대 maxStacks). 다음 강타가 시작될 때 모두 실린다(onAttack). */
    function storeArmorBlow(pStats, physicalPortion) {
        if (hasKeystone('jg2') && physicalPortion > 0) rams = Math.min(value('jg2').maxStacks, rams + 1);
    }

    /** 회피(evade)와 비껴내기(deflect) 뒤: 잔상(bd2)이 하나 생기고, 비껴낸 적은 무방비(bd3)가 되며, 반격(bd5, bd6)이 그 공격의 주인을 벤다. */
    function counter(pStats, enemy, kind, now) {
        if (kind === 'evade' && hasKeystone('bd2')) images = { count: Math.min(value('bd2').maxImages, imageCount(now) + 1), until: now + value('bd2').lifeMs };
        if (kind === 'deflect' && hasKeystone('bd3') && living(enemy)) Object.assign(enemy, { parryExposedUntil: now + value('bd3').exposeMs, parryStaggerUntil: now + value('bd3').staggerMs });
        const id = kind === 'deflect' ? 'bd6' : 'bd5';
        if (!hasKeystone(id) || !living(enemy) || now < counterReadyAt) return;
        counterReadyAt = now + value(id).icdMs;
        strikeBack(pStats, enemy, value(id).counterPct);
    }
    function imageCount(now) { return images.until > now ? images.count : 0; }
    function strikeBack(pStats, enemy, pct) {
        const ele = (pStats.sSkill && pStats.sSkill.ele) || 'phys';
        const dealt = applyDamageToEnemyResource(enemy, mitigatedBlow(pStats, enemy, ele, pct));
        addBattleFx('hit', { enemyId: enemy.id, color: getElementColor(ele), damage: dealt, duration: 240, element: ele, syncToSwing: false });
        addBattleFx('statusText', { enemyId: enemy.id, text: _t('반격'), color: '#d6f0ff', duration: 600 });
        if (enemy.hp <= 0) handleEnemyDeath(enemy, pStats);
    }
    /** 주인공의 기본 타격 피해의 pct%를 그 적의 저항으로 줄인 값(반격, 폭풍의 눈 번개). */
    function mitigatedBlow(pStats, enemy, ele, pct) {
        const res = getEffectiveEnemyMitigation(ele, (getZone(game.currentZoneId) || {}).tier || 1, enemy, pStats);
        return Math.max(1, Math.floor((pStats.baseDmg || 1) * pct / 100 * (1 - res / 100)));
    }

    /** 적중 직전 피해: 갈라진 땅(jg1) 위의 적은 더 받고, 철갑(jg2) 중첩이 실린 강타는 그만큼 세다. 검무사, 폭풍궁수, 숲지기의 배율도 곱한다. */
    function beforeHit(damage, enemy, pStats, now) {
        let out = damage * dancerHitMul(enemy, now) * archerHitMul(enemy, pStats) * wardenHitMul(enemy, now);
        if (hasKeystone('jg1') && onCrack(enemy, now)) out *= 1 + value('jg1').takenMorePct / 100;
        if (castRamMul !== 1 && tagged(pStats.sSkill, 'slam')) out *= castRamMul;
        return out;
    }
    function onCrack(enemy, now) {
        return hasGridCell(enemy) && cracks.some(crack => crack.until > now && crack.gx === enemy.gx && crack.gy === enemy.gy);
    }
    /** 비껴내기(bd3): 무방비인 적은 더 받는다. */
    function dancerHitMul(enemy, now) {
        return hasKeystone('bd3') && (Number(enemy.parryExposedUntil) || 0) > now ? 1 + value('bd3').takenMorePct / 100 : 1;
    }
    /** 바람 발(sa3)의 바람 화살, 질풍 시위(sa2)의 떨어진 칸, 폭풍의 눈(sa8)의 고요한 둘레. */
    function archerHitMul(enemy, pStats) {
        let mul = gale.active ? 1 + value('sa3').damageMorePct / 100 : 1;
        if (!tagged(pStats.sSkill, 'projectile') || !game.gridPlayer || !hasGridCell(enemy)) return mul;
        if (hasKeystone('sa2')) mul *= 1 + Math.min(value('sa2').maxCells, getGridUnitDistance(game.gridPlayer, enemy)) * value('sa2').pctPerCell / 100;
        if (hasKeystone('sa8') && !enemyWithin(value('sa8').calmCells)) mul *= 1 + value('sa8').calmMorePct / 100;
        return mul;
    }
    function enemyWithin(cells) {
        return (game.enemies || []).some(enemy => living(enemy) && hasGridCell(enemy) && getGridUnitDistance(game.gridPlayer, enemy) <= cells);
    }
    /** 서리 이끼(gw1): 이끼 위의 적은 냉기 타격을 더 받는다. */
    function wardenHitMul(enemy, now) {
        return hasKeystone('gw1') && enemy.lastHitElement === 'cold' && onMoss(enemy, now) ? 1 + value('gw1').coldTakenMorePct / 100 : 1;
    }
    function onMoss(enemy, now) {
        return hasGridCell(enemy) && mosses.some(moss => moss.until > now && moss.gx === enemy.gx && moss.gy === enemy.gy);
    }
    /** 이끼 위의 적이 느려지는 정도(%, js/combat-enemy-turn.js의 냉각 둔화에 더한다: 이동과 공격이 함께 느려진다). */
    function mossSlowPct(enemy, now) {
        return hasKeystone('gw1') && onMoss(enemy, now) ? value('gw1').slowPct : 0;
    }

    /** 갑주 분쇄(w4): 물리 타격이면 그 적의 물리 피해 감소가 깎인 만큼(%p). */
    function armorBreak(enemy, element, now) {
        const row = enemy && enemy.armorBreak;
        return element === 'phys' && hasKeystone('w4') && row && row.until > now ? row.stacks * value('w4').perHit : 0;
    }

    /** 주인공의 적중 뒤(js/combat-support-runes.js dealHit): 갑주 분쇄 중첩, 한 적을 계속 베는 시간, 강타가 가른 땅, 이중 폭발에 실을 적중.
     * 새 규칙: 잔상이 함께 베고, 바람 화살이 옆 적에게 튀고, 냉기 타격이 이끼를 깐다. */
    function afterHit(pStats, enemy, dealt, now) {
        if (!(dealt > 0) || !hasGridCell(enemy)) return;
        const element = enemy.lastHitElement || 'phys';
        if (element === 'phys' && hasKeystone('w4')) stackArmorBreak(enemy, now);
        if (hasKeystone('bz5')) keepFocus(enemy, now);
        if (hasKeystone('jg1') && tagged(pStats.sSkill, 'slam')) cracks.push({ gx: enemy.gx, gy: enemy.gy, until: now + value('jg1').crackMs });
        if (currentEcho) noteEchoHit(currentEcho, enemy, dealt, element, now);
        afterHitRedesigned(pStats, enemy, dealt, element, now);
    }
    function afterHitRedesigned(pStats, enemy, dealt, element, now) {
        if (imageCount(now) > 0) releaseImages(enemy, dealt, element, now);
        if (gale.active && !gale.splashed) splashGale(pStats, enemy, dealt, element);
        if (element === 'cold' && hasKeystone('gw1')) layMoss(enemy, now);
    }
    /** 잔상(bd2): 모인 잔상이 이번 적중에 하나마다 그 피해의 perImagePct%로 한 번 더 치고 사라진다. 그 적의 쓰러짐은 이 적중을 부른 쪽이 본다. */
    function releaseImages(enemy, dealt, element, now) {
        const blow = Math.max(1, Math.floor(dealt * value('bd2').perImagePct / 100 * imageCount(now)));
        images = { count: 0, until: 0 };
        const extra = applyDamageToEnemyResource(enemy, blow);
        addBattleFx('hit', { enemyId: enemy.id, color: '#cfe6ff', damage: extra, duration: 260, element, syncToSwing: false });
        addBattleFx('statusText', { enemyId: enemy.id, text: _t('잔상'), color: '#cfe6ff', duration: 600 });
    }
    /** 바람 화살(sa3): 이 공격의 첫 적중이 둘레 splashCells칸의 가장 가까운 다른 적 하나에게 같은 피해로 튄다. */
    function splashGale(pStats, enemy, dealt, element) {
        gale = { ...gale, splashed: true };
        const near = (game.enemies || []).filter(other => other !== enemy && living(other) && hasGridCell(other) && getGridUnitDistance(enemy, other) <= value('sa3').splashCells)
            .sort((a, b) => getGridUnitDistance(enemy, a) - getGridUnitDistance(enemy, b))[0];
        if (!near) return;
        const hit = applyDamageToEnemyResource(near, dealt);
        addBattleFx('hit', { enemyId: near.id, color: '#bfefff', damage: hit, duration: 240, element, syncToSwing: false });
        if (near.hp <= 0) handleEnemyDeath(near, pStats);
    }
    /** 서리 이끼(gw1): 냉기 타격이 맞힌 칸에 mossMs 동안 이끼가 깔린다(같은 칸은 시간만 새로). */
    function layMoss(enemy, now) {
        mosses = mosses.filter(moss => moss.gx !== enemy.gx || moss.gy !== enemy.gy);
        mosses.push({ gx: enemy.gx, gy: enemy.gy, until: now + value('gw1').mossMs });
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

    /** 넓은 투척(bm2): 범위 공격 한 번에 맞은 적 하나마다 그 폭발의 피해 배율(최대 maxEnemies기). */
    function blastMultiplier(pStats, count) {
        if (!hasKeystone('bm2') || !tagged(pStats.sSkill, 'aoe')) return 1;
        return 1 + Math.min(value('bm2').maxEnemies, Math.max(0, Number(count) || 0)) * value('bm2').pctPerEnemy / 100;
    }

    /** 전투 틱마다: 식은 땅과 이끼를 치우고, 때가 된 이중 폭발을 터뜨린다(적중 없이 기다리던 굴림은 버린다). 주인공이 움직였는지 보고(뿌리 갑주),
     * 폭풍의 눈의 번개를 떨어뜨린다. */
    function tick(pStats, now) {
        cracks = cracks.filter(crack => crack.until > now);
        mosses = mosses.filter(moss => moss.until > now);
        noteStillness(now);
        fillSap(pStats);
        if (hasKeystone('sa8') && now >= stormAt) strikeStorm(pStats, now);
        if (!echoes.length) return;
        const due = echoes.filter(echo => echo.at && echo.at <= now);
        echoes = echoes.filter(echo => !due.includes(echo) && (echo.at || now - echo.rolledAt < ECHO_WAIT_MS));
        due.forEach(echo => burst(echo, pStats));
    }
    /** 뿌리 갑주(gw6): 주인공의 자리가 바뀌거나 이동 스킬로 움직이는 중이면 다시 센다. */
    function noteStillness(now) {
        const at = game.gridPlayer || {};
        const moving = typeof mobilitySkill === 'object' && mobilitySkill.moving();
        if (moving || still.gx !== at.gx || still.gy !== at.gy) still = { gx: at.gx, gy: at.gy, since: now };
    }
    /** @returns {boolean} 뿌리를 내렸는가(stillMs 동안 움직이지 않았다) */
    function rooted(now) { return hasKeystone('gw6') && still.gx !== null && now - still.since >= value('gw6').stillMs; }
    /** 폭풍의 눈(sa8): calmCells칸 안의 적마다 기본 타격 피해의 stormPct%로 번개가 떨어지고 감전 판정을 한다. */
    function strikeStorm(pStats, now) {
        stormAt = now + value('sa8').stormEveryMs;
        if (!game.gridPlayer) return;
        const shockStats = { ...pStats, sSkill: { ...(pStats.sSkill || {}), ele: 'light' } };
        (game.enemies || []).filter(enemy => living(enemy) && hasGridCell(enemy) && getGridUnitDistance(game.gridPlayer, enemy) <= value('sa8').calmCells).forEach(enemy => {
            const dealt = applyDamageToEnemyResource(enemy, mitigatedBlow(pStats, enemy, 'light', value('sa8').stormPct));
            addBattleFx('hit', { enemyId: enemy.id, color: getElementColor('light'), damage: dealt, duration: 240, element: 'light', syncToSwing: false });
            if (enemy.hp > 0) applyEnemyAilmentFromHit(enemy, shockStats, dealt, false);
            else handleEnemyDeath(enemy, pStats);
        });
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

    return Object.freeze({ reset, capture, restore, onAttack, flowStacks, unyieldingActive, onLifeDrop, storeArmorBlow, counter, beforeHit, mossSlowPct,
        armorBreak, afterHit, blastMultiplier, tick, rooted, poisonHeld, ailmentStep, dotMultiplier, summonHitMultiplier, storeSharedBlow, takeSharedBlow, onSummonKill });
})();
safeExposeGlobals({ ascendancyNodeRules });
