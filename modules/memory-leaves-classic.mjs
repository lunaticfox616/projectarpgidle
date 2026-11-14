import { createMemoryLeaves } from './domain/memory-leaves.mjs';
import { consumeDomainCommands } from './common/consume-commands.mjs';

const rules = createMemoryLeaves({
    get MEMORY_LEAVES() { return MEMORY_LEAVES; },
    get _t() { return _t; },
    get atlas() { return atlas; }
});
const effects = { unlockLeafJournal: (...args) => unlockJournalEntry(...args) };
const memoryLeaves = Object.freeze({ ...rules,
    receive: (state, id) => consumeDomainCommands(rules.receive(state, id), effects)
});
safeExposeGlobals({ memoryLeaves });
