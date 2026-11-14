import { createSelectionDialog } from './browser/selection-dialog.mjs';
// Remove after all overlay consumers import the application's one selection-dialog instance.
const selectionDialog = createSelectionDialog({ window, document }, (...args) => _t(...args));
safeExposeGlobals({ selectionDialog });
