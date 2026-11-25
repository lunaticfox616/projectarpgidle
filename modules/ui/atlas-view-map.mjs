// 천문도 카드들이 함께 쓰는 조각: 지도 기운의 줄과 칩, 각인의 도움말, 지침 제작 단추와 꽃, 보스 자리의 다음 입장 비용 칩.
import { ledger, TICKET } from './atlas-view-model.mjs';

/** 지도 기운(js/loot-omens.js): 이름, 무엇이 잘 나오는지, 세기(지도석 희귀도와 타락). 기운이 없는 예전 지도석은 빈칸. */
export function omenHtml(runtime, map) {
    const found = runtime.deps.lootOmens.of(map);
    if (!found) return '';
    const omen = runtime.deps.lootOmens.describe(found.omen.id);
    return `<p class="atlas-omen${map.uid === runtime.state.bloomedUid ? ' is-bloomed' : ''}" style="--omen:${omen.tone}"><b>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(omen.name))}</b><small>${(0, runtime.deps._t)('세기 ×{strength}', { strength: found.strength })}</small>`
        + `<span>${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(omen.note))}</span></p>`;
}

export function omenChipHtml(runtime, map) {
    const omen = map.omen && runtime.deps.lootOmens.describe(map.omen);
    return omen ? `<i class="atlas-omen-chip" style="--omen:${omen.tone}">${(0, runtime.deps.escapeHTML)((0, runtime.deps._t)(omen.name))}</i>` : '';
}

/** 각인의 도움말: 반드시 생기는 방, 아니면 효과(ATLAS.effectLabels). */
export function fragmentText(runtime, fragment) {
    const room = fragment.encounter ? runtime.deps.ATLAS.encounters[fragment.encounter].name : '';
    if (room) return `${room}${room.endsWith('방') ? '' : (0, runtime.deps._t)(' 방')}이 반드시 생긴다`;
    const labels = runtime.deps.ATLAS.effectLabels, label = ([key, value]) => (labels[key][1] === 'on' ? labels[key][0] : `${labels[key][0]} +${value}${labels[key][1]}`);
    return Object.entries(fragment.effect).map(label).join(', ');
}

export function craftButtonHtml(runtime, map, key) {
    const have = Math.floor(runtime.deps.game.currencies[key] || 0), reason = runtime.deps.atlasMaps.craftReason(map, key);
    return `<button type="button" onclick="atlasUi.craft('${key}')" ${reason || have < 1 ? 'disabled' : ''}${reason ? ` data-tip="${(0, runtime.deps.escapeHTML)(reason)}"` : ''}>
            <span>${runtime.deps.window.getStyledOrbName(key)}</span><small>${(0, runtime.deps._t)(runtime.deps.atlasMaps.crafts[key].label)}, ${have}</small></button>`;
}

/** 꽃 한 색(data/loot-omens.js flowers): 평범한 꽃의 단추와, 황금 꽃을 가졌을 때만 고르는 단추. 툴팁은 그 색으로 나올 수 있는 기운이다. */
export function flowerButtonsHtml(runtime, map, color) {
    const name = (0, runtime.deps._t)('{label} 꽃', { label: runtime.deps.STUMP_BOX_COLORS[color].label }), blocked = runtime.deps.atlas.omenChangeReason(map), names = runtime.deps.lootOmens.flowerOmens(color, runtime.deps.game, map.omen).map(omen => omen.name).join(', ');
    const plain = runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, false), golden = runtime.deps.stumpBox.storedFlowerCount(runtime.deps.game, color, true), closed = blocked || !names;
    const icon = `<img class="atlas-flower-icon" src="${runtime.deps.stumpBox.harvestPriceIcon(runtime.deps.stumpBox.harvestPriceKey('flower', color))}" alt="">`;
    const tip = blocked || (plain ? names : (0, runtime.deps._t)('{name}이 없습니다. {names}', { name, names }));
    const pick = golden ? `<button type="button" class="is-golden" onclick="atlasUi.goldenFlowerOmen('${color}')" ${closed ? 'disabled' : ''} data-tip="${(0, runtime.deps.escapeHTML)(blocked || names)}">
            ${icon}<span>${(0, runtime.deps._t)('황금 {name}', { name })}<small>${(0, runtime.deps._t)('직접 고르기, {golden}', { golden })}</small></span></button>` : '';
    return `<div class="atlas-flower" style="--flower:${runtime.deps.STUMP_BOX_COLORS[color].tone}"><button type="button" onclick="atlasUi.flowerOmen('${color}')" ${closed || plain < 1 ? 'disabled' : ''} data-tip="${(0, runtime.deps.escapeHTML)(tip)}">
            ${icon}<span>${name}<small>${(0, runtime.deps._t)(runtime.deps.LOOT_OMENS.flowers[color].label)}, ${plain}</small></span></button>${pick}</div>`;
}

/** 지도 노드의 지도석에만 기운이 있다(수호자 지도석은 없다). */
export function flowersHtml(runtime, map) {
    if (runtime.deps.atlas.node(map.node)?.kind !== 'map') return '';
    return `<div class="atlas-flowers" aria-label="${(0, runtime.deps._t)('꽃으로 기운 바꾸기')}"><p>${(0, runtime.deps._t)('꽃으로 기운 바꾸기')}</p>${runtime.state.FLOWER_COLORS.map(color => flowerButtonsHtml(runtime, map, color)).join('')}</div>`;
}

/** 다시 들어갈 때 내는 것을 가진 수/필요한 수 칩으로: 수호자 지도석, 정점의 뿌리 입장권 4종, 후반 싸움의 재료. */
export function gateCostChips(runtime, fight) {
    const game = runtime.deps.game, chip = (name, have, need) => `<span class="as-chip ${have >= need ? 'is-on' : 'is-missing'}">${(0, runtime.deps.escapeHTML)(name)} ${have}/${need}</span>`;
    if (fight.kind === 'guardian') return chip((0, runtime.deps._t)('수호자 지침'), ledger(runtime).stash.filter(map => map.node === fight.id).length, 1);
    if (fight.kind === 'pinnacle') return runtime.deps.ATLAS.pinnacle.tickets.map(key => chip((0, runtime.deps._t)(TICKET(runtime, key)), Math.floor(game.currencies[key] || 0), 1)).join('');
    return runtime.deps.atlasEndgame.def(fight.id).entry.map(([item, need]) => chip((0, runtime.deps._t)(runtime.deps.atlasEndgame.itemName(item)), runtime.deps.atlasEndgame.count(game, item), need)).join('');
}
