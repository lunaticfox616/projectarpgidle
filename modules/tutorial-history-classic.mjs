import { createTutorialHistory } from './state/tutorial-history.mjs';

const rules = createTutorialHistory({
    get STUMP_BOX_GRAFT() { return STUMP_BOX_GRAFT; },
    get tutorialNow() { return Date.now; },
    get TUTORIAL_SEEN_ALIASES() { return TUTORIAL_SEEN_ALIASES; },
    get tutorialQueue() { return tutorialQueue; }
});
window.GameModules.state.tutorials = rules;
