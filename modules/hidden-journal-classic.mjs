import { createHiddenJournal } from './domain/hidden-journal.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createHiddenJournal();
const HIDDEN_JOURNAL_AILMENTS = rules.HIDDEN_JOURNAL_AILMENTS;
const effects = { unlockHiddenEntry: key => unlockJournalEntry(key) };
function startHiddenJournalBossRun(enemy, zone) { return rules.startHiddenJournalBossRun(enemy, zone, game); }
function restartHiddenJournalBossRun(enemy, zone) { return rules.restartHiddenJournalBossRun(enemy, zone, game); }
function trackHiddenJournalPlayerDamage(amount) { return rules.trackHiddenJournalPlayerDamage(amount, game); }
function trackHiddenJournalAilment(type, enemy) { return rules.trackHiddenJournalAilment(type, enemy, game); }
function completeHiddenJournalBossRun(enemy, zone, playerStats) {
    return consumeDomainCommands(rules.completeHiddenJournalBossRun(enemy, zone, playerStats, game), effects);
}
function resetHiddenJournalBossRun() { return rules.resetHiddenJournalBossRun(game); }
safeExposeGlobals({ startHiddenJournalBossRun, restartHiddenJournalBossRun, trackHiddenJournalPlayerDamage,
    trackHiddenJournalAilment, completeHiddenJournalBossRun, resetHiddenJournalBossRun, HIDDEN_JOURNAL_AILMENTS });
