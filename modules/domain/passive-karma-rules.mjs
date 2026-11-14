import { passiveRuleFindAllocatedPassiveKeystone } from './passive-keystone-lookup.mjs';
import { passiveRuleEnsurePassiveSpecializationState } from './passive-specialization-state.mjs';

export function passiveRuleIsPassiveKarmaTarget(enemy) {
    return !!(enemy && (enemy.isBoss || enemy.isElite || enemy.elite));
}

export function passiveRuleRecordPassiveKarmaLoss(env, owner, enemy, resourceLost) {
    if (!passiveRuleFindAllocatedPassiveKeystone(env, owner, '카르마') || !passiveRuleIsPassiveKarmaTarget(enemy)) return 0;
    const amount = Math.max(0, Math.floor(Number(resourceLost) || 0));
    if (amount <= 0) return 0;
    const karma = passiveRuleEnsurePassiveSpecializationState(env, owner).karma;
    const targetId = String(enemy.id);
    karma.byEnemy[targetId] = Math.min(env.deps.PASSIVE_KARMA_PER_TARGET_CAP,
        Math.max(0, Math.floor(karma.byEnemy[targetId] || 0)) + amount);
    return karma.byEnemy[targetId];
}

export function passiveRuleBeginPassiveKarmaAttack(env, owner, enemy, now) {
    const timestamp = Number.isFinite(now) ? now : env.deps.getCombatTime();
    const state = passiveRuleEnsurePassiveSpecializationState(env, owner), karma = state.karma;
    if (!passiveRuleFindAllocatedPassiveKeystone(env, owner, '카르마') || !passiveRuleIsPassiveKarmaTarget(enemy)) {
        if (!passiveRuleFindAllocatedPassiveKeystone(env, owner, '카르마')) karma.buff = null;
        return { targetId: '', multiplier: 1, morePct: 0 };
    }
    const targetId = String(enemy.id), stored = Math.max(0, Math.floor(karma.byEnemy[targetId] || 0));
    if (stored > 0) {
        karma.buff = { targetId, morePct: Math.floor(stored / 5), expiresAt: timestamp + 4000, actionsLeft: 5 };
        delete karma.byEnemy[targetId];
    }
    return consumeKarmaBuff(karma, targetId, timestamp);
}

function consumeKarmaBuff(karma, targetId, timestamp) {
    let buff = karma.buff;
    if (!buff || buff.targetId !== targetId || buff.expiresAt <= timestamp || buff.actionsLeft <= 0) {
        if (buff && (buff.expiresAt <= timestamp || buff.actionsLeft <= 0)) karma.buff = null;
        return { targetId, multiplier: 1, morePct: 0 };
    }
    const result = { targetId, multiplier: 1 + buff.morePct / 100, morePct: buff.morePct };
    buff.actionsLeft -= 1;
    if (buff.actionsLeft <= 0) karma.buff = null;
    return result;
}
