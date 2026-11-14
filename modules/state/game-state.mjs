/** The current save and transient session counters have one owner. Only `game` is serialized.
 * A replacement save does not implicitly reset clocks: load/replay boundaries restore them explicitly. */
export class GameRuntimeState {
    constructor(game, readDefaults) {
        this.game = game;
        this.readDefaults = readDefaults;
        this.defaultDefinitions = undefined;
        this.session = null;
        // Presentation/startup flags are session state, never part of the serialized game.
        this.controls = {
            startupOverlayActive: true, gameplayStarted: false, gameEntryRunning: false,
            pendingMapRevealZoneId: null, pendingMapRevealToken: 0,
            backgroundCombatRuntime: {
                hiddenAtMs: 0, snapshot: null, signature: '', processing: false, failed: false,
                accelerationTier: 0, finishRequested: false, offlineSettledSlots: [],
                appInactive: false, launchSettlementPending: false
            },
            mouseX: 0, mouseY: 0, pendingHeavyUiRefresh: false, crowdPauseActive: false,
            activeTutorial: null, activeTutorialStep: 0
        };
        this.tutorialQueue = [];
    }

    get defaultGame() {
        return this.defaultDefinitions === undefined ? this.readDefaults() : this.defaultDefinitions;
    }

    /** Called once at the original initial-game creation point.
     * pTimer: accumulated attack charge (1 = one attack); progressStallTicks: 100 ms ticks;
     * itemIdCounter: last allocated item identity; lastTime: wall time in milliseconds. */
    startSession(game, nowMs) {
        this.game = game;
        this.session = { pTimer: 0, progressStallTicks: 0, itemIdCounter: 0, lastTime: nowMs };
    }
}

/** The loop challenge is saved progression; preserve an existing challenge unchanged. */
export function initializeLoopChallenge(owner, nowMs = Date.now()) {
    if (owner.loopChallenge) return;
    const loopTier = Math.max(1, Math.floor(owner.loopCount || owner.season || 1));
    owner.loopChallenge = {
        id: `loop-${nowMs}`, tier: loopTier, targetKills: 50 + (loopTier * 10),
        kills: 0, completed: false, rewardClaimed: false
    };
}
