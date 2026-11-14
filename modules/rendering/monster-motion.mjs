/** Read-only clip timing shared by both monster renderers. No image loading or drawing calls. */
export function frameAt(durations, ms) {
        let rest = ms;
        for (let index = 0; index < durations.length; index++) {
            if (rest < durations[index]) return index;
            rest -= durations[index];
        }
        return durations.length - 1;
    }

export function snapPixel(value, scale) {
    return Math.round(value * scale) / scale;
}

class MonsterMotion {
    constructor(deps) {
        this.deps = deps;
        this.WIND_UP_FROM = 0.8;
        this.WALK_SPEED = 1.8;
        this.sum = list => list.reduce((total, value) => total + value, 0);
        this.clipOf = (kind, special, element) => kind.elementAttacks?.[element] || (special && kind.special ? kind.special : kind);
    }

    /** A boss strikes once, when it lets the attack go (bossRelease, 2026-10-06): a shot used to strike again when it landed
     * and a dodged area special never struck at all. Other monsters strike on the hit or the shot leaving. */
    isRelease(fx, enemy) {
        if (enemy.isBoss) return fx.type === 'bossRelease' && fx.enemyId === enemy.id;
        if (fx.type === 'combatTravel') return fx.owner === 'enemy' && fx.sourceId === enemy.id;
        return fx.type === 'enemyAttack' && fx.enemyId === enemy.id;
    }

    /** The latest release effect inside the clip's length, or null. */
    lastRelease(enemy, now, clipMs) {
        let found = null;
        for (const fx of this.deps.battleFx) {
            if (!fx || now - fx.start > clipMs || !this.isRelease(fx, enemy)) continue;
            if (found === null || fx.start > found.start) found = fx;
        }
        return found;
    }

    /** 0..1 through the wind-up: the gauge's last fifth, or a boss's warning (its gauge waits at 1 for the warning to run out,
     * so it fell back to idle before), trembling a dot at the end. null → not winding up. */
    windUp(enemy, moving, now) {
        if (moving) return null;
        if (enemy.isBoss) return this.bossWindUp(enemy, now);
        return this.castWindUp(enemy) || this.gaugeWindUp(enemy);
    }

    bossWindUp(enemy, now) {
        const warning = this.deps.warningShare(enemy);
        if (warning !== null) return { share: Math.min(0.999, warning), bob: warning > 0.6 ? Math.floor(now / 70) % 2 : 0 };
        if (enemy.nextPatternState?.isSpecial) return null; // A slow special winds up only once its warning starts.
        return this.gaugeWindUp(enemy);
    }

    gaugeWindUp(enemy) {
        const gauge = Number(enemy.attackTimer);
        return gauge >= this.WIND_UP_FROM && gauge < 1 ? { share: (gauge - this.WIND_UP_FROM) / (1 - this.WIND_UP_FROM), bob: 0 } : null;
    }

    /** Normal aimed attacks hold their preparation while their gauge waits at 1; the simulation clock owns release. */
    castWindUp(enemy) {
        const cast = enemy.attackCast;
        if (!cast || enemy.isBoss) return null;
        const share = (this.deps.getCombatTime() - cast.startAt) / Math.max(1,cast.finishAt - cast.startAt);
        return { share: this.deps.clampNumber(share,0,0.999), bob: 0 };
    }

    /** { clip: 'attack', index, bob } while the strike (on the hit or release) or its wind-up (the gauge's last fifth) shows,
     * else null. kind = { attackMs, impactFrame }: a sheet kind, or a roster actor (js/canvas-stage-roster.js). */
    attackFrame(enemy, kind, now, moving) {
        const longest = Math.max(this.sum(kind.attackMs), kind.special ? this.sum(kind.special.attackMs) : 0);
        // A boss holding a beam keeps its strike frame until the beam ends (js/canvas-boss-moves.js strikeHoldMs), then finishes the clip.
        const hold = enemy.isBoss ? this.deps.strikeHoldMs(enemy) : 0, release = this.lastRelease(enemy, now, longest + hold);
        if (release) {
            const clip = this.clipOf(kind, release.special, release.element), impactMs = this.sum(clip.attackMs.slice(0, clip.impactFrame)), since = Math.max(0, now - release.start - hold);
            if (since + impactMs < this.sum(clip.attackMs)) return this.strikePose(kind, clip, since + impactMs, 0);
        }
        const wind = this.windUp(enemy, moving, now);
        if (!wind) return null;
        const element = kind.elementAttacks ? this.deps.woodsmanAttackFxElement(enemy) : null;
        const clip = this.clipOf(kind, enemy.isBoss && enemy.nextPatternState?.isSpecial, element);
        return this.strikePose(kind, clip, wind.share * this.sum(clip.attackMs.slice(0, clip.impactFrame)), wind.bob);
    }

    strikePose(kind, clip, ms, bob) {
        const offset = clip.offset || 0;
        return { clip: clip === kind.special ? 'special' : 'attack', index: offset + frameAt(clip.attackMs, ms),
            strikeFrame: offset + clip.impactFrame, bob };
    }

    /** { clip, index, bob }: the strike or its wind-up, else idle (faster with a hop when walking). */
    clipFrame(enemy, kind, now, moving) {
        const strike = this.attackFrame(enemy, kind, now, moving);
        if (strike) return strike;
        const speed = moving ? this.WALK_SPEED : 1, idleMs = this.sum(kind.idleMs);
        const index = frameAt(kind.idleMs, (now * speed + Math.abs(enemy.id || 0) * 137) % idleMs);
        return { clip: 'idle', index, bob: moving && index % 2 === 1 ? 1 : 0 };
    }

    snap(value) {
        const scale = typeof this.deps.uiDisplay === 'object' ? this.deps.uiDisplay.battleRenderScale : 1;
        return snapPixel(value, scale);
    }
}

export function createMonsterMotion(deps) {
    const motion = new MonsterMotion(deps);
    return Object.freeze({ frameAt, attackFrame: motion.attackFrame.bind(motion), clipFrame: motion.clipFrame.bind(motion), snap: motion.snap.bind(motion) });
}
