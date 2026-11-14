import { hiddenStartHiddenJournalBossRun, hiddenRestartHiddenJournalBossRun, hiddenTrackHiddenJournalPlayerDamage, hiddenTrackHiddenJournalAilment, hiddenCompleteHiddenJournalBossRun, hiddenResetHiddenJournalBossRun } from './hidden-journal-rules.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createHiddenJournal() {
    const env = {};
    env.HIDDEN_JOURNAL_AILMENTS = new Set(['ignite', 'chill', 'freeze', 'shock', 'poison', 'bleed']);
    return Object.freeze({
        startHiddenJournalBossRun: hiddenStartHiddenJournalBossRun,
        restartHiddenJournalBossRun: hiddenRestartHiddenJournalBossRun,
        trackHiddenJournalPlayerDamage: hiddenTrackHiddenJournalPlayerDamage,
        trackHiddenJournalAilment: (...args) => hiddenTrackHiddenJournalAilment(env, ...args),
        completeHiddenJournalBossRun: hiddenCompleteHiddenJournalBossRun,
        resetHiddenJournalBossRun: hiddenResetHiddenJournalBossRun,
        HIDDEN_JOURNAL_AILMENTS: env.HIDDEN_JOURNAL_AILMENTS
    });
}
