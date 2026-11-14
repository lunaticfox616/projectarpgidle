export function renderStaticCharacter(runtime, context) {
    const { isTabRendering, pStats } = context;
    (0, runtime.deps.syncPassiveTreeHeader)();
    if (isTabRendering('tab-char')) (0, runtime.deps.renderPassiveInvestmentSummary)();
    runtime.deps.document.getElementById('ui-season-text-tab').innerText = runtime.deps.game.season;
    runtime.deps.document.getElementById('ui-season-pts').innerText = runtime.deps.game.seasonPoints;
    runtime.deps.document.getElementById('ui-ascend-pts').innerText = runtime.deps.game.ascendPoints;
    if (isTabRendering('tab-character')) {
        (0, runtime.deps.renderCharacterEhpSummary)(pStats);
        (0, runtime.deps.renderCharacterPassiveSpecialStats)(pStats);
    }
}

export function renderStaticTraits(runtime) {
    if (runtime.deps.game.ascendClass) {
        runtime.deps.document.getElementById('ui-class-select').style.display = 'none';
        runtime.deps.document.getElementById('ui-class-locked').style.display = 'none';
        runtime.deps.document.getElementById('ui-class-tree').style.display = 'block';
        runtime.deps.document.getElementById('ui-selected-class-name').innerText = '';
        // 전직 트리 보기(2026-10-09): 선으로 이은 노드와 키스톤, 합계와 다음 포인트, 늘 보이는 설명 칸(js/ascendancy-tree-ui.js).
        runtime.deps.ascendancyTreeUi.render();
    } else if (runtime.deps.game.ascendPoints > 0) {
        runtime.deps.document.getElementById('ui-class-select').style.display = 'block';
        runtime.deps.document.getElementById('ui-class-locked').style.display = 'none';
        runtime.deps.document.getElementById('ui-class-tree').style.display = 'none';
        (0, runtime.deps.fillAscendancyPickScreen)();
    } else {
        runtime.deps.document.getElementById('ui-class-select').style.display = 'none';
        runtime.deps.document.getElementById('ui-class-locked').style.display = 'block';
        runtime.deps.document.getElementById('ui-class-tree').style.display = 'none';
        runtime.deps.document.getElementById('ui-class-trial-link').disabled = !runtime.deps.contentProgression.isUnlocked('battleTrials');
    }
}

export function renderStaticKnowledge(runtime, context) {
    const { isTabRendering, pStats, sf } = context;
    if (isTabRendering('tab-codex')) runtime.deps.uniqueCodexUi.render();
    if (isTabRendering('tab-records') && typeof runtime.deps.renderRecordsTab === 'function') (0, runtime.deps.renderRecordsTab)();
    if (isTabRendering('tab-guide')) runtime.deps.playerGuideUi.render();

    // 룬 카드 140장 가까이가 같은 주얼과 고유 장비의 룬 레벨을 쓴다: 한 번 그리는 동안 빌드 메모를 나눠 쓴다(js/background-build-cache.js)
    if (isTabRendering('tab-skills') && typeof runtime.deps.renderSkillGemScreen === 'function') (0, runtime.deps.withBuildMemoPass)(() => (0, runtime.deps.renderSkillGemScreen)({ pStats, searchFilters: sf }));
}

export function finishStaticPanels(runtime, context) {
    const { itemsTabActive, isTabRendering } = context;
    if (itemsTabActive) (0, runtime.deps.switchItemSubtab)(runtime.deps.game.itemSubtab || 'item-tab-equip');
    if (isTabRendering('tab-skills')) {
        (0, runtime.deps.renderSkillAutoRulePanel)();
        (0, runtime.deps.switchSkillSubtab)(runtime.deps.game.skillSubtab || 'skill-tab-equip');
    }
    if (isTabRendering('tab-map')) (0, runtime.deps.switchMapSubtab)(runtime.deps.game.mapSubtab || 'map-tab-zones');
    (0, runtime.deps.syncSingleSubtabRows)(); // 단추마다 보이기(잠금, 거래소 같은 해금)를 다 정한 뒤에 센다: 중간에 세면 이번에 보인 단추가 빠져 칸이 모자랐다
}
