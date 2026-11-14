import { journalGrantBonus } from './journal-bonuses.mjs';

export function* journalUnlockEntry(env, owner, entryId, live) {
    if (!env.deps.JOURNAL_DB[entryId]) return;
    owner.journalEntries = Array.isArray(owner.journalEntries) ? owner.journalEntries : ['prologue'];
    if (!owner.journalEntries.includes(entryId)) {
        owner.journalEntries.push(entryId);
        // Discovery-only leaves add reading material, without reward or progress notifications.
        if (env.deps.JOURNAL_DB[entryId].discoveryOnly) return;
        markUnread(owner);
        if (live) {
            if (env.deps.contentProgression.opening.canOpen(owner, 'tab-journal')) {
                yield { kind: 'journalLog', args: [env.deps._t('📓 새 기록: {title}', { title: env.deps.JOURNAL_DB[entryId].title }), 'loot-rare'] };
            }
            yield { kind: 'journalPinnacleReward', args: [entryId] };
            yield { kind: 'journalRefreshGoals', args: [] };
        }
    }
    yield* journalGrantBonus(env, owner, entryId, live);
}

function markUnread(owner) {
    owner.noti = owner.noti && typeof owner.noti === 'object' ? owner.noti : {};
    owner.noti.journal = true;
}

export function* journalEnsureActCompletionForLoop(env, owner, options, live) {
    const silent = !options || options.silent !== false;
    const loopStage = Math.max(Math.floor(owner.season || 1), Math.floor(owner.loopCount || 0));
    if (loopStage < 2) return;
    owner.journalEntries = Array.isArray(owner.journalEntries) ? owner.journalEntries : ['prologue'];
    const before = owner.journalEntries.length;
    const actIds = Object.keys(env.deps.JOURNAL_DB).filter(id => /^act_/.test(id));
    for (const id of actIds) {
        if (!owner.journalEntries.includes(id)) owner.journalEntries.push(id);
        yield* journalGrantBonus(env, owner, id, live);
    }
    if (!silent && owner.journalEntries.length > before) {
        yield { kind: 'journalLog', args: [env.deps._t('📓 루프 2 이상 보정: 액트 저널이 모두 복구되었습니다.'), 'season-up'] };
    }
}
