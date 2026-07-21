const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync('js/ui-window-manager.js', 'utf8');
const uiSource = fs.readFileSync('js/ui.js', 'utf8');

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

function selectAll(element, selector) {
    if (selector === ':scope > .ui-rail-group') return element.children.filter(child => child.classList.contains('ui-rail-group'));
    if (selector === ':scope > .ui-rail-group .tab-btn') {
        return element.children.filter(child => child.classList.contains('ui-rail-group'))
            .flatMap(section => descendants(section).filter(child => child.classList.contains('tab-btn')));
    }
    if (selector === '[data-rail-slot]') return descendants(element).filter(child => child.dataset.railSlot);
    if (selector.startsWith(':scope > .')) {
        const className = selector.slice(':scope > .'.length);
        return element.children.filter(child => child.classList.contains(className));
    }
    if (selector === '.noti-dot, .inventory-full-warning') {
        return descendants(element).filter(child => child.classList.contains('noti-dot') || child.classList.contains('inventory-full-warning'));
    }
    if (selector === '.tab-btn') return descendants(element).filter(child => child.classList.contains('tab-btn'));
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
        remove() {
            if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(item => item !== this);
            this.parentElement = null;
        },
        querySelectorAll(selector) { return selectAll(this, selector); },
        querySelector(selector) { return this.querySelectorAll(selector)[0] || null; },
        contains(node) { return node === this || descendants(this).includes(node); },
        matches() { return false; },
        focus() {},
        getBoundingClientRect() { return { right: this.classList.contains('tab-header') ? 222 : 0 }; }
    };
    element.classList = createClassList(element);
    defineElementAccessors(element);
    return element;
}

const TEST_TAB_GROUPS = [
    { key: 'character', label: '캐릭터', icon: 'C', tabs: ['tab-character'] },
    { key: 'growth', label: '성장', icon: 'G', tabs: ['tab-char', 'tab-traits', 'tab-talent', 'tab-expertise', 'tab-season', 'tab-skills'] },
    { key: 'content', label: '콘텐츠', icon: 'N', tabs: ['tab-map', 'tab-codex', 'tab-journal'] },
    { key: 'gear', label: '장비', icon: 'E', tabs: ['tab-items', 'tab-jewel', 'tab-flask', 'tab-talisman', 'tab-cube'] },
    { key: 'etc', label: '기타', icon: 'S', tabs: ['tab-social', 'tab-settings', 'tab-battle'] }
];

function createTabHeader(body) {
    const header = createElement('div');
    header.className = 'tab-header';
    body.appendChild(header);
    const tabIds = [
        'battle', 'character', 'char', 'season', 'expertise', 'traits', 'talent', 'items', 'jewel',
        'flask', 'map', 'skills', 'journal', 'codex', 'talisman', 'cube', 'social', 'settings'
    ];
    tabIds.forEach(id => {
        const button = createElement('div');
        button.id = 'btn-tab-' + id;
        button.className = 'tab-btn';
        button.style.display = 'flex';
        header.appendChild(button);
    });
    const action = createElement('div');
    action.id = 'btn-map-complete-action-picker';
    action.className = 'tab-btn';
    action.hidden = true;
    header.appendChild(action);
    return header;
}

function bootMenu() {
    const body = createElement('body');
    const header = createTabHeader(body);
    const windowHandlers = {};
    const exposed = {};
    let desktop = true;
    const game = { settings: { activeTabGroup: 'growth' }, unlocks: {} };
    const findById = id => [body, ...descendants(body)].find(element => element.id === id) || null;
    const document = {
        readyState: 'complete', body, documentElement: { clientWidth: 1600, clientHeight: 900 },
        getElementById: findById,
        querySelector: selector => selector === '.tab-header' ? header : null,
        querySelectorAll: selector => selector === '.tab-header > .ui-rail-group'
            ? header.children.filter(child => child.classList.contains('ui-rail-group')) : [],
        createElement,
        addEventListener() {},
        activeElement: null
    };
    const context = {
        console, JSON, Math, Number, Object, Array, String, document, game,
        TAB_UNLOCK_GATES: {},
        TAB_GROUPS: TEST_TAB_GROUPS,
        getOrderedTabGroups() {
            const order = Array.isArray(game.settings.tabGroupOrder) ? game.settings.tabGroupOrder : [];
            const byKey = Object.fromEntries(TEST_TAB_GROUPS.map(group => [group.key, group]));
            return order.concat(TEST_TAB_GROUPS.map(group => group.key))
                .filter((key, index, keys) => byKey[key] && keys.indexOf(key) === index)
                .map(key => byKey[key]);
        },
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
    return { body, header, game, exposed, findById, setDesktop: value => { desktop = value; }, windowHandlers };
}

function slots(elements) {
    return elements.map(element => element.dataset.railSlot).filter(Boolean);
}

const menu = bootMenu();
assert.strictEqual(menu.header.querySelectorAll(':scope > .ui-rail-art').length, 1, 'menu art must be one real image');
assert.strictEqual(menu.header.querySelector(':scope > .ui-rail-art').src, 'assets/ui/menu-rail-v1.png');

const categories = descendants(menu.header).filter(element => element.classList.contains('ui-rail-category-btn'));
assert.strictEqual(categories.length, 5, 'five group buttons must occupy the center sockets');
assert(categories.every(element => element.classList.contains('tab-category-btn')), 'group controls must opt out of generic rectangular button chrome');
assert.deepStrictEqual(slots(categories), ['1', '2', '3', '4', '5']);

menu.game.settings.tabGroupOrder = ['gear', 'character', 'growth', 'content', 'etc'];
menu.exposed.syncDesktopRailGroups();
assert.strictEqual(menu.findById('btn-ui-rail-category-gear').dataset.railSlot, '1', 'saved group order must reposition the center sockets');
menu.game.settings.tabGroupOrder = [];
menu.exposed.syncDesktopRailGroups();

const growth = menu.findById('ui-rail-group-growth');
assert.strictEqual(growth.hidden, false, 'saved active group must be shown');
assert.deepStrictEqual(slots(growth.querySelectorAll('.tab-btn')), ['6', '7', '8', '9', '10', '11']);
assert.strictEqual(menu.findById('ui-rail-group-character').hidden, true, 'non-selected group must stay hidden');

const gearNotice = createElement('span');
gearNotice.className = 'noti-dot';
menu.findById('btn-tab-items').appendChild(gearNotice);
menu.exposed.syncDesktopRailGroups();
assert.strictEqual(menu.findById('noti-ui-rail-gear').style.display, 'none', 'CSS-hidden notices must not light an inactive group');
gearNotice.style.display = 'block';
menu.exposed.syncDesktopRailGroups();
assert.strictEqual(menu.findById('noti-ui-rail-gear').style.display, 'block', 'hidden group notifications must be aggregated');

gearNotice.style.display = 'none';
menu.findById('btn-tab-skills').classList.add('starter-gem-tutorial-pending');
menu.findById('btn-ui-rail-category-character').handlers.click();
assert.strictEqual(menu.findById('noti-ui-rail-growth').style.display, 'block', 'starter gem guidance must reach the hidden growth group');
menu.findById('btn-tab-skills').classList.remove('starter-gem-tutorial-pending');
menu.findById('btn-ui-rail-category-growth').handlers.click();

menu.findById('btn-ui-rail-category-gear').handlers.click();
const gear = menu.findById('ui-rail-group-gear');
assert.strictEqual(menu.game.settings.activeTabGroup, 'gear', 'group selection must reuse activeTabGroup');
assert.strictEqual(gear.hidden, false);
assert.strictEqual(menu.findById('noti-ui-rail-gear').style.display, 'none', 'active group does not need a duplicate notification');
assert.deepStrictEqual(slots(gear.querySelectorAll('.tab-btn')), ['6', '7', '8', '9', '10']);

menu.game.settings.tabOrder = ['btn-tab-cube', 'btn-tab-items', 'btn-tab-jewel', 'btn-tab-flask', 'btn-tab-talisman'];
menu.exposed.syncDesktopRailGroups();
assert.strictEqual(menu.findById('btn-tab-cube').dataset.railSlot, '6', 'saved tab order must reposition side sockets');
assert.strictEqual(menu.findById('btn-tab-items').dataset.railSlot, '7');
menu.game.settings.tabOrder = [];
menu.exposed.syncDesktopRailGroups();

menu.findById('btn-tab-jewel').style.display = 'none';
menu.exposed.syncDesktopRailGroups();
assert.strictEqual(menu.findById('btn-tab-jewel').dataset.railSlot, undefined, 'locked tab must not own a socket');
assert.deepStrictEqual(slots(gear.querySelectorAll('.tab-btn')), ['6', '7', '8', '9'], 'visible tabs must compact without a hole');

menu.findById('btn-ui-rail-category-etc').handlers.click();
const etc = menu.findById('ui-rail-group-etc');
assert.strictEqual(menu.findById('btn-map-complete-action-picker').parentElement.parentElement, etc, 'combat-complete control must belong to etc');
assert.deepStrictEqual(slots(etc.querySelectorAll('.tab-btn')), ['6', '7'], 'settings and combat-complete control must use separate sockets');
assert.strictEqual(menu.findById('btn-close-all-windows').dataset.railSlot, undefined, 'close-all must stay outside the art sockets');

menu.setDesktop(false);
menu.windowHandlers.resize();
assert.strictEqual(menu.header.querySelectorAll(':scope > .ui-rail-art').length, 0, 'mobile restore must remove the art');
assert.strictEqual(descendants(menu.header).filter(element => element.classList.contains('ui-rail-category-btn')).length, 0, 'mobile restore must remove categories');
assert(menu.header.querySelectorAll('.tab-btn').every(button => button.parentElement === menu.header), 'mobile restore must return tabs to the header');
assert.strictEqual(slots(menu.header.querySelectorAll('.tab-btn')).length, 0, 'mobile tabs must not retain desktop socket metadata');

menu.setDesktop(true);
menu.windowHandlers.resize();
assert.strictEqual(menu.header.querySelectorAll(':scope > .ui-rail-art').length, 1, 'desktop restore must create only one art image');
assert.strictEqual(descendants(menu.header).filter(element => element.classList.contains('ui-rail-category-btn')).length, 5, 'desktop restore must not duplicate categories');

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
assert.strictEqual(railSyncs, 1, 'becoming full must refresh the hidden group warning');
inventoryContext.game.inventory = [];
inventoryContext.updateInventoryFullWarnings();
assert.strictEqual(inventoryElements['inventory-full-warning'].style.display, 'none');
assert.strictEqual(railSyncs, 2, 'freeing capacity must clear the hidden group warning');

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
