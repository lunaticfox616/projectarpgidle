

/** 할당한 공허 패시브 수에 트라우마 · 명왕성이 더하는 간주 개수. 공허 하나당 효과(넘치는 활기 · 전심전력 …)가 쓴다. */
export function passiveRuleGetVirtualVoidPassiveCount(env, owner) {
    const allocated = (owner.passives || []).filter(id => env.deps.PASSIVE_TREE.nodes[id] && env.deps.PASSIVE_TREE.nodes[id].kind === 'void').length;
    return allocated + env.deps.passiveRouting.transcendentValue(owner, 'trauma') + env.deps.passiveRouting.transcendentValue(owner, 'pluto');
}
