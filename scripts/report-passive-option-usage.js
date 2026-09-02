#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { readTree } = require('./audit-passive-tree-source');
const { STAT_META } = require('./lib/passive-tree-option-catalog');

const TYPE_ORDER = Object.freeze(['minor', 'assist', 'normal', 'major']);
const TYPE_LABEL = Object.freeze({ minor: '소형', assist: '보조', normal: '일반', major: '주요' });

function collectOptionUsage(tree) {
    const usage = new Map(Object.entries(STAT_META).map(([statId, meta]) => [statId, {
        statId, label: meta[0], suffix: meta[1], nodes: 0, lines: 0, byType: {}, values: new Set(), duplicateNodes: 0
    }]));
    tree.nodes.forEach(node => {
        const seen = new Set();
        (node.runtimeEffects || []).forEach(effect => {
            const row = usage.get(effect.statId);
            if (!row) throw new Error(`등록되지 않은 패시브 옵션: ${node.id}/${effect.statId}`);
            row.lines += 1;
            row.byType[node.type] = (row.byType[node.type] || 0) + 1;
            row.values.add(Number(effect.value));
            if (seen.has(effect.statId)) row.duplicateNodes += 1;
            else row.nodes += 1;
            seen.add(effect.statId);
        });
    });
    return [...usage.values()].sort((a, b) => b.nodes - a.nodes || a.statId.localeCompare(b.statId));
}

function formatValues(row) {
    const values = [...row.values].sort((a, b) => a - b);
    if (!values.length) return '-';
    return values.map(value => `${value}${row.suffix}`).join(', ');
}

function buildTypeRows(tree) {
    const counts = new Map();
    tree.nodes.forEach(node => {
        const row = counts.get(node.type) || { total: 0, effectful: 0 };
        row.total += 1;
        if ((node.runtimeEffects || []).length) row.effectful += 1;
        counts.set(node.type, row);
    });
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function renderReport(tree, usage, sourceFile) {
    const effectful = tree.nodes.filter(node => (node.runtimeEffects || []).length).length;
    const intentionalEmptyMinor = tree.nodes.filter(node => node.type === 'minor'
        && !(node.runtimeEffects || []).length && node.intentionalNoEffect).length;
    const effectLines = usage.reduce((sum, row) => sum + row.lines, 0);
    const usedKinds = usage.filter(row => row.nodes > 0).length;
    const lines = ['# 패시브 노드 옵션 종류별 집계', '',
        `- 원본: \`${path.basename(sourceFile)}\``, `- 전체 노드: **${tree.nodes.length}개**`,
        `- 수치 옵션 보유 노드: **${effectful}개**`, `- 실제 효과 줄: **${effectLines}줄**`,
        `- 등록 옵션: **${usage.length}종** / 사용 중: **${usedKinds}종** / 미사용: **${usage.length - usedKinds}종**`, '',
        '> `runtimeEffects`를 기준으로 집계했습니다. 키스톤 30개는 별도 기믹 계약으로 적용되므로 아래 수치형 옵션 집계에는 포함되지 않습니다.', '',
        '## 노드 등급별 효과 보유 현황', '', '| 종류 | 전체 | 효과 있음 | 효과 없음 |', '| --- | ---: | ---: | ---: |'];
    buildTypeRows(tree).forEach(([type, row]) => lines.push(`| ${TYPE_LABEL[type] || type} | ${row.total} | ${row.effectful} | ${row.total - row.effectful} |`));
    lines.push('', `효과 없는 소형 노드 ${intentionalEmptyMinor}개는 중앙 공허 주변의 의도된 \`무효\` 노드입니다.`,
        '', `## 전체 옵션 ${usage.length}종`, '', '| 옵션 | statId | 노드 수 | 소형 | 보조 | 일반 | 주요 | 실제 수치 |',
        '| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |');
    usage.forEach(row => lines.push(`| ${row.label} | \`${row.statId}\` | ${row.nodes} | ${row.byType.minor || 0} | ${row.byType.assist || 0} | ${row.byType.normal || 0} | ${row.byType.major || 0} | ${formatValues(row)} |`));
    lines.push('', `같은 노드 안에서 동일 옵션이 중복된 사례: **${usage.reduce((sum, row) => sum + row.duplicateNodes, 0)}개**`, '');
    return lines.join('\n');
}

function main() {
    const sourceFile = process.argv[2] || 'artifacts/passive-tree/260831_2passive-normalized.json';
    const outputFile = process.argv[3] || 'artifacts/passive-tree/passive-option-usage-20260902.md';
    const tree = readTree(sourceFile), usage = collectOptionUsage(tree);
    fs.writeFileSync(outputFile, renderReport(tree, usage, sourceFile), 'utf8');
    console.log(`${outputFile}: ${usage.filter(row => row.nodes > 0).length}/${usage.length}종 사용`);
}

if (require.main === module) main();

module.exports = { collectOptionUsage, renderReport };
