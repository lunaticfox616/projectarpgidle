(function () {
    'use strict';

    const BOSS_PATTERN_NAMES = Object.freeze({
        intro: '세 가지 특수기',
        burst: '연속 참격',
        slam: '파쇄 강타',
        ramp: '격앙',
        cosmos: '성좌 순환',
        cosmosBoss: '은하 고유 기믹',
        apex: '후반부 보스 고유 기믹'
    });
    const BOSS_PATTERN_DESCRIPTIONS = Object.freeze({
        intro: '때때로 예고한 칸에 특수기를 씁니다. 생명력이 적을수록 자주 쓰고, 보스마다 세 가지(갈래 사격, 연쇄 폭발, 이중 파동 등) 가운데 하나를 고르며 같은 특수기를 잇달아 쓰지 않습니다. 예고가 뜨면 이동 스킬을 눌러 범위를 벗어날 수 있습니다.',
        burst: '때때로 연속 참격으로 피해가 30% 증가합니다. 생명력이 적을수록 자주 씁니다.',
        slam: '때때로 파쇄 강타로 피해가 55% 증가합니다. 생명력이 적을수록 자주 씁니다.',
        ramp: '생명력이 낮아질수록 최대 3단계까지 격앙하여 공격 피해가 증가합니다. 때때로 영웅 자리에 충격파를 내고, 생명력이 적을수록 자주 냅니다.',
        cosmos: '연속 참격/파쇄 강타/격앙을 차례로 순환합니다.',
        cosmosBoss: '은하 보스마다 고유한 공격 순서와 파훼 조건을 사용합니다.',
        apex: '아틀라스 후반부 보스는 단계마다 이름이 붙은 특수기를 정해진 횟수마다 예고한 뒤 씁니다.'
    });
    const BOSS_PATTERN_PEAK_DAMAGE_MULTIPLIERS = Object.freeze({
        intro: 1.15,
        burst: 1.30,
        slam: 1.55,
        ramp: 1.21,
        cosmos: 1.34
    });

    function getBossPatternPeakDamageMultiplier(mode) {
        return BOSS_PATTERN_PEAK_DAMAGE_MULTIPLIERS[String(mode || '')] || 1;
    }

    function getMaximumBossPatternDamageMultiplier() {
        return Math.max(...Object.values(BOSS_PATTERN_PEAK_DAMAGE_MULTIPLIERS));
    }

    function getBossPatternModesForLoop(loopValue) {
        const loop = Math.max(1, Math.floor(Number(loopValue) || 1));
        if (loop < 6) return ['intro'];
        if (loop === 6) return ['ramp'];
        if (loop === 7) return ['ramp', 'burst'];
        return ['ramp', 'burst', 'slam'];
    }

    function getMaximumBossPatternDamageMultiplierForLoop(loopValue) {
        const modes = getBossPatternModesForLoop(loopValue);
        if (modes.length === 0) return 1;
        return Math.max(...modes.map(getBossPatternPeakDamageMultiplier));
    }

    // 특수기를 쓰는 때(2026-10-16 사용자 "피 기준으로 무조건 그 패턴만 쓰는게 아니라, 피가 많아도 쓸 가능성이 있고, 랜덤하고, 피가 적으면
    // 더 쓸 확률이 높되, 같은 패턴은 약간의 쿨타임"): n번째 공격마다가 아니라 공격마다 굴린다. 생명력이 가득하면 SPECIAL_ODDS.full,
    // 바닥이면 SPECIAL_ODDS.empty(사이는 직선). 첫 공격과 특수기 바로 다음 공격은 보통 공격이고, PITY번 넘게 없으면 다음은 특수기다.
    // 같은 모양은 SHAPE_REST번의 공격이 지나야 다시 고른다. 굴림은 보스와 공격 번호로 정해지고(hashSeed) 그 공격을 처음 내다볼 때의
    // 생명력으로 한 번 정해 enemy.specialPlan에 둔다: 예고가 그려지는 동안 생명력이 줄어도 바뀌지 않는다.
    const SPECIAL_ODDS = Object.freeze({ full: 0.22, empty: 0.8 }), SHAPE_REST = 4, PITY = 5;
    const rollShare = (enemy, attackNumber, salt) => (hashSeed(`${enemy.id}|${attackNumber}|${salt}`) >>> 0) / 4294967296;
    function pickSpecialShape(enemy, attackNumber, count) {
        const used = enemy.specialShapeUsedAt || {}, rested = [];
        for (let index = 0; index < count; index++) if (!(attackNumber - (used[index] ?? -99) <= SHAPE_REST)) rested.push(index);
        const pool = rested.length ? rested : [[...Array(count).keys()].sort((a, b) => (used[a] ?? -99) - (used[b] ?? -99))[0]];
        return pool[Math.floor(rollShare(enemy, attackNumber, 'shape') * pool.length)];
    }
    /** The chance an attack is a special: SPECIAL_ODDS.full at full life, SPECIAL_ODDS.empty at none, in a line between. */
    function specialOdds(enemy) {
        const share = Math.max(0, Math.min(1, (Number(enemy.hp) || 0) / Math.max(1, Number(enemy.maxHp) || 1)));
        return SPECIAL_ODDS.empty + (SPECIAL_ODDS.full - SPECIAL_ODDS.empty) * share;
    }
    /** @returns {{attackNumber:number, special:boolean, shape:number}} shape: the special's index among the boss's shapes (-1 when not special). */
    function planBossSpecial(enemy, attackNumber, shapeCount) {
        const kept = enemy.specialPlan;
        if (kept && kept.attackNumber === attackNumber) return kept;
        const last = Number(enemy.lastSpecialAttack) || 0, resting = attackNumber < 2 || (last > 0 && attackNumber - last <= 1);
        const special = !resting && (attackNumber - last > PITY || rollShare(enemy, attackNumber, 'special') < specialOdds(enemy));
        enemy.specialPlan = { attackNumber, special, shape: special ? pickSpecialShape(enemy, attackNumber, Math.max(1, shapeCount)) : -1 };
        return enemy.specialPlan;
    }
    /** The special just used: no special on the next attack, and its shape rests SHAPE_REST attacks. */
    function noteBossSpecial(enemy, state) {
        if (!state.isSpecial || !Number.isFinite(state.shapeIndex)) return;
        enemy.lastSpecialAttack = state.attackNumber;
        if (state.shapeIndex >= 0) enemy.specialShapeUsedAt = { ...(enemy.specialShapeUsedAt || {}), [state.shapeIndex]: state.attackNumber };
    }

    function normalizeAttackCount(enemy) {
        return Math.max(0, Math.floor(Number(enemy && enemy.patternAttackCount) || 0));
    }

    function getRampStage(enemy) {
        let maxHp = Math.max(1, Number(enemy && enemy.maxHp) || 1);
        let hp = Math.max(0, Math.min(maxHp, Number(enemy && enemy.hp) || 0));
        let missingRatio = 1 - (hp / maxHp);
        if (missingRatio >= 0.72) return 3;
        if (missingRatio >= 0.42) return 2;
        if (missingRatio >= 0.18) return 1;
        return 0;
    }

    // 처음 루프의 보스(2026-10-06 사용자 요청 "패턴이 너무 허접"): 한 칸 강타만 되풀이하던 것을 2026-10-16부터는 보스의 싸우는 방식
    // (data/boss-fx.js kind)마다 세 모양 가운데 하나를 고른다(js/boss-moves.js intro: 근접은 강타, 연쇄 폭발, 이중 파동; 원거리는 강타,
    // 갈래 사격, 관통 광선 등). 쓰는 때와 모양은 planBossSpecial이 굴린다. 피해 배율은 그대로(1.15).
    function buildSlamPatternState(mode, attackNumber, cosmosPattern, enemy) {
        let plan = mode === 'intro' ? planBossSpecial(enemy, attackNumber, bossMoves.introCount(enemy)) : styleSpecialPlan(enemy, attackNumber, 'area');
        let special = cosmosPattern || plan.special;
        let intro = mode === 'intro' && special ? bossMoves.intro(enemy, Math.max(0, plan.shape) + 1) : null;
        if (mode === 'slam' && !cosmosPattern && special) intro = plan;
        return { mode, ...slamLook(mode, special, intro, cosmosPattern), isSpecial: special, shapeIndex: cosmosPattern ? -1 : plan.shape, attackNumber };
    }
    /** The name, damage and warning shape of a 파쇄 강타 or first-loop attack: a plain heavy blow, or the special (the boss's own shape for intro). */
    function slamLook(mode, special, intro, cosmosPattern) {
        if (!special) return { label: '무거운 일격', damageMul: 1, telegraphKind: 'ring' };
        return { label: intro ? intro.label : BOSS_PATTERN_NAMES[mode], damageMul: getBossPatternPeakDamageMultiplier(cosmosPattern ? 'cosmos' : mode),
            telegraphKind: intro ? intro.telegraphKind : 'ring' };
    }

    // 격앙(루프 6부터): 2단계(생명력 42% 잃음) 전에는 예고 공격이 없어 루프 6 보스가 루프 1 보스보다 밋밋했다(2026-10-06).
    // 그 전에도 3번째 공격마다 충격파를 낸다. 배율은 단계 그대로라 0단계 충격파는 보통 공격과 같은 피해다.
    function buildRampPatternState(enemy, attackNumber, cosmosPattern) {
        let stage = getRampStage(enemy);
        let cosmosStage = cosmosPattern ? Math.max(1, stage) : stage;
        const plan = styleSpecialPlan(enemy, attackNumber, 'area');
        return {
            mode: 'ramp',
            label: cosmosStage > 0 ? `격앙 ${'ⅠⅡⅢ'[Math.min(2, cosmosStage - 1)]}` : '격앙 전조',
            damageMul: cosmosPattern ? 1.12 : (1 + stage * 0.07),
            isSpecial: cosmosPattern || plan.special,
            telegraphKind: cosmosPattern ? 'pulse' : (plan.telegraphKind || 'pulse'),
            shapeIndex: cosmosPattern ? -1 : plan.shape,
            stage,
            attackNumber
        };
    }

    function buildPatternState(mode, enemy, attackNumber, cosmosPattern) {
        if (mode === 'burst') return buildBurstPatternState(enemy, attackNumber, cosmosPattern);
        if (mode === 'slam' || mode === 'intro') {
            return buildSlamPatternState(mode, attackNumber, cosmosPattern, enemy);
        }
        if (mode === 'ramp') return buildRampPatternState(enemy, attackNumber, cosmosPattern);
        return null;
    }
    function styleSpecialPlan(enemy, attackNumber, family) {
        const shapes = bossMoves.familyShapes(enemy, family), plan = planBossSpecial(enemy, attackNumber, shapes.length);
        return plan.special ? { ...plan, ...bossMoves.shapeLook(enemy, shapes[plan.shape]) } : plan;
    }
    function buildBurstPatternState(enemy, attackNumber, cosmosPattern) {
        const plan = styleSpecialPlan(enemy, attackNumber, 'ray'), special = cosmosPattern || plan.special;
        return { mode: 'burst', label: special ? plan.label || '연속 참격' : '빠른 베기',
            damageMul: special ? (cosmosPattern ? 1.18 : getBossPatternPeakDamageMultiplier('burst')) : 1,
            isSpecial: special, telegraphKind: cosmosPattern ? 'fan' : (plan.telegraphKind || 'fan'),
            shapeIndex: cosmosPattern ? -1 : plan.shape, attackNumber };
    }

    // Bosses that carry their own special table: cosmos galaxy bosses (js/cosmos-rules.js) and the awakened atlas's late bosses
    // (js/atlas-endgame.js, a named special every n-th attack per stage).
    const OWN_PATTERN_MODES = new Set(['cosmosBoss', 'apex']);
    // Time to resume filling the gauge after the last special impact. Own boss tables retain their authored timing.
    const SPECIAL_RECOVERY_MS = Object.freeze({ intro: 600, burst: 450, slam: 750, ramp: 350 });
    const recoveryOf = state => state.recoveryMs ?? (state.isSpecial && !OWN_PATTERN_MODES.has(state.patternMode)
        && state.patternMode !== 'cosmos' ? SPECIAL_RECOVERY_MS[state.mode] || 0 : 0);
    function getOwnPatternState(mode, enemy, attackNumber) {
        if (mode === 'cosmosBoss') {
            return typeof globalThis.getCosmosBossPatternState === 'function' ? globalThis.getCosmosBossPatternState(enemy.cosmosBossId, attackNumber) : null;
        }
        return globalThis.atlasEndgame ? globalThis.atlasEndgame.patternState(enemy.apexMechanic, attackNumber) : null;
    }

    function getBossPatternPreview(enemy) {
        if (!enemy || !enemy.isBoss || !enemy.patternMode) return null;
        let attackNumber = normalizeAttackCount(enemy) + 1;
        let mode = String(enemy.patternMode);
        if (OWN_PATTERN_MODES.has(mode)) return getOwnPatternState(mode, enemy, attackNumber);
        if (mode === 'cosmos') {
            let cycle = ['burst', 'slam', 'ramp'];
            let resolvedMode = cycle[(attackNumber - 1) % cycle.length];
            let state = buildPatternState(resolvedMode, enemy, attackNumber, true);
            if (!state) return null;
            state.patternMode = 'cosmos';
            state.label = `성좌 순환, ${state.label}`;
            return state;
        }
        let state = buildPatternState(mode, enemy, attackNumber, false);
        if (state) state.patternMode = mode;
        return state;
    }

    function consumeBossPatternAttack(enemy) {
        let state = getBossPatternPreview(enemy);
        if (!state) return null;
        if (enemy.patternArea) state.area = enemy.patternArea;
        noteBossSpecial(enemy, state);
        bossMoves.plan(state, enemy); // the special lands over time: shots, a beam, bursts one after another (js/boss-moves.js)
        const recovery = recoveryOf(state);
        if (recovery) {
            const impactDelay = state.move ? state.move.stages.at(-1).ms : BOSS_ATTACK_IMPACT_DELAY_MS;
            enemy.apexRecoveryUntil = getCombatTime() + impactDelay + recovery;
        }
        state.castStartedAt = enemy.patternTelegraphStartedAt;
        enemy.patternAttackCount = normalizeAttackCount(enemy) + 1;
        enemy.nextPatternState = getBossPatternPreview(enemy);
        enemy.patternTelegraphKey = null;
        enemy.patternTelegraphStartedAt = 0;
        enemy.patternArea = null;
        return state;
    }

    function refreshBossPatternPreview(enemy) {
        if (!enemy) return null;
        enemy.nextPatternState = getBossPatternPreview(enemy);
        return enemy.nextPatternState;
    }

    function getBossPatternModeLabel(mode) {
        return BOSS_PATTERN_NAMES[String(mode || '')] || '';
    }

    function getBossPatternDescription(mode) {
        return BOSS_PATTERN_DESCRIPTIONS[String(mode || '')] || '';
    }

    /** How long a special warns (ms): its own (a final boss combo, js/atlas-endgame.js comboState) or the shared default. */
    const warningDuration = state => state.warningMs || COMBAT_GRID_CONFIG.bossPatternWarningMs;
    function clearBossTelegraph(enemy) {
        enemy.patternTelegraphKey = null;
        enemy.patternTelegraphStartedAt = 0;
        enemy.patternArea = null;
    }
    /** 정점, 우주 보스는 새 후딜이 없어 예전 시계 그대로다: 게이지 절반에서 예고하고 게이지가 찬 뒤에 쓴다(앞당겨 예고하면 공격이 9~18% 잦아졌다). */
    const keepsOldClock = state => OWN_PATTERN_MODES.has(state.patternMode) || state.patternMode === 'cosmos';
    function warningMayStart(state, charge, chargePerSec) {
        if (keepsOldClock(state) || !(chargePerSec > 0)) return charge >= 0.5;
        return (1 - charge) / chargePerSec * 1000 <= warningDuration(state);
    }
    /** 예고가 끝난 뒤: 새 시계는 예고가 발동 시각을 정해 게이지를 채우고, 예전 시계는 게이지가 찰 때까지 기다린다. */
    function releaseAfterWarning(enemy, state, charge) {
        if (keepsOldClock(state)) return charge >= 1;
        // Once warned, this cast owns its clock. A new slow changes the next charge, not the already announced impact.
        enemy.attackTimer = Math.max(charge, 1);
        return true;
    }

    /** Lock the special's cells at warning time; moving the victim never retargets them.
     * @param {ReturnType<typeof createEnemy>} enemy
     * @param {number} now Combat clock milliseconds.
     * @param {{gx:number,gy:number}|undefined} target Omit only for timing-only previews.
     * @returns {boolean} Whether the attack may be released.
     */
    function updateBossPatternTelegraph(enemy, now, target, chargePerSec) {
        if (!enemy || !enemy.isBoss) return true;
        let state = enemy.nextPatternState || getBossPatternPreview(enemy);
        if (!state || !state.isSpecial) {
            clearBossTelegraph(enemy);
            return true;
        }
        let charge = Math.max(0, Number(enemy.attackTimer) || 0);
        // 공격 번호까지만 본다: 예고 도중 생명력이 단계 경계를 넘어 이름(격앙 전조 → 격앙 Ⅰ)만 바뀌어도 경고가 처음부터 다시
        // 시작했다(2026-10-07 검토). 맞는 칸은 예고를 시작할 때 정한 그대로다.
        let key = `${state.patternMode || state.mode}:${state.attackNumber}`;
        let timestamp = Number.isFinite(Number(now)) ? Number(now) : getCombatTime();
        if (enemy.patternTelegraphKey !== key) {
            if (!warningMayStart(state, charge, chargePerSec)) { clearBossTelegraph(enemy); return false; }
            enemy.patternTelegraphKey = key;
            enemy.patternTelegraphStartedAt = timestamp;
            if (target) {
                // Lines and fans leave from the boss's cell nearest the target (a boss as wide as its picture is up to 6 cells wide).
                let profile = COMBAT_GRID_CONFIG.bossPatternProfiles[state.telegraphKind], from = getClosestGridUnitCell(target, enemy);
                enemy.patternArea = { ...getSkillStageFootprint('', {}, { aimCell: target, gridProfile: profile }, from), source: from };
            }
        }
        if (timestamp - enemy.patternTelegraphStartedAt < warningDuration(state)) return false;
        return releaseAfterWarning(enemy, state, charge);
    }

    /** Live warnings, including attacks already released but not yet resolved. */
    function getBossWarningCells(state, pending = []) {
        const enemies = (state.enemies || []).filter(enemy => enemy.hp > 0 && !enemy.noAttack
            && !(enemy.ailments || []).some(ail => ['freeze','stun','silence'].includes(ail.type) && ail.time > 0));
        const areas = enemies.map(enemy => enemy.patternArea).filter(Boolean);
        pending.forEach(attack => {
            if (attack.delivery === 'patternArea') areas.push(attack.bossPattern.area);
        });
        return areas.flatMap(area => area.cells);
    }

    safeExposeGlobals({
        getBossWarningCells,
        getBossPatternPreview,
        consumeBossPatternAttack,
        refreshBossPatternPreview,
        getBossPatternModeLabel,
        getBossPatternDescription,
        getBossPatternPeakDamageMultiplier,
        getMaximumBossPatternDamageMultiplier,
        getBossPatternModesForLoop,
        getMaximumBossPatternDamageMultiplierForLoop,
        updateBossPatternTelegraph
    });
}());
