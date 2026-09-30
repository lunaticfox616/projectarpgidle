/** 세계수 아틀라스 패시브 보기 (data/atlas-passives.js · js/atlas-passives.js): 네 갈래를 뿌리 → 세 줄기 → 핵심 순서의 줄로 그린다.
 * 찍힌 노드를 다시 누르면 되돌린다(무료, 그 노드에만 기대는 노드가 없을 때).
 */
const atlasPassivesUi = (() => {
    const labels = ATLAS_PASSIVES.labels;
    // Node order per wheel (data): root, branch a ×3, branch b ×3, branch c ×3, two keystones → drawn as five rows.
    const ROWS = [[0], [1, 4, 7], [2, 5, 8], [3, 6, 9], [10, 11]];
    const effectText = effect => Object.entries(effect).map(([key, value]) => `${labels[key][0]} +${value}${labels[key][1]}`).join(' · ');

    function toggle(id) {
        const taken = game.atlas.passives.includes(id);
        const reason = taken ? atlasPassives.refund(game, id) : atlasPassives.allocate(game, id);
        if (reason) return addLog(reason, 'attack-monster');
        atlas.setLoadout(game, game.atlas.loadout); // refunding the slot passive shrinks the loadout to the slots left
        queueImportantSave(200);
        atlasUi.refresh();
    }
    function nodeHtml(node) {
        const status = atlasPassives.status(game, node.id);
        const hint = status === 'taken' ? '다시 누르면 되돌립니다' : (status === 'open' ? '누르면 찍습니다' : '이어진 노드를 먼저 찍으세요');
        return `<button class="atlas-passive rank-${node.rank} is-${status}" aria-pressed="${status === 'taken'}" title="${hint}"
            onclick="atlasPassivesUi.toggle('${node.id}')"><strong>${escapeHTML(node.name)}</strong><small>${escapeHTML(effectText(node.effect))}</small></button>`;
    }
    function wheelHtml(wheel) {
        const taken = wheel.nodes.filter(node => game.atlas.passives.includes(node.id)).length;
        const rows = ROWS.map(row => `<div class="atlas-passive-row cols-${row.length}">${row.map(index => nodeHtml(wheel.nodes[index])).join('')}</div>`).join('');
        return `<section class="atlas-wheel" style="--tint:${wheel.tint}" aria-label="${escapeHTML(wheel.name)}"><h3>${escapeHTML(wheel.name)} <span>${taken}/${wheel.nodes.length}</span></h3>${rows}</section>`;
    }
    function totalsHtml() {
        const total = atlasPassives.effects(game), text = effectText(total);
        return `<p class="atlas-passive-total">${text ? `합계: ${escapeHTML(text)}` : '아직 찍은 패시브가 없습니다. 노드를 완료하거나 희귀 지도로 끝내면 포인트가 생깁니다.'}</p>`;
    }
    function html() {
        const used = game.atlas.passives.length, points = atlas.points(game);
        return `<div class="atlas-passives"><p class="atlas-muted">아틀라스 포인트 ${used}/${points} 사용 · 패시브는 루프를 넘어 남습니다.
            열린 지도에는 연 순간의 패시브가 적용됩니다.</p>${totalsHtml()}<div class="atlas-wheels">${ATLAS_PASSIVES.wheels.map(wheelHtml).join('')}</div></div>`;
    }
    return Object.freeze({ html, toggle });
})();
safeExposeGlobals({ atlasPassivesUi });
