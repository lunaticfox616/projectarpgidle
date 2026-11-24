import { atlasExpeditions } from '../data/atlas-expeditions.mjs';
import { atlasSessionNotify } from './atlas-run-events.mjs';
import { passageCell } from './atlas-passage-cells.mjs';

// One discovery roll during combat in each ordinary hunting room. Preserve the
// per-map odds as the number of eligible rooms varies. An inscription guarantees a discovery.
function pickExpedition(env, owner, zone, count) {
    const {atlasEncounters: rules, ATLAS} = env.deps, run = owner.atlas.run;
    const found = new Set(run.passages.sites.map(site => site.type));
    const eligible = type => Object.hasOwn(atlasExpeditions, type) && !found.has(type) && rules.isOpen(type, owner.season, owner);
    const forced = run.fragments.map(id => ATLAS.fragments.find(row => row.id === id)?.encounter).filter(eligible);
    if (forced.length) return forced[Math.floor(Math.random() * forced.length)];
    if (found.size + run.encounters.filter(type => !ATLAS.encounters[type].late).length >= rules.roomLimit(run.bonus, owner.season)) return null;
    const candidates = Object.keys(atlasExpeditions).filter(eligible).filter(type => {
        const chance = Math.min(1, rules.chance(type, zone.atlasRegion) / 100);
        return Math.random() < 1 - (1 - chance) ** (1 / count);
    });
    return candidates[Math.floor(Math.random() * candidates.length)];
}

function huntingPack(run,enemy,ledger) {
    if (!ledger || !run?.rooms || enemy.critter || !enemy.explorationPack) return null;
    const pack = run.packs.find(row => row.key === enemy.explorationPack);
    return pack && !pack.objectId && !ledger.tried.includes(pack.roomId) ? pack : null;
}

// Choose the moment only after hunting starts. Saving between kills keeps the count.
function discoveryDue(ledger,pack) {
    const counts = ledger.countdowns ||= {};
    const host = pack.roomId;
    const left = counts[host] ?? Math.floor(Math.random()*Math.min(3,pack.aliveIds.length));
    if (left > 0 && pack.aliveIds.length > 1) {counts[host]=left-1;return false;}
    delete counts[host];
    ledger.tried.push(host);
    return true;
}

export function* discoverPassage(env, owner, zone, enemy) {
    const ledger = owner.atlas.run?.passages, run = owner.actExploration;
    const pack = huntingPack(run,enemy,ledger);
    if (!pack) return;
    const rooms = env.deps.atlasEncounters.hostRooms(env.deps.actExplorationMap.forRun(run));
    const room = rooms.find(row => row.id === pack.roomId);
    if (!room || !discoveryDue(ledger,pack)) return;
    const type = pickExpedition(env, owner, zone, rooms.length);
    if (!type) return;
    // Open within a few steps of the hero and away from the kill's loot labels.
    const hero=owner.gridPlayer, dx=Math.sign(hero.gx-enemy.gx) || 1;
    const near={gx:hero.gx+2*dx,gy:hero.gy-1};
    const cell = passageCell(room, env.deps.actExplorationState.objects.solidCells(run), near);
    if (!cell) return;
    ledger.sites.push({ type, host: room.id, ...cell, used: false, openedAt:run.motionTimeMs });
    owner.atlas.run.golden.push(...env.deps.atlasEncounters.golden([type], owner.atlas.run.bonus, owner.atlas.run.map.uid));
    yield* atlasSessionNotify(env, {kind:'passage', type});
    yield {kind:'atlasSessionEffectQueueImportantSave', args:[220]};
}

function availableSite(owner,type) {
    const run=owner.actExploration;
    if (owner.currentZoneId !== 'atlas_map' || run?.status !== 'active' || run.arrival || owner.moveTimer > 0) return null;
    if (run.source.pocket || !owner.atlas.run?.passages) return null;
    return owner.atlas.run.passages.sites.find(row => row.type === type && !row.used);
}

export function* atlasSessionEnterPassage(env, owner, type) {
    const main = owner.actExploration, site = availableSite(owner,type);
    if (!site) return false;
    const {gx, gy} = owner.gridPlayer;
    if (gx !== site.gx || gy !== site.gy) return false;
    const home = { main, gx, gy, progress: owner.runProgress, kills: owner.killsInZone };
    env.deps.actExplorationState.retireCombat(owner);
    main.destination = null;
    main.motion = null;
    site.used = true;
    yield {kind:'atlasSessionEffectStartExpedition', args:[owner,site,home]};
    owner.actExploration.home = home;
    yield* atlasSessionNotify(env, {kind:'expedition', type});
    yield {kind:'atlasSessionEffectQueueImportantSave', args:[100]};
    return true;
}

export function restoreMainMap(owner) {
    const home = owner.actExploration?.home;
    if (!home) return false;
    owner.actExploration = home.main;
    owner.actExploration.motionTimeMs = 0;
    owner.actExploration.mode = owner.settings.autoMove === false ? 'manual' : owner.settings.actExplorationMode;
    Object.assign(owner.gridPlayer, {gx:home.gx, gy:home.gy});
    owner.enemies = [];
    owner.runProgress = home.progress;
    owner.killsInZone = home.kills;
    return true;
}
