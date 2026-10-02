// 선택 창 공통 틀(js/selection-dialog-ui.js, 2026-10-03): 코어, 주얼 보관함과 소켓, 혼돈 주입, 조합창 재료, 홀씨 모드 창이
// 같은 틀과 키보드 동작을 쓴다. 전에는 창을 열어도 포커스가 뒤 화면에 남았고, 다시 그리면 창을 새로 만들어 목록이
// 맨 위로 올라갔으며, Esc는 장비 칸 선택 해제가 먼저 받았고, '창을 열면 게임 진행 일시 정지'는 홀씨 창에서만 멈췄다.
// 화면 배치(휴대폰 층, 포커스 테두리)는 실제 화면으로 확인했다. 이 검사는 동작만 본다(AGENTS.md 브라우저 검사 기준).
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { buildGameRuntime } = require('./lib/game-runtime');

// ── 1. The frame and its keyboard, on a small fake DOM ─────────────────────
let active = null, modalOpen = false, buttonsPerPanel = 3;
const overlays = [];
const body = { append(node) { overlays.push(node); node.isConnected = true; } };
function focusable(name) { return { name, isConnected: true, focus() { active = this; } }; }
function makePanel() {
    const panel = { scrollTop: 0, buttons: Array.from({ length: buttonsPerPanel }, (_, i) => focusable('button' + i)),
        focus() { active = panel; }, contains(node) { return node === panel || panel.buttons.includes(node); },
        querySelectorAll() { return panel.buttons; } };
    return panel;
}
function makeOverlay() {
    const overlay = { isConnected: false, panel: null, html: '',
        set innerHTML(html) { overlay.html = html; overlay.panel = makePanel(); },
        get innerHTML() { return overlay.html; },
        querySelector(selector) { return selector === '.selection-overlay-panel' ? overlay.panel : null; },
        contains(node) { return node === overlay || overlay.panel.contains(node); },
        remove() { overlay.isConnected = false; overlays.splice(overlays.indexOf(overlay), 1); } };
    return overlay;
}
let keydown = null;
const frameContext = {
    console, Array, Map, Object, String, Number, Math, JSON,
    document: {
        body, get activeElement() { return active; }, createElement: makeOverlay,
        getElementById: id => overlays.find(overlay => overlay.id === id) || null,
        querySelectorAll: selector => (selector === '.selection-overlay' ? overlays.slice() : []),
        querySelector: selector => (selector === 'dialog:modal' && modalOpen ? {} : null)
    },
    window: { addEventListener(type, listener, capture) { if (type === 'keydown' && capture === true) keydown = listener; } },
    safeExposeGlobals(map) { Object.assign(frameContext, map); }
};
vm.createContext(frameContext);
vm.runInContext(fs.readFileSync('js/selection-dialog-ui.js', 'utf8'), frameContext, { filename: 'js/selection-dialog-ui.js' });
const dialog = frameContext.selectionDialog;
const press = (key, shiftKey = false) => {
    const event = { key, shiftKey, prevented: false, stopped: false,
        preventDefault() { this.prevented = true; }, stopPropagation() { this.stopped = true; } };
    keydown(event);
    return event;
};

const opener = focusable('opener');
active = opener;
dialog.show({ id: 'core-item-overlay', title: '코어', panelClass: 'core-item-panel', body: '<p>본문</p>' });
const overlay = overlays[0];
assert.equal(overlay.className, 'selection-overlay', 'the old CSS classes stay, so the look stays');
assert.match(overlay.innerHTML, /class="selection-overlay-panel core-item-panel" role="dialog" aria-modal="true" aria-labelledby="core-item-overlay-title" tabindex="-1"/);
assert.match(overlay.innerHTML, /id="core-item-overlay-title">코어<\/div>/);
assert.match(overlay.innerHTML, /<button type="button" data-selection-close>닫기<\/button>/, 'the Android back button looks for this 닫기');
assert.equal(active, overlay.panel, 'opening moves focus into the dialog');
assert.ok(keydown, 'the frame listens in the window capture phase, before document Esc handlers');

// Tab and Shift+Tab go round inside the panel.
let event = press('Tab', true);
assert.ok(event.prevented && event.stopped);
assert.equal(active, overlay.panel.buttons[2], 'Shift+Tab from the panel wraps to the last control');
press('Tab');
assert.equal(active, overlay.panel.buttons[0], 'Tab from the last control wraps to the first');
active = { name: 'outside' };
press('Tab');
assert.equal(active, overlay.panel.buttons[0], 'focus that slipped outside comes back in');

// A redraw keeps the dialog, its scroll and the focused control's place.
overlay.panel.scrollTop = 120;
active = overlay.panel.buttons[1];
dialog.show({ id: 'core-item-overlay', title: '코어', panelClass: 'core-item-panel', body: '<p>장착 뒤</p>' });
assert.equal(overlays.length, 1, 'redrawn in place, not recreated');
assert.equal(overlays[0], overlay);
assert.match(overlay.innerHTML, /장착 뒤/);
assert.equal(overlay.panel.scrollTop, 120, 'the list stays where it was');
assert.equal(active, overlay.panel.buttons[1], 'focus stays on the same control');

// A confirmation dialog over it takes Esc first; then Esc closes only the top selection dialog and focus returns.
modalOpen = true;
event = press('Escape');
assert.equal(event.stopped, false);
assert.equal(overlays.length, 1, 'Esc belongs to the confirmation while it is open');
modalOpen = false;
dialog.show({ id: 'stump-cube-picker', title: '조합창에 넣을 재료', panelClass: 'stump-cube-picker-panel', body: '' });
assert.equal(overlays.length, 2);
event = press('Escape');
assert.ok(event.prevented && event.stopped, 'Esc stops before the grid and window Esc handlers');
assert.deepEqual(overlays.map(node => node.id), ['core-item-overlay'], 'only the top dialog closes');
press('Escape');
assert.equal(overlays.length, 0);
assert.equal(active, opener, 'closing returns focus to the control that opened it');

// The backdrop and the close button close it; clicks inside do not.
dialog.show({ id: 'chaos-infusion-overlay', title: '혼돈 주입', panelClass: 'chaos-infusion-panel', body: '' });
const chaos = overlays[0];
chaos.onclick({ target: { closest: () => null } });
assert.equal(overlays.length, 1, 'a click inside the panel keeps the dialog');
chaos.onclick({ target: { closest: selector => (selector === '[data-selection-close]' ? {} : null) } });
assert.equal(overlays.length, 0, 'the 닫기 button closes it');
dialog.show({ id: 'chaos-infusion-overlay', title: '혼돈 주입', panelClass: 'chaos-infusion-panel', body: '' });
overlays[0].onclick({ target: overlays[0] });
assert.equal(overlays.length, 0, 'the backdrop closes it');

// ── 2. The five screens use the frame, and the pause setting stops the game under any of them ───
const nodes = [], keyListeners = [];
const runtime = buildGameRuntime({}, null, {
    addEventListener: (type, listener) => { if (type === 'keydown') keyListeners.push(listener); },
    getElementById: id => nodes.find(node => node.id === id && node.isConnected) || null,
    body: { classList: { contains: () => false }, append(node) { node.isConnected = true; node.remove = () => { node.isConnected = false; }; nodes.push(node); } },
    querySelector: selector => (selector.includes('.selection-overlay') ? nodes.find(node => node.isConnected && node.className === 'selection-overlay') || null : null),
    querySelectorAll: selector => (selector === '.selection-overlay' ? nodes.filter(node => node.isConnected && node.className === 'selection-overlay') : [])
});
const run = source => vm.runInContext(source, runtime);
// The spore screen is nested in the legacy DOM refresh and published on first paint: load its unchanged body.
const espree = require('espree');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const pendingNodes = [espree.parse(uiSource, { ecmaVersion: 'latest', range: true })];
const nestedScreens = new Set(['sporeModeDialogBody', 'openSporeModeOverlay']);
while (pendingNodes.length) {
    const node = pendingNodes.pop();
    if (node.type === 'FunctionDeclaration' && nestedScreens.delete(node.id.name)) vm.runInContext(uiSource.slice(...node.range), runtime);
    for (const value of Object.values(node)) {
        if (Array.isArray(value)) pendingNodes.push(...value.filter(child => child?.type));
        else if (value?.type) pendingNodes.push(value);
    }
}
assert.equal(nestedScreens.size, 0, 'both spore functions were found');
// The real DOM parses the frame; here the panel is a stand-in with the spore grid the spore screen binds to.
runtime.document.createElement = () => ({ isConnected: false, innerHTML: '', className: '', classList: { contains: () => false },
    querySelector: selector => (selector === '.selection-overlay-panel'
        ? { scrollTop: 0, focus() {}, contains: () => false, querySelectorAll: () => [], querySelector: () => ({}) } : null),
    contains: () => false });
run(`startupOverlayActive = false; gameplayStarted = true; game.heroSelectionInitialized = true;
    game.settings.pauseGameOnOverlay = true; game.chaosInfuserUnlocked = true; game.inventory = game.inventory || [];
    window.ringId = (() => { const ring = createItemFromBase(BASE_ITEM_DB.find(base => base.slot === '반지'), 'rare', 20, {}); game.inventory.push(ring); return ring.id; })();
    window.armorId = (() => { const armor = createItemFromBase(BASE_ITEM_DB.find(base => base.slot === '갑옷'), 'rare', 20, {}); game.inventory.push(armor); return armor.id; })();`);
const screens = [
    ['core-item-overlay', 'core-item-panel', 'coreItemsUi.open()', 'coreItemsUi.close()'],
    ['equipment-socket-overlay', 'equipment-socket-panel', 'equipmentSocketsUi.openStore()', 'equipmentSocketsUi.close()'],
    ['equipment-socket-overlay', 'equipment-socket-panel', 'equipmentSocketsUi.open(ringId, false)', 'equipmentSocketsUi.close()'],
    ['chaos-infusion-overlay', 'chaos-infusion-panel', 'chaosInfusionUi.open(armorId, false)', 'chaosInfusionUi.close()'],
    ['stump-cube-picker', 'stump-cube-picker-panel', "stumpCubeUi.openCubePicker('equipment')", 'stumpCubeUi.closeCubePicker()'],
    ['spore-mode-overlay', 'spore-picker-panel', "(selectForCrafting(null, false), openSporeModeOverlay('magicBud'))", "selectionDialog.close('spore-mode-overlay')"]
];
assert.equal(run('isForegroundGameplayPausedForBackground()'), false, 'the game runs with no dialog open');
for (const [id, panelClass, open, close] of screens) {
    run(open);
    const node = nodes.find(entry => entry.id === id && entry.isConnected);
    assert.ok(node, `${open} opens ${id}`);
    assert.ok(node.innerHTML.includes(`class="selection-overlay-panel ${panelClass}" role="dialog" aria-modal="true"`), `${id} uses the shared frame`);
    assert.equal(run('isForegroundGameplayPausedForBackground()'), true, `${id}: the pause setting stops the game`);
    run(close);
    assert.equal(run('isForegroundGameplayPausedForBackground()'), false, `${id}: closing resumes the game`);
}
// Window hotkeys wait while a selection dialog is open (C would open the character window under it).
runtime.Element = class {};
const before = keyListeners.length;
vm.runInContext(fs.readFileSync('js/hotkeys-ui.js', 'utf8'), runtime, { filename: 'js/hotkeys-ui.js' });
run('hotkeysUi.init(); toggleWindowFromHotkey = id => { globalThis.__hotkey = id; return true; };');
const hotkeyListeners = keyListeners.slice(before);
assert.equal(hotkeyListeners.length, 1);
const pressC = () => {
    run('globalThis.__hotkey = null;');
    hotkeyListeners[0]({ code: 'KeyC', key: 'c', target: { closest: () => null }, preventDefault() {} });
    return run('globalThis.__hotkey');
};
run('coreItemsUi.open();');
assert.equal(pressC(), null, 'window hotkeys wait while a selection dialog is open');
run('coreItemsUi.close();');
assert.equal(pressC(), 'tab-character', 'and work again once it closes');
run(`game.settings.pauseGameOnOverlay = false; coreItemsUi.open();`);
assert.equal(run('isForegroundGameplayPausedForBackground()'), false, 'with the setting off the game keeps running under a dialog');
console.log('Selection dialogs: shared frame, focus, Tab loop, redraw in place, Esc order, close paths, five screens and pause: OK');
