/* ==========================================================================
   STILL POINT — cursor
   A small dot that tracks the pointer exactly, and a slower ring that follows
   on a lag. Both use mix-blend-mode: difference, so over the void they read
   as light and over the portrait they invert.

   Never gated: every action the cursor points at also works without it.
   Disabled entirely for touch, coarse pointers, and reduced motion.
   ========================================================================== */

const Cursor = {
  init () {
    if (!FINE || RM) return;
    if (typeof gsap === 'undefined') return;

    const dot   = document.querySelector('.cursor-dot');
    const ring  = document.querySelector('.cursor-ring');
    if (!dot || !ring) return;

    const xTo = gsap.quickTo(ring, 'x', { duration: 0.4, ease: 'power3' });
    const yTo = gsap.quickTo(ring, 'y', { duration: 0.4, ease: 'power3' });

    let shown = false;

    window.addEventListener('pointermove', e => {
      if (!shown) {
        gsap.set([dot, ring], { x: e.clientX, y: e.clientY, opacity: 1 });
        shown = true;
      }
      /* the dot is exact — no easing, it is the honest position */
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      xTo(e.clientX);
      yTo(e.clientY);
    }, { passive: true });

    const LINK = 'a, button, summary, .action, label, input, textarea, select';
    document.addEventListener('pointerover', e => {
      if (e.target.closest(LINK)) document.body.classList.add('cursor-over-link');
    });
    document.addEventListener('pointerout', e => {
      if (e.target.closest(LINK)) document.body.classList.remove('cursor-over-link');
    });

    /* the hero is a sacred space — the ring dissolves into it */
    document.querySelectorAll('[data-sacred]').forEach(zone => {
      zone.addEventListener('pointerenter', () => document.body.classList.add('cursor-in-void'));
      zone.addEventListener('pointerleave', () => document.body.classList.remove('cursor-in-void'));
    });

    /* leaving the window, the ring should not be stranded mid-page */
    document.addEventListener('pointerleave', () => {
      gsap.to([dot, ring], { opacity: 0, duration: .3 });
      shown = false;
    });
    document.addEventListener('pointerenter', () => {
      gsap.to([dot, ring], { opacity: 1, duration: .3 });
    });
  }
};
