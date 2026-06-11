#!/usr/bin/env node
// 패시브 트리 노드의 짧은 효과 라벨이 의미에 맞고(특히 ds=연속타격),
// 큐레이션된 라벨이 단어 중간에서 잘리지 않는지 검증한다.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const repoRoot = path.resolve(__dirname, '..');
const context = {
  console,
  document: { getElementById() { return null; }, createElement() { return {}; } },
  // 큐레이션 라벨 경로는 아래 stub에 의존하지 않지만, fallback 경로 검증을 위해 제공한다.
  getStatName(stat) {
    const names = { unmappedStat: '아주 긴 스탯 이름 예시 증가(%)' };
    return names[stat] || '';
  },
  getPassiveEffectLabel() { return ''; },
  getPassiveNodeDisplayName(node) { return (node && node.title) || ''; },
  camZoom: 1,
};
context.window = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(repoRoot, 'js/canvas-passive-tree.js'), 'utf8'), context, { filename: 'js/canvas-passive-tree.js' });

const shortLabel = context.getPassiveNodeEffectShortLabel;
assert(typeof shortLabel === 'function', 'getPassiveNodeEffectShortLabel must be exposed');

// 1) ds는 연속 타격이다. 과거 버그처럼 '방어확률'로 표기되면 안 된다.
assert.strictEqual(shortLabel({ stat: 'ds' }), '연속타격', 'ds short label must read as 연속타격, not 방어확률');
assert.notStrictEqual(shortLabel({ stat: 'ds' }), '방어확률', 'ds must not regress to the wrong 방어확률 label');

// 2) 큐레이션된 합성 스탯 라벨은 정확히 그대로 표기되고 단어 중간에서 잘리지 않는다.
assert.strictEqual(shortLabel({ stat: 'summonCritDmg' }), '소환치피', 'curated summon crit-damage label must stay intact');
assert.strictEqual(shortLabel({ stat: 'physIgnore' }), '물리무시', 'physIgnore label must convey 물리 피해 무시');
assert.strictEqual(shortLabel({ stat: 'chaosResElemPenalty' }), '카오스저항+', 'composite chaos-res label must stay intact');
assert.strictEqual(shortLabel({ stat: 'leechInstanceCap' }), '흡혈캡', 'leech instance cap label must be curated, not truncated');

// 3) 매핑되지 않은 스탯만 정리/절단 경로를 탄다(최대 6자).
const fallback = shortLabel({ stat: 'unmappedStat' });
assert(fallback.length <= 6, 'unmapped fallback label must remain within the truncation cap');

const componentsCss = fs.readFileSync(path.join(repoRoot, 'css/components.css'), 'utf8');
const canvasSource = fs.readFileSync(path.join(repoRoot, 'js/canvas-passive-tree.js'), 'utf8');
const uiSource = fs.readFileSync(path.join(repoRoot, 'js/ui.js'), 'utf8');
const passivesSource = fs.readFileSync(path.join(repoRoot, 'js/passives.js'), 'utf8');
assert(!componentsCss.includes('passiveReachableRotate'), 'allocatable passive nodes must not use rotating dashed overlay animation');
assert(!componentsCss.includes('.passive-overlay-node::before'), 'allocatable passive nodes must not draw dashed pseudo-element rings');
assert(!canvasSource.includes('visibleGlowNodes'), 'passive tree draw loop must not iterate glow-only node halos');
assert(uiSource.includes('passiveRenderCache.glowNodes = [];'), 'passive state cache must skip glow node collection');
assert(!passivesSource.includes('glow: accent.reachGlow'), 'reachable passive palette must not add glow around allocatable nodes');

console.log('passive node label smoke checks passed');
