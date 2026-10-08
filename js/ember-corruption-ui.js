// 타오른 잿불가지의 화면(12번 루프 30, js/ember-corruption.js): 제작실에서 쓸 수 있는지, 확인창, 값 치르기, 결과 기록, 재가 된 장비
// 지우기와 그 재를 그루터기 함 거름으로(stumpBox.feedAsh). 툴팁과 제작실 카드의 타락 전용 줄, 다시 구운 수치 표시도 여기서 만든다.
const emberCorruptionUi = (() => {
    const KEY = 'burningEmberBranch';
    const esc = value => escapeHTML(String(value));

    /** The crafting workspace's use state for the selected item: { enabled, reason }. */
    function useState(item) {
        if (game.woodsmanBuildLock) return { enabled: false, reason: '나무꾼 전투 중에는 쓸 수 없습니다.' };
        if ((game.currencies[KEY] || 0) <= 0) return { enabled: false, reason: '재화 부족' };
        const reason = emberCorruption.burnReason(item);
        return { enabled: !reason, reason: reason || '사용 가능' };
    }
    /** The item's chance (%) to burn away, from the outcomes it can take. */
    function ashPct(item) {
        const rows = emberCorruption.outcomes(item), total = rows.reduce((sum, [, weight]) => sum + weight, 0);
        return Math.round(((rows.find(([kind]) => kind === 'ash') || [0, 0])[1] / Math.max(1, total)) * 100);
    }
    /** Burns the selected item once (crafting workspace action). @returns {Promise<true|undefined>} true after the branch was spent. */
    async function use() {
        const item = getSelectedCraftItem(), state = useState(item);
        if (!state.enabled) return addLog(state.reason, 'attack-monster');
        const question = `[${item.name}]에 타오른 잿불가지를 씁니다. ${ashPct(item)}% 확률로 장비가 타서 사라집니다.`;
        if (!await requestGameConfirmation(question, { title: '타오른 잿불가지', tone: 'danger', confirmLabel: '태우기' })) return;
        if (getSelectedCraftItem() !== item || !useState(item).enabled) return addLog('확인 중 제작 대상이나 재화가 바뀌어 쓰지 않았습니다.', 'attack-monster');
        game.currencies[KEY] -= 1;
        const token = craftingResultLedger.begin(item, { currencyKey: KEY });
        const outcome = emberCorruption.burn(item);
        if (outcome.kind === 'ash') burnAway(item);
        else {
            token.meta.outcome = outcome.text;
            craftingResultLedger.commit(token, item);
            addLog(`🔥 타오른 잿불가지: ${outcome.text}`, outcome.kind === 'nothing' ? 'attack-monster' : 'loot-unique', { toast: true });
        }
        updateStaticUI();
        queueImportantSave(200);
        return true;
    }
    /** The burned-away item leaves (its jewels go back to storage) and its ashes feed the stump box. */
    function burnAway(item) {
        const name = item.name, growth = emberCorruption.ashGrowth(item), jewels = destroySelectedCraftItem(item);
        const fed = typeof stumpBox === 'object' ? stumpBox.feedAsh(game, growth) : null;
        const parts = [`🔥 [${name}] 타서 재가 되었습니다.`, jewels ? `끼운 주얼 ${jewels}개는 주얼 보관함으로 돌아왔습니다.` : '',
            fed ? `재가 그루터기 함 거름이 되었습니다(자라는 ${fed.fed}개 +${fed.growth}).` : ''];
        addLog(parts.filter(Boolean).join(' '), 'attack-monster', { toast: true });
    }

    const lineHtml = (line, tag) => `${tag}<span style="color:${EMBER_CORRUPTION_TONE};">[잿불] ${esc(line.statName || getStatName(line.id))} +${esc(formatValue(line.id, line.val))}</span>`;
    /** The item tooltip's ember section: the burned mark and the corruption-only lines. '' for an item never burned. */
    function tooltipHtml(item) {
        if (!item || !item.burned) return '';
        const lines = (item.emberLines || []).map(line => lineHtml(line, '<div class="tooltip-line">') + '</div>').join('');
        return `<div class="tooltip-line" style="margin-top:6px; color:${EMBER_CORRUPTION_TONE};">🔥 타오른 장비 (다시 태울 수 없음)</div>${lines}`;
    }
    /** A line the burn baked again: its share as +12% / -8% next to the value. */
    function scaleBadgeHtml(stat) {
        if (!stat || !Number.isFinite(Number(stat.emberScale)) || Number(stat.emberScale) === 1) return '';
        const pct = Math.round((Number(stat.emberScale) - 1) * 100);
        return ` <span style="color:${pct > 0 ? EMBER_CORRUPTION_TONE : '#9aa3ad'}; font-weight:700;">🔥${pct > 0 ? '+' : ''}${pct}%</span>`;
    }
    /** The crafting workspace's note for a baked line ('불길 +12%'), '' otherwise. */
    function scaleNote(stat) {
        const pct = Math.round(((Number(stat && stat.emberScale) || 1) - 1) * 100);
        return pct ? `불길 ${pct > 0 ? '+' : ''}${pct}%` : '';
    }
    /** The crafting workspace card's ember lines. */
    function cardHtml(item) {
        if (!item || !item.burned) return '';
        const lines = (item.emberLines || []).map(line => lineHtml(line, '')).join(' / ');
        return `<div class="cl-base">🔥 타오른 장비${lines ? ` &ensp; ${lines}` : ''}</div>`;
    }
    return Object.freeze({ useState, use, ashPct, tooltipHtml, scaleBadgeHtml, scaleNote, cardHtml });
})();
safeExposeGlobals({ emberCorruptionUi });
