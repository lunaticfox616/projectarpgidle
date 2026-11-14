import { journalReachedTimeRiftFusion, journalRepairEntriesFromProgress } from './journal-recovery.mjs';
import { journalGetClaimedPassivePointTotal, journalRebuildBonusStateForLoad, journalGrantBonus } from './journal-bonuses.mjs';
import { journalUnlockEntry, journalEnsureActCompletionForLoop } from './journal-unlocks.mjs';

/** Journal state and reward claims belong to the supplied save, independently of the rendered game. */
export function createJournalProgress(deps) {
    const env = { deps };
    return Object.freeze({
        reachedTimeRiftFusion: journalReachedTimeRiftFusion,
        repairJournalEntriesFromProgress: (...args) => journalRepairEntriesFromProgress(env, ...args),
        getClaimedJournalPassivePointTotal: (...args) => journalGetClaimedPassivePointTotal(env, ...args),
        rebuildJournalBonusStateForLoad: (...args) => journalRebuildBonusStateForLoad(env, ...args),
        grantJournalBonus: (...args) => journalGrantBonus(env, ...args),
        unlockJournalEntry: (...args) => journalUnlockEntry(env, ...args),
        ensureActJournalCompletionForLoop: (...args) => journalEnsureActCompletionForLoop(env, ...args)
    });
}
