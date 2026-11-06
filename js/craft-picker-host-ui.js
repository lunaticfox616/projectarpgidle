// 제작실의 장비, 인벤토리 고르기 창(js/ui.js openCraftItemPickerOverlay)은 장비 창의 진짜 장착 칸과 가방을 옮겨 와 보여 준다(2026-11-06
// 사용자: "실제 장비창과 가방의 모양과 똑같이"). 그루터기 함이 가방을 옮기는 방식(js/stump-box-ui.js moveEquipmentBag)과 같고, css/*.css의
// 장비 창 규칙은 #item-tab-equip, #stump-equip-host, #craft-equip-host를 같이 본다. 이 창에서 장비를 누르면 제작 대상이 되고, 끌기와 두 번
// 누르기(장착, 해제)는 막는다. 창을 닫으면 장비 창으로 돌려놓는다. 그동안의 그리기는 js/ui.js performUpdateStaticUI가 한다(shows).
// 장비 전당의 등록(js/player-exchange.js openHallItemPicker)도 같은 가방 창을 쓴다: 고를 수 없는 장비(blocked)는 흐리게 칠하고, 누르면 그 까닭을 말한다.
const craftPickerHostUi = (() => {
    const PANEL = Object.freeze({ equip: '.equipment-loadout-panel', inventory: '.equipment-inventory-panel' });
    // 가방과 장착 칸의 끌기(js/equipment-inventory-grid-ui.js startPointer)와 두 번 누르기가 닿지 않게 이 창 안에서 멈추는 입력.
    const HELD = Object.freeze(['pointerdown', 'dblclick', 'contextmenu', 'dragstart']);
    let shown = '', pick = null, dimmer = null;

    /** The moved parts: the loadout panel, or the bag with its picked-gear popover (the popover stays next to the bag). */
    function craftPickerParts(kind) {
        const parts = [document.querySelector(PANEL[kind])];
        if (kind === 'inventory') parts.push(document.getElementById('ui-equipment-inventory-inspector'));
        if (!parts.every(Boolean)) throw new Error(`craft picker: equipment window part missing for ${kind}`);
        return parts;
    }

    const craftPickerItem = key => (game.inventory || []).find(row => equipmentInventoryGridRuntime.getItemKey(row) === key);
    /** Why a bag item cannot be picked here, or '': the caller's rule, else jewels, cores and wards are not craft targets (js/bag-items.js). */
    const craftPickerBlock = item => (pick.blocked ? pick.blocked(item) : bagItems.isSpecial(item) ? _t('주얼, 코어, 액막이는 고를 수 없습니다.') : '');

    /** A press on an equipped slot or a bag item picks it, or says why it cannot be picked. */
    function craftPickerPress(event) {
        const slot = event.target.closest('#ui-equip-list > .equipment-slot[data-slot]');
        const card = event.target.closest('.equipment-grid-item');
        if (!slot && !card) return;
        event.stopPropagation();
        if (event.type !== 'click') return;
        event.preventDefault();
        if (slot) { pick.equip(slot.dataset.slot); return; }
        const item = craftPickerItem(card.dataset.equipmentGridKey);
        const reason = item ? craftPickerBlock(item) : '';
        if (reason) pick.refuse(reason);
        else if (item) pick.inventory(item.id);
    }

    /** Dims the bag items that cannot be picked (again after each bag draw, js/ui.js renderEquipmentBagPanel). */
    function craftPickerDim(host) {
        host.querySelectorAll('.equipment-grid-item').forEach(card => {
            const item = craftPickerItem(card.dataset.equipmentGridKey);
            card.classList.toggle('is-picker-off', !!item && !!craftPickerBlock(item));
        });
    }

    /**
     * Moves the real loadout panel ('equip') or bag ('inventory') into body under #craft-equip-host.
     * @param {HTMLElement} body the picker's body
     * @param {'equip'|'inventory'} kind
     * @param {{equip: function(string): void, inventory: function(number): void, refuse: function(string): void, blocked?: function(Object): string}} picks
     *   pick an equipped slot, or a bag item by id; refuse says why a pressed item cannot be picked; blocked: the caller's rule for bag items
     */
    function craftPickerMount(body, kind, picks) {
        const parts = craftPickerParts(kind);
        body.innerHTML = `<div id="craft-equip-host" data-kind="${kind}"><div class="equipment-window" data-mobile-pane="${kind === 'equip' ? 'loadout' : 'inventory'}"></div></div>`;
        const host = body.firstElementChild;
        [...HELD, 'click'].forEach(type => host.addEventListener(type, craftPickerPress, true));
        equipmentInventoryInteraction.focus(null);
        host.firstElementChild.append(...parts);
        shown = kind;
        pick = picks;
        dimmer = new MutationObserver(() => craftPickerDim(host));
        dimmer.observe(host, { childList: true, subtree: true });
        craftPickerDim(host);
    }

    /** Puts the moved panel back in the equipment window, in its place (the loadout panel first, the bag and its popover after it). */
    function craftPickerUnmount() {
        if (!shown) return;
        dimmer.disconnect();
        dimmer = null;
        document.querySelectorAll('#craft-equip-host .is-picker-off').forEach(card => card.classList.remove('is-picker-off'));
        const home = document.querySelector('#item-tab-equip .equipment-window'), parts = craftPickerParts(shown);
        if (shown === 'equip') home.prepend(...parts);
        else home.append(...parts);
        shown = '';
        pick = null;
    }

    return Object.freeze({
        mount: craftPickerMount,
        unmount: craftPickerUnmount,
        /** Whether the picker shows the real loadout panel or bag now (then they are drawn even when the items tab is not). */
        shows: kind => shown === kind,
        /** The place the bag belongs while the inventory picker shows it, or null (js/stump-box-ui.js moveEquipmentBag). */
        bagHome: () => (shown === 'inventory' ? document.querySelector('#craft-equip-host > .equipment-window') : null)
    });
})();
safeExposeGlobals({ craftPickerHostUi });
