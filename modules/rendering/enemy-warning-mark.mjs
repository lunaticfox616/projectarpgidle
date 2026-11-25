import { vfxElement } from './skill-effect-look.mjs';

// Five distinct 5×5 silhouettes. Both strokes are neutral so the cue also reads in grayscale.
const MARKS = {
    phys: ['  #  ', ' ### ', '#####', ' ### ', '  #  '],
    fire: ['  #  ', '  ## ', ' # # ', '##  #', ' ### '],
    cold: ['# # #', ' ### ', '#####', ' ### ', '# # #'],
    light:['  ## ', ' ##  ', '#### ', '  #  ', ' #   '],
    chaos:['  #  ', ' # # ', '# # #', ' # # ', '  #  ']
};

export function drawEnemyWarningMark(ctx, element, x, y, size) {
    const rows = MARKS[vfxElement(element)] || MARKS.phys;
    ctx.save();
    ctx.globalAlpha = 0.94;
    ctx.fillStyle = '#282033';
    ctx.beginPath();
    rows.forEach((row, dy) => {
        for (let dx = 0; dx < row.length; dx++) {
            if (row[dx] === '#') ctx.rect(Math.round(x + dx * size - 1), Math.round(y + dy * size - 1), size + 2, size + 2);
        }
    });
    ctx.fill();
    ctx.fillStyle = '#ffe8c9';
    rows.forEach((row, dy) => {
        for (let dx = 0; dx < row.length; dx++) {
            if (row[dx] === '#') ctx.fillRect(Math.round(x + dx * size), Math.round(y + dy * size), size, size);
        }
    });
    ctx.restore();
}
