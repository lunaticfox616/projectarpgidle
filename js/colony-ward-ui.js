// 군락지 화면의 액막이 안내(2026-10-10): 액막이는 가방에 들어가고 장비창 액막이 칸에 끼운다(js/colony-wards.js). 여기서는 끼운 효과의
// 합과 칸 수, 군락지 편린으로 만들기를 보여 준다(js/colony-wards-ui.js colonyPanelHtml). 예전 보관함과 칸은 불러올 때 장비로 옮긴다.
(function () {
    'use strict';
    function renderColonyWardView(targetId) {
        const panel = document.getElementById(targetId);
        if (!panel) return;
        const html = colonyWardsUi.colonyPanelHtml();
        if (panel.__wardHtml === html) return;
        panel.innerHTML = html;
        panel.__wardHtml = html;
    }

    safeExposeGlobals({ renderColonyWardView });
})();
