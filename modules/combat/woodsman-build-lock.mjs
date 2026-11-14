import { WOODSMAN_LOCKED_FIELDS, WOODSMAN_LOCKED_POINTS } from './core-values.mjs';

/** Capture the existing JSON save shape once when entering the locked fight. */
export function runSnapshotWoodsmanBuildState(env) {
    return JSON.parse(JSON.stringify({
        ...runWoodsmanSnapshotGrowth(env), ...runWoodsmanSnapshotGear(env), ...runWoodsmanSnapshotSupport(env)
    }));
}

function runWoodsmanSnapshotGrowth(env) {
    return {
        passives: env.owner.passives || [],
        passiveAttributePreference: env.owner.passiveAttributePreference || 'strength',
        passiveAttributeChoices: env.owner.passiveAttributeChoices || {},
        ascendNodes: env.owner.ascendNodes || [],
        ascendKeystones: env.owner.ascendKeystones || []
    };
}

function runWoodsmanSnapshotGear(env) {
    return {
        passivePoints: env.owner.passivePoints || 0,
        seasonPoints: env.owner.seasonPoints || 0,
        ascendPoints: env.owner.ascendPoints || 0,
        ascendKeystonePoints: env.owner.ascendKeystonePoints || 0,
        scour: env.owner.scour || 0,
        equipment: env.owner.equipment || {},
        inventory: env.owner.inventory || [],
        skills: env.owner.skills || [],
        activeSkill: env.owner.activeSkill || '기본 공격', mobilitySkill: env.owner.mobilitySkill
    };
}

function runWoodsmanSnapshotSupport(env) {
    return {
        supports: env.owner.supports || [],
        equippedSupports: env.owner.equippedSupports || [],
        ...env.deps.combatSupports.lockState(env.owner),
        supportGemData: env.owner.supportGemData || {},
        playerLeechInstances: env.owner.playerLeechInstances || [],
        playerRecoupInstances: env.owner.playerRecoupInstances || [],
        gemData: env.owner.gemData || {},
        jewelInventory: env.owner.jewelInventory || []
    };
}

/** Points earned during the woodsman fight stay (a level-up, the woodsman's journal reward): spending and refunds are refused while
 * locked (assertBuildEditable, activatePassivePath), so a pool above the snapshot can only be earned, and the snapshot follows it. The
 * lock used to put the entry pool back every tick (2026-10-20 hunt: a level-up point vanished on the next tick). */
export function runKeepEarnedWoodsmanPoints(env, snap) {
    for (const key of ['passivePoints', 'seasonPoints', 'ascendPoints', 'ascendKeystonePoints']) {
        const now = Math.floor(Number(env.owner[key]) || 0);
        if (now > Math.floor(Number(snap[key]) || 0)) snap[key] = now;
    }
}

export function runWoodsmanSnapshotPrint(env, snap) {
    let prints = env.memo.woodsmanSnapshotPrints.get(snap);
    if (prints) return prints;
    prints = {};
    for (const [field, fallback] of WOODSMAN_LOCKED_FIELDS) prints[field] = JSON.stringify(snap[field] || fallback);
    const lock = env.deps.combatSupports.lockState(snap);
    for (const key of Object.keys(lock)) prints[key] = JSON.stringify(lock[key]);
    env.memo.woodsmanSnapshotPrints.set(snap, prints);
    return prints;
}

/** Every tick of the fight: a field that drifted from the entry snapshot goes back to it. Only the drifted field is copied back
 * (2026-10-26: the whole build was deep-cloned into game ten times a second, so during the fight the bag, gear and gems were fresh
 * objects every tick, the per-object stat memos never hit, and a big bag made a few hundred KB of garbage per tick). */
export function runEnforceWoodsmanBuildLock(env) {
    if (!env.owner.woodsmanBuildLock || !env.owner.woodsmanBuildSnapshot) return;
    let snap = env.owner.woodsmanBuildSnapshot;
    runKeepEarnedWoodsmanPoints(env, snap);
    const prints = runWoodsmanSnapshotPrint(env, snap);
    env.owner.passiveAttributePreference = snap.passiveAttributePreference || 'strength';
    for (const key of WOODSMAN_LOCKED_POINTS) env.owner[key] = Math.floor(snap[key] || 0);
    env.owner.activeSkill = snap.activeSkill;
    env.owner.mobilitySkill = snap.mobilitySkill;
    runRestoreWoodsmanChangedFields(env, prints);
}

function runRestoreWoodsmanChangedFields(env, prints) {
    for (const [field, fallback] of WOODSMAN_LOCKED_FIELDS) {
        if (JSON.stringify(env.owner[field] || fallback) !== prints[field]) env.owner[field] = JSON.parse(prints[field]);
    }
    const lock = env.deps.combatSupports.lockState(env.owner);
    for (const key of Object.keys(lock)) {
        if (JSON.stringify(lock[key]) !== prints[key]) env.owner[key] = JSON.parse(prints[key]);
    }
}

export function runClearWoodsmanBuildLock(env) {
    env.owner.woodsmanEntrancePending = false;
    env.deps.resetWoodsmanCurse();
    if (env.owner.woodsmanBuildLock && env.owner.woodsmanBuildSnapshot) {
        // 마지막으로 스냅샷 기준으로 복원
        runEnforceWoodsmanBuildLock(env);
    }
    env.owner.woodsmanBuildLock = false;
    env.owner.woodsmanBuildSnapshot = null;
}
