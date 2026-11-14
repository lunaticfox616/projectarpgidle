import { renderCombatEffectIcon, renderUiRuntimeEffectIcon, renderUiNamedEffectIcon } from './combat-hud-effect-icons.mjs';
import { getConditionEffectTitle } from './combat-hud-effect-details.mjs';

export function buildEnemyCombatEffectIcons(runtime, activeAilments, enemyDebuffs, now, enemy) {
    let ailmentIcons = (activeAilments || []).filter(ail => ail && (ail.time || 0) > 0).map(ail => {
        let remain = Math.ceil(Math.max(0, ail.time || 0));
        let type = String(ail.type || 'unknown');
        let stacks = type === 'assassinWeakness'
            ? Math.max(1, Math.floor(ail.power || 1))
            : Math.max(1, Math.floor(ail.stacks || 1));
        let badge = stacks > 1 ? `${stacks}` : '';
        let tooltipPayload = enemyAilmentPayload(runtime, ail, { type, remain, stacks });
        let tooltip = `showEnemyAilmentTooltip(event,${(0, runtime.deps.escapeHTML)(JSON.stringify(tooltipPayload))})`;
        return renderCombatEffectIcon(runtime, { key: type, tooltip, badge, remainingSec: remain, durationSec: ail.duration });
    });
    let curseIcons = (enemyDebuffs || []).filter(row => row && (row.expiresAt || 0) > now).map(row => {
        let remain = Math.ceil(Math.max(0, ((row.expiresAt || 0) - now) / 1000));
        let nameArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(row.name || '')));
        let tooltip = `showPlayerBuffTooltip(event,${nameArg},'curse',${remain})`;
        return renderCombatEffectIcon(runtime, { key: 'curse', label: getConditionEffectTitle(runtime, row.name), tooltip, remainingSec: remain, durationSec: Number(row.durationMs) / 1000 });
    });
    return ailmentIcons.concat(curseIcons).join('') + buildEnemyRuntimeEffectIcons(runtime, enemy, now);
}

export function buildEnemyRuntimeEffectIcons(runtime, enemy, now) {
    if (!enemy || enemy.id == null) return '';
    let icons = [];
    let id = enemy.id;
    appendEnemySkillDotIcon(runtime, enemy, now, icons);
    appendEnemyChaosIcons(runtime, id, now, icons);
    appendEnemyElementalJudgmentIcons(runtime, id, now, icons);
    appendEnemyHitMarkIcons(runtime, id, now, icons);
    if (Number(enemy.chaosErosionShred) > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'chaosErosion', value: enemy.chaosErosionShred }, now));
    if (Number(enemy.regenSuppressPct) > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'regenSuppress', value: enemy.regenSuppressPct }, now));
    return icons.join('');
}


function appendEnemyHitMarkIcons(runtime, id, now, icons) {
    let butcherHits = Math.max(0, Math.floor(Number(((runtime.deps.game.talentButcherMarks || {})[id] || {}).hits) || 0));
    if (butcherHits > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'talentButcherMark', value: butcherHits, badge: `${butcherHits}` }, now));
    let weakpointHits = Math.max(0, Math.floor(Number(((runtime.deps.game.rangerWeakpointMarks || {})[id] || {}).hits) || 0));
    if (weakpointHits > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'rangerWeakpointMark', value: weakpointHits, badge: `${weakpointHits}` }, now));
}

function appendEnemyElementalJudgmentIcons(runtime, id, now, icons) {
    let elementalRow = (runtime.deps.game.enemyUniqueElementalResDown || {})[id];
    if (elementalRow && Number(elementalRow.stacks) > 0) {
        let stacks = Math.floor(elementalRow.stacks);
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'enemyElementalResDown', value: stacks, maxValue: elementalRow.perHit, badge: `${stacks}` }, now));
    }
    let judgment = (runtime.deps.game.talentInquisitorMarks || {})[id];
    if (judgment && Number(judgment.accumulated) > 0 && Number(judgment.explodeAt) > now) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'talentInquisitorMark', value: judgment.accumulated, expiresAt: judgment.explodeAt }, now));
    }
}

function appendEnemyChaosIcons(runtime, id, now, icons) {
    let witherStacks = Math.max(0, Math.floor(Number((runtime.deps.game.enemyWitherStacks || {})[id]) || 0));
    if (witherStacks > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'enemyWither', value: witherStacks, badge: `${witherStacks}` }, now));
    let chaosRow = (runtime.deps.game.enemyUniqueChaosResDown || {})[id];
    if (chaosRow && Number(chaosRow.stacks) > 0) {
        let stacks = Math.floor(chaosRow.stacks);
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'enemyChaosResDown', value: stacks, maxValue: chaosRow.perHit, badge: `${stacks}` }, now));
    }
}

function appendEnemySkillDotIcon(runtime, enemy, now, icons) {
    let dot = enemy.dotState && typeof enemy.dotState === 'object' ? enemy.dotState : null;
    if (dot && Number(dot.timeLeft) > 0 && dot.skillName !== '화염 부패') {
        const { stacks, name, detail } = enemySkillDotLabel(runtime, enemy, dot);
        icons.push(renderUiNamedEffectIcon(runtime, { key: 'enemySkillDot', name, detail, remainSec: dot.timeLeft, badge: `${stacks}` }, now));
    }
}

function enemyAilmentPayload(runtime, ail, display) { return {
        type: display.type,
        timeLeft: display.remain,
        power: Number(ail.power || 0),
        sourceHitDamage: Math.floor((0, runtime.deps.getUiStoredAilmentHitDamage)(ail)),
        specialDps: Math.floor(ail.flameDecayDps || 0),
        critDotBonusPct: Number(ail.critDotBonusPct || 0),
        stacks: display.stacks,
        rawTickDamage: Math.floor(ail.rawTickDamage || 0),
        tickInterval: Number(ail.tickInterval || 0),
        enemyRes: Number(ail.enemyRes || 0),
        abyssPlayerMul: Number(ail.abyssPlayerMul || 1),
        igniteTakenMultiplier: Number(ail.igniteTakenMultiplier || 1)
    }; }

function enemySkillDotLabel(runtime, enemy, dot) {
    let stacks = Math.max(1, Math.floor(Number(dot.stacks) || Number(enemy.dotStacks) || 1));
    let slow = Math.max(0, Number(enemy.skillSlowPct) || 0);
    let name = dot.skillName && dot.skillName !== 'dot' ? dot.skillName : '지속 피해';
    let detail = `${stacks}중첩, 틱 피해 ${Math.floor(Number(dot.rawTickDamage) || 0)}${slow > 0 ? (0, runtime.deps._t)(', 둔화 {slow}%', { slow: slow.toFixed(0) }) : ''}`;
    return { stacks, name, detail };
}
