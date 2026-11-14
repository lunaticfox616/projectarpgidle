import { createTalismans } from './domain/talismans.mjs';

const rules = createTalismans({
    get TALISMAN_CONDITION_POOL() { return TALISMAN_CONDITION_POOL; },
    get TALISMAN_STAT_POOL() { return TALISMAN_STAT_POOL; },
    get getStatName() { return getStatName; },
    get TALISMAN_UNSEAL_RULES() { return TALISMAN_UNSEAL_RULES; },
    get _t() { return _t; },
    get TALISMAN_ELEMENT_FOCUS() { return TALISMAN_ELEMENT_FOCUS; },
    get TALISMAN_UNIQUE_DB() { return TALISMAN_UNIQUE_DB; },
    get TALISMAN_WILD_UNIQUE_DB() { return TALISMAN_WILD_UNIQUE_DB; },
    get contentProgression() { return contentProgression; },
    get stumpBox() { return stumpBox; },
    get TALISMAN_WILD_DROPS() { return TALISMAN_WILD_DROPS; },
    get TALISMAN_SHARD_EXCHANGE() { return TALISMAN_SHARD_EXCHANGE; },
    get TALISMAN_WAX_COPY_PCT() { return TALISMAN_WAX_COPY_PCT; },
    get TALISMAN_CONDITION_EFFECTS() { return TALISMAN_CONDITION_EFFECTS; },
    get TALISMAN_HEX_RULES() { return TALISMAN_HEX_RULES; },
    get TALISMAN_CONDITION_WHEN() { return TALISMAN_CONDITION_WHEN; },
    get formatValue() { return formatValue; }
});
const talismans = Object.freeze({
    ...rules,
    wildDropsOpen: (state = game) => rules.wildDropsOpen(state),
    unseal: (source, state = game, random = Math.random) => rules.unseal(source, state, random),
    exchange: (index, state = game) => rules.exchange(index, state),
    wax: (id, state = game) => rules.wax(id, state),
    turn: (id, state = game) => rules.turn(id, state)
});
safeExposeGlobals({ talismans });
