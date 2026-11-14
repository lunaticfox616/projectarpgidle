import { closeJournalReader } from './story-journal-reader.mjs';

export function resetStoryJournalForSave(runtime) {
    closeJournalReader(runtime);
    runtime.owner = runtime.deps.game;
    runtime.category = '전체';
    runtime.includeConditions = false;
}

export function syncStoryJournalOwner(runtime) {
    if (!runtime.active) return false;
    if (runtime.owner !== runtime.deps.game) resetStoryJournalForSave(runtime);
    return true;
}
