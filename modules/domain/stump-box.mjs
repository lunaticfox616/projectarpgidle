// 그루터기 함 도메인: 획득·배치·성장·거름·공명·억제·드랍·루프 회귀를 소유한다. DOM·전투 계산·저장 입출력은 모른다.
// 전투는 처치(onEnemyKilled)만 넘기고, 능력치 파이프라인은 applyStats로 계산 결과를 한 번 합산한다.
// 설계: docs/stump-cube-game-design.md, 수치: data/stump-box.js. 공명·억제·능력치는 저장하지 않고 배치에서 계산한다.
// 부적(family 'talisman')은 색 없는 세 번째 계열: 판에서 깨어나고(성장), 공명 · 억제 · 꽃 능력치에 끼지 않는다.
// 부적의 줄과 이웃 효과는 talismans.js / talisman-effects.js가 맡고, 여기서는 보관 · 배치 · 깨어남 · 저장 경계만 다룬다.
// 접붙이기(graft, 칸마다 0~5단계, 루프 45부터 6)는 칸에 붙는다: 아이템을 옮기면 새 칸의 단계를 따른다. 씨앗 값은 여기서,
// 부적 줄은 talisman-effects.js가 graftMultiplier로 키운다.
// 화폐화(2026-11-03): 다 자란 꽃, 열매, 덩굴, 뿌리는 칸을 차지하지 않는 재화(box.wallet)가 될 수 있고, 실물로는 돌아오지 않는다. 루프가 바뀌면 사라진다.
// 생육함(2026-11-03, box.nursery): 판처럼 놓지만 효과, 공명, 비활성화, 접붙이기가 없고 경험치만 일부 받는다. 보관함 칸을 차지하지 않는다.
// 16번(2026-10-08): 다 자라는 순간 풍작, 황금, 추가 줄을 굴리고(item.harvest, 새 루프에 지우고 다시 굴린다), 봉인 칸(box.sealed)의 것은
// 그대로 루프를 넘긴다. 불씨의 흉터(family 'scar', 색 없음, 포식이 열릴 때 하나 box.scarGift)는 루프를 넘길 때 둘레 8칸 하나를 먹고 흡수한다(포식). 번식, 씨앗 주머니,
// 일괄 거름 사용과 일괄 버리기, 부적 도감(box.codex)도 여기 있다. 수치는 data/stump-box.js.
// 씨앗이 꽃, 열매, 덩굴, 뿌리 가운데 무엇이 될지는 다 자라는 순간 무작위로 정해진다(2026-11-04 사용자, 전에는 생길 때 꽃이나 열매로 정했다).
// 수액은 없앴다: 옛 저장의 수액은 같은 색 씨앗, 다 자란 호박석은 같은 색 뿌리가 된다(cleanLegacySap). item.path는 다 자란 씨앗의 종류다.
// 성장량 필드 이름이 xp인 것은 의도다: 영구 빌드 서명(getPersistentBuildSignature)이 xp를 빼므로 처치마다
// 장비 분석 캐시가 깨지지 않고, 다 자라 능력치가 바뀌는 순간만 ripe가 바뀌어 캐시가 새로 계산된다.
import { stumpEmpty, stumpOf, stumpInvalidatePlacementUndo, stumpCellOf, stumpEditable, stumpIsPlaced, stumpInNursery, stumpFindItem } from './stump-box-state.mjs';
import { stumpRestore, stumpCurrentSocketItem } from './stump-box-restore.mjs';
import { stumpSync, stumpEligible, stumpClaimStarter, stumpStarterChoice, stumpStarterOwed, stumpGrantStarter, stumpPlantStored } from './stump-box-starter.mjs';
import { stumpCreateItem, stumpAddTalisman, stumpDiscard } from './stump-box-items.mjs';
import { stumpStorage, stumpSettleStorageSlots, stumpOrderStorage, stumpMoveInStorage } from './stump-box-storage.mjs';
import { stumpPlace, stumpMove, stumpPreviewMove, stumpUnplace, stumpOnePerBoardReason, stumpWornAlbinoId, stumpWornOneId, stumpUnplaceAll, stumpUnplaceAllReason, stumpCanUndoPlacement, stumpUndoPlacement, stumpFirstNurseryCell, stumpNurseryMove, stumpNurseryUnplace, stumpNurseryClearReason, stumpNurseryClear } from './stump-box-placement.mjs';
import { stumpEvaluate, stumpApplyStats, stumpExtraLinesOf } from './stump-box-stats.mjs';
import { stumpBoardNote } from './stump-box-synergy.mjs';
import { stumpOnEnemyKilled, stumpRollKillDrop, stumpReceiveDrop, stumpRollDrop, stumpCompostOverflow } from './stump-box-drops.mjs';
import { stumpSeedDropSpec, stumpDropIcon, stumpDropName, stumpValidDrop } from './stump-box-seed-spec.mjs';
import { stumpGrow, stumpGrowingItems } from './stump-box-growth.mjs';
import { stumpAncientRanks, stumpGraftRank, stumpGraftMultiplier } from './stump-box-graft-values.mjs';
import { stumpRegress } from './stump-box-regression.mjs';
import { stumpCompost, stumpCompostReason, stumpCompostGrowth, stumpFeedAsh, stumpBulkItems, stumpBulkCompostPlan, stumpBulkCompostReason, stumpCompostMany, stumpBulkDiscardItems, stumpBulkDiscardReason, stumpDiscardMany, stumpToggleLock } from './stump-box-compost.mjs';
import { stumpOpenCount, stumpIsOpen, stumpOpensAt, stumpNextOpening, stumpNeighbors, stumpHighestLoop } from './stump-box-geometry.mjs';
import { stumpStageOf, stumpLabel, stumpShortName, stumpLineText, stumpIconPath } from './stump-box-item-view.mjs';
import { stumpIsMature, stumpNeed, stumpYieldOf, stumpTargetStage, stumpQualityOf, stumpGoldenMul, stumpYieldKind } from './stump-box-item-values.mjs';
import { stumpGraftOpen, stumpOpenUnlocks, stumpStorageLimit, stumpStorageFull, stumpRollCap, stumpGraftMaxRank, stumpSealLimit, stumpDevourOpen, stumpBreedingOpen, stumpBulkCompostOpen, stumpNurseryOpen, stumpNurseryRate } from './stump-box-unlocks.mjs';
import { stumpGraftPoints, stumpGraftJournalPoints, stumpGraftOverflowPoints, stumpGraftRaiseReason, stumpGraftRaise, stumpGraftLowerReason, stumpGraftLower } from './stump-box-graft.mjs';
import { stumpHarvestKey, stumpHarvestRows, stumpHasHarvested, stumpPendingGifts } from './stump-box-harvest-records.mjs';
import { stumpClaimHarvestGift } from './stump-box-harvest-gifts.mjs';
import { stumpIsSealed } from './stump-box-seals-read.mjs';
import { stumpSealReason, stumpToggleSeal, stumpAddScar, stumpGrantScar, stumpRollScarDrop } from './stump-box-seals.mjs';
import { stumpPendingPouches, stumpPouchOffers, stumpChoosePouch } from './stump-box-pouches.mjs';
import { stumpHarvestPriceKey, stumpIsHarvestPrice, stumpHarvestPriceName, stumpHarvestPriceIcon, stumpHarvestWalletKeys } from './stump-box-harvest-price.mjs';
import { stumpHarvestPriceHeld, stumpPayHarvestPrice, stumpCanMonetize, stumpMonetize, stumpSpendWallet, stumpWalletCount, stumpWalletTotal, stumpHarvestHoldings, stumpWalletPieceById, stumpWalletPieces, stumpStoredFlowerCount, stumpPayFlower } from './stump-box-wallet.mjs';
import { stumpSocketable, stumpSocketCandidates, stumpTakeForSocket, stumpReturnFromSocket, stumpSocketLines } from './stump-box-sockets.mjs';

/** One rule/cache owner; callers supply state explicitly. No DOM, storage or current-game lookup. */
/** Captured tables and session caches are constructed once, in the original load order. */
function createStumpEnvironment(deps) {
    const env = { deps };
    env.CELLS = env.deps.STUMP_BOX_SIZE * env.deps.STUMP_BOX_SIZE;
    env.FAMILIES = ['seed'];
    env.KINDS = env.deps.STUMP_BOX_KINDS;
    env.COLORS = Object.keys(env.deps.STUMP_BOX_COLORS);
    env.FIXED_TARGET = { talisman: 'talisman', scar: 'scar' };
    env.OVERCOMER = Object.freeze(Object.fromEntries(Object.entries(env.deps.STUMP_BOX_OVERCOMES).map(([winner, loser]) => [loser, winner])));
    env.FEEDER = Object.freeze(Object.fromEntries(Object.entries(env.deps.STUMP_BOX_FEEDS).map(([mother, child]) => [child, mother])));
    env.MOORE = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    env.LINE_ROWS = Object.freeze(Object.values(env.deps.STUMP_BOX_YIELDS).flatMap(Object.values)
    .concat(Object.values(env.deps.STUMP_BOX_EXTRA_LINES).flatMap(Object.values).flat()));
    env.ALBINO_ROWS = Object.freeze(Object.values(env.deps.STUMP_BOX_RIPENING.albino.variants).flatMap(Object.values).flat());
    env.SCAR_CAPS = (() => {
    const out = {};
    env.LINE_ROWS.concat(env.ALBINO_ROWS).forEach(row => { out[row.stat] = Math.max(out[row.stat] || 0, row.value * env.deps.STUMP_BOX_SCAR.capMul); });
    return Object.freeze(out);
})();
    env.HARVEST_ROWS = env.deps.STUMP_BOX_HARVEST.rows;
    env.HARVEST_KEYS = env.HARVEST_ROWS.flatMap(row => env.COLORS.map(color => `${row}-${color}`));
    env.BOX_VERSION = 3;
    env.OLD_COLORS = env.COLORS.filter(color => color !== 'physical');
    env.memo = { key: null, box: null, value: null };
    env.placementUndos = new WeakMap();
    env.ASLEEP = Object.freeze({ talisman: 'sealed', scar: 'scarAsleep' });
    env.HARVEST_PRICE = /^harvest:(flower|fruit|vine|root|any)(?::(\w+))?$/;
    env.ANY_KIND = 'any';
    env.ANY_KIND_LABEL = '식물';
    env.walletPieceMemo = new Map();
    env.ONE_ON_BOARD = Object.freeze([
    Object.freeze({ test: item => !!item.albino, reason: '알비노는 그루터기 함 전체에 하나만 놓을 수 있습니다.' }),
    Object.freeze({ test: item => item.family === 'scar', reason: '불씨의 흉터는 그루터기 함에 하나만 놓을 수 있습니다.' })]);
    env.SYNERGY_ORDER = Object.freeze(['resonance', 'feed', 'discipline']);
    env.LINES = Object.freeze([...Array(env.deps.STUMP_BOX_SIZE).keys()].flatMap(at => [
    { axis: 'row', cells: [...Array(env.deps.STUMP_BOX_SIZE).keys()].map(step => at * env.deps.STUMP_BOX_SIZE + step) },
    { axis: 'col', cells: [...Array(env.deps.STUMP_BOX_SIZE).keys()].map(step => step * env.deps.STUMP_BOX_SIZE + at) }]));
    env.effectsMemo = { key: null, box: null, value: null };
    env.NO_DROP = Object.freeze({ item: null, compost: null });
    env.STARTER_SLOTS = Object.freeze(['seed', 'second']);
    env.SKILL_ELEMENT_COLORS = Object.freeze({ phys: 'physical', fire: 'fire', cold: 'cold', light: 'lightning', chaos: 'chaos' });
    env.RESIST_STATS = Object.freeze({ fire: 'resF', cold: 'resC', lightning: 'resL' });
    env.CODEX_IDS = Object.freeze([...env.deps.TALISMAN_UNIQUE_DB, ...env.deps.TALISMAN_WILD_UNIQUE_DB].map(row => row.id));
    env.SERIES_STORAGE = env.deps.CONTENT_UNLOCK_SERIES.find(spec => spec.series === 'stumpStorage').storage;
    return env;
}

function createStumpBoardApi(env) {
    return {
        empty: (...args) => stumpEmpty(env, ...args),
        of: (...args) => stumpOf(env, ...args),
        restore: (...args) => stumpRestore(env, ...args),
        sync: (...args) => stumpSync(env, ...args),
        eligible: (...args) => stumpEligible(env, ...args),
        claimStarter: (...args) => stumpClaimStarter(env, ...args),
        starterChoice: (...args) => stumpStarterChoice(env, ...args),
        starterOwed: (...args) => stumpStarterOwed(env, ...args),
        grantStarter: (...args) => stumpGrantStarter(env, ...args),
        plantStored: (...args) => stumpPlantStored(env, ...args),
        createItem: (...args) => stumpCreateItem(env, ...args),
        addTalisman: (...args) => stumpAddTalisman(env, ...args),
        discard: (...args) => stumpDiscard(env, ...args),
        storage: (...args) => stumpStorage(env, ...args),
        place: (...args) => stumpPlace(env, ...args),
        move: (...args) => stumpMove(env, ...args),
        previewMove: (...args) => stumpPreviewMove(env, ...args),
        unplace: (...args) => stumpUnplace(env, ...args),
        onePerBoardReason: (...args) => stumpOnePerBoardReason(env, ...args),
        wornAlbinoId: (...args) => stumpWornAlbinoId(env, ...args),
        wornOneId: (...args) => stumpWornOneId(env, ...args),
        unplaceAll: (...args) => stumpUnplaceAll(env, ...args),
        unplaceAllReason: (...args) => stumpUnplaceAllReason(env, ...args),
        canUndoPlacement: (...args) => stumpCanUndoPlacement(env, ...args),
        undoPlacement: (...args) => stumpUndoPlacement(env, ...args),
        invalidatePlacementUndo: (...args) => stumpInvalidatePlacementUndo(env, ...args),
        evaluate: (...args) => stumpEvaluate(env, ...args),
        boardNote: (...args) => stumpBoardNote(env, ...args),
        applyStats: (...args) => stumpApplyStats(env, ...args)
    };
}

function createStumpGrowthApi(env) {
    return {
        onEnemyKilled: (...args) => stumpOnEnemyKilled(env, ...args),
        rollKillDrop: (...args) => stumpRollKillDrop(env, ...args),
        seedDropSpec: (...args) => stumpSeedDropSpec(env, ...args),
        receiveDrop: (...args) => stumpReceiveDrop(env, ...args),
        dropIcon: (...args) => stumpDropIcon(env, ...args),
        dropName: (...args) => stumpDropName(env, ...args),
        validDrop: (...args) => stumpValidDrop(env, ...args),
        grow: (...args) => stumpGrow(env, ...args),
        ancientRanks: (...args) => stumpAncientRanks(env, ...args),
        rollDrop: (...args) => stumpRollDrop(env, ...args),
        regress: (...args) => stumpRegress(env, ...args),
        compost: (...args) => stumpCompost(env, ...args),
        compostReason: (...args) => stumpCompostReason(env, ...args),
        compostGrowth: (...args) => stumpCompostGrowth(env, ...args),
        compostOverflow: (...args) => stumpCompostOverflow(env, ...args),
        feedAsh: (...args) => stumpFeedAsh(env, ...args),
        growingItems: (...args) => stumpGrowingItems(env, ...args),
        openCount: (...args) => stumpOpenCount(env, ...args),
        isOpen: (...args) => stumpIsOpen(env, ...args),
        opensAt: (...args) => stumpOpensAt(env, ...args),
        nextOpening: (...args) => stumpNextOpening(env, ...args),
        neighbors: (...args) => stumpNeighbors(env, ...args),
        stageOf: (...args) => stumpStageOf(env, ...args),
        isMature: stumpIsMature,
        need: (...args) => stumpNeed(env, ...args),
        yieldOf: (...args) => stumpYieldOf(env, ...args),
        targetStage: (...args) => stumpTargetStage(env, ...args),
        label: (...args) => stumpLabel(env, ...args),
        shortName: (...args) => stumpShortName(env, ...args),
        lineText: (...args) => stumpLineText(env, ...args),
        extraLinesOf: (...args) => stumpExtraLinesOf(env, ...args),
        iconPath: (...args) => stumpIconPath(env, ...args),
        cellOf: (...args) => stumpCellOf(env, ...args),
        editable: (...args) => stumpEditable(env, ...args),
        highestLoop: stumpHighestLoop
    };
}

function createStumpGraftApi(env) {
    return {
        graftRank: stumpGraftRank,
        graftMultiplier: (...args) => stumpGraftMultiplier(env, ...args),
        graftOpen: (...args) => stumpGraftOpen(env, ...args),
        graftPoints: (...args) => stumpGraftPoints(env, ...args),
        graftJournalPoints: (...args) => stumpGraftJournalPoints(env, ...args),
        graftOverflowPoints: (...args) => stumpGraftOverflowPoints(env, ...args),
        graftRaiseReason: (...args) => stumpGraftRaiseReason(env, ...args),
        graftRaise: (...args) => stumpGraftRaise(env, ...args),
        graftLowerReason: (...args) => stumpGraftLowerReason(env, ...args),
        graftLower: (...args) => stumpGraftLower(env, ...args),
        harvestKey: stumpHarvestKey,
        harvestRows: (...args) => stumpHarvestRows(env, ...args),
        hasHarvested: (...args) => stumpHasHarvested(env, ...args),
        pendingGifts: (...args) => stumpPendingGifts(env, ...args),
        claimHarvestGift: (...args) => stumpClaimHarvestGift(env, ...args),
        openUnlocks: (...args) => stumpOpenUnlocks(env, ...args),
        storageLimit: (...args) => stumpStorageLimit(env, ...args),
        storageFull: (...args) => stumpStorageFull(env, ...args),
        rollCap: (...args) => stumpRollCap(env, ...args),
        graftMaxRank: (...args) => stumpGraftMaxRank(env, ...args),
        qualityOf: stumpQualityOf,
        goldenMul: (...args) => stumpGoldenMul(env, ...args),
        sealLimit: (...args) => stumpSealLimit(env, ...args),
        isSealed: stumpIsSealed,
        sealReason: (...args) => stumpSealReason(env, ...args),
        toggleSeal: (...args) => stumpToggleSeal(env, ...args),
        devourOpen: (...args) => stumpDevourOpen(env, ...args),
        addScar: (...args) => stumpAddScar(env, ...args),
        grantScar: (...args) => stumpGrantScar(env, ...args),
        rollScarDrop: (...args) => stumpRollScarDrop(env, ...args),
        scarCaps: () => env.SCAR_CAPS,
        breedingOpen: (...args) => stumpBreedingOpen(env, ...args)
    };
}

function createStumpStorageApi(env) {
    return {
        bulkCompostOpen: (...args) => stumpBulkCompostOpen(env, ...args),
        bulkItems: (...args) => stumpBulkItems(env, ...args),
        bulkCompostPlan: (...args) => stumpBulkCompostPlan(env, ...args),
        bulkCompostReason: (...args) => stumpBulkCompostReason(env, ...args),
        compostMany: (...args) => stumpCompostMany(env, ...args),
        bulkDiscardItems: (...args) => stumpBulkDiscardItems(env, ...args),
        bulkDiscardReason: (...args) => stumpBulkDiscardReason(env, ...args),
        discardMany: (...args) => stumpDiscardMany(env, ...args),
        toggleLock: (...args) => stumpToggleLock(env, ...args),
        pendingPouches: (...args) => stumpPendingPouches(env, ...args),
        pouchOffers: (...args) => stumpPouchOffers(env, ...args),
        choosePouch: (...args) => stumpChoosePouch(env, ...args),
        codexIds: () => env.CODEX_IDS,
        itemById: (state, id) => stumpFindItem(stumpOf(env, state), id),
        settleStorageSlots: (...args) => stumpSettleStorageSlots(env, ...args),
        orderStorage: stumpOrderStorage,
        moveInStorage: (...args) => stumpMoveInStorage(env, ...args),
        harvestPriceKey: stumpHarvestPriceKey,
        isHarvestPrice: (...args) => stumpIsHarvestPrice(env, ...args),
        harvestPriceName: (...args) => stumpHarvestPriceName(env, ...args),
        harvestPriceIcon: (...args) => stumpHarvestPriceIcon(env, ...args),
        harvestPriceHeld: (...args) => stumpHarvestPriceHeld(env, ...args),
        payHarvestPrice: (...args) => stumpPayHarvestPrice(env, ...args),
        harvestWalletKeys: (...args) => stumpHarvestWalletKeys(env, ...args),
        canMonetize: (...args) => stumpCanMonetize(env, ...args),
        monetize: (...args) => stumpMonetize(env, ...args),
        spendWallet: (...args) => stumpSpendWallet(env, ...args),
        walletCount: (...args) => stumpWalletCount(env, ...args),
        walletTotal: (...args) => stumpWalletTotal(env, ...args),
        harvestHoldings: (...args) => stumpHarvestHoldings(env, ...args),
        walletPieceById: (...args) => stumpWalletPieceById(env, ...args),
        walletPieces: (...args) => stumpWalletPieces(env, ...args)
    };
}

function createStumpSocketApi(env) {
    return {
        isPlaced: (...args) => stumpIsPlaced(env, ...args),
        nurseryOpen: (...args) => stumpNurseryOpen(env, ...args),
        nurseryRate: (...args) => stumpNurseryRate(env, ...args),
        inNursery: (...args) => stumpInNursery(env, ...args),
        firstNurseryCell: (...args) => stumpFirstNurseryCell(env, ...args),
        nurseryMove: (...args) => stumpNurseryMove(env, ...args),
        nurseryUnplace: (...args) => stumpNurseryUnplace(env, ...args),
        nurseryClearReason: (...args) => stumpNurseryClearReason(env, ...args),
        nurseryClear: (...args) => stumpNurseryClear(env, ...args),
        storedFlowerCount: (...args) => stumpStoredFlowerCount(env, ...args),
        payFlower: (...args) => stumpPayFlower(env, ...args),
        yieldKind: stumpYieldKind,
        socketable: (...args) => stumpSocketable(env, ...args),
        socketCandidates: (...args) => stumpSocketCandidates(env, ...args),
        takeForSocket: (...args) => stumpTakeForSocket(env, ...args),
        returnFromSocket: (...args) => stumpReturnFromSocket(env, ...args),
        socketLines: (...args) => stumpSocketLines(env, ...args),
        currentSocketItem: (...args) => stumpCurrentSocketItem(env, ...args),
        overcomerOf: color => env.OVERCOMER[color] || null,
        feederOf: color => env.FEEDER[color] || null
    };
}

export function createStumpBox(deps) {
    const env = createStumpEnvironment(deps);
    return {
        ...createStumpBoardApi(env),
        ...createStumpGrowthApi(env),
        ...createStumpGraftApi(env),
        ...createStumpStorageApi(env),
        ...createStumpSocketApi(env)
    };
}
