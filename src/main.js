/* ============================================================
   EAT AND OUT — interactive 3D menu
   - procedural photoreal-leaning dish models (see dishes.js)
   - scroll-reactive sparkle engine
   - reveal-on-scroll
   ============================================================ */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { BUILDERS } from './dishes.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = window.matchMedia('(max-width: 640px)').matches;

/* ------------------------------------------------------------
   1. NAV shrink
   ------------------------------------------------------------ */
const nav = document.getElementById('nav');
const onScrollNav = () => nav.classList.toggle('scrolled', window.scrollY > 24);
onScrollNav();
window.addEventListener('scroll', onScrollNav, { passive: true });

/* ------------------------------------------------------------
   2. Reveal on scroll
   ------------------------------------------------------------ */
const revealEls = [...document.querySelectorAll('.reveal')];
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.16, rootMargin: '0px 0px -8% 0px' });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

/* ------------------------------------------------------------
   3. SPARKLE ENGINE  (scroll-reactive, gold + silver)
   ------------------------------------------------------------ */
const sparkleCanvas = document.getElementById('sparkles');
const sctx = sparkleCanvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
const GOLD = [247, 227, 154];
const SILVER = [233, 238, 245];

function sizeSparkles() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  sparkleCanvas.width = Math.floor(W * DPR);
  sparkleCanvas.height = Math.floor(H * DPR);
  sctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

const sparks = [];
const MAX_SPARKS = 260;
let ambientMode = false;

function spawnSpark(x, y, burst) {
  if (sparks.length >= MAX_SPARKS) return;
  const gold = Math.random() > 0.42;
  const c = gold ? GOLD : SILVER;
  sparks.push({
    x, y,
    vx: (Math.random() - 0.5) * (burst ? 1.6 : 0.7),
    vy: -(0.25 + Math.random() * (burst ? 1.5 : 0.6)),
    life: 0,
    max: 0.9 + Math.random() * 1.5,
    r: (burst ? 5 : 3.2) + Math.random() * (burst ? 7 : 5),
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 2.4,
    c,
    ph: Math.random() * Math.PI * 2,
  });
}
function burstAt(x, y, n) { for (let i = 0; i < n; i++) spawnSpark(x, y, true); }

let lastScroll = window.scrollY;
let lastBurstT = 0;
function onScrollSpark() {
  const y = window.scrollY;
  const delta = Math.abs(y - lastScroll);
  lastScroll = y;
  const n = Math.min(16, Math.round(delta * (isMobile ? 0.05 : 0.09)));
  for (let i = 0; i < n; i++) spawnSpark(Math.random() * W, H * (0.12 + Math.random() * 0.74), true);
  const now = performance.now();
  if (delta > 260 && now - lastBurstT > 320) {
    lastBurstT = now;
    burstAt(W * (0.2 + Math.random() * 0.6), H * (0.3 + Math.random() * 0.4), 10);
  }
}

function drawSpark(s, t) {
  const p = s.life / s.max;
  const fade = p < 0.18 ? p / 0.18 : 1 - (p - 0.18) / 0.82;
  const twinkle = 0.55 + 0.45 * Math.sin(t * 0.012 + s.ph);
  const a = Math.max(0, fade) * twinkle;
  const r = s.r * (0.6 + 0.4 * twinkle);
  const [cr, cg, cb] = s.c;
  sctx.save();
  sctx.translate(s.x, s.y);
  sctx.rotate(s.rot);
  sctx.globalAlpha = a;
  const g = sctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.9);
  g.addColorStop(0, `rgba(${cr},${cg},${cb},${0.95 * a})`);
  g.addColorStop(0.35, `rgba(${cr},${cg},${cb},${0.35 * a})`);
  g.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
  sctx.fillStyle = g;
  sctx.beginPath(); sctx.arc(0, 0, r * 1.9, 0, Math.PI * 2); sctx.fill();
  sctx.strokeStyle = `rgba(255,255,255,${0.85 * a})`;
  sctx.lineWidth = Math.max(0.7, r * 0.13);
  sctx.beginPath();
  sctx.moveTo(-r * 1.7, 0); sctx.lineTo(r * 1.7, 0);
  sctx.moveTo(0, -r * 1.7); sctx.lineTo(0, r * 1.7);
  sctx.stroke();
  sctx.fillStyle = `rgba(255,255,255,${0.9 * a})`;
  sctx.beginPath(); sctx.arc(0, 0, Math.max(0.8, r * 0.24), 0, Math.PI * 2); sctx.fill();
  sctx.restore();
}

let lastT = 0;
function sparkleLoop(t) {
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  sctx.clearRect(0, 0, W, H);
  sctx.globalCompositeOperation = 'lighter';
  const rate = ambientMode ? 0.55 : 0.16;
  if (Math.random() < rate) spawnSpark(Math.random() * W, H * (0.15 + Math.random() * 0.7), false);
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life += dt;
    if (s.life >= s.max) { sparks.splice(i, 1); continue; }
    s.x += s.vx; s.y += s.vy;
    s.vy *= 0.995;
    s.vx += (Math.random() - 0.5) * 0.02;
    s.rot += s.vr * dt;
    drawSpark(s, t);
  }
  sctx.globalCompositeOperation = 'source-over';
  requestAnimationFrame(sparkleLoop);
}

if (!reduceMotion) {
  sizeSparkles();
  window.addEventListener('resize', sizeSparkles);
  window.addEventListener('scroll', onScrollSpark, { passive: true });
  requestAnimationFrame(sparkleLoop);
  setTimeout(() => burstAt(W * 0.5, H * 0.42, 22), 450);
} else {
  sparkleCanvas.style.display = 'none';
}

const ambientBtn = document.getElementById('ambientBtn');
if (ambientBtn) {
  ambientBtn.addEventListener('click', () => {
    ambientMode = !ambientMode;
    ambientBtn.classList.toggle('on', ambientMode);
    if (ambientMode && !reduceMotion) burstAt(W * 0.5, H * 0.3, 16);
  });
}

/* ------------------------------------------------------------
   4. 3D DISH VIEWERS
   ------------------------------------------------------------ */
/* studio environment — HDR softboxes give photographic highlights */
function studioEnv() {
  const scene = new THREE.Scene();
  const geo = new THREE.PlaneGeometry(12, 12);
  const panel = (rgb, pos, scale) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    m.material.color.setRGB(rgb[0], rgb[1], rgb[2]);
    m.position.set(pos[0], pos[1], pos[2]);
    m.lookAt(0, 0, 0);
    m.scale.set(scale, scale, 1);
    scene.add(m);
  };
  panel([3.4, 3.0, 2.5], [3.5, 5.5, 3.5], 7);   // warm key
  panel([0.7, 0.95, 1.6], [-5.5, 2.5, 1.5], 7);  // cool fill
  panel([1.7, 1.2, 0.75], [-1.5, 3.0, -5.5], 6); // warm rim
  panel([0.22, 0.22, 0.26], [0, -5, 0], 9);      // bounce
  return scene;
}
const pmrem = new THREE.PMREMGenerator(new THREE.WebGLRenderer({ antialias: false }));
const envRT = pmrem.fromScene(studioEnv(), 0.03);

const ACCENTS = {
  gold:   { ring: 0xd4af37, rim: 0xffe9a8, key: 0xfff0cf, fill: 0xffd9a0 },
  silver: { ring: 0xc9cdd6, rim: 0xdfe8ff, key: 0xf4f7ff, fill: 0xcdd8ff },
};

class DishViewer {
  constructor(container) {
    this.container = container;
    this.accent = ACCENTS[container.dataset.accent] || ACCENTS.gold;
    this.dish = container.dataset.dish || 'pizza';
    this.visible = true;
    this.ok = false;

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    } catch (e) { this.fallback(); return; }

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.environment = envRT.texture;

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    this.camera.position.set(0, 1.55, 2.95);

    // lights — warm gold key (shadows) + cool silver rim
    const key = new THREE.DirectionalLight(this.accent.key, 4.2);
    key.position.set(3.4, 5.4, 4.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 20;
    key.shadow.camera.left = -2.4; key.shadow.camera.right = 2.4;
    key.shadow.camera.top = 2.4; key.shadow.camera.bottom = -2.4;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 4;

    const rim = new THREE.PointLight(this.accent.rim, 24, 24, 2);
    rim.position.set(-4.2, 2.6, -3.2);
    const fill = new THREE.PointLight(this.accent.fill, 8, 22, 2);
    fill.position.set(2.8, -1.2, 3.6);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3), key, rim, fill);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 3.0;
    this.controls.maxDistance = 6.5;
    this.controls.minPolarAngle = Math.PI * 0.12;
    this.controls.maxPolarAngle = Math.PI * 0.72;
    this.controls.autoRotate = !reduceMotion;
    this.controls.autoRotateSpeed = 1.0;
    this.controls.target.set(0, 0.12, 0);

    this.pivot = new THREE.Group();
    this.scene.add(this.pivot);

    this.build();
    this.resize();

    if ('ResizeObserver' in window) {
      this.ro = new ResizeObserver(() => this.resize());
      this.ro.observe(container);
    } else {
      window.addEventListener('resize', () => this.resize());
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((e) => { this.visible = e.isIntersecting; });
      }, { threshold: 0.02 }).observe(container);
    }

    this.clock = new THREE.Clock();
    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  build() {
    const make = BUILDERS[this.dish] || BUILDERS.pizza;
    const model = make();

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const s = 1.95 / maxDim;
    model.scale.setScalar(s);
    model.position.set(-center.x * s, -center.y * s, -center.z * s);

    model.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (o.material && 'envMapIntensity' in o.material) o.material.envMapIntensity = 1.0;
      }
    });
    this.pivot.add(model);

    const halfH = (size.y * s) / 2;

    // soft contact shadow catcher (invisible except where shadowed)
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(2.0, 48),
      new THREE.ShadowMaterial({ opacity: 0.42 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -halfH - 0.012;
    ground.receiveShadow = true;
    this.pivot.add(ground);

    // metallic pedestal ring
    const ringMat = new THREE.MeshStandardMaterial({ color: this.accent.ring, metalness: 1.0, roughness: 0.16, envMapIntensity: 1.4 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.016, 24, 120), ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -halfH - 0.02;
    this.pivot.add(ring);

    this.floatPhase = Math.random() * Math.PI * 2;
    this.ok = true;
    this.container.classList.add('ready');
  }

  fallback() { this.container.classList.add('fallback'); }

  resize() {
    if (!this.renderer) return;
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  tick() {
    requestAnimationFrame(this.tick);
    if (!this.renderer || !this.visible) return;
    const dt = this.clock.getDelta();
    if (this.ok && !reduceMotion) {
      this.floatPhase += dt;
      this.pivot.position.y = Math.sin(this.floatPhase * 0.9) * 0.03;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

const stages = [...document.querySelectorAll('.stage')];
const viewers = new Map();
stages.forEach((el) => viewers.set(el.id, new DishViewer(el)));

document.querySelectorAll('.stage-btn[data-action="spin"]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const v = viewers.get(btn.dataset.target);
    if (!v || !v.controls) return;
    v.controls.autoRotate = !v.controls.autoRotate;
    btn.classList.toggle('spinning', v.controls.autoRotate);
  });
});

/* ------------------------------------------------------------
   5. Sparkle burst when a dish card enters the viewport
   ------------------------------------------------------------ */
if ('IntersectionObserver' in window && !reduceMotion) {
  const cardIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        const r = e.target.getBoundingClientRect();
        burstAt(r.left + r.width / 2, r.top + Math.min(120, r.height / 2), 14);
        cardIO.unobserve(e.target);
      }
    });
  }, { threshold: 0.35 });
  document.querySelectorAll('.dish-card').forEach((c) => cardIO.observe(c));
}
