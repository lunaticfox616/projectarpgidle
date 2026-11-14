// One instance per battle runtime, shared by combat and its read-only view API.
// Weak keys prevent casts from leaking into replacement enemies or restored exploration runs.
export function createBossMoveMemory() {
    return { live: [], shifts: new WeakMap(), phases: new WeakMap(), splits: new WeakMap(),
        floors: new WeakMap(), seals: new WeakMap(), merged: new WeakMap(), division: null };
}
