class StageSkillAreas {
    constructor(deps) {
        this.deps = deps;
        this.K = this.deps.stageSkillKit;
        this.WIDE = this.K.WIDE;
        this.DEEP = this.K.DEEP;
        this.ZONE_DELAY = 330;
        this.rulePlayArea = s => this.ruleFillArea(s.map.area, s.area, { face: s.look.face, ramp: s.look.ramp, delay: s.map.swing ? 40 : 0, life: s.long, nextLife: Math.max(300, s.long - 700) });
        this.rulePlayRing = s => this.ruleFillArea(s.map.ring, { ...s.area, radius: 0 }, { face: s.look.face, ramp: s.look.ramp });
        this.rulePlayLand = s => this.deps.stageSkillVfx.play(s.map.land, this.K.at(s.area.centre, 0, this.K.onGround(s.map.land) ? 1 : -30), { face: s.look.face, ramp: s.look.ramp });
        this.rulePlayMeteor = s => (this.deps.stageRuneRemakes.hasRaw() ? this.deps.stageRuneRemakes.meteorImpact(s) : this.deps.stageSkillVfx.play('mush@fire', this.K.at(s.area.centre, 0, 1), { face: s.look.face, ramp: s.look.ramp }));
        this.STAGE_PLAYS = Object.freeze([['suck', this.rulePlaySuck.bind(this)], ['area', this.rulePlayArea], ['ring', this.rulePlayRing], ['area2', this.rulePlayRocks.bind(this)], ['land', this.rulePlayLand], ['seep', this.ruleSeepMist.bind(this)], ['drop', this.rulePlayDrops.bind(this)], ['meteor', this.rulePlayMeteor], ['zone', this.rulePlayZone.bind(this)]]);
    }

    /** 범위 가장자리의 안개가 가운데로 천천히 흘러들고(절반은 몸 앞으로), 바닥에 낮게 깔린다. */
    ruleSeepMist(s) {
        const ref = s.map.seep, a = (s.area.radius + 0.5) * this.WIDE, b = (s.area.radius + 0.5) * this.DEEP, ms = Math.max(700, s.long - 250);
        for (let i = 0; i < 10; i++) {
            const angle = i / 10 * Math.PI * 2 + (i % 2) * 0.31, x = Math.cos(angle) * a, y = Math.sin(angle) * b;
            this.deps.stageSkillVfx.play(ref, this.K.at(s.area.centre, x * 1.05, y * 1.05 - 12), { face: x < 0 ? -1 : 1, ramp: s.look.ramp, delay: i * 40, alpha: i % 2 ? 0.22 : 0.32,
                layer: i % 2 ? 'top' : 'ground', move: { dx: -x * 0.75, dy: -y * 0.75, ms } });
        }
        for (let j = 0; j < 3; j++) this.deps.stageSkillVfx.play(ref, this.K.at(s.area.centre, (j - 1) * 26, -8), { face: j % 2 ? -1 : 1, ramp: s.look.ramp, delay: 260 + j * 150, alpha: 0.22, layer: 'ground' });
    }

    /** 범위의 가운데와 반지름(칸). */
    ruleAreaOf(event) {
        const fp = event.footprint || {}, centre = fp.center || event.targetCells[0] || event.sourceCell;
        return { centre: { gx: centre.gx, gy: centre.gy }, radius: Number(fp.radius) || 0 };
    }

    /** 범위를 채울 자리들(도트): 가운데 하나, 범위가 클립보다 넓으면 둘레에 넷, 훨씬 넓으면 모서리에 넷 더(시간차로). 큰 클립은 가운데 하나만. */
    ruleFillSpots(clip, area, width) {
        const a = (area.radius + 0.5) * this.WIDE, b = (area.radius + 0.5) * this.DEEP, spots = [[0, 0, 0]];
        if (clip.one) return spots;
        if (a > width * 0.65) [[0.6, 0], [-0.6, 0], [0, 0.6], [0, -0.6]].forEach(([x, y], i) => spots.push([a * x, b * y, 60 + i * 20]));
        if (a > width * 1.4) [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([x, y], i) => spots.push([a * 0.62 * x, b * 0.62 * y, 130 + i * 20]));
        return spots;
    }

    ruleFillArea(ref, area, o) {
        const clip = this.deps.stageSkillVfx.clipOf(ref);
        if (!clip) return;
        const lift = clip.an === 'bottom' ? 0 : -30;
        this.ruleFillSpots(clip, area, this.deps.stageSkillVfx.clipWidth(ref)).forEach(([dx, dy, delay], index) => this.deps.stageSkillVfx.play(ref, this.K.at(area.centre, dx, dy + lift),
            { face: o.face, ramp: o.ramp, delay: (o.delay || 0) + delay, alpha: index ? 0.85 : 1, life: o.life, nextLife: o.nextLife, layer: o.layer }));
    }

    /** 대지의 함성: 몸에서 퍼지는 고리 셋, 바닥의 파문 둘, 좌우로 터지는 바람. */
    rulePlayShout(shout, look) {
        const hero = this.K.heroSpot();
        [0.6, 0.95, 1.3].forEach((scale, index) => this.deps.stageSkillVfx.play(shout.ring, this.K.at(hero, 0, -48), { ramp: look.ramp, delay: index * 110, scale, alpha: 1 - index * 0.22 }));
        [0, 160].forEach((delay, index) => this.deps.stageSkillVfx.play(shout.ground, this.K.at(hero, 0, 1), { ramp: look.ramp, delay, scale: 1 + index * 0.5, alpha: 0.9 - index * 0.3, layer: 'ground' }));
        for (const side of [1, -1]) this.deps.stageSkillVfx.play(shout.burst, this.K.at(hero, side * 30, -50), { ramp: look.ramp, face: side, delay: 40, scale: 0.8, alpha: 0.8 });
    }

    /** 중력 붕괴: 둘레의 먼지가 가운데로 빨려 든다. */
    rulePlaySuck(s) {
        const a = (s.area.radius + 0.5) * this.WIDE * 0.9, b = (s.area.radius + 0.5) * this.DEEP * 0.9;
        for (let i = 0; i < 6; i++) {
            const angle = i / 6 * Math.PI * 2 + 0.4, x = Math.cos(angle) * a, y = Math.sin(angle) * b;
            this.deps.stageSkillVfx.play(s.map.suck, this.K.at(s.area.centre, x, y + 1), { face: x < 0 ? 1 : -1, ramp: s.look.ramp, delay: i * 20, alpha: 0.85, layer: 'ground', move: { dx: -x * 0.85, dy: -y * 0.85, ms: 300 } });
        }
    }

    /** 난타 눈보라: 범위 안의 여기저기에 고드름이 떨어지고 닿은 자리에서 얼음이 터진다. */
    rulePlayDrops(s) {
        const rng = this.deps.createSeededRng(`drops:${Math.round(this.deps.stageSkillVfx.now())}`), count = Math.max(4, Math.round(s.long / 240)), reach = s.area.radius + 0.4;
        for (let i = 0; i < count; i++) {
            const angle = rng() * Math.PI * 2, far = Math.sqrt(rng()), x = Math.cos(angle) * far * reach * this.WIDE, y = Math.sin(angle) * far * reach * this.DEEP, delay = i * (s.long / count);
            this.deps.stageSkillVfx.play(s.map.drop, this.K.at(s.area.centre, x, y - 6), { ramp: s.look.ramp, delay, life: 140, fall: { from: -90 - rng() * 30, to: 0, ms: 140 } });
            if (s.map.tick) this.deps.stageSkillVfx.play(s.map.tick, this.K.at(s.area.centre, x, y + 20), { ramp: s.look.ramp, delay: delay + 140, scale: 0.8 });
        }
    }

    rulePlayRocks(s) {
        [].concat(s.map.area2).forEach((ref, index) => this.deps.stageSkillVfx.play(ref, this.K.at(s.area.centre, 0, this.K.onGround(ref) ? 1 : -46), { face: s.look.face, ramp: s.look.ramp, delay: 320 + index * 40 }));
    }

    /** 유성 낙화의 불타는 지대: 첫 단계(충돌)에 한 번, 땅 불길 틱(data/skills.js combatPattern groundHits × groundIntervalMs)이 끝날 때까지 남는다. */
    rulePlayZone(s) {
        if (!s.first) return;
        const pattern = (this.deps.SKILL_DB[s.gem.meta.name] || {}).combatPattern || {};
        const ticksMs = Math.max(1, Number(pattern.groundHits) || 1) * Math.max(0, Number(pattern.groundIntervalMs) || 0);
        this.deps.stageSkillSpells.fireZone({ at: this.K.at(s.area.centre), radius: s.area.radius, delay: this.ZONE_DELAY, life: Math.max(400, ticksMs + 200 - this.ZONE_DELAY) });
    }

    /** 닿는 순간의 범위 연출. 여진(강타의 둘째 단계)은 그 범위에 여진 클립을 깐다. */
    rulePlayStage(gem, event, look) {
        const s = { gem, map: gem.map, area: this.ruleAreaOf(event), look, long: Math.max(400, event.duration || 0), first: !Number(event.stageIndex) };
        if (gem.map.shout) { this.rulePlayShout(gem.map.shout, look); return; }
        if (gem.map.after && Number(event.stageIndex) > 0) { this.rulePlayAfter(gem, s, look); return; }
        for (const [hook, play] of this.STAGE_PLAYS) if (gem.map[hook]) play(s);
    }

    /** 여진(뒤 단계): 그 범위에 여진 클립을 깐다. afterOne이면 가운데 하나만 afterScale 크기로(폭발성 타격의 불씨 폭발). */
    rulePlayAfter(gem, s, look) {
        const ref = gem.map.after;
        if (gem.map.afterCore) {   // 폭발성 타격(전달본 V3.6 explosive-finish): 고리와 불 핵이 한 자리에서 같이 터진다
            this.deps.stageSkillVfx.play(ref, this.K.at(s.area.centre, 0, -gem.map.afterHeight), { face: look.face, alpha: 0.78 });
            this.deps.stageSkillVfx.play(gem.map.afterCore, this.K.at(s.area.centre, 0, -gem.map.afterHeight), { face: look.face });
            return;
        }
        if (!gem.map.afterOne) { this.ruleFillArea(ref, s.area, { face: look.face, ramp: look.ramp }); return; }
        this.deps.stageSkillVfx.play(ref, this.K.at(s.area.centre, 0, this.K.onGround(ref) ? 1 : -30), { face: look.face, ramp: look.ramp, scale: gem.map.afterScale || 1 });
    }

    /** 예비 동작(windup)의 연출: 유성은 높고 먼 곳에서 범위 가운데로 떨어진다. */
    rulePlayWindup(gem, event, look) {
        if (!gem.map.fall) return;
        const area = this.ruleAreaOf(event), ms = Math.max(200, event.duration || 360);
        if (gem.map.meteor && this.deps.stageRuneRemakes.hasRaw()) { this.deps.stageRuneRemakes.meteorFlight(area.centre, look.face, ms); return; }
        this.deps.stageSkillVfx.play(gem.map.fall, this.K.at(area.centre, look.face * 150, -360), { face: look.face, ramp: look.ramp, life: ms, move: { dx: -look.face * 150, dy: 320, ms } });
    }
}

export function createStageSkillAreas(deps) {
    const instance = new StageSkillAreas(deps);
    return Object.freeze({ ruleFillArea: instance.ruleFillArea.bind(instance), rulePlayStage: instance.rulePlayStage.bind(instance), rulePlayWindup: instance.rulePlayWindup.bind(instance) });
}
