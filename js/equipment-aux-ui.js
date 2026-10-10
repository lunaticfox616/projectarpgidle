// 장비창 장비 그리드 아래의 보조 줄(2026-09-30 보조 콘텐츠 통합). 2026-10-10부터 주얼과 코어는 가방에 들어가고(js/bag-items.js)
// 액막이 칸은 장착 칸 줄에 있어(js/colony-wards-ui.js) 지금은 그릴 것이 없다. 장비 그리드(renderPaperdoll)를 다시 그릴 때 함께 부른다.
const equipmentAuxUi = (() => {
    function render() {
        const host = document.getElementById('ui-equipment-aux');
        if (!host || host.hidden) return;
        host.innerHTML = '';
        host.hidden = true;
    }

    return Object.freeze({ render });
})();
safeExposeGlobals({ equipmentAuxUi });
