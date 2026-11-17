"""Frame-timing probe. Measures real jank, not vibes.

Samples requestAnimationFrame deltas across a window and reports the
distribution: p50/p95/max frame interval and how many frames took longer
than 32ms (i.e. dropped two or more frames at 60Hz).

Usage:
    python3 jank.py            # measure preloader exit on index.html
    python3 jank.py --nav      # measure an internal page transition
Add --throttle N to slow the CPU (CDP), which surfaces jank that a fast
headless machine would hide.
"""
import sys, pathlib, statistics

from playwright.sync_api import sync_playwright

SAMPLER = """
window.__frames = [];
window.__sampling = true;
let __last = performance.now();
function __tick(now) {
  window.__frames.push(now - __last);
  __last = now;
  if (window.__sampling) requestAnimationFrame(__tick);
}
requestAnimationFrame(__tick);
"""

REPORT = """
(() => {
  window.__sampling = false;
  const f = window.__frames.slice(2);
  if (!f.length) return null;
  const sorted = [...f].sort((a, b) => a - b);
  const q = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  return {
    n: f.length,
    p50: +q(0.50).toFixed(1),
    p95: +q(0.95).toFixed(1),
    max: +Math.max(...f).toFixed(1),
    over32: f.filter(x => x > 32).length,
    over50: f.filter(x => x > 50).length,
    total: +f.reduce((a, b) => a + b, 0).toFixed(0)
  };
})()
"""


def run(measure_nav: bool, throttle: int):
    root = pathlib.Path("/home/user/still-point").resolve()
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 1440, "height": 900})
        if throttle:
            cdp = pg.context.new_cdp_session(pg)
            cdp.send("Emulation.setCPUThrottlingRate", {"rate": throttle})

        pg.goto((root / "index.html").as_uri(), wait_until="load")
        pg.evaluate(SAMPLER)

        if measure_nav:
            # let the preloader finish, then click through the rail
            pg.wait_for_timeout(5200)
            pg.evaluate("window.__frames = []")
            try:
                pg.click('a[href="the-work.html"]', timeout=4000)
            except Exception:
                pg.click("[data-open-index]"); pg.wait_for_timeout(1300)
                pg.click('.index__link[href="the-work.html"]')
            pg.wait_for_url("**/the-work.html", timeout=8000)
            pg.wait_for_function("window.SP_BOOTED === true", timeout=8000)
            pg.evaluate(SAMPLER)
            pg.wait_for_timeout(1300)
            r = pg.evaluate(REPORT)
        else:
            # preloader exit happens around 2.9-4.3s after load
            pg.wait_for_timeout(2700)
            pg.evaluate("window.__frames = []")
            pg.wait_for_timeout(2600)
            r = pg.evaluate(REPORT)

        b.close()
        return r


if __name__ == "__main__":
    nav = "--nav" in sys.argv
    thr = 0
    if "--throttle" in sys.argv:
        thr = int(sys.argv[sys.argv.index("--throttle") + 1])
    r = run(nav, thr)
    label = "TRANSITION" if nav else "PRELOADER "
    if not r:
        print("no frames captured")
    else:
        verdict = "SMOOTH" if r["over32"] == 0 else f"{r['over32']} dropped frames"
        print(f"{label} throttle={thr or 1}x  n={r['n']:3d}  "
              f"p50={r['p50']}ms  p95={r['p95']}ms  max={r['max']}ms  "
              f">32ms={r['over32']}   -> {verdict}")
