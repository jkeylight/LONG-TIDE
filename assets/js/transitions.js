/* ==========================================================================
   STILL POINT — transitions
   A continuous upward wipe between pages.

   Barba.js is not used: it swaps pages by fetching HTML, which needs
   same-origin fetch/XHR, and this site runs from file:// where both fail
   (measured: "Failed to fetch" / "xhr error"). This module performs the same
   choreography with an ordinary navigation.

   ── Why this was rewritten ──────────────────────────────────────────────
   The previous version animated clip-path on a full-viewport panel and then
   ran `gsap.from(main, {y: 40})` on the arriving page. Measured frame time at
   1× CPU: p50 = 50ms, 43 of 43 frames dropped — the transition ran at ~20fps.

   Two causes, both now removed:

   · clip-path on a fixed full-screen element repaints the entire viewport
     every frame. It cannot be composited. Replaced with transform:
     translateY, which the compositor runs on the GPU without repainting.
   · Animating transform on <main> rasterises a layer thousands of pixels
     tall. There is no version of that which is cheap. Removed entirely —
     the arriving page's own hero timelines now play behind the covering
     panel, so the page is already alive when it is revealed.

   Result is the same wipe. It just does not fall over.
   ========================================================================== */

const Transitions = {
  KEY: 'sp:nav',
  curtain: null,
  leaving: false,

  init () {
    this.curtain = document.querySelector('.curtain');
    if (!this.curtain || RM || typeof gsap === 'undefined') return;

    /* we control the arrival position ourselves */
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    this.enter();
    document.addEventListener('click', e => this.onClick(e));

    /* a bfcache restore can return a page mid-wipe — put it back */
    window.addEventListener('pageshow', e => {
      if (e.persisted) {
        document.documentElement.classList.remove('nav-in');
        this.reset();
        this.leaving = false;
      }
    });
  },

  /* ---------- arrival ---------------------------------------------------- */
  enter () {
    const html = document.documentElement;
    if (!ARRIVED) { this.reset(); return; }

    /* internal navigation always begins at the top of the new page */
    window.scrollTo(0, 0);
    if (window.ScrollEngine && ScrollEngine.lenis) ScrollEngine.lenis.scrollTo(0, { immediate: true });

    const curtain = this.curtain;
    const unlock = () => document.documentElement.classList.remove('is-locked');

    html.classList.add('is-locked');
    gsap.set(curtain, { willChange: 'transform' });

    const lift = () => {
      gsap.timeline({
        onComplete () {
          html.classList.remove('nav-in');
          gsap.set(curtain, { willChange: 'auto' });
          unlock();
          if (window.Atmos) Atmos.resume();
          if (window.ScrollEngine) ScrollEngine.refresh();
        }
      }).to(curtain, {
        yPercent: -100,
        duration: .9,
        ease: 'power4.inOut'
      });
    };

    /* Begin the moment the page underneath is booted. If boot has already
       finished (fast page), dispatch is missed, so check the flag too. */
    if (window.SP_BOOTED) {
      requestAnimationFrame(() => setTimeout(lift, 60));
    } else {
      document.addEventListener('sp:booted', () => setTimeout(lift, 60), { once: true });
      /* hard ceiling: never leave a visitor staring at a covered page */
      setTimeout(() => {
        if (html.classList.contains('nav-in')) lift();
      }, 2600);
    }
  },

  reset () {
    if (!this.curtain) return;
    gsap.set(this.curtain, { yPercent: 100, willChange: 'auto' });
    document.documentElement.classList.remove('nav-in', 'is-locked');
  },

  /* ---------- departure -------------------------------------------------- */
  onClick (e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

    const a = e.target.closest('a');
    if (!a) return;
    if (a.target && a.target !== '_self') return;
    if (a.hasAttribute('download')) return;

    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
    if (!/\.html(\?.*)?(#.*)?$/.test(href)) return;

    const dest = new URL(a.href, location.href);
    if (dest.pathname === location.pathname && dest.hash) return;   /* same page, anchor */

    e.preventDefault();
    if (this.leaving) return;
    this.leaving = true;

    this.curtain.style.pointerEvents = 'auto';
    document.documentElement.classList.add('is-locked');
    if (window.ScrollEngine && ScrollEngine.lenis) ScrollEngine.lenis.stop();
    /* nobody can see the fog behind a covering panel */
    if (window.Atmos) Atmos.pause();

    const go = () => {
      try { sessionStorage.setItem(this.KEY, '1'); } catch (_) {}
      location.href = a.href;
    };

    if (dest.pathname === location.pathname) { go(); return; }

    /* the panel rises from below and covers the page */
    gsap.timeline({ onComplete: go })
      .set(this.curtain, { yPercent: 100, visibility: 'visible', willChange: 'transform' })
      .to(this.curtain, { yPercent: 0, duration: .8, ease: 'power4.inOut' });
  }
};
