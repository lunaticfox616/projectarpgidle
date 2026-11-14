import { REPEAT_GAP_MS, LEAPS, LANDS_ONCE } from './support-attack.mjs';

// Planning only: never applies damage, changes the world, queues hits or emits visual effects.
// world is the caller's live/replay snapshot. Target references and stable tie order are preserved.
class SupportContactPlanner {
    constructor(inputs) { this.inputs = inputs; }
    stages(rows, skill, world) {
        const fx = skill.supportEffects;
        if (!fx || !rows.length) return rows;
        let result = rows.map(row => ({ ...row, targets: row.targets.map((entry, i) => ({ ...entry,
            mult: this.stageTargetMultiplier(entry, i, skill) })) }));
        if (fx.chain) result = skill.combatPattern ? this.appendAuthoredChain(result, fx.chain, skill.combatPattern.kind === 'authored', world) : this.chainStages(this.uniqueStageTargets(result), fx.chain);
        if (fx.repeat) {
            const delay = Math.max(...result.map(row => row.delayMs || 0)) + REPEAT_GAP_MS;
            result = result.concat(result.map(row => ({ ...row, kind: 'supportRepeat', label: this.inputs.translate('반복'),
                singleRepeat: true, delayMs: (row.delayMs || 0) + delay, damageMultiplier: row.damageMultiplier * fx.repeat.damagePct / 100 })));
        }
        if (fx.mineDelayMs) result = result.map(row => ({ ...row, delayMs: (row.delayMs || 0) + fx.mineDelayMs, delivery: 'instantTarget' }));
        return result;
    }
    stageTargetMultiplier(entry, index, skill) {
        const fx = skill.supportEffects;
        if (fx.sweep && index > 0) return fx.sweep.damagePct / 100;
        if (fx.projectiles && skill.projectilePattern?.kind !== 'fan') return 1;
        return entry.mult;
    }
    chainStages(targets, config) {
        return targets.map((entry, i) => ({ kind: i ? 'chainJump' : 'chainPrimary', label: i ? '연쇄' : '직격', delayMs: i * 120,
            damageMultiplier: Math.pow(1 + config.stepDamagePct / 100, i), chainFromEnemyId: i ? targets[i - 1].enemy.id : null, targets: [{ ...entry, mult: 1 }] }));
    }
    uniqueStageTargets(rows) { return Array.from(new Map(rows.flatMap(row => row.targets).map(entry => [entry.enemy.id, entry])).values()); }
    // Authored impacts chain once from their landing spot, without rewriting their original stages.
    appendAuthoredChain(rows, chain, once, world) {
        return rows.flatMap((row, index) => {
            const first = row.targets[0]?.enemy;
            if (!first || (once && index)) return [row];
            const plan = [], seen = new Set(row.targets.map(entry => entry.enemy.id));
            this.nativeChain(plan, first, seen, chain, world);
            const extra = plan.map(contact => ({ ...row, kind: 'supportChain', label: this.inputs.translate('추가 연쇄'),
                delayMs: (row.delayMs || 0) + contact.delay, damageMultiplier: row.damageMultiplier * contact.mult,
                chainFromEnemyId: contact.from, delivery: 'instantTarget', singleRepeat: true, skipGridControl: true,
                targets: [{ enemy: contact.enemy, mult: 1 }] }));
            return [row, ...extra];
        });
    }
    repeat(command, targets) {
        const stats = command.stats, repeat = stats.sSkill.supportEffects?.repeat;
        if (!repeat) return null;
        const rows = [{ kind: 'supportRepeat', label: this.inputs.translate('반복'), delayMs: REPEAT_GAP_MS,
            damageMultiplier: (command.damagePct ?? 100) / 100 * repeat.damagePct / 100,
            targets: targets.map(enemy => ({ enemy, mult: 1 })), singleRepeat: true }];
        return { rows, stats, options: { ...command.attackOptions, skillName: command.name, baseDelayMs: 0,
            forcedElement: stats.sSkill.ele, damageTextGroupId: command.key } };
    }
    // Native casts keep their own bounce/shard/movement contacts. Append only the support-owned contacts.
    augment(command, targets, world) {
        const fx = command.stats.sSkill.supportEffects, first = targets[0], seen = new Set(targets.map(enemy => enemy.id));
        if (!fx || !first || command.noAugment) return null;
        const plan = [], id = command.stats.sSkill.nativeCastId;
        if (id !== 44 && (command.leadContact || !LANDS_ONCE.has(id))) this.nativeChain(plan, first, seen, fx.chain, world);
        this.nativeRays(plan, { source: command.sourceCell || world.gridPlayer, first }, seen, LEAPS.has(id) ? fx : { pierce: fx.pierce }, world);
        if (fx.sweep) this.nativeCandidates(first, seen, 1, world).slice(0, fx.sweep.extra).forEach(enemy => {
            seen.add(enemy.id); plan.push({ enemy, mult: fx.sweep.damagePct / 100, delay: 0, from: first.id, kind: 'supportSweep' });
        });
        return this.nativeExtras(command, plan);
    }
    nativeCandidates(from, seen, range, world) {
        return world.enemies.filter(enemy => enemy.hp > 0 && !seen.has(enemy.id) && this.inputs.distance(from, enemy) <= range)
            .sort((a, b) => this.inputs.distance(from, a) - this.inputs.distance(from, b));
    }
    nativeChain(plan, first, seen, chain, world) {
        if (!chain) return;
        let from = first;
        for (let i = 1; i <= chain.count; i++) {
            const enemy = this.nativeCandidates(from, seen, 3, world)[0];
            if (!enemy) break;
            seen.add(enemy.id); plan.push({ enemy, mult: Math.pow(1 + chain.stepDamagePct / 100, i), delay: i * 120, from: from.id, kind: 'supportChain' });
            from = enemy;
        }
    }
    nativeRayTarget(source, first, enemy, fan) {
        const ax = first.gx - source.gx, ay = first.gy - source.gy, bx = enemy.gx - source.gx, by = enemy.gy - source.gy;
        const aim = Math.hypot(ax, ay), distance = Math.hypot(bx, by);
        if (!aim || !distance || distance > Math.max(4, aim + 2)) return false;
        const forward = (ax * bx + ay * by) / aim;
        return fan ? forward / distance >= Math.cos(Math.PI * 55 / 180) : forward > aim && Math.abs(ax * by - ay * bx) / aim <= 0.55;
    }
    nativeRays(plan, aim, seen, fx, world) {
        const { source, first } = aim;
        for (const [count, fan, kind] of [[fx.pierce, false, 'supportPierce'], [fx.projectiles?.extra, true, 'supportFan']]) {
            if (!count) continue;
            this.nativeCandidates(source, seen, Math.max(4, this.inputs.distance(source, first) + 2), world)
                .filter(enemy => this.nativeRayTarget(source, first, enemy, fan)).slice(0, count).forEach(enemy => {
                    seen.add(enemy.id); plan.push({ enemy, mult: 1, delay: 80, from: first.id, kind });
                });
        }
    }
    nativeExtras(command, plan) {
        if (!plan.length) return null;
        const stats = command.stats, base = (command.bonus ? this.inputs.bonusShotDamagePct / 100 : 1) * (command.damagePct ?? 100) / 100;
        let rows = plan.map(row => ({ kind: row.kind, label: this.inputs.translate('추가 타격'), delayMs: row.delay,
            damageMultiplier: base * row.mult, chainFromEnemyId: row.from, delivery: 'instantTarget', singleRepeat: true,
            skipGridControl: true, targets: [{ enemy: row.enemy, mult: 1 }] }));
        const repeat = stats.sSkill.supportEffects.repeat;
        if (repeat) rows = rows.concat(rows.map(row => ({ ...row, delayMs: row.delayMs + REPEAT_GAP_MS, damageMultiplier: row.damageMultiplier * repeat.damagePct / 100 })));
        return { rows, stats, options: { ...command.attackOptions, skillName: command.name, baseDelayMs: 0,
            forcedElement: command.attackOptions?.forcedElement || stats.sSkill.ele, damageTextGroupId: command.key } };
    }
}
export function createSupportContactPlanner(inputs) {
    const planner = new SupportContactPlanner(inputs);
    return Object.freeze({ stages: planner.stages.bind(planner), repeat: planner.repeat.bind(planner), augment: planner.augment.bind(planner) });
}
