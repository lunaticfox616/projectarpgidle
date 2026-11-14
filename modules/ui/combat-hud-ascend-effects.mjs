import { renderUiRuntimeEffectIcon } from './combat-hud-effect-icons.mjs';

export function buildPlayerAscendStackEffectIcons(runtime, now) {
    let icons = [];
    let owns = id => typeof runtime.deps.hasKeystone === 'function' && (0, runtime.deps.hasKeystone)(id);
    appendWarriorRhythmIcon(runtime, now, icons, owns);
    appendGladiatorStackIcons(runtime, now, icons, owns);
    appendElementalGuardStackIcons(runtime, now, icons, owns);
    return icons.join('');
}

export function buildPlayerAscendReadyEffectIcons(runtime, now) {
    let icons = [];
    let owns = id => typeof runtime.deps.hasKeystone === 'function' && (0, runtime.deps.hasKeystone)(id);
    appendSwiftReadyIcon(runtime, now, icons, owns);
    if (owns('a2') && runtime.deps.game.assassinBlurred) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'assassinBlurred' }, now));
    }
    if (owns('ct4') && runtime.deps.game.catalystEvadeBoostReady) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'catalystEvade' }, now));
    }
    if (owns('cr8') && Number(runtime.deps.game.crusaderLightningAegisUntil) > now) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'crusaderLightningAegis', expiresAt: runtime.deps.game.crusaderLightningAegisUntil }, now));
    }
    return icons.join('');
}

export function buildPlayerTalentAndSummonEffectIcons(runtime, now) {
    let icons = [];
    appendTalentChargeIcons(runtime, now, icons);
    if (Number(runtime.deps.game.bloomTrialRegenSuppress) > 0) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'bloomRegenSuppress', value: runtime.deps.game.bloomTrialRegenSuppress * 100 }, now));
    }
    appendBeeSwarmIcon(runtime, now, icons);
    appendSummonBuffIcons(runtime, now, icons);
    return icons.join('');
}


function appendElementalGuardStackIcons(runtime, now, icons, owns) {
    if (owns('e8') && Number(runtime.deps.game.elementalistOverloadStacks) > 0) {
        let stacks = Math.floor(runtime.deps.game.elementalistOverloadStacks);
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'elementalistOverload', value: stacks, badge: `${stacks}` }, now));
    }
    if (owns('gd6') && Number(runtime.deps.game.guardianEnduranceExpiresAt) > now) {
        let stacks = Math.min(5, Math.floor(runtime.deps.game.guardianEnduranceStacks || 0));
        if (stacks > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'guardianEndurance', value: stacks, expiresAt: runtime.deps.game.guardianEnduranceExpiresAt, badge: `${stacks}` }, now));
    }
}

function appendGladiatorStackIcons(runtime, now, icons, owns) {
    if (owns('g2') && Number(runtime.deps.game.gladiatorFlurryExpiresAt) > now) {
        let stacks = Math.min(12, Math.floor(runtime.deps.game.gladiatorFlurryStacks || 0));
        if (stacks > 0) icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'gladiatorFlurry', value: stacks, expiresAt: runtime.deps.game.gladiatorFlurryExpiresAt, badge: `${stacks}` }, now));
    }
    if (owns('g3') && Number(runtime.deps.game.gladiatorVeteranCritBonus) > 0) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'gladiatorVeteran', value: runtime.deps.game.gladiatorVeteranCritBonus, badge: `${Math.floor(runtime.deps.game.gladiatorVeteranCritBonus)}` }, now));
    }
}

function appendWarriorRhythmIcon(runtime, now, icons, owns) {
    if (owns('w2')) {
        let crit = Number(runtime.deps.game.warriorRhythmExpiresAt) > now ? Math.min(5, Math.floor(runtime.deps.game.warriorRhythmStacks || 0)) : 0;
        let chain = Number(runtime.deps.game.warriorRhythmDoubleExpiresAt) > now ? Math.min(5, Math.floor(runtime.deps.game.warriorRhythmDoubleStacks || 0)) : 0;
        if (crit + chain > 0) {
            let expiresAt = Math.max(Number(runtime.deps.game.warriorRhythmExpiresAt) || 0, Number(runtime.deps.game.warriorRhythmDoubleExpiresAt) || 0);
            icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'warriorRhythm', value: crit, maxValue: chain, expiresAt, badge: `${crit + chain}` }, now));
        }
    }
}


function appendSwiftReadyIcon(runtime, now, icons, owns) {
    if (owns('g5') && (runtime.deps.game.gladiatorSwiftOpeningReady || runtime.deps.game.gladiatorSwiftGuardReady)) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'gladiatorSwift', value: runtime.deps.game.gladiatorSwiftOpeningReady ? 1 : 0, maxValue: runtime.deps.game.gladiatorSwiftGuardReady ? 1 : 0 }, now));
    }
}


function appendSummonBuffIcons(runtime, now, icons) {
    if (Number(runtime.deps.game.summonDeathDamageBuffExpiresAt) > now && Number(runtime.deps.game.summonDeathDamageBuffPct) > 0) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'summonDeathDamageBuff', value: runtime.deps.game.summonDeathDamageBuffPct, expiresAt: runtime.deps.game.summonDeathDamageBuffExpiresAt }, now));
    }
    if (Number(runtime.deps.game.summonCritAspdExpiresAt) > now && Number(runtime.deps.game.summonCritAspdStacks) > 0) {
        let stacks = Math.floor(runtime.deps.game.summonCritAspdStacks);
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'summonCritAspd', value: stacks, maxValue: runtime.deps.game.summonCritAspdPerStack, expiresAt: runtime.deps.game.summonCritAspdExpiresAt, badge: `${stacks}` }, now));
    }
}

function appendBeeSwarmIcon(runtime, now, icons) {
    let bees = (Array.isArray(runtime.deps.game.queenBees) ? runtime.deps.game.queenBees : [])
        .filter(bee => bee && Number(bee.expiresAt) > now && Number(bee.attacksLeft) > 0);
    if (bees.length > 0) {
        let attacksLeft = bees.reduce((sum, bee) => sum + Math.floor(bee.attacksLeft), 0);
        let expiresAt = Math.max(...bees.map(bee => Number(bee.expiresAt) || 0));
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'queenBeeSwarm', value: bees.length, maxValue: attacksLeft, expiresAt, badge: `${bees.length}` }, now));
    }
}

function appendTalentChargeIcons(runtime, now, icons) {
    let talent = runtime.deps.game.talentRuntime && typeof runtime.deps.game.talentRuntime === 'object' ? runtime.deps.game.talentRuntime : {};
    let talentActive = id => typeof runtime.deps.isTalentCardActive !== 'function' || (0, runtime.deps.isTalentCardActive)(id);
    let fletcherCount = Math.max(0, Math.min(3, Math.floor(talent.fletcherCount || 0)));
    if (talentActive('hero1__gladiator') && fletcherCount > 0) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'fletcherCharge', value: fletcherCount, badge: `${fletcherCount}` }, now));
    }
    if (talentActive('hero2__gladiator') && talent.colosseumReady) {
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'colosseumReady' }, now));
    } else if (talentActive('hero2__gladiator') && Number(talent.colosseumKills) > 0) {
        let kills = Math.min(4, Math.floor(talent.colosseumKills));
        icons.push(renderUiRuntimeEffectIcon(runtime, { key: 'colosseumCharge', value: kills, badge: `${kills}` }, now));
    }
}
