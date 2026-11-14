import { createChronicle } from './domain/chronicle.mjs';
import { runRuntimeEventCommands } from './ui/runtime-event-commands.mjs';

const rules = createChronicle({
    get CHRONICLE() { return CHRONICLE; },
    get JOURNAL_ENTRY_ORDER() { return JOURNAL_ENTRY_ORDER; },
    get JOURNAL_DB() { return JOURNAL_DB; },
    get UNIQUE_CODEX_KEYS() { return UNIQUE_CODEX_KEYS; },
    get weaponMastery() { return weaponMastery; },
    get WEAPON_MASTERY() { return WEAPON_MASTERY; },
    get TALISMAN_UNIQUE_DB() { return TALISMAN_UNIQUE_DB; },
    get TALISMAN_WILD_UNIQUE_DB() { return TALISMAN_WILD_UNIQUE_DB; },
    get STUMP_BOX_HARVEST() { return STUMP_BOX_HARVEST; },
    get STUMP_BOX_COLORS() { return STUMP_BOX_COLORS; },
    get OCEAN_FISH_DB() { return OCEAN_FISH_DB; },
    get bossVariants() { return bossVariants; },
    get BOSS_VARIANTS() { return BOSS_VARIANTS; }
});
const chronicle = Object.freeze({ ...rules,
    check: state => runRuntimeEventCommands(rules.check(state), dispatchRuntimeEvent)
});
safeExposeGlobals({ chronicle });
