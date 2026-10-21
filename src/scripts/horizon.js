// Behind the hero: a sunrise breaking over the glowing edge of a dark planet (React Bits' Horizon Bloom, Dawn). Atmosphere
// and a thin rim of light along the edge, the sun with its glare, a faint airglow band, clouds lit near the sun and
// twinkling stars. One full-screen WebGL shader; it plays the sunrise once, then only twinkles and drifts. It does not
// follow the pointer or react to clicks.

const SETTINGS = {
  warm: '#ff9ffc', // light near the surface
  cool: '#5227ff', // upper atmosphere
  horizon: 0.72, // top of the planet, as a fraction of the frame from the top
  curvature: 1,
  tilt: 0, // degrees
  sunPosition: 0.15, // -1 left to 1 right
  sunrise: 1,
  spread: 0.4, // how far sunlight runs along the edge
  atmosphere: 1,
  thickness: 1,
  rim: 1,
  flare: 1,
  airglow: 0.5,
  clouds: 0.5,
  stars: 0.5,
  speed: 0.5,
  drift: 0.5,
  bloom: 0.5,
  grain: 0.25,
  dpr: 1.5,
};

const VERTEX = `attribute vec2 a; void main() { gl_Position = vec4(a, 0., 1.); }`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uWarm, uCool;
uniform float uHorizon, uCurv, uTilt, uSunPos, uSunrise, uSpread, uAtm, uThick, uRim, uFlare;
uniform float uAirglow, uClouds, uStars, uSpeed, uDrift, uBloom, uGrain, uIntro;

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0., a = .5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p = p * 2.03 + 17.1; a *= .5; }
  return v;
}

// The two colors are blended in OKLab, so the middle of the ramp stays bright instead of going muddy.
vec3 toLab(vec3 c) {
  vec3 lms = pow(max(vec3(
    dot(c, vec3(.4122214708, .5363325363, .0514459929)),
    dot(c, vec3(.2119034982, .6806995451, .1073969566)),
    dot(c, vec3(.0883024619, .2817188376, .6299787005))), 0.), vec3(1. / 3.));
  return vec3(
    dot(lms, vec3(.2104542553, .7936279990, -.0040720468)),
    dot(lms, vec3(1.9779984951, -2.4285922050, .4505937099)),
    dot(lms, vec3(.0259040371, .7827717662, -.8086757660)));
}
vec3 fromLab(vec3 c) {
  vec3 lms = vec3(
    dot(c, vec3(1., .3963377774, .2158037573)),
    dot(c, vec3(1., -.1055613458, -.0638541728)),
    dot(c, vec3(1., -.0894841775, -1.2914855480)));
  lms = lms * lms * lms;
  return max(vec3(
    dot(lms, vec3(4.0767416621, -3.3077115913, .2309699292)),
    dot(lms, vec3(-1.2684380046, 2.6097574011, -.3413193965)),
    dot(lms, vec3(-.0041960863, -.7034186147, 1.7076147010))), 0.);
}
vec3 ramp(float k) { return fromLab(mix(toLab(uWarm), toLab(uCool), clamp(k, 0., 1.))); }

void main() {
  vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
  float aspect = uRes.x / uRes.y;
  float t = uTime * uSpeed;
  float roll = radians(uTilt);
  p = mat2(cos(roll), sin(roll), -sin(roll), cos(roll)) * p;

  // The planet: a circle whose top sits at the horizon line. d is the height above its surface.
  float R = 1.6 / pow(max(uCurv, .05), 1.4);
  vec2 c = vec2(0., .5 - uHorizon - R);
  vec2 q = p - c;
  float d = length(q) - R;
  float ang = atan(q.x, q.y);

  // The sun on the edge, wandering slowly. arc is the distance from it along the edge.
  float sunX = (uSunPos + uDrift * .12 * sin(uTime * .05)) * aspect * .5;
  float sunA = asin(clamp(sunX / R, -1., 1.));
  float arc = (ang - sunA) * R;
  float rise = smoothstep(0., 1., uIntro);
  float sp = max(uSpread, .02) * (.2 + .8 * rise);
  float lit = exp(-arc * arc / (sp * sp));
  float sun = uSunrise * rise;
  float th = max(uThick, .05);
  float h = max(d, 0.);

  vec3 col = vec3(0.);

  // Atmosphere: warm near the surface, cool higher up, brightest near the sun.
  float atm = exp(-h / (.045 * th)) * (.1 + lit * (.5 + .8 * sun)) * uAtm * smoothstep(-.004, 0., d);
  col += ramp(h / (.14 * th)) * atm * 1.3;

  // The thin rim of light right on the edge.
  float rim = exp(-abs(d) / (.0016 + .002 * th)) * (.12 + lit * (1. + sun)) * uRim;
  col += mix(uWarm, vec3(1.), .55) * rim;

  // A faint second band above the atmosphere, rippling slowly.
  float ag = exp(-pow((d - .1 * th) / (.014 * th), 2.)) * uAirglow * (.2 + .5 * exp(-arc * arc / (sp * sp * 6.)));
  col += uCool * ag * (.75 + .25 * sin(ang * 30. + t * .8)) * .6;

  // The sun: a point of light and a glare along the edge, half behind the planet.
  vec2 S = c + R * vec2(sin(sunA), cos(sunA));
  vec2 ds = p - S;
  float dist = length(ds);
  vec2 tangent = vec2(cos(sunA), -sin(sunA));
  float along = dot(ds, tangent);
  float across = dot(ds, vec2(tangent.y, -tangent.x));
  float flare = .00012 / (dist * dist + .00002) + exp(-abs(across) * 140.) * exp(-abs(along) * 4.) * .7;
  col += mix(uWarm, vec3(1.), .7) * flare * sun * uFlare * (.3 + .7 * smoothstep(-.01, .01, d));

  // Cloud tops just below the edge, lit near the sun.
  float cl = smoothstep(.45, .8, fbm(vec2(arc * 14. + t * .05, d * 55.)));
  col += mix(uWarm, vec3(1.), .3) * cl * exp(d / .025) * step(d, 0.) * exp(-arc * arc / (sp * sp * 1.5)) * uClouds * (.3 + sun) * .8;

  // Stars, only in open sky.
  vec2 g = p * 70.;
  vec2 id = floor(g);
  float pick = hash(id);
  if (pick > .93) {
    vec2 o = vec2(hash(id + 3.1), hash(id + 7.7)) - .5;
    float twinkle = .5 + .5 * sin(t * (2. + 4. * hash(id + 1.3)) + pick * 40.);
    float star = smoothstep(.08, 0., length(fract(g) - .5 - o * .6)) * (.3 + .7 * twinkle) * (pick - .93) / .07;
    col += vec3(.9, .92, 1.) * star * uStars * smoothstep(0., .08, d) * (1. - clamp(atm, 0., 1.));
  }

  // Soft glow around the brightest light, kept out of the planet itself.
  col += ramp(.3) * uBloom * (sun * uFlare * .25 * exp(-dist * 7.) + .2 * lit * exp(-(d > 0. ? d / .09 : -d / .02)) * uAtm);

  col = 1. - exp(-col * 1.1);
  // Film grain over the lit parts only.
  col += (hash(gl_FragCoord.xy + fract(uTime) * 100.) - .5) * uGrain * .2 * min(dot(col, vec3(.6)), 1.);
  col = pow(clamp(col, 0., 1.), vec3(1. / 2.2));
  gl_FragColor = vec4(col, max(col.r, max(col.g, col.b)));
}`;

const linear = (c) => {
  const n = parseInt(c.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.pow(v / 255, 2.2));
};

const UNIFORMS = {
  uHorizon: 'horizon', uCurv: 'curvature', uTilt: 'tilt', uSunPos: 'sunPosition', uSunrise: 'sunrise',
  uSpread: 'spread', uAtm: 'atmosphere', uThick: 'thickness', uRim: 'rim', uFlare: 'flare', uAirglow: 'airglow',
  uClouds: 'clouds', uStars: 'stars', uSpeed: 'speed', uDrift: 'drift', uBloom: 'bloom', uGrain: 'grain',
};

export function startHorizon(canvas) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: false });
  if (!gl) return;

  const shader = (type, source) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, source);
    gl.compileShader(s);
    return s;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const u = (name) => gl.getUniformLocation(program, name);
  gl.uniform3fv(u('uWarm'), linear(SETTINGS.warm));
  gl.uniform3fv(u('uCool'), linear(SETTINGS.cool));
  for (const [name, key] of Object.entries(UNIFORMS)) gl.uniform1f(u(name), SETTINGS[key]);

  // Reduced motion: the risen sun, still.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = performance.now();
  let frame = 0;
  let onScreen = true;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, SETTINGS.dpr);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  function draw(now) {
    const time = reduceMotion ? 20 : (now - start) / 1000;
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    gl.uniform1f(u('uTime'), time);
    gl.uniform1f(u('uIntro'), Math.min(1, time / 3));
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function loop(now) {
    draw(now);
    frame = requestAnimationFrame(loop);
  }
  // Runs only while the hero is on screen and the tab is in front.
  function run() {
    cancelAnimationFrame(frame);
    draw(performance.now());
    if (!reduceMotion && onScreen && !document.hidden) frame = requestAnimationFrame(loop);
  }

  resize();
  new ResizeObserver(() => {
    resize();
    draw(performance.now());
  }).observe(canvas);
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    run();
  }).observe(canvas);
  document.addEventListener('visibilitychange', run);
  run();
}
