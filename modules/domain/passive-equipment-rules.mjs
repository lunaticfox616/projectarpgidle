/** domain/passive-equipment-rules: native owner; state is read from the supplied current-game port. */
export class PassiveEquipmentRules {
    constructor(deps, data) {
        this.deps = deps;
        this.data = data;
        this.getPassiveEquipmentRestriction = this.getPassiveEquipmentRestriction.bind(this);
        this.enforcePassiveEquipmentRestrictions = this.enforcePassiveEquipmentRestrictions.bind(this);
    }

    getPassiveEquipmentRestriction(item, state = this.deps.game) {
        if (!item) return '';
        const rule = this.deps.PASSIVE_EQUIPMENT_RESTRICTIONS.find(entry =>
            entry.slot === item.slot && (state.passives || []).includes(entry.nodeId));
        return rule ? rule.reason : '';
    }

    enforcePassiveEquipmentRestrictions(state = this.deps.game) {
        let moved = 0;
        Object.entries(state.equipment).forEach(([slot, item]) => {
            if (!this.getPassiveEquipmentRestriction(item, state)) return;
            if (!state.inventory.includes(item)) state.inventory.push(item);
            state.equipment[slot] = null;
            moved++;
        });
        return moved;
    }
}
