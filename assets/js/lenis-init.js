/* ==========================================================================
   STILL POINT — lenis-init
   Smooth scroll (Lenis) wired to GSAP's ticker, ScrollTrigger kept in sync,
   and the two scroll-driven systems that ride on top of it: layered parallax
   driven by data-speed / data-parallax, and the pinned horizontal track.

   A note on scrollerProxy
   -----------------------
   The vendor brief suggests ScrollTrigger.scrollerProxy(document.documentElement).
   Lenis 1.x drives the *native* scroll position — it does not transform a
   wrapper — so a proxy is unnecessary, and proxying documentElement is a known
   cause of pinned sections jumping. The correct sync for this version is the
   ticker + 'scroll' listener below. That is what Lenis itself documents.
   ========================================================================== */

const ScrollEngine = {
  lenis: null,

  init () {
    if (typeof gsap === 'undefined') return null;
    gsap.registerPlugin(ScrollTrigger);

    /* Below 768px Lenis is off: momentum scrolling fights the address bar
       and the native feel is better on touch. GSAP animations still run. */
    const canSmooth = typeof Lenis !== 'undefined' && !RM && !MOBILE();

    if (canSmooth) {
      /* lerp governs; duration is only consulted when an easing is supplied
         (Lenis 1.1.14, Animate.advance).

         0.05, not 0.08. This is matched to the reference the practice asked
         for: Droow runs SmoothScrollbar at damping 0.05, which retains 95%
         of remaining distance per frame and takes ~1.5s to settle. Lenis at
         0.08 settles in ~0.95s, which reads as merely soft rather than as a
         glide. Slower is the whole point — it is what makes the page feel
         unhurried rather than merely animated. */
      this.lenis = new Lenis({
        lerp: 0.05,
        duration: 1.4,
        smoothWheel: true,
        smoothTouch: false,
        wheelMultiplier: 1,
        touchMultiplier: 1.6
      });

      gsap.ticker.add(time => this.lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
      this.lenis.on('scroll', ScrollTrigger.update);
    }

    this.bindAnchors();
    return this.lenis;
  },

  bindAnchors () {
    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const link = e.target.closest && e.target.closest('a[href]');
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;

      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;

      const target = document.getElementById(url.hash.slice(1));
      if (!target) return;

      e.preventDefault();
      if (location.protocol !== 'file:' && location.hash !== url.hash) {
        history.pushState(null, '', url.hash);
      }
      this.scrollTo(target, { offset: -60, duration: 1.2 });
    });
  },

  /* ---------- layered parallax ------------------------------------------
     data-parallax="16"  → travels 16% of the element height, total
     data-speed="0.85"   → shorthand: travels (1 − 0.85) × 100 = 15%
     Capped at 30% (house law), halved on small screens. */
  parallax () {
    if (RM) return;

    const mob = MOBILE();
    const halve = mob ? 0.5 : 1;

    $$('[data-parallax], [data-speed]').forEach(el => {
      let amt;

      if (el.dataset.speed !== undefined) {
        const speed = parseFloat(el.dataset.speed);
        amt = Number.isFinite(speed) ? (1 - speed) * 100 : 10;
      } else {
        amt = parseFloat(el.dataset.parallax) || 12;
      }

      amt = clamp(amt, 0, 30) * halve;
      if (amt <= 0) return;

      gsap.set(el, { willChange: 'transform' });

      gsap.fromTo(el,
        { yPercent: -amt / 2 },
        {
          yPercent: amt / 2,
          ease: 'none',
          scrollTrigger: {
            trigger: el.closest('[data-parallax-scope]') || el.parentElement,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
            invalidateOnRefresh: true
          }
        }
      );
    });
  },

  /* ---------- pinned horizontal track -----------------------------------
     A row wider than the viewport, translated sideways while its section is
     pinned. On mobile the pin is dropped and the row becomes a native
     swipeable scroller, which is the honest touch pattern. */
  horizontal () {
    const section = document.querySelector('[data-hscroll]');
    if (!section || RM) return;

    const track = section.querySelector('.hx__track');
    if (!track) return;

    if (MOBILE()) {
      section.classList.add('is-native');
      return;
    }

    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: () => '+=' + distance(),
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true
      }
    });
  },

  /** Recompute every trigger's start/end. Called after fonts and images. */
  refresh () {
    if (typeof ScrollTrigger === 'undefined') return;
    ScrollTrigger.refresh();
  },

  scrollTo (target, options = {}) {
    if (this.lenis) {
      this.lenis.scrollTo(target, options);
    } else if (target && target.getBoundingClientRect) {
      const offset = Number.isFinite(options.offset) ? options.offset : 0;
      const top = target.getBoundingClientRect().top + window.scrollY + offset;
      window.scrollTo({ top, behavior: RM ? 'auto' : 'smooth' });
    }
  }
};
