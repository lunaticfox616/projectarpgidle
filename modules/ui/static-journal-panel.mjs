import { getStaticJournalModel } from './static-journal-model.mjs';
import { renderStaticJournalSummary } from './static-journal-summary.mjs';
import { renderStaticJournalCards } from './static-journal-cards.mjs';

export function renderStaticJournal(runtime, journalList) {
    if (!journalList) return;
    const model = getStaticJournalModel(runtime);
    const summary = renderStaticJournalSummary(runtime, model);
    const cards = renderStaticJournalCards(runtime, model);
    let journalHtml = summary + cards;
    const changed = journalList.__lastHtml !== journalHtml;
    if (changed) {
        journalList.innerHTML = journalHtml;
        journalList.__lastHtml = journalHtml;
    }
    runtime.deps.storyJournalUi.refreshArchiveFilter(changed);
}
