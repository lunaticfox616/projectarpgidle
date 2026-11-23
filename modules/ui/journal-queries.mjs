import { getJournalEntryAction, journalExplorationUnlocks } from './journal-navigation.mjs';
import { beyondUnlockPreview } from '../common/unlock-preview.mjs';

export function getJournalEntryAvailability(runtime, entry, unlockedIds) {
    const unlocked = new Set(Array.isArray(unlockedIds) ? unlockedIds : []);
    if (!entry?.id || !entry.def) return 'content-locked';
    if (unlocked.has(entry.id)) return 'unlocked';
    if (entry.def.hidden) return 'hidden';
    const prerequisites = Array.isArray(entry.def.requiresJournal) ? entry.def.requiresJournal : [];
    if (prerequisites.some(id => !unlocked.has(id))) return 'prerequisite-locked';
    return getJournalEntryAction(runtime, entry.id) ? 'available' : 'content-locked';
}

export function getJournalContentUnlockHint({ deps }, id) {
    if (id === 'woodsman') return '액트 10 클리어 후 혼돈 입성';
    const key = journalExplorationUnlocks[id]?.[0] || ({ meteor_fall: 'meteorSite', sky_tower_10: 'sky' })[id];
    if (key) return journalAreaRequirement(deps, key);
    if (/^rival_/.test(id) || id === 'cosmos_astra' || /^pinnacle_/.test(id)) return '루프 31 도달';
    return '';
}

function journalAreaRequirement(deps, key) {
    if (deps.contentProgression.isUnlocked(key)) return key === 'labyrinth' ? deps._t('액트 {act} 완료', { act: 5 }) : '';
    const def = deps.CONTENT_UNLOCK_CATALOG.find(row => row.id === key);
    if (beyondUnlockPreview(def.minLoop, deps.game.season)) return deps._t('아직 알 수 없음');
    return deps.contentProgression.status(key).reason;
}

export function getJournalLockedHint(runtime, availability, id) {
    const hint = getJournalContentUnlockHint(runtime, id);
    return availability === 'content-locked' && hint ? hint : '???';
}

export function journalRewardText({ deps }, def, shown) {
    const source = def.bonus ? def.bonus.label : def.displayEffect;
    return shown && source ? deps._t(source) : '';
}

export function getJournalCategory({ deps }, id) {
    if (id.startsWith('memory_leaf_')) return '기억의 잎';
    if (/^(prologue|act_\d+)$/.test(id)) return '스토리';
    if (id.startsWith('inscription_')) return '세계의 흔적';
    if (deps.JOURNAL_DB[id]?.hidden) return '숨겨진 기록';
    if (/^rival_/.test(id)) return '버려진 날';
    if (id === 'cosmos_astra') return '우주계 기록';
    if (/^pinnacle_/.test(id)) return '최종 관문';
    if (['labyrinth_10', 'ocean_500', 'sky_tower_10', 'time_rift_fusion', 'colony_wave_10'].includes(id)) return '탐험 기록';
    return '세계의 흔적';
}
