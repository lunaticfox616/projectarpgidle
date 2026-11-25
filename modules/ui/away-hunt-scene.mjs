import { AWAY_HUNT } from '../data/away-hunt.mjs';
import { AwayHuntTimeline } from '../rendering/away-hunt-timeline.mjs';
import { AwayHuntPainter } from '../rendering/away-hunt-painter.mjs';
import { currentRegion, ACT1_REGION } from './loop-cinematic-snapshot.mjs';

/** 방치 정산 창의 작은 사냥 장면(2026-11-26): 이 저장의 주인공(무대와 같은 직업과 무기 자세의 시트)이 지금 지역의 땅을 걷다가
 * 이 구역 무리의 작은 몬스터를 만나면, 몬스터가 한 번 치고 주인공이 낀 룬의 동작으로 받아친다. 타격마다 세계수 스킬 그림이 터지고
 * 숫자가 뜨며, 몬스터는 희게 번쩍이다 사라지고 주인공은 다시 걷는다. 결과가 뜨면 한 번 외치고 사냥을 잇는다.
 * 정산 수치와 게임 상태는 읽기만 한다. 창이 열려 보이는 동안만 requestAnimationFrame으로 돌고(숨은 탭에서는 브라우저가 멈춘다),
 * 캔버스가 문서에서 빠지면 그 다음 프레임에 그치고 그림을 놓는다. 효과 줄이기 설정이면 공격하는 순간 한 장만 그리고 그림을 놓는다.
 * 그림: 주인공 data/stage-characters.js, 몬스터 data/monster-stage-roster.js, 이펙트 assets/effects/world-tree-skills-v338.webp
 * (data/skill-fx-atlas.js의 칸, 쓰는 장만 잘라 두고 원본은 바로 놓는다), 소품 data/stage-regions.js 재질의 낮은 소품. */
export class AwayHuntScene {
    constructor(deps) {
        this.deps = deps;
        this.timeline = new AwayHuntTimeline();
        this.painter = new AwayHuntPainter(deps);
        this.run = null;
        this.pictures = new Map();
        this.strips = new Map();
        this.frame = 0;
        this.observer = null;
        this.onFrame = now => this.tick(now);
    }

    /** 장면에 필요한 무대 모듈이 이 런타임에 있는가(Node 스모크의 가짜 창에는 없다). */
    available() {
        const d = this.deps;
        return typeof d.requestAnimationFrame === 'function' && typeof d.stagePictures === 'object' && typeof d.STAGE_CHARACTERS === 'object'
            && typeof d.MONSTER_STAGE_ROSTER === 'object' && typeof d.uiDisplay === 'object' && typeof d.stageRoster === 'object';
    }

    /** canvas에 장면을 연다. mode: 'hunt'(정산 중), 'cheer'(결과: 외치고 나서 사냥을 잇는다). 앞 장면은 그만두되 그림은 이어 쓴다.
     * @returns {boolean} 장면을 열었는가(아니면 부르는 쪽이 빈 틀을 치운다) */
    play(canvas, mode) {
        if (!canvas || !this.available()) return false;
        this.cancelFrame();
        try {
            const cast = this.castOf();
            if (!cast) { this.stop(); return false; }
            this.run = this.runOf(canvas, cast, mode);
            this.watch(this.boxOf(canvas));
            this.openPictures(cast);
            this.queue();
            return true;
        } catch (error) {
            this.deps.console.warn('away hunt scene could not start:', error);
            this.stop();
            return false;
        }
    }

    /** 돌던 장면을 그치고 그림을 모두 놓는다. */
    stop() {
        this.cancelFrame();
        if (this.observer) this.observer.disconnect();
        this.observer = null;
        this.releasePictures();
        this.run = null;
    }

    cancelFrame() {
        if (this.frame) this.deps.cancelAnimationFrame(this.frame);
        this.frame = 0;
    }

    queue() {
        if (!this.frame && this.run) this.frame = this.deps.requestAnimationFrame(this.onFrame);
    }

    tick(now) {
        this.frame = 0;
        const run = this.run;
        if (!run) return;
        if (!run.canvas.isConnected) { this.stop(); return; }
        try {
            if (run.reduced) { this.tickStill(run, now); return; }
            if (now - run.drawnAt >= AWAY_HUNT.frameMs) { this.drawFrame(run, now); run.drawnAt = now; }
        } catch (error) {
            this.deps.console.warn('away hunt scene frame failed:', error);
            this.stop();
            return;
        }
        this.queue();
    }

    /** 효과 줄이기: 그림이 다 오면(오래 걸리면 온 것만으로) 한 장을 그리고 그림을 놓는다. 캔버스의 그림은 남는다. */
    tickStill(run, now) {
        if (!this.picturesSettled() && now - run.openedAt < AWAY_HUNT.loadWaitMs) { this.queue(); return; }
        this.drawStill(run);
        this.releasePictures();
    }

    // ------------------------------------------------------------ cast
    /** 장면에 서는 것들: 주인공의 동작, 몬스터 몇, 무기 속성의 이펙트, 지역의 땅과 소품, 피해 숫자. 주인공이나 몬스터가 없으면 null. */
    castOf() {
        const hero = this.heroCast();
        const monsters = hero ? this.monsterCasts() : [];
        if (!hero || !monsters.length) return null;
        return { hero, monsters, effect: this.effectCast(), floor: this.floorCast(), labels: this.hitLabels(hero.strike) };
    }

    /** 무대와 같은 직업과 무기 자세의 걷기, 서기, 외침, 휘두름. 휘두름은 낀 룬의 동작(무대의 표, stageActors.motionFor)이 장면에
     * 들어오면 그것, 아니면 그 자세의 기본 공격이다. */
    heroCast() {
        const classId = this.deps.getHeroAppearanceId(), stance = this.deps.getStageHeroStance(), set = this.stanceSet(classId, stance);
        if (!set) return null;
        return { walk: set.walk || set.idle, idle: set.idle, strike: this.strikeOf(set, classId, stance), cheer: set.shout || set.idle,
            ranged: AWAY_HUNT.ranged.includes(stance) };
    }

    /** 그 직업의 그 무기 자세 묶음(없으면 맨손), 서 있는 동작이 없으면 null. */
    stanceSet(classId, stance) {
        const entry = this.deps.STAGE_CHARACTERS.classes[classId], kit = entry ? entry.weapons : null, set = kit ? kit[stance] || kit.unarmed : null;
        return set && set.idle ? set : null;
    }

    strikeOf(set, classId, stance) {
        const motion = this.deps.stageActors.motionFor(this.deps.game.activeSkill, classId, stance), own = motion ? set[motion] : null;
        if (own && own.w <= AWAY_HUNT.maxStrikeWidth && own.ay <= AWAY_HUNT.height + 20) return own;
        return set.attack || set.cast || set.throw || set.idle;
    }

    /** 이 구역의 몬스터 가운데 장면에 맞는 크기 몇: 지금 지도에 선 무리, 그 구역이 내는 무리, 없으면 기본 몬스터 순. */
    monsterCasts() {
        const game = this.deps.game, looks = [...this.liveLooks(game), ...this.zoneLooks(this.deps.getZone(game.currentZoneId)),
            ...AWAY_HUNT.fallbackMonsters.map(id => ({ monsterVisualId: id }))];
        const seen = new Set(), out = [];
        for (const look of looks) {
            const actor = this.deps.stageRoster.actorFor(look);
            if (!actor || seen.has(actor.id) || !this.fitsScene(actor)) continue;
            seen.add(actor.id);
            out.push(this.monsterCast(actor));
            if (out.length >= AWAY_HUNT.monstersKept) break;
        }
        return out;
    }

    liveLooks(game) { return (Array.isArray(game.enemies) ? game.enemies : []).filter(enemy => enemy && !enemy.isBoss && enemy.hp > 0); }

    /** 구역이 내는 일반 몬스터의 외형(영역 세트가 있으면 그 일반 배역, 아니면 액트 목록: data/bosses.js). */
    zoneLooks(zone) {
        if (!zone) return [];
        const realm = this.deps.getRealmMonsterVisualSet(zone);
        const ids = realm ? realm.members.filter(member => member.role !== 'boss').map(member => member.id) : this.deps.getActMonsterPool(zone);
        return ids.map(id => ({ monsterVisualId: id }));
    }

    fitsScene(actor) {
        return actor.height <= AWAY_HUNT.maxMonsterHeight && actor.reach[0] + actor.reach[1] <= AWAY_HUNT.maxMonsterReach;
    }

    /** 몬스터의 걷기와 공격을 주인공 동작과 같은 모양으로(그림 주소는 무대와 같아 받은 그림을 다시 쓴다). */
    monsterCast(actor) {
        const roster = this.deps.MONSTER_STAGE_ROSTER, url = clip => `${roster.path}${actor.id}-${clip}.png?v=${actor.version || roster.version}`;
        return { actor,
            walk: { frames: actor.walkMs.length, ms: actor.walkMs, cols: actor.walkCols, url: url('walk') },
            attack: actor.attackMs ? { frames: actor.attackMs.length, ms: actor.attackMs, hit: [actor.impactFrame], cols: actor.attackCols, url: url('attack') } : null };
    }

    /** 낀 룬의 속성에 맞는 세계수 스킬 그림의 장들. */
    effectCast() {
        const skill = this.deps.SKILL_DB[this.deps.game.activeSkill], key = skill && AWAY_HUNT.effects[skill.ele] ? skill.ele : 'phys';
        const pick = AWAY_HUNT.effects[key], row = Object.values(this.deps.SKILL_FX_ATLAS).find(entry => entry.id === pick.id);
        const frames = row ? pick.frames.map(index => row.frames[index]).filter(Boolean) : [];
        return frames.length ? { key, frames, url: this.deps.SKILL_AREA_VFX_ASSETS.skillFxWorldTree } : null;
    }

    /** 지금 무대의 지역(js/loop-cinematic-ui.js와 같은 고르기)의 하늘과 땅 색, 그 재질의 낮은 소품. */
    floorCast() {
        const region = currentRegion(this.deps), regions = this.deps.STAGE_REGIONS, row = regions.regions[region];
        if (row) return { palette: { sky: row.sky, earth: row.earth }, props: this.propsOf(regions, row) };
        const root = region === ACT1_REGION && this.deps.STAGE_SCENES ? this.deps.STAGE_SCENES.biomes.root : null;
        return { palette: root ? { sky: root.sky, earth: root.fill } : AWAY_HUNT.fallback, props: [] };
    }

    propsOf(regions, row) {
        const family = regions.families[row.family];
        return family ? AWAY_HUNT.props.filter(name => family.pieces[name])
            .map(name => ({ url: `${regions.path}${row.family}/${name}.png?v=${regions.version}`, size: family.pieces[name] })) : [];
    }

    /** 피해 숫자: 지금 능력치의 초당 피해를 한 휘두름의 타격 수로 나눈 값에 조금씩 다른 배율. 능력치가 없으면 숫자를 띄우지 않는다. */
    hitLabels(strike) {
        const stats = this.deps.getPlayerStats(), dps = Number(stats && stats.dps) || 0;
        if (!(dps > 0)) return [];
        const base = dps / Math.max(1, this.timeline.hitsOf(strike).length);
        return AWAY_HUNT.hitSpread.map(rate => this.deps.formatNumberKR(Math.max(1, Math.round(base * rate))));
    }

    // ------------------------------------------------------------ run state
    runOf(canvas, cast, mode) {
        const now = this.deps.performance.now(), scale = this.deps.uiDisplay.battleRenderScale;
        canvas.style.height = `${AWAY_HUNT.height / scale}px`;
        const box = this.boxOf(canvas), boxWidth = box.clientWidth, cheer = mode === 'cheer';
        const run = { canvas, box, cast, reduced: this.deps.uiDisplay.reducedEffects(), boxWidth, scale, width: Math.max(1, Math.floor(boxWidth * scale)),
            phase: cheer ? 'cheer' : 'walk', cheerAt: now, cheerEnd: now + this.timeline.lengthOf(cast.hero.cheer) + AWAY_HUNT.cheerRestMs,
            spawnAt: now + AWAY_HUNT.firstSpawnMs, encounter: null, turn: 0, scroll: 0, props: [], propIn: AWAY_HUNT.propEvery[0], propTurn: 0,
            last: now, drawnAt: -Infinity, openedAt: now };
        canvas.style.width = `${run.width / scale}px`;
        if (cast.floor.props.length) run.props.push(this.propAt(run, Math.round(run.width * 0.72)));
        return run;
    }

    /** 걷기, 맞붙기, 외침 사이를 넘긴다. dt가 길어도(정산 계산이 프레임을 오래 잡은 때) 0.1초씩만 나아간다. */
    advance(run, now) {
        const dt = Math.min(100, Math.max(0, now - run.last)) / 1000;
        run.last = now;
        if (run.phase === 'cheer' && now >= run.cheerEnd) this.startWalk(run, now);
        if (run.phase === 'walk') this.walkOn(run, now, dt);
        else if (run.phase === 'fight' && now >= run.encounter.plan.resumeAt) {
            run.encounter = null;
            this.startWalk(run, now);
        }
    }

    startWalk(run, now) {
        run.phase = 'walk';
        run.spawnAt = now + AWAY_HUNT.spawnDelayMs;
    }

    /** 바닥과 소품이 흐르고, 때가 되면 다음 몬스터가 오른쪽에서 들어와 맞붙는 자리에 닿는다. */
    walkOn(run, now, dt) {
        const step = AWAY_HUNT.scrollSpeed * dt;
        run.scroll += step;
        this.moveProps(run, step);
        if (!run.encounter && now >= run.spawnAt) run.encounter = this.encounterOf(run);
        const encounter = run.encounter;
        if (!encounter) return;
        encounter.x -= step + AWAY_HUNT.monsterSpeed * dt;
        const stop = this.timeline.contactX(run.cast.hero, encounter.cast.actor, run.width);
        if (encounter.x > stop) return;
        encounter.plan = this.timeline.planFight(run.cast.hero, encounter.cast, now);
        run.phase = 'fight';
    }

    encounterOf(run) {
        const list = run.cast.monsters, cast = list[run.turn % list.length];
        run.turn += 1;
        return { cast, x: this.timeline.spawnX(cast.actor, run.width), seed: run.turn * 131, plan: null };
    }

    moveProps(run, step) {
        for (const prop of run.props) prop.x -= step;
        while (run.props.length && run.props[0].x + run.props[0].size[0] < 0) run.props.shift();
        run.propIn -= step;
        if (run.propIn > 0 || !run.cast.floor.props.length) return;
        run.props.push(this.propAt(run, run.width + 48));
        const [least, most] = AWAY_HUNT.propEvery;
        run.propIn = least + (run.propTurn * 53) % (most - least);
    }

    propAt(run, x) {
        const pieces = run.cast.floor.props, piece = pieces[run.propTurn % pieces.length];
        run.propTurn += 1;
        return { url: piece.url, size: piece.size, x };
    }

    // ------------------------------------------------------------ drawing
    /** 한 프레임: 상태를 넘기고 그 순간의 모습을 그린다. */
    drawFrame(run, now) {
        if (this.deps.document.hidden) return;
        this.advance(run, now);
        const view = this.viewOf(run);
        if (view) this.painter.paint(view.ctx, this.framePoses(run, now));
    }

    /** 캔버스가 차지하는 틀(가로는 틀이 정하고 캔버스는 그 안에 맞춘다). */
    boxOf(canvas) { return canvas.parentElement || canvas; }

    /** 캔버스 화소 하나가 그림 도트 하나이고, 보이는 크기는 그 화소 수 ÷ battleRenderScale이다: 틀의 가로(ResizeObserver가 잰 값)에
     * 들어가는 정수 화소로 잘라 보이는 크기를 정확히 맞춘다(반 화소로 늘어나 도트가 한 줄씩 겹치지 않게). */
    viewOf(run) {
        const canvas = run.canvas, scale = this.deps.uiDisplay.battleRenderScale;
        if (!this.observer) run.boxWidth = run.box.clientWidth;
        if (!(run.boxWidth > 0)) return null;
        if (run.scale !== scale) { canvas.style.height = `${AWAY_HUNT.height / scale}px`; run.scale = scale; }
        const width = Math.max(1, Math.floor(run.boxWidth * scale + 0.01));
        if (canvas.width !== width || run.width !== width) { canvas.width = width; canvas.style.width = `${width / scale}px`; }
        run.width = width;
        if (canvas.height !== AWAY_HUNT.height) canvas.height = AWAY_HUNT.height;
        return { ctx: canvas.getContext('2d') };
    }

    framePoses(run, now) {
        const encounter = run.encounter, pose = this.timeline.heroPose(run.cast.hero, run, now);
        const monster = encounter ? this.monsterLook(run, encounter, this.timeline.monsterPose(encounter, now)) : null;
        const plan = encounter && encounter.plan;
        return { ...this.stage(run), props: this.propLooks(run), hero: this.heroLook(run, pose, this.timeline.hurtOf(this.deps.STAGE_CHARACTERS.hit, plan, now)), monster,
            effect: plan ? this.effectLook(run, monster, this.timeline.effectsOf(plan, run.cast.effect ? run.cast.effect.frames.length : 0, now)) : null,
            floats: plan ? this.floatLook(run, monster, this.timeline.floatsOf(plan, now)) : null };
    }

    stage(run) {
        return { width: run.width, height: AWAY_HUNT.height, feetY: AWAY_HUNT.height - AWAY_HUNT.feetFromBottom, scroll: run.scroll, palette: run.cast.floor.palette };
    }

    propLooks(run) { return run.props.map(prop => ({ picture: this.pictureOf(prop.url), size: prop.size, x: prop.x })); }

    heroLook(run, pose, hurt) {
        const data = this.deps.STAGE_CHARACTERS;
        return { picture: this.pictureOf(data.path + pose.clip.file + `?v=${data.version}`), clip: pose.clip, frame: pose.frame, x: this.timeline.heroX(run.width), hurt };
    }

    /** 몬스터의 그 장이 시트에서 앉은 칸(한 줄에 cols칸)과 발 자리. 맞붙은 뒤에는 그 자리에 선다(창 크기가 바뀌어도 따라간다). */
    monsterLook(run, encounter, pose) {
        const cast = encounter.cast, actor = cast.actor, clip = pose.clip === 'attack' ? cast.attack : cast.walk;
        const x = encounter.plan ? this.timeline.contactX(run.cast.hero, actor, run.width) : encounter.x;
        return { picture: this.pictureOf(clip.url), cell: { url: clip.url, x: (pose.index % clip.cols) * actor.w, y: Math.floor(pose.index / clip.cols) * actor.h, w: actor.w, h: actor.h },
            footX: actor.feet[0], footY: actor.feet[1], x, alpha: pose.alpha, flash: pose.flash, half: Math.max(6, Math.round(actor.width / 4)), height: actor.height };
    }

    effectLook(run, monster, indices) {
        const strip = indices.length ? this.stripOf(run.cast.effect) : null;
        return strip ? { strip, indices, x: monster.x, y: AWAY_HUNT.height - AWAY_HUNT.feetFromBottom - Math.round(monster.height / 2) } : null;
    }

    floatLook(run, monster, rows) {
        const labels = run.cast.labels;
        if (!rows.length || !labels.length) return null;
        return { font: this.deps.battlePixelFont(), x: monster.x, y: AWAY_HUNT.height - AWAY_HUNT.feetFromBottom - monster.height - 3,
            rows: rows.map(row => ({ ...row, label: labels[row.order % labels.length] })) };
    }

    /** 효과 줄이기의 한 장: 첫 몬스터 앞에서 휘두름의 첫 타격 장, 몬스터 몸 위에 이펙트의 가운데 장. */
    drawStill(run) {
        const view = this.viewOf(run);
        if (!view) return;
        const cast = run.cast, strike = cast.hero.strike, encounter = { cast: cast.monsters[0], x: 0, seed: 0, plan: { hits: [] } };
        const monster = this.monsterLook(run, encounter, { clip: encounter.cast.attack ? 'attack' : 'walk', index: 0, alpha: 1, flash: false });
        const frames = cast.effect ? cast.effect.frames.length : 0;
        this.painter.paint(view.ctx, { ...this.stage(run), props: this.propLooks(run), monster,
            hero: this.heroLook(run, { clip: strike, frame: this.timeline.hitsOf(strike)[0] }, null),
            effect: frames ? this.effectLook(run, monster, [Math.min(2, frames - 1)]) : null, floats: null });
    }

    // ------------------------------------------------------------ pictures
    watch(box) {
        if (this.observer) this.observer.disconnect();
        this.observer = typeof this.deps.ResizeObserver === 'function' ? new this.deps.ResizeObserver(entries => this.resized(entries)) : null;
        if (this.observer) this.observer.observe(box);
    }

    /** 창 크기가 바뀌었다: 가로를 적는다. 효과 줄이기의 한 장은 그림을 다시 열어 다시 그린다. 캔버스가 빠졌으면 그친다. */
    resized(entries) {
        const run = this.run, entry = entries[entries.length - 1];
        if (!run || !entry || entry.target !== run.box) return;
        if (!run.canvas.isConnected) { this.stop(); return; }
        run.boxWidth = entry.contentRect.width;
        if (!run.reduced || !(run.boxWidth > 0)) return;
        run.openedAt = this.deps.performance.now();
        this.openPictures(run.cast);
        this.queue();
    }

    openPictures(cast) {
        const data = this.deps.STAGE_CHARACTERS, hero = cast.hero;
        for (const clip of [hero.walk, hero.idle, hero.strike, hero.cheer]) this.pictureOf(data.path + clip.file + `?v=${data.version}`);
        for (const monster of cast.monsters) {
            this.pictureOf(monster.walk.url);
            if (monster.attack) this.pictureOf(monster.attack.url);
        }
        for (const piece of cast.floor.props) this.pictureOf(piece.url);
        if (cast.effect && !this.strips.has(cast.effect.key)) this.pictureOf(cast.effect.url);
    }

    pictureOf(url) {
        if (!this.pictures.has(url)) this.pictures.set(url, this.deps.stagePictures.openPicture(url));
        return this.pictures.get(url);
    }

    picturesSettled() { return [...this.pictures.values()].every(row => row.ready || row.failed); }

    /** 이펙트의 장들을 effectSize 정사각형 띠로 잘라 두고, 큰 원본(1024 × 1920)은 바로 놓는다. 원본이 아직이면 null. */
    stripOf(effect) {
        if (this.strips.has(effect.key)) return this.strips.get(effect.key);
        const sheet = this.pictures.get(effect.url);
        if (!sheet || !sheet.ready) return null;
        const size = AWAY_HUNT.effectSize, canvas = this.deps.document.createElement('canvas');
        canvas.width = size * effect.frames.length;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        effect.frames.forEach((cell, index) => ctx.drawImage(sheet.source, cell.x, cell.y, size, size, index * size, 0, size, size));
        this.strips.set(effect.key, canvas);
        this.closePicture(sheet);
        this.pictures.delete(effect.url);
        return canvas;
    }

    closePicture(row) {
        try { this.deps.stagePictures.closePicture(row); }
        catch (error) { this.deps.console.warn('away hunt picture release failed:', error); }
    }

    releasePictures() {
        for (const row of this.pictures.values()) this.closePicture(row);
        this.pictures.clear();
        this.strips.clear();
        this.painter.release();
    }
}
