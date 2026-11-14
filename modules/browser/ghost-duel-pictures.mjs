import { RIMS_KEPT } from '../data/ghost-duel-stage.mjs';

export class GhostDuelPictures {
    constructor(deps) {
        this.deps = deps;
        this.rims = new Map();
    }

    release(scene) {
        for (const sheet of scene.sheets.values()) {
            try { this.deps.stagePictures.closePicture(sheet); }
            catch (error) { this.deps.console.warn('ghost duel picture release failed:', error); }
        }
        scene.sheets.clear();
        this.rims.clear();
    }

    // ------------------------------------------------------------ pictures
    sheetOf(scene, file) {
        if (!scene.sheets.has(file)) scene.sheets.set(file, this.deps.stagePictures.openPicture(this.deps.STAGE_CHARACTERS.path + file + `?v=${this.deps.STAGE_CHARACTERS.version}`));
        return scene.sheets.get(file);
    }

    sheetsSettled(scene) {
        return [...scene.sheets.values()].every(sheet => sheet.ready || sheet.failed);
    }

    /** 한 장을 한 색으로 칠한 그림(맞았을 때의 테). js/canvas-stage-actors.js silhouette과 같은 규칙. */
    rimOf(sheet, clip, frame, colour) {
        const key = `${sheet.url}|${frame}|${colour}`;
        if (this.rims.has(key)) return this.rims.get(key);
        const canvas = this.deps.document.createElement('canvas');
        canvas.width = clip.w;
        canvas.height = clip.h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sheet.source, frame * clip.w, 0, clip.w, clip.h, 0, 0, clip.w, clip.h);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = colour;
        ctx.fillRect(0, 0, clip.w, clip.h);
        this.rims.set(key, canvas);
        if (this.rims.size > RIMS_KEPT) this.rims.delete(this.rims.keys().next().value);
        return canvas;
    }
}
