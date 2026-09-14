const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const { buildGameRuntime } = require('./lib/game-runtime');
const { resolvePassiveNodeName } = require('./lib/passive-tree-naming');

const context = buildGameRuntime();

const visualContract = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    game = JSON.parse(JSON.stringify(defaultGame));
    const idleLife = getPassiveNodePalette({ id: 'life', stat: 'flatHp' }, false, false, 'discovered');
    const idleProjectile = getPassiveNodePalette({ id: 'projectile', stat: 'projectilePctDmg' }, false, false, 'discovered');
    const activeLife = getPassiveNodePalette({ id: 'active-life', stat: 'flatHp' }, true, false, 'discovered');
    const activeProjectile = getPassiveNodePalette({ id: 'active-projectile', stat: 'projectilePctDmg' }, true, false, 'discovered');
    return {
        labelsDefault: game.settings.passiveTreeShowLabels,
        visualStyleVersion: game.settings.passiveTreeVisualStyleVersion,
        kindLabels: {
            minor: getPassiveKindLabel({ sourceType: 'minor', kind: 'path', tier: 1 }),
            assist: getPassiveKindLabel({ sourceType: 'assist', kind: 'assist', tier: 1 }),
            normal: getPassiveKindLabel({ sourceType: 'normal', kind: 'node', tier: 2 }),
            major: getPassiveKindLabel({ sourceType: 'major', kind: 'major', tier: 3 }),
            keystone: getPassiveKindLabel({ sourceType: 'keystone', kind: 'keystone', tier: 3 })
        },
        radii: {
            minor: getPassiveNodeVisualRadius({ sourceType: 'minor', kind: 'path', tier: 1 }),
            assist: getPassiveNodeVisualRadius({ sourceType: 'assist', kind: 'assist', tier: 1 }),
            normal: getPassiveNodeVisualRadius({ sourceType: 'normal', kind: 'node', tier: 2 }),
            major: getPassiveNodeVisualRadius({ sourceType: 'major', kind: 'major', tier: 3 }),
            keystone: getPassiveNodeVisualRadius({ sourceType: 'keystone', kind: 'keystone', tier: 3 }),
            start: getPassiveNodeVisualRadius({ kind: 'start', tier: 0 })
        },
        idleFrames: [idleLife.outer, idleLife.mid, idleProjectile.outer, idleProjectile.mid],
        activeFrames: [activeLife.outer, activeLife.mid, activeProjectile.outer, activeProjectile.mid],
        activeIcons: [activeLife.icon, activeProjectile.icon],
        icons: {
            mystique: getPassiveNodeIconFamily({ stat: 'mystique' }),
            revelation: getPassiveNodeIconFamily({ stat: 'devotion' }),
            cycle: getPassiveNodeIconFamily({ stat: 'cycle' }),
            shield: getPassiveNodeIconFamily({ stat: 'blockChance' }),
            bow: getPassiveNodeIconFamily({ stat: 'projectilePctDmg' }),
            potion: getPassiveNodeIconFamily({ stat: 'potionPctDmg' }),
            strength: getPassiveNodeIconFamily({ stat: 'strength' }),
            dexterity: getPassiveNodeIconFamily({ stat: 'dexterity' }),
            intelligence: getPassiveNodeIconFamily({ stat: 'intelligence' }),
            void: getPassiveNodeIconFamily({ kind: 'void' }),
            constellation: getPassiveNodeIconFamily({ kind: 'hub', socketType: 'star_wedge' }),
            warriorStart: getPassiveNodeIconFamily({ kind: 'start', startClassId: 'warrior' })
        }
    };
})())`, context));

assert.strictEqual(visualContract.labelsDefault, false, 'dense passive labels should start disabled');
assert.strictEqual(visualContract.visualStyleVersion, 2, 'the passive visual migration should be versioned');
assert.deepStrictEqual(visualContract.kindLabels, {
    minor: '소형 패시브', assist: '소형 패시브', normal: '일반 패시브',
    major: '주요 패시브', keystone: '키스톤'
}, '패시브 등급은 원본 type을 표시해야 한다');
assert.strictEqual(visualContract.radii.minor, visualContract.radii.assist,
    'minor와 내부 assist 노드는 같은 소형 패시브로 보여야 한다');
assert.ok(visualContract.radii.minor < visualContract.radii.normal, 'small path nodes must be smaller than normal nodes');
assert.ok(visualContract.radii.normal < visualContract.radii.major, 'major nodes must read larger than normal nodes');
assert.ok(visualContract.radii.major < visualContract.radii.keystone, 'keystones must read larger than major nodes');
assert.ok(visualContract.radii.keystone < visualContract.radii.start, 'class starts must remain the strongest landmarks');
assert.deepStrictEqual(visualContract.idleFrames.slice(0, 2), visualContract.idleFrames.slice(2),
    'unallocated stat families should share a neutral metal frame instead of forming a rainbow graph');
assert.deepStrictEqual(visualContract.activeFrames.slice(0, 2), visualContract.activeFrames.slice(2),
    'allocated nodes should share one readable gold frame state');
assert.notStrictEqual(visualContract.activeIcons[0], visualContract.activeIcons[1],
    'the semantic icon may retain the stat-family accent inside a shared frame state');
assert.deepStrictEqual(visualContract.icons, {
    mystique: 'mystique', revelation: 'devotion', cycle: 'cycle',
    shield: 'shield', bow: 'projectile', potion: 'potion',
    strength: 'strength', dexterity: 'dexterity', intelligence: 'intelligence',
    void: 'void', constellation: 'constellation', warriorStart: 'blade'
}, 'recognizable build families should map to distinct node glyphs');

const missingEffectGlyphStats = vm.runInContext(`(() => {
    const missing = new Set();
    Object.values(PASSIVE_TREE.nodes).forEach(node => {
        if (node.stat && !node.iconAsset && !getPassiveNodeIconFamily(node)) missing.add(node.stat);
    });
    return Array.from(missing).sort();
})()`, context);
assert.deepStrictEqual(Array.from(missingEffectGlyphStats), [],
    'every effect-bearing passive stat should resolve to a semantic glyph family');

const drawContract = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    function render(lightweight) {
        const calls = { arcs: 0, lines: 0, labels: 0 };
        const ctx = {
            globalAlpha: 1,
            save() {}, restore() {}, translate() {}, beginPath() {}, closePath() {}, fill() {}, stroke() {},
            moveTo() {}, lineTo() { calls.lines++; }, arc() { calls.arcs++; }, strokeRect() {}, fillText() { calls.labels++; }
        };
        const node = { id: 'mystique-node', x: 10, y: 20, kind: 'normal', tier: 2, stat: 'mystique' };
        drawPassiveNodeShape(ctx, node, getPassiveNodeVisualRadius(node),
            getPassiveNodePalette(node, false, true, 'discovered'), false, true, 'discovered', 1, lightweight);
        return calls;
    }
    const labelCtx = {
        save() {}, restore() {}, beginPath() {}, rect() {}, fill() {}, stroke() {},
        measureText() { return { width: 30 }; }, fillText() { this.labels++; }, labels: 0
    };
    game.settings.passiveTreeShowLabels = false;
    camZoom = 1;
    passiveEffectLabelRects = [];
    drawPassiveNodeEffectLabel(labelCtx, { id: 'label', x: 0, y: 0, kind: 'normal', stat: 'flatHp' }, 12, false, true, 'discovered');
    const disabledLabels = labelCtx.labels;
    game.settings.passiveTreeShowLabels = true;
    passiveEffectLabelRects = [];
    drawPassiveNodeEffectLabel(labelCtx, { id: 'label', x: 0, y: 0, kind: 'normal', stat: 'flatHp' }, 12, false, true, 'discovered');
    return { detailed: render(false), lightweight: render(true), disabledLabels, enabledLabels: labelCtx.labels };
})())`, context));

assert.ok(drawContract.detailed.lines > drawContract.lightweight.lines,
    'semantic glyph detail should be drawn up close and skipped in the lightweight zoom mode');
assert.strictEqual(drawContract.disabledLabels, 0, 'disabled permanent labels must not draw text');
assert.strictEqual(drawContract.enabledLabels, 1, 'the explicit permanent-label setting must remain available');

const linkContract = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const calls = { starts: [], ends: [], strokes: 0 };
    const ctx = {
        beginPath() {},
        moveTo(x, y) { calls.starts.push([x, y]); },
        lineTo(x, y) { calls.ends.push([x, y]); },
        stroke() { calls.strokes++; }
    };
    const normal = { id: 'normal', x: 0, y: 0, kind: 'normal', tier: 2 };
    const voidNode = { id: 'void', x: 100, y: 0, kind: 'void', tier: 3 };
    const drawn = drawPassiveLink(ctx, normal, voidNode, { stroke: '#fff', width: 1 });
    const collapsed = drawPassiveLink(ctx, normal, { ...normal }, { stroke: '#fff', width: 1 });
    return { drawn, collapsed, ...calls };
})())`, context));

assert.strictEqual(linkContract.drawn, true, 'a spaced passive connection should be drawn');
assert.strictEqual(linkContract.collapsed, false, 'a zero-length passive connection should be ignored');
assert.strictEqual(linkContract.strokes, 1, 'only the valid passive connection should stroke');
assert(linkContract.starts[0][0] > 0 && linkContract.ends[0][0] < 100,
    'passive connections must stop at node boundaries instead of showing through node artwork');

const tooltipDescriptionContract = JSON.parse(vm.runInContext(`JSON.stringify({
    duplicate: getPassiveTooltipDescription({ desc: '힘 +5' }, ['힘 +5']),
    duplicateBeforeStatus: getPassiveTooltipDescription(
        { desc: '신비 +1' },
        ['신비 +1<br><span>활성 · 신비 3/3</span>']
    ),
    duplicateWithDisplayAlias: getPassiveTooltipDescription(
        { desc: '순환 +2\\n초당 생명력 재생 +0.6%' },
        ['순환 +2<br>초당 재생(%) +0.6%']
    ),
    generatedMismatch: getPassiveTooltipDescription(
        { sourceType: 'major', desc: '스킬 속도 +5%', effects: [{ stat:'aspd', val:5 }] },
        ['공격 속도(%) +5%']
    ),
    explanatory: getPassiveTooltipDescription(
        { desc: '힘 +5를 얻고 방어 조건을 충족합니다.' },
        ['힘 +5']
    )
})`, context));

assert.deepStrictEqual(tooltipDescriptionContract, {
    duplicate: '',
    duplicateBeforeStatus: '',
    duplicateWithDisplayAlias: '',
    generatedMismatch: '',
    explanatory: '힘 +5를 얻고 방어 조건을 충족합니다.'
}, 'passive tooltips should hide repeated effect descriptions while retaining explanatory copy');

const stalePassiveCopyContract = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const node = { id: 'stale-copy', title: '생명력', desc: '방패 스킬 피해 +6%',
        effects: [{ stat: 'pctHp', val: 2 }] };
    return { label: getPassiveEffectLabel(node), search: getPassiveTreeNodeSearchText(node) };
})())`, context));
assert(stalePassiveCopyContract.label.includes('생명력 +2%'),
    'passive display text must be generated from the applied effects');
assert(!stalePassiveCopyContract.search.includes('방패 스킬 피해'),
    'stale authoring descriptions must not produce false passive-search matches');

const generatedPassiveTooltipContract = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    game = JSON.parse(JSON.stringify(defaultGame));
    const ids = ['expansion_archer_longbow_17', 'pt_base_path_001', 'uniform_p150_06', 'completion_wanderer_dagger_01'];
    const labels = Object.fromEntries(ids.map(id => [id, getPassiveEffectLabel(PASSIVE_TREE.nodes[id])]));
    const mechanicNode = PASSIVE_TREE.nodes.completion_wanderer_dagger_01;
    const mechanicBucket = createEmptyStatBucket();
    mechanicNode.effects.forEach(effect => addStatToBucket(mechanicBucket, effect.stat, effect.val));
    const duplicateDescriptions = Object.values(PASSIVE_TREE.nodes)
        .filter(node => ['minor', 'assist', 'normal', 'major'].includes(node.sourceType)
            && Array.isArray(node.effects) && node.effects.length > 0
            && getPassiveTooltipDescription(node, [getPassiveEffectLabel(node)]))
        .map(node => node.id);
    return { labels, mechanicTitle: mechanicNode.title, mechanicBucket: {
        meleePctDmg: mechanicBucket.meleePctDmg,
        move: mechanicBucket.move
    }, duplicateDescriptions };
})())`, context));

assert.deepStrictEqual(generatedPassiveTooltipContract, {
    labels: {
        expansion_archer_longbow_17: '투사체 피해 +24%<br>공격 속도 +5%',
        pt_base_path_001: '에너지 보호막 +6%',
        uniform_p150_06: '민첩 +5',
        completion_wanderer_dagger_01: '근접 피해 +18%<br>이동 속도 +6%'
    },
    mechanicTitle: '그림자 칼끝',
    mechanicBucket: { meleePctDmg: 18, move: 6 },
    duplicateDescriptions: []
}, 'generated passive effects should retain exact values, match their names, aggregate into combat stats, and render once');

assert.deepStrictEqual({
    strength: resolvePassiveNodeName({ type: 'minor', name: '불굴의 힘줄',
        runtimeEffects: [{ statId: 'strength', value: 5 }] }),
    regen: resolvePassiveNodeName({ type: 'assist', name: '불굴의 힘줄',
        runtimeEffects: [{ statId: 'regen', value: 0.2 }] }),
    multiStat: resolvePassiveNodeName({ type: 'minor', name: '모든 능력치', runtimeEffects: [
        { statId: 'strength', value: 3 }, { statId: 'dexterity', value: 3 }, { statId: 'intelligence', value: 3 }
    ] }),
    feature: resolvePassiveNodeName({ type: 'normal', name: '신비', archetype: 'mystique',
        optionProfile: 'feature:ailment-secret', runtimeEffects: [
            { statId: 'mystique', value: 1 }, { statId: 'poisonChance', value: 3 }
        ] })
}, {
    strength: '힘', regen: '생명력 재생', multiStat: '모든 능력치', feature: '병증의 비의'
}, 'simple single-stat passives should use literal names while stronger or compound passives keep distinctive names');

const structuralPassiveTooltipContract = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    game = JSON.parse(JSON.stringify(defaultGame));
    const start = PASSIVE_TREE.nodes.pt_start_warrior;
    const hub = PASSIVE_TREE.nodes.n06xz25l4b7;
    const inactiveOption = PASSIVE_TREE.nodes.star_constellation_n06xz25l4b7_0;
    const activeOption = {
        ...inactiveOption,
        stat: 'move', val: 7,
        effects: [{ stat: 'move', val: 7 }],
        desc: '이동 속도 +7%'
    };
    const keystone = PASSIVE_TREE.nodes.pt_core_keystone_01;
    const describe = node => getPassiveTooltipDescription(node, [getPassiveEffectLabel(node)]);
    return {
        start: [getPassiveEffectLabel(start), describe(start)],
        hub: [getPassiveEffectLabel(hub), describe(hub)],
        inactiveOption: [getPassiveEffectLabel(inactiveOption), describe(inactiveOption)],
        activeOption: [getPassiveEffectLabel(activeOption), describe(activeOption)],
        keystone: [getPassiveEffectLabel(keystone) === keystone.desc, describe(keystone)]
    };
})())`, context));

assert.deepStrictEqual(structuralPassiveTooltipContract, {
    start: ['', '전사 패시브 시작점'],
    hub: ['', '별쐐기를 장착하면 별쐐기 옵션을 가진 투자 가능한 패시브가 새로 나타납니다.'],
    inactiveOption: ['', '외곽 성률에 별쐐기를 장착하면 이 패시브가 나타납니다.'],
    activeOption: ['이동 속도 +7%', ''],
    keystone: [true, '']
}, 'structural passives should show guidance once while effect-bearing passives use one effect source');

const imageArtContract = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const atlas = { complete: true, naturalWidth: 640, naturalHeight: 512 };
    const frame = { complete: true, naturalWidth: 128, naturalHeight: 128 };
    const voidSlot = { complete: true, naturalWidth: 128, naturalHeight: 128 };
    const constellationSlot = { complete: true, naturalWidth: 128, naturalHeight: 128 };
    battleAssets.images.passiveTreeIcons = atlas;
    battleAssets.images.passiveTreeNotableFrame = frame;
    battleAssets.images.passiveTreeKeystoneFrame = frame;
    battleAssets.images.passiveTreeVoidSlot = voidSlot;
    battleAssets.images.passiveTreeConstellationSlot = constellationSlot;
    battleAssets.images.passiveTreeCustom_custom = frame;
    const calls = { images: [], strokes: 0, fills: 0 };
    const ctx = {
        globalAlpha: 1, imageSmoothingEnabled: false,
        save() {}, restore() {}, translate() {}, beginPath() {}, closePath() { }, fill() { calls.fills++; },
        stroke() { calls.strokes++; }, arc() {}, moveTo() {}, lineTo() {}, strokeRect() {},
        drawImage() { calls.images.push(Array.from(arguments).slice(1)); }
    };
    const normal = { id: 'mystique', x: 20, y: 40, kind: 'normal', tier: 2, stat: 'mystique' };
    const major = { id: 'major', x: 60, y: 80, kind: 'major', tier: 3, stat: 'flatHp' };
    const voidNode = { id: 'void', x: 80, y: 100, kind: 'void', tier: 3 };
    const constellationNode = { id: 'constellation', x: 100, y: 120, kind: 'hub', tier: 3 };
    const customNode = { id: 'custom', x: 120, y: 140, kind: 'normal', tier: 2, stat: 'flatHp', iconAsset: 'assets/ui/passive-custom-icons/custom.webp' };
    const normalIcon = drawPassiveNodeImageArt(ctx, normal, 12, 0.8);
    const normalBottomGap = normal.y + 12 - (calls.images[0][5] + calls.images[0][7]);
    const normalFrame = drawPassiveNodeFrameArt(ctx, normal, 12, false, 1);
    const strokesBeforeMajor = calls.strokes;
    drawPassiveNodeShape(ctx, major, 18, getPassiveNodePalette(major, false, true, 'discovered'),
        false, true, 'discovered', 1, { lightweight: false, imageFramed: true });
    const framedMajorLegacyStrokes = calls.strokes - strokesBeforeMajor;
    const majorFrame = drawPassiveNodeFrameArt(ctx, major, 18, false, 1);
    isDragging = true;
    const dragImageVisible = drawPassiveNodeImageArt(ctx,
        { id: 'drag-icon', x: 0, y: 0, kind: 'normal', tier: 2, stat: 'mystique' }, 12, 1);
    const fillsBeforeSlots = calls.fills;
    const strokesBeforeSlots = calls.strokes;
    drawPassiveNodeShape(ctx, voidNode, 21, getPassiveNodePalette(voidNode, false, true, 'discovered'),
        false, true, 'discovered', 1, { lightweight: false, imageSlot: true });
    drawPassiveNodeShape(ctx, constellationNode, 23, getPassiveNodePalette(constellationNode, false, true, 'discovered'),
        false, true, 'discovered', 1, { lightweight: false, imageSlot: true });
    const voidIcon = drawPassiveNodeImageArt(ctx, voidNode, 21, 1);
    const constellationIcon = drawPassiveNodeImageArt(ctx, constellationNode, 23, 1);
    const customIcon = drawPassiveNodeImageArt(ctx, customNode, 12, 1);
    return {
        normalIcon, normalFrame, majorFrame, images: calls.images, normalBottomGap,
        framedMajorLegacyStrokes, dragImageVisible,
        clusterPlateType: typeof drawPassiveClusterPlate,
        voidIcon, constellationIcon, customIcon,
        voidFrame: drawPassiveNodeFrameArt(ctx, voidNode, 21, false, 1),
        constellationFrame: drawPassiveNodeFrameArt(ctx, constellationNode, 23, false, 1),
        slotFills: calls.fills - fillsBeforeSlots,
        slotStrokes: calls.strokes - strokesBeforeSlots
    };
})())`, context));

assert.strictEqual(imageArtContract.normalIcon, true, 'nearby effect nodes should use the colored semantic atlas');
assert.strictEqual(imageArtContract.normalFrame, false, 'small nodes should not receive oversized notable frames');
assert.strictEqual(imageArtContract.majorFrame, true, 'major nodes should receive a dedicated medallion frame');
assert.strictEqual(imageArtContract.images.length, 6, 'regular, dragged, special-slot, and custom art should draw around one major frame');
assert.strictEqual(imageArtContract.customIcon, true, 'an editor-uploaded node icon should override its atlas cell');
assert.deepStrictEqual(imageArtContract.images[0].slice(0, 4), [0, 128, 128, 128],
    'the mystique family should crop the eye cell from the semantic atlas');
assert(imageArtContract.normalBottomGap >= 3,
    'regular icons should retain visible breathing room above the node bottom edge');
assert.strictEqual(imageArtContract.framedMajorLegacyStrokes, 0,
    'an image-framed major must not overlay its legacy circle, square, cross, or ornament lines');
assert.strictEqual(imageArtContract.clusterPlateType, 'undefined',
    'major passives should no longer draw the surrounding double-ring cluster plate');
assert.strictEqual(imageArtContract.dragImageVisible, true,
    'semantic images should remain drawable while the passive tree is being dragged');
assert.deepStrictEqual({
    voidIcon: imageArtContract.voidIcon,
    constellationIcon: imageArtContract.constellationIcon,
    voidFrame: imageArtContract.voidFrame,
    constellationFrame: imageArtContract.constellationFrame,
    slotFills: imageArtContract.slotFills,
    slotStrokes: imageArtContract.slotStrokes
}, {
    voidIcon: true, constellationIcon: true,
    voidFrame: false, constellationFrame: false,
    slotFills: 0, slotStrokes: 0
}, 'void and constellation images should be self-contained slots without legacy square or frame rendering');

const generatedAtlasContract = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    battleAssets.images.passiveTreeKeystoneIcons = { complete: true, naturalWidth: 768, naturalHeight: 640 };
    battleAssets.images.passiveTreeNotableIcons = { complete: true, naturalWidth: 512, naturalHeight: 384 };
    const keystones = Object.values(PASSIVE_TREE.nodes).filter(node => node.kind === 'keystone');
    const cells = keystones.map(node => getPassiveNodeAtlasArt(node)).map(art => art && [art.columns,art.rows,...art.cell].join(','));
    return {
        keystoneCount: keystones.length,
        mappedCount: cells.filter(Boolean).length,
        uniqueCells: new Set(cells).size,
        notableFamilies: {
            energyShield: getPassiveNodeAtlasArt({ stat: 'energyShield' }).cell,
            armor: getPassiveNodeAtlasArt({ stat: 'armor' }).cell,
            evasionBaseFamily: getPassiveNodeIconFamily({ stat: 'evasion' }),
            fire: getPassiveNodeAtlasArt({ stat: 'firePctDmg' }).cell,
            cold: getPassiveNodeAtlasArt({ stat: 'coldPctDmg' }).cell,
            lightning: getPassiveNodeAtlasArt({ stat: 'lightPctDmg' }).cell,
            resistance: getPassiveNodeAtlasArt({ stat: 'resAll' }).cell,
            bleed: getPassiveNodeAtlasArt({ stat: 'bleedChance' }).cell,
            gem: getPassiveNodeAtlasArt({ stat: 'gemLevel' }).cell,
            attackSpeed: getPassiveNodeAtlasArt({ stat: 'aspd' }).cell,
            moveSpeed: getPassiveNodeAtlasArt({ stat: 'move' }).cell,
            life: getPassiveNodeAtlasArt({ stat: 'flatHp' }).cell
        }
    };
})())`, context));
assert.deepStrictEqual({
    keystoneCount: generatedAtlasContract.keystoneCount,
    mappedCount: generatedAtlasContract.mappedCount,
    uniqueCells: generatedAtlasContract.uniqueCells
}, { keystoneCount: 31, mappedCount: 31, uniqueCells: 31 },
'all keystones should resolve to different generated atlas cells');
assert.strictEqual(generatedAtlasContract.notableFamilies.evasionBaseFamily, 'wind',
    'evasion should retain its existing feather/wind icon family');
assert.strictEqual(new Set(Object.entries(generatedAtlasContract.notableFamilies)
    .filter(([key]) => key !== 'evasionBaseFamily').map(([, cell]) => cell.join(','))).size, 11,
    'requested notable stat families should resolve to distinct readable cells');

[
    ['assets/ui/passive-tree-icons-v3.webp', 90 * 1024],
    ['assets/ui/passive-tree-keystone-icons-v1.webp', 180 * 1024],
    ['assets/ui/passive-tree-notable-icons-v4.webp', 95 * 1024],
    ['assets/ui/passive-tree-slot-void-v3.webp', 10 * 1024],
    ['assets/ui/passive-tree-slot-constellation-v2.webp', 8 * 1024],
    ['assets/ui/passive-tree-frame-notable-v1.webp', 16 * 1024],
    ['assets/ui/passive-tree-frame-keystone-v1.webp', 16 * 1024]
].forEach(([assetPath, maxBytes]) => {
    const asset = fs.readFileSync(assetPath);
    assert.strictEqual(asset.subarray(0, 4).toString('ascii'), 'RIFF', `${assetPath} should be WebP`);
    assert.strictEqual(asset.subarray(8, 12).toString('ascii'), 'WEBP', `${assetPath} should be WebP`);
    assert(asset.length <= maxBytes, `${assetPath} exceeds its passive-tree rendering budget`);
});

const migratedSettings = JSON.parse(vm.runInContext(`JSON.stringify((() => {
    const oldSave = JSON.parse(JSON.stringify(defaultGame));
    delete oldSave.settings.passiveTreeVisualStyleVersion;
    oldSave.settings.passiveTreeShowLabels = true;
    const migrated = mergeDefaults(oldSave);
    return {
        labels: migrated.settings.passiveTreeShowLabels,
        version: migrated.settings.passiveTreeVisualStyleVersion,
        summaryCollapsed: migrated.settings.passiveInvestmentSummaryCollapsed
    };
})())`, context));
assert.deepStrictEqual(migratedSettings, { labels: false, version: 2, summaryCollapsed: true },
    'existing saves should receive the cleaner label and collapsed-summary defaults exactly once');

const canvasSource = fs.readFileSync('js/canvas-passive-tree.js', 'utf8');
const simplifyZoom = Number((canvasSource.match(/PASSIVE_TREE_SIMPLIFY_ZOOM = ([0-9.]+)/) || [])[1]);
const ultraSimplifyZoom = Number((canvasSource.match(/PASSIVE_TREE_ULTRA_SIMPLIFY_ZOOM = ([0-9.]+)/) || [])[1]);
assert(simplifyZoom <= 0.24 && ultraSimplifyZoom < simplifyZoom,
    'passive nodes should simplify only after the camera is zoomed out far enough to show more of the tree');

console.log('smoke-passive-tree-visual-language passed');
