import { clampNumber } from '../common/numbers.mjs';
import { queueContinuousSlashVfx } from './slash-vfx.mjs';
import { SKILL_EFFECT_IMAGES, vfxElement, projectileStyle, skillEffectFilter,
    skillEffectBaseSize, skillEffectFamily, skillEffectImage } from './skill-effect-look.mjs';

function effectScale(profile, viewportScale) {
    return Math.max(0.45, Number(profile.scale) || 1) * clampNumber(Number(viewportScale) || 1, 0.7, 1.16);
}

function repeatsFor(profile, density) {
    const repeats = Math.max(1, Math.min(3, Math.floor(Number(profile.repeats) || 1)));
    return density < 0.84 ? 1 : repeats;
}

function targetKey(target) {
    if (target && target.enemy && target.enemy.id != null) return `enemy:${target.enemy.id}`;
    return `cell:${Math.round(Number(target && target.x) || 0)}:${Math.round(Number(target && target.y) || 0)}`;
}

function reuseStormImpact(list, profile, fx, target, now) {
    const key = targetKey(target);
    const active = list.filter(effect => effect && effect.family === 'stormStrike'
        && effect.skillName === fx.skillName && now - effect.startAt <= effect.duration);
    let reusable = active.find(effect => effect.targetKey === key);
    const cap = Math.max(1, Math.floor(Number(profile.maxActiveImpacts) || 4));
    if (!reusable && active.length >= cap) {
        reusable = active.reduce((oldest, effect) => effect.startAt < oldest.startAt ? effect : oldest);
    }
    if (!reusable) return false;
    Object.assign(reusable, { targetKey: key, startAt: now, x: target.x, y: target.y - 5,
        seed: Math.max(1, Number(fx.id) || 1) });
    return true;
}

function hitSpark(fx, profile, target, now) {
    const element = vfxElement(fx.element, profile.accent);
    return { family: 'hitSpark', skillName: fx.skillName, imageKey: SKILL_EFFECT_IMAGES.burst,
        startAt: now, duration: 130, x: target.x, y: target.y, size: 24, alpha: 0.64,
        rotation: (Number(fx.id) || 0) * 0.7, seed: Number(fx.id) || 1,
        filter: skillEffectFilter(element, SKILL_EFFECT_IMAGES.burst) };
}

function hitOrigin(fx, scene, ghosts) {
    const source = scene.playerPos || { x: scene.enemyPos.x - 70, y: scene.enemyPos.y };
    if (String(fx.stageKind || 'primary') !== 'chainJump' || fx.chainFromEnemyId == null) return source;
    return (scene.enemyPosMap && scene.enemyPosMap[fx.chainFromEnemyId])
        || (ghosts && ghosts[fx.chainFromEnemyId]) || source;
}

function hitDuration(family, connector) {
    if (family === 'dot') return 720;
    if (family === 'whirlwind') return 260;
    return connector ? 170 : 300;
}

function hitAlpha(family, crowded) {
    if (family === 'dot') return 0.4;
    if (family === 'whirlwind') return 0.62;
    return crowded ? 0.58 : 0.82;
}

function hitGeometry(fx, layout, offset) {
    const { family, connector, source, target, seed } = layout;
    const baseRotation = Math.atan2(target.y - source.y, target.x - source.x);
    let rotation = connector ? baseRotation : baseRotation + Math.PI * 0.28 + offset * 0.16;
    if (family === 'whirlwind') rotation = (Number(fx.stageIndex) || 0) * (Math.PI / 4) + seed * 0.031;
    return {
        x: family === 'whirlwind' ? source.x : target.x + (connector ? 0 : offset * 5),
        y: family === 'whirlwind' ? source.y - 3 : target.y - (connector ? 8 : 5) + Math.abs(offset) * 2,
        fromX: source.x + (family === 'projectile' ? 15 : 0),
        fromY: source.y - (family === 'projectile' ? 18 : 7),
        toX: target.x, toY: target.y - 8, connector, rotation
    };
}

function hitEffect(fx, profile, layout, repeat) {
    const { family, stageKind, imageKey, now, crowded, scale, seed } = layout;
    const offset = repeat - (layout.repeats - 1) / 2;
    const element = vfxElement(fx.element, profile.accent);
    return {
        skillName: fx.skillName, vfxGroupId: fx.damageTextGroupId || '', repeatIndex: Number(fx.repeatIndex) || 0,
        element, family, footprint: fx.footprint, stageKind, imageKey, startAt: now + repeat * 44,
        duration: hitDuration(family, layout.connector), ...hitGeometry(fx, layout, offset),
        size: skillEffectBaseSize(family, stageKind) * scale * (1 - Math.abs(offset) * 0.08),
        alpha: hitAlpha(family, crowded), filter: skillEffectFilter(element, imageKey), seed: seed + repeat * 17,
        targetKey: family === 'stormStrike' ? targetKey(layout.target) : ''
    };
}

function projectileTargets(entries, positions, source, skill, density) {
    let targets = (entries || []).map(entry => {
        const id = entry && entry.enemy ? entry.enemy.id : null;
        return id == null ? null : positions[id];
    }).filter(Boolean);
    if (skill.targetMode === 'chain') return targets.slice(0, 1);
    if (skill.targetMode === 'pierce') {
        targets.sort((a, b) => Math.hypot(a.x - source.x, a.y - source.y) - Math.hypot(b.x - source.x, b.y - source.y));
        return targets.length > 0 ? [targets[targets.length - 1]] : [];
    }
    const cap = skill.projectilePattern && skill.projectilePattern.kind === 'fan' ? 8 : 4;
    return targets.slice(0, Math.max(2, Math.round(cap * density)));
}

function projectileTiming(fx, piercePath, entries) {
    const impactAt = Number(fx.impactAt) || (fx.start + fx.duration);
    const count = piercePath ? Math.max(1, Math.min(12, (entries || []).length)) : 1;
    return { arriveAt: impactAt + (piercePath ? (count - 1) * 30 : 0),
        releaseAt: Math.max(fx.start + 80, impactAt - 82) };
}

function projectileGeometry(source, target, lane) {
    return { fromX: source.x + 13, fromY: source.y - 20 + lane, toX: target.x, toY: target.y - 9 + lane,
        rotation: Math.atan2((target.y - 9 + lane) - (source.y - 20 + lane), target.x - (source.x + 13)) };
}

function projectileEffect(fx, profile, layout, target, index) {
    const { targetIndex, repeat } = index;
    const { imageKey, imageProjectile, arriveAt, piercePath } = layout;
    const startAt = Math.min(arriveAt - 58, layout.releaseAt + repeat * 20);
    const lane = (repeat - (layout.repeats - 1) / 2) * 4;
    const element = vfxElement(fx.element, profile.accent);
    return {
        skillName: fx.skillName, element, projectileStyle: projectileStyle(profile, fx.element),
        family: 'projectile', stageKind: 'projectileTravel', imageKey, imageProjectile,
        projectileWidth: Number(profile.projectileWidth) || 58, projectileHeight: Number(profile.projectileHeight) || 26,
        startAt, arriveAt, duration: Math.max(70, arriveAt - startAt),
        ...projectileGeometry(layout.source, target, lane), travel: true, piercePath, connector: false,
        size: skillEffectBaseSize('projectile', 'projectileTravel') * layout.scale * (1 - targetIndex * 0.035),
        alpha: imageProjectile ? 0.94 : (piercePath ? 0.78 : 0.72),
        filter: profile.projectileAsset ? 'none' : skillEffectFilter(element, imageKey),
        seed: Math.max(1, Number(fx.id) || 1) + targetIndex * 19 + repeat * 7
    };
}

/** Queues presentation records only; damage, targets and combat clocks still come from the domain. */
export class SkillEffectQueue {
    constructor(deps, timing) { this.deps = deps; this.timing = timing; }

    list() {
        const visual = this.deps.visual();
        return visual.skillEffects || (visual.skillEffects = []);
    }

    matchingTravel(skillName, now) {
        return (this.deps.visual().skillEffects || []).some(effect => effect && effect.travel
            && effect.skillName === skillName && Math.abs((Number(effect.arriveAt) || 0) - now) <= 150);
    }

    groupSize(fx, stageKind) {
        if (!fx || !fx.damageTextGroupId) return 0;
        return (this.deps.effects() || []).reduce((count, row) => count + (row && row.type === 'hit'
            && row.damageTextGroupId === fx.damageTextGroupId && row.skillName === fx.skillName
            && String(row.stageKind || 'primary') === stageKind ? 1 : 0), 0);
    }

    merge(list, fx, profile, target, now) {
        if (!fx.damageTextGroupId) return false;
        if (!['slash', 'slam', 'whirlwind', 'burst', 'dot', 'charge'].includes(profile.family)) return false;
        list.push(hitSpark(fx, this.deps.profile(fx.skillName), target, now));
        if (fx.stageKind === 'earthSpikes') return true;
        this.timing.trim(list);
        if (['burst', 'dot'].includes(profile.family) && this.deps.delivery(this.deps.skills[fx.skillName]) === 'magicCell') return true;
        return !!list.find(effect => effect.vfxGroupId === fx.damageTextGroupId && effect.skillName === fx.skillName
            && effect.repeatIndex === (Number(fx.repeatIndex) || 0) && effect.stageKind === String(fx.stageKind || 'primary'));
    }

    continuous(list, fx, scene) {
        queueContinuousSlashVfx(list, fx, {
            source: scene.playerPos || { x: scene.enemyPos.x - 70, y: scene.enemyPos.y }, target: scene.enemyPos
        }, { now: scene.now, scale: scene.viewportScale || 1 });
        this.timing.trim(list);
    }

    stageHit(fx, scene) {
        const { enemyPos, playerPos, enemyPosMap, now } = scene;
        if (this.deps.rules) this.deps.rules.hit(fx, enemyPosMap);
        if (!this.deps.tree.queueHit(fx, enemyPos, playerPos || enemyPos, now)) return false;
        this.timing.trim(this.deps.visual().skillEffects);
        return true;
    }

    hit(fx, scene) {
        if (!fx || fx.dot || !fx.skillName) return;
        if (this.stageHit(fx, scene)) return;
        const profile = this.deps.profile(fx.skillName);
        if (!profile) return;
        const stageKind = String(fx.stageKind || 'primary');
        if (profile.impactVfx === false || stageKind.startsWith('meteor')) return;
        this.profileHit(fx, scene, profile, stageKind);
    }

    profileHit(fx, scene, profile, stageKind) {
        const list = this.list();
        if (profile.family === 'continuousSlash') { this.continuous(list, fx, scene); return; }
        const crowded = this.groupSize(fx, stageKind) >= 5;
        const family = skillEffectFamily(profile, stageKind);
        if (profile.family === 'projectile' && stageKind !== 'chainJump' && this.matchingTravel(fx.skillName, scene.now)) return;
        if (this.merge(list, fx, profile, scene.enemyPos, scene.now)) return;
        const layout = this.hitLayout(fx, profile, scene, { family, stageKind, crowded });
        if (family === 'stormStrike' && reuseStormImpact(list, profile, fx, layout.target, scene.now)) return;
        for (let repeat = 0; repeat < layout.repeats; repeat++) list.push(hitEffect(fx, profile, layout, repeat));
        this.timing.trim(list);
    }

    hitLayout(fx, profile, scene, kind) {
        const { family, stageKind, crowded } = kind;
        const source = hitOrigin(fx, scene, this.deps.visual().enemyGhostPos);
        const target = scene.enemyPos || { x: source.x + 70, y: source.y };
        let scale = effectScale(profile, scene.viewportScale);
        if (target.enemy && target.enemy.isBoss) scale *= 1.08;
        if (crowded) scale *= 0.82;
        let repeats = repeatsFor(profile, this.timing.density());
        if (crowded || family === 'whirlwind' || ['chainJump', 'slamAftershock', 'slamPrimary'].includes(stageKind)) repeats = 1;
        return { ...kind, source, target, scale, repeats, now: scene.now, connector: stageKind === 'chainJump',
            imageKey: fx.skillName === '기본 공격' ? 'skillFxBasicSlash' : skillEffectImage(family, stageKind),
            seed: Math.max(1, Number(fx.id) || 1) };
    }

    launch(fx, scene) {
        if (!fx || fx.skillProjectileQueued || !fx.projectile || !fx.skillName) return;
        fx.skillProjectileQueued = true;
        const profile = this.deps.profile(fx.skillName);
        if (!profile || profile.family !== 'projectile') return;
        const skill = (this.deps.skills && this.deps.skills[fx.skillName]) || {};
        const density = this.timing.density();
        const targets = projectileTargets(scene.targetEntries, scene.enemyPosMap, scene.playerPos, skill, density);
        if (targets.length <= 0) return;
        this.launchTargets(fx, scene, profile, targets, { skill, density });
    }

    launchTargets(fx, scene, profile, targets, settings) {
        const piercePath = settings.skill.targetMode === 'pierce';
        const layout = { ...projectileTiming(fx, piercePath, scene.targetEntries), piercePath, source: scene.playerPos,
            imageKey: SKILL_EFFECT_IMAGES[profile.projectileAsset] || SKILL_EFFECT_IMAGES.projectile,
            imageProjectile: !profile.projectileStyle, scale: effectScale(profile, scene.viewportScale),
            repeats: repeatsFor(profile, settings.density) };
        const list = this.list();
        targets.forEach((target, targetIndex) => {
            for (let repeat = 0; repeat < layout.repeats; repeat++) {
                list.push(projectileEffect(fx, profile, layout, target, { targetIndex, repeat }));
            }
        });
        this.timing.trim(list);
    }
}
