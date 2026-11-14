/** Rendering measurements, never serialized onto enemies or the player's save. */
export class BattlefieldBody {
    constructor(deps) { this.deps = deps; this.heights = new WeakMap(); }

    note(enemy, height) { if (enemy && height > 0) this.heights.set(enemy, height); }
    drawnHeight(enemy) { return this.heights.get(enemy); }

    /** Bar lift in CSS px: clear the drawn head, preserving the old minimum and floating wisps. */
    barLift(enemy, bodyHeight) {
        const base = enemy.isBoss ? 106 : (this.deps.wispBarLift(enemy) || 56);
        const drawn = bodyHeight ?? this.heights.get(enemy) ?? 0;
        return Math.max(base, Math.round(drawn + 10));
    }

    enemyHeight(pos) { return pos.enemy ? this.barLift(pos.enemy) - 10 : 46; }

    heroHeight(pos, now) {
        const head = this.deps.heroHeadY(now);
        return head === null ? 82 * this.deps.heroSizeScale : pos.y - head;
    }

    dispose() { this.heights = new WeakMap(); }
}

/** Damage sits at the body's centre; judgments sit nearer the head. */
export function damageBodyY(feetY, height) { return Math.round(feetY - height * 0.5); }

export function bodyCueAnchor(pos, height) {
    return { x: Math.round(pos.x), y: Math.round(pos.y - height * (pos.enemy?.isBoss ? 0.64 : 0.92)) };
}

/** Repeated judgments share a lifetime only when the actor, wording and colour match. */
export function bodyCueFromFx(fx, pos, height, start) {
    const value = fx.text || '회피!', color = fx.color || '#c4e2ff';
    const bodyCue = fx.type === 'enemyEvade' || fx.bodyCue === true;
    const actor = fx.enemyId == null ? 'hero' : 'enemy:' + fx.enemyId;
    return { start, ...bodyCueAnchor(pos, height), value, miss: true, bodyCue, color,
        aggregateKey: bodyCue ? `cue:${actor}:${value}:${color}` : '' };
}
