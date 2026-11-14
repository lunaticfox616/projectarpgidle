export const SKILL_EFFECT_IMAGES = /* @__PURE__ */ Object.freeze({
    whirlwind: 'skillFxWhirlwind', chainPrimary: 'skillFxChainPrimary', chain: 'skillFxChainPrimary', chainJump: 'skillFxChainJump',
    slamPrimary: 'skillFxSlamPrimary', slamAftershock: 'skillFxSlamAftershock', meteorProjectile: 'skillFxMeteorProjectile',
    meteorImpact: 'skillFxMeteorImpact', meteorGround: 'skillFxMeteorGround', slash: 'skillFxContinuousSlash',
    basicSlash: 'skillFxBasicSlash', continuousSlash: 'skillFxDoubleSlash', slam: 'skillFxSlamPrimary', projectile: 'skillFxProjectile',
    venomFang: 'skillFxVenomFang', frostField: 'skillFxFrostField', blizzardAmbient: 'skillFxBlizzardAmbient',
    blizzardImpact: 'skillFxBlizzardImpact', frostWave: 'skillFxFrostWave', chaosBoomerang: 'skillFxChaosBoomerang',
    frostBurst: 'skillFxFrostBurst', frostWaveRing: 'skillFxFrostWaveRing', burst: 'skillFxImpactFlare',
    radialWave: 'skillFxRadialWave', rune: 'skillFxBurst', dot: 'skillFxDotField', summon: 'skillFxSummonStrike'
});

export function vfxElement(element, accent) {
    if (accent === 'blood') return 'blood';
    const key = String(element || 'phys').toLowerCase();
    if (key === 'lightning') return 'light';
    if (key === 'physical') return 'phys';
    return ['phys', 'fire', 'cold', 'light', 'chaos', 'blood'].includes(key) ? key : 'phys';
}

export function projectileStyle(profile, element) {
    if (profile && profile.projectileStyle) return profile.projectileStyle;
    return vfxElement(element, profile && profile.accent);
}

export function skillEffectFilter(element, imageKey) {
    const key = vfxElement(element);
    if (imageKey === 'skillFxChainPrimary' || imageKey === 'skillFxChainJump') {
        if (key === 'light') return 'none';
        if (key === 'chaos') return 'hue-rotate(78deg) saturate(1.35) brightness(0.94)';
    }
    return ({
        fire: 'sepia(0.65) saturate(3.2) hue-rotate(338deg) brightness(1.12)',
        cold: 'sepia(0.65) saturate(2.8) hue-rotate(155deg) brightness(1.18)',
        light: 'sepia(0.55) saturate(2.8) hue-rotate(172deg) brightness(1.2)',
        chaos: 'sepia(0.7) saturate(3.4) hue-rotate(232deg) brightness(1.08)',
        blood: 'sepia(0.8) saturate(4) hue-rotate(315deg) brightness(0.96)'
    })[key] || 'none';
}

/** Slash sprites clear the filter in their own painter. */
export function drawnEffectFilter(effect) {
    return effect.family === 'continuousSlash' || effect.skillName === '기본 공격' ? 'none' : effect.filter;
}

export function skillEffectBaseSize(family, stage) {
    if (stage === 'slamAftershock') return 132;
    if (stage === 'slamPrimary') return 104;
    if (stage === 'chainPrimary') return 82;
    if (family === 'whirlwind') return 118;
    if (family === 'projectile' || stage === 'chainJump') return 44;
    if (family === 'dot') return 116;
    if (family === 'burst') return 94;
    if (family === 'summon') return 78;
    return 82;
}

export function skillEffectFamily(profile, stage) {
    const family = (profile && profile.family) || 'slash';
    if (stage === 'chainPrimary' && profile && profile.primaryFamily) return profile.primaryFamily;
    if (stage === 'chainJump') return 'chain';
    return family;
}

export function skillEffectImage(family, stage) {
    if (stage === 'chainJump') return SKILL_EFFECT_IMAGES.chainJump;
    if (stage === 'slamPrimary') return SKILL_EFFECT_IMAGES.slamPrimary;
    if (stage === 'slamAftershock') return SKILL_EFFECT_IMAGES.slamAftershock;
    if (family === 'chain' && stage === 'chainPrimary') return SKILL_EFFECT_IMAGES.chainPrimary;
    if (family === 'projectile') return SKILL_EFFECT_IMAGES.burst;
    return SKILL_EFFECT_IMAGES[family] || null;
}

function patternImage(pattern, element) {
    if (pattern === 'mine') return SKILL_EFFECT_IMAGES.rune;
    if (pattern === 'field') return !element || element === 'cold' ? SKILL_EFFECT_IMAGES.frostField : SKILL_EFFECT_IMAGES.dot;
    if (pattern === 'moving') return !element || element === 'cold' ? SKILL_EFFECT_IMAGES.frostWave : SKILL_EFFECT_IMAGES.projectile;
    if (pattern === 'boomerang') return SKILL_EFFECT_IMAGES.chaosBoomerang;
    return null;
}

export function combatTravelImage(fx, profile) {
    const element = fx.element ? vfxElement(fx.element) : null;
    const config = profile || {};
    const asset = SKILL_EFFECT_IMAGES[config.projectileAsset] || SKILL_EFFECT_IMAGES[config.combatAsset];
    if (asset) return asset;
    const pattern = patternImage(fx.patternKind, element);
    if (pattern) return pattern;
    if (fx.owner === 'enemy' && fx.delivery === 'magicCell') return 'bossTelegraphPulse';
    if (fx.delivery !== 'magicCell') return SKILL_EFFECT_IMAGES.projectile;
    return SKILL_EFFECT_IMAGES[config.family] || SKILL_EFFECT_IMAGES.burst;
}

export function specializedTravelImage(key) {
    return [SKILL_EFFECT_IMAGES.frostField, SKILL_EFFECT_IMAGES.frostWave,
        SKILL_EFFECT_IMAGES.chaosBoomerang, SKILL_EFFECT_IMAGES.venomFang].includes(key);
}
