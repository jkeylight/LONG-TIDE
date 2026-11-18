/* ==========================================================================
   STILL POINT — animations
   Every scroll-driven reveal on the site. Nothing here decorates: each
   timeline exists to bring a thing into being that was not there before.

   House law applied throughout:
   · transforms and opacity only — never width, height, top, left, margin
   · reveals no faster than 1s, power4 easing, nothing bounces
   · initial states set with gsap.set, never in CSS, so units always agree
   · a stagger never runs longer than six beats
   ========================================================================== */

const Animations = {

  init () {
    this.headlineMasks();
    this.splitHeadings();
    this.revealUp();
    this.revealFade();
    this.imageReveals();
    this.rules();
    this.counts();
    this.scrubWords();
    this.index();
    this.depthRail();
    ScrollEngine.parallax();
    ScrollEngine.horizontal();
  },

  /* ---------- masked line rise — headline lines only ---------------------- */
  headlineMasks () {
    if (RM) return;
    $$('.line-mask > span').forEach((sp, i) => {
      gsap.set(sp, { yPercent: 108 });
      gsap.to(sp, {
        yPercent: 0,
        duration: 1.25,
        ease: 'power4.out',
        scrollTrigger: { trigger: sp.parentElement, start: 'top 88%', once: true },
        delay: parseFloat(sp.dataset.d || 0) + i * 0.06
      });
    });
  },

  /* ---------- word-by-word headings ---------------------------------------
     Words rise from behind their own mask. The interval is compressed for
     long headings so a twelve-word line never drifts past six beats. */
  splitHeadings () {
    if (RM) return;
    $$('[data-split]').forEach(h => {
      const words = splitWords(h);
      if (!words.length) return;
      gsap.set(words, { yPercent: 112, opacity: 0 });
      gsap.to(words, {
        yPercent: 0,
        opacity: 1,
        duration: 0.9,
        ease: 'power4.out',
        stagger: cascadeFor(words.length),
        scrollTrigger: { trigger: h, start: 'top 86%', once: true }
      });
    });
  },

  /* ---------- heavy ascent ------------------------------------------------ */
  revealUp () {
    if (RM) return;
    $$('.reveal-up').forEach(el => {
      const y = parseFloat(el.dataset.y || 34);
      gsap.set(el, { opacity: 0, y });
      gsap.to(el, {
        y: 0,
        opacity: 1,
        duration: 1.4,
        ease: 'power4.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
        delay: parseFloat(el.dataset.d || 0)
      });
    });
  },

  /* ---------- dark dissolve ---------------------------------------------- */
  revealFade () {
    if (RM) return;
    $$('.reveal-fade').forEach(el => {
      gsap.set(el, { opacity: 0 });
      gsap.to(el, {
        opacity: 1,
        duration: 1.8,
        ease: 'none',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        delay: parseFloat(el.dataset.d || 0)
      });
    });
  },

  /* ---------- restrained photographic reveals -------------------------- */
  imageReveals () {
    if (RM) return;
    $$('[data-image-reveal]').forEach(el => {
      gsap.fromTo(el,
        { opacity: .8, scale: 1.025 },
        {
          opacity: 1,
          scale: 1,
          duration: 1.5,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        }
      );
    });
  },

  /* ---------- rules draw -------------------------------------------------- */
  rules () {
    $$('.rule--draw').forEach(el => {
      gsap.to(el, {
        scaleX: 1,
        duration: RM ? 0 : 1.6,
        ease: 'power3.inOut',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true }
      });
    });
  },

  /* ---------- count-up numerals ------------------------------------------
     Snapped on completion. A tween caught mid-flight must never be the last
     thing a visitor reads on a clinical figure. */
  counts () {
    $$('[data-count]').forEach(el => {
      const target = el.dataset.count;
      const dec = target.includes('.') ? 1 : 0;
      const fmt = v => (dec ? v.toFixed(1) : Math.round(v));
      const obj = { v: 0 };

      el.textContent = fmt(0);

      ScrollTrigger.create({
        trigger: el,
        start: 'top 92%',
        once: true,
        onEnter () {
          if (RM) { el.textContent = target; return; }
          gsap.to(obj, {
            v: parseFloat(target),
            duration: 2.0,
            ease: 'power2.out',
            onUpdate () { el.textContent = fmt(obj.v); },
            onComplete () { el.textContent = target; }
          });
        }
      });
    });
  },

  /* ---------- scroll-linked word illumination ---------------------------- */
  scrubWords () {
    if (RM) return;
    $$('[data-words]').forEach(block => {
      const text = block.textContent.trim();
      if (!text) return;
      block.textContent = '';
      const parts = text.split(/\s+/);
      parts.forEach((w, i) => {
        const s = document.createElement('span');
        s.className = 'word';
        s.textContent = w;
        s.style.opacity = '.12';
        block.append(s);
        if (i < parts.length - 1) block.append(' ');
      });
      gsap.to(block.querySelectorAll('.word'), {
        opacity: 1,
        ease: 'none',
        stagger: .08,
        scrollTrigger: { trigger: block, start: 'top 78%', end: 'bottom 52%', scrub: true }
      });
    });
  },

  /* ---------- depth rail --------------------------------------------------
     The reading position, shown as depth into the body rather than as a
     percentage. Each section lights the stop it corresponds to. */
  depthRail () {
    const rail = document.querySelector('.uo__rail');
    if (!rail || !window.ScrollTrigger) return;

    const stops = [...rail.querySelectorAll('.uo__stop')];
    const sections = [...document.querySelectorAll('.uo__sec')];
    if (!stops.length || !sections.length) return;

    const setActive = i => stops.forEach((s, j) => s.classList.toggle('is-on', j === i));

    sections.forEach((sec, i) => {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 60%',
        end: 'bottom 60%',
        onEnter: () => setActive(i),
        onEnterBack: () => setActive(i)
      });
    });

    /* smooth anchors, through Lenis where it exists */
    stops.forEach(s => {
      s.addEventListener('click', e => {
        const target = document.querySelector(s.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        if (window.ScrollEngine && ScrollEngine.lenis) {
          ScrollEngine.lenis.scrollTo(target, { offset: -60 });
        } else {
          target.scrollIntoView({ behavior: RM ? 'auto' : 'smooth', block: 'start' });
        }
      });
    });

    setActive(0);
  },

  /* ---------- index overlay ----------------------------------------------- */
  index () {
    const panel = document.getElementById('index');
    if (!panel) return;

    const openers = $$('[data-open-index]');
    const closer  = panel.querySelector('.index__close');
    const links   = $$('.index__link', panel);
    let open = false;

    const tl = gsap.timeline({ paused: true })
      .set(panel, { visibility: 'visible' })
      .to(panel, { clipPath: 'inset(0% 0 0 0)', duration: 1.0, ease: 'power4.inOut' })
      .to(links, { opacity: 1, y: 0, duration: .8, ease: 'power3.out', stagger: .06 }, '-=.45');

    const setOpen = v => {
      open = v;
      if (v) { tl.play(); document.documentElement.style.overflow = 'hidden'; }
      else { tl.reverse(); document.documentElement.style.overflow = ''; }
      openers.forEach(o => o.setAttribute('aria-expanded', String(v)));
    };

    openers.forEach(b => b.addEventListener('click', e => { e.preventDefault(); setOpen(true); }));
    if (closer) closer.addEventListener('click', () => setOpen(false));
    links.forEach(l => l.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && open) setOpen(false); });
    window.addEventListener('resize', () => { if (window.innerWidth > 1100 && open) setOpen(false); });
  }
};
