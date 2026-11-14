import { getJournalEntryAction } from './journal-navigation.mjs';

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
    const hints = {
        woodsman: '액트 10 클리어 후 혼돈 입성', beehive_queen: '루프 8 도달', void_grand_breach: '루프 9 도달',
        labyrinth_10: '루프 3, 액트 5 도달', sky_tower_10: '루프 15, 혼돈 20층 클리어', colony_wave_10: '루프 15 도달'
    };
    if (Object.hasOwn(hints, id)) return hints[id];
    if (id === 'meteor_fall') return deps._t('루프 {METEOR_SITE_UNLOCK_LOOP}, 액트 {METEOR_SITE_UNLOCK_ACT} 도달', { METEOR_SITE_UNLOCK_LOOP: deps.METEOR_SITE_UNLOCK_LOOP, METEOR_SITE_UNLOCK_ACT: deps.METEOR_SITE_UNLOCK_ACT });
    if (id === 'ocean_500') return deps._t('루프 {OCEAN_UNLOCK_LOOP} 도달', { OCEAN_UNLOCK_LOOP: deps.OCEAN_UNLOCK_LOOP });
    if (id === 'time_rift_fusion') return deps._t('루프 {TIME_RIFT_UNLOCK_LOOP} 도달', { TIME_RIFT_UNLOCK_LOOP: deps.TIME_RIFT_UNLOCK_LOOP });
    if (/^rival_/.test(id) || id === 'cosmos_astra' || /^pinnacle_/.test(id)) return '루프 31 도달';
    return '';
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
