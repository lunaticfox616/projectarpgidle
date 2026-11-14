import { workspacePickResource, workspaceAcknowledgeGoal, workspaceAutoStep, workspaceChoiceHtml, workspaceChoiceClick, workspaceChange, workspaceHandleClick, workspaceVisibilityChanged, workspaceRender, workspaceOpenInventory, workspaceStopAuto, imprintMark, workspaceClearSpore, workspaceCraft, workspaceShowGoalDialog, workspaceEngrave, workspaceRestore } from './crafting-workspace-controller.mjs';
import { workspaceResourceState, workspaceGoalReachable } from './crafting-workspace-selection.mjs';
import { workspaceAffixHtml, workspaceSporeOption } from './crafting-workspace-markup.mjs';
import { studyTagHtml, workspaceFilterStudy, workspaceShowStudy } from './crafting-simulator-view.mjs';

/**
 * One workbench session: selected item, confirmation dialogs, auto-use and simulation runs.
 * owner/current are identity checks, not saved copies. deps.game reads the current save each time.
 * Timer handles, run counters and dialogs stay here; only existing domain calls persist goals.
 * Bind callback identities once, so repeated renders do not install fresh listeners or timers.
 */
export function createCraftingWorkspace(deps) {
    const ctx = { deps, state: {}, handlers: {}, api: null };
    const handlers = { workspacePickResource, workspaceResourceState, workspaceAffixHtml, workspaceSporeOption, workspaceGoalReachable, workspaceAcknowledgeGoal, workspaceAutoStep, studyTagHtml, workspaceFilterStudy, workspaceChoiceHtml, workspaceChoiceClick, workspaceChange, workspaceHandleClick, workspaceVisibilityChanged, workspaceRender, workspaceOpenInventory, workspaceStopAuto, imprintMark };
    for (const [name, handler] of Object.entries(handlers)) ctx.handlers[name] = handler.bind(undefined, ctx);
    initialize(ctx);
    ctx.api = { render:ctx.handlers.workspaceRender, openInventory:ctx.handlers.workspaceOpenInventory, stopAuto:ctx.handlers.workspaceStopAuto, imprintMark: ctx.handlers.imprintMark };
    return ctx.api;
}

function initialize(ctx) {
    ctx.state.recipes = [
        ...['magicBud','sapBud','formlessDew','goldenRule','blightSpore','blessing','pruningShears','fairyRing','emberBranch','burningEmberBranch','deepWhetstone','rootIron','jewelPolish','abyssCatalyst','catalystPhys','catalystFire','catalystCold','catalystLight','catalystChaos','catalystCrit','catalystSummon','enchantedHoney','venomStinger','voidChisel','ouroboros','oceanRerollShard','altarEmber','altarIchor'].map(key=>({key,kind:ctx.deps.equipmentCrafting.basicRule(ctx.deps.equipmentCrafting.resolveAction(key,'normal'))?.kind||({goldenRule:'value',blightSpore:'reset'})[key]||'special',label:(0, ctx.deps._t)(ctx.deps.ORB_DB[key].name)})),
        ...ctx.deps.FOSSIL_DB.map(row=>({key:row.key,kind:'fossil',label:row.name}))
    ];
    ctx.state.root = undefined;
    ctx.state.current = null;
    ctx.state.owner = null;
    ctx.state.goal = undefined;
    ctx.state.recipe = ctx.state.recipes[0];
    ctx.state.mode = 'none';
    ctx.state.extras = '';
    ctx.state.renderKey = '';
    ctx.state.adapter = undefined;
    ctx.state.busy = false;
    ctx.state.acknowledged = '';
    ctx.state.count = 0;
    ctx.state.spent = {};
    ctx.state.last = null;
    ctx.state.notice = '';
    ctx.state.auto = false;
    ctx.state.timer = 0;
    ctx.state.runId = 0;
    ctx.state.runCount = 0;
    ctx.state.limit = 20;
    ctx.state.goalDialog = undefined;
    ctx.state.studyDialog = undefined;
    ctx.state.choiceDialog = undefined;
    ctx.state.studyRun = 0;
    ctx.state.goalMatch = 'all';
    ctx.state.CHOICE_WAIT = {enabled:false,reason:'성화의 뿌리로 굴린 결과 가운데 하나를 먼저 고르세요.'};
    ctx.state.SPORE_LABELS = {fire:'화염',cold:'냉기',light:'번개',chaos:'카오스',damage:'피해'};
    ctx.state.STUDY_KINDS = {prefix:['접두','is-prefix'],suffix:['접미','is-suffix'],special:['특수','is-special']};
    ctx.state.STUDY_TAG_TONES = {physical:'physPctDmg',elemental:'elementalPctDmg',fire:'firePctDmg',cold:'coldPctDmg',light:'lightPctDmg',chaos:'chaosPctDmg',
        crit:'crit',speed:'aspd',life:'pctHp',defense:'armor',resistance:'resAll',recovery:'regen'};
    ctx.state.WORKSPACE_COMMANDS = {'clear-spore':()=>workspaceClearSpore(ctx),study:()=>workspaceShowStudy(ctx),inventory:()=>workspaceOpenInventory(ctx),
        craft:()=>workspaceCraft(ctx),ack:()=>workspaceShowGoalDialog(ctx),engrave:()=>workspaceEngrave(ctx),restore:()=>workspaceRestore(ctx)};
}
