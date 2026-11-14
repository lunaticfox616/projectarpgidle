import { bossKeepsOldClock, bossWarningDuration } from './boss-pattern-rules.mjs';
import { bossGetBossPatternPreview } from './boss-pattern-lifecycle.mjs';

export function bossClearBossTelegraph(env, enemy) {
        env.deps.bossMoves.cancelShift(enemy);
        enemy.patternTelegraphKey = null;
        enemy.patternTelegraphStartedAt = 0;
        enemy.patternArea = null;
    }

export function bossWarningMayStart(env, state, charge, chargePerSec) {
        if (state.mode === 'woodsman') return charge >= 1;
        if (bossKeepsOldClock(state) || !(chargePerSec > 0)) return charge >= 0.5;
        return (1 - charge) / chargePerSec * 1000 <= bossWarningDuration(env, state);
    }

/** 예고가 끝난 뒤: 새 시계는 예고가 발동 시각을 정해 게이지를 채우고, 예전 시계는 게이지가 찰 때까지 기다린다. */
    export function bossReleaseAfterWarning(enemy, state, charge) {
        if (bossKeepsOldClock(state)) return charge >= 1;
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
    export function bossUpdateBossPatternTelegraph(env, enemy, now, target, chargePerSec) {
        if (!enemy || !enemy.isBoss) return true;
        let state = enemy.nextPatternState || bossGetBossPatternPreview(env, enemy);
        if (!state || !state.isSpecial) {
            bossClearBossTelegraph(env, enemy);
            return true;
        }
        let charge = Math.max(0, Number(enemy.attackTimer) || 0);
        // 공격 번호까지만 본다: 예고 도중 생명력이 단계 경계를 넘어 이름(격앙 전조 → 격앙 Ⅰ)만 바뀌어도 경고가 처음부터 다시
        // 시작했다(2026-10-07 검토). 맞는 칸은 예고를 시작할 때 정한 그대로다.
        let key = bossPatternWarningKey(state);
        let timestamp = Number.isFinite(Number(now)) ? Number(now) : env.deps.getCombatTime();
        if (env.deps.bossMoves.needsWarning(enemy, state, key)) {
            if (!bossBeginWarning(env, enemy, state, { target, key, timestamp, charge, chargePerSec })) return false;
        }
        return bossFinishBossWarning(env, enemy, state, timestamp, charge);
    }

/** HP/label changes do not create a new warning: only the mode and attack number identify it. */
function bossPatternWarningKey(state) {
    return `${state.patternMode || state.mode}:${state.attackNumber}`;
}

function bossBeginWarning(env, enemy, state, warning) {
    const { target, key, timestamp, charge, chargePerSec } = warning;
    if (!bossWarningMayStart(env, state, charge, chargePerSec)) {
        bossClearBossTelegraph(env, enemy);
        return false;
    }
    enemy.patternTelegraphKey = key;
    enemy.patternTelegraphStartedAt = timestamp;
    if (!target) return true;
    if (state.mode === 'woodsman') {
        enemy.patternArea = env.deps.woodsmanBattle.warning(enemy, state, target, timestamp);
        return false;
    }
    // Lines/fans originate at the boss footprint cell nearest the locked target.
    enemy.patternArea = bossBossWarningArea(env, enemy, state, target, timestamp);
    return true;
}

export function bossBossWarningArea(env, enemy, state, target, now) {
        const observer = env.deps.bossMoves.observer.area(enemy, state, target);
        if (observer) return observer;
        const shift = env.deps.bossMoves.prepareShift(enemy, state, target, now);
        if (shift) return shift;
        const profile = env.deps.COMBAT_GRID_CONFIG.bossPatternProfiles[state.telegraphKind], from = env.deps.getClosestGridUnitCell(target, enemy);
        return { ...env.deps.getSkillStageFootprint('', {}, { aimCell: target, gridProfile: profile }, from), source: from };
    }

export function bossFinishBossWarning(env, enemy, state, now, charge) {
        if (!env.deps.bossMoves.updateShift(enemy, now)) { bossClearBossTelegraph(env, enemy); return false; }
        env.deps.bossMoves.observer.followSeal(enemy, state, now);
        if (now - enemy.patternTelegraphStartedAt < bossWarningDuration(env, state)) return false;
        return bossReleaseAfterWarning(enemy, state, charge);
    }

/** Live warnings, including attacks already released but not yet resolved. */
    export function bossGetBossWarningCells(env, state, pending = []) {
        const enemies = (state.enemies || []).filter(enemy => enemy.hp > 0 && !enemy.noAttack
            && !(enemy.ailments || []).some(ail => ['freeze','stun','silence'].includes(ail.type) && ail.time > 0));
        const areas = enemies.map(enemy => enemy.patternArea).filter(Boolean).map(area => area.woodsman
            ? { cells: env.deps.woodsmanBattle.warningCells(area.woodsman, env.deps.getCombatTime()) } : area);
        pending.forEach(attack => {
            if (attack.delivery !== 'patternArea') return;
            const move = attack.bossPattern.move;
            areas.push(move?.kind === 'woodsman'
                ? { cells: env.deps.woodsmanBattle.warningCells(move.cast, env.deps.getCombatTime(), move.releasedAt) } : attack.bossPattern.area);
        });
        return areas.flatMap(area => area.cells);
    }
