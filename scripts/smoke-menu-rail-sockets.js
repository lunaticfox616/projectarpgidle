const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/ui-window-manager.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');
const menuCss = fs.readFileSync('css/ui-menu-sockets.css', 'utf8');

function readFunctionSource(sourceText, name) {
    const start = sourceText.indexOf(`function ${name}(`);
    assert(start >= 0, `${name} must exist`);
    let depth = 0;
    for (let index = sourceText.indexOf('{', start); index < sourceText.length; index++) {
        if (sourceText[index] === '{') depth++;
        if (sourceText[index] !== '}') continue;
        depth--;
        if (depth === 0) return sourceText.slice(start, index + 1);
    }
    throw new Error(`${name} must have a closing brace`);
}

function createStyle() {
    const values = {};
    return {
        setProperty: (key, value) => { values[key] = String(value); },
        removeProperty: key => { delete values[key]; },
        getPropertyValue: key => values[key] || ''
    };
}

function createClassList(element) {
    return {
        add: (...names) => names.forEach(name => element.classes.add(name)),
        remove: (...names) => names.forEach(name => element.classes.delete(name)),
        contains: name => element.classes.has(name),
        toggle: (name, force) => {
            const enabled = force === undefined ? !element.classes.has(name) : !!force;
            if (enabled) element.classes.add(name); else element.classes.delete(name);
            return enabled;
        }
    };
}

function descendants(element) {
    return element.children.flatMap(child => [child, ...descendants(child)]);
}

function directClass(element, className) {
    return element.children.filter(child => child.classList.contains(className));
}

function selectAll(element, selector) {
    if (selector.includes(',')) {
        const results = selector.split(',').flatMap(part => selectAll(element, part.trim()));
        return results.filter((item, index) => results.indexOf(item) === index);
    }
    if (selector === ':scope > .ui-rail-tab-layer .tab-btn') {
        return directClass(element, 'ui-rail-tab-layer')
            .flatMap(layer => descendants(layer).filter(child => child.classList.contains('tab-btn')));
    }
    if (selector === ':scope > .ui-rail-misc-panel .tab-btn') {
        return directClass(element, 'ui-rail-misc-panel')
            .flatMap(panel => descendants(panel).filter(child => child.classList.contains('tab-btn')));
    }
    if (selector === '[data-rail-slot]') return descendants(element).filter(child => child.dataset.railSlot);
    if (selector.startsWith(':scope > .')) {
        return directClass(element, selector.slice(':scope > .'.length));
    }
    if (selector === '.noti-dot, .inventory-full-warning') {
        return descendants(element).filter(child => child.classList.contains('noti-dot') || child.classList.contains('inventory-full-warning'));
    }
    if (selector === '.tab-btn') return descendants(element).filter(child => child.classList.contains('tab-btn'));
    if (/^\.[\w-]+$/.test(selector)) return descendants(element).filter(child => child.classList.contains(selector.slice(1)));
    if (selector.startsWith('#')) return descendants(element).filter(child => child.id === selector.slice(1));
    return [];
}

function defineElementAccessors(element) {
    Object.defineProperty(element, 'className', {
        get: () => Array.from(element.classes).join(' '),
        set: value => { element.classes = new Set(String(value).split(/\s+/).filter(Boolean)); }
    });
    Object.defineProperty(element, 'innerHTML', {
        get: () => '',
        set: html => {
            element.children = [];
            for (const match of String(html).matchAll(/id="([^"]+)"(?:\s+class="([^"]+)")?/g)) {
                const child = createElement('span');
                child.id = match[1];
                if (match[2]) child.className = match[2];
                element.appendChild(child);
            }
        }
    });
    Object.defineProperty(element, 'firstChild', { get: () => element.children[0] || null });
    Object.defineProperty(element, 'childNodes', { get: () => element.children });
    Object.defineProperty(element, 'nextElementSibling', {
        get: () => {
            if (!element.parentElement) return null;
            return element.parentElement.children[element.parentElement.children.indexOf(element) + 1] || null;
        }
    });
}

function createElement(tagName) {
    const element = {
        tagName: String(tagName).toUpperCase(), id: '', children: [], parentElement: null,
        classes: new Set(), classList: null, style: createStyle(), dataset: {}, attrs: {}, handlers: {},
        hidden: false, textContent: '', innerText: '', draggable: false,
        setAttribute(key, value) { this.attrs[key] = String(value); },
        getAttribute(key) { return this.attrs[key] || null; },
        addEventListener(type, handler) { this.handlers[type] = handler; },
        removeEventListener() {},
        appendChild(child) {
            if (child.parentElement) child.parentElement.children = child.parentElement.children.filter(item => item !== child);
            child.parentElement = this;
            this.children.push(child);
            return child;
        },
        prepend(child) {
            if (child.parentElement) child.parentElement.children = child.parentElement.children.filter(item => item !== child);
            child.parentElement = this;
            this.children.unshift(child);
        },
        insertBefore(child, before) {
            if (child.parentElement) child.parentElement.children = child.parentElement.children.filter(item => item !== child);
            child.parentElement = this;
            const index = this.children.indexOf(before);
            this.children.splice(index < 0 ? this.children.length : index, 0, child);
        },
        removeChild(child) {
            this.children = this.children.filter(item => item !== child);
            child.parentElement = null;
            return child;
        },
        remove() {
            if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(item => item !== this);
            this.parentElement = null;
        },
        querySelectorAll(selector) { return selectAll(this, selector); },
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
        contains(node) { return node === this || descendants(this).includes(node); },
        closest(selector) {
            let current = this;
            while (current) {
                if (selector === '.tab-btn' && current.classList.contains('tab-btn')) return current;
                current = current.parentElement;
            }
            return null;
        },
        matches() { return false; },
        focus() {},
        getBoundingClientRect() { return { right: this.classList.contains('tab-header') ? 222 : 0 }; }
    };
    element.classList = createClassList(element);
    defineElementAccessors(element);
    return element;
}

const PRIMARY_TAB_IDS = [
    'character', 'char', 'season', 'expertise', 'traits', 'talent', 'items', 'jewel',
    'flask', 'map', 'skills', 'journal', 'codex', 'talisman', 'cube'
];

function createTabHeader(body, openedTabs) {
    const header = createElement('div');
    header.className = 'tab-header';
    body.appendChild(header);
    ['battle', ...PRIMARY_TAB_IDS, 'social', 'settings'].forEach(id => {
        const button = createElement('div');
        button.id = 'btn-tab-' + id;
        button.className = 'tab-btn';
        button.style.display = id === 'battle' ? 'none' : 'flex';
        button.handlers.click = () => { openedTabs.push('tab-' + id); };
        const label = createElement('#text');
        label.nodeType = 3;
        label.textContent = id;
        button.appendChild(label);
        header.appendChild(button);
    });
    const action = createElement('div');
    action.id = 'btn-map-complete-action-picker';
    action.className = 'tab-btn';
    action.style.display = 'flex';
    header.appendChild(action);
    return header;
}

function bootMenu() {
    const body = createElement('body');
    const openedTabs = [];
    const header = createTabHeader(body, openedTabs);
    const windowHandlers = {};
    const exposed = {};
    let desktop = true;
    const game = { settings: {}, unlocks: {} };
    const findById = id => [body, ...descendants(body)].find(element => element.id === id) || null;
    const document = {
        readyState: 'complete', body, documentElement: { clientWidth: 1600, clientHeight: 900 },
        getElementById: findById,
        querySelector: selector => selector === '.tab-header' ? header : null,
        querySelectorAll: selector => selector === '.tab-header .tab-btn' ? header.querySelectorAll('.tab-btn') : [],
        createElement,
        addEventListener() {},
        activeElement: null
    };
    const context = {
        console, JSON, Math, Number, Object, Array, String, document, game,
        TAB_UNLOCK_GATES: {},
        requestAnimationFrame: () => 0,
        queueImportantSave() {},
        safeExposeGlobals: functions => Object.assign(exposed, functions)
    };
    context.window = {
        innerWidth: 1600, innerHeight: 900, game,
        localStorage: { getItem: () => null, setItem() {} },
        matchMedia: () => ({ matches: desktop }),
        getComputedStyle: element => ({
            display: element.style.display || (element.classList.contains('noti-dot') || element.classList.contains('inventory-full-warning') ? 'none' : 'block'),
            visibility: 'visible'
        }),
        addEventListener: (type, handler) => { windowHandlers[type] = handler; },
        switchTab() {}
    };
    vm.createContext(context);
    vm.runInContext(source, context, { filename: 'js/ui-window-manager.js' });
    return { body, header, game, openedTabs, exposed, findById, setDesktop: value => { desktop = value; }, windowHandlers };
}

function socketButtons(menu) {
    return menu.header.querySelectorAll('[data-rail-slot]');
}

const menu = bootMenu();
assert.strictEqual(menu.header.querySelectorAll(':scope > .ui-rail-art').length, 1, 'menu art must be one real image');
assert.strictEqual(menu.header.querySelector(':scope > .ui-rail-art').src, 'assets/ui/menu-rail-v1.png');
assert.strictEqual(descendants(menu.header).some(element => element.classList.contains('ui-rail-category-btn')), false, 'group buttons must be removed');
assert.strictEqual(descendants(menu.header).some(element => element.classList.contains('ui-rail-group')), false, 'group layers must be removed');
assert.deepStrictEqual(socketButtons(menu).map(button => button.dataset.railSlot), ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11']);
assert(socketButtons(menu).every(button => button.classList.contains('tab-btn')), 'every illustrated circle must contain a real tab');
assert(socketButtons(menu).every(button => button.querySelector(':scope > .ui-rail-label')), 'each circle must keep its text inside a dedicated clipped label');

const characterButton = menu.findById('btn-tab-character');
characterButton.handlers.click();
assert.deepStrictEqual(menu.openedTabs, ['tab-character'], 'a socket click must open its tab directly without a group selection');

const miscPanel = menu.findById('ui-rail-misc-panel');
const miscTrigger = menu.findById('btn-ui-rail-misc');
const closeAll = menu.findById('btn-close-all-windows');
assert.strictEqual(menu.findById('btn-tab-settings').parentElement, miscPanel, 'settings must stay outside the artwork');
assert.strictEqual(menu.findById('btn-map-complete-action-picker').parentElement, miscPanel, 'combat-complete control must stay outside the artwork');
assert.strictEqual(miscTrigger.parentElement, closeAll.parentElement, 'misc and window cleanup must share the outside control row');
assert.strictEqual(miscTrigger.dataset.railSlot, undefined);
assert.strictEqual(closeAll.dataset.railSlot, undefined);
assert.strictEqual(miscPanel.dataset.railOverflow, '4', 'tabs beyond the eleven real circles must remain directly accessible from misc');
assert.strictEqual(menu.findById('ui-goal-drawer').parentElement, menu.header, 'desktop goal handle must share the rail coordinate space below outside controls');

assert.strictEqual(miscPanel.hidden, true);
menu.exposed.toggleGoalDrawer(true);
miscTrigger.handlers.click();
assert.strictEqual(miscPanel.hidden, false, 'misc control must open its external list');
assert.strictEqual(menu.findById('ui-goal-drawer').classList.contains('expanded'), false, 'opening misc must collapse an overlapping goal detail panel');
assert.strictEqual(miscTrigger.getAttribute('aria-expanded'), 'true');
menu.exposed.toggleGoalDrawer(true);
assert.strictEqual(miscPanel.hidden, true, 'opening goal details must close misc so the two rail popouts never overlap');
menu.exposed.toggleGoalDrawer(false);
miscTrigger.handlers.click();
const overflowTab = miscPanel.querySelectorAll('.tab-btn').find(button => PRIMARY_TAB_IDS.some(id => button.id === 'btn-tab-' + id));
overflowTab.handlers.click();
miscPanel.handlers.click({ target: overflowTab });
assert.strictEqual(miscPanel.hidden, true, 'choosing a direct overflow tab must close misc');
assert(menu.openedTabs.includes(overflowTab.id.replace(/^btn-/, '')), 'overflow entries must remain real tab buttons');

menu.game.settings.tabOrder = ['btn-tab-cube', 'btn-tab-character'];
menu.exposed.syncDesktopRailGroups();
assert.strictEqual(menu.findById('btn-tab-cube').dataset.railSlot, '1', 'saved tab order must choose the first illustrated circle');
assert.strictEqual(menu.findById('btn-tab-character').dataset.railSlot, '2');

menu.game.settings.tabOrder = [];
menu.exposed.syncDesktopRailGroups();
const promotedButton = miscPanel.querySelectorAll('.tab-btn')
    .find(button => PRIMARY_TAB_IDS.some(id => button.id === 'btn-tab-' + id));
const firstSocket = socketButtons(menu)[0];
firstSocket.style.display = 'none';
menu.exposed.syncDesktopRailGroups();
assert.strictEqual(firstSocket.dataset.railSlot, undefined, 'a locked tab must not retain a circle');
assert.strictEqual(promotedButton.dataset.railSlot, '11', 'the next unlocked tab must fill the vacated circle without a group click');
assert.strictEqual(socketButtons(menu).length, 11);

const overflowNotice = createElement('span');
overflowNotice.className = 'noti-dot';
overflowNotice.style.display = 'block';
menu.findById('btn-tab-settings').appendChild(overflowNotice);
menu.exposed.syncDesktopRailGroups();
assert.strictEqual(menu.findById('noti-ui-rail-misc').style.display, 'block', 'misc must surface notifications from external tabs');
overflowNotice.style.display = 'none';
menu.exposed.syncDesktopRailGroups();
assert.strictEqual(menu.findById('noti-ui-rail-misc').style.display, 'none');

menu.setDesktop(false);
menu.windowHandlers.resize();
assert.strictEqual(menu.header.querySelectorAll(':scope > .ui-rail-art').length, 0, 'mobile restore must remove the art');
assert.strictEqual(menu.header.querySelectorAll(':scope > .ui-rail-tab-layer').length, 0, 'mobile restore must remove the socket layer');
assert.strictEqual(menu.findById('btn-ui-rail-misc'), null, 'mobile restore must remove desktop-only misc');
assert.strictEqual(menu.findById('ui-goal-drawer').parentElement, menu.body, 'mobile goal drawer must return to the document body');
assert(menu.header.querySelectorAll('.tab-btn').every(button => button.parentElement === menu.header), 'mobile restore must return actual tabs to the header');
assert.strictEqual(socketButtons(menu).length, 0, 'mobile tabs must not retain desktop socket metadata');
assert.deepStrictEqual(
    menu.header.querySelectorAll('.tab-btn').map(button => button.id),
    ['btn-tab-battle', ...PRIMARY_TAB_IDS.map(id => 'btn-tab-' + id), 'btn-tab-social', 'btn-tab-settings', 'btn-map-complete-action-picker'],
    'mobile restore must preserve the original flat tab order when no saved order replaces it'
);

menu.setDesktop(true);
menu.windowHandlers.resize();
assert.strictEqual(menu.header.querySelectorAll(':scope > .ui-rail-art').length, 1, 'desktop restore must create only one art image');
assert.strictEqual(menu.header.querySelectorAll(':scope > .ui-rail-tab-layer').length, 1, 'desktop restore must create only one flat layer');
assert.strictEqual(descendants(menu.header).filter(element => element.id === 'btn-ui-rail-misc').length, 1, 'desktop restore must not duplicate misc');
assert.strictEqual(menu.findById('ui-goal-drawer').parentElement, menu.header, 'desktop restore must remount goals below the rail controls');

assert(menuCss.includes('transform: translate(-50%, -50%) !important;'), 'socket position must override inherited hover transforms');
assert(menuCss.includes('.ui-rail-external-btn:hover'), 'external controls must have an explicit stable hover state');
assert(menuCss.includes('transform: none !important;'), 'external controls must not move away from the pointer');
assert(menuCss.includes('min(29.2svh, 18vw)'), 'the single artwork must remain resizable for short and narrow desktops');
assert(menuCss.includes('.ui-rail-tab-layer .ui-rail-label') && menuCss.includes('overflow-wrap: anywhere'), 'circle labels must stay clipped independently of notice badges');
assert(menuCss.includes('.ui-rail-tab-layer .noti-dot') && menuCss.includes('top: -3px !important'), 'tab notices must remain visible beyond the circle edge');
assert(menuCss.includes('.tab-header > .ui-goal-drawer') && menuCss.includes('top: calc(100% + 47px) !important'), 'goal handle must occupy the space below misc and cleanup controls');

const orderSettingsHost = { innerHTML: '' };
let orderedGroupReads = 0;
const orderSettingsContext = {
    game: { settings: { tabPlacement: {} } },
    document: {
        body: { classList: { contains: name => name === 'desktop-windowed-ui' } },
        getElementById(id) {
            if (id === 'ui-tab-order-settings') return orderSettingsHost;
            if (id === 'tab-settings') return { classList: { contains: name => name === 'active' } };
            return null;
        },
        querySelectorAll: () => [{ id: 'btn-tab-character', innerText: '캐릭터' }]
    },
    getOrderedTabGroups() { orderedGroupReads++; return [{ key: 'character', label: '캐릭터' }]; }
};
vm.createContext(orderSettingsContext);
vm.runInContext(readFunctionSource(uiSource, 'renderTabOrderSettings'), orderSettingsContext, { filename: 'flat-tab-order-settings.js' });
orderSettingsContext.renderTabOrderSettings();
assert.strictEqual(orderedGroupReads, 0, 'flat desktop settings must not build obsolete upper-group controls');
assert(!orderSettingsHost.innerHTML.includes('상위 그룹 탭'), 'flat desktop settings must only present real tab ordering');
assert(orderSettingsHost.innerHTML.includes('일반 탭'));

const inventoryStart = uiSource.indexOf('function updateInventoryFullWarnings()');
const inventoryEnd = uiSource.indexOf('function syncInventoryExpansionShortcuts()', inventoryStart);
const inventoryElements = {
    'inventory-full-warning': { style: { display: 'none' }, title: '' },
    'jewel-inventory-full-warning': { style: { display: 'none' }, title: '' }
};
let railSyncs = 0;
const inventoryContext = {
    game: { inventory: [], jewelInventory: [] },
    document: {
        body: { classList: { contains: name => name === 'desktop-windowed-ui' } },
        getElementById: id => inventoryElements[id] || null
    },
    getInventoryLimit: () => 2,
    getJewelInventoryLimit: () => 1,
    syncDesktopRailGroups: () => { railSyncs += 1; }
};
vm.createContext(inventoryContext);
vm.runInContext(uiSource.slice(inventoryStart, inventoryEnd), inventoryContext, { filename: 'inventory-rail-warning.js' });
inventoryContext.updateInventoryFullWarnings();
assert.strictEqual(railSyncs, 0, 'unchanged capacity warnings must not rescan the rail');
inventoryContext.game.inventory = [{}, {}];
inventoryContext.updateInventoryFullWarnings();
assert.strictEqual(inventoryElements['inventory-full-warning'].style.display, 'inline-block');
assert.strictEqual(railSyncs, 1, 'becoming full must refresh the rail notice');
inventoryContext.game.inventory = [];
inventoryContext.updateInventoryFullWarnings();
assert.strictEqual(inventoryElements['inventory-full-warning'].style.display, 'none');
assert.strictEqual(railSyncs, 2, 'freeing capacity must clear the rail notice');

const pointerStart = uiSource.indexOf('function onTabHeaderPointerDown(event)');
const pointerEnd = uiSource.indexOf('function onTabHeaderPointerMove(event)', pointerStart);
let desktopMode = true;
let pointerCaptures = 0;
const dragButton = {
    closest: () => ({ scrollLeft: 0 }),
    setPointerCapture: () => { pointerCaptures += 1; }
};
const dragContext = {
    tabHeaderDragState: null,
    document: { body: { classList: { contains: name => name === 'desktop-windowed-ui' && desktopMode } } },
    getTabButtonFromTarget: () => dragButton,
    setTimeout: () => 1,
    beginTabHeaderDrag() {},
    TAB_DRAG_LONG_PRESS_MS: 180
};
vm.createContext(dragContext);
vm.runInContext(uiSource.slice(pointerStart, pointerEnd), dragContext, { filename: 'tab-pointer-guard.js' });
const pointerEvent = { target: {}, pointerType: 'touch', button: 0, pointerId: 4, clientX: 10, clientY: 20 };
dragContext.onTabHeaderPointerDown(pointerEvent);
assert.strictEqual(dragContext.tabHeaderDragState, null, 'desktop socket tabs must reject long-press reordering');
desktopMode = false;
dragContext.onTabHeaderPointerDown(pointerEvent);
assert.strictEqual(dragContext.tabHeaderDragState.button, dragButton, 'mobile tabs must retain long-press reordering');
assert.strictEqual(pointerCaptures, 1);

const viewportStart = uiSource.indexOf('function scheduleTabHeaderViewportSync()');
const viewportEnd = uiSource.indexOf("if (typeof window !== 'undefined')", viewportStart);
let deferredViewportSync = null;
let clearedDrag = 0;
let refreshedHeader = 0;
const viewportContext = {
    lastTabHeaderUiSignature: 'cached',
    clearTabHeaderDragState: () => { clearedDrag += 1; },
    requestAnimationFrame: callback => { deferredViewportSync = callback; },
    updateBottomTabSpacing() {},
    refreshTabHeaderUiIfNeeded: () => { refreshedHeader += 1; }
};
vm.createContext(viewportContext);
vm.runInContext(uiSource.slice(viewportStart, viewportEnd), viewportContext, { filename: 'tab-viewport-sync.js' });
viewportContext.scheduleTabHeaderViewportSync();
assert.strictEqual(clearedDrag, 1, 'viewport changes must cancel an in-flight mobile drag');
assert.strictEqual(refreshedHeader, 0, 'tab placement must wait until the window manager changes responsive mode');
deferredViewportSync();
assert.strictEqual(viewportContext.lastTabHeaderUiSignature, null);
assert.strictEqual(refreshedHeader, 1, 'saved mobile placement must be restored after responsive mode changes');

console.log('smoke-menu-rail-sockets passed');
