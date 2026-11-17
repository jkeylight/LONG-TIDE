/* ==========================================================================
   STILL POINT — preloader
   Counts to 100, then lifts the whole panel off the top.

   Written for frame-time, not for looks. Three rules:

   1. NOTHING here animates a layout property. The earlier version tweened
      letter-spacing on the word — that reflows text on every frame and was
      measured dropping 27 frames on exit. The word now settles with a
      transform + opacity only, and the rule beneath it draws with scaleX.

   2. The counter only writes to the DOM when the displayed integer changes,
      not on every animation frame. 0 → 100 is a hundred writes, not sixty
      per second.

   3. It waits for the things that would otherwise pop in after it lifts —
      fonts and the hero image — but never longer than a hard ceiling. A
      preloader that hides a janky first paint by being slow is not smooth,
      it is just late.
   ========================================================================== */

const Preloader = {
  el: null,
  done: false,
  ready: null,

  /* Start covering immediately, synchronously, at boot. */
  start () {
    this.el = document.querySelector('.preloader');

    const html = document.documentElement;

    if (!this.el) { html.classList.remove('is-loading'); this.done = true; return; }
    if (ARRIVED || RM || typeof gsap === 'undefined') {
      this.el.remove();
      html.classList.remove('is-loading');
      this.done = true;
      return;
    }

    /* the head script already claimed the page; this is the belt-and-braces
       case where sessionStorage threw and it could not */
    html.classList.add('is-loading');

    this.lock();

    /* what must exist before the page is worth revealing */
    this.ready = Promise.race([
      Promise.all([this.fonts(), this.heroImage()]),
      new Promise(r => setTimeout(r, 2500))
    ]);
  },

  fonts () {
    if (!document.fonts || !document.fonts.ready) return Promise.resolve();
    return document.fonts.ready;
  },

  /* The hero image is the one thing whose late arrival reads as a bug.
     Only images that are already eager are considered: a loading="lazy"
     image below the fold has not begun loading and will not until it is
     scrolled to, so waiting on it stalls the preloader for its whole
     ceiling. That mistake cost four seconds here. */
  heroImage () {
    const eager = [...document.querySelectorAll('#main img, main img')]
      .filter(im => im.getAttribute('loading') !== 'lazy');
    const pending = eager.filter(im => !im.complete);
    if (!pending.length) return Promise.resolve();
    return Promise.all(pending.map(im => new Promise(r => {
      im.addEventListener('load', r, { once: true });
      im.addEventListener('error', r, { once: true });
    })));
  },

  lock () {
    /* scroll lock without a layout shift: the gutter is already reserved by
       scrollbar-gutter:stable on <html> */
    document.documentElement.classList.add('is-locked');
    if (window.ScrollEngine && ScrollEngine.lenis) ScrollEngine.lenis.stop();
  },

  unlock () {
    document.documentElement.classList.remove('is-locked');
    if (window.ScrollEngine && ScrollEngine.lenis) ScrollEngine.lenis.start();
  },

  /** Runs the count, waits for readiness, lifts the panel. Resolves on exit. */
  exit () {
    return new Promise(resolve => {
      const el = this.el;
      if (!el || this.done || !el.isConnected) {
        this.unlock();
        this.done = true;
        resolve();
        return;
      }

      const countEl = el.querySelector('.preloader__count');
      const word    = el.querySelector('.preloader__word');
      const rule    = el.querySelector('.preloader__rule');
      const state   = { n: 0 };
      let shown     = -1;

      gsap.set(el, { willChange: 'transform' });

      const self = this;
      const tl = gsap.timeline({
        onComplete () {
          el.remove();
          document.documentElement.classList.remove('is-loading');
          self.done = true;
          resolve();
        }
      });

      /* content settles — transform and opacity only */
      tl.from(word, { opacity: 0, y: 14, duration: .9, ease: 'power3.out' }, 0)
        .from(rule, { scaleX: 0, duration: 1.4, ease: 'power3.inOut' }, .1)
        .from(countEl, { opacity: 0, duration: .8, ease: 'none' }, .3)
        .to(state, {
          n: 100,
          duration: 1.8,
          ease: 'power2.inOut',
          onUpdate () {
            const v = Math.round(state.n);
            if (v === shown || !countEl) return;   /* write only on change */
            shown = v;
            countEl.textContent = String(v).padStart(3, '0');
          }
        }, .3);

      /* hold until the page underneath is actually worth showing */
      this.ready.then(() => {
        tl.to({}, { duration: .12 });              /* one clean beat */

        /* the panel lifts; its contents leave slightly faster than the
           panel itself, which reads as the page being uncovered */
        tl.to([word, rule, countEl], {
          y: -18, opacity: 0, duration: .5, ease: 'power2.in',
          stagger: .04
        }, '>-0.12');

        tl.to(el, {
          yPercent: -100,
          duration: 1.05,
          ease: 'power4.inOut',
          onComplete: () => gsap.set(el, { willChange: 'auto' })
        }, '-=0.42');

        /* unlock only once the panel has begun moving, so the page is
           already scrolling-capable as it is revealed */
        tl.call(() => this.unlock(), null, '-=0.75');
      });
    });
  }
};
