// One screen-space caption for both silent victories and the story's spoken or narrated farewell.
export function drawBossVictoryCaption(ctx, view, title, lines, font) {
    const width = Math.min(520, view.width - 20), left = Math.round((view.width - width) / 2);
    const mobileTop = view.width < 350 ? 126 : 99;
    const top = Math.round(Math.min(view.height * .34, view.width < 600 ? mobileTop : 66));
    const height = 31 + lines.length * 19;
    const mid = Math.round(view.width / 2);
    ctx.fillStyle = 'rgba(17,14,12,.96)';
    ctx.fillRect(left, top, width, height);
    ctx.fillStyle = '#9c8053';
    ctx.fillRect(left + 6, top, width - 12, 1);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `15px ${font}`; ctx.fillStyle = '#f2d38c';
    ctx.fillText(title, mid, top + 15, width - 18);
    ctx.fillStyle = '#f2e8d5';
    lines.forEach((line, i) => ctx.fillText(line, mid, top + 35 + 19 * i));
}
