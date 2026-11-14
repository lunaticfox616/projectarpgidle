/** Late-bound labels use the active locale without owning game or browser state. */
export class StatText {
    constructor(deps) {
        this.deps = deps;
        this.translateSkillTag = this.translateSkillTag.bind(this);
        this.getSkillTagList = this.getSkillTagList.bind(this);
        this.getStatName = this.getStatName.bind(this);
        this.makeSourceLine = this.makeSourceLine.bind(this);
    }

    translateSkillTag(tag) {
        return this.deps.translate(this.deps.skillTags[tag] || tag);
    }

    getSkillTagList(skill) {
        return (skill.tags || []).map(this.translateSkillTag);
    }

    getStatName(statId) {
        return this.deps.translate(this.deps.statNames[statId] || (this.deps.stats[statId] && this.deps.stats[statId].name) || statId);
    }

    makeSourceLine(label, value, suffix, formatter) {
        if (!value) return null;
        const rendered = formatter ? formatter(value) : `${Math.floor(value)}${suffix || ''}`;
        return `${this.deps.translate(label)} ${value < 0 ? '' : '+'}${rendered}`;
    }
}
