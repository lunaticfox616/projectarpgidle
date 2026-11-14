export function journalGetClaimedPassivePointTotal(env, owner) {
    const entries = new Set(Array.isArray(owner.journalEntries) ? owner.journalEntries : []);
    const claims = owner.journalBonusClaims && typeof owner.journalBonusClaims === 'object' ? owner.journalBonusClaims : {};
    return Object.keys(env.deps.JOURNAL_DB).reduce((sum, id) => {
        const entry = env.deps.JOURNAL_DB[id];
        if (!entry || !entry.bonus || entry.bonus.stat !== 'passivePoint') return sum;
        if (!entries.has(id) || !claims[id]) return sum;
        return sum + Math.max(0, Math.floor(entry.bonus.value || 0));
    }, 0);
}

/** Load repair returns unclaimed point rewards; it does not invest or refresh the active game. */
export function journalRebuildBonusStateForLoad(env, state) {
    const owner = state && typeof state === 'object' ? state : {};
    const savedBonuses = Array.isArray(owner.journalBonuses)
        ? owner.journalBonuses.filter(entry => entry && typeof entry.stat === 'string' && Number.isFinite(entry.value)) : [];
    const hadLegacyImmortalHpBonus = savedBonuses.some(entry => entry.entryId === 'immortal' && entry.stat === 'flatHp');
    const legacyPassivePointBonusIds = new Set(savedBonuses
        .filter(entry => entry.stat === 'passivePoint' && typeof entry.entryId === 'string').map(entry => entry.entryId));
    owner.journalBonusClaims = owner.journalBonusClaims && typeof owner.journalBonusClaims === 'object' ? owner.journalBonusClaims : {};
    if (hadLegacyImmortalHpBonus) owner.journalBonusClaims.immortal = false;
    legacyPassivePointBonusIds.forEach(id => { owner.journalBonusClaims[id] = false; });
    let pendingPassivePoints = 0;
    owner.journalBonuses = [];
    const entries = Array.isArray(owner.journalEntries) ? owner.journalEntries : [];
    entries.forEach(id => { pendingPassivePoints += restoreEntryBonus(env, owner, id); });
    return { pendingPassivePoints, hadLegacyImmortalHpBonus, legacyPassivePointBonusIds: Array.from(legacyPassivePointBonusIds) };
}

function restoreEntryBonus(env, owner, id) {
    const entry = env.deps.JOURNAL_DB[id];
    if (!entry || !entry.bonus) return 0;
    let pending = 0;
    if (!owner.journalBonusClaims[id]) {
        owner.journalBonusClaims[id] = true;
        if (entry.bonus.stat === 'passivePoint') pending = Math.max(0, Math.floor(entry.bonus.value || 0));
    }
    if (entry.bonus.stat !== 'passivePoint' && owner.journalBonusClaims[id]) {
        owner.journalBonuses.push({ entryId: id, stat: entry.bonus.stat, value: entry.bonus.value });
    }
    return pending;
}

function applyBonusValue(owner, entryId, bonus) {
    owner.journalBonuses = Array.isArray(owner.journalBonuses) ? owner.journalBonuses : [];
    if (bonus.stat === 'passivePoint') {
        owner.passivePoints = Math.max(0, Math.floor(owner.passivePoints || 0)) + Math.max(0, Math.floor(bonus.value || 0));
    } else if (!owner.journalBonuses.some(row => row && row.entryId === entryId)) {
        owner.journalBonuses.push({ entryId, stat: bonus.stat, value: bonus.value });
    }
}

/** live is supplied by the application boundary; restored copies never issue active-game effects. */
export function* journalGrantBonus(env, owner, entryId, live) {
    const entry = env.deps.JOURNAL_DB[entryId];
    if (!entry || !entry.bonus) return;
    owner.journalBonusClaims = owner.journalBonusClaims && typeof owner.journalBonusClaims === 'object' ? owner.journalBonusClaims : {};
    if (owner.journalBonusClaims[entryId]) return;
    applyBonusValue(owner, entryId, entry.bonus);
    owner.journalBonusClaims[entryId] = true;
    if (live) {
        if (entry.bonus.stat === 'passivePoint') yield { kind: 'journalAutoInvest', args: [] };
        yield { kind: 'journalInvalidateStats', args: [] };
        if (env.deps.contentProgression.opening.canOpen(owner, 'tab-journal')) {
            yield { kind: 'journalLog', args: [env.deps._t('저널 영구 보너스 획득: {label}', { label: env.deps._t(entry.bonus.label) }), 'season-up'] };
        }
    }
}
