import { seasonPrerequisiteMet, investmentRequiresRemovedNode } from './season-investments.mjs';

/** Ascendancy allocations use existing saved IDs and prices. No rendering or current-game access. */
export function createAscendInvestments(defs) {
    return Object.freeze({
        required: (owner, node) => !node?.req || seasonPrerequisiteMet(owner.ascendNodes, node.req),
        keystoneRequired: ascendInvestmentKeystoneRequired,
        buy: (owner, id) => purchaseAscendInvestment(defs, owner, id),
        refund: (owner, id) => refundAscendInvestment(defs, owner, id),
        buyKeystone: (owner, id) => purchaseAscendKeystone(defs, owner, id),
        keystoneRefundIssue: (owner, id) => ascendKeystoneRefundIssue(defs, owner, id),
        refundKeystone: (owner, id) => refundAscendInvestmentKeystone(defs, owner, id),
        moveDualEquipment: (owner, enable) => moveAscendDualEquipment(defs, owner, enable),
        resetCost: (owner, keystones) => ascendResetList(owner, keystones).length,
        reset: (owner, keystones) => resetAscendInvestments(defs, owner, keystones),
        normalize: owner => { ascendResetList(owner, false); ascendResetList(owner, true); },
        select: (owner, id, forPlan = false) => selectInvestmentClass(defs, owner, id, forPlan),
        lastPlan: owner => {
            const plan = owner.lastLoopAscendPlan;
            return plan && defs.classes[plan.ascendClass] && defs.isClass(plan.ascendClass, owner.selectedClassId) ? plan : null;
        }
    });
}

function ascendInvestmentKeystoneRequired(owner, node) {
    if (!node) return false;
    owner.ascendKeystones = Array.isArray(owner.ascendKeystones) ? owner.ascendKeystones : [];
    if (node.fifthJobOnly) return !!owner.ascendClass && owner.bloomedClassThisLoop === owner.ascendClass;
    if (node.req) return owner.ascendKeystones.includes(node.req);
    if (Array.isArray(node.reqAny) && node.reqAny.length) return node.reqAny.some(id => owner.ascendKeystones.includes(id));
    return true;
}

function purchaseAscendInvestment(defs, owner, id) {
    if (!owner.ascendClass) return 'unavailable';
    const node = defs.tree(owner.ascendClass, owner)[id];
    if (node?.exclusive && owner.ascendNodes.includes(node.exclusive)) return 'exclusive';
    if (!node || owner.ascendPoints <= 0 || owner.ascendNodes.includes(id)) return 'unavailable';
    if (node.req && !seasonPrerequisiteMet(owner.ascendNodes, node.req)) return 'unavailable';
    owner.ascendNodes.push(id);
    owner.ascendPoints--;
    return 'changed';
}

function refundAscendInvestment(defs, owner, id) {
    if (!owner.ascendClass) return 'unavailable';
    owner.ascendNodes = Array.isArray(owner.ascendNodes) ? owner.ascendNodes : [];
    if (!owner.ascendNodes.includes(id)) return 'unavailable';
    const tree = defs.tree(owner.ascendClass, owner);
    const blocked = Object.keys(tree).some(key => key !== id && owner.ascendNodes.includes(key)
        && (investmentRequiresRemovedNode(owner.ascendNodes, tree[key].req, id)
            || investmentRequiresRemovedNode(owner.ascendNodes, tree[key].reqAny, id)));
    if (blocked) return 'dependent';
    if ((owner.currencies.blightSpore || 0) < 1) return 'no-spores';
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - 1);
    owner.ascendNodes = owner.ascendNodes.filter(key => key !== id);
    owner.ascendPoints = Math.max(0, Math.floor(owner.ascendPoints || 0)) + 1;
    return 'changed';
}

function purchaseAscendKeystone(defs, owner, id) {
    if (!owner.ascendClass) return { status: 'unavailable' };
    const node = defs.keystones(owner.ascendClass).find(row => row.id === id);
    if (!node) return { status: 'unavailable' };
    ascendResetList(owner, true);
    if (owner.ascendKeystones.includes(id)) return { status: 'unavailable' };
    owner.ascendKeystonePoints = Math.max(0, Math.floor(owner.ascendKeystonePoints || 0));
    if (owner.ascendKeystonePoints <= 0) return { status: 'no-points' };
    if (owner.ascendKeystones.length >= defs.pickLimit) return { status: 'pick-limit' };
    if (!ascendInvestmentKeystoneRequired(owner, node)) return { status: 'prerequisite' };
    const equipment = id === 'w3' ? moveAscendDualEquipment(defs, owner, true) : 'unchanged';
    if (equipment === 'full') return { status: 'full', enable: true };
    owner.ascendKeystones.push(id);
    owner.ascendKeystonePoints--;
    return { status: 'changed', equipment, enable: true };
}

function ascendKeystoneRefundIssue(defs, owner, id) {
    ascendResetList(owner, true);
    if (!owner.ascendKeystones.includes(id)) return { status: 'unavailable' };
    const blockers = defs.keystones(owner.ascendClass).filter(node => {
        if (!owner.ascendKeystones.includes(node.id) || node.id === id) return false;
        if (node.req && node.req === id) return true;
        return Array.isArray(node.reqAny) && investmentRequiresRemovedNode(owner.ascendKeystones, node.reqAny, id);
    });
    if (blockers.length) return { status: 'dependent', blockers };
    if ((owner.currencies.blightSpore || 0) < 1) return { status: 'no-spores' };
    return { status: 'ready' };
}

function refundAscendInvestmentKeystone(defs, owner, id) {
    const issue = ascendKeystoneRefundIssue(defs, owner, id);
    if (issue.status !== 'ready') return issue;
    const equipment = id === 'w3' ? moveAscendDualEquipment(defs, owner, false) : 'unchanged';
    if (equipment === 'full') return { status: 'full', enable: false };
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - 1);
    owner.ascendKeystones = owner.ascendKeystones.filter(key => key !== id);
    owner.ascendKeystonePoints = Math.max(0, Math.floor(owner.ascendKeystonePoints || 0)) + 1;
    return { status: 'changed', equipment, enable: false, removed: [id] };
}

function moveAscendDualEquipment(defs, owner, enable) {
    if (owner.ascendClass !== 'warrior') return 'unchanged';
    owner.equipment = owner.equipment || {};
    owner.inventory = Array.isArray(owner.inventory) ? owner.inventory : [];
    const item = owner.equipment['방패'];
    if (!item || item.slot !== (enable ? '방패' : '무기')) return 'unchanged';
    if (!defs.canStore([item], owner)) return 'full';
    owner.inventory.push(item);
    owner.equipment['방패'] = null;
    return 'moved';
}

function ascendResetList(owner, keystones) {
    const key = keystones ? 'ascendKeystones' : 'ascendNodes';
    owner[key] = Array.isArray(owner[key]) ? owner[key] : [];
    return owner[key];
}

function resetAscendInvestments(defs, owner, keystones) {
    const list = ascendResetList(owner, keystones), cost = list.length;
    if (!cost) return { status: 'empty' };
    if ((owner.currencies.blightSpore || 0) < cost) return { status: 'no-spores', cost };
    const equipment = ascendResetEquipment(defs, owner, keystones, list);
    if (equipment === 'full') return { status: 'full', enable: false };
    owner.currencies.blightSpore = Math.max(0, Math.floor(owner.currencies.blightSpore || 0) - cost);
    const points = keystones ? 'ascendKeystonePoints' : 'ascendPoints';
    owner[points] = Math.max(0, Math.floor(owner[points] || 0)) + cost;
    owner[keystones ? 'ascendKeystones' : 'ascendNodes'] = [];
    return { status: 'changed', cost, equipment, enable: false, removed: list.slice() };
}

function ascendResetEquipment(defs, owner, keystones, list) {
    return keystones && list.includes('w3') ? moveAscendDualEquipment(defs, owner, false) : 'unchanged';
}

function selectInvestmentClass(defs, owner, id, forPlan) {
    if (!defs.isClass(id, owner.selectedClassId)) return null;
    const previous = Array.isArray(owner.ascendKeystones) ? owner.ascendKeystones.slice() : [];
    owner.ascendClass = id;
    owner.ascendKeystones = [];
    if (forPlan) ascendResetList(owner, false);
    return previous;
}
