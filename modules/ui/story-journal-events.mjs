import { listenView } from './view-events.mjs';
import { syncStoryJournalOwner } from './story-journal-lifetime.mjs';
import { refreshArchiveFilter } from './story-journal-filter.mjs';

export function installStoryJournalEvents(runtime) {
    const doc = runtime.deps.document, host = doc.getElementById('ui-journal-list');
    if (host) {
        listenView(runtime, host, 'click', event => clickJournal(runtime, event));
        listenView(runtime, host, 'change', event => {
            if (event.target.matches('[data-journal-conditions]') && acceptsJournalInput(runtime)) runtime.handlers.filter(undefined, event.target.checked);
        });
    }
    for (const id of ['chk-act-journal', 'chk-hide-act-journal']) {
        const input = doc.getElementById(id);
        if (input) listenView(runtime, input, 'change', () => {
            const owner = runtime.owner;
            if (syncStoryJournalOwner(runtime) && owner === runtime.owner) runtime.handlers.setAutoShow(id === 'chk-act-journal' ? input.checked : !input.checked);
        });
    }
}

function acceptsJournalInput(runtime) {
    if (!syncStoryJournalOwner(runtime)) return false;
    if (runtime.archiveOwner === runtime.deps.game) return true;
    refreshArchiveFilter(runtime);
    return false;
}

function clickJournal(runtime, event) {
    const target = event.target.closest('button');
    if (!target || target.disabled || !acceptsJournalInput(runtime)) return;
    if (target.dataset.journalEntry) runtime.handlers.openEntry(target.dataset.journalEntry);
    else if (target.dataset.journalAction) runtime.handlers.openJournalEntryAction(target.dataset.journalAction);
    else if (target.dataset.journalFilter) runtime.handlers.filter(target.dataset.journalFilter);
}
