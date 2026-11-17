/* ==========================================================================
   STILL POINT — split-text
   Splits a heading into words, each wrapped in an overflow-hidden mask so it
   can rise from behind a line. Written to survive inline markup: an <em> or
   <span> inside the heading keeps its styling instead of being flattened.

   Used by animations.js for [data-split] headings. Hero timelines keep their
   own bespoke splitting because their timing is hand-tuned.
   ========================================================================== */

/**
 * @param {HTMLElement} el heading to split
 * @returns {HTMLElement[]} the inner word spans, in reading order
 */
function splitWords (el) {
  if (!el || el.dataset.split === 'done') {
    return el ? [...el.querySelectorAll('.sw-i')] : [];
  }

  const out = [];

  /* Walk the tree, replacing each text node with masked word spans.
     Inline elements are descended into so their formatting is preserved. */
  (function walk (node) {
    [...node.childNodes].forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent;
        if (!text.trim()) { node.removeChild(child); return; }

        text.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            node.insertBefore(document.createTextNode(part), child);
            return;
          }
          const mask = document.createElement('span');
          mask.className = 'sw';
          const inner = document.createElement('span');
          inner.className = 'sw-i';
          inner.textContent = part;
          mask.appendChild(inner);
          node.insertBefore(mask, child);
          out.push(inner);
        });
        node.removeChild(child);
      } else if (child.nodeType === Node.ELEMENT_NODE && !child.classList.contains('sw')) {
        walk(child);
      }
    });
  })(el);

  el.dataset.split = 'done';
  return out;
}

/* A word cascade of twelve words at 0.06 stagger is 0.72s of drift, which
   reads as a wave rather than a reveal. The house law caps a stagger at six
   beats, so the interval is compressed for long headings instead. */
function cascadeFor (count) {
  return count > 6 ? (6 * 0.06) / count : 0.06;
}
