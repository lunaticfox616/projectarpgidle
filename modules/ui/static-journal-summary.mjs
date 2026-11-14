import { getJournalHint } from './static-journal-hints.mjs';
import { categoryOrder } from './static-ui-data.mjs';

export function renderJournalNextTarget(runtime, model) {
    const { availableEntries, unlockedCount, entries } = model;
    let nextLocked = availableEntries[0];
    let nextTarget = '';
    if (nextLocked) {
        let nextAction = runtime.deps.storyJournalUi.getJournalEntryAction(nextLocked.id);
        let nextTitle = nextLocked.def.hidden ? '숨겨진 기록' : nextLocked.def.title;
        nextTarget = `<div class="journal-next-target">
                <div><span>${(0, runtime.deps._t)('확인 가능한 해금 조건 {length}개', { length: availableEntries.length })}</span><strong>${nextTitle}</strong><small>${getJournalHint(runtime, nextLocked.id, nextLocked.def)}${availableEntries.length > 1 ? (0, runtime.deps._t)(', 다른 조건 {value}개', { value: availableEntries.length - 1 }) : ''}</small></div>
                ${nextAction ? `<button type="button" data-journal-action="${nextLocked.id}">${(0, runtime.deps._t)(nextAction.label)}</button>` : ''}
            </div>`;
    } else if (unlockedCount === entries.length && entries.length > 0) {
        nextTarget = `<div class="journal-next-target is-complete"><div><span>${(0, runtime.deps._t)('기록 완성')}</span><strong>${(0, runtime.deps._t)('모든 저널을 해금했습니다.')}</strong><small>${(0, runtime.deps._t)('영구 효과와 세계의 단서가 모두 활성화되었습니다.')}</small></div></div>`;
    }
    return nextTarget;
}

export function renderStaticJournalSummary(runtime, model) {
    const { entries, categoryCounts, standardEntries, hiddenEntries, unlockedCount, standardUnlockedCount, hiddenUnlockedCount, rewardCount, progressPct } = model;
    const nextTarget = renderJournalNextTarget(runtime, model);
    let summary = `<div class="journal-summary">
            <div class="journal-summary-main">
                <div><strong>${(0, runtime.deps._t)('주요 기록 {standardUnlockedCount}/{length}', { standardUnlockedCount, length: standardEntries.length })}</strong><span>${(0, runtime.deps._t)('전체 {unlockedCount}/{length}, 숨겨진 기록 {hiddenUnlockedCount}/{length2}, 영구 효과 {rewardCount}개', { unlockedCount, length: entries.length, hiddenUnlockedCount, length2: hiddenEntries.length, rewardCount })}</span></div>
                <b>${progressPct}%</b>
            </div>
            <div class="journal-progress"><i style="width:${progressPct}%"></i></div>
            <div class="journal-category-strip" role="group" aria-label="${(0, runtime.deps._t)('저널 분류')}"><button type="button" data-journal-filter="전체">${(0, runtime.deps._t)('전체')}</button>${categoryOrder.filter(name => categoryCounts[name]).map(name => {
        let count = categoryCounts[name];
        return `<button type="button" data-journal-filter="${name}">${(0, runtime.deps._t)(name)} <b>${count.unlocked}</b></button>`;
    }).join('')}</div>
            <label class="journal-conditions"><input type="checkbox" data-journal-conditions> ${(0, runtime.deps._t)('해금 조건 보기')}</label>
        </div>${nextTarget}<p class="journal-empty" hidden>${(0, runtime.deps._t)('아직 획득한 기록이 없습니다.')}</p>`;
    return summary;
}
