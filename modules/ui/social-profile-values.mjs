// profile-values: explicit account state and dependency ports; no ambient game/global state.
export class SocialProfileValues {
    constructor(deps, state, data, services) {
        this.deps = deps;
        this.state = state;
        this.data = data;
        this.services = services;
        ["profileAnointSnapshot","profileItemCategory","profileItemTag","profileSnapshotRows","profileStatLabel","profileStatTone","profileValue","profileJewelValue"].forEach(name => { this[name] = this[name].bind(this); });
    }

    profileItemCategory(item) {
        return item.slot === '무기' && typeof this.deps.getWeaponCategoryName === 'function' ? this.deps.getWeaponCategoryName(item) || undefined : undefined;
    }

    profileItemTag(item) {
        return this.deps.weaponCategorySlotLabel(item, item.category || String(item.slot || '').replace(/[123]$/, ''));
    }

    profileStatLabel(st) {
        return st.statName || (typeof this.deps.getStatName === 'function' ? this.deps.getStatName(st.id) : st.id) || st.id;
    }

    profileStatTone(id) {
        return this.services.format.socialSafeColor(typeof this.deps.window.getItemStatToneColor === 'function' ? this.deps.window.getItemStatToneColor(id) : null, '#cfe0f5');
    }

    profileValue(id, value) {
        return typeof this.deps.formatValue === 'function' ? this.deps.formatValue(id, value) : value;
    }

    profileSnapshotRows(rows, limit) {
        return Array.isArray(rows) ? rows.slice(0, limit) : [];
    }

    profileJewelValue(id, value) {
        if (typeof this.deps.formatJewelStatValue === 'function') return this.deps.formatJewelStatValue(id, value);
        return this.profileValue(id, value);
    }

    profileAnointSnapshot(item) {
        const nodes = typeof this.deps.gardenOils === 'object' ? this.deps.gardenOils.nodesOf(item).filter(Boolean) : [];
        return nodes.length ? nodes.map(node => ({ title: node.title,
            text: node.effects.map(effect => `${this.deps.getStatName(effect.stat)} ${effect.val >= 0 ? '+' : ''}${this.deps.formatValue(effect.stat, effect.val)}`).join(', ') })) : undefined;
    }
}
