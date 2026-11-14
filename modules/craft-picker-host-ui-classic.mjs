import { createCraftPickerHost } from './ui/craft-picker-host.mjs';
const craftPickerHostUi = createCraftPickerHost({
    get document() { return document; },
    get equipmentInventoryInteraction() { return equipmentInventoryInteraction; },
    get MutationObserver() { return MutationObserver; },
    get game() { return window.GameModules.state.game; },
    get equipmentInventoryGridRuntime() { return equipmentInventoryGridRuntime; },
    get bagItems() { return bagItems; },
    get _t() { return _t; }
});
safeExposeGlobals({ craftPickerHostUi });
