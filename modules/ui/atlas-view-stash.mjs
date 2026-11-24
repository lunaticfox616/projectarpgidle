// 천문도 아래 띠의 둘째 카드(아틀라스 개편 D1): 지침 보관함. 등급마다 한 줄(높은 등급부터), 줄 안에 그 등급의 지침 칸(희귀도 빛깔, 기운 점,
// 옵션은 마우스를 올리면). 칸을 누르면 그 지침이 갈 지도를 천문도에서 고른다. 고른 지침은 아래 줄에서 제작, 합치기, 버리기. 제작을 누르면
// 카드가 그 지침의 옵션과 제작 단추, 꽃으로 바뀐다(다시 누르면 목록). 예전 수호자의 지도석(싸움 등급)은 맨 아래 줄.
import { ledger, selectedMap, mapName, mapTierStyle } from './atlas-view-model.mjs';
import { craftButtonHtml, flowersHtml, omenHtml } from './atlas-view-map.mjs';
import { esc, icon } from './atlas-view-pick.mjs';

/** 칸과 줄과 아래 줄의 이름: 천문도 지도의 지침은 T 등급과 희귀도, 예전 수호자의 지도석은 그 이름 그대로. */
export function stoneTitle(runtime, map) {
    if (!runtime.deps.atlas.isMapStone(map)) return mapName(runtime, map);
    return (0, runtime.deps._t)('T{tier} {rarity} 지침', { tier: map.tier, rarity: (0, runtime.deps._t)(runtime.deps.ATLAS.rarities[map.rarity].name) });
}

/** 칸의 도움말: 이름, 품질과 타락, 기운, 옵션 줄(아이템 툴팁이 뜨는 칸이 아니라 data-tip). */
export function stoneTip(runtime, map) {
    const omen = map.omen && runtime.deps.lootOmens.describe(map.omen);
    const tags = [map.quality ? (0, runtime.deps._t)('품질 {quality}%', { quality: map.quality }) : '', map.corrupted ? (0, runtime.deps._t)('타락') : ''].filter(Boolean).join(', ');
    return [stoneTitle(runtime, map), tags, omen ? (0, runtime.deps._t)(omen.name) : '', ...map.mods.map(entry => runtime.deps.atlasMaps.describe(entry))].filter(Boolean).join('\n');
}

export function tileHtml(runtime, map) {
    const omen = map.omen && runtime.deps.lootOmens.describe(map.omen), picked = map.uid === runtime.state.selectedUid;
    return `<button type="button" class="as-tile rarity-${map.rarity}${map.corrupted ? ' is-corrupted' : ''}${map.quality ? ' has-quality' : ''}" style="${mapTierStyle(runtime, map)}" aria-pressed="${picked}"
            aria-label="${(0, runtime.deps.escapeHTML)(stoneTitle(runtime, map))}" data-tip="${(0, runtime.deps.escapeHTML)(stoneTip(runtime, map))}" onclick="atlasUi.selectMap(${map.uid})">${icon(runtime, 'shard')}${omen ? `<i style="--omen:${omen.tone}"></i>` : ''}</button>`;
}

/** 등급마다 한 줄: 천문도 지도의 지침은 높은 등급부터, 예전 수호자의 지도석은 맨 아래 한 줄. */
export function tierRows(runtime) {
    const stash = ledger(runtime).stash, rows = new Map();
    for (const map of [...stash].sort((a, b) => b.tier - a.tier || a.uid - b.uid)) {
        const key = runtime.deps.atlas.isMapStone(map) ? map.tier : 'guardian';
        rows.set(key, [...(rows.get(key) || []), map]);
    }
    return [...rows.entries()].sort(([a], [b]) => Number(a === 'guardian') - Number(b === 'guardian'));
}

export function rowHtml(runtime, [key, maps]) {
    const head = key === 'guardian' ? `<b class="as-tier is-guardian">${icon(runtime, 'shield')}</b>` : `<b class="as-tier" style="${mapTierStyle(runtime, maps[0])}">T${key}</b>`;
    const label = key === 'guardian' ? (0, runtime.deps._t)('수호자 지도석') : (0, runtime.deps._t)('T{tier} 지침 {count}개', { tier: key, count: maps.length });
    return `<div class="as-tier-row" role="group" aria-label="${(0, runtime.deps.escapeHTML)(label)}">${head}<small>${maps.length}</small><div class="as-tiles">${maps.map(map => tileHtml(runtime, map)).join('')}</div></div>`;
}

/** 머리의 도구: 모두 합치기(합칠 수 있는 수)와 일괄 버리기. 좁은 머리에 맞춰 도트 그림 단추(이름은 도움말). */
export function headToolsHtml(runtime) {
    const busy = runtime.deps.atlas.runOpenReason(runtime.deps.game), used = runtime.deps.atlas.combineAllPlan(runtime.deps.game).used;
    const discard = busy || !ledger(runtime).stash.some(runtime.deps.atlas.isMapStone);
    return `<span class="as-tools"><button type="button" class="as-mini" onclick="atlasUi.combineAll()" ${used && !busy ? '' : 'disabled'} data-tip="${esc(runtime, runtime.deps._t('모두 합치기'))}" aria-label="${esc(runtime, runtime.deps._t('모두 합치기'))}">${icon(runtime, 'up')}${used ? `<b>${used}</b>` : ''}</button>`
        + `<button type="button" class="as-mini" onclick="atlasUi.bulkDiscard()" ${discard ? 'disabled' : ''} data-tip="${esc(runtime, runtime.deps._t('일괄 버리기'))}" aria-label="${esc(runtime, runtime.deps._t('일괄 버리기'))}">${icon(runtime, 'down')}</button></span>`;
}

/** 고른 지침의 줄(이름은 칸의 도움말에): 제작(카드를 그 지침의 제작 면으로), 같은 등급 셋 합치기(모인 수), 버리기. */
export function footHtml(runtime, map) {
    if (!map) return '';
    const busy = runtime.deps.atlas.runOpenReason(runtime.deps.game), need = runtime.deps.ATLAS.combine.count, reason = runtime.deps.atlas.combineReason(runtime.deps.game, map.uid);
    const same = ledger(runtime).stash.filter(entry => entry.tier === map.tier && runtime.deps.atlas.isMapStone(entry) === runtime.deps.atlas.isMapStone(map)).length;
    const craftable = runtime.deps.atlas.isMapStone(map);
    return `<footer class="as-stash-foot">            ${craftable ? `<button type="button" class="as-mini${runtime.state.craftOpen ? ' is-on' : ''}" aria-pressed="${runtime.state.craftOpen}" onclick="atlasUi.toggleCraft()">${icon(runtime, 'hammer')}${esc(runtime, runtime.deps._t('제작'))}</button>` : ''}
            <button type="button" class="as-mini" onclick="atlasUi.combine()" ${reason ? 'disabled' : ''}${reason && same >= need ? ` data-tip="${(0, runtime.deps.escapeHTML)(reason)}"` : ''}>${esc(runtime, runtime.deps._t('합치기 {count}/{need}', { count: Math.min(same, need), need }))}</button>
            <button type="button" class="as-mini" onclick="atlasUi.discard()" ${busy ? 'disabled' : ''}>${esc(runtime, runtime.deps._t('버리기'))}</button></footer>`;
}

/** 제작 면: 희귀도와 품질, 기운, 옵션, 보상 배율, 제작 재화 단추, 꽃으로 기운 바꾸기. */
export function craftFaceHtml(runtime, map) {
    const fx = runtime.deps.atlasMaps.effects({ ...map, tier: runtime.deps.atlas.mapGameTier(runtime.deps.game, map) });
    const mods = map.mods.map(entry => `<li>${(0, runtime.deps.escapeHTML)(runtime.deps.atlasMaps.describe(entry))}</li>`).join('');
    const reward = (0, runtime.deps._t)('아이템 수량 +{quantity}%, 희귀도 +{rarity}%', { quantity: fx.quantity, rarity: fx.rarity });
    return `<div class="as-craft rarity-${map.rarity}">${omenHtml(runtime, map)}${mods ? `<ul class="as-mods">${mods}</ul>` : `<p class="as-empty">${esc(runtime, runtime.deps._t('옵션 없음'))}</p>`}
            <p class="as-reward">${(0, runtime.deps.escapeHTML)(reward)}</p><div class="as-crafts">${runtime.state.CRAFT_ORDER.map(key => craftButtonHtml(runtime, map, key)).join('')}</div>${flowersHtml(runtime, map)}</div>`;
}

export function stashCardHtml(runtime) {
    const stash = ledger(runtime).stash, map = selectedMap(runtime), craft = map && runtime.state.craftOpen && runtime.deps.atlas.isMapStone(map);
    const list = stash.length ? tierRows(runtime).map(row => rowHtml(runtime, row)).join('') : `<p class="as-empty">${esc(runtime, runtime.deps._t('비어 있습니다. 보관함은 루프마다 비워집니다.'))}</p>`;
    return `<section class="as-card as-stash" aria-label="${esc(runtime, runtime.deps._t('지침 보관함'))}"><header class="as-card-head"><h3>${esc(runtime, runtime.deps._t('지침 보관함'))}</h3>
            <span class="as-count${stash.length >= runtime.deps.ATLAS.stashCap ? ' is-full' : ''}">${stash.length}/${runtime.deps.ATLAS.stashCap}</span>${headToolsHtml(runtime)}</header>
            <div class="as-card-body">${craft ? craftFaceHtml(runtime, map) : list}</div>${footHtml(runtime, map)}</section>`;
}
