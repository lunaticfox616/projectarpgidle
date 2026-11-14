

export function* atlasSessionNotify(env, detail) { return (yield { kind: 'atlasSessionEffectDispatchRuntimeEvent', args: ['atlas-map', detail] }); }
