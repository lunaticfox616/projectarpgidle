import { createWorldTreeBark } from './domain/world-tree-bark.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createWorldTreeBark({
    get WORLD_TREE_BARK() { return WORLD_TREE_BARK; },
    get getWorldTreeBarkEarned() { return getWorldTreeBarkEarned; },
    get ensureRecordsState() { return ensureRecordsState; },
    get _t() { return _t; },
    get PINNACLE_FIRST_KILL_JOURNALS() { return PINNACLE_FIRST_KILL_JOURNALS; }
});
const effects = {
    barkNotify: (...args) => dispatchRuntimeEvent(...args),
    barkGrantCurrency: (...args) => commitCurrencyGain(...args),
    barkTutorial: (...args) => queueTutorialNotice(...args)
};
const worldTreeBark = Object.freeze({
    ...rules,
    noteActTenClear: zone => consumeDomainCommands(rules.noteActTenClear(game, zone), effects),
    rewardPinnacleFirstKill: entryId => consumeDomainCommands(rules.rewardPinnacleFirstKill(entryId), effects),
    noticeFirstBark: () => consumeDomainCommands(rules.noticeFirstBark(game), effects)
});
safeExposeGlobals({ worldTreeBark });
