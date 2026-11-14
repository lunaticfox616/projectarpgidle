/** Legacy menu discovery uses saved flags independently of paid content ownership. */
const MENU_READY = Object.freeze({
    items: (owner, starter) => (owner.inventory.length > 0 || Object.values(owner.currencies).some(value => value > 0)) && !starter,
    skills: owner => owner.skills.length > 1 || owner.supports.length > 0,
    codex: owner => (owner.inventory || []).some(item => item && item.rarity === 'unique')
        || Object.values(owner.equipment || {}).some(item => item && item.rarity === 'unique')
        || Object.keys(owner.uniqueCodex || {}).length > 0,
    map: owner => owner.maxZoneId >= 1,
    season: owner => owner.season > 1,
    traits: owner => (owner.completedTrials || []).length > 0 || owner.ascendPoints > 0 || !!owner.ascendClass
});

export function takeMenuUnlock(owner, key, starter = null) {
    if (owner.unlocks[key] || !MENU_READY[key](owner, starter)) return false;
    owner.unlocks[key] = true;
    owner.noti[key] = true;
    return true;
}

export function starterWeaponTarget(owner) {
    const id = owner.starterWeaponTutorialPending;
    if (id == null) return null;
    if (Object.values(owner.equipment || {}).some(item => item && item.id === id)) {
        owner.starterWeaponTutorialPending = null;
        return null;
    }
    return (owner.inventory || []).find(item => item && item.id === id) || null;
}

export function jewelPanelReady(owner, bagItems) {
    return (owner.season || 1) >= 5 || bagItems.jewels(owner).length > 0 || ((owner.currencies || {}).jewelShard || 0) > 0;
}

export function journalPanelReady(owner) {
    const entries = Array.isArray(owner.journalEntries) ? owner.journalEntries : [];
    return entries.some(id => id && id !== 'prologue') || !!(owner.unlocks && owner.unlocks.codex);
}

export function takeBoundaryMenuReveal(owner, boundary) {
    if (!boundary.unlocked || boundary.unlockNoticeSeen) return false;
    boundary.unlockNoticeSeen = true;
    owner.noti.map = true;
    return true;
}

export function takeInfusionUnlock(owner, available) {
    if (!available || owner.chaosInfuserUnlocked) return false;
    owner.chaosInfuserUnlocked = true;
    owner.noti.items = true;
    return true;
}

export function takeFourthTrialUnlock(owner) {
    if (!(owner.level >= 100) || !(owner.completedTrials || []).includes('trial_3') || (owner.unlockedTrials || []).includes('trial_4')) return false;
    owner.unlockedTrials.push('trial_4');
    owner.noti.map = true;
    return true;
}
