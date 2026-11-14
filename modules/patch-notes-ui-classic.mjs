import { createPatchNotesView } from './ui/patch-notes-view.mjs';

const patchNotesView = createPatchNotesView({
    get document() { return document; },
    get console() { return console; },
    get AbortController() { return AbortController; },
    get escapeHTML() { return escapeHTML; },
    _t: function patchNotesTranslate(...args) { return _t(...args); },
    fetch: function patchNotesFetch(...args) { return fetch(...args); }
});
window.GameModules.patchNotesView = patchNotesView;
safeExposeGlobals({ openPatchNotes: patchNotesView.open, closePatchNotes: patchNotesView.close, renderPatchNotes: patchNotesView.render });
