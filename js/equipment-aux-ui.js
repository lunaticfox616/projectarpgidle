// 장비창 장비 그리드 아래의 보조 줄(2026-09-30 보조 콘텐츠 통합). 지금은 주얼 보관함 단추 하나이고, 허리띠 물약 · 부적 줄이
// 이어서 들어온다. 장비 그리드(renderPaperdoll)를 다시 그릴 때 함께 그린다.
const equipmentAuxUi = (() => {
    function jewelStoreHtml() {
        if (!contentProgression.isUnlocked('jewel')) return '';
        const count = (game.jewelInventory || []).length, limit = getJewelInventoryLimit();
        return `<button type="button" class="equipment-aux-store${count >= limit ? ' is-full' : ''}" onclick="equipmentSocketsUi.openStore()">주얼 보관함 ${count}/${limit}</button>`;
    }

    function render() {
        const host = document.getElementById('ui-equipment-aux');
        if (!host) return;
        const html = jewelStoreHtml();
        if (host.__lastHtml !== html) {
            host.innerHTML = html;
            host.__lastHtml = html;
        }
        host.hidden = !html;
    }

    return Object.freeze({ render });
})();
safeExposeGlobals({ equipmentAuxUi });
