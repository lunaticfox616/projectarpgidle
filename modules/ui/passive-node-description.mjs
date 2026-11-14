export function getPassiveNodeDisplayName(runtime, node) {
    if (!node) return '미확인 성좌';
    if (node.intentionalNoEffect) return '무효';
    if (node.title) return (0, runtime.deps._t)(node.title);
    return (runtime.deps.P_STATS[node.stat] || {}).name || '미확인 성좌';
}

export function getPassiveEffectLabel(runtime, node) {
    if (!node) return '';
    if (node.intentionalNoEffect) return '효과 없음';
    if (node.effectLabel) return node.effectLabel;
    if (node.kind === 'void') return (0, runtime.deps.getVoidPassiveEffectLabel)(node.id);
    if (node.kind === 'keystone') return (0, runtime.deps._t)(node.desc || '키스톤 효과');
    if (Array.isArray(node.effects) && node.effects.length > 0) {
        return combinedEffects(runtime, node);
    }
    return singleEffect(runtime, node);
}

function combinedEffects(runtime, node) {
    const effects = node.connectedDevotionPenalty ? (0, runtime.deps.getEffectivePassiveNodeEffects)(node) : node.effects;
    const labels = effects.map(effect => effectLine(runtime, effect));
    if (node.connectedDevotionPenalty) {
        labels.push(`기본 +${node.val}%에서 직접 연결된 헌신 1개 할당마다 각각 ${node.connectedDevotionPenalty}%p 감소`);
    }
    if (node.activationRequirement) labels.push(activationLine(runtime, node));
    return labels.join('<br>');
}

function effectLine(runtime, effect) {
    // Passive-only stats have no item entry; retain their display name and percent suffix.
    const statInfo = runtime.deps.P_STATS[effect.stat] || {}, rawName = statInfo.name || (0, runtime.deps.getStatName)(effect.stat);
    const sign = Number(effect.val) >= 0 ? '+' : '';
    const statName = String(rawName).replace(/\s*\((\+%p|%)\)\s*/g, '').trim();
    const isPct = statInfo.name ? statInfo.isPct : /\(%\)/.test(rawName);
    return `${statName} ${sign}${(0, runtime.deps.formatValue)(effect.stat, effect.val)}${isPct ? '%' : ''}`;
}

function activationLine(runtime, node) {
    const state = (0, runtime.deps.getPassiveNodeActivationState)(node);
    const statName = state.statId === 'devotion' ? '계시' : (0, runtime.deps.getStatName)(state.statId);
    const color = state.active ? '#9fe5bb' : '#ffaaaa';
    return `<span style="color:${color};">${state.active ? (0, runtime.deps._t)('활성') : (0, runtime.deps._t)('비활성')}, ${statName} ${state.available}/${state.required}</span>`;
}

function singleEffect(runtime, node) {
    if (!node.stat) return '';
    if (node.stat === 'chaosResElemPenalty') {
        let value = (0, runtime.deps.formatValue)(node.stat, node.val);
        return (0, runtime.deps._t)('카오스 저항 +{value}% 및 모든 원소 저항 -{value2}%', { value, value2: value });
    }
    let stat = runtime.deps.P_STATS[node.stat] || {};
    let suffix = stat.isPct ? '%' : '';
    return `${stat.name || node.stat} +${(0, runtime.deps.formatValue)(node.stat, node.val)}${suffix}`;
}

const KIND_LABELS = Object.freeze({ start: '직업 시작점', apex: '별끝 특수 노드', evolved: '각성 성좌',
    transcendent: '초월 성좌', core: '핵심 성좌', deadend: '막다른 길 거점', hub: '교차 거점' });

export function getPassiveKindLabel(node) {
    if (!node) return '성좌';
    if (Object.hasOwn(KIND_LABELS, node.kind)) return KIND_LABELS[node.kind];
    if (node.kind === 'void') return node.voidRing === 'outer' ? '직업 공허 소켓' : '공허 패시브';
    return sourceKindLabel(node);
}

function sourceKindLabel(node) {
    if (node.sourceType === 'keystone' || node.kind === 'keystone') return '키스톤';
    if (node.sourceType === 'major' || node.kind === 'major') return '주요 패시브';
    if (node.sourceType === 'normal' || node.kind === 'node') return '일반 패시브';
    if (['minor', 'assist'].includes(node.sourceType) || ['path', 'assist'].includes(node.kind)) return '소형 패시브';
    return '보조 노드';
}
