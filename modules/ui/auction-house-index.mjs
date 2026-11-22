/**
 * 경매장 아이템 칸 검색이 읽는 매물의 값(fields). 상인 매물마다, 언어마다 한 번 만들어 매물 번호로 둔다(runtime.index; 저장의 seed나 언어가
 * 바뀌거나 만든 매물을 버리면 비운다). 이름이 언어를 따르므로 몸을 굴리는 규칙이 아니라 이 화면이 만든다: 몸이 다 굴러간 뒤 그림 틀의
 * 예산 안에서 미리 만들고(indexStep), 그 뒤에 온 매물은 검색이 읽을 때 만든다. 그래서 몸이 다 있는 검색은 거르기와 늘어세우기를 한 번에 끝낸다.
 * fields: name(보이는 이름, 베이스 이름, 고유 이름을 소문자로), sortName(보이는 이름), stats(능력치마다 줄에서 가장 큰 값), level(없으면 null),
 * dew(이슬 값), options(옵션 줄 수), variants(변형 열쇠 집합), rarity, family. 검색과 저장한 검색의 수 세기는 fieldsPass 하나로 거른다.
 */
import { tr } from './auction-house-format.mjs';
import { lotKind, lotName, lotLevel, optionCount } from './auction-house-kinds.mjs';

/** The index of the current save and language (a new one when either changed). */
export function searchIndex(runtime) {
    const key = `${runtime.deps.game.auction.seed}|${runtime.deps.i18n.locale}`;
    if (!runtime.index || runtime.index.key !== key) runtime.index = { key, fields: new Map(), queue: null, done: false };
    return runtime.index;
}

/** Forgets every lot's fields (the generated lots were dropped). */
export function dropIndex(runtime) { runtime.index = null; }

/** What a lot is worth in dew, to compare lots priced in different currencies. */
export function dewValue(runtime, lot) { return lot.price * runtime.deps.itemAppraisal.unitValue(lot.currency); }

/** The stat values of the lot's lines (base, explicit with their compound parts, unique; a talisman's stat lines): Map stat -> largest value. */
function lineStats(lot) {
    const item = lot.item, stats = new Map();
    const lines = lotKind(lot) === 'talisman' ? (item.lines || []).filter(line => line && line.kind === 'stat').map(line => ({ id: line.id, val: line.value }))
        : [...(item.baseStats || []), ...(item.stats || []).flatMap(stat => (stat ? [stat, ...(Array.isArray(stat.extraStats) ? stat.extraStats : [])] : []))];
    for (const line of lines) {
        const value = Number(line && line.val);
        if (line && Number.isFinite(value) && !(stats.get(line.id) >= value)) stats.set(line.id, value);
    }
    return stats;
}

function makeFields(runtime, lot) {
    const low = text => String(text).toLocaleLowerCase(runtime.deps.i18n.locale), item = lot.item, shown = lotName(runtime, lot);
    const names = [shown, item.baseName ? tr(runtime, item.baseName) : '', lot.unique ? tr(runtime, lot.unique) : ''];
    return { name: low(names.join('\n')), sortName: shown, stats: lineStats(lot), level: lotLevel(lot), dew: dewValue(runtime, lot), options: optionCount(lot),
        variants: new Set(lot.variants || []), rarity: item.rarity, family: lot.family || '' };
}

/** The fields of a priced lot: a merchant lot's are kept by id, a hall show's are made each time (a search sees five at most). */
export function lotFields(runtime, lot) {
    if (lot.source === 'user') return makeFields(runtime, lot);
    const index = searchIndex(runtime);
    let fields = index.fields.get(lot.id);
    if (!fields) {
        fields = makeFields(runtime, lot);
        index.fields.set(lot.id, fields);
    }
    return fields;
}

/** The fields of merchant lot id (its priced lot is read when they are missing; its body is rolled when missing), null for a lot gone. */
export function fieldsOf(runtime, id) {
    const kept = searchIndex(runtime).fields.get(id);
    if (kept) return kept;
    const lot = runtime.deps.auctionHouse.lot(runtime.deps.game, id, runtime.deps.now());
    return lot ? lotFields(runtime, lot) : null;
}

/** Makes the fields of every warm listed lot that has none until stop() says stop (once all bodies are warm; then done until dropped). */
export function indexStep(runtime, stop) {
    const index = searchIndex(runtime);
    if (index.done || !runtime.warmDone) return;
    if (!index.queue) index.queue = runtime.deps.auctionHouse.lotHeads(runtime.deps.game, runtime.deps.now()).filter(head => head.warm && !index.fields.has(head.id)).map(head => head.id);
    while (index.queue.length) {
        fieldsOf(runtime, index.queue.pop());
        if (stop()) return;
    }
    index.queue = null;
    index.done = true;
}

/** Whether every listed lot's fields are made (the saved searches are counted only then). */
export function indexReady(runtime) { return runtime.warmDone && searchIndex(runtime).done; }

/** The words of a name condition: split on whitespace, lower case in the player's language. */
export function queryWords(runtime, name) {
    return String(name || '').toLocaleLowerCase(runtime.deps.i18n.locale).split(/\s+/).filter(Boolean);
}

function levelPasses(query, level) {
    if (query.levelMin === null && query.levelMax === null) return true;
    return level !== null && (query.levelMin === null || level >= query.levelMin) && (query.levelMax === null || level <= query.levelMax);
}

/** Every option row: a line with that stat, at or above its minimum when it has one. */
function optionsPass(rows, stats) {
    return rows.every(row => stats.has(row.stat) && (row.min === null || stats.get(row.stat) >= row.min));
}

/** Every variant asked for or against (rules: [[key, wanted]] of the variants not 'any'). */
function variantsPass(rules, have) {
    return rules.every(([key, wanted]) => wanted === have.has(key));
}

/** The variants a query asks for or against, made once per search: [[key, wanted]]. */
export function variantRules(query) {
    return Object.entries(query.variants).filter(([, want]) => want !== 'any').map(([key, want]) => [key, want === 'yes']);
}

/**
 * Whether fields pass a search's body conditions. view: { query (normalized), words (queryWords of its name), unit (the dew value of one
 * unit of query.currency), variants (variantRules of the query) }. A lot without a level fails a level bound; a lot without variants fails a
 * required one.
 */
export function fieldsPass(view, fields) {
    const query = view.query;
    if (!view.words.every(word => fields.name.includes(word))) return false;
    if ((query.rarity !== 'all' && fields.rarity !== query.rarity) || (query.family && fields.family !== query.family)) return false;
    if (query.priceMax !== null && fields.dew > query.priceMax * view.unit) return false;
    return levelPasses(query, fields.level) && optionsPass(query.options, fields.stats) && variantsPass(view.variants, fields.variants);
}
