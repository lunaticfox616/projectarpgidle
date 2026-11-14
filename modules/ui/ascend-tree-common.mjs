import { ICONS, KEYSTONE_ART } from './ascend-tree-data.mjs';

export const ascendTreeIconOf = stat => ICONS[stat] || 'star';

export const ascendTreeEsc = (runtime, value) => runtime.deps.escapeHTML(String(value));

export const ascendTreeStatName = (runtime, stat) => String(runtime.deps._t((runtime.deps.P_STATS[stat] && runtime.deps.P_STATS[stat].name) || runtime.deps.getStatName(stat))).replace(/\s*\(%\)$/, '');

export const ascendTreePercent = (runtime, stat) => !!(runtime.deps.P_STATS[stat] && runtime.deps.P_STATS[stat].isPct);

export const ascendTreeLinesOf = node => (node && Array.isArray(node.stats) ? node.stats : (node && node.stat ? [{ stat: node.stat, val: node.val }] : []));

export function ascendTreeLineText(runtime, line) {
        if (line.stat === 'suppCap') return runtime.deps._t('보조스킬룬 장착 한도 +1');
        return `${ascendTreeStatName(runtime, line.stat)} +${runtime.deps.formatValue(line.stat, line.val)}${ascendTreePercent(runtime, line.stat) ? '%' : ''}`;
    }

export const ascendTreeShortValue = (runtime, line) => (line.stat === 'suppCap' ? '+1' : `+${runtime.deps.formatValue(line.stat, line.val)}${ascendTreePercent(runtime, line.stat) ? '%' : ''}`);

export const ascendTreeReqIds = req => (Array.isArray(req) ? req : (req ? [req] : []));

export const ascendTreeTouchOnly = (runtime) => typeof runtime.deps.matchMedia === 'function' && !runtime.deps.matchMedia('(hover: hover)').matches;

export function ascendTreeLayout(rows) {
        const at = new Map();
        rows.forEach((ids, row) => ids.forEach((id, index) => at.set(id, { x: (index + 1) * 100 / (ids.length + 1), y: (row + 0.5) * 100 / rows.length })));
        return at;
    }

export function ascendTreeLinkHtml(points, state) {
        return `<polyline class="is-${state}" points="${points.map(point => `${point.x},${point.y}`).join(' ')}" vector-effect="non-scaling-stroke"></polyline>`;
    }

export function ascendTreeArtHtml(runtime, family) {
        const cell = runtime.deps.passiveNodes.iconAtlasCell[family] || runtime.deps.passiveNodes.iconAtlasCell.constellation;
        return `<span class="ascend-socket"><span class="ascend-art" style="--cx:${cell[0]};--cy:${cell[1]}"></span></span>`;
    }

export const ascendTreeStatFamily = (runtime, stat) => runtime.deps.passiveNodes.iconFamily[stat] || (stat ? 'arcane' : 'constellation');

export function ascendTreeKeystoneFamily(desc) {
        const text = String(desc || '');
        const found = KEYSTONE_ART.map(([word, family]) => [text.indexOf(word), family]).filter(([at]) => at >= 0).sort((a, b) => a[0] - b[0]);
        return found.length ? found[0][1] : 'constellation';
    }

export const ascendTreeLinkState = (a, b) => (a === 'taken' && b === 'taken' ? 'done' : (a === 'taken' ? 'lit' : 'dim'));

export const ascendTreeKeystoneReqs = k => [k.req, ...(Array.isArray(k.reqAny) ? k.reqAny : [])].filter(Boolean);

export function ascendTreeKeystoneRows(defs) {
        const ids = new Set(defs.map(k => k.id)), depth = new Map(defs.map(k => [k.id, 0]));
        for (let pass = 0; pass < defs.length; pass++) {
            defs.forEach(k => {
                const reqs = ascendTreeKeystoneReqs(k).filter(id => ids.has(id));
                if (reqs.length) depth.set(k.id, 1 + Math.max(...reqs.map(id => depth.get(id))));
            });
        }
        const last = Math.max(0, ...depth.values()) + 1, rows = [];
        defs.forEach(k => { const d = k.fifthJobOnly ? last : depth.get(k.id); (rows[d] = rows[d] || []).push(k.id); });
        return rows.filter(Boolean);
    }

export const ascendTreeCanTake = state => state === 'open' || state === 'nopoint';

export const ascendTreeDetailHead = (runtime, title, stateText, state) => `<p class="ascend-detail-head"><strong>${ascendTreeEsc(runtime, title)}</strong><small class="is-${state}">${ascendTreeEsc(runtime, stateText)}</small>
        <button type="button" class="ascend-detail-close" data-ascend-action="clear">${runtime.deps._t('닫기')}</button></p>`;

export const ascendTreeActionHtml = (runtime, label) => (label ? `<button type="button" class="ascend-detail-act" data-ascend-action="act">${ascendTreeEsc(runtime, label)}</button>` : '');

export function ascendTreePreviewHtml(runtime, field, id, verb) {
        const parts = runtime.deps.buildStatPreviewParts(runtime.deps.previewBuildStats(copy => { copy[field] = [...(copy[field] || []), id]; }));
        return parts ? `<p class="ascend-preview">${verb} ${parts}</p>` : '';
    }

export function ascendTreeScrollerOf(runtime, el) {
        for (let at = el.parentElement; at; at = at.parentElement) {
            if (/auto|scroll/.test(runtime.deps.getComputedStyle(at).overflowY) && at.scrollHeight > at.clientHeight) return at;
        }
        return runtime.deps.document.scrollingElement;
    }
