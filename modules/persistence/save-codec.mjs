import * as values from './save-values.mjs';

const RUNTIME_ONLY_SAVE_KEYS = Object.freeze(['talentCardRuntime', 'lastCombatStats', 'lastCombatStatsAt']);

/** Save encoding does not write to storage or mutate the live game. */
export class SaveCodec {
    constructor(owner, deps) { this.owner = owner; this.deps = deps; }

    dropRuntimeOnlySaveFields(target) {
        RUNTIME_ONLY_SAVE_KEYS.forEach(key => delete target[key]);
    }

    createSaveSnapshot(sourceGame) {
        let snapshot = JSON.parse(JSON.stringify(this.deps.itemSaveSlim.slimTree(sourceGame || this.owner.game || {})));
        snapshot.craftingWorkspace = this.deps.craftingWorkspaceState.normalize(snapshot.craftingWorkspace, snapshot.currencies);
        snapshot.actExploration = this.deps.actExplorationRooms.seal(snapshot.actExploration);
        this.dropRuntimeOnlySaveFields(snapshot);
        if (!snapshot.saveMeta || typeof snapshot.saveMeta !== 'object') snapshot.saveMeta = {};
        return snapshot;
    }

    serializeSaveState(sourceGame) {
    // 로컬 저장은 직렬화된 문자열만 필요하다. 깊은 복제 후 다시 문자열화하면 큰 인벤토리에서
    // 같은 상태를 두 번 순회하고 대량의 임시 객체를 만들어 주기적인 GC 끊김을 유발한다.
        let root = sourceGame || this.owner.game || {};
        let serializable = root && typeof root === 'object' ? { ...root } : {};
        serializable.craftingWorkspace = this.deps.craftingWorkspaceState.normalize(root.craftingWorkspace, root.currencies);
        serializable.actExploration = this.deps.actExplorationRooms.seal(root.actExploration);   // 방 단위 탐험: 앞선 판이 탐험만 버리고 읽는 모양으로
        this.dropRuntimeOnlySaveFields(serializable);
        return JSON.stringify(this.deps.itemSaveSlim.slimTree(serializable));   // 장비 줄은 다시 만들 수 있는 칸을 뺀 복사본으로(js/item-save-slim.js)
    }

    createCloudSavePayload(sourceGame) {
        return this.createSaveSnapshot(this.createCloudSaveState(sourceGame || this.owner.game || {}));
    }

    createCloudSaveState(root) {
    // Persistent exploration resumes its exact enemies, casts and debuffs on every device.
    // A shallow projection avoids copying the full roster on every cloud save.
        if(root.actExploration)return {...root,combatLog:[],battlefieldEnemySprites:{},dotFxThrottle:{}};
        // 최상위만 얕게 복사하고 런타임 필드를 덮어쓴 뒤 한 번만 문자열화한다.
        // 중첩 인벤토리/장비를 깊은 복제하지 않으므로 클라우드 자동 저장 순간의 GC 부하도 줄어든다.
        let payload = {
            ...root,
            saveMeta: root.saveMeta && typeof root.saveMeta === 'object' ? root.saveMeta : {},
            enemies: [],
            encounterPlan: [],
            encounterIndex: Math.max(0, Math.floor(Number(root.encounterIndex) || 0)),
            nextEnemyId: Math.max(1, Math.floor(Number(root.nextEnemyId) || 1)),
            combatLog: [],
            recentDamageEvents: [],
            pendingSlamEchoHits: [],
            dotFxThrottle: {},
            battlefieldEnemySprites: {},
            enemyConditionDebuffs: {},
            enemyKeystoneDebuffs: {},
            rangerWeakpointMarks: {},
            enemyUniqueChaosResDown: {},
            enemyUniqueElementalResDown: {},
            playerAilments: Array.isArray(root.playerAilments) ? root.playerAilments.slice(0, 40) : [],
            playerLeechInstances: Array.isArray(root.playerLeechInstances) ? root.playerLeechInstances.slice(0, 80) : [],
            realmDeathWard: null,
            realmInvulnerableBarrierUntil: 0
        };
        this.dropRuntimeOnlySaveFields(payload);
        return payload;
    }

    /** The everyday cloud sync's save data, in the shape of the local save and the leaving upload (serializeSaveState, createSaveSnapshot):
 * the workbench tidied, a room stage run sealed (this body alone skipped both, 2026-10-20) and the runtime-only fields dropped. The
 * "nothing changed" check compares prints of this shape (js/cloud-save-ui.js isCloudSaveUnchangedSinceUpload). */
    createCloudSyncPayload(sourceGame) {
        const payload=this.createCloudSaveState(sourceGame || this.owner.game || {});
        payload.craftingWorkspace = this.deps.craftingWorkspaceState.normalize(payload.craftingWorkspace, payload.currencies);
        payload.actExploration = this.deps.actExplorationRooms.seal(payload.actExploration);
        this.dropRuntimeOnlySaveFields(payload);
        return this.deps.itemSaveSlim.slimTree(payload);   // 올리는 본문과 그 지문(cloudSaveFingerprint)이 같은 축약 모양을 쓴다
    }

    createCloudSaveRequestBody(userId, sourceGame) {
        return JSON.stringify({ user_id: userId, save_data: this.createCloudSyncPayload(sourceGame) });
    }

    /** Content print of a cloud save without what moves while nothing happens: saveMeta (save times), the stall clock
 * (playerStall.lastAt) and talentCardRuntime (never uploaded). Equal prints mean an upload would change nothing. */
    cloudSaveFingerprint(saveData) {
        return values.printOfSaveText(JSON.stringify(values.cloudSavePrintSource(saveData)));
    }

    /** The same print with object keys sorted. The server keeps saves as jsonb, which reorders keys, so a body read back from the server is
 * compared with this device's copy this way (js/cloud-save-ui.js pullAccountSave). Slower than cloudSaveFingerprint: once per account entry. */
    cloudSaveContentPrint(saveData) {
        return values.printOfSaveText(JSON.stringify(values.cloudSavePrintSource(saveData), values.sortSaveKeys));
    }
}
