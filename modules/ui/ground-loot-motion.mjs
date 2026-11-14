function fly(flight, marker, point, config) {
    const dx = point.x - parseFloat(marker.style.left), dy = point.y - parseFloat(marker.style.top);
    const frames = [0, .125, .25, .375, .5, .625, .75, .875, 1].map(t => ({ offset: t,
        transform: `translate(${dx * (1 - t)}px,${dy * (1 - t) - 4 * t * (1 - t) * Math.min(65, 35 + Math.hypot(dx, dy) * .2)}px)` }));
    const duration = config.reduced ? 1 : config.drop.flightMs + Math.abs(dx) % config.drop.flightSpreadMs;
    flight.animate(frames, { duration, fill: 'backwards' });
    const art = flight.firstElementChild, rest = config.getComputedStyle(art).transform;
    art.animate([{ transform: rest + ' rotate(-45deg) scale(.75)' }, { transform: rest }], { duration, fill: 'backwards' });
    return duration;
}

function landingPop(art, tier) {
    const shadow = 'drop-shadow(1px 2px 1px #14130f)', flash = tier === 'plain' ? 1 : 2;
    art.animate([
        { translate: '0 0', scale: '1.3 .76', filter: `${shadow} brightness(${flash})` },
        { translate: '0 -7px', scale: '.9 1.12', offset: .38 },
        { translate: '0 0', scale: '1 1', filter: `${shadow} brightness(1)` }
    ], { duration: 280, easing: 'ease-out' });
}

export { fly, landingPop };
