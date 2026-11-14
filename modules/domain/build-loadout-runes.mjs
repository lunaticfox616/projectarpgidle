import { runePresetNormalizeRuneLoadout } from './rune-loadout-record.mjs';
import { runePresetCaptureRuneLoadout, runePresetApplyRuneLoadout, runePresetSameRuneLoadout } from './rune-loadout-choices.mjs';
import { runePresetInspectRuneLoadout } from './rune-loadout-inspection.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
export function createRuneLoadouts(deps) {
    const env = { deps };

    return Object.freeze({ normalize: runePresetNormalizeRuneLoadout, capture: (...args) => runePresetCaptureRuneLoadout(env, ...args), apply: runePresetApplyRuneLoadout, equals: (...args) => runePresetSameRuneLoadout(env, ...args), inspect: (...args) => runePresetInspectRuneLoadout(env, ...args) });
}
