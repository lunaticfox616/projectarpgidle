export function normalizePassiveTooltipText(ctx, value) {
    return String(value || '')
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/초당 생명력 재생/g, '초당 재생')
        .replace(/\(\s*%\s*\)/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function getPassiveTooltipDescription(ctx, node, effectLabels) {
    if (!node || !node.desc) return '';
    if (Array.isArray(node.effects) && node.effects.length > 0) return '';
    const description = normalizePassiveTooltipText(ctx, node.desc);
    if (!description) return '';
    const labels = Array.isArray(effectLabels) ? effectLabels : [effectLabels];
    const repeatsEffect = labels.some(label => {
        const effect = normalizePassiveTooltipText(ctx, label);
        return effect === description || effect.startsWith(`${description} `);
    });
    return repeatsEffect ? '' : node.desc;
}

/** 직업 시작점은 늘 무료로 열려 있는 출발점이다(소유 목록에 넣지 않는다). */
export function describeReachablePassiveNode(ctx, node) {
    return node.kind === 'start' ? '시작점, 여기서 이어진 노드부터 포인트를 씁니다.' : '활성화하면 주변 노드가 밝혀집니다.';
}

export function describeBlockedPassiveNode(ctx, node) {
    return node.kind === 'start' ? '시작점은 이미 열려 있습니다. 이어진 노드를 눌러 포인트를 쓰세요.' : '연결된 노드가 아니라 활성화할 수 없습니다.';
}
