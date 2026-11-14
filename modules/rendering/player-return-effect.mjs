import { clampNumber } from '../common/numbers.mjs';

/** Arrival/departure paint split across the existing back/front actor passes. */
export class PlayerReturnEffect {
    constructor(deps) { this.deps = deps; }

    arrival(ctx, position, warp, frontLayer) {
        if (!warp || this.deps.reducedEffects()) return;
        let ringRadius = 22 * warp.ringScale;
        let beamAlpha = Math.sin(warp.progress * Math.PI) * 0.42;
        ctx.save();
        if (!frontLayer) {
            let beam = ctx.createLinearGradient(position.x, position.y - 68, position.x, position.y + 8);
            beam.addColorStop(0, 'rgba(137, 218, 255, 0)');
            beam.addColorStop(0.58, `rgba(137, 218, 255, ${beamAlpha})`);
            beam.addColorStop(1, 'rgba(184, 156, 255, 0)');
            ctx.fillStyle = beam;
            ctx.fillRect(position.x - 7, position.y - 68, 14, 76);
            ctx.globalAlpha = warp.fade * 0.42;
            ctx.fillStyle = '#79cfff';
            ctx.beginPath();
            ctx.ellipse(position.x, position.y + 7, ringRadius, ringRadius * 0.32, 0, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = warp.fade * (frontLayer ? 0.9 : 0.68);
        ctx.strokeStyle = frontLayer ? '#e8e2ff' : '#86d9ff';
        ctx.lineWidth = frontLayer ? 2.1 : 2.8;
        ctx.beginPath();
        const arcStart = frontLayer ? 0 : Math.PI;
        ctx.ellipse(position.x, position.y + 7, ringRadius, ringRadius * 0.32, 0, arcStart, arcStart + Math.PI);
        ctx.stroke();
        if (frontLayer) {
            for (let spark = 0; spark < 4; spark++) {
                let angle = spark * Math.PI / 2 + warp.progress * 0.55;
                let reach = ringRadius * (0.72 + spark * 0.055);
                ctx.beginPath();
                ctx.moveTo(position.x + Math.cos(angle) * reach, position.y + 7 + Math.sin(angle) * reach * 0.32);
                ctx.lineTo(position.x + Math.cos(angle) * (reach + 7), position.y + 7 + Math.sin(angle) * (reach + 7) * 0.32);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    departure(ctx, position, departure, frontLayer) {
        if (!departure || this.deps.reducedEffects()) return;
        ctx.save();
        if (!frontLayer) {
            let beam = ctx.createLinearGradient(position.x, position.y - 76, position.x, position.y + 8);
            beam.addColorStop(0, 'rgba(164, 229, 255, 0)');
            beam.addColorStop(0.72, `rgba(164, 229, 255, ${departure.fade * 0.28})`);
            beam.addColorStop(1, 'rgba(210, 177, 255, 0)');
            ctx.fillStyle = beam;
            ctx.fillRect(position.x - 7, position.y - 76, 14, 84);
            ctx.globalAlpha = departure.fade * 0.35;
            ctx.strokeStyle = '#91ddff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(position.x, position.y + 7, 22 - departure.progress * 6, 6, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.lineCap = 'round';
            ctx.lineWidth = 1.7;
            for (let spark = 0; spark < 7; spark++) {
                let phase = (departure.progress * 1.45 + spark * 0.17) % 1;
                let x = position.x + (spark - 3) * 5 + Math.sin((phase + spark) * 3.2) * 2;
                let y = position.y + 6 - phase * 76;
                ctx.globalAlpha = Math.sin(phase * Math.PI) * departure.fade * 0.82;
                ctx.strokeStyle = spark % 2 ? '#d8c5ff' : '#b3edff';
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x, y - 7 - spark % 3);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    shroud(ctx, position, strength, frontLayer) {
        if (this.deps.reducedEffects()) return;
        let alpha = clampNumber(Number(strength) || 0, 0, 1);
        if (alpha <= 0.01) return;
        ctx.save();
        if (!frontLayer) {
            let halo = ctx.createRadialGradient(position.x, position.y - 25, 2, position.x, position.y - 22, 29);
            halo.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.34})`);
            halo.addColorStop(0.58, `rgba(232, 247, 255, ${alpha * 0.18})`);
            halo.addColorStop(1, 'rgba(216, 238, 255, 0)');
            ctx.fillStyle = halo;
            ctx.beginPath();
            ctx.ellipse(position.x, position.y - 22, 27, 43, 0, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.globalAlpha = alpha * 0.2;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(position.x, position.y - 22, 15, 36, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = alpha * 0.62;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.4;
            ctx.lineCap = 'round';
            for (let streak = -2; streak <= 2; streak++) {
                let x = position.x + streak * 6;
                ctx.beginPath();
                ctx.moveTo(x, position.y + 3 - Math.abs(streak) * 4);
                ctx.lineTo(x + streak, position.y - 37 - Math.abs(streak) * 3);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
}
