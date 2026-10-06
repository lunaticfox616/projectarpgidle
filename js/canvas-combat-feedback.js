/* Transient contact/reward presentation. No gameplay state, timers or random draws.
 * Lives on the existing canvas FX owner; battleFx remains the sole event queue. */
worldTreeSkillFx.feedback = (() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let epoch = -1, sceneState = null, lastNow = 0, notice = null, kills = [], nextPackAt = 0;
    let contacts = 0, fragments = 0;
    const reduced = () => motion.matches;

    /** Resume on the same timebase addBattleFx uses after a >250ms render gap.
     * Only the presentation clock changes; combat/rewards continue on combatTimeMs. */
    function advanceClock(wallNow) {
        const state = battleVisualState, elapsed = wallNow - state.lastWallNow;
        const rawDeltaMs = state.lastWallNow > 0 ? clampNumber(elapsed, 0, 50) : 16;
        const continuous = Number.isFinite(state.visualNow) && state.visualNow > 0 && elapsed < 250;
        if (!continuous) { state.visualNow = wallNow; state.hitStopRemainingMs = 0; }
        state.lastWallNow = wallNow;
        const remaining = Math.max(0, Number(state.hitStopRemainingMs) || 0);
        const frozen = Math.min(rawDeltaMs, remaining);
        state.hitStopRemainingMs = Math.max(0, remaining - frozen);
        const deltaMs = rawDeltaMs - frozen;
        state.visualNow += deltaMs;
        return { now: state.visualNow, rawDeltaMs, deltaMs };
    }

    function begin(now) {
        if (sceneState !== battleVisualState || epoch !== battleVisualState.lootEpoch || now < lastNow) {
            sceneState = battleVisualState;
            epoch = battleVisualState.lootEpoch;
            notice = null; kills = []; nextPackAt = 0;
        }
        lastNow = now; contacts = 0; fragments = 0;
        kills = kills.filter(row => now - row.start <= 450);
        if (notice && now >= notice.start + notice.duration) notice = null;
    }

    /** Called only when the shared renderer consumes an unprocessed event. */
    function observe(fx, now) {
        if (now - fx.start > 500 || game.isBackgroundCalculation || document.hidden) return;
        eventSound(fx);
        if (fx.type === 'enemyDeath') deathNotice(fx, now);
    }

    function hitSound(fx) {
        if (fx.dot || !(fx.damage > 0)) return;
        playUiFeedbackSound(skillSound(fx));
    }

    function weaponSound(fx, tags) {
        if (tags.includes('potion')) return 'hitFlask';
        if (tags.includes('shield')) return 'hitShield';
        if (tags.includes('dagger') || fx.skillName === '암살자의 일격') return 'hitThrust';
        if (fx.projectile || tags.includes('projectile')) return 'hitProjectile';
        return null;
    }

    function areaSound(fx, skill, tags) {
        if (fx.slam || tags.includes('slam') || skill.nativeCastId === 57) return 'hitSlam';
        if (skill.targetMode === 'whirl' || tags.includes('channeling')) return 'hitWhirl';
        if (tags.includes('aoe')) return 'hitSlam';
        return null;
    }

    function physicalSound(fx, skill, tags) {
        const weapon = weaponSound(fx, tags), area = areaSound(fx, skill, tags);
        if (weapon) return weapon;
        if (area) return area;
        if (skill.targetMode === 'cleave') return 'hitSlash';
        return fx.crit || fx.impactTier === 'heavy' ? 'hitCritical' : 'hitPhysical';
    }

    function fireSound(fx, skill, tags) {
        if (tags.includes('channeling') || tags.includes('dot') || tags.includes('debuff') || skill.nativeCastId === 55) return 'hitFireBreath';
        if (tags.includes('melee') && !tags.includes('slam') && !fx.slam) return 'hitFireBlade';
        return 'hitFireBurst';
    }

    function coldSound(fx, skill, tags) {
        if (tags.includes('potion')) return 'hitColdBurst';
        if (fx.projectile || fx.pierce || tags.includes('projectile') || tags.includes('summon') || skill.targetMode === 'pierce') return 'hitColdPierce';
        return 'hitColdBurst';
    }

    function lightSound(fx, skill, tags) {
        if (tags.includes('channeling')) return 'hitLightBeam';
        if (tags.includes('aoe') || tags.includes('potion') || fx.slam || skill.targetMode === 'cleave') return 'hitLightBurst';
        return 'hitLightArc';
    }

    function chaosSound(fx, skill, tags) {
        if (tags.includes('potion') || (fx.skillName || '').includes('독')) return 'hitVenom';
        return tags.includes('melee') ? 'hitChaosCut' : 'hitChaosPulse';
    }

    const elementSounds = {fire: fireSound, cold: coldSound, light: lightSound, chaos: chaosSound};
    function skillSound(fx) {
        const skill = SKILL_DB[fx.skillName] || {}, tags = skill.tags || [];
        // Cast-time element wins: staged/prismatic skills may differ from their base definition.
        const element = fx.element || skill.ele || 'phys';
        return (elementSounds[element] || physicalSound)(fx, skill, tags);
    }

    function dotCastSound(fx) {
        if (SKILL_DB[fx.skillName]?.tags?.includes('dot')) playUiFeedbackSound(skillSound(fx));
    }

    const eventCues = {
        hit: hitSound,
        playerSwing: dotCastSound,
        playerHit: fx => { if (fx.damage > 0 && !fx.deflected) playUiFeedbackSound('playerHurt'); },
        enemySpawn: fx => { if (fx.boss) playUiFeedbackSound('bossEntrance'); },
        objectReward: fx => playUiFeedbackSound(({pot:'potBreak',crate:'woodBreak'})[fx.objectKind] || 'chestOpen'),
        levelUp: () => playUiFeedbackSound('levelUp'),
        bossEntrance: () => playUiFeedbackSound('bossEntrance'),
        playerReturnDepart: () => playUiFeedbackSound('returnWarp')
    };
    function eventSound(fx) {
        eventCues[fx.type]?.(fx);
    }

    function deathNotice(fx, now) {
        if (fx.boss) {
            notice = { text: '보스 처치', detail: stripDecorativeEmoji(fx.name || ''), start: now, duration: 1850, boss: true };
            kills = []; nextPackAt = now + 2000;
            return;
        }
        if (kills.some(row => row.enemyId === fx.enemyId)) return;
        kills.push({ enemyId: fx.enemyId, start: fx.start });
        if (kills.length > 32) kills.shift();
        packNotice(now);
    }

    function packNotice(now) {
        if (kills.length < 3 || notice?.boss) return;
        if (notice && !notice.boss && now - notice.start < 450) notice.text = `${kills.length}마리 처치`;
        else if (now >= nextPackAt) {
            notice = { text: `${kills.length}마리 처치`, detail: '', start: now, duration: 850, boss: false };
            nextPackAt = now + 1800;
        }
    }

    function contactStyle(fx) {
        const heavy = ['heavy','annihilate'].includes(fx.impactTier);
        const mild = game.settings?.hitEmphasis === 'mild' || reduced();
        const length = heavy ? 14 : fx.crit ? 11 : 7;
        return { length: length * (mild ? .6 : 1), alpha: mild ? .55 : .9,
            count: mild ? 2 : 3 + Number(Boolean(heavy || fx.crit)), color: fx.crit ? '#ffe49b' : '#f6ebd0' };
    }

    /** Tight, directional pixel marks, drawn after native skill art too. */
    function contact(ctx, fx, age, positions) {
        if (fx.dot || !(fx.damage > 0) || age < 0 || age > 150 || contacts >= 8) return;
        const target = positions.enemies[fx.enemyId];
        if (!target) return;
        contacts++;
        const t = age / 150, style = contactStyle(fx), length = style.length;
        const direction = Math.atan2(target.y - positions.player.y, target.x - positions.player.x);
        ctx.save();
        ctx.translate(Math.round(target.x), Math.round(target.y - 18));
        ctx.globalAlpha = (1 - t) * style.alpha;
        ctx.fillStyle = style.color;
        const count = style.count;
        for (let i = 0; i < count; i++) {
            const angle = direction + (i - (count - 1) / 2) * .95;
            const spread = reduced() ? 3 : 3 + t * length;
            const x = Math.round(Math.cos(angle) * spread), y = Math.round(Math.sin(angle) * spread);
            ctx.fillRect(x, y, 2 + Math.round(Math.abs(Math.cos(angle)) * length * (1 - t)), 2);
        }
        ctx.restore();
    }

    /** Ballistic chips, at most 10 bundles/frame, replacing circular death rays. */
    function chips(ctx, point, t, spec) {
        if (reduced() || fragments >= 10 || t <= 0 || t >= 1) return;
        fragments++;
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

    function death(ctx, fx, t, point) {
        chips(ctx, { x: point.x, y: point.y - 12 }, t, {
            large: fx.boss || fx.elite, seed: Number(fx.enemyId) || 1,
            color: fx.boss ? '#c99b57' : fx.color || '#b2aaa0', light: '#e8d9b2'
        });
    }

    function object(ctx, fx, t, projection) {
        const point = projection.cellToScreen(fx.cell.gx, fx.cell.gy);
        point.y += projection.actorGroundOffsetY || 0;
        const prop = fx.objectKind === 'pot' || fx.objectKind === 'crate';
        chips(ctx, point, t, { large: !prop, seed: fx.cell.gx * 13 + fx.cell.gy,
            wood: fx.objectKind === 'crate', color: prop ? '#b08c72' : '#d6af58', light: prop ? '#ddc4a1' : '#fff0b3' });
        if (prop) return;
        // A short, crisp fan from the open lid; never an opaque pillar over the hero.
        ctx.save();
        ctx.globalAlpha = Math.max(0, 1 - t * 1.6) * .7;
        ctx.fillStyle = fx.grade === 'gold' ? '#ffe0a0' : '#d8bf83';
        const rise = reduced() ? 8 : 8 + Math.sin(t * Math.PI) * 22;
        for (let i = -1; i <= 1; i++) ctx.fillRect(Math.round(point.x + i * 7), Math.round(point.y - 14 - rise), 2, rise);
        ctx.restore();
    }

    function screen(ctx, area) {
        if (!notice) return;
        const t = (area.now - notice.start) / notice.duration;
        const alpha = Math.min(1, t * 10, (1 - t) * 5);
        const x = Math.round(area.width / 2), y = Math.round(area.height * .19);
        const width = Math.min(area.width - 32, notice.boss ? 300 : 150);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        ctx.fillStyle = 'rgba(12,13,16,.86)';
        ctx.fillRect(x - width / 2, y - 21, width, notice.boss ? 60 : 34);
        ctx.fillStyle = '#a88b51';
        ctx.fillRect(x - width / 2, y - 21, width, 1);
        ctx.fillRect(x - 20, y + (notice.boss ? 38 : 12), 40, 1);
        ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
        ctx.font = `${notice.boss ? 22 : 16}px ${BATTLE_PIXEL_FONT}`;
        ctx.fillStyle = '#f1d69b'; ctx.fillText(notice.text, x, y + 2);
        if (notice.detail) {
            ctx.font = `14px ${BATTLE_PIXEL_FONT}`;
            ctx.fillStyle = '#d6ccbc'; ctx.fillText(notice.detail, x, y + 24, width - 20);
        }
        ctx.restore();
    }

    addEventListener('project-idle:exploration-object', ({detail}) => {
        if (detail.kind !== 'reward' || !detail.cell || game.isBackgroundCalculation) return;
        addBattleFx('objectReward', { cell: detail.cell, objectKind: detail.objectKind, grade: detail.grade, duration: 460 });
    });
    return { begin, observe, contact, death, object, screen, reduced, advanceClock };
})();
