/** domain/story-act-labels: native owner; state is read from the supplied current-game port. */
export class StoryActLabels {
    constructor(deps, data) {
        this.deps = deps;
        this.data = data;
        this.formatStoryActLabel = this.formatStoryActLabel.bind(this);
        this.getStoryActByZoneId = this.getStoryActByZoneId.bind(this);
        this.getStoryActByOrder = this.getStoryActByOrder.bind(this);
        this.getActZoneDisplayName = this.getActZoneDisplayName.bind(this);
    }

    formatStoryActLabel(storyAct) {
        if (!storyAct) return this.deps._t('액트 ?');
        return storyAct.displayAct === '엔드게임' ? this.deps._t('엔드게임') : this.deps._t('액트 {n}', { n: storyAct.displayAct });
    }

    getStoryActByZoneId(zoneId) {
        if (!Number.isFinite(zoneId)) return null;
        return this.deps.STORY_ACTS[zoneId] || null;
    }

    getStoryActByOrder(order) {
        return this.deps.STORY_ACTS.find(act => act.order === order) || null;
    }

    getActZoneDisplayName(zoneId) {
        let act = this.getStoryActByZoneId(zoneId);
        if (!act) return `액트 ${zoneId + 1}`;
        return `${this.formatStoryActLabel(act)}: ${act.title}`;
    }
}
