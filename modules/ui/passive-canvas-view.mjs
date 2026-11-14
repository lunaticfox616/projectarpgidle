import { ensurePassiveTreeOverlay, updatePassiveTreeOverlayTransform, createOverlaySync, spawnPassiveRevealBurstOverlay, show, drawn, screenRect } from './passive-tree-overlay.mjs';
import { getHoverAllocationNodeIds, getPassiveNodeLook } from './passive-tree-frame.mjs';
import { createPassiveTreeArt } from '../rendering/passive-tree-art-view.mjs';
import { getPassiveHoverLinkLayer } from '../rendering/passive-tree-art.mjs';
import { drawPassiveTree } from './passive-tree-canvas.mjs';
import { handleEquipmentSlotDoubleClick, getDropOnlyItemSourceMeta, getPaperdollSlots, renderPaperdoll, createEquipmentGridItemRenderer, renderEquipmentInventoryGrid, renderEquipmentInventoryInspector } from './equipment-panels.mjs';
import { triggerMapUnlockReveal } from './map-unlock-notice.mjs';

/** Owns the tree bitmap, label bounds and tutorial rings; equipment panels share only the view dependencies.
 * Camera and geometry state comes from the single passive scene. No view cache is serialized. */
export function createPassiveCanvasView(deps) {
    const runtime = { deps, state: {}, handlers: {}, api: null, art: null };
    const handlers = { ensurePassiveTreeOverlay, updatePassiveTreeOverlayTransform, spawnPassiveRevealBurstOverlay, getHoverAllocationNodeIds, getPassiveNodeLook, drawPassiveTree, handleEquipmentSlotDoubleClick, getDropOnlyItemSourceMeta, getPaperdollSlots, renderPaperdoll, renderEquipmentInventoryGrid, renderEquipmentInventoryInspector, triggerMapUnlockReveal, show, drawn, screenRect };
    for (const [name, handler] of Object.entries(handlers)) runtime.handlers[name] = handler.bind(undefined, runtime);
    runtime.handlers.syncPassiveTreeOverlay = createOverlaySync(runtime);
    runtime.handlers.renderEquipmentGridItem = createEquipmentGridItemRenderer(runtime);
    runtime.handlers.getPassiveHoverLinkLayer = getPassiveHoverLinkLayer;
    initialize(runtime);
    runtime.art = createPassiveTreeArt(deps);
    runtime.api = {  ensurePassiveTreeOverlay: runtime.handlers.ensurePassiveTreeOverlay, updatePassiveTreeOverlayTransform: runtime.handlers.updatePassiveTreeOverlayTransform, syncPassiveTreeOverlay: runtime.handlers.syncPassiveTreeOverlay, spawnPassiveRevealBurstOverlay: runtime.handlers.spawnPassiveRevealBurstOverlay, getHoverAllocationNodeIds: runtime.handlers.getHoverAllocationNodeIds, getPassiveHoverLinkLayer: runtime.handlers.getPassiveHoverLinkLayer, getPassiveNodeLook: runtime.handlers.getPassiveNodeLook, drawPassiveTree: runtime.handlers.drawPassiveTree, handleEquipmentSlotDoubleClick: runtime.handlers.handleEquipmentSlotDoubleClick, getDropOnlyItemSourceMeta: runtime.handlers.getDropOnlyItemSourceMeta, getPaperdollSlots: runtime.handlers.getPaperdollSlots, renderPaperdoll: runtime.handlers.renderPaperdoll, renderEquipmentGridItem: runtime.handlers.renderEquipmentGridItem, renderEquipmentInventoryGrid: runtime.handlers.renderEquipmentInventoryGrid, renderEquipmentInventoryInspector: runtime.handlers.renderEquipmentInventoryInspector, triggerMapUnlockReveal: runtime.handlers.triggerMapUnlockReveal , passiveTreeGuide: Object.freeze({ show: runtime.handlers.show, drawn: runtime.handlers.drawn, screenRect: runtime.handlers.screenRect }) };
    return runtime.api;
}

function initialize(runtime) {
    runtime.state.passiveEffectLabelRects = [];
    runtime.state.PASSIVE_VOID_RANGES = Object.freeze([['andromeda', '#79cbbd'], ['asteroidBelt', '#dfbf79']]);
    runtime.state.PASSIVE_EFFECT_LABEL_MIN_ZOOM = 0.62;
    runtime.state.PASSIVE_NODE_LAYER_MAX_ZOOM = 0.34;
    runtime.state.PASSIVE_NODE_LAYER_MAX_PX = 2600;
    runtime.state.passiveNodeLayer = { key: '', canvas: null, extras: [], boundsFor: null, bounds: null };
    runtime.state.RING_PX = 30;
    runtime.state.active = false;
    runtime.state.cache = { key: '', nodes: [] };
    runtime.state.onDrawn = null;
}
