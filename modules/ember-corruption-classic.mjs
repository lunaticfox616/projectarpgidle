import { createEmberCorruption } from './domain/ember-corruption.mjs';

const rules = createEmberCorruption({
    get EMBER_CORRUPTION_LINES() { return EMBER_CORRUPTION_LINES; },
    get EMBER_BURN_OUTCOMES() { return EMBER_BURN_OUTCOMES; },
    get EMBER_CORRUPTION_RULES() { return EMBER_CORRUPTION_RULES; },
    get getStatName() { return getStatName; },
    get formatValue() { return formatValue; },
    get EMBER_KILL_DROPS() { return EMBER_KILL_DROPS; },
    get _t() { return _t; }
});
const emberCorruption = rules;
safeExposeGlobals({ emberCorruption });
