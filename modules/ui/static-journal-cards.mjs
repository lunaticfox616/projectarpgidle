import { getJournalHint } from './static-journal-hints.mjs';
import { categoryOrder } from './static-ui-data.mjs';

export function renderStaticJournalCard(runtime, model, entry) {
    const { id, def, isUnlocked, availability, available, displayTitle, rewardText, action, stateLabel, lockedHint } = journalCardPresentation(runtime, model, entry);
    return `<article class="journal-card ${isUnlocked ? 'is-unlocked' : 'is-locked'} is-${availability} ${def.hidden ? 'is-hidden' : ''}">
                        ${isUnlocked ? `<button type="button" class="journal-card-head journal-entry-open" data-journal-entry="${id}"><strong>${displayTitle}</strong><span>${(0, runtime.deps._t)('읽기 ›')}</span></button>` : `<div class="journal-card-head"><strong>${displayTitle}</strong><span>${stateLabel}</span></div>`}
                        <div class="journal-card-body">${isUnlocked
        ? ''
        : (available ? `<p class="journal-hint">${getJournalHint(runtime, id, def)}</p>` : `<p class="journal-hint">${lockedHint}</p>`)}</div>
                        ${rewardText ? `<div class="journal-reward ${isUnlocked ? '' : 'is-preview'}">${isUnlocked ? (0, runtime.deps._t)('영구 효과') : (0, runtime.deps._t)('기록 보상')}, ${rewardText}</div>` : ''}
                        ${action ? `<button type="button" class="journal-card-action" data-journal-action="${id}">${(0, runtime.deps._t)(action.label)}</button>` : ''}
                    </article>`;
}

function journalCardPresentation(runtime, model, entry) {
    const { unlocked, availabilityById } = model;
    const { id, def } = entry;
    let isUnlocked = unlocked.has(id);
    let availability = availabilityById.get(id);
    let available = availability === 'available';
    let displayTitle = isUnlocked || available ? (0, runtime.deps._t)(def.title) : (def.hidden ? (0, runtime.deps._t)('히든 저널, ???') : (0, runtime.deps._t)('미확인 기록'));
    let rewardText = runtime.deps.storyJournalUi.journalRewardText(def, isUnlocked || available);
    let action = available ? runtime.deps.storyJournalUi.getJournalEntryAction(id) : null;
    let stateLabel = isUnlocked ? (0, runtime.deps._t)('해금') : (0, runtime.deps._t)('해금 필요');
    let lockedHint = runtime.deps.storyJournalUi.getJournalLockedHint(availability, id);
    return { id, def, isUnlocked, availability, available, displayTitle, rewardText, action, stateLabel, lockedHint };
}

export function renderStaticJournalCards(runtime, model) {
    const { entries, unlocked } = model;
    let cards = categoryOrder.map(category => {
        let rows = entries.filter(({ id }) => runtime.deps.storyJournalUi.getJournalCategory(id) === category);
        if (rows.length === 0) return '';
        return `<section class="journal-section" data-journal-category="${category}">
                <div class="journal-section-title">${(0, runtime.deps._t)(category)}<span>${rows.filter(({ id }) => unlocked.has(id)).length}/${rows.length}</span></div>
                <div class="journal-card-grid">${rows.map(entry => renderStaticJournalCard(runtime, model, entry)).join('')}</div>
            </section>`;
    }).join('');
    return cards;
}
