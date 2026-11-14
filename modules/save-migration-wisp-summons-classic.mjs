import { LegacySummonMigration, mergeGrownGemRecords } from './persistence/legacy-summon-migration.mjs';

const instance=new LegacySummonMigration({
    get LEGACY_SUMMON_GEM_TO_WISP() { return LEGACY_SUMMON_GEM_TO_WISP; },
    get RETIRED_GEM_SUCCESSORS() { return RETIRED_GEM_SUCCESSORS; },
    get GEM_SKY_ENHANCEMENTS() { return GEM_SKY_ENHANCEMENTS; }
});
window.GameModules.legacySummons=instance;
safeExposeGlobals({mergeGrownGemRecords,migrateLegacySummonGemSave:instance.migrateLegacySummonGemSave});
