import { setAutoShow, syncStoryScenes, foldPassedScenes } from './story-journal-actions.mjs';
import { openEntry, closeJournalReader } from './story-journal-reader.mjs';
import { filter, refreshArchiveFilter } from './story-journal-filter.mjs';
import { getJournalEntryAction, openJournalEntryAction } from './journal-navigation.mjs';
import { getJournalEntryAvailability, journalRewardText, getJournalLockedHint, getJournalCategory } from './journal-queries.mjs';
import { resetStoryJournalForSave, syncStoryJournalOwner } from './story-journal-lifetime.mjs';
import { installStoryJournalEvents } from './story-journal-events.mjs';
import { releaseViewEvents } from './view-events.mjs';

/** A single reader/filter/event owner. Narrative history is changed only through the scene rules. */
export function createStoryJournalView(deps) {
    const runtime = { deps, owner: deps.game, archiveOwner: null, category: '전체', includeConditions: false, reader: null, active: true, handlers: {}, listeners: [] };
    const handlers = { sync: syncStoryScenes, openEntry, filter, refreshArchiveFilter, setAutoShow,
        foldPassedScenes, openJournalEntryAction, resetForSave: resetStoryJournalForSave };
    for (const [name, handler] of Object.entries(handlers)) {
        runtime.handlers[name] = (...args) => { if (syncStoryJournalOwner(runtime)) return handler(runtime, ...args); };
    }
    const queries = {};
    for (const [name, handler] of Object.entries({ getJournalEntryAction, getJournalEntryAvailability, journalRewardText, getJournalLockedHint, getJournalCategory })) {
        queries[name] = (...args) => handler(runtime, ...args);
    }
    installStoryJournalEvents(runtime);
    return Object.freeze({ ...runtime.handlers, ...queries,
        dispose() {
            if (!runtime.active) return;
            closeJournalReader(runtime);
            releaseViewEvents(runtime);
        }
    });
}
