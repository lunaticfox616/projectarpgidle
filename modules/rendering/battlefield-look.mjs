export function battleZoneTheme(zone) {
    let theme = {
        skyTop: '#17324c',
        skyBottom: '#0c1b28',
        floorA: '#245a3b',
        floorB: '#2d6b48',
        pathA: '#355d46',
        pathB: '#3f6c54',
        propA: '#7cb86f',
        propB: '#4e8f52',
        accent: '#d7f0a1',
        ruin: '#6f876b',
        water: '#183b57',
        mist: 'rgba(173,223,255,0.08)'
    };
    if (zone.ele === 'fire') {
        theme = { skyTop: '#4a2419', skyBottom: '#1d1010', floorA: '#5e3224', floorB: '#70392a', pathA: '#744436', pathB: '#8a5540', propA: '#f59e55', propB: '#9b3f2d', accent: '#ffcf72', ruin: '#7f5a47', water: '#4b170f', mist: 'rgba(255,149,91,0.08)' };
    } else if (zone.ele === 'cold') {
        theme = { skyTop: '#18354d', skyBottom: '#0f1828', floorA: '#506b86', floorB: '#64839c', pathA: '#7897ae', pathB: '#88a7bc', propA: '#d7f7ff', propB: '#9cd7ea', accent: '#effcff', ruin: '#8d9eb1', water: '#244c6b', mist: 'rgba(219,250,255,0.12)' };
    } else if (zone.ele === 'light') {
        theme = { skyTop: '#25344f', skyBottom: '#121626', floorA: '#61613e', floorB: '#706d46', pathA: '#7f7a4b', pathB: '#978f57', propA: '#ffe27d', propB: '#d7bf58', accent: '#fff4a8', ruin: '#918764', water: '#3a4465', mist: 'rgba(255,235,158,0.09)' };
    } else if (zone.ele === 'chaos') {
        theme = { skyTop: '#25173b', skyBottom: '#0f0a1a', floorA: '#35244d', floorB: '#473065', pathA: '#563776', pathB: '#654589', propA: '#b98cff', propB: '#7b59be', accent: '#f2d1ff', ruin: '#6d5b84', water: '#271f3a', mist: 'rgba(193,140,255,0.08)' };
    }
    if (zone.type === 'trial') {
        theme.pathA = '#7f6840';
        theme.pathB = '#9f8251';
        theme.accent = '#ffe2a4';
        theme.ruin = '#9a7d54';
    } else if (zone.type === 'abyss') {
        theme.skyTop = '#111421';
        theme.skyBottom = '#07080d';
        theme.floorA = '#1c2431';
        theme.floorB = '#252f3d';
        theme.pathA = '#30394a';
        theme.pathB = '#3b4660';
        theme.mist = 'rgba(126,162,255,0.07)';
    } else if (zone.type === 'meteor') {
        theme.skyTop = '#1a1026';
        theme.skyBottom = '#07050c';
        theme.floorA = '#241736';
        theme.floorB = '#332248';
        theme.pathA = '#4a2f68';
        theme.pathB = '#5c3a78';
        theme.mist = 'rgba(189,120,255,0.1)';
    }
    return theme;
}

function hasElement(tags, ele, elements) { return elements.some(value => tags.includes(value) || ele === value); }

function skillPalette(tags, ele) {
    let group = 'physical';
    let primary = '#d7dde6';
    let secondary = '#ffffff';
    let aura = null;
    if (hasElement(tags, ele, ['chaos'])) {
        group = 'chaos';
        primary = '#ba83ff';
        secondary = '#f2ddff';
        aura = 'rgba(176,118,255,0.16)';
    } else if (hasElement(tags, ele, ['cold'])) {
        group = 'cold';
        primary = '#8de7ff';
        secondary = '#eefbff';
        aura = 'rgba(133,235,255,0.14)';
    } else if (hasElement(tags, ele, ['lightning', 'light'])) {
        group = 'lightning';
        primary = '#ffd84f';
        secondary = '#fff7cc';
        aura = 'rgba(255,216,79,0.14)';
    } else if (hasElement(tags, ele, ['fire'])) {
        group = 'fire';
        primary = '#ff8a4a';
        secondary = '#ffe3b0';
        aura = 'rgba(255,126,74,0.14)';
    } else if (tags.includes('physical') && tags.includes('slam')) {
        group = 'physical_slam';
        primary = '#c7a27b';
        secondary = '#f3e1cf';
    }
    return { group, primary, secondary, aura };
}

function hasTarget(tags, target, name) { return tags.includes(name) || target === name; }
function corpseSkill(tags, name) { return tags.includes('corpse') || tags.includes('corpse_explosion') || name.includes('시체'); }
function areaSkill(tags, target) { return tags.includes('aoe') || target === 'all' || target === 'whirl'; }

function skillVariant(skillName, tags, targetMode) {
    const normalizedName = String(skillName || '').toLowerCase();
    let variant = 'melee';
    if (corpseSkill(tags, normalizedName)) variant = 'corpse_burst';
    else if (tags.includes('slam')) variant = 'slam';
    else if (hasTarget(tags, targetMode, 'chain')) variant = 'chain';
    else if (hasTarget(tags, targetMode, 'pierce')) variant = 'pierce';
    else if (hasTarget(tags, targetMode, 'summon')) variant = 'summon';
    else if (tags.includes('dot')) variant = 'dot';
    else if (areaSkill(tags, targetMode)) variant = 'nova';
    else if (hasTarget(tags, targetMode, 'projectile')) variant = 'projectile';
    return variant;
}

class SkillVisualCache {
    constructor(skills) { this.skills = skills; this.cache = { key: '', value: null }; }
    getBattleSkillVisual(skillName, skillData) {
        skillData = skillData || this.skills()[skillName] || this.skills()['기본 공격'];
        let rawTags = Array.isArray(skillData.tags) ? skillData.tags : [];
        let ele = String(skillData.ele || '').toLowerCase();
        let targetMode = String(skillData.targetMode || '').toLowerCase();
        let cacheKey = `${skillName || ''}|${ele}|${targetMode}|${rawTags.join('/')}`;
        if (this.cache.key === cacheKey && this.cache.value) return this.cache.value;
        let tags = rawTags.map(tag => String(tag).toLowerCase());
        const { group, primary, secondary, aura } = skillPalette(tags, ele);
        const variant = skillVariant(skillName, tags, targetMode);
        let visual = {
            pose: tags.includes('projectile') ? 'bow' : 'sword',
            group: group,
            effect: group,
            primary: primary,
            secondary: secondary,
            aura: aura,
            isSlam: variant === 'slam',
            variant: variant,
            targetMode: targetMode,
            tags: tags
        };
        this.cache = { key: cacheKey, value: visual };
        return visual;
    }
}

export function createSkillVisualCache(skills) {
    const owner = new SkillVisualCache(skills);
    return Object.freeze({ get: owner.getBattleSkillVisual.bind(owner), dispose: () => { owner.cache = { key: '', value: null }; } });
}

export function paintCriticalHit(ctx, fx, t, enemyPosMap) {
    // The elemental impact body/particles are owned by the attack-fx engine
    // (js/canvas-attack-fx.js), spawned once per hit. This keeps only the
    // generic critical-hit flourish layered above that effect.
    let enemyEntry = enemyPosMap[fx.enemyId];
    if (!enemyEntry || fx.dot || !fx.crit) return;
    let tx = enemyEntry.x;
    let ty = enemyEntry.y - 6;
    ctx.save();
    {
        ctx.globalAlpha = (1 - t) * 0.75;
        ctx.strokeStyle = '#fff4a8';
        ctx.lineWidth = 2.2;
        for (let i = 0; i < 4; i++) {
            let angle = (Math.PI * 2 * i) / 4 + t * 0.35;
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.lineTo(tx + Math.cos(angle) * (10 + t * 20), ty + Math.sin(angle) * (10 + t * 20));
            ctx.stroke();
        }
    }
    ctx.restore();
}
