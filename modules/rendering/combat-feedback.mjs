import { clampNumber } from '../common/numbers.mjs';

/** Render-local cache and read-only scene ports; no combat rules or saved state. */
class CombatFeedbackRenderer {
    constructor(deps) {
        this.deps = deps;
        this.active = true;
        for (const name of ["advanceClock","begin","observe","hitSound","weaponSound","areaSound","physicalSound","fireSound","coldSound","lightSound","chaosSound","skillSound","dotCastSound","eventSound","deathNotice","contactStyle","contact","chips","death","object","screen"]) this[name] = this[name].bind(this);
        this.epoch = -1;
        this.sceneState = null;
        this.lastNow = 0;
        this.notice = null;
        this.contacts = 0;
        this.fragments = 0;
        this.reduced = () => this.deps.reducedEffects();
        this.elementSounds = {fire: this.fireSound, cold: this.coldSound, light: this.lightSound, chaos: this.chaosSound};
        this.flaskGlass = name => this.deps.SKILL_RUNE_FAMILY[name] === 'flask' && name !== '빈 플라스크';
        this.eventCues = {
        hit: this.hitSound,
        bellToll: () => this.deps.playUiFeedbackSound('bellToll'),
        playerSwing: this.dotCastSound,
        playerHit: fx => { if (fx.damage > 0 && !fx.deflected) this.deps.playUiFeedbackSound('playerHurt'); },
        enemySpawn: fx => { if (fx.boss) this.deps.playUiFeedbackSound('bossEntrance'); },
        objectReward: fx => this.deps.playUiFeedbackSound(({pot:'potBreak',crate:'woodBreak'})[fx.objectKind] || 'chestOpen'),
        levelUp: () => this.deps.playUiFeedbackSound('levelUp'),
        lootBurst: () => this.deps.playUiFeedbackSound('lootBurst'),
        fishCatch: fx => { if (!fx.background) this.deps.playUiFeedbackSound('fishCatch'); },
        bossEntrance: () => this.deps.playUiFeedbackSound('bossEntrance'),
        observerCollapse: () => this.deps.playUiFeedbackSound('riftOpen'),
        playerReturnDepart: () => this.deps.playUiFeedbackSound('returnWarp')
    };
        this.onObject = event => this.objectReward(event.detail);
        this.onAlert = event => this.explorationAlert(event.detail);
        deps.events.addEventListener('project-idle:exploration-object', this.onObject);
        deps.events.addEventListener('project-idle:exploration-alert', this.onAlert);
    }

    /** Resume on the same timebase addBattleFx uses after a >250ms render gap.
         * Only the presentation clock changes; combat/rewards continue on combatTimeMs. */
    advanceClock(wallNow, cinematic = false) {
        const state = this.deps.battleVisualState, elapsed = wallNow - state.lastWallNow;
        const rawDeltaMs = state.lastWallNow > 0 ? clampNumber(elapsed, 0, 50) : 16;
        const continuous = Number.isFinite(state.visualNow) && state.visualNow > 0 && elapsed < 250;
        if (!continuous) { state.visualNow = wallNow; state.hitStopRemainingMs = 0; }
        state.lastWallNow = wallNow;
        if (cinematic) return { now: state.visualNow, rawDeltaMs, deltaMs: 0 };
        const remaining = Math.max(0, Number(state.hitStopRemainingMs) || 0);
        const frozen = Math.min(rawDeltaMs, remaining);
        state.hitStopRemainingMs = Math.max(0, remaining - frozen);
        const deltaMs = rawDeltaMs - frozen;
        state.visualNow += deltaMs;
        return { now: state.visualNow, rawDeltaMs, deltaMs };
    }

    begin(now) {
        if (this.sceneState !== this.deps.battleVisualState || this.epoch !== this.deps.battleVisualState.lootEpoch || now < this.lastNow) {
            this.sceneState = this.deps.battleVisualState;
            this.epoch = this.deps.battleVisualState.lootEpoch;
            this.notice = null;
        }
        this.lastNow = now; this.contacts = 0; this.fragments = 0;
        if (this.notice && now >= this.notice.start + this.notice.duration) this.notice = null;
    }

    /** Called only when the shared renderer consumes an unprocessed event. */
    observe(fx, now) {
        if (!this.active || now - fx.start > 500 || this.deps.background() || this.deps.hidden()) return;
        this.deps.stageSkillRules.repeat(fx, now); // 이중 발동, 이중 시전의 두 번째 발동 연출(js/canvas-stage-skill-rules.js)
        this.eventSound(fx);
        if (fx.type === 'enemyDeath') this.deathNotice(fx, now);
    }

    hitSound(fx) {
        if (fx.dot || !(fx.damage > 0)) return;
        if (this.deps.SKILL_DB[fx.skillName]?.nativeCastId === 89) return; // 종은 맞은 적마다 울리지 않고 울림 판정마다 한 번만 난다.
        this.deps.playUiFeedbackSound(this.skillSound(fx));
    }

    weaponSound(fx, tags) {
        if (tags.includes('potion')) return 'hitFlask';
        if (tags.includes('shield')) return 'hitShield';
        if (tags.includes('dagger') || fx.skillName === '기습 공격') return 'hitThrust';
        if (fx.projectile || tags.includes('projectile')) return 'hitProjectile';
        return null;
    }

    areaSound(fx, skill, tags) {
        if (fx.slam || tags.includes('slam')) return 'hitSlam';
        if (skill.targetMode === 'whirl' || tags.includes('channeling')) return 'hitWhirl';
        if (tags.includes('aoe')) return 'hitSlam';
        return null;
    }

    physicalSound(fx, skill, tags) {
        const weapon = this.weaponSound(fx, tags), area = this.areaSound(fx, skill, tags);
        if (weapon) return weapon;
        if (area) return area;
        if (skill.targetMode === 'cleave') return 'hitSlash';
        if (this.deps.getEquippedWeaponStance() === 'unarmed') return 'hitUnarmed'; // 맨손 주먹 소리(2026-11-04 사용자 소리)
        return fx.crit || fx.impactTier === 'heavy' ? 'hitCritical' : 'hitPhysical';
    }

    fireSound(fx, skill, tags) {
        if (tags.includes('channeling') || tags.includes('dot') || tags.includes('debuff') || skill.nativeCastId === 55) return 'hitFireBreath';
        if (tags.includes('melee') && !tags.includes('slam') && !fx.slam) return 'hitFireBlade';
        return 'hitFireBurst';
    }

    coldSound(fx, skill, tags) {
        if (tags.includes('potion')) return 'hitColdBurst';
        if (fx.projectile || fx.pierce || tags.includes('projectile') || tags.includes('summon') || skill.targetMode === 'pierce') return 'hitColdPierce';
        return 'hitColdBurst';
    }

    lightSound(fx, skill, tags) {
        if (tags.includes('channeling')) return 'hitLightBeam';
        if (tags.includes('aoe') || tags.includes('potion') || fx.slam || skill.targetMode === 'cleave') return 'hitLightBurst';
        return 'hitLightArc';
    }

    chaosSound(fx, skill, tags) {
        if (tags.includes('potion') || (fx.skillName || '').includes('독')) return 'hitVenom';
        return tags.includes('melee') ? 'hitChaosCut' : 'hitChaosPulse';
    }

    skillSound(fx) {
        if (this.flaskGlass(fx.skillName)) return 'hitFlaskGlass';
        const skill = this.deps.SKILL_DB[fx.skillName] || {}, tags = skill.tags || [];
        // Cast-time element wins: staged/prismatic skills may differ from their base definition.
        const element = fx.element || skill.ele || 'phys';
        return (this.elementSounds[element] || this.physicalSound)(fx, skill, tags);
    }

    dotCastSound(fx) {
        if (this.deps.SKILL_DB[fx.skillName]?.tags?.includes('dot')) this.deps.playUiFeedbackSound(this.skillSound(fx));
    }

    eventSound(fx) {
        this.eventCues[fx.type]?.(fx);
    }

    deathNotice(fx, now) {
        if (!fx.boss) return;
        this.notice = { text: this.deps._t('보스 처치'), detail: this.deps.stripDecorativeEmoji(fx.name || ''), start: now, duration: 1850 };
    }

    contactStyle(fx) {
        const heavy = ['heavy','annihilate'].includes(fx.impactTier);
        const mild = this.deps.hitEmphasis() === 'mild' || this.reduced();
        const length = heavy ? 14 : fx.crit ? 11 : 7;
        return { length: length * (mild ? .6 : 1), alpha: mild ? .55 : .9,
            count: mild ? 2 : 3 + Number(Boolean(heavy || fx.crit)), color: fx.crit ? '#ffe49b' : '#f6ebd0' };
    }

    /** Tight, directional pixel marks, drawn after native skill art too. */
    contact(ctx, fx, age, positions) {
        if (fx.dot || !(fx.damage > 0) || age < 0 || age > 150 || this.contacts >= 8) return;
        const target = positions.enemies[fx.enemyId];
        if (!target) return;
        this.contacts++;
        const t = age / 150, style = this.contactStyle(fx), length = style.length;
        const direction = Math.atan2(target.y - positions.player.y, target.x - positions.player.x);
        ctx.save();
        ctx.translate(Math.round(target.x), Math.round(target.y - 18));
        ctx.globalAlpha = (1 - t) * style.alpha;
        ctx.fillStyle = style.color;
        const count = style.count;
        for (let i = 0; i < count; i++) {
            const angle = direction + (i - (count - 1) / 2) * .95;
            const spread = this.reduced() ? 3 : 3 + t * length;
            const x = Math.round(Math.cos(angle) * spread), y = Math.round(Math.sin(angle) * spread);
            ctx.fillRect(x, y, 2 + Math.round(Math.abs(Math.cos(angle)) * length * (1 - t)), 2);
        }
        ctx.restore();
    }

    /** Ballistic chips, at most 10 bundles/frame, replacing circular death rays. */
    chips(ctx, point, t, spec) {
        if (this.reduced() || this.fragments >= 10 || t <= 0 || t >= 1) return;
        this.fragments++;
        ctx.save();
        const count = spec.large ? 10 : 6, spread = count * 4;
        for (let i = 0; i < count; i++) {
            const angle = spec.seed * .71 + i * 2.399;
            const x = point.x + Math.cos(angle) * spread * t;
            const y = point.y - 5 - Math.sin(t * Math.PI) * (12 + i % 3 * 7) + Math.sin(angle) * spread * t * .35;
            ctx.globalAlpha = (1 - t) * .85;
            ctx.fillStyle = i % 3 ? spec.color : spec.light;
            ctx.fillRect(Math.round(x), Math.round(y), spec.wood ? 5 : 3, spec.wood ? 2 : 3);
        }
        ctx.restore();
    }

    death(ctx, fx, t, point) {
        this.chips(ctx, { x: point.x, y: point.y - 12 }, t, {
            large: fx.boss || fx.elite, seed: Number(fx.enemyId) || 1,
            color: fx.boss ? '#c99b57' : fx.color || '#b2aaa0', light: '#e8d9b2'
        });
    }

    object(ctx, fx, t, projection) {
        const point = projection.cellToScreen(fx.cell.gx, fx.cell.gy);
        point.y += projection.actorGroundOffsetY || 0;
        const prop = fx.objectKind === 'pot' || fx.objectKind === 'crate';
        this.chips(ctx, point, t, { large: !prop, seed: fx.cell.gx * 13 + fx.cell.gy,
            wood: fx.objectKind === 'crate', color: prop ? '#b08c72' : '#d6af58', light: prop ? '#ddc4a1' : '#fff0b3' });
        if (prop) return;
        // A short, crisp fan from the open lid; never an opaque pillar over the hero.
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t * 1.6) * .7;
        ctx.fillStyle = fx.grade === 'gold' ? '#ffe0a0' : '#d8bf83';
        const rise = this.reduced() ? 8 : 8 + Math.sin(t * Math.PI) * 22;
        for (let i = -1; i <= 1; i++) ctx.fillRect(Math.round(point.x + i * 7), Math.round(point.y - 14 - rise), 2, rise);
        ctx.restore();
    }

    screen(ctx, area) {
        if (!this.notice) return;
        const t = (area.now - this.notice.start) / this.notice.duration;
        const alpha = Math.min(1, t * 10, (1 - t) * 5);
        const x = Math.round(area.width / 2), y = Math.round(area.height * .19);
        const width = Math.min(area.width - 32, 300);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = 'rgba(12,13,16,.86)';
        ctx.fillRect(x - width / 2, y - 21, width, 60);
        ctx.fillStyle = '#a88b51';
        ctx.fillRect(x - width / 2, y - 21, width, 1);
        ctx.fillRect(x - 20, y + 38, 40, 1);
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        // 갈무리의 제 크기(제목 24px, 설명은 갈무리14 15px)와 정수 화소: 22px, 14px은 도트가 번졌다(2026-10-21).
        ctx.font = `24px ${this.deps.battlePixelFont()}`;
        ctx.fillStyle = '#f1d69b'; this.deps.drawCrispCanvasText(ctx, this.deps._t(this.notice.text), x, y + 2);
        if (this.notice.detail) {
            ctx.font = `15px 'Galmuri14', ${this.deps.battlePixelFont()}`;
            ctx.fillStyle = '#d6ccbc';
            if (ctx.measureText(this.notice.detail).width <= width - 20) this.deps.drawCrispCanvasText(ctx, this.notice.detail, x, y + 24);
            else ctx.fillText(this.notice.detail, x, y + 24, width - 20);
        }
        ctx.restore();
    }

    objectReward(detail) {
        if (!this.active || detail.kind !== 'reward' || !detail.cell || this.deps.background()) return;
        this.deps.addBattleFx('objectReward', { cell: detail.cell, objectKind: detail.objectKind, grade: detail.grade, duration: 460 });
    }

    explorationAlert(detail) {
        const ids = detail && detail.enemyIds;
        if (!this.active || !ids || !ids.length || this.deps.background()) return;
        const rule = this.deps.ACT_EXPLORATION_ALERT;
        for (const enemyId of ids) this.deps.addBattleFx('statusText', { enemyId, text: '!', color: rule.outline, duration: rule.markMs });
    }

    dispose() {
        this.active = false;
        this.deps.events.removeEventListener('project-idle:exploration-object', this.onObject);
        this.deps.events.removeEventListener('project-idle:exploration-alert', this.onAlert);
        this.notice = this.sceneState = null;
    }

    api() { return { begin: this.begin, observe: this.observe, contact: this.contact, death: this.death, object: this.object, screen: this.screen, reduced: this.reduced, advanceClock: this.advanceClock, skillSound: this.skillSound, dispose: () => this.dispose() }; }
}

export function createCombatFeedbackRenderer(deps) {
    return new CombatFeedbackRenderer(deps).api();
}
