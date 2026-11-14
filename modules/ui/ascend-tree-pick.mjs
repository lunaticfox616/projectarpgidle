import { ascendTreeLinesOf, ascendTreeIconOf, ascendTreeEsc, ascendTreeStatName, ascendTreeKeystoneRows } from './ascend-tree-common.mjs';

export function ascendTreeFocusStats(runtime, key) {
        const tree = runtime.deps.getClassTreeDef(key), stats = [];
        ['n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8', 'n9'].forEach(id => ascendTreeLinesOf(tree[id]).forEach(line => {
            if (line.stat && !stats.includes(line.stat)) stats.push(line.stat);
        }));
        return stats.slice(0, 4);
    }

export function ascendTreePickCardHtml(runtime, key) {
        const template = runtime.deps.CLASS_TEMPLATES[key], defs = runtime.deps.getClassKeystoneDefs(key), stats = ascendTreeFocusStats(runtime, key);
        const chips = stats.map(stat => `<span class="ascend-pick-chip">${runtime.deps.renderPixelIcon(ascendTreeIconOf(stat), 'ascend-pick-chip-icon')}${ascendTreeEsc(runtime, ascendTreeStatName(runtime, stat))}</span>`).join('');
        const keys = (ascendTreeKeystoneRows(defs)[0] || []).map(id => defs.find(k => k.id === id)).filter(Boolean)
            .map(k => `<span class="ascend-pick-key"><b>${ascendTreeEsc(runtime, runtime.deps._t(k.name))}</b><span>${runtime.deps.statToneText.html(runtime.deps._t(k.desc))}</span></span>`).join('');
        return `<button type="button" class="class-card ascend-pick-card" data-loop-class="${key}">
            <span class="ascend-pick-head">${runtime.deps.renderPixelIcon(ascendTreeIconOf(stats[0]), 'ascend-pick-icon')}<strong>${ascendTreeEsc(runtime, runtime.deps._t(template.name))}</strong></span>
            <span class="ascend-pick-desc">${ascendTreeEsc(runtime, runtime.deps._t(template.desc))}</span>
            <span class="ascend-pick-section">${runtime.deps._t('노드')}</span><span class="ascend-pick-chips">${chips}</span>
            <span class="ascend-pick-section">${runtime.deps._t('첫 키스톤 ({length}개 가운데 {value}개 할당)', { length: defs.length, value: runtime.deps.CLASS_KEYSTONE_PICK_LIMIT })}</span><span class="ascend-pick-keys">${keys}</span>
            <span class="ascend-pick-cta">${runtime.deps._t('이 전직 고르기')}</span></button>`;
    }
