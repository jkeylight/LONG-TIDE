/* ==========================================================================
   STILL POINT — boot
   The initialisation order below is deliberate and should not be shuffled:

     1. preloader starts covering
     2. fonts settled          — so nothing measures against a fallback face
     3. Lenis initialised
     4. Lenis synced to ScrollTrigger
     5. every GSAP animation registered
     6. ScrollTrigger.refresh() — all start/end values recomputed once
     7. preloader exits
     8. transitions registered  — last, so it never intercepts boot-time clicks

   Modules are plain scripts loaded in dependency order; this file only
   orchestrates them.
   ========================================================================== */

const fontsReady = () => {
  if (!document.fonts || !document.fonts.ready) return Promise.resolve();
  /* never let a slow or failed font hold the page hostage */
  return Promise.race([
    document.fonts.ready,
    new Promise(r => setTimeout(r, 2500))
  ]);
};

/* Nothing below depends on JS to be *readable*: every hidden state is applied
   by these modules, so if anything here fails the page is simply visible. */
const showEverything = () => {
  document.documentElement.classList.remove('first-frame', 'nav-in', 'is-loading');
  document.querySelectorAll('.reveal-up, .reveal-fade, .sw-i, .word')
    .forEach(e => { e.style.opacity = '1'; e.style.transform = 'none'; });
  document.querySelectorAll('.line-mask > span')
    .forEach(e => { e.style.transform = 'none'; });
  document.querySelectorAll('.rule--draw, .ms__rule')
    .forEach(e => { e.style.transform = 'scaleX(1)'; });
  const pre = document.querySelector('.preloader');
  if (pre) pre.remove();
  const curtain = document.querySelector('.curtain');
  if (curtain) curtain.style.visibility = 'hidden';
};

async function boot () {
  /* ---------- 1 ------------------------------------------------------- */
  Preloader.start();

  /* a library went missing: expose the page and stop pretending */
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    showEverything();
    return;
  }

  /* ---------- 2 ------------------------------------------------------- */
  await fontsReady();

  /* ---------- 3 + 4 --------------------------------------------------- */
  const lenis = ScrollEngine.init();

  /* ---------- 5 ------------------------------------------------------- */
  document.documentElement.classList.remove('first-frame');
  Animations.init();

  /* ---------- 6 ------------------------------------------------------- */
  ScrollEngine.refresh();

  /* ---------- 6b ------------------------------------------------------
     The page's own hero timelines start BEFORE the preloader lifts, so the
     hero is already moving as it is uncovered. Starting them afterwards
     left a dead beat: cover lifts on a still page, then the animation
     begins. That stutter is the single most common preloader mistake. */
  if (typeof SiteBoot === 'function') SiteBoot({ lenis, rm: RM, fine: FINE });

  /* ---------- 7 ------------------------------------------------------- */
  await Preloader.exit();

  /* ---------- 7b ------------------------------------------------------
     The atmosphere starts only now — rendering a full-screen WebGL canvas
     beneath the opaque preloader measured 20fps — and it starts on idle,
     so shader compilation never blocks the reveal animation either. */
  const startAtmos = () => {
    if (!(window.SP && SP.SITE && SP.SITE.atmosphere)) return;
    if (typeof initAtmosphere !== 'function' || window.__atmosStarted) return;
    window.__atmosStarted = true;
    initAtmosphere({ rm: RM });
    const c = document.getElementById('atmos-canvas');
    if (c) gsap.to(c, { opacity: .55, duration: 2.4, ease: 'none' });
  };
  /* a full beat after the reveal: the fog is worth waiting for, the reveal
     is not worth interrupting for it */
  setTimeout(() => {
    if ('requestIdleCallback' in window) requestIdleCallback(startAtmos, { timeout: 1500 });
    else startAtmos();
  }, 800);

  /* ---------- 8 ------------------------------------------------------- */
  Transitions.init();
  Cursor.init();
  if (typeof EnquiryForm !== 'undefined') EnquiryForm.init();

  /* transitions lift the arriving page's curtain on this signal */
  window.SP_BOOTED = true;
  document.dispatchEvent(new CustomEvent('sp:booted'));

  /* late-arriving images change document height — remeasure once, debounced.
     Repeated refreshes during a transition are themselves a source of jank. */
  let refreshT = null;
  const laterRefresh = () => {
    clearTimeout(refreshT);
    refreshT = setTimeout(() => ScrollEngine.refresh(), 180);
  };
  window.addEventListener('load', laterRefresh);
  if (document.fonts) document.fonts.ready.then(laterRefresh);
  window.addEventListener('resize', laterRefresh);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
