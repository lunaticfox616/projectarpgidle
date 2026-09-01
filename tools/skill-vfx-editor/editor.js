const grid = document.querySelector('#asset-grid');
const template = document.querySelector('#asset-card-template');
const statusText = document.querySelector('#status-text');
const countText = document.querySelector('#asset-count');
const searchInput = document.querySelector('#search-input');
const filterSelect = document.querySelector('#filter-select');
const pendingByPath = new Map();
let assets = [];
let projectRoot = '';

const SHARED_KEYS = new Set([
    'skillFxChainPrimary', 'skillFxChainJump', 'skillFxSlamPrimary', 'skillFxSlamAftershock',
    'skillFxSlash', 'skillFxProjectile', 'skillFxFrostField', 'skillFxBurst', 'skillFxDotField', 'skillFxSummonStrike'
]);

function setStatus(message, isError = false) {
    statusText.textContent = message;
    statusText.style.color = isError ? '#ff9b91' : '#b9cad4';
}

function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1024 / 1024).toFixed(2)} MB`;
}

async function requestJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    if (!response.ok) throw new Error(payload.error || `HTTP ${response.status}`);
    return payload;
}

function readFileDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('선택한 이미지를 읽지 못했습니다.'));
        reader.readAsDataURL(file);
    });
}

function loadImage(source) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('이미지 크기와 투명도를 확인하지 못했습니다.'));
        image.src = source;
    });
}

function waitForImage(image) {
    if (image.complete && image.naturalWidth) return Promise.resolve(image);
    return new Promise((resolve, reject) => {
        image.addEventListener('load', () => resolve(image), { once: true });
        image.addEventListener('error', () => reject(new Error('원본 이펙트 이미지를 읽지 못했습니다.')), { once: true });
    });
}

function drawContainedImage(source, width, height, mime) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const scale = Math.min(width / source.naturalWidth, height / source.naturalHeight);
    const drawWidth = source.naturalWidth * scale;
    const drawHeight = source.naturalHeight * scale;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, width, height);
    context.drawImage(source, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
    return canvas.toDataURL(mime, 0.98);
}

async function prepareReplacement(asset, file, originalImage) {
    await waitForImage(originalImage);
    const sourceData = await readFileDataUrl(file);
    const sourceImage = await loadImage(sourceData);
    const extension = asset.path.toLowerCase().endsWith('.webp') ? 'webp' : 'png';
    const mime = `image/${extension}`;
    const sameShape = sourceImage.naturalWidth === originalImage.naturalWidth
        && sourceImage.naturalHeight === originalImage.naturalHeight;
    const useOriginalBytes = sameShape && file.type === mime;
    const data = useOriginalBytes
        ? sourceData
        : drawContainedImage(sourceImage, originalImage.naturalWidth, originalImage.naturalHeight, mime);
    return {
        data,
        width: originalImage.naturalWidth,
        height: originalImage.naturalHeight,
        normalized: !useOriginalBytes
    };
}

function assetMatches(asset) {
    const query = searchInput.value.trim().toLowerCase();
    const haystack = `${asset.label} ${asset.usage} ${asset.key} ${asset.path}`.toLowerCase();
    if (query && !haystack.includes(query)) return false;
    const filter = filterSelect.value;
    if (filter === 'dedicated') return !SHARED_KEYS.has(asset.key);
    if (filter === 'shared') return SHARED_KEYS.has(asset.key);
    if (filter === 'sheet') return asset.fixedLayout;
    if (filter === 'changed') return asset.hasBackup;
    return true;
}

function applyFilters() {
    let visible = 0;
    grid.querySelectorAll('.asset-card').forEach(card => {
        const asset = assets.find(entry => entry.path === card.dataset.path);
        const show = asset && assetMatches(asset);
        card.hidden = !show;
        if (show) visible += 1;
    });
    countText.textContent = `사용 중 ${assets.length}개 · 표시 ${visible}개`;
}

function updateImageDimensions(image, output) {
    const render = () => { output.textContent = `${image.naturalWidth} × ${image.naturalHeight}px`; };
    if (image.complete && image.naturalWidth) render();
    else image.addEventListener('load', render, { once: true });
}

async function chooseReplacement(asset, card, file) {
    if (!file) return;
    const image = card.querySelector('.asset-image');
    setStatus(`${asset.label} 이미지를 준비하는 중입니다…`);
    const prepared = await prepareReplacement(asset, file, image);
    pendingByPath.set(asset.path, prepared.data);
    image.src = prepared.data;
    card.querySelector('.pending-badge').hidden = false;
    card.querySelector('.replace-button').disabled = false;
    const note = prepared.normalized ? ' 원본 크기와 형식으로 자동 정리했습니다.' : '';
    setStatus(`${asset.label}: ${prepared.width}×${prepared.height}px 교체 미리보기입니다.${note}`);
}

async function replaceAsset(asset) {
    const data = pendingByPath.get(asset.path);
    if (!data) return;
    setStatus(`${asset.label} 교체 후 시각 회귀 검사를 실행하는 중입니다…`);
    const payload = await requestJson('/api/replace', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: asset.path, data })
    });
    pendingByPath.delete(asset.path);
    setStatus(`${payload.message} 검사도 통과했습니다.`);
    await loadAssets(false);
}

async function restoreAsset(asset) {
    if (!window.confirm(`${asset.label}을(를) 편집 전 최초 원본으로 복구할까요?`)) return;
    setStatus(`${asset.label} 원본을 복구하고 검사하는 중입니다…`);
    const payload = await requestJson('/api/restore', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: asset.path })
    });
    pendingByPath.delete(asset.path);
    setStatus(`${payload.message} 검사도 통과했습니다.`);
    await loadAssets(false);
}

function bindCardActions(card, asset) {
    const fileInput = card.querySelector('.file-input');
    fileInput.addEventListener('change', () => {
        chooseReplacement(asset, card, fileInput.files[0]).catch(error => setStatus(error.message, true));
    });
    card.querySelector('.replace-button').addEventListener('click', () => {
        replaceAsset(asset).catch(error => setStatus(`교체 실패: ${error.message}`, true));
    });
    card.querySelector('.restore-button').addEventListener('click', () => {
        restoreAsset(asset).catch(error => setStatus(`복구 실패: ${error.message}`, true));
    });
}

function createAssetCard(asset) {
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.path = asset.path;
    card.querySelector('.asset-label').textContent = asset.label;
    card.querySelector('.asset-usage').textContent = asset.usage;
    card.querySelector('.asset-format').textContent = asset.path.split('.').pop().toUpperCase();
    const budget = asset.maxBytes ? ` / 제한 ${formatBytes(asset.maxBytes)}` : '';
    card.querySelector('.asset-bytes').textContent = `${formatBytes(asset.bytes)}${budget}`;
    card.querySelector('.asset-key').textContent = asset.key;
    card.querySelector('.asset-path').textContent = asset.path;
    card.querySelector('.layout-warning').hidden = !asset.fixedLayout;
    const image = card.querySelector('.asset-image');
    image.alt = `${asset.label} 이펙트 이미지`;
    image.src = `/${asset.path}?v=${encodeURIComponent(asset.modifiedAt)}`;
    updateImageDimensions(image, card.querySelector('.asset-dimensions'));
    const download = card.querySelector('.download-link');
    download.href = `/api/download?path=${encodeURIComponent(asset.path)}`;
    download.download = asset.path.split('/').pop();
    card.querySelector('.restore-button').hidden = !asset.hasBackup;
    bindCardActions(card, asset);
    return card;
}

async function loadAssets(announce = true) {
    const payload = await requestJson('/api/assets');
    assets = payload.assets;
    projectRoot = payload.root;
    grid.replaceChildren(...assets.map(createAssetCard));
    applyFilters();
    if (announce) setStatus(`${assets.length}개 이미지를 불러왔습니다. 프로젝트: ${projectRoot}`);
}

async function copyAssetPaths() {
    const paths = assets.map(asset => `${projectRoot}\\${asset.path.replaceAll('/', '\\')}`).join('\n');
    await navigator.clipboard.writeText(paths);
    setStatus(`${assets.length}개 원본 파일의 전체 경로를 복사했습니다.`);
}

searchInput.addEventListener('input', applyFilters);
filterSelect.addEventListener('change', applyFilters);
document.querySelector('#refresh-button').addEventListener('click', () => {
    loadAssets().catch(error => setStatus(error.message, true));
});
document.querySelector('#copy-paths-button').addEventListener('click', () => {
    copyAssetPaths().catch(error => setStatus(`경로 복사 실패: ${error.message}`, true));
});

loadAssets().catch(error => setStatus(`불러오기 실패: ${error.message}`, true));
