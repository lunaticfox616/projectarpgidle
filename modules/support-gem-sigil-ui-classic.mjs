import { createSupportGemSigilView } from './ui/support-gem-sigil-view.mjs';
const supportGemSigil = createSupportGemSigilView({
    get getSupportRuneArtCell() { return getSupportRuneArtCell; },
    get renderPixelIcon() { return renderPixelIcon; },
    get getSupportRuneTone() { return getSupportRuneTone; },
    get escapeHTML() { return escapeHTML; }
});
safeExposeGlobals({ supportGemSigil });
