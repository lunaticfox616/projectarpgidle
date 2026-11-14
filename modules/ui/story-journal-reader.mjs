import { journalReaderHtml } from './story-journal-markup.mjs';
import { listenView, releaseViewTarget } from './view-events.mjs';

/** Reading an unlocked entry does not queue notices, change progression or grant rewards. */
export function openEntry(runtime, id) {
    const { deps } = runtime, entry = deps.JOURNAL_DB[id];
    if (!entry || !deps.game.journalEntries.includes(id) || deps.document.getElementById('journal-reader')) return;
    const scenes = deps.STORY_JOURNAL_SCENES.filter(scene => scene.journal === id);
    const pages = scenes.length ? scenes : [{ title: entry.title, entry }];
    const reader = deps.document.createElement('dialog');
    runtime.reader = reader;
    reader.id = 'journal-reader';
    reader.classList.toggle('is-text-only', pages.every(page => !page.image));
    reader.setAttribute('aria-labelledby', 'journal-reader-title');
    reader.innerHTML = journalReaderHtml(runtime, entry, pages);
    listenView(runtime, reader, 'close', () => closeJournalReader(runtime, reader));
    listenView(runtime, reader, 'click', event => { if (event.target.closest('[data-journal-close]')) reader.close(); });
    listenView(runtime, reader, 'keydown', event => { if (event.key === 'Escape') event.stopPropagation(); });
    deps.document.body.appendChild(reader);
    try { reader.showModal(); }
    catch (error) { closeJournalReader(runtime, reader); throw error; }
}

export function closeJournalReader(runtime, reader = runtime.reader) {
    if (!reader) return;
    releaseViewTarget(runtime, reader);
    if (reader.open) reader.close();
    reader.remove();
    if (runtime.reader === reader) runtime.reader = null;
}
