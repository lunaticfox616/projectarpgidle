export function openingSeen(owner, key) { return !!owner.seenTutorials?.includes(key); }

export function openingVisitKey(route) { return 'opening_visited_' + route; }

export function openingEnrolled(env, owner) { return openingSeen(owner, env.ENROLLED); }

export function openingApplies(env, owner) { return (owner.season || 1) === 1 && openingEnrolled(env, owner); }

export function openingEquipped(owner) { return openingSeen(owner, 'opening_done'); }

export function openingCombatOnly(env, owner) { return openingApplies(env, owner) && !openingEquipped(owner); }

export function openingHasLoot(owner) { return owner.inventory.some(Boolean)
    || Object.entries(owner.equipment).some(([slot, item]) => slot !== '무기' && !!item); }

export function openingCanOpen(env, owner, route) { return !openingApplies(env, owner) || !Object.hasOwn(env.gates, route) || !!env.gates[route](owner); }

export function openingSignature(env, owner) { return openingApplies(env, owner) ? Object.keys(env.gates).map(route => Number(openingCanOpen(env, owner, route))).join('') : ''; }

export function openingEnroll(env, owner) {
    if (!openingSeen(owner, env.ENROLLED)) owner.seenTutorials.push(env.ENROLLED);
}

export function openingTradeReady(owner) { return openingEquipped(owner) && owner.maxZoneId >= 5
    && Object.values(owner.npcShops || {}).some(shop => shop.loop === owner.season && shop.zoneId >= 5 && shop.offers?.length > 0); }

/** A screen counts as seen once opened. The equipment window opened to wear the starter weapon is not the first-gear lesson
 * (compare and swap): that one waits for real gear (cueReady), 2026-11-09. */
export function openingVisit(env, owner, route) {
    if (!openingApplies(env, owner) || !env.cues.includes(route) || openingSeen(owner, openingVisitKey(route))) return false;
    if (route === 'tab-items' && owner.starterWeaponTutorialPending != null) return false;
    owner.seenTutorials.push(openingVisitKey(route));
    return true;
}

export function openingCueReady(env, owner, route) {
    if (openingSeen(owner, openingVisitKey(route)) || !openingCanOpen(env, owner, route)) return false;
    if (route === 'tab-map') return owner.maxZoneId === 1 && owner.currentZoneId === 0;
    if (route === 'tab-items') return openingHasLoot(owner);
    if (route === 'tab-journal') return !openingSeen(owner, env.TRADE);
    if (route === 'tab-trade') return true;
    return owner.maxZoneId < 4;
}

export function openingNextCue(env, owner) { return openingApplies(env, owner) && openingEquipped(owner) ? env.cues.find(route => openingCueReady(env, owner, route)) : null; }

export function openingInlineNotice(env, owner, key) { return openingApplies(env, owner) && env.inlineKeys.has(key); }

/** A first-use menu stays open even if its point is spent or its reward is salvaged. */
export function openingSync(env, owner) {
    if (!openingApplies(env, owner)) return;
    if (!openingSeen(owner, env.GEAR) && openingHasLoot(owner)) owner.seenTutorials.push(env.GEAR);
    if (!openingSeen(owner, env.PROFILE) && owner.passives.length > 0) owner.seenTutorials.push(env.PROFILE);
    if (!openingSeen(owner, env.TRADE) && openingTradeReady(owner)) owner.seenTutorials.push(env.TRADE);
}
