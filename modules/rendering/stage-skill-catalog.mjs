class StageSkillCatalog {
    constructor(deps) {
        this.deps = deps;
        this.names = null;
    }

    kitNames() {
        if (!this.names) this.names = new Map(Object.entries(this.deps.STAGE_SKILL_VFX.meta).map(([id, row]) => [row.name, Number(id)]));
        return this.names;
    }

    kitGemId(skillName) {
        const spec = this.deps.SKILL_FX_ATLAS[skillName], def = this.deps.SKILL_DB[skillName];
        return (spec && spec.id) || (def && def.nativeCastId) || this.kitNames().get(skillName) || 0;
    }

    kitGemOf(skillName) {
        const id = this.kitGemId(skillName), map = id ? this.deps.STAGE_SKILL_VFX.gems[id] : null;
        return map ? { id, map, meta: this.deps.STAGE_SKILL_VFX.meta[id] } : null;
    }
}

export function createStageSkillCatalog(deps) {
    const view=new StageSkillCatalog(deps);
    return Object.freeze({ gemId:view.kitGemId.bind(view), gemOf:view.kitGemOf.bind(view) });
}
