import { renderUiNamedEffectIcon } from './combat-hud-effect-icons.mjs';

export function getUiRecoveryEffectSummary(runtime, instances, target) {
    let active = (Array.isArray(instances) ? instances : []).filter(row => {
        if (!row || Number(row.remaining) <= 0 || Number(row.rate) <= 0) return false;
        return !target || (row.target === 'energyShield' ? 'energyShield' : 'life') === target;
    });
    if (active.length === 0) return null;
    return active.reduce((summary, row) => {
        let remaining = Math.max(0, Number(row.remaining) || 0);
        let rate = Math.max(0, Number(row.rate) || 0);
        summary.remaining += remaining;
        summary.rate += rate;
        summary.remainSec = Math.max(summary.remainSec, rate > 0 ? remaining / rate : 0);
        return summary;
        }, { remaining: 0, rate: 0, remainSec: 0 });
}

export function getUiEliteTraitBuffDetail(runtime, trait) {
    let source = trait && typeof trait === 'object' ? trait : {};
    let parts = [];
    appendEliteMultiplierDetails(source, parts);
    if (Number(source.critChanceBonus)) parts.push(`치명타 확률 +${Number(source.critChanceBonus)}%p`);
    if (Number(source.dr)) parts.push(`피해 감소 +${Number(source.dr)}%`);
    let resistance = ['resF', 'resC', 'resL', 'resChaos'].reduce((sum, stat) => sum + Math.max(0, Number(source[stat]) || 0), 0);
    if (resistance > 0) parts.push(`저항 보너스 합계 +${resistance}%`);
    if (Number(source.hitRateGuard)) parts.push(`회피 +${Math.round(Number(source.hitRateGuard) * 100)}%`);
    return parts.join(', ') || '훔친 정예 특성이 적용됩니다.';
}

/** Icon title of a condition effect: the talisman line's gem name (or its kind), or 함성 공명 for the belt. */
export function getConditionEffectTitle(runtime, name) {
    const id = String(name || '').replace(/^talisman:/, '');
    if (id === 'resonance') return '함성 공명';
    const def = runtime.deps.talismans.conditionDef(id);
    return def ? (def.name || { guard: '수호', warcry: '함성', curse: '저주' }[def.kind]) : String(name || '');
}

/** 세계수의 숨결(js/combat-incidents.js breathe)이 깃든 동안의 전투 효과 아이콘, 아니면 ''. */
export function renderIncidentBreathIcon(runtime, now) {
    const breath = runtime.deps.game.incidentBreath, kind = Number(breath && breath.until) > now ? runtime.deps.combatIncidents.breathKind(breath) : null;
    return kind ? renderUiNamedEffectIcon(runtime, { key: 'incidentBreath', name: kind.name, detail: kind.text, expiresAt: breath.until, durationSec: runtime.deps.ACT_EXPLORATION_INCIDENTS.breath.seconds }, now) : '';
}

export function getUiLeechEffectDetail(runtime, summary, pStats, target) {
    let resource = target === 'energyShield' ? '보호막' : '생명력';
    let remaining = Math.floor(summary.remaining || 0);
    let rate = Math.floor(summary.rate || 0);
    if (typeof runtime.deps.getLeechCaps !== 'function') return (0, runtime.deps._t)('남은 {resource} 회복 {remaining}, 초당 {rate}', { resource, remaining, rate });
    let caps = (0, runtime.deps.getLeechCaps)(pStats, target);
    return (0, runtime.deps._t)('남은 {resource} 회복 {remaining} / 저장 한도 {floor}, 현재 초당 {rate}, 개별 초당 상한 {floor2}', { resource, remaining, floor: Math.floor(caps.totalCap), rate, floor2: Math.floor(caps.rateCap) });
}


function appendEliteMultiplierDetails(source, parts) {
    if (Number(source.atkMul) > 1) parts.push(`피해 +${Math.round((source.atkMul - 1) * 100)}%`);
    if (Number(source.attackSpeedVarMul) > 1) parts.push(`공격 속도 +${Math.round((source.attackSpeedVarMul - 1) * 100)}%`);
    if (Number(source.hpMul) > 1) parts.push(`최대 생명력 +${Math.round((source.hpMul - 1) * 100)}%`);
}
