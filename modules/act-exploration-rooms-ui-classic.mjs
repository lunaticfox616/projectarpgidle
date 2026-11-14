import { createExplorationRoomsView } from './ui/exploration-rooms-view.mjs';
const actExplorationRoomsUi = createExplorationRoomsView({
    get actExplorationRooms() { return actExplorationRooms; },
    get game() { return window.GameModules.state.game; },
    get actExplorationState() { return actExplorationState; },
    get actExplorationMap() { return actExplorationMap; },
    get document() { return document; }
});
safeExposeGlobals({ actExplorationRoomsUi });
