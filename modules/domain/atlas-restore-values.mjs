import { atlasCoreNormalizeBonus, atlasCorePortalCap } from './atlas-bonuses.mjs';
import { atlasCoreChartRun } from './atlas-graph.mjs';
import { atlasExpeditions } from '../data/atlas-expeditions.mjs';

function restorePassages(raw) {
    if (!raw) return {};
    const tried = atlasCoreRoomIds(raw.tried), sites = [], seen = new Set();
    for (const row of (Array.isArray(raw.sites) ? raw.sites : []).slice(0,100)) {
        if (!row || !Object.hasOwn(atlasExpeditions,row.type) || seen.has(row.type) || !tried.includes(row.host)) continue;
        if (![row.gx,row.gy].every(n => Number.isSafeInteger(n) && n >= 0)) continue;
        seen.add(row.type);
        sites.push({type:row.type,host:row.host,gx:row.gx,gy:row.gy,used:row.used === true});
    }
    return {passages:{tried,sites,countdowns:restoreCountdowns(raw.countdowns,tried)}};
}

function restoreCountdowns(value,tried) {
    if (!value || typeof value !== 'object') return {};
    const entries=Object.entries(value).slice(0,100).filter(([id,n])=>
        /^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(id) && !Object.hasOwn(Object.prototype,id) && !tried.includes(id) && Number.isInteger(n) && n>=0 && n<3);
    return Object.fromEntries(entries);
}

// ---------------------------------------------------------------- save boundary and the loop
export function atlasCoreFragmentIds(env, value, limit) { return (Array.isArray(value) ? value : []).filter(id => env.FRAGMENTS.has(id)).slice(0, limit); }

export function atlasCoreRoomIds(value) { return [...new Set(Array.isArray(value) ? value : [])].filter(id => typeof id === 'string' && id.length <= 64).slice(0, 100); }

export function atlasCoreRoomTypes(env, value) { return [...new Set(Array.isArray(value) ? value : [])].filter(type => Object.hasOwn(env.deps.ATLAS.encounters, type)); }

/** The open map's star terms (frozen at entry; only a chart map opened from a stone has any, older saves: none), portals (1 .. its cap)
 * and its 형체 없는 이슬 entry flags. */
function restorePortals(env, raw, map) {
    const chart = atlasCoreChartRun(env, { map, board: raw.board }), stars = env.deps.atlasPassives.normalizeTerms(chart ? raw.stars : null);
    const dew = raw.dew === true && chart, portals = Math.floor(Number(raw.portals));
    return { portals: portals >= 1 && portals <= atlasCorePortalCap(env, dew, stars) ? portals : 1, dew, dewKept: dew && raw.dewKept === true, stars, free: restoreFree(raw, map) };
}

/** 천문도 보스 자리의 비용 없는 첫 도전(개편 C): 기억 싸움과 원정 판은 아니다. 예전 저장은 없음(false). */
function restoreFree(raw, map) { return raw.free === true && !map.memory && !raw.board; }

export function atlasCoreNormalizeRun(env, raw, validMap) {
    const map = raw && validMap(raw.map);
    if (!map) return null;
    const bonus = atlasCoreNormalizeBonus(env, raw.bonus);
    return { map, ...restorePassages(raw.passages), ...restorePortals(env, raw, map),
        drops: (Array.isArray(raw.drops) ? raw.drops : []).map(validMap).filter(Boolean).slice(0, env.deps.ATLAS.stashCap),
        found: atlasCoreFragmentIds(env, raw.found, env.deps.ATLAS.fragmentRules.held), fragments: atlasCoreFragmentIds(env, raw.fragments, env.deps.ATLAS.fragments.length),
        spent: atlasCoreFragmentIds(env, raw.spent, env.deps.ATLAS.fragments.length), cleared: atlasCoreRoomIds(raw.cleared), bonus,
        encounters: atlasCoreRoomTypes(env, raw.encounters), challengeDoors: raw.challengeDoors === true, golden: atlasCoreRoomTypes(env, raw.golden),
        returnZoneId: Number.isInteger(raw.returnZoneId) && raw.returnZoneId >= 0 ? raw.returnZoneId : null,
        endgame: env.deps.atlasEndgame.normalizeRun(raw.endgame),
        objects: env.deps.actExplorationState.objects.restoreAtlas(raw.objects) };
}

/** 기억 던전의 기억(js/memory-dungeon.js). 그 모듈을 싣지 않은 검사 런타임에서는 비운다. */
export function atlasCoreNormalizeMemory(env, raw) {
    return typeof env.deps.memoryDungeon === 'object' ? env.deps.memoryDungeon.normalize(raw) : { tickets: {}, best: {}, variants: {} };
}

export function atlasCoreNormalizeFragments(env, raw) {
    const counts = {};
    for (const id of env.FRAGMENTS.keys()) {
        const value = Math.floor(Number(raw && raw[id]));
        if (value > 0) counts[id] = Math.min(env.deps.ATLAS.fragmentRules.cap, value);
    }
    return counts;
}

export function atlasCoreNodeList(env, value, allowed) { return [...new Set(Array.isArray(value) ? value : [])].filter(id => env.BY_ID.has(id) && allowed(id)); }

// ------------------------------------------------------------------ renamed ids (ATLAS.renamed)
export function atlasCoreFnv1a(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index++) hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193);
    return (hash >>> 0).toString(16).padStart(8, '0');
}

export function atlasCoreRenamedId(text, table) { return typeof text === 'string' && text.length <= 32 ? table[atlasCoreFnv1a(text)] : undefined; }

/** Old ids in a loaded save's atlas, map and enemy state, as values and as keys, become the new ids. ATLAS.renamed lists the
 * old ids by hash only. table: a test passes its own. */
export function atlasCoreRenameSavedIds(env, root, table = env.deps.ATLAS.renamed) {
    const seen = new WeakSet(), stack = [root];
    while (stack.length) {
        const value = stack.pop();
        if (!value || typeof value !== 'object' || seen.has(value)) continue;
        seen.add(value);
        for (const key of Object.keys(value)) atlasCoreRenameSavedEntry(value, key, table, stack);
    }
}

/** One key of a saved object: a renamed value is replaced, any other value is walked later; a renamed key moves its value. */
export function atlasCoreRenameSavedEntry(value, key, table, stack) {
    const fresh = atlasCoreRenamedId(value[key], table);
    if (fresh) value[key] = fresh;
    else stack.push(value[key]);
    const freshKey = !Array.isArray(value) && atlasCoreRenamedId(key, table);
    if (freshKey && !Object.hasOwn(value, freshKey)) {
        value[freshKey] = value[key];
        delete value[key];
    }
}
