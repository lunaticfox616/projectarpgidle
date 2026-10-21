/** 고스트 대결을 무대의 방에서 보여 준다 (2026-10-22 사용자: "구버전 대전 삭제하고 새로 만든 무대 방식 즉 방에서 대전을 하는 방식으로").
 * 서버가 정한 결과(js/ghost-pvp.js의 duel: 사건의 때와 결과, 남은 생명력, 승자)를 그대로 다시 그린다. 결과는 바꾸지 않는다.
 * - 방: 지금 액트의 지역 방 그림 하나(js/canvas-stage-board.js room, 문 없는 방). 지역 그림이 없는 곳(액트 1 같은)은 고대 미궁의 방이다.
 * - 두 사람: 무대 주인공 그림(data/stage-characters.js)으로 마주 선다. 직업과 무기 자세는 고스트 기록의 classId, stance(없는 예전
 *   기록은 영웅 번호의 직업과 그 직업의 시작 무기)이고, 내 쪽은 지금 무대의 주인공 그대로다. 저마다 그 룬의 동작(stageActors.motionFor)으로
 *   치고, 그 동작의 첫 타격 장이 서버가 적은 때에 온다(활과 주문은 그만큼 먼저 쏘아 빛줄기가 그때 닿는다). 맞으면 규격의 붉은 테와 밀림이다.
 * - 움직임(2026-10-22 사용자 "실제 전투처럼 서로 움직이면서"): 서버가 게임의 주인공처럼 움직이게 한다(simulate_ghost_duel: 다가가기,
 *   이동 스킬룬, 거리 유지의 물러서기, 압박). 서버는 사건마다, 또 걸음이 바뀐 때마다 두 자리(lx, rx)를 남기고 그 사이는 고르게 걷는다.
 *   걸을 때는 걷는 쪽을 보고 걷기 동작(이동 속도만큼 빠르게)이고, 이동 스킬룬은 그 룬의 동작이다. arena가 없는 예전 기록은 제자리에서 싸운다.
 * - 숫자: 서버는 싸움이 10초쯤 걸리게 피해를 한 배율로 줄여 적는다(db/operations-and-ghost.sql simulate_ghost_duel의 shared_scale).
 *   그 배율을 되돌려 게임의 피해 크기로 보여 준다.
 * - 끝: 진 쪽은 쓰러지고 이긴 쪽은 외친 뒤 결과 창이 뜬다.
 * 전장 위를 덮어 보여 주고, 보는 동안 게임은 멈춘다(js/ui.js isForegroundGameplayPausedForBackground). 그리기만 하고 게임 상태는 바꾸지 않는다.
 */
const ghostDuelStage = (() => {
    const ROOM = Object.freeze({ columns: 12, rows: 5 });                    // 대전 방의 칸
    const SPOT = Object.freeze({ left: 4.6, right: 7.4, row: 2.6 });         // 움직임이 없는 예전 기록의 자리(방 왼쪽 끝에서 칸)와 줄
    const FALLBACK_REGION = 'labyrinth';
    const OUTRO_MS = 2600, FLOAT_MS = 900, FLOAT_LINE_PX = 28, CHEER_DELAY_MS = 450, LOAD_WAIT_MS = 6000;
    const SHOT_MS_PER_CELL = 45, SHOT_MS_MIN = 90, SHOT_MS_MAX = 360;       // 빛줄기가 한 칸을 나는 때와 그 아래위
    const SUDDEN_DEATH_MS = 25000, SUDDEN_DEATH_DAMAGE = 1.5;               // 서버와 같다(simulate_ghost_duel)
    const RANGED = new Set(['projectile', 'spell', 'channel', 'dot']);
    const COLOURS = Object.freeze({ phys: '#e8d4b0', fire: '#ff7048', cold: '#80d9ff', light: '#d9f36a', chaos: '#c770ff' });
    const WORDS = Object.freeze({ evade: '회피', block: '막기' });
    const RIMS_KEPT = 24;
    const rims = new Map();
    let scene = null;

    // ------------------------------------------------------------ who fights in what
    /** 고스트 기록의 영웅 번호 → 직업(data/passives.js PLAYER_CLASS_DEFS의 recommendedTalentHeroId는 직업마다 다르다). */
    function classOfHero(heroId) {
        const found = Object.keys(PLAYER_CLASS_DEFS).find(id => PLAYER_CLASS_DEFS[id].recommendedTalentHeroId === heroId);
        return found && STAGE_CHARACTERS.classes[found] ? found : 'wanderer';
    }
    /** 그 직업의 시작 무기 자세(data/hana-weapon-combos.js classWeapons → data/skills.js SKILL_RUNE_STANCE_BY_CATEGORY). */
    function startStance(classId) {
        return SKILL_RUNE_STANCE_BY_CATEGORY[HANA_WEAPON_COMBOS.classWeapons[classId]] || 'unarmed';
    }
    /** 내 쪽: 지금 무대에 선 주인공과 같은 직업과 자세. */
    function ownLook() {
        const classId = getHeroAppearanceId();
        return STAGE_CHARACTERS.classes[classId] ? { classId, stance: getStageHeroStance() } : null;
    }
    /** 기록에 적힌 직업과 자세(js/ghost-combat.js getGhostCombatMotion). 없거나 모르는 값이면 영웅 번호의 직업과 그 직업의 시작 무기. */
    function lookOfSnapshot(snap) {
        const classId = STAGE_CHARACTERS.classes[snap.classId] ? snap.classId : classOfHero(snap.heroId);
        return { classId, stance: STAGE_VIEW.stances.includes(snap.stance) ? snap.stance : startStance(classId) };
    }
    /** 그 룬의 휘두름: 룬의 동작이 그 자세에 있으면 그것, 없으면 그 자세의 기본 공격이나 시전. */
    function strikeClip(set, motion) {
        return (motion && set[motion]) || set.attack || set.cast || set.throw || set.idle;
    }
    /** 이동 스킬룬의 동작: 그 룬의 동작, 없으면 도약이나 돌진, 그도 없으면 걷기. */
    function dashClip(set, motion) {
        return (motion && set[motion]) || set.leap || set.charge || set.walk || set.idle;
    }
    /** 그 사람이 서고, 걷고, 치고, 이동 스킬룬을 쓰고, 쓰러지고, 외치는 동작(쓰러짐은 맨손 묶음에만 있다). */
    function clipsOf(look, snap) {
        const kit = STAGE_CHARACTERS.classes[look.classId].weapons, set = kit[look.stance] || kit.unarmed;
        const motion = name => stageActors.motionFor(name, look.classId, look.stance);
        return { idle: set.idle, walk: set.walk || set.idle, strike: strikeClip(set, motion(snap.activeSkill)), dash: dashClip(set, snap.mobilitySkill ? motion(snap.mobilitySkill) : null),
            death: kit.unarmed.death, cheer: set.shout || set.idle };
    }
    function labelsOf(row, snap, side) {
        return { name: String(row.nickname || (side === 'left' ? '도전자' : '수비자')), skill: String(snap.activeSkill || '기본 공격') };
    }
    function styleOf(snap) {
        return { colour: COLOURS[snap.skillElement] || COLOURS.phys, ranged: RANGED.has(snap.style), dps: Math.max(1, Number(snap.dps) || 1) };
    }
    /** 걷기 동작의 빠르기: 기록의 이동 속도(100이 기본) 그대로이되 무대의 걷기와 같은 아래위(STAGE_CHARACTERS.move). */
    function walkRateOf(snap) {
        const speed = Number(snap.moveSpeed), rule = STAGE_CHARACTERS.move;
        return Number.isFinite(speed) && speed > 0 ? clampNumber(speed / 100, rule.rateMin, rule.rateMax) : 1;
    }
    function fighterOf(duel, side, look) {
        const row = duel[side] || {}, snap = row.snapshot || {};
        return { side, ...labelsOf(row, snap, side), ...styleOf(snap), clips: clipsOf(look || lookOfSnapshot(snap), snap), walkRate: walkRateOf(snap) };
    }

    // ------------------------------------------------------------ clip timing
    const frameMs = (clip, index) => (Array.isArray(clip.ms) ? clip.ms[index] : clip.ms) || 100;
    function clipLength(clip) {
        let total = 0;
        for (let index = 0; index < clip.frames; index++) total += frameMs(clip, index);
        return total;
    }
    /** 그 동작의 첫 타격 장까지(ms): 이만큼 앞서 휘두르기 시작하면 서버가 적은 때에 타격 장이 온다. */
    function leadOf(clip) {
        const hit = Array.isArray(clip.hit) && clip.hit.length ? clip.hit[0] : 0;
        let total = 0;
        for (let index = 0; index < hit; index++) total += frameMs(clip, index);
        return total;
    }
    /** t(ms)에 보이는 장. 되풀이하지 않는 동작은 마지막 장에서 멈춘다. */
    function frameAt(clip, t, loop) {
        const length = clipLength(clip);
        let left = loop ? ((t % length) + length) % length : Math.max(0, t);
        for (let index = 0; index < clip.frames; index++) {
            left -= frameMs(clip, index);
            if (left < 0) return index;
        }
        return clip.frames - 1;
    }

    // ------------------------------------------------------------ the fight as the server wrote it
    /** 그 사람이 at 앞에서 마지막으로 걸음(이동 스킬룬 포함)을 멈춘 때. 걷지 않았거나 움직임이 없는 기록이면 -Infinity. */
    function walkEndBefore(track, side, at) {
        const key = side === 'left' ? 'lx' : 'rx';
        for (let k = (track ? track.length : 0) - 1; k > 0; k--) {
            if (track[k].t <= at && Math.abs(track[k][key] - track[k - 1][key]) > 0.001) return track[k].t;
        }
        return -Infinity;
    }
    /** 한 번의 공격. 근접은 타격 장이 서버가 적은 때(at)에 오고, 활과 주문은 그만큼(거리에 따라) 먼저 쏘아 빛줄기가 at에 닿는다.
     * 그 앞의 걸음이 끝나기 전에는 휘두름을 보이지 않는다(shown): 물러서며 활을 당기지 않고, 멈춘 뒤 남은 장만 보인다. */
    function strikeOf(event, side, action, f, track) {
        const at = Math.max(0, Number(event.t) || 0), gap = Math.abs(Number(event.rx) - Number(event.lx));
        const flight = f.ranged ? clampNumber((Number.isFinite(gap) ? gap : SPOT.right - SPOT.left) * SHOT_MS_PER_CELL, SHOT_MS_MIN, SHOT_MS_MAX) : 0;
        const start = at - flight - leadOf(f.clips.strike);
        return { side, at, flight, start, shown: Math.max(start, walkEndBefore(track, side, at)), end: start + clipLength(f.clips.strike),
            outcome: String(action.outcome || 'hit'), damage: Math.max(0, Number(action.damage) || 0), crit: !!action.crit };
    }
    function strikesOf(duel, fighters, track) {
        const list = [];
        for (const event of duel.events) {
            for (const side of ['left', 'right']) {
                const action = event && event[side];
                if (action && typeof action === 'object') list.push(strikeOf(event, side, action, fighters[side], track));
            }
        }
        return list;
    }
    /** 두 자리(방 왼쪽 끝에서 칸)가 적힌 때들: 처음 선 자리와, 서버가 사건마다 또 걸음이 바뀐 때마다 남긴 자리(simulate_ghost_duel의
     * lx, rx). 때 순서다. 움직임이 없는 예전 기록이면 null. */
    function trackOf(duel) {
        const arena = duel.arena;
        if (!arena || !Number.isFinite(Number(arena.leftStart))) return null;
        const points = duel.events.filter(event => event && typeof event === 'object')
            .map(event => ({ t: Number(event.t), lx: Number(event.lx), rx: Number(event.rx), dash: event.dash || '' }))
            .filter(point => [point.t, point.lx, point.rx].every(Number.isFinite));
        return [{ t: 0, lx: Number(arena.leftStart), rx: Number(arena.rightStart), dash: '' }, ...points];
    }
    function dashesOf(duel) {
        const list = [];
        for (const event of Array.isArray(duel.events) ? duel.events : []) {
            const dash = event && event.dash, at = Number(event && event.t) || 0;
            if (dash === 'left' || dash === 'both') list.push({ side: 'left', at });
            if (dash === 'right' || dash === 'both') list.push({ side: 'right', at });
        }
        return list;
    }
    function lifeOf(duel) {
        return (Array.isArray(duel.events) ? duel.events : []).map(event => ({ t: Number(event.t) || 0,
            left: clampNumber(Number(event.leftPct), 0, 100), right: clampNumber(Number(event.rightPct), 0, 100) }));
    }
    /** 서버가 피해에 곱한 배율(simulate_ghost_duel shared_scale): 남은 생명력의 최대치와 DPS에서 같은 셈으로 되짚는다. 모르면 0. */
    function damageScale(duel, fighters) {
        const leftMax = Number(duel.leftMax), rightMax = Number(duel.rightMax);
        if (!(leftMax > 0 && rightMax > 0)) return 0;
        return clampNumber(Math.sqrt((rightMax / fighters.left.dps) * (leftMax / fighters.right.dps)) / 10, 0.000001, 1000);
    }
    /** 결과가 갈린 때: 마지막 일격(이긴 쪽이 있을 때) 또는 싸움이 끝난 때. */
    function endOf(duel, strikes) {
        const last = strikes.length ? strikes[strikes.length - 1].at : 0;
        return duel.winner === 'left' || duel.winner === 'right' ? last : Math.max(last, Number(duel.durationMs) || 0);
    }

    // ------------------------------------------------------------ pictures
    function sheetOf(file) {
        if (!scene.sheets.has(file)) scene.sheets.set(file, stagePictures.openPicture(STAGE_CHARACTERS.path + file + `?v=${STAGE_CHARACTERS.version}`));
        return scene.sheets.get(file);
    }
    function sheetsSettled() {
        return [...scene.sheets.values()].every(sheet => sheet.ready || sheet.failed);
    }
    /** 한 장을 한 색으로 칠한 그림(맞았을 때의 테). js/canvas-stage-actors.js silhouette과 같은 규칙. */
    function rimOf(sheet, clip, frame, colour) {
        const key = `${sheet.url}|${frame}|${colour}`;
        if (rims.has(key)) return rims.get(key);
        const canvas = document.createElement('canvas');
        canvas.width = clip.w;
        canvas.height = clip.h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sheet.source, frame * clip.w, 0, clip.w, clip.h, 0, 0, clip.w, clip.h);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = colour;
        ctx.fillRect(0, 0, clip.w, clip.h);
        rims.set(key, canvas);
        if (rims.size > RIMS_KEPT) rims.delete(rims.keys().next().value);
        return canvas;
    }
    function regionOfHere() {
        const zone = typeof getZone === 'function' ? getZone(game.currentZoneId) : null;
        const act = zone && Number(zone.act) > 0 ? 'act-' + String(zone.act).padStart(2, '0') : '';
        return stageRegionFit.of(act) ? act : FALLBACK_REGION;
    }

    // ------------------------------------------------------------ poses
    /** c(ms)에 휘두르는 중인 마지막 일격(보이기 시작한 뒤). */
    function swingAt(side, c) {
        let found = null;
        for (const strike of scene.strikes) if (strike.side === side && strike.shown <= c && c < strike.end) found = strike;
        return found;
    }
    /** c(ms) 앞뒤로 자리가 적힌 때(a, b). 마지막 때 뒤면 b는 a다. */
    function bracketOf(c) {
        const track = scene.track;
        let low = 0, high = track.length - 1;
        while (low < high) {
            const mid = (low + high + 1) >> 1;
            if (track[mid].t <= c) low = mid; else high = mid - 1;
        }
        return { a: track[low], b: track[Math.min(track.length - 1, low + 1)] };
    }
    /** c(ms)의 두 자리(방 왼쪽 끝에서 칸): 적힌 때 사이를 고르게 잇는다. */
    function placeOf(c) {
        if (!scene.track) return { left: SPOT.left, right: SPOT.right };
        const { a, b } = bracketOf(c), f = b.t > a.t ? clampNumber((c - a.t) / (b.t - a.t), 0, 1) : 0;
        return { left: a.lx + (b.lx - a.lx) * f, right: a.rx + (b.rx - a.rx) * f };
    }
    /** c에 이동 스킬룬을 쓰는 중이면 그 동작을 시작한 때(그 걸음의 100ms 앞), 아니면 null. */
    function dashAt(f, c) {
        let found = null;
        for (const dash of scene.dashes) {
            const start = dash.at - 100;
            if (dash.side === f.side && start <= c && c < start + clipLength(f.clips.dash)) found = start;
        }
        return found;
    }
    /** c에 걷는 쪽(-1 방 왼쪽, 1 오른쪽, 0 서 있음): 그 사이에 자리가 바뀌었고 이동 스킬룬이 아니다. */
    function walkOf(side, c) {
        if (!scene.track) return 0;
        const { a, b } = bracketOf(c), moved = side === 'left' ? b.lx - a.lx : b.rx - a.rx;
        if (b.dash === side || b.dash === 'both' || Math.abs(moved) < 0.001) return 0;
        return Math.sign(moved);
    }
    /** c의 동작과 장, 보는 쪽(west: 방 왼쪽). 걸을 때는 걷는 쪽을 보고(js/canvas-stage-actors.js poseDirection), 그 밖에는 상대를 본다. */
    function poseOf(f, c) {
        const facing = f.side === 'right';
        if (scene.loser === f.side && c >= scene.endAt) return { clip: f.clips.death, frame: frameAt(f.clips.death, c - scene.endAt, false), west: facing };
        if (scene.winner === f.side && c >= scene.endAt + CHEER_DELAY_MS) return { clip: f.clips.cheer, frame: frameAt(f.clips.cheer, c - scene.endAt - CHEER_DELAY_MS, false), west: facing };
        const dash = dashAt(f, c);
        if (dash !== null) return { clip: f.clips.dash, frame: frameAt(f.clips.dash, c - dash, false), west: facing };
        const swing = swingAt(f.side, c);
        if (swing) return { clip: f.clips.strike, frame: frameAt(f.clips.strike, c - swing.start, false), west: facing };
        const walk = walkOf(f.side, c);
        if (walk) return { clip: f.clips.walk, frame: frameAt(f.clips.walk, c * f.walkRate, true), west: walk < 0 };
        return { clip: f.clips.idle, frame: frameAt(f.clips.idle, c, true), west: facing };
    }
    /** 맞은 뒤의 테와 밀림(STAGE_CHARACTERS.hit의 단계): 가장 가까운 지난 타격에서 센다. */
    function hurtOf(side, c) {
        let age = Infinity;
        for (const strike of scene.strikes) {
            if (strike.side !== side && strike.at <= c && (strike.outcome === 'hit' || strike.outcome === 'deflect')) age = Math.min(age, c - strike.at);
        }
        for (const step of STAGE_CHARACTERS.hit.steps) {
            if (age < step.ms) return step;
            age -= step.ms;
        }
        return null;
    }

    // ------------------------------------------------------------ drawing
    const otherSide = side => (side === 'left' ? 'right' : 'left');
    /** 그 사람의 c(ms) 발 자리(화면): 방 왼쪽 끝에서 x칸, 정해 둔 줄. */
    function spotOf(place, side, c) {
        const at = place.cells.cellToScreen(placeOf(c)[side] - 0.5, SPOT.row);
        return { x: at.x, y: at.y + place.cells.actorGroundOffsetY };
    }
    function drawFighter(ctx, f, c, place) {
        const pose = poseOf(f, c), sheet = sheetOf(pose.clip.file);
        if (!sheet.ready) return;
        const spot = spotOf(place, f.side, c), scale = stageActors.scaleFor(place.cells.tileW), west = pose.west;
        const look = hurtOf(f.side, c), axis = spot.x + (look ? look.back * scale * (west ? 1 : -1) : 0);
        stageRings.shadow(ctx, { x: spot.x, y: spot.y, dot: scale }, 15, 0.42);
        ctx.save();
        if (west) { ctx.translate(axis * 2, 0); ctx.scale(-1, 1); }
        const dest = { x: Math.round(axis - (pose.clip.ax + 0.5) * scale), y: Math.round(spot.y - pose.clip.ay * scale), scale };
        if (look && look.outline) {
            const rim = rimOf(sheet, pose.clip, pose.frame, look.outline), step = STAGE_CHARACTERS.hit.outlinePx * scale;
            for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) stageDots.blit(ctx, rim, { x: 0, y: 0, w: pose.clip.w, h: pose.clip.h }, { ...dest, x: Math.round(dest.x + dx * step), y: Math.round(dest.y + dy * step) });
        }
        stageDots.blit(ctx, sheet.source, { x: pose.frame * pose.clip.w, y: 0, w: pose.clip.w, h: pose.clip.h }, dest);
        ctx.restore();
    }
    /** 활과 주문의 빛줄기: 쏜 때부터 서버가 적은 때까지 손 높이에서 상대의 가슴으로. */
    function drawShots(ctx, c, place) {
        const scale = stageActors.scaleFor(place.cells.tileW);
        for (const strike of scene.strikes) {
            const f = scene.fighters[strike.side];
            if (!f.ranged || c < strike.at - strike.flight || c >= strike.at) continue;
            const from = spotOf(place, strike.side, c), to = spotOf(place, otherSide(strike.side), c), toward = Math.sign(to.x - from.x);
            const t = (c - (strike.at - strike.flight)) / strike.flight, x = from.x + toward * 24 * scale + (to.x - from.x - toward * 34 * scale) * t;
            const y = from.y - 62 * scale + (6 * scale) * t;
            ctx.fillStyle = f.colour;
            ctx.fillRect(Math.round(x - 3 * scale), Math.round(y - scale), Math.round(6 * scale), Math.round(2 * scale));
            ctx.globalAlpha = 0.45;
            ctx.fillRect(Math.round(x - toward * 9 * scale - 3 * scale), Math.round(y - scale), Math.round(5 * scale), Math.round(2 * scale));
            ctx.globalAlpha = 1;
        }
    }
    function floatLabel(strike) {
        if (WORDS[strike.outcome]) return WORDS[strike.outcome];
        const scale = scene.scale * (strike.at >= SUDDEN_DEATH_MS ? SUDDEN_DEATH_DAMAGE : 1);
        const shown = scale > 0 ? formatNumberKR(Math.round(strike.damage / scale)) : '';
        return strike.outcome === 'deflect' ? `비껴냄 ${shown}` : shown;
    }
    /** 떠오른 글의 모습: 끝의 40% 동안 사라지고, 회피와 막기는 푸른빛, 치명타는 금빛으로 처음에 조금 더 튄다. */
    function floatLook(strike, age) {
        const fade = FLOAT_MS * 0.6, alpha = age > fade ? 1 - (age - fade) / (FLOAT_MS - fade) : 1;
        const colour = WORDS[strike.outcome] ? '#a9d4ff' : strike.crit ? '#ffd24a' : '#ffffff';
        return { alpha, colour, lift: age / FLOAT_MS * 28 + (strike.crit && age < 160 ? 6 : 0) };
    }
    /** 떠오른 글의 자리: 맞은 쪽 머리 위. 화면 밖으로 나가지 않게 가로를 당기고, 두 사람이 글 폭보다 가까이 서면 방 오른쪽에 선 사람의
     * 글을 한 줄 올린다(휴대폰에서 붙어 싸우면 두 숫자가 겹쳤다). */
    function floatAt(ctx, label, target, other, width) {
        const w = ctx.measureText(label).width + 8;
        const x = clampNumber(target.x, w / 2, Math.max(w / 2, width - w / 2));
        return { x: Math.round(x), lift: target.x > other.x && target.x - other.x < w ? FLOAT_LINE_PX : 0 };
    }
    /** 맞은 쪽 머리 위로 떠오르는 피해 숫자와 회피, 막기. */
    function drawFloats(ctx, c, place, width) {
        const scale = stageActors.scaleFor(place.cells.tileW), head = (scene.fighters.left.clips.idle.ay + 8) * scale;
        ctx.font = `bold 24px ${BATTLE_PIXEL_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#000';
        for (const strike of scene.strikes) {
            const age = c - strike.at, label = age >= 0 && age < FLOAT_MS ? floatLabel(strike) : '';
            if (!label) continue;
            const target = spotOf(place, otherSide(strike.side), c), look = floatLook(strike, age);
            const at = floatAt(ctx, label, target, spotOf(place, strike.side, c), width), y = Math.round(target.y - head - look.lift - at.lift);
            ctx.globalAlpha = look.alpha;
            ctx.fillStyle = look.colour;
            drawCrispCanvasText(ctx, label, at.x, y, 'strokeText');
            drawCrispCanvasText(ctx, label, at.x, y);
        }
        ctx.globalAlpha = 1;
    }
    function fitCanvas(canvas) {
        const ratio = uiDisplay.battleRenderScale, width = canvas.clientWidth, height = canvas.clientHeight;
        const w = Math.max(1, Math.round(width * ratio)), h = Math.max(1, Math.round(height * ratio));
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        const ctx = canvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.imageSmoothingEnabled = false;
        return { ctx, width, height };
    }
    function drawScene(c) {
        const { ctx, width, height } = fitCanvas(scene.canvas), place = stageBoard.place(width, height, ROOM.columns, ROOM.rows);
        const p = { ...place.cells, mapX: place.left, mapY: place.top, mapWidth: ROOM.columns * place.cells.tileW, mapHeight: ROOM.rows * place.cells.tileH,
            stageBoard: stageBoard.room(scene.region, ROOM.columns, ROOM.rows) };
        ctx.clearRect(0, 0, width, height);
        if (!stageBoard.background(ctx, p, { width, height })) { ctx.fillStyle = '#0b090c'; ctx.fillRect(0, 0, width, height); }
        for (const side of ['left', 'right']) drawFighter(ctx, scene.fighters[side], c, place);
        drawShots(ctx, c, place);
        drawFloats(ctx, c, place, width);
    }

    // ------------------------------------------------------------ the frame over the battlefield
    const escape = value => escapeHTML(String(value == null ? '' : value));
    function plateHtml(f) {
        return `<div class="ghost-duel-plate ${f.side}"><strong>${escape(f.name)}</strong><small>${escape(f.skill)}</small>
            <div class="ghost-duel-life"><i data-duel-life="${f.side}"></i></div><em data-duel-pct="${f.side}">100%</em></div>`;
    }
    function rootHtml() {
        return `<canvas class="ghost-duel-canvas" aria-hidden="true"></canvas>${plateHtml(scene.fighters.left)}${plateHtml(scene.fighters.right)}
            <p class="ghost-duel-banner" aria-live="polite" data-duel-banner>불러오는 중</p>
            <div class="ghost-duel-controls"><button type="button" data-duel="pause">일시정지</button><button type="button" data-duel="speed">1배속</button>
            <button type="button" data-duel="skip">건너뛰기</button><button type="button" data-duel="close">나가기</button></div>
            <section class="ghost-duel-result" data-duel-result hidden></section>`;
    }
    function mountRoot() {
        const host = document.getElementById('battlefield-wrap');
        if (!host) return null;
        const root = document.createElement('div');
        root.id = 'ghost-duel-stage';
        root.className = 'ghost-duel-stage';
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-label', '고스트 대결');
        root.innerHTML = rootHtml();
        root.addEventListener('click', onClick);
        host.appendChild(root);
        return root;
    }
    /** c(ms)의 남은 생명력(%): 그때까지 서버가 적은 마지막 값. */
    function lifeAt(c) {
        let life = { left: 100, right: 100 };
        for (const row of scene.life) { if (row.t > c) break; life = row; }
        return life;
    }
    function bannerAt(c) {
        if (!scene.started) return '불러오는 중';
        if (c < (scene.strikes.length ? scene.strikes[0].at : 0)) return '대결 시작';
        return c >= SUDDEN_DEATH_MS && c < scene.endAt ? '막판: 피해 1.5배' : '';
    }
    function updateHud(c) {
        const life = lifeAt(c);
        for (const side of ['left', 'right']) {
            const bar = scene.root.querySelector(`[data-duel-life="${side}"]`), pct = scene.root.querySelector(`[data-duel-pct="${side}"]`);
            if (bar) bar.style.width = `${life[side]}%`;
            if (pct) pct.textContent = `${life[side].toFixed(1)}%`;
        }
        const node = scene.root.querySelector('[data-duel-banner]'), banner = bannerAt(c);
        if (!node) return;
        if (node.textContent !== banner) node.textContent = banner;
        node.hidden = !banner;
    }
    const RESULT_TITLES = Object.freeze({ left: Object.freeze(['승리', 'win']), right: Object.freeze(['패배', 'loss']) });
    function ratingLine() {
        const outcome = scene.outcome || {}, result = outcome.result || {};
        if (outcome.mode !== 'ranked' || result.ratingAfter === undefined) return '친선전이라 레이팅은 그대로입니다';
        const delta = Number(result.ratingDelta) || 0;
        return `레이팅 ${escape(result.ratingBefore)} → ${escape(result.ratingAfter)} (${delta >= 0 ? '+' : ''}${delta})`;
    }
    /** 내 쪽(도전자)에서 본 결과. */
    function resultHtml() {
        const [title, tone] = RESULT_TITLES[scene.winner] || ['무승부', 'draw'];
        return `<strong class="${tone}">${title}</strong><span>대결 상대 ${escape(scene.fighters.right.name)}</span><span>${ratingLine()}</span>
            <div><button type="button" data-duel="again">다시 보기</button><button type="button" data-duel="tab">대전 탭으로</button><button type="button" data-duel="close">닫기</button></div>`;
    }
    function showResult() {
        const panel = scene.root.querySelector('[data-duel-result]');
        if (!panel || !panel.hidden) return;
        panel.innerHTML = resultHtml();
        panel.hidden = false;
        scene.root.querySelector('.ghost-duel-controls').hidden = true;
    }

    // ------------------------------------------------------------ clock
    function tick(now) {
        if (!scene) return;
        const step = Math.min(100, Math.max(0, now - scene.last));
        scene.last = now;
        if (!scene.started && (sheetsSettled() || now - scene.opened > LOAD_WAIT_MS)) scene.started = true;
        if (scene.started && !scene.paused) scene.clock += step * scene.speed;
        drawScene(scene.clock);
        updateHud(scene.clock);
        if (scene.clock >= scene.endAt + OUTRO_MS) showResult();
        scene.frame = requestAnimationFrame(tick);
    }
    function restart() {
        const panel = scene.root.querySelector('[data-duel-result]');
        panel.hidden = true;
        scene.root.querySelector('.ghost-duel-controls').hidden = false;
        scene.clock = 0;
        scene.paused = false;
    }
    function openDuelTab() {
        stop();
        window.switchTab('tab-map', { keepWindowOpen: true });
        window.switchMapSubtab('map-tab-pvp');
    }
    const ACTIONS = Object.freeze({
        pause: () => { scene.paused = !scene.paused; },
        speed: () => { scene.speed = scene.speed === 1 ? 2 : 1; },
        skip: () => { scene.clock = Math.max(scene.clock, scene.endAt + OUTRO_MS); },
        again: () => restart(),
        tab: () => openDuelTab(),
        close: () => stop()
    });
    function syncButtons() {
        scene.root.querySelector('[data-duel="pause"]').textContent = scene.paused ? '계속' : '일시정지';
        scene.root.querySelector('[data-duel="speed"]').textContent = `${scene.speed}배속`;
    }
    function onClick(event) {
        const action = event.target.closest('[data-duel]')?.dataset.duel;
        if (!scene || !ACTIONS[action]) return;
        ACTIONS[action]();
        if (scene) syncButtons();
    }

    // ------------------------------------------------------------ open and close
    /** @param {object} duel 서버의 대결 기록(events, winner, leftMax, rightMax, left, right)
     * @param {{mode:'ranked'|'friendly', result:object}} outcome 결과 창에 쓸 레이팅 변화 */
    function sceneOf(duel, outcome) {
        const fighters = { left: fighterOf(duel, 'left', ownLook()), right: fighterOf(duel, 'right', null) }, track = trackOf(duel);
        const strikes = strikesOf(duel, fighters, track), winner = RESULT_TITLES[duel.winner] ? duel.winner : '', now = performance.now();
        return { duel, outcome, fighters, strikes, life: lifeOf(duel), scale: damageScale(duel, fighters), region: regionOfHere(), sheets: new Map(),
            track, dashes: dashesOf(duel),
            winner, loser: { left: 'right', right: 'left' }[winner] || '', endAt: endOf(duel, strikes), clock: 0, speed: 1, paused: false,
            started: false, opened: now, last: now, frame: 0, root: null, canvas: null };
    }
    function play(duel, outcome) {
        stop();
        if (!duel || !Array.isArray(duel.events) || !stageView.enabled()) return false;
        scene = sceneOf(duel, outcome);
        if (typeof closeAllWindows === 'function') closeAllWindows();
        scene.root = mountRoot();
        if (!scene.root) { scene = null; return false; }
        scene.canvas = scene.root.querySelector('canvas');
        for (const f of Object.values(scene.fighters)) for (const clip of Object.values(f.clips)) sheetOf(clip.file);
        scene.frame = requestAnimationFrame(tick);
        return true;
    }
    function stop() {
        if (!scene) return;
        cancelAnimationFrame(scene.frame);
        for (const sheet of scene.sheets.values()) stagePictures.closePicture(sheet);
        if (scene.root) scene.root.remove();
        rims.clear();
        scene = null;
    }
    /** 대결을 보는 중(결과 창까지): 그동안 게임은 멈춘다. */
    const playing = () => !!scene;
    return Object.freeze({ play, stop, playing });
})();
safeExposeGlobals({ ghostDuelStage });
