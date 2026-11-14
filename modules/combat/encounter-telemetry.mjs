// Only the current content's fields are included; this is an event snapshot, not save state.
const contextReaders = /* @__PURE__ */ Object.freeze({
    beehive: owner => ({ branch: Math.max(1, Math.floor(Number(owner.beehive && owner.beehive.branchStep) || 1)) }),
    colony: owner => ({ wave: Math.max(1, Math.floor(Number(owner.colony && owner.colony.wave) || 1)) }),
    timeRift: (owner, zone) => ({ phase: zone.riftPhase || 'unknown', pressure: Math.max(0, Math.floor(Number(zone.pressure) || 0)) }),
    meteor: (owner, zone) => ({ meteorTier: Math.max(0, Math.floor(Number(zone.meteorTier || zone.tier) || 0)) }),
    trial: (owner, zone) => ({ trialId: String(zone.id || '') }),
    oceanDepth: owner => ({ depth: Math.max(0, Math.floor(Number(owner.ocean && owner.ocean.depthM) || 0)) }),
    grandBreach: owner => ({ phase: String((owner.voidRift && owner.voidRift.grandRun && owner.voidRift.grandRun.phase) || 'horde') })
});

export function effectGetEncounterTelemetryContext(env, zone) {
    if (!zone) return {};
    const context = { tier: Math.max(0, Math.floor(Number(zone.tier) || 0)) };
    if (env.owner.voidRift && env.owner.voidRift.active) context.mode = 'voidBreach';
    if (Object.hasOwn(contextReaders, zone.type)) Object.assign(context, contextReaders[zone.type](env.owner, zone));
    return context;
}
