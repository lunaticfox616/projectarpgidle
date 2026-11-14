import { createEquipmentAuxView } from './ui/equipment-aux-view.mjs';
import { EquipmentSlotChoiceView } from './ui/equipment-slot-choice-view.mjs';
const equipmentAuxUi = createEquipmentAuxView({
    get document() { return document; }
});
safeExposeGlobals({ equipmentAuxUi });

const equipmentSlotChoice = new EquipmentSlotChoiceView({
    get document() { return document; },
    get game() { return window.GameModules.state.game; },
    get equipItemById() { return equipItemById; }
});
window.GameModules.equipmentSlotChoice = equipmentSlotChoice;
