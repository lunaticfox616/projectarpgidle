/** Canvas text keeps the active locale's pixel font and a one-dot dark edge. */
export class BattlefieldText {
    constructor(deps) { this.deps = deps; }

    font() { return this.deps.i18n.fontFamily("'Galmuri11', 'Galmuri14'"); }

    fill(ctx, text, x, y, color) {
        ctx.fillStyle = '#000';
        this.deps.drawText(ctx, text, x + 1, y + 1);
        ctx.fillStyle = color;
        this.deps.drawText(ctx, text, x, y);
    }

    tone(ctx, text, centerX, y, baseColor) {
        const parts = this.deps.tones.segments(text), widths = parts.map(part => ctx.measureText(part.text).width);
        let x = Math.round(centerX - widths.reduce((sum, w) => sum + w, 0) / 2);
        const align = ctx.textAlign;
        ctx.textAlign = 'left';
        parts.forEach((part, index) => {
            this.fill(ctx, part.text, x, y, part.color || baseColor);
            x += widths[index];
        });
        ctx.textAlign = align;
    }
}
