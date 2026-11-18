/* ==========================================================================
   STILL POINT — config
   One object fills the whole site. Edit SITE and every [data-site] updates.
   Must load before every other module.
   ========================================================================== */

const SITE = {
  name        : 'Long Tide',
  discipline  : 'Craniosacral Therapy',
  practitioner: 'The Practitioner',
  /* the portrait headline breaks across two lines deliberately */
  practitionerFirst: 'The',
  practitionerLast : 'Practitioner',
  credentials : 'Mumbai',
  city        : 'Mumbai',
  area        : 'Worli',
  street      : 'MG Road',
  postcode    : '400098',
  phone       : '',
  email       : 'demo@example.com',
  hours       : 'Tuesday to Friday, 9am until 6pm, and Saturday mornings',
  founded     : '2019',

  /* the studio credited in the footer */
  designer    : 'Norman James',
  studio      : 'Empathy Studio',

  /* legal / safety — fill these before publishing */
  country     : 'India',
  jurisdiction: 'India',

  /* Where the enquiry form POSTs. Leave empty and the form falls back to
     opening the visitor's mail client with the message pre-filled — it
     never silently discards an enquiry either way.
     Formspree, Netlify Forms and Basin all work here:
       formEndpoint: 'https://formspree.io/f/xxxxxxxx'                      */
  formEndpoint: '',

  /* The Three.js stone-chamber fog. Off by default: a live full-viewport
     WebGL layer measured ~65 dropped frames during a scroll in a
     software-rendered browser, and the merged CSS field looks the same.
     Set true if you want the drift back — it renders on demand, not on a
     loop, so even then it only redraws when scrolling stops. */
  atmosphere: false
};

/* Environment flags, resolved once. */
const RM   = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const MOBILE = () => window.matchMedia('(max-width: 767px)').matches;

/* Are we arriving from an in-site page transition? Set by the inline
   head script; tells the boot to skip the preloader on internal nav. */
const ARRIVED = !!window.SP_ARRIVED;

const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* ---------- identity fill ------------------------------------------------ */
(function fillSite () {
  $$('[data-site]').forEach(el => {
    const k = el.dataset.site;
    if (k in SITE) el.textContent = SITE[k];
  });
  $$('[data-site-href]').forEach(el => {
    const k = el.dataset.siteHref;
    if (k === 'email') el.href = 'mailto:' + SITE.email;
    if (k === 'phone') el.href = 'tel:' + SITE.phone.replace(/[^+\d]/g, '');
  });
  $$('[data-year]').forEach(e => { e.textContent = new Date().getFullYear(); });
  document.title = document.title.replace('{city}', SITE.city);
})();

window.SP = { SITE, RM, FINE, MOBILE, ARRIVED, $: s => document.querySelector(s), $$, clamp };
