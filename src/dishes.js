/* ============================================================
   EAT AND OUT — procedural dish models (v2)
   Detailed geometry + PBR materials with seamless procedural
   albedo / normal / roughness maps. No external model files.
   ============================================================ */
import * as THREE from 'three';

/* ------------------------------------------------------------
   Tileable value noise + fBm
   ------------------------------------------------------------ */
function hash2(x, y, seed) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263 + (seed | 0) * 1274126177;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295;
}
function vnoiseT(x, y, seed, P) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const w = (a, b) => ((a % b) + b) % b;
  const x0 = w(xi, P), x1 = w(xi + 1, P), y0 = w(yi, P), y1 = w(yi + 1, P);
  const tl = hash2(x0, y0, seed), tr = hash2(x1, y0, seed);
  const bl = hash2(x0, y1, seed), br = hash2(x1, y1, seed);
  return (tl * (1 - u) + tr * u) * (1 - v) + (bl * (1 - u) + br * u) * v;
}
function tfbm(x, y, seed, oct, period) {
  let a = 0.5, f = 1, s = 0, n = 0;
  for (let i = 0; i < oct; i++) {
    s += a * vnoiseT(x * f, y * f, seed + i * 131, Math.max(2, Math.round(period * f)));
    n += a; a *= 0.5; f *= 2;
  }
  return s / n;
}
const clamp01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;

/* ------------------------------------------------------------
   Canvas map factories
   ------------------------------------------------------------ */
function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}
function finishTex(canvas, repeat, srgb) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 4;
  t.needsUpdate = true;
  return t;
}
/** field(x,y) -> number 0..1, seamless over the canvas.
 *  Precomputes the noise once into a typed array and returns a fast lookup. */
function makeField(size,scale,seed,oct) {
  const period = size / scale;
  const a = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) a[y * size + x] = tfbm(x / scale, y / scale, seed, oct, period);
  }
  return (x, y) => a[(((y % size) + size) % size) * size + (((x % size) + size) % size)];
}
function colorTex(size, repeat, field, fn) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size), d = img.data;
  let i = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const col = fn(field(x, y), x, y);
    d[i++] = col[0]; d[i++] = col[1]; d[i++] = col[2]; d[i++] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return finishTex(c, repeat, true);
}
function grayTex(size, repeat, field, fn) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size), d = img.data;
  let i = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = clamp01(fn(field(x, y))) * 255;
    d[i++] = v | 0; d[i++] = v | 0; d[i++] = v | 0; d[i++] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return finishTex(c, repeat, false);
}
/** normal map derived from a scalar height field */
function normalTex(size, repeat, hfn, strength) {
  const c = makeCanvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size), d = img.data;
  let i = 0;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const hl = hfn(x - 1, y), hr = hfn(x + 1, y), hu = hfn(x, y - 1), hd = hfn(x, y + 1);
    let nx = (hl - hr) * strength, ny = (hu - hd) * strength, nz = 1;
    const len = Math.hypot(nx, ny, nz);
    nx /= len; ny /= len; nz /= len;
    d[i++] = ((nx * 0.5 + 0.5) * 255) | 0;
    d[i++] = ((ny * 0.5 + 0.5) * 255) | 0;
    d[i++] = ((nz * 0.5 + 0.5) * 255) | 0;
    d[i++] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return finishTex(c, repeat, false);
}

/* ------------------------------------------------------------
   Texture sets
   ------------------------------------------------------------ */
const S = 512;

function crustSet() {
  const f = makeField(S,26,3,3);
  const fb = makeField(S,7,11,3);
  const map = colorTex(S, 2, f, (n, x, y) => {
    let r = 216, g = 168, b = 106;
    const v = 0.66 + 0.72 * n; r *= v; g *= v; b *= v;
    const bl = clamp01((fb(x, y) - 0.55) / 0.45);
    r *= 1 - 0.55 * bl; g *= 1 - 0.66 * bl; b *= 1 - 0.74 * bl;
    return [r | 0, g | 0, b | 0];
  });
  const hf = (x, y) => fb(x, y) * 0.6 + f(x, y) * 0.4;
  return {
    map,
    normalMap: normalTex(S, 2, hf, 6),
    roughnessMap: grayTex(S, 2, f, (n) => 0.95 - 0.18 * n),
  };
}
function cheeseSet() {
  const f = makeField(S,30,5,3);
  const fm = makeField(S,11,9,3);
  const holes = makeField(S,5,31,3);
  const map = colorTex(S, 2, f, (n, x, y) => {
    let r = 244, g = 230, b = 178;
    const v = 0.86 + 0.3 * n; r *= v; g *= v; b *= v;
    const brown = clamp01((fm(x, y) - 0.44) / 0.56);
    r *= 1 - 0.18 * brown; g *= 1 - 0.45 * brown; b *= 1 - 0.7 * brown;
    return [r | 0, g | 0, b | 0];
  });
  const hf = (x, y) => fm(x, y) * 0.55 + holes(x, y) * 0.45;
  return {
    map,
    normalMap: normalTex(S, 2, hf, 7),
    roughnessMap: grayTex(S, 2, f, (n, x, y) => 0.62 - 0.22 * clamp01((fm(x, y) - 0.55) / 0.45) + 0.1 * n),
  };
}
function sauceSet() {
  const f = makeField(S,20,13,3);
  return {
    map: colorTex(S, 2, f, (n) => { const v = 0.82 + 0.36 * n; return [(156 * v) | 0, (48 * v) | 0, (34 * v) | 0]; }),
    normalMap: normalTex(S, 2, (x, y) => f(x, y), 3),
    roughnessMap: grayTex(S, 2, f, (n) => 0.5 - 0.15 * n),
  };
}
function pepSet() {
  const S2 = 128;
  const f = makeField(S2,14,17,3);
  const fat = makeField(S2,5,41,3);
  return {
    map: colorTex(S2, 1, f, (n, x, y) => {
      let r = 158, g = 52, b = 40;
      const v = 0.85 + 0.3 * n; r *= v; g *= v; b *= v;
      if (fat(x, y) > 0.72) { r = 244; g = 206; b = 194; }
      return [r | 0, g | 0, b | 0];
    }),
    normalMap: normalTex(S2, 1, (x, y) => fat(x, y), 4),
    roughnessMap: grayTex(S2, 1, f, (n) => 0.7 - 0.25 * n),
  };
}
function ceramicSet() {
  const f = makeField(128,40,19,3);
  const g = makeField(128,8,23,3);
  return {
    map: colorTex(128, 2, f, (n) => { const v = 0.95 + 0.07 * n; return [(238 * v) | 0, (233 * v) | 0, (224 * v) | 0]; }),
    normalMap: normalTex(128, 2, (x, y) => g(x, y), 1.2),
    roughnessMap: grayTex(128, 2, f, (n) => 0.3 - 0.08 * n),
  };
}
function noodleSet() {
  const f = makeField(S,18,21,3);
  const streak = makeField(S,4,27,3);
  return {
    map: colorTex(S, 3, f, (n, x, y) => {
      let r = 226, g = 198, b = 140;
      const v = 0.86 + 0.28 * n; r *= v; g *= v; b *= v;
      const s = clamp01((streak(x, y) - 0.55) / 0.45);
      r *= 1 - 0.18 * s; g *= 1 - 0.22 * s; b *= 1 - 0.26 * s;
      return [r | 0, g | 0, b | 0];
    }),
    normalMap: normalTex(S, 3, (x, y) => f(x, y) * 0.6 + streak(x, y) * 0.4, 5),
    roughnessMap: grayTex(S, 3, f, (n) => 0.5 - 0.14 * n),
  };
}
function riceSet() {
  const f = makeField(S,20,33,3);
  const g = makeField(S,6,35,3);
  return {
    map: colorTex(S, 3, f, (n) => { const v = 0.95 + 0.1 * n; return [(247 * v) | 0, (245 * v) | 0, (238 * v) | 0]; }),
    normalMap: normalTex(S, 3, (x, y) => g(x, y), 4),
    roughnessMap: grayTex(S, 3, f, (n) => 0.78 - 0.12 * n),
  };
}

const std = (set, extra = {}) => new THREE.MeshStandardMaterial({
  map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap, ...extra,
});

/* ------------------------------------------------------------
   Materials
   ------------------------------------------------------------ */
const CERAMIC = ceramicSet();

const MAT = {
  dough: std(crustSet(), { normalScale: new THREE.Vector2(1.7, 1.7), roughness: 0.95, metalness: 0.0 }),
  sauce: new THREE.MeshPhysicalMaterial({ ...sauceSet(), normalScale: new THREE.Vector2(1.2, 1.2), roughness: 0.5, metalness: 0.0, clearcoat: 0.45, clearcoatRoughness: 0.25 }),
  cheese: new THREE.MeshPhysicalMaterial({ ...cheeseSet(), normalScale: new THREE.Vector2(1.9, 1.9), roughness: 0.66, metalness: 0.0, clearcoat: 0.3, clearcoatRoughness: 0.4 }),
  pep: new THREE.MeshPhysicalMaterial({ ...pepSet(), normalScale: new THREE.Vector2(1.3, 1.3), roughness: 0.6, metalness: 0.0, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
  ceramic: new THREE.MeshPhysicalMaterial({
    map: CERAMIC.map, normalMap: CERAMIC.normalMap, roughnessMap: CERAMIC.roughnessMap,
    roughness: 0.3, metalness: 0.0, clearcoat: 0.45, clearcoatRoughness: 0.3,
  }),
  slate: new THREE.MeshStandardMaterial({ color: 0x23252a, roughness: 0.55, metalness: 0.05 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.18, metalness: 1.0 }),
  noodle: new THREE.MeshPhysicalMaterial({ ...noodleSet(), normalScale: new THREE.Vector2(1.5, 1.5), roughness: 0.5, metalness: 0.0, clearcoat: 0.28, clearcoatRoughness: 0.3 }),
  rice: std(riceSet(), { normalScale: new THREE.Vector2(1.3, 1.3), roughness: 0.8, metalness: 0.0 }),
  eggWhite: new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.42 }),
  yolk: new THREE.MeshStandardMaterial({ color: 0xe6a03a, roughness: 0.35 }),
  green: new THREE.MeshStandardMaterial({ color: 0x4f8f45, roughness: 0.6 }),
  greenDark: new THREE.MeshStandardMaterial({ color: 0x35682f, roughness: 0.6 }),
  red: new THREE.MeshStandardMaterial({ color: 0xb8352b, roughness: 0.58 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xd5762a, roughness: 0.58 }),
  glaze: new THREE.MeshPhysicalMaterial({ color: 0x3a1d10, roughness: 0.14, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.08 }),
  sesame: new THREE.MeshStandardMaterial({ color: 0xefe4c8, roughness: 0.5 }),
};

/* ------------------------------------------------------------
   Geometry helpers
   ------------------------------------------------------------ */
function leafGeo(len = 0.15, wid = 0.07) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(wid, len * 0.45, 0, len);
  s.quadraticCurveTo(-wid, len * 0.45, 0, 0);
  return new THREE.ExtrudeGeometry(s, { depth: 0.004, bevelEnabled: false, curveSegments: 10 });
}
const LEAF = leafGeo();

function bowlProfile(rimR, depth, wall = 0.022) {
  const p = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    p.push(new THREE.Vector2(Math.max(rimR * Math.sin(t * Math.PI * 0.5), 0.001), depth * (1 - Math.cos(t * Math.PI * 0.5))));
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    p.push(new THREE.Vector2(
      Math.max(rimR * Math.sin(t * Math.PI * 0.5) - wall, 0.001),
      Math.max(depth * (1 - Math.cos(t * Math.PI * 0.5)) - wall * 0.7, 0.005)));
  }
  return p;
}

/** scatter instances sitting ON a surface: surfaceY(distance) -> y */
function scatter(mat, count, radius, surfaceY, sx, sy, sz, sink = 0.4) {
  const inst = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 5), mat, count);
  const d = new THREE.Object3D();
  const col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * radius;
    d.position.set(Math.cos(a) * r, surfaceY(r) - sy * sink, Math.sin(a) * r);
    d.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    d.scale.set(sx * (0.8 + Math.random() * 0.5), sy * (0.7 + Math.random() * 0.5), sz * (0.8 + Math.random() * 0.5));
    d.updateMatrix();
    inst.setMatrixAt(i, d.matrix);
    const v = 0.9 + Math.random() * 0.18;
    col.setRGB(v, v, v * 0.98);
    inst.setColorAt(i, col);
  }
  inst.instanceMatrix.needsUpdate = true;
  if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
  return inst;
}

/** irregular organic blob (rounded, noise-deformed) */
function blob(sx, sy, sz, seed) {
  const g = new THREE.SphereGeometry(1, 16, 12);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = tfbm(x * 2 + z * 2, y * 2, seed, 3, 8) - 0.5;
    p.setXYZ(i, x * (1 + n * 0.35) * sx, y * (1 + n * 0.35) * sy, z * (1 + n * 0.35) * sz);
  }
  g.computeVertexNormals();
  return g;
}

/* ============================================================
   PIZZA
   ============================================================ */
export function buildPizza() {
  const g = new THREE.Group();

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.06, 1.0, 0.05, 96), MAT.slate);
  plate.position.y = -0.055;
  g.add(plate);

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.86, 0.07, 128, 3, false), MAT.dough);
  {
    const p = base.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      p.setY(i, y + (tfbm(x * 5, z * 5, 88, 3, 14) - 0.5) * 0.03);
    }
    base.geometry.computeVertexNormals();
  }
  base.position.y = 0.02;
  g.add(base);

  const rimGeo = new THREE.TorusGeometry(0.87, 0.075, 24, 160);
  {
    const p = rimGeo.attributes.position, Rr = 0.87;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const a = Math.atan2(y, x);
      const cx = Math.cos(a) * Rr, cy = Math.sin(a) * Rr;
      const dx = x - cx, dy = y - cy;
      const f = 1 + (tfbm(a * 3.2, 0, 99, 3, 8) - 0.5) * 0.28;
      p.setXYZ(i, cx + dx * f, cy + dy * f, z * f);
    }
    rimGeo.computeVertexNormals();
  }
  const rim = new THREE.Mesh(rimGeo, MAT.dough);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.055;
  g.add(rim);

  const sauce = new THREE.Mesh(new THREE.CylinderGeometry(0.825, 0.825, 0.016, 96), MAT.sauce);
  sauce.position.y = 0.05;
  g.add(sauce);

  const cheese = new THREE.Mesh(new THREE.CylinderGeometry(0.835, 0.835, 0.03, 96), MAT.cheese);
  cheese.position.y = 0.062;
  g.add(cheese);

  // molten cheese blobs (seated, varied)
  for (let i = 0; i < 34; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.72;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.028 + Math.random() * 0.04, 12, 9), MAT.cheese);
    b.position.set(Math.cos(a) * r, 0.072, Math.sin(a) * r);
    b.scale.set(1, 0.5 + Math.random() * 0.3, 1);
    g.add(b);
  }

  // pepperoni — cupped, irregular rim, grease sheen
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + Math.random() * 0.5;
    const r = 0.17 + Math.random() * 0.5;
    const px = Math.cos(a) * r, pz = Math.sin(a) * r;
    const slice = new THREE.Mesh(new THREE.SphereGeometry(0.108, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), MAT.pep);
    slice.scale.set(1, 0.22, 1);
    slice.position.set(px, 0.075, pz);
    slice.rotation.z = (Math.random() - 0.5) * 0.1;
    slice.rotation.x = (Math.random() - 0.5) * 0.1;
    g.add(slice);
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.104, 0.011, 8, 30), MAT.pep);
    lip.rotation.x = Math.PI / 2;
    lip.position.set(px, 0.083, pz);
    g.add(lip);
  }

  // basil
  for (let i = 0; i < 6; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 0.5;
    const lf = new THREE.Mesh(LEAF, MAT.greenDark);
    lf.position.set(Math.cos(a) * r, 0.082, Math.sin(a) * r);
    lf.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.35, Math.random() * Math.PI * 2, 0);
    lf.scale.setScalar(0.7 + Math.random() * 0.3);
    g.add(lf);
  }

  // crumbs on the plate
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.92 + Math.random() * 0.1;
    const cr = new THREE.Mesh(new THREE.SphereGeometry(0.008 + Math.random() * 0.01, 6, 5), MAT.dough);
    cr.position.set(Math.cos(a) * r, -0.028, Math.sin(a) * r);
    g.add(cr);
  }

  g.rotation.y = Math.random() * Math.PI;
  return g;
}

/* ============================================================
   RICE BOWL
   ============================================================ */
export function buildRiceBowl() {
  const g = new THREE.Group();
  const rimR = 0.62, depth = 0.46;
  const MR = 0.5, MSY = 0.42, MCY = 0.16;
  const moundY = (d) => MCY + MSY * Math.sqrt(Math.max(0, MR * MR - d * d));

  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProfile(rimR, depth), 96), MAT.ceramic);
  g.add(bowl);

  const goldRim = new THREE.Mesh(new THREE.TorusGeometry(rimR - 0.012, 0.009, 12, 96), MAT.gold);
  goldRim.rotation.x = Math.PI / 2;
  goldRim.position.y = depth;
  g.add(goldRim);

  const moundGeo = new THREE.SphereGeometry(MR, 96, 48, 0, Math.PI * 2, 0, Math.PI * 0.5);
  {
    const p = moundGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = tfbm(x * 7, z * 7, 77, 3, 16) - 0.5;
      p.setXYZ(i, x * (1 + n * 0.09), y * (1 + n * 0.16), z * (1 + n * 0.09));
    }
    moundGeo.computeVertexNormals();
  }
  const mound = new THREE.Mesh(moundGeo, MAT.rice);
  mound.scale.set(1, MSY, 1);
  mound.position.y = MCY;
  g.add(mound);

  g.add(scatter(MAT.rice, 700, 0.47, moundY, 0.017, 0.010, 0.013));

  // soft egg
  const eggW = new THREE.Mesh(new THREE.SphereGeometry(0.115, 32, 24), MAT.eggWhite);
  eggW.scale.set(1, 0.9, 1);
  eggW.position.set(0.15, 0.4, 0.04);
  g.add(eggW);
  const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.06, 28, 20), MAT.yolk);
  yolk.scale.y = 0.7;
  yolk.position.set(0.15, 0.44, 0.04);
  g.add(yolk);

  // grilled vegetables
  const vcols = [0x4f8f45, 0xb8352b, 0xd5762a, 0x35682f];
  for (let i = 0; i < 7; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.1 + Math.random() * 0.3;
    const b = new THREE.Mesh(blob(0.055, 0.024, 0.034, 100 + i), new THREE.MeshStandardMaterial({ color: vcols[i % 4], roughness: 0.62 }));
    b.position.set(Math.cos(a) * r, moundY(r) - 0.012, Math.sin(a) * r);
    b.rotation.set(Math.random() * 0.6, Math.random() * Math.PI, Math.random() * 0.5);
    g.add(b);
  }

  // greens
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, r = 0.14 + Math.random() * 0.3;
    const lf = new THREE.Mesh(LEAF, MAT.green);
    lf.position.set(Math.cos(a) * r, moundY(r) + 0.005, Math.sin(a) * r);
    lf.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.4, Math.random() * Math.PI * 2, 0);
    lf.scale.setScalar(0.6 + Math.random() * 0.4);
    g.add(lf);
  }

  // glaze drizzle
  for (let i = 0; i < 5; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 0.3;
    const dr = new THREE.Mesh(new THREE.SphereGeometry(0.03 + Math.random() * 0.028, 12, 10), MAT.glaze);
    dr.position.set(Math.cos(a) * r, moundY(r) + 0.004, Math.sin(a) * r);
    dr.scale.y = 0.35;
    g.add(dr);
  }

  g.add(scatter(MAT.sesame, 70, 0.4, moundY, 0.009, 0.007, 0.009));

  g.rotation.y = Math.random() * Math.PI;
  return g;
}

/* ============================================================
   CHOWMEIN
   ============================================================ */
export function buildChowmein() {
  const g = new THREE.Group();
  const rimR = 0.66, depth = 0.44;
  const MR = 0.52, MSY = 0.4, MCY = 0.18;
  const moundY = (d) => MCY + MSY * Math.sqrt(Math.max(0, MR * MR - d * d));

  const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlProfile(rimR, depth), 96), MAT.ceramic);
  g.add(bowl);
  const goldRim = new THREE.Mesh(new THREE.TorusGeometry(rimR - 0.012, 0.009, 12, 96), MAT.gold);
  goldRim.rotation.x = Math.PI / 2;
  goldRim.position.y = depth;
  g.add(goldRim);

  const massGeo = new THREE.SphereGeometry(MR, 80, 40, 0, Math.PI * 2, 0, Math.PI * 0.5);
  {
    const p = massGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const n = tfbm(x * 6, z * 6, 55, 3, 14) - 0.5;
      p.setXYZ(i, x * (1 + n * 0.12), y * (1 + n * 0.2), z * (1 + n * 0.12));
    }
    massGeo.computeVertexNormals();
  }
  const mass = new THREE.Mesh(massGeo, MAT.noodle);
  mass.scale.set(1, MSY, 1);
  mass.position.y = MCY;
  g.add(mass);

  // noodle strands draped over the heap
  for (let i = 0; i < 58; i++) {
    const pts = [];
    let a = Math.random() * Math.PI * 2;
    let r = Math.sqrt(Math.random()) * 0.4;
    let x = Math.cos(a) * r, z = Math.sin(a) * r;
    for (let j = 0; j < 7; j++) {
      const d = Math.hypot(x, z);
      pts.push(new THREE.Vector3(x, moundY(Math.min(d, MR)) + 0.03 - j * 0.012 + (Math.random() - 0.5) * 0.025, z));
      x += (Math.random() - 0.5) * 0.2;
      z += (Math.random() - 0.5) * 0.2;
      const rr = Math.hypot(x, z);
      if (rr > 0.44) { x *= 0.44 / rr; z *= 0.44 / rr; }
    }
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 18, 0.019, 7, false), MAT.noodle);
    g.add(tube);
  }

  // julienned vegetables
  const vcols = [0x4f8f45, 0xb8352b, 0xd5762a, 0x35682f];
  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.4;
    const b = new THREE.Mesh(blob(0.013, 0.008, 0.07, 200 + i), new THREE.MeshStandardMaterial({ color: vcols[i % 4], roughness: 0.6 }));
    b.position.set(Math.cos(a) * r, moundY(r) + 0.008, Math.sin(a) * r);
    b.rotation.set(Math.random() * 0.9, Math.random() * Math.PI * 2, Math.random() * 0.9);
    g.add(b);
  }

  // spring onion rings
  for (let i = 0; i < 16; i++) {
    const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.42;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.008, 8, 18), MAT.green);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(Math.cos(a) * r, moundY(r) + 0.03, Math.sin(a) * r);
    g.add(ring);
  }

  g.add(scatter(MAT.sesame, 60, 0.4, (d) => moundY(d) + 0.02, 0.009, 0.007, 0.009));

  g.rotation.y = Math.random() * Math.PI;
  return g;
}

export const BUILDERS = {
  pizza: buildPizza,
  rice: buildRiceBowl,
  chowmein: buildChowmein,
};
