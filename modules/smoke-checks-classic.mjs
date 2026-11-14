import { checkRuntimeIntegrity } from './application/runtime-integrity.mjs';

// The existing startup diagnostic still checks the classic consumer contract.
const globalRoot = typeof window !== 'undefined' ? window : globalThis;
const contracts = Object.create(globalRoot, {
    MAP_ZONES: { get() {
        return globalRoot.MAP_ZONES ?? (typeof MAP_ZONES === 'undefined' ? undefined : MAP_ZONES);
    } }
});
globalRoot.runModuleIntegrityChecks = () => checkRuntimeIntegrity(contracts, console);
