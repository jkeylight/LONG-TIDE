/* ==========================================================================
   PAGE HEROES — one archetype per page, no two alike
   ========================================================================== */

function SiteBoot ({ rm, fine }) {
  if (rm) return;

  /* ---------- TYPE 04 · THE MANUSCRIPT REVEAL ------------------------- */
  const msRule = document.getElementById('ms-rule');
  if (msRule) {
    const tl = gsap.timeline({ delay: .1 });
    tl.from('.ms__masthead', { opacity: 0, duration: 1.1, ease: 'none' })
      .to(msRule, { scaleX: 1, duration: 1.4, ease: 'power3.inOut' }, '-=.8');

    /* word-mask reveal, line by line */
    document.querySelectorAll('#ms-h span').forEach((line, i) => {
      const words = line.innerHTML.split(/\s+/);
      line.innerHTML = words.map(w => '<span class="mw" style="display:inline-block;overflow:hidden;vertical-align:top"><span style="display:inline-block">' + w + '</span></span>').join(' ');
      gsap.from(line.querySelectorAll('.mw > span'), {
        yPercent: 112, duration: 1.2, ease: 'power4.out',
        stagger: .06, delay: .35 + i * .16
      });
    });

    /* the drop cap reveals last */
    const body = document.getElementById('ms-dropcap');
    if (body) gsap.from(body, { opacity: 0, duration: 1.4, ease: 'none', delay: .8 });
  }

  /* ---------- TYPE 02 · THE DARK PORTRAIT ----------------------------- */
  const dpName = document.getElementById('dp-name');
  if (dpName) {
    const tl = gsap.timeline({ delay: .1 });
    tl.from('#dp-img', { scale: 1.07, duration: 2.4, ease: 'power2.out' }, 0)
      .from('.dp__copy > *', { opacity: 0, y: 26, duration: 1.2, ease: 'power3.out', stagger: .12 }, .25);

    /* the face slowly emerges from darkness as you read */
    gsap.to('#dp-img', {
      filter: 'grayscale(100%) contrast(1.32) brightness(.66)',
      ease: 'none',
      scrollTrigger: { trigger: '.dp', start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  /* ---------- TYPE 15 · THE EMPTY CHAIR ------------------------------- */
  const rect = document.getElementById('ec-rect');
  if (rect) {
    const q = document.getElementById('ec-q');
    if (q) gsap.to(q, { opacity: 1, duration: 1.4, ease: 'none', delay: .9 });

    if (fine) {
      /* cursor enters the void: the frame yields */
      rect.addEventListener('pointerenter', () => {
        gsap.to(rect, { borderColor: 'rgba(178,75,44,.95)', scale: 1.012, duration: .6, ease: 'power3.out' });
        gsap.to(q, { opacity: 0, duration: .4 });
      });
      rect.addEventListener('pointerleave', () => {
        gsap.to(rect, { borderColor: 'rgba(178,75,44,.4)', scale: 1, duration: .6, ease: 'power3.out' });
        gsap.to(q, { opacity: 1, duration: .6 });
      });
    }
  }

  /* ---------- TYPE 12 · THE LINEAGE DOCUMENT -------------------------- */
  const ld = document.querySelector('.ld__h');
  if (ld) {
    gsap.from('.ld__h', { opacity: 0, y: 30, duration: 1.3, ease: 'power3.out', delay: .1 });
    gsap.from('.ld__cols > div', { opacity: 0, y: 18, duration: 1.2, ease: 'power3.out', stagger: .1, delay: .45 });
    gsap.from('.ld__head p', { opacity: 0, duration: 1.2, ease: 'none', delay: .1 });
  }

  /* ---------- TYPE 03 · THE VOID ENTRANCE ----------------------------- */
  const portal = document.querySelector('.ve__portal');
  if (portal) {
    /* the headline leads. The portal is a slow bloom behind it. */
    const tl = gsap.timeline({ delay: .1 });
    tl.from('.ve__h', { opacity: 0, y: 20, duration: 1.1, ease: 'power3.out' }, 0)
      .from('.ve__sub', { opacity: 0, duration: 1.2, ease: 'none' }, .35)
      .from('.ve__top > *, .ve__bottom > *', { opacity: 0, duration: 1, ease: 'none' }, .2)
      .from('.ve__portal', { opacity: 0, scaleY: .82, duration: 2.4, ease: 'power3.out' }, 0)
      .from('.ve__halo', { opacity: 0, scale: .8, duration: 2.8, ease: 'power2.out' }, 0);

    /* the portal drifts as you leave */
    gsap.to('.ve__portal', {
      yPercent: -12, opacity: .45, ease: 'none',
      scrollTrigger: { trigger: '.ve', start: 'top top', end: 'bottom top', scrub: true }
    });
  }
}
