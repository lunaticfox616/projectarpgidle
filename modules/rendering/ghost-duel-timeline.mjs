import { SPOT, SHOT_MS_PER_CELL, SHOT_MS_MIN, SHOT_MS_MAX, CHEER_DELAY_MS } from '../data/ghost-duel-stage.mjs';

export class GhostDuelTimeline {
    constructor(deps) {
        this.deps = deps;
    }

    frameMs(clip, index) { return (Array.isArray(clip.ms) ? clip.ms[index] : clip.ms) || 100; }

    clipLength(clip) {
        let total = 0;
        for (let index = 0; index < clip.frames; index++) total += this.frameMs(clip, index);
        return total;
    }

    /** 그 동작의 첫 타격 장까지(ms): 이만큼 앞서 휘두르기 시작하면 서버가 적은 때에 타격 장이 온다. */
    leadOf(clip) {
        const hit = Array.isArray(clip.hit) && clip.hit.length ? clip.hit[0] : 0;
        let total = 0;
        for (let index = 0; index < hit; index++) total += this.frameMs(clip, index);
        return total;
    }

    /** t(ms)에 보이는 장. 되풀이하지 않는 동작은 마지막 장에서 멈춘다. */
    frameAt(clip, t, loop) {
        const length = this.clipLength(clip);
        let left = loop ? ((t % length) + length) % length : Math.max(0, t);
        for (let index = 0; index < clip.frames; index++) {
            left -= this.frameMs(clip, index);
            if (left < 0) return index;
        }
        return clip.frames - 1;
    }

    /** 그 사람이 at 앞에서 마지막으로 걸음(이동 스킬룬 포함)을 멈춘 때. 걷지 않았거나 움직임이 없는 기록이면 -Infinity. */
    walkEndBefore(track, side, at) {
        const key = side === 'left' ? 'lx' : 'rx';
        for (let k = (track ? track.length : 0) - 1; k > 0; k--) {
            if (track[k].t <= at && Math.abs(track[k][key] - track[k - 1][key]) > 0.001) return track[k].t;
        }
        return -Infinity;
    }

    /** 한 번의 공격. 근접은 타격 장이 서버가 적은 때(at)에 오고, 활과 주문은 그만큼(거리에 따라) 먼저 쏘아 빛줄기가 at에 닿는다.
     * 그 앞의 걸음이 끝나기 전에는 휘두름을 보이지 않는다(shown): 물러서며 활을 당기지 않고, 멈춘 뒤 남은 장만 보인다. */
    strikeOf(event, side, action, f, track) {
        const at = Math.max(0, Number(event.t) || 0), gap = Math.abs(Number(event.rx) - Number(event.lx));
        const flight = f.ranged ? (0, this.deps.clampNumber)((Number.isFinite(gap) ? gap : SPOT.right - SPOT.left) * SHOT_MS_PER_CELL, SHOT_MS_MIN, SHOT_MS_MAX) : 0;
        const start = at - flight - this.leadOf(f.clips.strike);
        return { side, at, flight, start, shown: Math.max(start, this.walkEndBefore(track, side, at)), end: start + this.clipLength(f.clips.strike),
            outcome: String(action.outcome || 'hit'), damage: Math.max(0, Number(action.damage) || 0), crit: !!action.crit };
    }

    strikesOf(duel, fighters, track) {
        const list = [];
        for (const event of duel.events) {
            for (const side of ['left', 'right']) {
                const action = event && event[side];
                if (action && typeof action === 'object') list.push(this.strikeOf(event, side, action, fighters[side], track));
            }
        }
        return list;
    }

    /** 두 자리(방 왼쪽 끝에서 칸)가 적힌 때들: 처음 선 자리와, 서버가 사건마다 또 걸음이 바뀐 때마다 남긴 자리(simulate_ghost_duel의
     * lx, rx). 때 순서다. 움직임이 없는 예전 기록이면 null. */
    trackOf(duel) {
        const arena = duel.arena;
        if (!arena || !Number.isFinite(Number(arena.leftStart))) return null;
        const points = duel.events.filter(event => event && typeof event === 'object')
            .map(event => ({ t: Number(event.t), lx: Number(event.lx), rx: Number(event.rx), dash: event.dash || '' }))
            .filter(point => [point.t, point.lx, point.rx].every(Number.isFinite));
        return [{ t: 0, lx: Number(arena.leftStart), rx: Number(arena.rightStart), dash: '' }, ...points];
    }

    dashesOf(duel) {
        const list = [];
        for (const event of Array.isArray(duel.events) ? duel.events : []) {
            const dash = event && event.dash, at = Number(event && event.t) || 0;
            if (dash === 'left' || dash === 'both') list.push({ side: 'left', at });
            if (dash === 'right' || dash === 'both') list.push({ side: 'right', at });
        }
        return list;
    }

    lifeOf(duel) {
        return (Array.isArray(duel.events) ? duel.events : []).map(event => ({ t: Number(event.t) || 0,
            left: (0, this.deps.clampNumber)(Number(event.leftPct), 0, 100), right: (0, this.deps.clampNumber)(Number(event.rightPct), 0, 100) }));
    }

    /** 서버가 피해에 곱한 배율(simulate_ghost_duel shared_scale): 남은 생명력의 최대치와 DPS에서 같은 셈으로 되짚는다. 모르면 0. */
    damageScale(duel, fighters) {
        const leftMax = Number(duel.leftMax), rightMax = Number(duel.rightMax);
        if (!(leftMax > 0 && rightMax > 0)) return 0;
        return (0, this.deps.clampNumber)(Math.sqrt((rightMax / fighters.left.dps) * (leftMax / fighters.right.dps)) / 10, 0.000001, 1000);
    }

    /** 결과가 갈린 때: 마지막 일격(이긴 쪽이 있을 때) 또는 싸움이 끝난 때. */
    endOf(duel, strikes) {
        const last = strikes.length ? strikes[strikes.length - 1].at : 0;
        return duel.winner === 'left' || duel.winner === 'right' ? last : Math.max(last, Number(duel.durationMs) || 0);
    }

    /** c(ms)에 휘두르는 중인 마지막 일격(보이기 시작한 뒤). */
    swingAt(scene, side, c) {
        let found = null;
        for (const strike of scene.strikes) if (strike.side === side && strike.shown <= c && c < strike.end) found = strike;
        return found;
    }

    /** c(ms) 앞뒤로 자리가 적힌 때(a, b). 마지막 때 뒤면 b는 a다. */
    bracketOf(scene, c) {
        const track = scene.track;
        let low = 0, high = track.length - 1;
        while (low < high) {
            const mid = (low + high + 1) >> 1;
            if (track[mid].t <= c) low = mid; else high = mid - 1;
        }
        return { a: track[low], b: track[Math.min(track.length - 1, low + 1)] };
    }

    /** c(ms)의 두 자리(방 왼쪽 끝에서 칸): 적힌 때 사이를 고르게 잇는다. */
    placeOf(scene, c) {
        if (!scene.track) return { left: SPOT.left, right: SPOT.right };
        const { a, b } = this.bracketOf(scene, c), f = b.t > a.t ? (0, this.deps.clampNumber)((c - a.t) / (b.t - a.t), 0, 1) : 0;
        return { left: a.lx + (b.lx - a.lx) * f, right: a.rx + (b.rx - a.rx) * f };
    }

    /** c에 이동 스킬룬을 쓰는 중이면 그 동작을 시작한 때(그 걸음의 100ms 앞), 아니면 null. */
    dashAt(scene, f, c) {
        let found = null;
        for (const dash of scene.dashes) {
            const start = dash.at - 100;
            if (dash.side === f.side && start <= c && c < start + this.clipLength(f.clips.dash)) found = start;
        }
        return found;
    }

    /** c에 걷는 쪽(-1 방 왼쪽, 1 오른쪽, 0 서 있음): 그 사이에 자리가 바뀌었고 이동 스킬룬이 아니다. */
    walkOf(scene, side, c) {
        if (!scene.track) return 0;
        const { a, b } = this.bracketOf(scene, c), moved = side === 'left' ? b.lx - a.lx : b.rx - a.rx;
        if (b.dash === side || b.dash === 'both' || Math.abs(moved) < 0.001) return 0;
        return Math.sign(moved);
    }

    /** c의 동작과 장, 보는 쪽(west: 방 왼쪽). 걸을 때는 걷는 쪽을 보고(js/canvas-stage-actors.js poseDirection), 그 밖에는 상대를 본다. */
    poseOf(scene, f, c) {
        const facing = f.side === 'right';
        if (scene.loser === f.side && c >= scene.endAt) return { clip: f.clips.death, frame: this.frameAt(f.clips.death, c - scene.endAt, false), west: facing };
        if (scene.winner === f.side && c >= scene.endAt + CHEER_DELAY_MS) return { clip: f.clips.cheer, frame: this.frameAt(f.clips.cheer, c - scene.endAt - CHEER_DELAY_MS, false), west: facing };
        const dash = this.dashAt(scene, f, c);
        if (dash !== null) return { clip: f.clips.dash, frame: this.frameAt(f.clips.dash, c - dash, false), west: facing };
        const swing = this.swingAt(scene, f.side, c);
        if (swing) return { clip: f.clips.strike, frame: this.frameAt(f.clips.strike, c - swing.start, false), west: facing };
        const walk = this.walkOf(scene, f.side, c);
        if (walk) return { clip: f.clips.walk, frame: this.frameAt(f.clips.walk, c * f.walkRate, true), west: walk < 0 };
        return { clip: f.clips.idle, frame: this.frameAt(f.clips.idle, c, true), west: facing };
    }

    /** 맞은 뒤의 테와 밀림(STAGE_CHARACTERS.hit의 단계): 가장 가까운 지난 타격에서 센다. */
    hurtOf(scene, side, c) {
        let age = Infinity;
        for (const strike of scene.strikes) {
            if (strike.side !== side && strike.at <= c && (strike.outcome === 'hit' || strike.outcome === 'deflect')) age = Math.min(age, c - strike.at);
        }
        for (const step of this.deps.STAGE_CHARACTERS.hit.steps) {
            if (age < step.ms) return step;
            age -= step.ms;
        }
        return null;
    }

    /** c(ms)의 남은 생명력(%): 그때까지 서버가 적은 마지막 값. */
    lifeAt(scene, c) {
        let life = { left: 100, right: 100 };
        for (const row of scene.life) { if (row.t > c) break; life = row; }
        return life;
    }
}
