import { createAtlasBoard } from './domain/atlas-board.mjs';

const rules = createAtlasBoard({
    get contentProgression() { return contentProgression; },
    get atlas() { return atlas; },
    get _t() { return _t; },
    get ATLAS_BOARD() { return ATLAS_BOARD; }
});
const atlasBoard = rules;
safeExposeGlobals({ atlasBoard });
