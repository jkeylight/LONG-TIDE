/* ==========================================================================
   ATMOSPHERE — "Stone Chamber"
   Per the system: fog only, no visible geometry, light is the subject.
   Canvas is background (z-index -1), opacity .55. Camera dollies on scroll,
   never orbits. Degrades to nothing on mobile / reduced motion / no WebGL.
   ========================================================================== */

function initAtmosphere ({ rm }) {
  const host = document.getElementById('atmos-canvas');
  if (!host || rm || typeof THREE === 'undefined') return;

  /* Mobile degradation: no real-time 3D under 900px or on coarse pointers */
  if (window.innerWidth < 900 || !window.matchMedia('(hover:hover)').matches) return;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: host, antialias: false, alpha: true, powerPreference: 'low-power' });
  } catch (e) {
    return;                       /* no WebGL: the CSS atmosphere remains */
  }

  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  /* sized by size() below, at reduced resolution */

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x080706, 0.014);

  const camera = new THREE.PerspectiveCamera(52, W() / H(), 0.1, 100);
  camera.position.set(0, 0, 8);

  /* One source of light. Warm, low, off-centre — a chamber lit from one side. */
  const lamp = new THREE.PointLight(0xB24B2C, 1.0, 26, 2);
  lamp.position.set(-3.2, -1.4, 2.4);
  scene.add(lamp);

  const ambient = new THREE.AmbientLight(0xEDE9E0, 0.16);   /* within 0.1–0.3 */
  scene.add(ambient);

  /* Simple geometry only: a large sphere seen from inside, displaced by noise.
     No models, no particles, no visible edges — just depth and falloff. */
  const geo = new THREE.SphereGeometry(14, 48, 32);
  const base = geo.attributes.position.array.slice(0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x14110E, side: THREE.BackSide, transparent: true, opacity: 0.9,
    fog: true
  });
  const shell = new THREE.Mesh(geo, mat);
  scene.add(shell);

  /* extremely slow sinusoidal breathing — max ±3% over ~8s */
  const clock = new THREE.Clock();
  let scrollP = 0;
  const onScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    scrollP = max > 0 ? window.scrollY / max : 0;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  let visible = true;
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

  /* The scene renders on demand, so a frame-rate ladder is meaningless —
     only resolution matters now. Half scale: the fog is soft and
     low-contrast, and at half resolution it is indistinguishable. */
  const RES = 0.5;

  let paused = false;         /* stopped: a transition is covering the page */
  let elapsed = 0;

  function size () {
    renderer.setPixelRatio(1);
    renderer.setSize(Math.max(1, Math.round(W() * RES)), Math.max(1, Math.round(H() * RES)), false);
    host.style.width = '100%';
    host.style.height = '100%';
  }
  size();

  /* ---------- RENDER ON DEMAND -------------------------------------------
     This used to free-run at 30–60fps forever. Measured while scrolling in a
     software-rendered browser, that alone cost ~65 dropped frames, and even
     a paused-but-present WebGL layer cost ~17 — the composited layer is the
     expensive part, not the drawing.

     So the scene is rendered as a still: once at start-up, then once more
     each time scrolling settles. The camera still dollies with your
     position, the fog still has depth, and the drift now costs exactly
     nothing between renders. A ±1.5% breathe over eight seconds was never
     perceptible anyway; a still frame is honest about that.
     ---------------------------------------------------------------------- */
  function draw () {
    if (paused || !visible) return;

    /* accumulate only real elapsed time, so a long pause does not jump */
    const dt = Math.min(clock.getDelta(), 0.1);
    elapsed += dt;

    camera.position.z = 8 - scrollP * 2.4;
    camera.position.y = scrollP * -0.9;
    camera.rotation.x = scrollP * 0.05;

    const t = elapsed;
    lamp.intensity = 1.0 + Math.sin(t * 0.25) * 0.06;
    lamp.position.y = -1.4 + Math.sin(t * 0.18) * 0.12;

    renderer.render(scene, camera);
  }

  /* every render is a deliberate act: start-up, end of a scroll, resize */
  const scheduleDraw = () => { if (!paused) requestAnimationFrame(draw); };
  scheduleDraw();

  let idleTimer = null;
  const onMotionEnd = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(scheduleDraw, 200);
  };
  window.addEventListener('scroll', onMotionEnd, { passive: true });
  window.addEventListener('wheel', onMotionEnd, { passive: true });
  window.addEventListener('touchmove', onMotionEnd, { passive: true });

  window.Atmos = {
    pause () { paused = true; },
    resume () { paused = false; scheduleDraw(); },
    get running () { return !paused; },
    redraw: scheduleDraw
  };

  window.addEventListener('resize', () => {
    camera.aspect = W() / H();
    camera.updateProjectionMatrix();
    size();
    scheduleDraw();
  });
}
