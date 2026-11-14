

export function controlHasPlayerChannelBreakingAilment(env) {
    let breakingTypes = new Set(['freeze', 'stun', 'root', 'immobilize']);
    return (env.owner.playerAilments || []).some(ailment => ailment && ailment.time > 0 && breakingTypes.has(ailment.type));
}

// Combat and animation have different clocks; mark cancellation without mixing their timestamps.
export function* controlCancelCombatChannelVisuals(env) {
    if (!env.runtime.combatChannelRuntime.id) return;
    (yield { kind: 'cancelChannelVisuals', args: [env.runtime.combatChannelRuntime.id] });
}

export function* controlUpdateCombatChannelRuntime(env, now) {
    let timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    if (!env.runtime.combatChannelRuntime.id) return false;
    if (controlHasPlayerChannelBreakingAilment(env)) {
        yield* controlCancelCombatChannel(env, '군중 제어');
        return false;
    }
    if (timestamp >= env.runtime.combatChannelRuntime.endAt) {
        env.runtime.combatChannelResumeSkillName = env.runtime.combatChannelRuntime.skillName;
        env.runtime.combatChannelRuntime = { ...env.runtime.combatChannelRuntime, id: 0 };
    }
    return env.runtime.combatChannelRuntime.id > 0;
}

/** A double strike shares the current cycle; continued cycles retain their absolute deadline.
 * @param {string} skillName @param {number} motionMs @param {number} cycleMs
 * @param {{repeatChannelCast:boolean,channelContinuation:boolean}} context
 * @returns {{id:number,skillName:string,startAt?:number,endAt:number}}
 */
export function controlBeginCombatChannel(env, skillName, motionMs, cycleMs, context) {
    if (context.repeatChannelCast && env.runtime.combatChannelRuntime.id) return env.runtime.combatChannelRuntime;
    let startAt = env.deps.getCombatTime() + motionMs;
    if (context.channelContinuation) startAt = env.runtime.combatChannelRuntime.endAt || env.deps.getCombatTime();
    env.runtime.combatChannelRuntime = {
        id: env.runtime.nextCombatChannelId++, skillName, startAt, endAt: startAt + cycleMs
    };
    return env.runtime.combatChannelRuntime;
}

export function controlGetCombatChannelCycleMs(attackSpeed) {
    let attacksPerSecond = Math.max(0.01, Number(attackSpeed) || 1);
    return Math.max(1, Math.min(5000, 1000 / attacksPerSecond));
}

export function controlCreateContinuousChannelStages(stages, cycleMs) {
    let source = Array.isArray(stages) ? stages : [];
    let stepMs = Math.max(1, Math.floor(Math.max(1, cycleMs) / Math.max(1, source.length)));
    return source.map((stage, index) => ({ ...stage, delayMs: index * stepMs }));
}

export function controlConsumeCombatChannelContinuation(env, skillName) {
    let continues = env.runtime.combatChannelResumeSkillName === String(skillName || '') || (!!env.runtime.combatChannelRuntime.id && env.runtime.combatChannelRuntime.skillName === skillName);
    env.runtime.combatChannelResumeSkillName = '';
    return continues;
}

export function controlGetCombatChannelGate(env, pStats, now) {
    const { active, ready } = controlReadChannelWindow(env, now);
    if (!active && !ready) return { endAt: 0, locked: false, hasTargets: false };
    if (ready && controlHasPlayerChannelBreakingAilment(env)) {
        env.runtime.combatChannelResumeSkillName = '';
        return { endAt: 0, locked: false, hasTargets: false };
    }
    let hasTargets = env.deps.getSkillTargets(pStats).length > 0;
    if (ready && !hasTargets) env.runtime.combatChannelResumeSkillName = '';
    return { endAt: active ? env.runtime.combatChannelRuntime.endAt : 0, locked: active || (ready && hasTargets), hasTargets };
}

function controlReadChannelWindow(env, now) {
    const timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    const active = !!env.runtime.combatChannelRuntime.id && timestamp < env.runtime.combatChannelRuntime.endAt;
    const ready = env.runtime.combatChannelResumeSkillName === String(env.owner.activeSkill || '');
    return { active, ready };
}

export function* controlResetCombatChannelRuntime(env) {
    yield* controlCancelCombatChannelVisuals(env);
    env.runtime.combatChannelRuntime = { id: 0, skillName: '', endAt: 0 };
    env.runtime.combatChannelResumeSkillName = '';
    env.runtime.pendingSkillStageHits = env.runtime.pendingSkillStageHits.filter(row => !row || !row.channelId);
    if (env.owner) env.owner.passiveChannelPath = null;
}

export function* controlCancelCombatChannel(env, reason) {
    if (!env.runtime.combatChannelRuntime.id) return false;
    yield* controlCancelCombatChannelVisuals(env);
    env.runtime.pendingSkillStageHits = env.runtime.pendingSkillStageHits.filter(row => !row || !row.channelId);
    env.runtime.combatChannelRuntime = { id: 0, skillName: '', endAt: 0 };
    env.runtime.combatChannelResumeSkillName = '';
    env.owner.passiveChannelPath = null;
    if (reason) (yield { kind: 'addBattleFx', args: ['statusText', { text: env.deps._t('집중 취소, {reason}', { reason }), color: '#d7b8ff', duration: 480 }] });
    return true;
}
