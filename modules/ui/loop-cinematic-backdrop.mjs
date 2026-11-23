// The loop cinematic's backdrop: picture A (the abyss) turning into picture B (the circuit) in a dithered wave from the ring, the
// ring's inside turning backward, a shapeless top-down dimming of the sky's stars and the ring lighting up. Every sample sits on a
// texel centre (NEAREST), so dots never smear. Without WebGL, or after the context is lost, a plain crossfade A -> B stands in.
import { SHOTS, clamp01 } from './loop-cinematic-timeline.mjs';

const VERT_SRC = 'attribute vec2 aPos; varying vec2 vUv; void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';
const FRAG_SRC = [
    'precision highp float;',
    'varying vec2 vUv;',
    'uniform sampler2D uTexA; uniform sampler2D uTexB;',
    'uniform float uTime; uniform float uWave; uniform float uAng;',
    'uniform float uDim; uniform float uLean; uniform float uLeanFront; uniform float uRingLight; uniform vec3 uRing;',
    'const vec2 TEX = vec2(1376.0, 768.0);',
    'float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }',
    'float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }',
    'float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a); }',
    'vec2 texUv(vec2 p) { return (floor(p) + 0.5) / TEX; }',
    'vec2 spin(vec2 p, float ang) { vec2 d = p - uRing.xy; float c = cos(ang), s = sin(ang); return uRing.xy + vec2(d.x * c - d.y * s, d.x * s + d.y * c); }',
    'void main() {',
    '  vec2 p = floor(vec2(vUv.x, 1.0 - vUv.y) * TEX);',
    '  float r = length(p - uRing.xy);',
    '  float dist = r / 768.0;',
    '  float inside = 1.0 - step(uRing.z, r);',
    '  vec2 pb = mix(p, spin(p, uAng), inside);',
    '  vec3 a = texture2D(uTexA, texUv(p)).rgb;',
    '  vec3 b = texture2D(uTexB, texUv(pb)).rgb;',
    '  vec3 bStill = texture2D(uTexB, texUv(p)).rgb;',
    '  vec3 diff = max(bStill - a, vec3(0.0));',
    '  float vein = smoothstep(0.10, 0.42, length(diff));',
    '  float bay = bayer4(floor(p / 2.0));',
    '  float m = clamp((uWave - dist) / 0.10 + 0.5, 0.0, 1.0);',
    '  float morph = step(bay + 0.001, m);',
    '  vec3 col = mix(a, b, morph);',
    '  float pulse = step(0.62, fract(dist * 7.0 - uTime * 0.8));',
    '  col += diff * vein * morph * (0.10 + 0.22 * pulse);',
    '  float rim = 1.0 - clamp(abs(dist - uWave) / 0.035, 0.0, 1.0);',
    '  rim *= step(0.0, uWave) * (1.0 - step(1.75, uWave));',
    '  col += vec3(0.55, 0.88, 1.0) * step(bay + 0.001, rim) * 0.35;',
    '  float skyRaw = clamp((a.b - a.r) * 7.0, 0.0, 1.0);',
    '  float band = step(uRing.z, r) * (1.0 - step(uRing.z + 58.0, r)) * (1.0 - skyRaw);',
    '  col += (vec3(0.30, 0.62, 0.80) * 0.22 + col * 0.12) * band * uRingLight;',
    '  col += vec3(0.25, 0.50, 0.70) * inside * uRingLight * 0.12;',
    '  float sky = clamp((a.b - a.r) * 10.0, 0.0, 1.0) * (1.0 - smoothstep(0.22, 0.42, dist));',
    '  float yRel = (p.y - (uRing.y - 200.0)) / 420.0;',
    '  float front = 1.0 - smoothstep(uLeanFront - 0.22, uLeanFront + 0.22, yRel);',
    '  float shade = uLean * front * sky;',
    '  vec2 cell = floor(p / 3.0);',
    '  float tw = step(0.97, hash(cell)) * step(0.55, fract(uTime * 0.8 + hash(cell + 7.0)));',
    '  col += vec3(0.86, 0.82, 1.0) * tw * skyRaw * 0.30 * (1.0 - morph) * (1.0 - shade);',
    '  col *= 1.0 - shade * 0.93;',
    '  col *= 1.0 - uDim;',
    '  gl_FragColor = vec4(col, 1.0);',
    '}'
].join('\n');
const UNIFORMS = ['uTexA', 'uTexB', 'uTime', 'uWave', 'uAng', 'uDim', 'uLean', 'uLeanFront', 'uRingLight', 'uRing'];

function compileShader(gl, type, src) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) throw new Error('loop cinematic shader: ' + gl.getShaderInfoLog(shader));
    return shader;
}

function makeTexture(gl, unit, img) {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
}

function linkProgram(gl) {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl, gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(program, compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) throw new Error('loop cinematic shader link: ' + gl.getProgramInfoLog(program));
    gl.useProgram(program);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return Object.fromEntries(UNIFORMS.map(name => [name, gl.getUniformLocation(program, name)]));
}

export class LoopCinematicBackdrop {
    constructor(deps, assets) {
        this.deps = deps;
        this.assets = assets;
        this.canvas = null;
        this.gl = null;
        this.uniforms = null;
        this.lost = false;
        this.failed = false;
        this.onLost = event => { event.preventDefault(); this.lost = true; this.gl = null; };
    }

    /** True when WebGL can draw the shader (both pictures have arrived and the context lives). */
    glReady() {
        if (this.gl) return !this.gl.isContextLost();
        if (this.lost || this.failed) return false;
        const a = this.assets.ready('A'), b = this.assets.ready('B');
        if (!a || !b) return false;
        try { return this.start(a, b); }
        catch (error) {
            this.failed = true;
            this.deps.console.warn('[loop-cinematic] WebGL backdrop off, plain crossfade instead', error);
            return false;
        }
    }

    start(a, b) {
        this.canvas = this.deps.document.createElement('canvas');
        this.canvas.width = SHOTS.world.w;
        this.canvas.height = SHOTS.world.h;
        this.canvas.addEventListener('webglcontextlost', this.onLost);
        const gl = this.canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, preserveDrawingBuffer: true });
        if (!gl) { this.failed = true; return false; }
        this.uniforms = linkProgram(gl);
        makeTexture(gl, 0, a);
        makeTexture(gl, 1, b);
        gl.uniform1i(this.uniforms.uTexA, 0);
        gl.uniform1i(this.uniforms.uTexB, 1);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        this.gl = gl;
        return true;
    }

    drawGl(ctx, p) {
        const gl = this.gl, U = this.uniforms, ring = SHOTS.ring;
        gl.uniform1f(U.uTime, p.time); gl.uniform1f(U.uWave, p.wave); gl.uniform1f(U.uAng, p.ang);
        gl.uniform1f(U.uDim, p.dim); gl.uniform1f(U.uLean, p.lean); gl.uniform1f(U.uLeanFront, p.front);
        gl.uniform1f(U.uRingLight, p.ringLight); gl.uniform3f(U.uRing, ring.x, ring.y, ring.r);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        ctx.drawImage(this.canvas, 0, 0);
    }

    drawPlain(ctx, p) {
        const a = this.assets.ready('A'), b = this.assets.ready('B'), w = SHOTS.world.w, h = SHOTS.world.h;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        if (a) ctx.drawImage(a, 0, 0);
        if (b && p.wave > 0) {
            ctx.globalAlpha = a ? clamp01(p.wave / 1.6) : 1;
            ctx.drawImage(b, 0, 0);
            ctx.globalAlpha = 1;
        }
        if (p.dim > 0.005) { ctx.fillStyle = `rgba(0,0,0,${p.dim.toFixed(3)})`; ctx.fillRect(0, 0, w, h); }
    }

    /** p: time (s), wave (-0.2 none .. 1.9 all B), ang (ring turn), dim, lean, front, ringLight. */
    draw(ctx, p) {
        if (this.glReady()) this.drawGl(ctx, p);
        else this.drawPlain(ctx, p);
    }

    dispose() {
        this.canvas?.removeEventListener('webglcontextlost', this.onLost);
        this.gl?.getExtension('WEBGL_lose_context')?.loseContext();
        this.gl = null;
        this.canvas = null;
    }
}
