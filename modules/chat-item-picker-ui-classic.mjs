import { ChatItemPickerView } from './ui/chat-item-picker-view.mjs';
const view=new ChatItemPickerView({
    get getChatAttachSnapshot() { return getChatAttachSnapshot; },
    get escapeHTML() { return escapeHTML; },
    get _t() { return _t; },
    get socialState() { return socialState; },
    get renderProfileItemCard() { return renderProfileItemCard; },
    get getPaperdollSlots() { return getPaperdollSlots; },
    get game() { return window.GameModules.state.game; },
    get contentProgression() { return contentProgression; },
    get getItemSlotDisplayLabel() { return getItemSlotDisplayLabel; },
    get getEquipmentGridVisualAsset() { return getEquipmentGridVisualAsset; },
    get COLONY_WARD_RULES() { return COLONY_WARD_RULES; },
    get colonyWards() { return colonyWards; },
    get equipmentInventoryGridRuntime() { return equipmentInventoryGridRuntime; },
    get stumpBox() { return stumpBox; },
    get document() { return document; },
    get SOCIAL_MAX_ITEMS_PER_MSG() { return SOCIAL_MAX_ITEMS_PER_MSG; },
    get socialCloudReady() { return socialCloudReady; },
    get showGameToast() { return showGameToast; },
    get hideSocialTip() { return hideSocialTip; },
    get attachChatSnapshot() { return attachChatSnapshot; }
});
window.GameModules.chatItemPickerView=view;
safeExposeGlobals({chatItemPicker:Object.freeze({open:view.openPicker,close:view.closePicker,pick:view.attachPickedItem,show:view.showPickerTab,page:view.showBagPage}),openItemPicker:view.openPicker,closeItemPicker:view.closePicker});
