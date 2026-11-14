import { getUiCombatEffectPresentation, renderCombatEffectIcon, renderUiRuntimeEffectIcon, renderUiNamedEffectIcon } from './combat-hud-effect-icons.mjs';
import { getConditionEffectTitle, renderIncidentBreathIcon, getUiEliteTraitBuffDetail, getUiRecoveryEffectSummary, getUiLeechEffectDetail } from './combat-hud-effect-details.mjs';

export function buildPlayerAilmentEffectIcons(runtime) {
    return (runtime.deps.game.playerAilments || []).filter(ail => ail && (ail.time || 0) > 0).map(ail => {
        let remain = Math.ceil(Math.max(0, ail.time || 0));
        let type = String(ail.type || 'unknown');
        let typeArg = (0, runtime.deps.escapeHTML)(JSON.stringify(type));
        let visual = getUiCombatEffectPresentation(runtime, type);
        let stacks = Math.max(1, Math.floor(ail.stacks || 1));
        let tooltip = `showPlayerAilmentTooltip(event,${typeArg},${remain},${Number(ail.power || 0.1).toFixed(3)},${Math.floor((0, runtime.deps.getUiStoredAilmentHitDamage)(ail))})`;
        return renderCombatEffectIcon(runtime, { key: type, label: visual.label, tooltip, badge: stacks > 1 ? `${stacks}` : '', remainingSec: remain, durationSec: ail.duration });
    }).join('');
}

export function buildPlayerConditionEffectIcons(runtime, now) {
    let icons = [];
    if (runtime.deps.game.woodsmanCurseActive) {
        let taken = Math.max(0, Math.floor(runtime.deps.game.woodsmanCurseDamageTakenStacks || 0)) * 0.01;
        let tooltip = `showPlayerRuntimeEffectTooltip(event,'woodsmanCurse',${taken.toFixed(2)},0,0)`;
        icons.push(renderCombatEffectIcon(runtime, { key: 'woodsmanCurse', tooltip }));
    }
    runtime.deps.talismanCombat.active().forEach(({ buff }) => {
        let nameArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(buff.name || '')));
        let typeArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(buff.type || 'buff')));
        let key = ['guard', 'warcry'].includes(buff.type) ? buff.type : 'buff';
        icons.push(renderCombatEffectIcon(runtime, { key, label: getConditionEffectTitle(runtime, buff.name), tooltip: `showPlayerBuffTooltip(event,${nameArg},${typeArg},0)` }));
    });
    (runtime.deps.game.cosmosPlayerDebuffs || []).filter(row => row && (row.expiresAt || 0) > now).forEach(row => {
        let remain = Math.ceil(Math.max(0, ((row.expiresAt || 0) - now) / 1000));
        let type = String(row.type || 'unknown');
        let typeArg = (0, runtime.deps.escapeHTML)(JSON.stringify(type));
        let labelArg = (0, runtime.deps.escapeHTML)(JSON.stringify(String(row.label || '')));
        let tooltip = `showPlayerCosmosDebuffTooltip(event,${typeArg},${Number(row.value || 0).toFixed(2)},${remain},${labelArg})`;
        icons.push(renderCombatEffectIcon(runtime, { key: type, label: row.label, tooltip, remainingSec: remain, durationSec: Number(row.durationMs) / 1000 }));
    });
    return icons.join('');
}

export function buildPlayerUniqueEffectIcons(runtime, pStats, now) {
    let icons = [];
    appendStoneShieldIcon(runtime, now, icons);
    appendUniqueGuardIcon(runtime, pStats, now, icons);
    appendStealthLeechIcons(runtime, pStats, now, icons);
    appendUniqueStackIcons(runtime, pStats, now, icons);
    appendUniqueReadyIcons(runtime, pStats, now, icons);
    return icons.join('');
}

export function buildPlayerRecoveryEffectIcons(runtime, pStats) {
    let icons = [];
    let lifeLeech = getUiRecoveryEffectSummary(runtime, runtime.deps.game.playerLeechInstances, 'life');
    let esLeech = getUiRecoveryEffectSummary(runtime, runtime.deps.game.playerLeechInstances, 'energyShield');
    let recoup = getUiRecoveryEffectSummary(runtime, runtime.deps.game.playerRecoupInstances);
    if (lifeLeech) icons.push(renderUiNamedEffectIcon(runtime, { key:'lifeLeech', name:'생명력 흡혈', detail:getUiLeechEffectDetail(runtime, lifeLeech, pStats, 'life'), remainSec:lifeLeech.remainSec }, 0));
    if (esLeech) icons.push(renderUiNamedEffectIcon(runtime, { key:'energyShieldLeech', name:'에너지 보호막 흡혈', detail:getUiLeechEffectDetail(runtime, esLeech, pStats, 'energyShield'), remainSec:esLeech.remainSec }, 0));
    if (recoup) icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'lifeRecoup', value: recoup.remaining, maxValue: recoup.rate, remainSec: recoup.remainSec }, 0));
    if (Number(runtime.deps.game.delayedGuardHealPool) >= 1) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'delayedGuardHeal', value: runtime.deps.game.delayedGuardHealPool }, 0));
    }
    return icons.join('');
}


function appendUniqueReadyIcons(runtime, pStats, now, icons) {
    if (pStats.uniqueRiderCompass && Number(runtime.deps.game.lastMoveEndedAt) > 0 && !runtime.deps.game.uniqueRiderCompassConsumed) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'riderCompassReady' }, now));
    }
    icons.push(renderIncidentBreathIcon(runtime, now));
    let elite = runtime.deps.game.uniqueEliteTraitBuff;
    if (elite && Number(elite.expiresAt) > now) {
        icons.push(renderUiNamedEffectIcon(runtime, { key: 'eliteTraitBuff', name: (elite.trait || {}).name || '무한한 허기', detail: getUiEliteTraitBuffDetail(runtime, elite.trait), expiresAt: elite.expiresAt }, now));
    }
}

function appendUniqueStackIcons(runtime, pStats, now, icons) {
    let armorAmp = pStats.uniqueMeleeArmorAmp;
    let armorStacks = Math.max(0, Math.floor(Number(runtime.deps.game.uniqueMeleeArmorAmpStacks) || 0));
    if (armorAmp && armorStacks > 0 && Number(runtime.deps.game.uniqueMeleeArmorAmpExpiresAt) > now) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'meleeArmorAmp', value: armorStacks, maxValue: armorAmp.ampPct, expiresAt: runtime.deps.game.uniqueMeleeArmorAmpExpiresAt, badge: `${armorStacks}` }, now));
    }
    let moveState = runtime.deps.game.uniqueKillMoveStacksState;
    if (pStats.uniqueKillMoveStacks && moveState && Number(moveState.stacks) > 0 && Number(moveState.expiresAt) > now) {
        let stacks = Math.floor(moveState.stacks);
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'killMoveStacks', value: stacks, maxValue: pStats.uniqueKillMoveStacks.movePerStack, expiresAt: moveState.expiresAt, badge: `${stacks}` }, now));
    }
}

function appendStealthLeechIcons(runtime, pStats, now, icons) {
    let stealth = pStats.uniqueDeflectStealth;
    if (stealth && Number(runtime.deps.game.shadowStealthExpiresAt) > now) {
        let detail = (0, runtime.deps._t)('이동 속도 +{move}%, 회피 +{evasionPct}%, 치명타 피해 +{critDmg}%', { move: Number(stealth.move || 20), evasionPct: Number(stealth.evasionPct || 20), critDmg: Number(stealth.critDmg || 20) });
        icons.push(renderUiNamedEffectIcon(runtime, { key: 'shadowStealth', name: '그림자 은신', detail, expiresAt: runtime.deps.game.shadowStealthExpiresAt }, now));
    }
    let leech = pStats.uniqueLeechEfficiencyOnKill;
    if (leech && Number(runtime.deps.game.uniqueLeechEfficiencyUntil) > now) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'leechEfficiency', value: leech.efficiencyPct, expiresAt: runtime.deps.game.uniqueLeechEfficiencyUntil }, now));
    }
}

function appendUniqueGuardIcon(runtime, pStats, now, icons) {
    let guard = runtime.deps.game.playerUniqueGuard;
    if (guard && Number(guard.amount) > 0 && Number(guard.expiresAt) > now) {
        let hpPct = Number((pStats.uniqueDragonVeinGuard || {}).hpPct || 8);
        let maximum = Math.max(Number(guard.amount) || 0, Math.floor(Number(pStats.maxHp || 0) * hpPct / 100));
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'playerUniqueGuard', value: guard.amount, maxValue: maximum, expiresAt: guard.expiresAt }, now));
    }
}

function appendStoneShieldIcon(runtime, now, icons) {
    let talentRuntime = runtime.deps.game.talentCardRuntime;
    if (talentRuntime && Number(talentRuntime.stoneShieldAmount) > 0 && Number(talentRuntime.stoneShieldExpiresAt) > now) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'stoneShield', value: talentRuntime.stoneShieldAmount, maxValue: talentRuntime.stoneShieldMax, expiresAt: talentRuntime.stoneShieldExpiresAt }, now));
    }
}
