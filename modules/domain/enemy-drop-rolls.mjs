/** Kill-specific draws. Random consumption, including closed fossil rolls, is part of the replay contract. */
class EnemyDropRolls {
    constructor(tables, deps) { this.tables = tables; this.deps = deps; }
    currencyAndGear(enemy, zone, chance) {
        let drops = this.deps.currencies(enemy), gear = this.deps.equipment(zone, enemy, chance);
        for (let tries = 1; enemy.roomInvader && !drops.length && !gear.count; tries++) {
            drops = this.deps.currencies(enemy);
            gear = this.deps.equipment(zone, enemy, tries >= this.tables.ROOM_INVADER.emptyRollRetries ? Math.max(1, chance) : chance);
        }
        return { drops, gear };
    }
    attackRune(awakening, boss) {
        const name = this.deps.chooseSkill(this.deps.gems.attackRunes({ includeDropOnly: true, boss }));
        return { kind: 'attack', name, awakened: !!awakening && this.deps.random() < 0.035 };
    }
    rune(state, awakening, boss) {
        if (!this.deps.content.isUnlocked('support', state) || this.deps.random() < 0.5)
            return { kind: 'attack', gem: this.attackRune(awakening, boss) };
        const names = Object.keys(this.tables.SUPPORT_GEM_DB);
        if (!names.length) return { kind: 'support', gem: null };
        const name = this.deps.choose(names);
        return { kind: 'support', name, gem: this.deps.gems.nextSupport(this.deps.delivery.reservedRuneState(state), name) };
    }
    guardianFossils(state, enemy, zone) {
        if (zone?.type !== 'labyrinth' || !enemy.isBoss || enemy.roomInvader) return null;
        const floor = Math.max(1, Math.floor(state.labyrinthFloor || zone.floor || 1));
        return { floor, keys: this.fossils(state, floor) };
    }
    fossils(state, floor) {
        const open = this.deps.content.isUnlocked('fossil', state) ? 1 : 0;
        const chances = this.deps.fossilChances(floor, open, open);
        const typed = this.deps.choose(this.tables.FOSSIL_DB.filter(row => !row.ancientPrimalOnly));
        const primal = this.deps.content.isUnlocked('fossilRestore', state);
        return [['fossil', chances.base], [typed.key, chances.typed], ['fossilPrimal', primal ? chances.primal : 0],
            ['fossilAncientPrimal', primal ? chances.ancient : 0], ['fossilAbyssal', chances.abyssal]]
            .filter(([, chance]) => this.deps.random() < chance).map(([key]) => key);
    }
}

export const createEnemyDropRolls = (tables, deps) => new EnemyDropRolls(tables, deps);
