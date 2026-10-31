import { createTreeCanvas } from './canvas.js';
import { joinTogether } from './together.js';
import { CATEGORIES, categoryOf } from './edit-tools.js';
import { createModes } from './modes.js';
import { createBulkPanel } from './bulk-panel.js';
import { createPlanning } from './planning.js';
import { createAllocation } from './allocation.js';
import { areaLayout, bundleChoices, nodePower, powerYardstick, scaledBundle, startDistances, weakNodes, workAreaOf, zoneOf } from './insights.js';

const CORE_FIELDS = new Set([
    'id', 'x', 'y', 'type', 'cat', 'name', 'desc', 'mods', 'runtimeEffects', 'statAutoName',
    'archetype', 'optionProfile', 'intentionalNoEffect', 'iconFamily', 'iconAsset'
]);
/** 아이콘 계열의 우리말 이름(갤러리 설명과 계열 고르기). 트리 파일에는 영어 id가 그대로 남는다. */
const ICON_FAMILY_LABELS = Object.freeze({
    blade: '칼날', projectile: '투사체', shield: '방패', potion: '물약', strength: '힘', mystique: '신비', devotion: '헌신', cycle: '순환',
    elemental: '원소', dexterity: '민첩', chaos: '카오스', life: '생명', arcane: '비전', summon: '소환', intelligence: '지능',
    precision: '정밀', wind: '바람', void: '공허', constellation: '별자리'
});
const iconFamilyLabel = family => ICON_FAMILY_LABELS[family] || family;

const TYPE_LABELS = Object.freeze({
    minor: '소형', assist: '보조', normal: '일반', major: '주요', keystone: '키스톤',
    void: '공허', quatrefoil: '성률', start: '시작점'
});
/** 주제(archetype): the themes option bundles come in (ARCHETYPE_PROFILES), in the game's words. A node's 주제 puts its bundles
 * first in the bundle list, and the game draws that theme's icon when the node's options do not pick one. */
const ARCHETYPE_LABELS = Object.freeze({
    strength: '힘', dexterity: '민첩', intelligence: '지능', melee: '근접', slam: '강타', physical: '물리', projectile: '투사체',
    spell: '주문', elemental: '원소', fire: '화염', cold: '냉기', lightning: '번개', chaos: '카오스', ailment: '상태 이상',
    potion: '포션', summon: '소환수', armor: '방어도', evasion: '회피', energyShield: '에너지 보호막', shield: '방패',
    mystique: '신비', devotion: '계시', cycle: '순환'
});
/** Older themes from earlier passes (critical_projectile, guard_regen and the like) read word by word. */
const ARCHETYPE_WORDS = Object.freeze({
    ...ARCHETYPE_LABELS, prism: '프리즘', life: '생명력', precision: '정밀', damage: '피해', roll: '굴림', energy: '에너지', maximum: '최대',
    resist: '저항', bleed: '출혈', speed: '속도', poison: '중독', atk: '공격', efficiency: '효율', echo: '메아리', leech: '흡수',
    critical: '치명타', crit: '치명타', duel: '결투', guard: '수호', deflect: '비껴내기', volley: '일제 사격', accuracy: '정확도', area: '범위',
    sanctuary: '성소', channel: '채널링', block: '막기', regen: '재생', blood: '피', range: '사거리', black: '검은', distill: '증류',
    dot: '지속 피해', recharge: '재충전', mobility: '기동', targets: '대상', arcane: '비전'
});
const archetypeLabel = id => ARCHETYPE_LABELS[id] || String(id).split('_').map(word => ARCHETYPE_WORDS[word] || word).join(' ');
const ICON_CELLS = Object.freeze({
    blade: [0, 0], projectile: [1, 0], shield: [2, 0], potion: [3, 0], strength: [4, 0],
    mystique: [0, 1], devotion: [1, 1], cycle: [2, 1], elemental: [3, 1], dexterity: [4, 1],
    chaos: [0, 2], life: [1, 2], arcane: [2, 2], summon: [3, 2], intelligence: [4, 2],
    precision: [0, 3], wind: [1, 3], void: [2, 3], constellation: [3, 3]
});

const elements = Object.fromEntries([...document.querySelectorAll('[id]')].map(element => [element.id, element]));
let tree = null, config = null, nodeMap = new Map(), history = [], future = [], dirty = false;
// 함께 편집(together.js): null when the server runs alone. guest: opened from the shared address (no save, apply or icon upload).
let together = null, guest = false;
let pendingEffectSnapshot = null;
let insight = { yardstick: new Map(), distances: new Map() };
// The bundle chosen for a node stays chosen while the inspector redraws (it used to snap back to the first one).
let bundlePick = { nodeId: null, value: '' }, hoverId = null;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, character => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    })[character]);
}

function selectedNodes() {
    return canvasEditor.getSelection().map(id => nodeMap.get(String(id))).filter(Boolean);
}

function primaryNode() {
    return selectedNodes()[0] || null;
}

function rebuildNodeMap() {
    nodeMap = new Map((tree && tree.nodes || []).map(node => [String(node.id), node]));
}

function setStatus(message, tone = '') {
    elements['status-message'].textContent = message;
    elements['status-message'].className = tone;
}

/** remote: the change came from another editor (it is already shared, so nothing is sent). */
function setDirty(value = true, remote = false) {
    dirty = value;
    if (value && !remote) together?.changed();
    elements['dirty-state'].textContent = dirty ? '저장되지 않은 변경' : '저장됨';
    elements['dirty-state'].classList.toggle('dirty', dirty);
}

function updateSummary(report) {
    if (!tree) return;
    const base = `노드 ${tree.nodes.length.toLocaleString()} · 연결 ${tree.edges.length.toLocaleString()}`;
    const details = report && report.summary
        ? ` · 미연결 ${report.summary.disconnected} · 겹침 ${report.summary.overlaps}` : '';
    elements['tree-summary'].textContent = base + details;
}

/** The tree now, for undo; mark is how far the received 함께 편집 changes reach, so an undo keeps the others' later changes. */
function snapshotEntry() {
    return { json: JSON.stringify(tree), mark: together ? together.mark() : 0 };
}

function checkpoint(entry) {
    if (!tree) return;
    history.push(entry || snapshotEntry());
    if (history.length > 24) history.shift();
    future = [];
    updateHistoryButtons();
}

function restoreSnapshot(entry) {
    tree = JSON.parse(entry.json);
    if (together && !together.rebase(tree, entry.mark)) setStatus('오래된 단계라 그 뒤 다른 사람의 변경 일부가 함께 되돌아갔을 수 있습니다.', 'error');
    rebuildNodeMap();
    refreshMotifs();
    canvasEditor.setTree(tree);
    // 고른 노드는 되돌린 뒤에도 남는다(있는 것만): 돌리기를 되돌리고 바로 다른 정리를 해 볼 수 있게
    canvasEditor.setSelection(canvasEditor.getSelection());
    renderInspector();
    updateSummary();
    setDirty(true);
    refreshInsights();
}

function undo() {
    if (!history.length) return;
    future.push(snapshotEntry());
    restoreSnapshot(history.pop());
    updateHistoryButtons();
}

function redo() {
    if (!future.length) return;
    history.push(snapshotEntry());
    restoreSnapshot(future.pop());
    updateHistoryButtons();
}

function updateHistoryButtons() {
    elements['undo-button'].disabled = history.length === 0;
    elements['redo-button'].disabled = future.length === 0;
}

function syncEffects(node, effects) {
    const previousMods = Array.isArray(node.mods) ? node.mods : [];
    node.runtimeEffects = effects.map(effect => ({ ...effect, value: Number(effect.value) }));
    node.mods = effects.map((effect, index) => ({
        ...(previousMods[index] || {}), statId: effect.statId, value: Number(effect.value)
    }));
}

function statOptions(selectedId) {
    return config.stats.map(stat => `<option value="${escapeHtml(stat.id)}" ${stat.id === selectedId ? 'selected' : ''}>${escapeHtml(stat.name)} · ${escapeHtml(stat.id)}</option>`).join('');
}

function renderEffects(node) {
    const effects = Array.isArray(node.runtimeEffects) ? node.runtimeEffects : [];
    elements['effect-list'].innerHTML = effects.map((effect, index) => `
        <div class="effect-row" data-effect-index="${index}">
            <select class="effect-stat" aria-label="효과 종류">${statOptions(effect.statId)}</select>
            <input class="effect-value" type="number" step="0.1" value="${escapeHtml(effect.value)}" aria-label="효과 수치">
            <button class="remove-effect" type="button" title="효과 제거">×</button>
        </div>`).join('');
}

function metadataFor(node) {
    return Object.fromEntries(Object.entries(node).filter(([key]) => !CORE_FIELDS.has(key)));
}

function renderIconEditor(node) {
    elements['node-icon-family'].value = node.iconFamily || '';
    elements['icon-family-gallery'].querySelectorAll('.icon-choice').forEach(button => {
        button.classList.toggle('selected', button.dataset.family === (node.iconFamily || ''));
    });
    const preview = elements['custom-icon-preview'];
    preview.textContent = node.iconAsset ? '' : '사용 안 함';
    preview.style.backgroundImage = node.iconAsset ? `url('/${node.iconAsset}')` : 'none';
    elements['clear-custom-icon-button'].disabled = !node.iconAsset;
}

/** Node power, distances and the weak-node marks, recomputed after every change that can move them. */
function refreshInsights() {
    if (!tree) return;
    insight = { yardstick: powerYardstick(tree), distances: startDistances(tree), layout: areaLayout(tree, config.areas) };
    const power = new Map(tree.nodes.map(node => [String(node.id), nodePower(node, insight.yardstick)]));
    elements['weak-count'].textContent = `${weakNodes(tree, insight.yardstick).length}개`;
    canvasEditor.setOverlays({ power, weak: elements['weak-input'].checked, zones: elements['zones-input'].checked, layout: insight.layout });
}

function bundleLines(effects) {
    return effects.map(effect => {
        const [label, suffix] = config.catalog.labels[effect.statId] || [effect.statId, ''];
        return `${label} +${effect.value}${suffix}`;
    }).join(', ');
}

function selectedBundle(node) {
    const [archetype, index] = String(elements['bundle-select'].value || '').split(':');
    const bundle = config.catalog.profiles[archetype] && config.catalog.profiles[archetype][Number(index)];
    return bundle ? { archetype, bundle, effects: scaledBundle(bundle, node, config.catalog) } : null;
}

function renderBundlePicker(node) {
    const power = nodePower(node, insight.yardstick), distance = insight.distances.get(String(node.id));
    const zone = zoneOf(node, insight.layout), steps = distance === undefined ? '이어지지 않음' : `시작점에서 ${distance}칸`;
    elements['node-power'].textContent = power === null ? `${zone.label} 구역, ${steps}`
        : `${zone.label} 구역, ${steps}. 같은 종류 노드의 보통 값에 견줘 ${Math.round(power * 100)}%`;
    const choices = bundleChoices(node, config.catalog, insight.layout), groups = new Map();
    choices.forEach(choice => groups.set(choice.archetype, (groups.get(choice.archetype) || []).concat(choice)));
    elements['bundle-select'].innerHTML = [...groups].map(([archetype, rows]) => `<optgroup label="${escapeHtml(archetypeLabel(archetype))}">`
        + rows.map(({ index, bundle }) => `<option value="${escapeHtml(archetype)}:${index}">${escapeHtml(bundle.name)}</option>`).join('') + '</optgroup>').join('');
    if (bundlePick.nodeId === String(node.id) && choices.some(choice => `${choice.archetype}:${choice.index}` === bundlePick.value)) {
        elements['bundle-select'].value = bundlePick.value;
    }
    renderBundlePreview(node);
}

function renderBundlePreview(node) {
    const picked = selectedBundle(node);
    elements['bundle-preview'].textContent = picked ? bundleLines(picked.effects) : '';
    elements['apply-bundle-button'].disabled = !picked || !['minor', 'assist', 'normal', 'major'].includes(node.type);
}

function pickBundle() {
    const node = primaryNode();
    if (!node) return;
    bundlePick = { nodeId: String(node.id), value: elements['bundle-select'].value };
    renderBundlePreview(node);
}

/** 주제 as a list in the game's words; a node's older theme that has no bundles is kept as its own choice. */
function renderArchetypeSelect(node) {
    const own = node.archetype || '', themes = Object.keys(config.catalog.profiles);
    const older = own && !themes.includes(own) ? `<option value="${escapeHtml(own)}">${escapeHtml(archetypeLabel(own))} (꾸러미 없음)</option>` : '';
    elements['node-archetype'].innerHTML = '<option value="">없음</option>'
        + themes.map(id => `<option value="${escapeHtml(id)}">${escapeHtml(archetypeLabel(id))}</option>`).join('') + older;
    elements['node-archetype'].value = own;
}

// ── 노드 뒤 배경 문양(2026-10-28 사용자: 편집기와 게임 둘 다, 패시브 트리 설계자 문양) ─────────────
// 기본 문양 46종은 서버(/api/config motifs, scripts/lib/passive-tree-background-motifs.js)가, 파일의 문양은 tree.customBackgroundMotifs가 준다.
// 배치는 tree.backgroundMotifs이고 게임 적용 때 런타임에 함께 들어간다.
const MOTIF_GROUP_LABELS = Object.freeze({
    element: '원소와 자연', weapon: '무기와 방어', magic: '마법과 신앙', body: '생명과 행동', symbol: '상징과 도구', celtic: '켈트 매듭', file: '파일의 문양'
});

function motifCatalog() {
    const own = (tree.customBackgroundMotifs || []).filter(definition => definition && definition.id).map(definition => ({
        id: String(definition.id), label: definition.label || String(definition.id), group: 'file', color: definition.color || '#a89a80',
        shapes: (definition.shapes || []).filter(shape => (shape.tag || 'path') === 'path' && shape.d)
            .map(({ d, solid, fillOpacity, fillRule, strokeWidth }) => ({ d, solid: !!solid, fillOpacity, fillRule, strokeWidth }))
    }));
    const ownIds = new Set(own.map(motif => motif.id));
    return config.motifs.filter(motif => !ownIds.has(motif.id)).concat(own);
}

function refreshMotifs() {
    const catalog = motifCatalog(), groups = new Map();
    canvasEditor.setMotifs(Object.fromEntries(catalog.map(motif => [motif.id, motif])));
    catalog.forEach(motif => groups.set(motif.group, (groups.get(motif.group) || []).concat(motif)));
    elements['motif-choice'].innerHTML = [...groups].map(([group, motifs]) => `<optgroup label="${escapeHtml(MOTIF_GROUP_LABELS[group] || group)}">`
        + motifs.map(motif => `<option value="${escapeHtml(motif.id)}">${escapeHtml(motif.label)}</option>`).join('') + '</optgroup>').join('');
}

function motifLabel(motifId) {
    const motif = motifCatalog().find(entry => entry.id === motifId);
    return motif ? motif.label : `${motifId} (그림 없음)`;
}

function selectedMotif() {
    const id = canvasEditor.getSelectedMotif();
    return id ? (tree.backgroundMotifs || []).find(item => item.id === id) || null : null;
}

/** A new motif in the middle of the view, picked so it can be moved and sized at once. */
function placeMotif() {
    const motifId = elements['motif-choice'].value;
    if (!tree || !motifId) return;
    checkpoint();
    const center = canvasEditor.getViewCenter(), item = { id: `bg${Date.now().toString(36)}`, motifId,
        x: Math.round(center.x), y: Math.round(center.y), size: 260, rotation: 0, opacity: 1, visible: true, locked: false };
    tree.backgroundMotifs = (tree.backgroundMotifs || []).concat(item);
    elements['backgrounds-input'].checked = true;
    canvasEditor.setBackgroundsVisible(true);
    canvasEditor.setTree(tree);
    canvasEditor.setSelection([]);
    canvasEditor.selectMotif(item.id);
    setDirty(true);
    setStatus(`${motifLabel(motifId)} 문양을 놓았습니다. 끌어서 옮기고 오른쪽에서 크기와 회전을 정하세요.`, 'success');
}

function renderMotifForm(item) {
    elements['motif-title'].textContent = motifLabel(item.motifId);
    elements['motif-size'].value = item.size ?? 200;
    elements['motif-rotation'].value = item.rotation ?? 0;
    elements['motif-opacity'].value = item.opacity ?? 1;
    elements['motif-locked'].checked = !!item.locked;
    elements['motif-visible'].checked = item.visible !== false;
}

function changeMotif(field, value) {
    const item = selectedMotif();
    if (!item || item[field] === value) return;
    checkpoint();
    item[field] = value;
    setDirty(true);
    canvasEditor.refresh();
}

function deleteMotif() {
    const item = selectedMotif();
    if (!item) return;
    checkpoint();
    tree.backgroundMotifs = tree.backgroundMotifs.filter(entry => entry !== item);
    canvasEditor.setTree(tree);
    renderInspector();
    setDirty(true);
    setStatus(`${motifLabel(item.motifId)} 문양을 지웠습니다.`, 'success');
}

function bindMotifEvents() {
    const number = (id, field, min, max) => {
        elements[id].onchange = event => changeMotif(field, Math.min(max, Math.max(min, Number(event.target.value) || 0)));
    };
    number('motif-size', 'size', 10, 5000); number('motif-rotation', 'rotation', -360, 360); number('motif-opacity', 'opacity', 0, 1);
    elements['motif-locked'].onchange = event => changeMotif('locked', event.target.checked);
    elements['motif-visible'].onchange = event => changeMotif('visible', event.target.checked);
    elements['delete-motif-button'].onclick = deleteMotif;
    elements['add-motif-button'].onclick = placeMotif;
    elements['backgrounds-input'].onchange = event => canvasEditor.setBackgroundsVisible(event.target.checked);
}

// ── 구역 작업(2026-10-28 사용자: 직업 구역별로 따로 작업해서 적용하고 파일로) ─────────────
// 구역은 직업 구역 여섯 조각과 그 안쪽 "가운데"다(서버 scripts/lib/passive-tree-work-areas.js가 나누고 합친다). 구역을 고르면 그 구역만
// 밝고 고를 수 있으며, 구역 파일로 내보내고, 구역 파일을 그 구역 자리에 불러오고(저장하지 않음), 그 구역만 게임에 적용한다.
const focusedArea = () => elements['area-select'].value;
const areaLabelOf = id => (config.areas.list.find(area => area.id === id) || {}).label || id;

function renderAreaChoices() {
    elements['area-select'].innerHTML = '<option value="">전체 트리</option>'
        + config.areas.list.map(area => `<option value="${escapeHtml(area.id)}">${escapeHtml(area.label)} 구역</option>`).join('');
}

function focusArea(area) {
    elements['area-select'].value = area || '';
    const on = !!focusedArea();
    canvasEditor.setFocus(on ? point => workAreaOf(point, insight.layout) === focusedArea() : null);
    if (on && !elements['zones-input'].checked) { elements['zones-input'].checked = true; refreshInsights(); }
    elements['export-area-button'].disabled = !on;
    elements['apply-area-button'].disabled = !on || guest;
    renderInspector();
    if (on) setStatus(`${areaLabelOf(focusedArea())} 구역만 고르고 옮길 수 있습니다. 구역 밖은 흐리게 보입니다.`, 'success');
}

function stampedName(prefix) {
    const now = new Date(), pad = value => String(value).padStart(2, '0');
    return `${prefix}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;
}

function downloadJson(name, data) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' }));
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function exportAreaFile() {
    const area = focusedArea();
    if (!tree || !area) return;
    try {
        const { piece } = await apiRequest('/api/area/extract', { tree, area });
        const name = stampedName(`rignin-passive-area-${area}`);
        downloadJson(name, piece);
        setStatus(`${piece.label} 구역(노드 ${piece.nodes.length}개, 연결 ${piece.edges.length}개)을 ${name} 파일로 내보냈습니다.`, 'success');
    } catch (error) { setStatus(error.message, 'error'); }
}

async function importAreaFile(file) {
    elements['import-area-input'].value = '';
    if (!file) return;
    let piece;
    try { piece = JSON.parse(await file.text()); } catch { return setStatus(`${file.name}: JSON 파일을 읽을 수 없습니다.`, 'error'); }
    try {
        const result = await apiRequest('/api/area/merge', { tree, piece });
        checkpoint();
        tree = result.tree;
        rebuildNodeMap(); refreshMotifs(); canvasEditor.setTree(tree);
        focusArea(result.area.area);
        updateSummary(result); setDirty(true); refreshInsights();
        showAreaReport(file.name, result);
    } catch (error) { setStatus(`${file.name}: ${error.message}`, 'error'); }
}

function showAreaReport(name, result) {
    const area = result.area;
    elements['import-report-title'].textContent = `${area.label} 구역 불러오기: ${name}`;
    elements['import-report-body'].innerHTML = `<p>${escapeHtml(area.label)} 구역의 노드 ${area.removed}개를 파일의 노드 ${area.added}개로 바꿨습니다. 다른 구역은 그대로입니다.</p>`
        + reportList('다른 구역과 id가 겹쳐 바꾼 노드', area.renamed)
        + reportList('끝 노드가 없어 빠진 연결', area.droppedLinks ? [`${area.droppedLinks}개`] : [], 'is-bad')
        + reportList(`저장 전에 고칠 문제 ${result.errors.length}개`, result.errors.slice(0, 8), 'is-bad')
        + reportList(`경고 ${result.warnings.length}개`, groupedWarnings(result.warnings))
        + '<p class="is-note">아직 원본에 저장되지 않았습니다. 이 구역만 적용하거나 원본 저장으로 반영하고, Ctrl+Z로 되돌릴 수 있습니다.</p>';
    elements['import-report'].showModal();
}

/** The open tree's area into the saved source and the game; the other areas stay as they were saved (their unsaved edits stay here). */
async function applyArea() {
    const area = focusedArea();
    if (!tree || !area) return;
    try {
        setStatus(`${areaLabelOf(area)} 구역을 게임에 적용하는 중…`);
        const result = await apiRequest('/api/area/apply', { tree, area });
        reportResult(result);
    } catch (error) { setStatus(error.message, 'error'); }
}

function bindAreaEvents() {
    renderAreaChoices();
    elements['area-select'].onchange = () => focusArea(elements['area-select'].value);
    elements['export-area-button'].onclick = exportAreaFile;
    elements['import-area-input'].onchange = event => importAreaFile(event.target.files[0]);
    elements['apply-area-button'].onclick = applyArea;
    focusArea('');
}

// ── 노드에 마우스를 올리면 무슨 노드인지(2026-10-28 사용자) ─────────────
function effectText(effect) {
    const stat = config.stats.find(row => row.id === effect.statId), value = Number(effect.value);
    return `${statLabel(effect.statId)} ${value >= 0 ? '+' : ''}${value}${stat && stat.isPct ? '%' : ''}`;
}

function hoverLines(node) {
    const effects = Array.isArray(node.runtimeEffects) ? node.runtimeEffects : [];
    const lines = effects.length ? effects.map(effectText) : String(node.desc || '').split('\n').filter(Boolean);
    const need = node.activationRequirement;
    if (need) lines.push(`조건: ${statLabel(need.statId)} ${need.minimum} 이상`);
    return lines;
}

/** A card by the pointer: name, kind and 주제, what the node gives (or its rule text), its id. */
function showNodeHover(node, event) {
    const tip = elements['node-hover-tip'];
    if (!node) {
        hoverId = null;
        tip.hidden = true;
        return;
    }
    if (hoverId !== String(node.id) || tip.hidden) {
        hoverId = String(node.id);
        const meta = [TYPE_LABELS[node.type] || node.type, node.archetype ? `주제 ${archetypeLabel(node.archetype)}` : ''].filter(Boolean).join(', ');
        tip.innerHTML = `<strong>${escapeHtml(node.name || node.id)}</strong><small>${escapeHtml(meta)}</small>`
            + hoverLines(node).map(line => `<span>${escapeHtml(line)}</span>`).join('') + `<code>${escapeHtml(node.id)}</code>`;
        tip.hidden = false;
    }
    const shell = tip.parentElement.getBoundingClientRect();
    const x = Math.min(event.clientX - shell.left + 16, shell.width - tip.offsetWidth - 8);
    const y = Math.min(event.clientY - shell.top + 16, shell.height - tip.offsetHeight - 8);
    tip.style.left = `${Math.max(8, x)}px`;
    tip.style.top = `${Math.max(8, y)}px`;
}

function applyBundle() {
    const node = primaryNode(), picked = node && selectedBundle(node);
    if (!picked) return;
    checkpoint();
    syncEffects(node, picked.effects);
    Object.assign(node, { archetype: picked.archetype, optionProfile: picked.bundle.name });
    if (node.type !== 'major') node.name = picked.bundle.name;
    generateDescription();
    setDirty(true); canvasEditor.setTree(tree); refreshInsights(); renderInspector();
    setStatus(`${picked.bundle.name} 꾸러미로 효과를 채웠습니다.`, 'success');
}

/** The inspector: one node, several nodes (한꺼번에 바꾸기), a picked link, a motif, or the tree's counts and the keys. */
function renderInspector() {
    const nodes = selectedNodes(), node = nodes.length === 1 ? nodes[0] : null, edge = nodes.length ? null : canvasEditor.getSelectedEdge();
    const motif = nodes.length || edge ? null : selectedMotif();
    elements['empty-inspector'].hidden = !!(nodes.length || edge || motif);
    elements['node-form'].hidden = !node;
    elements['motif-form'].hidden = !motif;
    elements['delete-button'].disabled = !nodes.length && !motif && !edge;
    bulkPanel.render();
    bulkPanel.renderEdge(edge);
    planning.render();
    allocation.render();
    if (motif) renderMotifForm(motif);
    if (!nodes.length && !edge && !motif) renderTreeInfo();
    if (!node) return;
    elements['selected-node-title'].textContent = node.name || node.id;
    elements['selected-count-badge'].textContent = nodes.length > 1 ? `${nodes.length}개 선택` : '';
    elements['node-id'].value = node.id;
    elements['node-x'].value = node.x;
    elements['node-y'].value = node.y;
    elements['node-x'].disabled = nodes.length > 1;
    elements['node-y'].disabled = nodes.length > 1;
    elements['node-type'].value = node.type;
    renderCategorySelect(node);
    elements['node-name'].value = node.name || '';
    renderArchetypeSelect(node);
    elements['node-option-profile'].value = node.optionProfile || '';
    elements['node-desc'].value = node.desc || '';
    elements['node-auto-name'].checked = !!node.statAutoName;
    elements['node-no-effect'].checked = !!node.intentionalNoEffect;
    elements['node-metadata'].value = JSON.stringify(metadataFor(node), null, 2);
    renderEffects(node);
    renderIconEditor(node);
    renderBundlePicker(node);
}

function changeNodeField(field, value) {
    const node = primaryNode();
    if (!node || node[field] === value) return;
    checkpoint();
    if (value === '' && ['archetype', 'optionProfile', 'iconFamily', 'iconAsset'].includes(field)) delete node[field];
    else node[field] = value;
    rebuildNodeMap();
    canvasEditor.setTree(tree);
    setDirty(true);
    renderInspector();
}

/** The picture fields (icon family, custom picture) go to every picked node, not only the first (2026-11-01 사용자: 여러 개 클릭해서 이미지 바꾸기).
 * '' clears the field, as changeNodeField does. */
function setIconField(field, value) {
    const nodes = selectedNodes();
    if (nodes.length < 2) return changeNodeField(field, value);
    const ids = new Set(nodes.map(node => String(node.id)));
    const label = field === 'iconFamily' ? (value ? '아이콘 계열을 바꿨습니다' : '아이콘 계열을 자동으로 돌렸습니다') : (value ? '그림을 바꿨습니다' : '커스텀 그림을 해제했습니다');
    change(tree => tree.nodes.filter(node => ids.has(String(node.id))).forEach(node => { if (value === '') delete node[field]; else node[field] = value; }), `노드 ${ids.size}개의 ${label}.`);
}

function bindField(id, field, transform = value => value) {
    elements[id].addEventListener('change', event => changeNodeField(field, transform(event.target.value)));
}

/** The icon family buttons, one per family on the icon sheet (the node form and the several-nodes panel share them). */
function iconChoicesHtml() {
    return config.iconFamilies.map(family => {
        const [x, y] = ICON_CELLS[family] || [0, 0];
        const position = `${x / 4 * 100}% ${y / 3 * 100}%`;
        return `<button class="icon-choice" type="button" data-family="${family}" data-tip="${escapeHtml(iconFamilyLabel(family))}" aria-label="${escapeHtml(iconFamilyLabel(family))}" style="background-position:${position}"></button>`;
    }).join('');
}

function renderIconGallery() {
    elements['node-icon-family'].innerHTML = '<option value="">효과에 따라 자동</option>'
        + config.iconFamilies.map(family => `<option value="${family}">${escapeHtml(iconFamilyLabel(family))}</option>`).join('');
    elements['icon-family-gallery'].innerHTML = iconChoicesHtml();
}

function setConnectionMode(enabled) {
    elements['connection-hint'].hidden = !enabled;
    elements['connection-hint'].textContent = '연결할 첫 노드를 선택하세요.';
    canvasEditor.setConnectMode(enabled);
}

function toggleEdge(from, to) {
    const index = tree.edges.findIndex(edge => new Set([String(edge.a), String(edge.b)]).size === 2
        && [String(edge.a), String(edge.b)].includes(String(from)) && [String(edge.a), String(edge.b)].includes(String(to)));
    checkpoint();
    if (index >= 0) tree.edges.splice(index, 1);
    else tree.edges.push({ a: String(from), b: String(to) });
    canvasEditor.setTree(tree);
    updateSummary();
    refreshInsights();
    setDirty(true);
    setStatus(index >= 0 ? '연결을 제거했습니다.' : '연결을 추가했습니다.', 'success');
}

/**
 * One change to the tree as one undo step (grouped: joins the step before, for key presses in a row), then everything that shows the
 * tree catches up and the change goes to the others in 함께 편집.
 */
function change(apply, message, options = {}) {
    if (!tree) return;
    if (!options.grouped) checkpoint();
    apply(tree);
    rebuildNodeMap();
    canvasEditor.setTree(tree);
    updateSummary();
    setDirty(true);
    renderInspector();
    scheduleInsights();
    if (message) setStatus(message, 'success');
}

/** Nodes go with their links (설계자처럼 묻지 않고 지우고, Ctrl+Z로 되돌린다). */
function deleteNodes(ids, message) {
    const gone = new Set(ids.map(String));
    if (!gone.size) return;
    change(current => {
        current.nodes = current.nodes.filter(node => !gone.has(String(node.id)));
        current.edges = current.edges.filter(edge => !gone.has(String(edge.a)) && !gone.has(String(edge.b)));
    }, message || `노드 ${gone.size}개와 그 연결을 지웠습니다. Ctrl+Z로 되돌립니다.`);
    canvasEditor.setSelection([]);
}

function deleteEdge(key) {
    if (!key) return;
    change(current => { current.edges = current.edges.filter(edge => [String(edge.a), String(edge.b)].sort().join('|') !== key); }, '연결을 끊었습니다.');
    canvasEditor.setSelectedEdge(null);
}

/** Delete and Backspace: the picked nodes, else the picked link, else the picked motif. */
function deleteSelection() {
    const ids = canvasEditor.getSelection();
    if (ids.length) return deleteNodes(ids);
    if (canvasEditor.getSelectedEdge()) return deleteEdge(canvasEditor.getSelectedEdge());
    if (canvasEditor.getSelectedMotif()) return deleteMotif();
    return undefined;
}

/** 분류 as the designer's list; a category the list does not know stays as it is (older v23 nodes). */
function renderCategorySelect(node) {
    const current = node.cat || 'none', known = CATEGORIES.some(cat => cat.id === current);
    elements['node-cat'].innerHTML = (known ? '' : `<option value="${escapeHtml(current)}">${escapeHtml(current)} (이전 분류)</option>`)
        + CATEGORIES.map(cat => `<option value="${cat.id}">${cat.label}</option>`).join('');
    elements['node-cat'].value = current;
}

/** With nothing picked: how many nodes of each type and category (설계자의 패널과 같은 셈). */
function renderTreeInfo() {
    if (!tree) return;
    const count = (list, key) => list.map(row => [row.label, tree.nodes.filter(node => key(node) === row.id).length]).filter(([, n]) => n);
    const types = count(TYPE_ROWS, node => node.type), cats = count(CATEGORIES, node => categoryOf(node).id);
    elements['tree-info'].innerHTML = `<p><b>노드 ${tree.nodes.length.toLocaleString()}개</b> · 연결 ${tree.edges.length.toLocaleString()}개</p>`
        + `<p>${types.map(([label, n]) => `${escapeHtml(label)} ${n}`).join(' · ')}</p><p>${cats.map(([label, n]) => `${escapeHtml(label)} ${n}`).join(' · ')}</p>`;
}

async function apiRequest(path, payload) {
    const response = await fetch(path, payload ? {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    } : undefined);
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || (result.errors || []).join('\n') || '요청 실패'), { result });
    return result;
}

function reportResult(result) {
    updateSummary(result);
    const warning = result.warnings && result.warnings.length ? ` · 경고 ${result.warnings.length}개` : '';
    setStatus(`${result.message || '완료'}${warning}`, result.warnings && result.warnings.length ? '' : 'success');
}

async function saveTree(apply) {
    try {
        setStatus(apply ? '게임 런타임을 생성하고 검사하는 중…' : '원본을 저장하는 중…');
        const result = await apiRequest(apply ? '/api/apply' : '/api/save', { tree });
        setDirty(false);
        reportResult(result);
    } catch (error) {
        const detail = error.result && error.result.errors ? ` ${error.result.errors.slice(0, 2).join(' / ')}` : '';
        setStatus(`${error.message}${detail}`, 'error');
    }
}

// ── 파일로 내보내기 · 불러오기(2026-10-28) ─────────────────
/** The tree as it is now, unsaved edits included, in the source file's shape (it loads back as it is). */
function exportTreeFile() {
    if (!tree) return;
    const name = stampedName('rignin-passive-tree');
    downloadJson(name, tree);
    setStatus(`${name} 파일로 내보냈습니다.`, 'success');
}

/** The editor's own export or a builder file (the server converts it). The whole tree is replaced as one step Ctrl+Z undoes. */
async function importTreeFile(file) {
    elements['import-input'].value = '';
    if (!file) return;
    let source;
    try { source = JSON.parse(await file.text()); } catch { return setStatus(`${file.name}: JSON 파일을 읽을 수 없습니다.`, 'error'); }
    try {
        setStatus(`${file.name} 파일을 불러오는 중…`);
        const result = await apiRequest('/api/import', { tree: source });
        checkpoint();
        tree = result.tree;
        rebuildNodeMap();
        refreshMotifs();
        canvasEditor.setTree(tree); canvasEditor.setSelection([]);
        if (fileViewAngle(tree) !== null) setViewAngle(fileViewAngle(tree));
        canvasEditor.fit();
        renderInspector(); updateSummary(result); setDirty(true); refreshInsights();
        showImportReport(file.name, result);
        setStatus(`${file.name} 파일을 불러왔습니다. 저장하거나 적용하기 전까지 원본은 그대로입니다.`, result.valid ? 'success' : 'error');
    } catch (error) { setStatus(`${file.name}: ${error.message}`, 'error'); }
}

function statLabel(id) {
    const stat = config.stats.find(row => row.id === id);
    return stat ? stat.name.replace(/\s*\(%\)\s*$/, '') : id;
}

function reportList(title, rows, tone = '') {
    if (!rows.length) return '';
    return `<h3>${escapeHtml(title)}</h3><ul${tone ? ` class="${tone}"` : ''}>${rows.map(row => `<li>${escapeHtml(row)}</li>`).join('')}</ul>`;
}

/** "효과가 비어 있습니다: n1" a hundred times reads as one line with a count. */
function groupedWarnings(warnings) {
    const counts = new Map();
    warnings.forEach(warning => { const head = warning.split(': ')[0]; counts.set(head, (counts.get(head) || 0) + 1); });
    return [...counts].map(([head, count]) => (count > 1 ? `${head} ${count}곳` : warnings.find(warning => warning.startsWith(head))));
}

function showImportReport(name, result) {
    const imported = result.imported, summary = result.summary || {};
    const unsupported = Object.entries(imported.unsupported).sort((a, b) => b[1] - a[1]).map(([label, count]) => `${label} ${count}곳`);
    const approximate = Object.entries(imported.approximate).map(([label, row]) => `${label} → ${row.to.map(statLabel).join(', ')} (${row.count}곳)`);
    const links = [imported.missingStarts.length ? `시작점이 없는 직업: ${imported.missingStarts.join(', ')}` : '직업 시작점 6개를 모두 찾았습니다.',
        imported.keystones.length ? `게임 키스톤과 이름이 같아 연결한 키스톤 ${imported.keystones.length}개` : '',
        imported.unknownKeystones.length ? `게임에 없는 키스톤(효과 없음): ${imported.unknownKeystones.join(', ')}` : ''].filter(Boolean);
    elements['import-report-title'].textContent = name;
    elements['import-report-body'].innerHTML = `<p>노드 ${summary.nodes}개, 연결 ${summary.edges}개`
        + `${imported.converted ? `, 설계자 옵션을 게임 옵션으로 바꾼 노드 ${imported.converted}개` : ''}</p>`
        + reportList('게임에 없는 옵션이라 뺀 줄', unsupported, 'is-bad') + reportList('비슷한 게임 옵션으로 바꾼 줄', approximate)
        + reportList('게임 연결', links, imported.missingStarts.length ? 'is-bad' : '')
        + reportList(`저장 전에 고칠 문제 ${result.errors.length}개`, result.errors.slice(0, 8), 'is-bad')
        + reportList(`경고 ${result.warnings.length}개`, groupedWarnings(result.warnings))
        + '<p class="is-note">아직 원본에 저장되지 않았습니다. 원본 저장이나 게임에 적용으로 반영하고, Ctrl+Z로 불러오기 전으로 되돌릴 수 있습니다.</p>';
    elements['import-report'].showModal();
}

function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

async function normalizeIcon(file) {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    const scale = Math.min(100 / bitmap.width, 100 / bitmap.height, 1);
    const width = bitmap.width * scale, height = bitmap.height * scale;
    context.drawImage(bitmap, (128 - width) / 2, (128 - height) / 2, width, height);
    bitmap.close();
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob) throw new Error('아이콘 WebP 변환에 실패했습니다.');
    return blobToDataUrl(blob);
}

async function uploadCustomIcon(file, input = elements['custom-icon-input']) {
    const node = primaryNode();
    if (!node || !file) return;
    try {
        setStatus('아이콘을 128×128 WebP로 정리하는 중…');
        const data = await normalizeIcon(file);
        const result = await apiRequest('/api/icon', { name: `${node.id}-${file.name}`, data });
        const picked = selectedNodes().length;
        setIconField('iconAsset', result.iconAsset);
        setStatus(picked > 1 ? `노드 ${picked}개에 커스텀 아이콘을 등록했습니다.` : '커스텀 아이콘을 등록했습니다.', 'success');
    } catch (error) {
        setStatus(error.message, 'error');
    } finally {
        input.value = '';
    }
}

function generateDescription() {
    const node = primaryNode();
    if (!node) return;
    const statMap = new Map(config.stats.map(stat => [stat.id, stat]));
    const lines = (node.runtimeEffects || []).map(effect => {
        const stat = statMap.get(effect.statId) || { name: effect.statId, isPct: false };
        const value = Number(effect.value), sign = value >= 0 ? '+' : '';
        return `${stat.name} ${sign}${value}${stat.isPct ? '%' : ''}`;
    });
    changeNodeField('desc', lines.join('\n'));
}

function applyMetadata() {
    const node = primaryNode();
    if (!node) return;
    try {
        const metadata = JSON.parse(elements['node-metadata'].value || '{}');
        if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') throw new Error('객체 JSON이 필요합니다.');
        checkpoint();
        Object.keys(node).filter(key => !CORE_FIELDS.has(key)).forEach(key => delete node[key]);
        Object.assign(node, metadata);
        setDirty(true);
        canvasEditor.setTree(tree);
        renderInspector();
        setStatus('고급 메타데이터를 적용했습니다.', 'success');
    } catch (error) { setStatus(`메타데이터 오류: ${error.message}`, 'error'); }
}

const canvasEditor = createTreeCanvas(elements['tree-editor-canvas'], {
    onSelectionChange: () => { renderInspector(); together?.setPresence({ selection: canvasEditor.getSelection() }); },
    onPlace: point => modes.onPlace(point),
    onEdgeSelect: () => renderInspector(),
    onAllocate: node => allocation.toggle(node),
    onPointer: point => together?.setPresence({ cursor: point }),
    onBeforeMove: () => checkpoint(),
    onMove: () => { setDirty(true); renderInspector(); },
    onMoved: ids => {
        setStatus('노드 위치를 변경했습니다.', 'success'); updateSummary();
        // 시작점이 움직이면 직업 구역도 따라 움직인다(areaLayout)
        if (ids.some(id => (nodeMap.get(String(id)) || {}).type === 'start')) refreshInsights();
    },
    onConnect: toggleEdge,
    onHover: showNodeHover,
    onMotifSelect: renderInspector,
    onMotifMove: () => setDirty(true),
    onMotifMoved: () => setStatus('문양 위치를 바꿨습니다.', 'success'),
    onConnectionHint: id => { if (id) elements['connection-hint'].textContent = `${nodeMap.get(id)?.name || id} → 연결할 다음 노드를 선택하세요.`; }
});

function bindEvents() {
    elements['node-form'].addEventListener('submit', event => event.preventDefault());
    bindField('node-x', 'x', Number); bindField('node-y', 'y', Number); bindField('node-type', 'type');
    bindField('node-cat', 'cat'); bindField('node-name', 'name'); bindField('node-archetype', 'archetype');
    bindField('node-option-profile', 'optionProfile'); bindField('node-desc', 'desc');
    elements['node-icon-family'].addEventListener('change', event => setIconField('iconFamily', event.target.value));
    elements['node-auto-name'].addEventListener('change', event => changeNodeField('statAutoName', event.target.checked));
    elements['node-no-effect'].addEventListener('change', event => changeNodeField('intentionalNoEffect', event.target.checked));
    elements['undo-button'].onclick = undo; elements['redo-button'].onclick = redo;
    elements['save-button'].onclick = () => saveTree(false); elements['apply-button'].onclick = () => saveTree(true);
    elements['export-button'].onclick = exportTreeFile;
    elements['import-input'].onchange = event => importTreeFile(event.target.files[0]);
    elements['delete-button'].onclick = deleteSelection;
    elements['fit-button'].onclick = () => canvasEditor.fit();
    elements['rotate-left-button'].onclick = () => turnView(-15);
    elements['rotate-right-button'].onclick = () => turnView(15);
    elements['rotate-reset-button'].onclick = () => setViewAngle(0);
    elements['search-input'].oninput = event => canvasEditor.setSearch(event.target.value);
    const updateGrid = () => canvasEditor.setGrid(elements['snap-input'].checked, elements['grid-size-input'].value);
    elements['snap-input'].onchange = updateGrid; elements['grid-size-input'].onchange = updateGrid;
    elements['generate-description-button'].onclick = generateDescription;
    elements['apply-metadata-button'].onclick = applyMetadata;
    elements['custom-icon-input'].onchange = event => uploadCustomIcon(event.target.files[0]);
    elements['clear-custom-icon-button'].onclick = () => setIconField('iconAsset', '');
    elements['zones-input'].onchange = refreshInsights; elements['weak-input'].onchange = refreshInsights;
    elements['bundle-select'].onchange = pickBundle;
    elements['apply-bundle-button'].onclick = applyBundle;
}

function updateEffectRow(row) {
    const node = primaryNode();
    if (!row || !node) return;
    const index = Number(row.dataset.effectIndex), effects = (node.runtimeEffects || []).map(effect => ({ ...effect }));
    effects[index] = { statId: row.querySelector('.effect-stat').value, value: Number(row.querySelector('.effect-value').value) };
    syncEffects(node, effects);
    setDirty(true);
    canvasEditor.setTree(tree);
    refreshInsights();
}

elements['effect-list'].addEventListener('focusin', event => {
    if (event.target.matches('.effect-stat,.effect-value')) pendingEffectSnapshot = snapshotEntry();
});

elements['effect-list'].addEventListener('input', event => {
    const row = event.target.closest('[data-effect-index]'), node = primaryNode();
    if (!row || !node) return;
    updateEffectRow(row);
});

elements['effect-list'].addEventListener('change', event => {
    const row = event.target.closest('[data-effect-index]');
    if (!row) return;
    updateEffectRow(row);
    if (pendingEffectSnapshot) checkpoint(pendingEffectSnapshot);
    pendingEffectSnapshot = null;
});

elements['effect-list'].addEventListener('click', event => {
    const button = event.target.closest('.remove-effect'), node = primaryNode();
    if (!button || !node) return;
    const index = Number(button.closest('[data-effect-index]').dataset.effectIndex);
    checkpoint();
    const effects = (node.runtimeEffects || []).map(effect => ({ ...effect })); effects.splice(index, 1);
    syncEffects(node, effects); setDirty(true); canvasEditor.setTree(tree); renderInspector();
});

elements['add-effect-button'].onclick = () => {
    const node = primaryNode(); if (!node) return;
    checkpoint();
    syncEffects(node, [...(node.runtimeEffects || []), { statId: config.stats[0].id, value: 1 }]);
    setDirty(true); canvasEditor.setTree(tree); renderInspector();
};

elements['icon-family-gallery'].onclick = event => {
    const button = event.target.closest('[data-family]');
    if (button) setIconField('iconFamily', button.dataset.family);
};

// ── 설계자 기능(2026-10-28 사용자: 설계자에서 쓰던 기능이 없어 불편해 작업을 못 한다) ─────────────
// 모드와 키보드(modes.js), 여러 노드와 연결 패널(bulk-panel.js), 계획 영역(planning.js), 찍어 보기(allocation.js). 모두 change()로 트리를 바꿔
// 실행 취소와 함께 편집이 그대로 따른다.
const TYPE_ROWS = Object.entries(TYPE_LABELS).map(([id, label]) => ({ id, label }));
const isTyping = target => ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || !!target.isContentEditable;
const statSuffix = id => ((config.stats.find(row => row.id === id) || {}).isPct ? '%' : '');
const editorCtx = {
    elements, canvas: canvasEditor, getTree: () => tree, change, setStatus, escapeHtml, syncEffects, statOptions, statLabel, statSuffix,
    selectedIds: () => canvasEditor.getSelection().map(String), selectedNodes, setSelection: ids => canvasEditor.setSelection(ids),
    nodeName: id => (nodeMap.get(String(id)) || {}).name || String(id), gridSize: () => Math.max(5, Number(elements['grid-size-input'].value) || 20),
    snapOn: () => elements['snap-input'].checked, isTyping, redo, renderInspector, deleteNodes, deleteEdge, deleteSelected: deleteSelection,
    setConnectionMode, setAllocating: on => { allocation.setOn(on); renderInspector(); },
    selectAll: () => {
        const area = focusedArea();
        canvasEditor.setSelection(tree.nodes.filter(node => !area || workAreaOf(node, insight.layout) === area).map(node => String(node.id)));
    },
    duplicate: () => modes.duplicate(), copy: () => modes.copySelected(),
    iconChoicesHtml, setIconField, uploadCustomIcon
};
const modes = createModes(editorCtx);
const bulkPanel = createBulkPanel(editorCtx);
const planning = createPlanning(editorCtx);
const allocation = createAllocation(editorCtx);
// 접기(2026-11-01 사용자): 위 도구 줄 둘과 오른쪽 창. 접힌 상태는 이 브라우저에 남는다.
const FOLD_KEYS = { 'toolbars-hidden': 'rignin-passive-toolbars-hidden', 'inspector-hidden': 'rignin-passive-inspector-hidden' };
function setFolded(className, folded) {
    document.body.classList.toggle(className, folded);
    const button = elements[className === 'toolbars-hidden' ? 'toolbars-toggle' : 'inspector-toggle'];
    button.setAttribute('aria-expanded', String(!folded));
    button.textContent = className === 'toolbars-hidden' ? (folded ? '도구 펼치기' : '도구 접기') : (folded ? '◂ 창 펼치기' : '창 접기 ▸');
    try { localStorage.setItem(FOLD_KEYS[className], folded ? '1' : ''); } catch { /* 접힘 기억은 편의일 뿐 */ }
}
function bindFolding() {
    Object.keys(FOLD_KEYS).forEach(className => {
        let folded = false;
        try { folded = localStorage.getItem(FOLD_KEYS[className]) === '1'; } catch { /* 기억이 없으면 펼친 채로 */ }
        setFolded(className, folded);
    });
    elements['toolbars-toggle'].onclick = () => setFolded('toolbars-hidden', !document.body.classList.contains('toolbars-hidden'));
    elements['inspector-toggle'].onclick = () => setFolded('inspector-hidden', !document.body.classList.contains('inspector-hidden'));
}
bindFolding();

const COLOR_MODE_KEY = 'rignin-passive-color-mode';

function setColorMode(value) {
    elements['color-mode'].value = value === 'category' ? 'category' : 'type';
    canvasEditor.setColorOf(elements['color-mode'].value === 'category' ? node => categoryOf(node).color : null);
    try { localStorage.setItem(COLOR_MODE_KEY, elements['color-mode'].value); } catch { /* 색 고르기 기억은 편의일 뿐 */ }
}

function bindDesignerTools() {
    modes.bind(); bulkPanel.bind(); planning.bind(); allocation.bind();
    elements['color-mode'].onchange = event => setColorMode(event.target.value);
    let stored = 'type';
    try { stored = localStorage.getItem(COLOR_MODE_KEY) || 'type'; } catch { /* 기억이 없으면 등급 색 */ }
    setColorMode(stored);
}

window.addEventListener('keydown', event => {
    const typing = isTyping(event.target);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault(); event.shiftKey ? redo() : undo();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); saveTree(event.shiftKey);
    } else if (!typing && event.key === 'Delete') deleteSelection();
    else if (modes.handleKey(event)) return;
    // 시점 회전: 글자판이 한글이어도 같은 자리의 키(Q, E)로 돈다
    else if (!typing && !event.ctrlKey && !event.metaKey && !event.altKey && ['KeyQ', 'KeyE'].includes(event.code)) turnView(event.code === 'KeyQ' ? -15 : 15);
});

// ── 시점 회전(2026-10-28 사용자) ─────────────
// 패시브 트리 설계자의 시점(viewAngle, 화면에서 시계 방향이 +)과 같다: 15°씩 돌리고 정면으로 되돌린다. 노드 모양과 글자는 바로 선 채 자리만 돈다.
// 보는 사람마다 따로다(함께 편집 상대의 화면은 돌리지 않고, 트리 파일에도 쓰지 않는다). 마지막 시점은 이 브라우저에 남고, 시점이 적힌 설계자 파일을
// 불러오면 그 시점으로 연다.
const VIEW_ANGLE_KEY = 'rignin-passive-view-angle';
const fileViewAngle = source => (source && typeof source.viewAngle === 'number' ? Math.max(-180, Math.min(180, source.viewAngle)) : null);

function storedViewAngle() {
    try {
        const value = localStorage.getItem(VIEW_ANGLE_KEY);
        return value === null || !Number.isFinite(Number(value)) ? null : Number(value);
    } catch { return null; }
}

function setViewAngle(degrees) {
    const angle = canvasEditor.setRotation(degrees);
    elements['rotation-label'].textContent = `시점 ${angle}°`;
    elements['rotate-reset-button'].disabled = angle === 0;
    try { localStorage.setItem(VIEW_ANGLE_KEY, String(angle)); } catch { /* 시점 기억은 편의일 뿐이라 저장소가 막혀도 돌린 화면은 그대로다 */ }
}

const turnView = step => setViewAngle(canvasEditor.getRotation() + step);

// ── 함께 편집(2026-10-28 사용자: 다른 사람과 같은 화면을 보며 동시에, 원격) ─────────────
// 서버가 함께 편집으로 켜져 있으면(npm run passive:together) 공유 트리를 받아 시작하고, 다른 사람의 변경은 들어오는 대로 그린다.
// 손님(공유 주소로 들어온 사람)은 원본 저장, 게임 적용, 아이콘 올리기, 구역 적용, 게임 열기를 쓰지 못한다(서버도 막는다).
let insightTimer = null;
const NAME_KEY = 'rignin-passive-together-name';

function scheduleInsights() {
    clearTimeout(insightTimer);
    insightTimer = setTimeout(refreshInsights, 400);
}

/** Another editor's ops are already in the tree: redraw what they touched (a form being typed in stays as it is). */
function showRemoteChange(result) {
    rebuildNodeMap();
    if (result.metaKeys.has('customBackgroundMotifs')) refreshMotifs();
    canvasEditor.setTree(tree);
    const typing = elements['node-form'].contains(document.activeElement);
    if (!typing && selectedNodes().some(node => result.nodeIds.has(String(node.id)))) renderInspector();
    updateSummary();
    setDirty(true, true);
    scheduleInsights();
}

/** The shared tree from the server: at the start, and again after a lost connection (then the old undo steps no longer fit). */
function adoptSharedTree(sharedTree, again) {
    tree = sharedTree;
    rebuildNodeMap();
    if (!again) return;
    history = []; future = []; updateHistoryButtons();
    refreshMotifs(); canvasEditor.setTree(tree); renderInspector(); updateSummary(); refreshInsights();
    setStatus('함께 편집에 다시 이어졌습니다. 서버의 트리를 받았습니다.', 'success');
}

function showPeers(peers, me) {
    const box = elements['together-peers'];
    box.hidden = false;
    box.innerHTML = '<span class="together-label">함께</span>' + [{ ...me, name: `${me.name}(나)` }, ...peers]
        .map(peer => `<span class="together-peer" style="--peer:${escapeHtml(peer.color)}">${escapeHtml(peer.name)}</span>`).join('');
    canvasEditor.setPeers(peers);
}

function limitGuest() {
    ['save-button', 'apply-button', 'custom-icon-input', 'bulk-icon-input', 'apply-area-button'].forEach(id => {
        elements[id].disabled = true;
        elements[id].title = '호스트만 할 수 있습니다.';
    });
    elements['open-game-link'].hidden = true;
}

function storedName() {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
}

/** A guest names themself (shown by their pointer and in the header); the host is 호스트. */
function askName() {
    if (!guest) return Promise.resolve('호스트');
    const dialog = elements['together-join'], input = elements['together-name'];
    input.value = storedName();
    dialog.showModal();
    return new Promise(resolve => dialog.addEventListener('close', () => {
        const name = input.value.trim() || '손님';
        try { localStorage.setItem(NAME_KEY, name); } catch { /* 이름 기억은 편의일 뿐이라 저장소가 막혀도 그대로 들어간다 */ }
        resolve(name);
    }, { once: true }));
}

async function startTogether() {
    guest = !config.together.host;
    if (guest) limitGuest();
    together = await joinTogether({
        name: await askName(), getTree: () => tree, onHello: adoptSharedTree, onRemote: showRemoteChange, onPeers: showPeers,
        onPresence: peers => canvasEditor.setPeers(peers),
        onSaved: message => { setDirty(false); setStatus(message, 'success'); },
        onLost: message => setStatus(message, 'error'),
        onBack: () => setStatus('함께 편집에 다시 이어졌습니다.', 'success')
    });
}

async function initialize() {
    try {
        config = await apiRequest('/api/config');
        if (config.together && config.together.enabled) await startTogether();
        else tree = (await apiRequest('/api/tree')).tree;
        rebuildNodeMap();
        elements['source-label'].textContent = config.sourceFile;
        elements['node-type'].innerHTML = Object.entries(TYPE_LABELS).map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
        renderIconGallery(); bindEvents(); bindMotifEvents(); refreshMotifs(); bindAreaEvents(); bindDesignerTools();
        canvasEditor.setTree(tree); canvasEditor.setGrid(true, 20); setViewAngle(storedViewAngle() ?? fileViewAngle(tree) ?? 0); canvasEditor.fit(); refreshInsights();
        updateSummary(); updateHistoryButtons(); setDirty(false);
        setStatus(together ? '함께 편집에 들어왔습니다. 고친 곳이 다른 사람 화면에도 바로 보입니다.' : '편집기를 불러왔습니다.', 'success');
    } catch (error) { setStatus(error.message, 'error'); }
}

initialize();
