const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * Measure frame timing during the preloader exit and the page transition.
 * Reports p50 / p95 / max frame interval and count of frames > 32ms.
 * Usage: node jank.js [--nav] [--throttle N]
 */

const args = process.argv.slice(2);
const navMode = args.includes('--nav');
const throttleIdx = args.indexOf('--throttle');
const throttle = throttleIdx >= 0 ? parseInt(args[throttleIdx + 1], 10) : 0;

const SAMPLER = `
  window.__frames = [];
  window.__sampling = true;
  let __last = performance.now();
  function __tick(now) {
    window.__frames.push(now - __last);
    __last = now;
    if (window.__sampling) requestAnimationFrame(__tick);
  }
  requestAnimationFrame(__tick);
`;

const REPORT = `
  (() => {
    window.__sampling = false;
    const f = window.__frames.slice(2);
    if (!f.length) return null;
    const sorted = [...f].sort((a, b) => a - b);
    const q = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
    return {
      n: f.length,
      p50: +q(0.5).toFixed(1),
      p95: +q(0.95).toFixed(1),
      max: +Math.max(...f).toFixed(1),
      over32: f.filter(x => x > 32).length
    };
  })()
`;

(async () => {
  const root = path.resolve('/home/user/still-point');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  if (throttle > 1) {
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: throttle });
  }

  await page.goto('file://' + path.join(root, 'index.html'), { waitUntil: 'load' });
  await page.evaluate(SAMPLER);

  if (navMode) {
    await page.waitForTimeout(5200);
    await page.evaluate('window.__frames = []');
    try {
      await page.click('a[href="the-work.html"]', { timeout: 4000 });
    } catch {
      await page.click('[data-open-index]');
      await page.waitForTimeout(1300);
      await page.click('.index__link[href="the-work.html"]');
    }
    await page.waitForURL('**/the-work.html', { timeout: 8000 });
    await page.evaluate(SAMPLER);
    await page.waitForTimeout(2200);
  } else {
    await page.waitForTimeout(2700);
    await page.evaluate('window.__frames = []');
    await page.waitForTimeout(2600);
  }

  const result = await page.evaluate(REPORT);

  if (!result) {
    console.log('No frames captured');
  } else {
    const verdict = result.over32 === 0 ? 'SMOOTH' : `${result.over32} DROPPED FRAMES`;
    console.log(
      `${navMode ? 'TRANSITION' : 'PRELOADER '} throttle=${throttle || 1}x  ` +
      `n=${result.n}  p50=${result.p50}ms  p95=${result.p95}ms  max=${result.max}ms  ` +
      `>32ms=${result.over32}  → ${verdict}`
    );
  }

  await browser.close();
})();
