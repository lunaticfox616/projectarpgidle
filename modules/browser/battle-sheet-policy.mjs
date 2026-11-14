import { isLocalFileProtocol } from './battle-image-environment.mjs';
import { sanitizeBattleSheet } from './battle-sheet-matte.mjs';
import { sanitizeLocalMonsterBackdropSheet } from './battle-monster-matte.mjs';
import { sanitizeWhiteBackdropSheet } from './battle-white-matte.mjs';

export function isPreCleanedBattleSheet(key) {
    return key === 'enemies' || key === 'summon1' || key.startsWith('bossAct');
}

export function cleanLoadedBattleSheet(inputs, key, image) {
    if (!inputs.ENABLE_BATTLE_SHEET_SANITIZATION || isLocalFileProtocol(inputs)) return image;
    try {
        const sanitized = sanitizeBattleSheet(inputs, image);
        return key === 'enemies' ? sanitizeLocalMonsterBackdropSheet(inputs, sanitizeWhiteBackdropSheet(inputs, sanitized)) : sanitized;
    } catch {
        return image;
    }
}

export function shouldPreserveOriginalBattleSheet(key) {
    return isPreCleanedBattleSheet(key)
        || key === 'tiles'
        || key.startsWith('hero')
        || key.startsWith('playerClass')
        || key.startsWith('bossTelegraph')
        || key.startsWith('skillFx')
        || key.startsWith('passiveTree');
}
