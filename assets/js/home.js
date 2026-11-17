/* ==========================================================================
   HOME — Hero Type 01 · The Inscription
   The word is not animated in. It is excavated.
   ========================================================================== */

function SiteBoot ({ lenis, rm, fine }) {
  const word = document.getElementById('inscribed');
  if (!word) return;

  document.documentElement.classList.add('is-ready');

  if (rm) {
    word.style.letterSpacing = '.2em';
    word.style.clipPath = 'none';
    return;
  }

  /* 1. Excavation — clipPath wipe left→right, 2.4s, power4.out, no fade */
  gsap.set(word, { clipPath: 'inset(0 100% 0 0)' });
  gsap.to(word, {
    clipPath: 'inset(0 0% 0 0)',
    duration: 2.4,
    ease: 'power4.out',
    delay: .25
  });

  /* 2. The mono line arrives 1.2s later — dark dissolve only */
  const sub = document.querySelector('.inscription__sub');
  if (sub) {
    gsap.from(sub, { opacity: 0, duration: 1.6, ease: 'none', delay: 1.45 });
  }

  const mast = document.querySelector('.inscription__masthead');
  if (mast) gsap.from(mast, { opacity: 0, duration: 1.6, ease: 'none', delay: .3 });

  const scr = document.querySelector('.inscription__scroll');
  if (scr) gsap.from(scr, { opacity: 0, duration: 1.4, ease: 'none', delay: 2.4 });

  /* 3. Scroll — the inscription contracts into itself: .2em → .05em */
  gsap.to(word, {
    letterSpacing: '.05em',
    textIndent: '.05em',
    ease: 'none',
    scrollTrigger: {
      trigger: '.inscription',
      start: 'top top',
      end: 'bottom top',
      scrub: 1
    }
  });

  /* 4. The hero field dims as you leave — arrival becomes departure */
  const field = document.querySelector('.inscription__field');
  if (field) {
    gsap.to(field, {
      opacity: .25, ease: 'none',
      scrollTrigger: { trigger: '.inscription', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* 5. The premise statement is read at scroll pace, not animated at you */
  const st = document.querySelector('[data-words]');
  if (st) {
    gsap.set(st.querySelectorAll('.word'), { opacity: .1 });
  }
}
