import { lineText, benchGuide, sealGuide, currencyGuide, render, craft, pick, choose, selectGroup, setCount, openRewardUse, pickTarget, openWorkshop } from './fishing-panel.mjs';

/** Owns this screen's transient state. deps reads the current game after save replacement. */
export function createFishingView(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { lineText, benchGuide, sealGuide, currencyGuide, render, craft, pick, choose, selectGroup, setCount, openRewardUse, pickTarget, openWorkshop };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    initialize(ctx);
    ctx.api = Object.freeze({ render: ctx.handlers.render, craft: ctx.handlers.craft, pick: ctx.handlers.pick, choose: ctx.handlers.choose, selectGroup: ctx.handlers.selectGroup, setCount: ctx.handlers.setCount, openRewardUse: ctx.handlers.openRewardUse, pickTarget: ctx.handlers.pickTarget, openWorkshop: ctx.handlers.openWorkshop });
    return ctx.api;
}

function initialize(ctx) {
    ctx.state.CATEGORY_OPTIONS = Object.freeze(['공격', '방어/생명', '속도/치명', '저항']);
    ctx.state.VALUE_EFFECTS = new Set(['safeReroll', 'tierStepUp']);
    ctx.state.GROUPS = Object.freeze({ supply: '재화 제작', equipment: '장비 가공' });
    ctx.state.chosen = {};
    ctx.state.selectedRecipes = {};
    ctx.state.lastResult = null;
    ctx.state.batchChoice = null;
    ctx.state.EFFECT_GUIDES = Object.freeze({
        safeReroll: () => ['무작위 1줄의 수치를 다듬습니다. 낮게 나오면 기존 값을 유지합니다.', '같은 등급 안에서 굴립니다. 부수치까지 하나라도 낮으면 줄 전체를 유지하며, 물고기는 소모됩니다.'],
        tierStepUp: () => ['무작위 1줄의 등급을 1단계 올립니다.', '최고 등급 줄과 봉인된 줄은 제외합니다. 옵션 종류는 그대로이고 수치만 새 등급 범위에서 굴립니다.'],
        convertCategoryMod: () => ['무작위 1줄을 선택한 계열로 교체합니다. 기존 옵션은 사라집니다.', '봉인된 줄은 제외합니다. 바꿀 줄이나 새 옵션의 정확한 종류를 지정할 수 없습니다.'],
        echoMod: () => ['가장 높은 등급의 옵션을 절반 효과로 복사해 다른 1줄을 덮어씁니다.', '원본은 유지합니다. 봉인과 접두·접미 제한을 지키며, 메아리 줄이 있으면 다시 복사할 수 없습니다.'],
        fixedBenchOption: ctx.handlers.benchGuide, lockMod: ctx.handlers.sealGuide, currency: ctx.handlers.currencyGuide, randomCurrency: ctx.handlers.currencyGuide
    });
}
