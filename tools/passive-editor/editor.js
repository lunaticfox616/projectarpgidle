import { createTreeCanvas } from './canvas.js';

const CORE_FIELDS = new Set([
    'id', 'x', 'y', 'type', 'cat', 'name', 'desc', 'mods', 'runtimeEffects', 'statAutoName',
    'archetype', 'optionProfile', 'intentionalNoEffect', 'iconFamily', 'iconAsset'
]);
const TYPE_LABELS = Object.freeze({
    minor: '소형', assist: '보조', normal: '일반', major: '주요', keystone: '키스톤',
    void: '공허', quatrefoil: '성률', start: '시작점'
});
const ICON_CELLS = Object.freeze({
    blade: [0, 0], projectile: [1, 0], shield: [2, 0], potion: [3, 0], strength: [4, 0],
    mystique: [0, 1], devotion: [1, 1], cycle: [2, 1], elemental: [3, 1], dexterity: [4, 1],
    chaos: [0, 2], life: [1, 2], arcane: [2, 2], summon: [3, 2], intelligence: [4, 2],
    precision: [0, 3], wind: [1, 3], void: [2, 3], constellation: [3, 3]
});

const elements = Object.fromEntries([...document.querySelectorAll('[id]')].map(element => [element.id, element]));
let tree = null, config = null, nodeMap = new Map(), history = [], future = [], dirty = false;
let pendingEffectSnapshot = null;

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

function setDirty(value = true) {
    dirty = value;
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

function checkpoint(snapshot) {
    if (!tree) return;
    history.push(snapshot || JSON.stringify(tree));
    if (history.length > 24) history.shift();
    future = [];
    updateHistoryButtons();
}

function restoreSnapshot(snapshot) {
    tree = JSON.parse(snapshot);
    rebuildNodeMap();
    canvasEditor.setTree(tree);
    canvasEditor.setSelection([]);
    renderInspector();
    updateSummary();
    setDirty(true);
}

function undo() {
    if (!history.length) return;
    future.push(JSON.stringify(tree));
    restoreSnapshot(history.pop());
    updateHistoryButtons();
}

function redo() {
    if (!future.length) return;
    history.push(JSON.stringify(tree));
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

function renderInspector() {
    const nodes = selectedNodes(), node = nodes[0];
    elements['empty-inspector'].hidden = !!node;
    elements['node-form'].hidden = !node;
    elements['delete-button'].disabled = nodes.length === 0;
    if (!node) return;
    elements['selected-node-title'].textContent = node.name || node.id;
    elements['selected-count-badge'].textContent = nodes.length > 1 ? `${nodes.length}개 선택` : '';
    elements['node-id'].value = node.id;
    elements['node-x'].value = node.x;
    elements['node-y'].value = node.y;
    elements['node-x'].disabled = nodes.length > 1;
    elements['node-y'].disabled = nodes.length > 1;
    elements['node-type'].value = node.type;
    elements['node-cat'].value = node.cat || '';
    elements['node-name'].value = node.name || '';
    elements['node-archetype'].value = node.archetype || '';
    elements['node-option-profile'].value = node.optionProfile || '';
    elements['node-desc'].value = node.desc || '';
    elements['node-auto-name'].checked = !!node.statAutoName;
    elements['node-no-effect'].checked = !!node.intentionalNoEffect;
    elements['node-metadata'].value = JSON.stringify(metadataFor(node), null, 2);
    renderEffects(node);
    renderIconEditor(node);
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

function bindField(id, field, transform = value => value) {
    elements[id].addEventListener('change', event => changeNodeField(field, transform(event.target.value)));
}

function renderIconGallery() {
    elements['node-icon-family'].innerHTML = '<option value="">효과에 따라 자동</option>'
        + config.iconFamilies.map(family => `<option value="${family}">${family}</option>`).join('');
    elements['icon-family-gallery'].innerHTML = config.iconFamilies.map(family => {
        const [x, y] = ICON_CELLS[family] || [0, 0];
        const position = `${x / 4 * 100}% ${y / 3 * 100}%`;
        return `<button class="icon-choice" type="button" data-family="${family}" title="${family}" style="background-position:${position}"></button>`;
    }).join('');
}

function setConnectionMode(enabled) {
    elements['connect-button'].setAttribute('aria-pressed', String(enabled));
    elements['connect-button'].textContent = enabled ? '연결 편집 중' : '연결 편집';
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
    setDirty(true);
    setStatus(index >= 0 ? '연결을 제거했습니다.' : '연결을 추가했습니다.', 'success');
}

function addNode() {
    const center = canvasEditor.getViewCenter();
    const grid = Math.max(5, Number(elements['grid-size-input'].value) || 20);
    const id = `custom_${Date.now().toString(36)}`;
    checkpoint();
    tree.nodes.push({
        cat: 'none', id, x: Math.round(center.x / grid) * grid, y: Math.round(center.y / grid) * grid,
        type: 'minor', name: '새 패시브', desc: '', mods: [], statAutoName: false, runtimeEffects: []
    });
    rebuildNodeMap();
    canvasEditor.setTree(tree);
    canvasEditor.setSelection([id]);
    updateSummary();
    setDirty(true);
}

function deleteSelection() {
    const ids = new Set(canvasEditor.getSelection());
    if (!ids.size || !window.confirm(`선택한 노드 ${ids.size}개와 연결선을 삭제할까요?`)) return;
    checkpoint();
    tree.nodes = tree.nodes.filter(node => !ids.has(String(node.id)));
    tree.edges = tree.edges.filter(edge => !ids.has(String(edge.a)) && !ids.has(String(edge.b)));
    rebuildNodeMap();
    canvasEditor.setTree(tree);
    canvasEditor.setSelection([]);
    updateSummary();
    setDirty(true);
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

async function uploadCustomIcon(file) {
    const node = primaryNode();
    if (!node || !file) return;
    try {
        setStatus('아이콘을 128×128 WebP로 정리하는 중…');
        const data = await normalizeIcon(file);
        const result = await apiRequest('/api/icon', { name: `${node.id}-${file.name}`, data });
        checkpoint();
        node.iconAsset = result.iconAsset;
        canvasEditor.setTree(tree);
        setDirty(true);
        renderInspector();
        setStatus('커스텀 아이콘을 등록했습니다.', 'success');
    } catch (error) {
        setStatus(error.message, 'error');
    } finally {
        elements['custom-icon-input'].value = '';
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
    onSelectionChange: renderInspector,
    onBeforeMove: () => checkpoint(),
    onMove: () => { setDirty(true); renderInspector(); },
    onMoved: () => { setStatus('노드 위치를 변경했습니다.', 'success'); updateSummary(); },
    onConnect: toggleEdge,
    onConnectionHint: id => { if (id) elements['connection-hint'].textContent = `${nodeMap.get(id)?.name || id} → 연결할 다음 노드를 선택하세요.`; }
});

function bindEvents() {
    elements['node-form'].addEventListener('submit', event => event.preventDefault());
    bindField('node-x', 'x', Number); bindField('node-y', 'y', Number); bindField('node-type', 'type');
    bindField('node-cat', 'cat'); bindField('node-name', 'name'); bindField('node-archetype', 'archetype');
    bindField('node-option-profile', 'optionProfile'); bindField('node-desc', 'desc'); bindField('node-icon-family', 'iconFamily');
    elements['node-auto-name'].addEventListener('change', event => changeNodeField('statAutoName', event.target.checked));
    elements['node-no-effect'].addEventListener('change', event => changeNodeField('intentionalNoEffect', event.target.checked));
    elements['undo-button'].onclick = undo; elements['redo-button'].onclick = redo;
    elements['save-button'].onclick = () => saveTree(false); elements['apply-button'].onclick = () => saveTree(true);
    elements['add-node-button'].onclick = addNode; elements['delete-button'].onclick = deleteSelection;
    elements['fit-button'].onclick = () => canvasEditor.fit();
    elements['connect-button'].onclick = () => setConnectionMode(elements['connect-button'].getAttribute('aria-pressed') !== 'true');
    elements['search-input'].oninput = event => canvasEditor.setSearch(event.target.value);
    const updateGrid = () => canvasEditor.setGrid(elements['snap-input'].checked, elements['grid-size-input'].value);
    elements['snap-input'].onchange = updateGrid; elements['grid-size-input'].onchange = updateGrid;
    elements['generate-description-button'].onclick = generateDescription;
    elements['apply-metadata-button'].onclick = applyMetadata;
    elements['custom-icon-input'].onchange = event => uploadCustomIcon(event.target.files[0]);
    elements['clear-custom-icon-button'].onclick = () => changeNodeField('iconAsset', '');
}

function updateEffectRow(row) {
    const node = primaryNode();
    if (!row || !node) return;
    const index = Number(row.dataset.effectIndex), effects = (node.runtimeEffects || []).map(effect => ({ ...effect }));
    effects[index] = { statId: row.querySelector('.effect-stat').value, value: Number(row.querySelector('.effect-value').value) };
    syncEffects(node, effects);
    setDirty(true);
    canvasEditor.setTree(tree);
}

elements['effect-list'].addEventListener('focusin', event => {
    if (event.target.matches('.effect-stat,.effect-value')) pendingEffectSnapshot = JSON.stringify(tree);
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
    if (button) changeNodeField('iconFamily', button.dataset.family);
};

window.addEventListener('keydown', event => {
    const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName);
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault(); event.shiftKey ? redo() : undo();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault(); saveTree(event.shiftKey);
    } else if (!typing && event.key === 'Delete') deleteSelection();
});

async function initialize() {
    try {
        const [treeResult, configResult] = await Promise.all([apiRequest('/api/tree'), apiRequest('/api/config')]);
        tree = treeResult.tree; config = configResult;
        rebuildNodeMap();
        elements['source-label'].textContent = config.sourceFile;
        elements['node-type'].innerHTML = Object.entries(TYPE_LABELS).map(([id, label]) => `<option value="${id}">${label}</option>`).join('');
        renderIconGallery(); bindEvents();
        canvasEditor.setTree(tree); canvasEditor.setGrid(true, 20); canvasEditor.fit();
        updateSummary(); updateHistoryButtons(); setDirty(false); setStatus('편집기를 불러왔습니다.', 'success');
    } catch (error) { setStatus(error.message, 'error'); }
}

initialize();
