const STAGE_SIDE_DEAD_PX = 10;
const SPRITE_SIDE_DEAD_ZONE = 0.25;

/** Screen-side memory only. Death copies keep the living enemy's last side; saves never contain this map. */
export class EnemyFacing {
    constructor(deps) { this.deps = deps; this.sides = new WeakMap(); }

    stageSide(entry, player) {
        if (entry.heading) return entry.heading;
        const held = this.deps.bossMoves.heldSide(entry.enemy);
        if (held) return held;
        const rescue = entry.enemy && entry.enemy.rescue;
        if (rescue) return rescue.gx < entry.enemy.gx ? 'west' : 'east';
        const target = entry.actualAim || player, dx = Number(target.x) - Number(entry.x);
        if (Math.abs(dx) <= STAGE_SIDE_DEAD_PX) return 'south';
        return dx < 0 ? 'west' : 'east';
    }

    direction(entry, player) {
        if (!entry || !player) return 'south';
        if (this.deps.mobility.equipped() === '암살' && entry.enemy?.facingDirection) {
            return ({ 2: 'south', 4: 'west', 6: 'east', 8: 'north' })[entry.enemy.facingDirection];
        }
        return this.stageSide(entry, player);
    }

    note(enemy, entry, player, tile) {
        if (!enemy || !enemy.bossAssetKey || !entry || !player) return;
        const dx = Number((entry.actualAim || player).x) - Number(entry.x);
        if (Math.abs(dx) > (Number(tile) || 0) * SPRITE_SIDE_DEAD_ZONE) this.sides.set(enemy, dx > 0 ? 'east' : 'west');
    }

    mirror(enemy) {
        return !!enemy && this.sides.get(enemy) === 'east' && !this.deps.frontFacing.includes(enemy.bossAssetKey);
    }

    copy(from, to) {
        if (this.sides.has(from)) this.sides.set(to, this.sides.get(from));
        return to;
    }

    dispose() { this.sides = new WeakMap(); }
}
