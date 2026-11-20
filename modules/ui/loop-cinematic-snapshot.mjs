// What the loop cinematic shows, read from the real game. A snapshot is taken when 'loop-rewrite-started' fires: the loop record is
// closed by then (records.loops[0]) and the level, zone, class and kept things are still those of the ending loop.

const CHIP_ICONS = Object.freeze({
    unlock: 'assets/ui/pixel/buttons/loop.png', loopPoint: 'assets/ui/loop-passive-ouroboros-v3.png', sealed: 'assets/items/root-sword-v3.png',
    stump: 'assets/ui/pixel/buttons/stump.png', loopTree: 'assets/ui/currency/ouroboros.png', journal: 'assets/ui/pixel/buttons/journal.png'
});
const MAX_CHIPS = 4;
export const ACT1_REGION = 'act1';

const regionExists = (deps, id) => id === ACT1_REGION || !!deps.STAGE_REGIONS?.regions?.[id];
const actRegion = order => (order <= 1 ? ACT1_REGION : 'act-' + String(order).padStart(2, '0'));

/** The room picture the stage shows now: the live room map's region, else the zone's (as js/act-exploration-room-plans.js picks it). */
export function currentRegion(deps) {
    const live = liveMapRegion(deps);
    if (live) return live;
    const picked = zoneRegion(deps, deps.getZone(deps.game.currentZoneId));
    return regionExists(deps, picked) ? picked : 'chaos';
}

function liveMapRegion(deps) {
    const run = deps.actExplorationState.current(deps.game), map = run ? deps.actExplorationMap.forRun(run) : null;
    return map && regionExists(deps, map.region) ? map.region : '';
}

function zoneRegion(deps, zone) {
    if (!zone) return '';
    const plans = deps.STAGE_ROOM_PLANS.regions;
    return plans.zones[zone.id] || plans.types[zone.type] || (zone.type === 'act' ? actRegion(zone.storyOrder) : '');
}

/** The pictures of the way this loop actually went, last first: the loop's own path picture, then the acts reached, act 1 last. */
export function rewindRegions(deps, record) {
    const reached = Math.max(0, Number(record.maxZoneId) || 0), chaosFrom = deps.ABYSS_START_ZONE_ID;
    const inChaos = Number.isInteger(chaosFrom) && reached >= chaosFrom;
    const topAct = inChaos ? 10 : Math.min(10, reached + 1);
    const out = [];
    if (record.path === 'cosmos' && regionExists(deps, 'cosmos')) out.push('cosmos');
    else if (inChaos) out.push('chaos');
    for (let act = topAct; act >= 2; act--) if (regionExists(deps, actRegion(act))) out.push(actRegion(act));
    out.push(ACT1_REGION);
    return out;
}

/** The idle sheet of a class in a stance (the stage's own table), falling back to bare hands. */
export function heroSheet(deps, classId, stance) {
    const table = deps.STAGE_CHARACTERS, clip = deps.stageActors?.clipOf(classId, stance, 'idle') || deps.stageActors?.clipOf(classId, 'unarmed', 'idle');
    if (!table || !clip) return null;
    return { ...clip, key: clip.file, url: table.path + clip.file + (table.version ? `?v=${table.version}` : '') };
}

export function currentHeroSheet(deps) {
    return heroSheet(deps, deps.getHeroAppearanceId(), deps.getStageHeroStance());
}

/** The start weapon's stance of each class (data/hana-weapon-combos.js classWeapons through SKILL_RUNE_STANCE_BY_CATEGORY). */
export function startSheets(deps) {
    return Object.keys(deps.PLAYER_CLASS_DEFS || {}).map(classId => heroSheet(deps, classId,
        deps.SKILL_RUNE_STANCE_BY_CATEGORY[deps.HANA_WEAPON_COMBOS.classWeapons[classId]] || 'unarmed')).filter(Boolean);
}

function closedRecord(game) {
    const row = game.records?.loops?.[0];
    return row && row.loop === (game.season || 1) ? row : null;
}

/** Level, kills and active time of the ending loop, and the way it went. */
export function runRecord(deps) {
    const game = deps.game, closed = closedRecord(game);
    if (closed) return { level: closed.level, kills: closed.kills, activeMs: closed.activeMs, maxZoneId: closed.maxZoneId, path: closed.path };
    return { level: game.level, kills: game.loopKills || 0, activeMs: game.records?.currentLoop?.activeMs || 0, maxZoneId: game.maxZoneId, path: 'chaos' };
}

function sealedGearCount(deps) {
    const game = deps.game;
    return [...Object.values(game.equipment || {}), ...(game.inventory || []), ...(game.equipmentTemporaryStorage || [])]
        .filter(item => item && item.loopSealed && !deps.bagItems.isSpecial(item)).length;
}

function unlockGain(deps) {
    if (!deps.game.contentProgression) return 0;
    const points = deps.contentProgression.points();
    return points.complete ? 0 : Math.max(0, Number(points.nextAward) || 0);
}

/** At most four kept things, in this order, each only when true; labels are the game's own words. */
export function keptChips(deps) {
    const game = deps.game, gain = unlockGain(deps), sealed = sealedGearCount(deps);
    const rows = [
        gain > 0 && { icon: CHIP_ICONS.unlock, label: deps._t('해금 포인트 +{n}', { n: gain }) },
        { icon: CHIP_ICONS.loopPoint, label: deps._t('루프 포인트 +1') },
        sealed > 0 && { icon: CHIP_ICONS.sealed, label: deps._t('루프 봉인 장비 {n}개', { n: sealed }) },
        game.stumpBox?.acquired && { icon: CHIP_ICONS.stump, label: deps._t('그루터기 함') },
        game.contentProgression && deps.contentProgression.isUnlocked('loopTree') && { icon: CHIP_ICONS.loopTree, label: deps._t('루프 패시브') },
        (game.season || 1) === 1 && { icon: CHIP_ICONS.journal, label: deps._t('저널') }
    ];
    return rows.filter(Boolean).slice(0, MAX_CHIPS);
}

/** Everything the scenes draw. nextSeason is the loop the title names.
 * @param {object} deps @param {{ region?: string }} [options] the room picture remembered while the loop card was up */
export function takeSnapshot(deps, { region = '' } = {}) {
    const record = runRecord(deps);
    return {
        owner: deps.game,
        nextSeason: (deps.game.season || 1) + 1,
        region: region && regionExists(deps, region) ? region : currentRegion(deps),
        hero: currentHeroSheet(deps),
        record,
        rewind: rewindRegions(deps, record),
        chips: keptChips(deps)
    };
}

/** "03:41:20" (hours keep counting past a day). */
export function clockText(ms) {
    const sec = Math.max(0, Math.round(ms / 1000)), h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60, s = sec % 60;
    return [h, m, s].map(value => String(value).padStart(2, '0')).join(':');
}

export function regionUrl(deps, id) {
    return deps.STAGE_REGIONS.path + id + '.png?v=' + deps.STAGE_REGIONS.version;
}
