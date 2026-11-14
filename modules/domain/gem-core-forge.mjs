import { forgeRuneOdds, FINISHED_FORGE_ODDS } from './gem-forge-values.mjs';

const heldForgeCurrency = (owner, key) => Math.max(0, Math.floor(Number(owner.currencies[key]) || 0));

function forgeUnavailable(env, owner, name, { done, owned, cost }) {
    if (owner.season < 2 || !env.deps.isUnlocked('gemForge', owner)) return '룬 강화를 먼저 해금하세요.';
    if (owner.woodsmanBuildLock) return '☠️ 나무꾼 전투 중에는 룬을 강화할 수 없습니다.';
    if (!env.deps.enhanceableNames(owner).includes(name) || !owner.gemData[name]) return '강화할 공격 룬을 먼저 장착하세요.';
    if (done) return '최대 강화';
    return owned < cost ? '재료 부족' : '';
}

/** Read-only cost/odds and admission; no roll, wallet change or persistence. */
export function inspectRuneForge(env, owner, name, { cores = 0, timed = false } = {}) {
    const rules = env.rules, gem = env.deps.normalizeGem(owner.gemData[name]);
    const level = gem.enhanceLevel, failures = gem.enhanceFailures, done = level >= rules.maxLevel;
    const owned = heldForgeCurrency(owner, rules.materialKey), coresOwned = heldForgeCurrency(owner, rules.boosterKey);
    const cost = done ? 0 : rules.costs[level];
    const coresUsed = done ? 0 : Math.max(0, Math.min(rules.boosterMax, coresOwned, Math.floor(cores)));
    const odds = done ? FINISHED_FORGE_ODDS : forgeRuneOdds(rules, { level, failures, coresUsed, timed });
    return { name, level, failures, owned, cost, coresOwned, coresUsed, done, spares: env.deps.spareCount(owner, name),
        ...odds, error: forgeUnavailable(env, owner, name, { done, owned, cost }) };
}

function removeShatteredRune(env, owner, name) {
    owner.skills = owner.skills.filter(gem => gem !== name);
    if (owner.activeSkill === name) owner.activeSkill = '기본 공격';
    if (owner.weaponBlockedSkill === name) owner.weaponBlockedSkill = '';
    if (owner.mobilitySkill === name) { owner.mobilitySkill = ''; env.deps.resetMobility(); }
    owner.equippedSummonSkills = (owner.equippedSummonSkills || []).filter(gem => gem !== name);
    if (owner.summonSkillCounts) delete owner.summonSkillCounts[name];
}

/** Enhancement resets; a spare keeps the equipped rune, otherwise the occupied slots are cleared. */
function shatterForgedRune(env, owner, name) {
    owner.gemData[name] = { ...env.deps.normalizeGem(owner.gemData[name]), enhanceLevel: 0, enhanceFailures: 0 };
    if (env.deps.takeSpare(owner, name)) return false;
    removeShatteredRune(env, owner, name);
    return true;
}

/** Admission, payment, one random roll, then outcome mutation. Blocked attempts consume nothing. */
export function attemptRuneForge(env, owner, name, options) {
    const before = inspectRuneForge(env, owner, name, options);
    if (before.error) return { ...before, status: 'blocked' };
    owner.currencies[env.rules.materialKey] -= before.cost;
    owner.currencies[env.rules.boosterKey] -= before.coresUsed;
    const roll = Math.random() * 100;
    if (roll >= before.chance && roll < before.chance + before.destroy) return { ...before, status: 'destroyed', lost: shatterForgedRune(env, owner, name) };
    const success = roll < before.chance;
    owner.gemData[name] = { ...env.deps.normalizeGem(owner.gemData[name]), enhanceLevel: before.level + Number(success), enhanceFailures: success ? 0 : before.failures + 1 };
    return { ...before, status: success ? 'success' : 'failure' };
}
