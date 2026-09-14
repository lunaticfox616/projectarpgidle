// Underworld controls stay mounted while live resources and combat estimates change.
const underworldRuneUi = (() => {
    let closePicker = null;
    function mountOverlay(overlay, returnSelector) {
        overlay.querySelector('.underworld-rune-overlay-title').id = 'underworld-rune-title';
        closePicker = bindGamePicker(overlay, {titleId:'underworld-rune-title',
            closeSelector:'.underworld-rune-overlay-head button', returnSelector, onClose:hideInfoTooltip});
    }
    function closeOverlay() {
        if (closePicker) closePicker();
        closePicker = null;
    }

    function validSlot(state, index) {
        return Number.isInteger(index) && index >= 0 && index < Math.min(6, state.unlockedSlots);
    }
    const updateMarkup = updateGamePanelMarkup;

    function progressLabel(state) {
        const slots = Math.max(0, Math.floor(state.unlockedSlots || 0));
        const max = Math.max(0, Math.floor(state.unlockedRunesMaxNumber || 0));
        if (!max) return '지하계 10층 격파 시 첫 룬과 슬롯 해금';
        return `${slots}/6 슬롯 · 룬 ${max === 1 ? '1' : `1~${max}`} 해금`;
    }

    function ownedNumbers(state) {
        return [...new Set([...state.obtainedRunes, ...state.equippedRunes.slice(0, state.unlockedSlots)]
            .filter(no => no && getUnderworldRuneDef(no)))].sort((a, b) => a - b);
    }

    function growthCost(level, reroll) {
        return reroll ? {underCopper:180+level*110,underSilver:95+level*80,underGold:36+level*34}
            : {underCopper:260+level*220,underSilver:150+level*150,underGold:55+level*58,runeShard:120+level*90};
    }

    function costText(cost) {
        const names = {underCopper:'구리',underSilver:'은',underGold:'금',runeShard:'룬 조각'};
        return Object.entries(cost).map(([key, value]) => `${names[key]} ${value}`).join(' · ');
    }

    function growthChoice(state, no, reroll) {
        const def = getUnderworldRuneDef(no), level = state.enhanceLvByNo[no] || 0;
        const cost = growthCost(level, reroll);
        const missing = Object.entries(cost).some(([key, amount]) => (game.currencies[key] || 0) < amount);
        const effect = `${getStatName(def.stat)} +${formatValue(def.stat, def.val*(1+level*0.01))}${P_STATS[def.stat]?.isPct ? '%' : ''}`;
        return {value:no,label:`${def.name} · 룬 ${no} · +${level}${reroll ? '' : ` → +${level+1}`}`,
            detail:`${effect}\n${costText(cost)}${missing ? '\n재료 부족' : ''}`};
    }

    async function chooseGrowth(reroll) {
        if (!assertBuildEditable()) return null;
        const state = ensureUnderworldRuneState();
        const numbers = ownedNumbers(state).filter(no => reroll ? state.enhanceLvByNo[no] >= 5 : (state.enhanceLvByNo[no] || 0) < 15);
        if (!numbers.length) {
            addLog(reroll ? '보유 또는 장착한 +5 이상 룬이 필요합니다.' : '강화 가능한 보유·장착 룬이 없습니다. (최대 +15)', 'attack-monster');
            return null;
        }
        const levels = new Map(numbers.map(no => [no,state.enhanceLvByNo[no] || 0]));
        const no = await requestGameChoice({title:reroll ? '룬 보너스 리롤' : '지하계 룬 강화',
            message:'같은 번호의 모든 룬에 적용됩니다.',confirmLabel:reroll ? '옵션 리롤' : '룬 강화',
            choices:numbers.map(no => growthChoice(state,no,reroll))});
        if (no === null) return null;
        return validateGrowthChoice(state, no, levels.get(no), reroll);
    }

    function validateGrowthChoice(state, no, level, reroll) {
        if (!assertBuildEditable()) return null;
        if (game.underworldRunes !== state || !ownedNumbers(state).includes(no) || (state.enhanceLvByNo[no] || 0) !== level) {
            addLog('룬 상태가 변경되었습니다. 다시 선택하세요.', 'attack-monster'); return null;
        }
        const cost = growthCost(level, reroll);
        if (Object.entries(cost).some(([key, value]) => (game.currencies[key] || 0) < value)) {
            addLog(`재료 부족 · ${costText(cost)}`, 'attack-monster'); return null;
        }
        return {state,no,level,cost};
    }

    return {updateMarkup,progressLabel,chooseGrowth,mountOverlay,closeOverlay,validSlot};
})();
safeExposeGlobals({underworldRuneUi});
