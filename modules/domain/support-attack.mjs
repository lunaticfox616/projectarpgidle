// Native attack shaping. Inputs are immutable skill definitions; prepare owns the copied tags/effects.
export const REPEAT_GAP_MS = 280; // Hero repeats follow the final primary stage; summons use 180ms.
export const LEAPS = new Set([56,77]);
export const LANDS_ONCE = new Set([47,48,49,79,87]);
class SupportAttack {
    constructor(rules) { this.rules = rules; }
    resolve(skill, state) {
        const out = this.rules.prepare(skill, state), fx = out.supportEffects;
        out.dmg = (out.dmg ?? out.baseDmg ?? 1) * fx.damageMultiplier;
        out.spd = (out.spd ?? out.baseSpd ?? 1) * fx.speedMultiplier;
        out.pushAwayCells = Math.max(out.pushAwayCells || 0, fx.push || 0);
        out.supportExpansion = Number(Boolean(fx.expansion));
        if (fx.conversion?.pct === 100) out.ele = fx.conversion.element;
        this.reshapeSkill(out, fx);
        return out;
    }

    reshapeSkill(out, fx) {
        const transforms=['throwRange','mineDelayMs','channeling','spreadRadius','focus','slam'];
        if (transforms.some(key=>fx[key])) delete out.combatPattern;
        if (transforms.some(key=>fx[key])) delete out.nativeCastId;
        if (transforms.concat(['chain','pierce','projectiles','sweep','expansion']).some(key=>fx[key])) delete out.rangeText;
        out.targets=Math.max(1,out.targets || 1)+this.extraTargets(fx);
        if(fx.spreadRadius)out.targets=Math.max(9,out.targets);
        if(fx.focus)Object.assign(out,{targets:1,multiHit:1,targetMode:'single'});
        if(fx.slam) { out.aftershockDamagePct ??= 38; out.aftershockDelayMs ??= 420; }
    }

    extraTargets(fx) {
        return (fx.sweep?.extra || 0)+(fx.chain?.count || 0)+(fx.pierce || 0)+(fx.projectiles?.extra || 0);
    }

    grid(profile, skill) {
        const fx = skill?.supportEffects;
        if (!fx) return profile;
        const out = { ...profile };
        this.projectileGrid(out,fx,!!skill.combatPattern);
        if (fx.spreadRadius) Object.assign(out, {kind:'blast', radius:fx.spreadRadius+(skill.effectExpansion || 0)});
        if (fx.focus) Object.assign(out, {kind:'single', radius:0, band:0});
        return out;
    }

    projectileGrid(out,fx,authored) {
        if (['throwRange','sweep','pierce','chain','projectiles','aimedShots'].some(key=>fx[key])) delete out.band;
        if (fx.throwRange) Object.assign(out, {kind:'line', range:fx.throwRange, radius:0});
        if (fx.sweep) Object.assign(out, {kind:'cone', range:Math.max(1,out.range)});
        if (fx.pierce) Object.assign(out, {kind:'line', range:Math.max(4,out.range)});
        if (fx.chain && !authored) Object.assign(out, {kind:'chain', jump:3});
        if (fx.projectiles) Object.assign(out, {kind:'fan', rays:Math.min(8, (out.rays || 1) + fx.projectiles.extra), spreadDeg:55});
    }

    targetMultiplier(enemy, skill) {
        const fx = skill?.supportEffects?.execute;
        return fx ? (enemy.hp/Math.max(1,enemy.maxHp) <= fx.thresholdPct/100 ? 1+fx.damageMorePct/100 : fx.otherwiseMultiplier) : 1;
    }

    expectedMultiplier(skill) {
        const fx=skill.supportEffects;
        if(!fx)return 1;
        return (1+(fx.repeat?.damagePct || 0)/100)*(1+(fx.dot?.damagePct || 0)/100)*this.shotsMultiplier(skill,fx);
    }

    shotsMultiplier(skill,fx) {
        const extra=fx.projectiles?.extra || 0,id=skill.nativeCastId;
        if(id===44)return 1+(extra+(fx.chain?.count || 0))/4;
        return !extra || skill.projectilePattern?.kind==='fan' || LEAPS.has(id) ? 1 : 1+extra;
    }

    nativeDot(skill) { return (skill.supportBaseTags || skill.tags || []).includes('dot'); }

    splitConversion(conversion, stats, hitElement) {
        const fx=stats.sSkill?.supportEffects?.conversion;
        if (!fx || fx.pct >= 100 || hitElement !== fx.sourceElement) return conversion;
        const added={...conversion.added,[fx.element]:(conversion.added[fx.element] || 0)+fx.pct*conversion.mainPct};
        return {...conversion,mainPct:conversion.mainPct*(1-fx.pct/100),added};
    }

    playerProjectile(skill) { return skill.tags.includes('projectile') && !skill.tags.includes('summon'); }

    igniteDuration(stats,type,duration) { return duration+(type==='ignite' ? (stats.sSkill?.supportEffects?.ignite?.durationMs || 0)/1000 : 0); }

    lockState(state) {
        return {equippedSummonSkills:state.equippedSummonSkills || [],summonSkillCounts:state.summonSkillCounts || {},
            sealedSkills:state.sealedSkills || [],sealedSupports:state.sealedSupports || []};
    }
}
export function createSupportAttack(rules) {
    const service = new SupportAttack(rules);
    return Object.freeze(Object.fromEntries(['resolve','grid','targetMultiplier','expectedMultiplier','nativeDot','splitConversion','playerProjectile','igniteDuration','lockState'].map(name => [name, service[name].bind(service)])));
}
