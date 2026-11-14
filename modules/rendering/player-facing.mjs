const SIDE_DEAD_PX = 10;
const NATIVE_CAST_FACE_MS = 700;

function bandSide(fx) {
    if (fx.type === 'playerSwing') return fx.bandSide || 0;
    const footprint = fx.type === 'combatTravel' && fx.owner === 'player' ? fx.attackFootprint : null;
    return footprint && footprint.band ? footprint.band.side : 0;
}

function strikeOf(fx, now, side) {
    if (!fx || fx.start > now) return undefined;
    const band = bandSide(fx);
    if (band) return band < 0 ? 'west' : 'east';
    return fx.type === 'combatTravel' && fx.owner === 'player' && fx.aimCell ? side(fx.aimCell) : undefined;
}

/** Hero and attached skill art share attack direction. Only the short native-cast display latch is owned here. */
export class PlayerFacing {
    constructor(deps) { this.deps = deps; this.nativeCastFace = null; }

    attackDirection(player, targets, entries) {
        const primary = targets && targets[0] ? targets[0].enemy : null;
        const anchor = primary ? entries[primary.id] : null;
        if (!anchor) return this.deps.visual().playerAttackDirection || 'east';
        const direction = this.attackSide(Number(anchor.x) - Number(player.x));
        this.deps.visual().playerAttackDirection = direction;
        return direction;
    }

    strikeSide(now) {
        const hero = this.deps.game().gridPlayer;
        const side = cell => cell && cell.gx !== hero.gx ? (cell.gx < hero.gx ? 'west' : 'east') : null;
        // Native casts take precedence while basic attacks may continue aiming at another target.
        const cast = this.nativeSide(side);
        if (cast) return cast;
        const effects = this.deps.effects();
        for (let index = effects.length - 1; index >= 0; index--) {
            const strike = strikeOf(effects[index], now, side);
            if (strike !== undefined) return strike;
        }
        return null;
    }

    nativeSide(side) {
        const clock = this.deps.combatTime(), cast = this.latestCast(clock), aimed = cast ? side(cast.aim) : null;
        if (aimed) this.nativeCastFace = { side: aimed, until: cast.at + NATIVE_CAST_FACE_MS };
        const kept = this.nativeCastFace;
        if (kept && clock >= kept.until - NATIVE_CAST_FACE_MS && clock <= kept.until) return kept.side;
        this.nativeCastFace = null;
        return null;
    }

    latestCast(clock) {
        for (const state of [this.deps.skillRuntime(), this.deps.mobility.castState()]) {
            const cast = state && state.casts.length ? state.casts[state.casts.length - 1] : null;
            if (cast && cast.aim && clock >= cast.at && clock - cast.at <= NATIVE_CAST_FACE_MS) return cast;
        }
        return null;
    }

    attackSide(dx) {
        const last = this.deps.visual().playerAttackDirection;
        if (Math.abs(dx) <= SIDE_DEAD_PX) return last === 'west' || last === 'east' ? last : (this.deps.actors.facing() < 0 ? 'west' : 'east');
        return dx < 0 ? 'west' : 'east';
    }

    dispose() { this.nativeCastFace = null; }
}
