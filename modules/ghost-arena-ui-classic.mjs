import { GhostArenaState } from './state/ghost-arena.mjs';
import { GhostArenaView } from './ui/ghost-arena-view.mjs';
import { GhostArena } from './application/ghost-arena.mjs';
import { CloudAccountRequest } from './application/cloud-account-request.mjs';

const deps = {
    get _t() { return _t; },
    get closePlayerProfile() { return closePlayerProfile; },
    get console() { return console; },
    get document() { return document; },
    get escapeHTML() { return escapeHTML; },
    get game() { return window.GameModules.state.game; },
    get getGhostCombatSnapshot() { return typeof getGhostCombatSnapshot === 'undefined' ? undefined : getGhostCombatSnapshot; },
    get getGhostCombatVersion() { return getGhostCombatVersion; },
    get getMyNickname() { return getMyNickname; },
    get ghostDuelStage() { return ghostDuelStage; },
    get promptAndSetNickname() { return promptAndSetNickname; },
    get restoreNicknameFromServer() { return restoreNicknameFromServer; },
    get showGameToast() { return showGameToast; },
    get socialClassLabel() { return socialClassLabel; },
    get socialCloudReady() { return socialCloudReady; },
    get socialLoggedInUserId() { return socialLoggedInUserId; },
    get socialState() { return socialState; },
    get switchMapSubtab() { return switchMapSubtab; },
    get switchTab() { return switchTab; },
    get uploadPlayerProfile() { return uploadPlayerProfile; },
};
const owner = new GhostArenaState();
const view = new GhostArenaView(deps, owner);
const session = new CloudAccountRequest(window.GameModules.cloudAccountState, owner, (path, options) => cloudJsonRequest(path, options));
const arena = new GhostArena(deps, owner, view, session);

// UI/application entry: server transport and display are not part of the combat domain.
// Remove these aliases when remaining classic and template consumers use the composition directly.
window.GameModules.ghostArena = Object.freeze({
    dispose: () => arena.dispose(),
    loadGhostArena: arena.loadGhostArena.bind(arena),
    registerMyGhost: arena.registerMyGhost.bind(arena),
    fightRandomGhost: arena.fightRandomGhost.bind(arena),
    fightCurrentProfileGhost: arena.fightCurrentProfileGhost.bind(arena),
    fightSelectedProfileGhost: arena.fightSelectedProfileGhost.bind(arena),
    playGhostDuel: arena.playGhostDuel.bind(arena),
    renderGhostArena: arena.renderGhostArena.bind(arena),
    injectGhostArenaStyles: arena.injectGhostArenaStyles.bind(arena),
});
safeExposeGlobals({
    loadGhostArena: window.GameModules.ghostArena.loadGhostArena,
    registerMyGhost: window.GameModules.ghostArena.registerMyGhost,
    fightRandomGhost: window.GameModules.ghostArena.fightRandomGhost,
    fightCurrentProfileGhost: window.GameModules.ghostArena.fightCurrentProfileGhost,
    fightSelectedProfileGhost: window.GameModules.ghostArena.fightSelectedProfileGhost,
    playGhostDuel: window.GameModules.ghostArena.playGhostDuel,
    renderGhostArena: window.GameModules.ghostArena.renderGhostArena,
    injectGhostArenaStyles: window.GameModules.ghostArena.injectGhostArenaStyles,
});
arena.install();
