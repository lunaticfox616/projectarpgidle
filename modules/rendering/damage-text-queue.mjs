const MAX_BATTLE_DAMAGE_TEXTS = 48;

/** Damage labels use visual milliseconds, sharing the current scene across combat resets. */
export class DamageTextQueue {
    constructor(deps, runtime) { this.deps = deps; this.runtime = runtime; }

    mergeDamageTextByKey(activeTexts, config, start, x, y) {
        if (config.bodyCue || config.miss) return this.mergeBodyCue(activeTexts, config, start, x, y);
        if (!config.aggregateKey) return false;
        // DoT labels share only the first 350 visual ms; continuous ticks must still create fresh, readable sums.
        let text = activeTexts.find(row => row && row.aggregateKey === config.aggregateKey
            && !!row.dot === !!config.dot && (!config.dot || (start >= row.start && start - row.start <= 350)));
        let nextValue = Number(config.value);
        if (!text || !Number.isFinite(nextValue)) return false;
        this.updateMergedLabel(text, config, start, x, y);
        if (!config.dot) this.updateImpactTier(text, config);
        return true;
    }

    updateMergedLabel(text, config, start, x, y) {
        const nextValue = Number(config.value);
        text.value = Math.max(0, Number(text.value) || 0) + Math.max(0, nextValue);
        text.hitCount = Math.max(1, Math.floor(Number(text.hitCount) || 1)) + 1;
        // A newly updated sum must remain readable even if its previous value was fading below a HUD/bar.
        text.readabilityUpdatedAt = start;
        delete text.readabilityFadeStart;
        text.crit = text.crit || !!config.crit;
        text.x = x;
        text.y = y;
        text.duration = Math.max(text.duration, Number(config.duration) || 0);
    }

    updateImpactTier(text, config) {
        text.damageRatio = Math.max(0, Number(text.damageRatio) || 0) + Math.max(0, Number(config.damageRatio) || 0);
        if (text.damageRatio >= 1 || config.impactTier === 'annihilate') text.impactTier = 'annihilate';
        else if (text.damageRatio >= 0.3 || config.impactTier === 'heavy' || text.impactTier === 'heavy') text.impactTier = 'heavy';
    }

    getDamageTextDuration(config) {
        if (config.duration) return config.duration;
        if (config.bodyCue) return 760;
        // About 1.4x the former stay (2026-10-05 user request) so a number can be read before it fades.
        if (config.impactTier === 'annihilate') return 1320;
        if (config.impactTier === 'heavy') return 1200;
        return config.enemyHit ? 1150 : (config.crit ? 1180 : 1060);
    }

    spawnDamageText(config) {
        config = config || {};
        const start = this.spawnStamp(config);
        let x = Number.isFinite(Number(config.x)) ? Number(config.x) : 0;
        let y = Number.isFinite(Number(config.y)) ? Number(config.y) : 0;
        let activeTexts = this.runtime.scene.damageTexts || (this.runtime.scene.damageTexts = []);
        if (this.mergeDamageTextByKey(activeTexts, config, start, x, y)) return;
        activeTexts.push(this.createText(config, start, x, y));
        if (activeTexts.length > MAX_BATTLE_DAMAGE_TEXTS) {
            activeTexts.splice(0, activeTexts.length - MAX_BATTLE_DAMAGE_TEXTS);
        }
    }

    spawnStamp(config) {
        let wallNow = this.deps.performance.now();
        let requestedStart = Number(config.start);
        let visualNow = Number(this.runtime.scene && this.runtime.scene.visualNow);
        return Number.isFinite(requestedStart)
            ? requestedStart
            : (Number.isFinite(visualNow) && visualNow > 0 ? visualNow : wallNow);
    }

    createText(config, start, x, y) {
        return {
            start: start,
            duration: this.getDamageTextDuration(config),
            x: x,
            y: y,
            offsetX: 0,
            offsetY: 0,
            driftX: 0,
            side: Math.sign(Number(config.side) || 0),
            value: config.value || 0,
            hitCount: 1,
            aggregateKey: config.aggregateKey || '',
            crit: !!config.crit,
            enemyHit: !!config.enemyHit,
            dot: !!config.dot,
            dotType: config.dotType || '',
            miss: !!config.miss,
            bodyCue: !!config.bodyCue,
            color: config.color || '',
            deflected: !!config.deflected,
            impactTier: config.impactTier || 'normal',
            damageRatio: Math.max(0, Number(config.damageRatio) || 0)
        };
    }

    mergeBodyCue(activeTexts, config, start, x, y) {
        if (!config.aggregateKey || !config.bodyCue || !config.miss || typeof config.value !== 'string') return false;
        const text = activeTexts.find(row => row && row.bodyCue && row.miss && row.aggregateKey === config.aggregateKey
            && row.value === config.value && row.color === (config.color || '')
            && start >= row.start && start - row.start <= row.duration);
        if (!text) return false;
        text.x = x;
        text.y = y;
        return true;
    }

    fromHit(fx, x, y, start) {
        this.spawnDamageText({
            start, x, y,
            value: Number.isFinite(Number(fx.rawDamage)) ? Number(fx.rawDamage) : fx.damage,
            crit: !!fx.crit, dot: !!fx.dot, dotType: fx.element || '',
            impactTier: fx.impactTier || 'normal', damageRatio: fx.damageRatio || 0,
            // Direct hits retain their skill bucket; DoT sums use the first label's visual time.
            aggregateKey: fx.dot ? `dot:${fx.enemyId}:${fx.element || ''}`
                : `${fx.skillName}:${fx.enemyId}:${Math.floor(fx.start / 250)}`
        });
    }
}
