"""Scroll-jank harness.

Headless software rendering is noisy, so a single run proves nothing. This
takes N runs, discards the first frame of each, and reports the median of
the per-run means plus the worst case. Compare like with like only.

    python3 scrollbench.py <label> <url> [--runs 3] [--wheels 40]
"""
import sys, json, statistics
from playwright.sync_api import sync_playwright

SAMPLER = """
window.__f = []; window.__on = true;
let __l = performance.now();
(function tick(n){ window.__f.push(n - __l); __l = n; if (window.__on) requestAnimationFrame(tick); })(performance.now());
"""

REPORT = """
(() => {
  window.__on = false;
  const f = window.__f.slice(2);
  if (!f.length) return null;
  const mean = f.reduce((a,b)=>a+b,0)/f.length;
  const sorted = [...f].sort((a,b)=>a-b);
  const q = p => sorted[Math.min(sorted.length-1, Math.floor(sorted.length*p))];
  return {
    n: f.length,
    mean: +mean.toFixed(1),
    p50: +q(.5).toFixed(1),
    p95: +q(.95).toFixed(1),
    fps: +(1000/mean).toFixed(1),
    over32: f.filter(x=>x>32).length
  };
})()
"""


def bench(url, runs=3, wheels=40, wait=7000):
    out = []
    with sync_playwright() as p:
        b = p.chromium.launch()
        for _ in range(runs):
            pg = b.new_page(viewport={"width": 1440, "height": 900})
            pg.goto(url, wait_until="load", timeout=60000)
            pg.wait_for_timeout(wait)
            pg.evaluate(SAMPLER)
            for _i in range(wheels):
                pg.mouse.wheel(0, 300)
                pg.wait_for_timeout(70)
            r = pg.evaluate(REPORT)
            if r:
                out.append(r)
            pg.close()
        b.close()
    return out


if __name__ == "__main__":
    label = sys.argv[1]
    url = sys.argv[2]
    runs = 3
    wheels = 40
    if "--runs" in sys.argv:
        runs = int(sys.argv[sys.argv.index("--runs") + 1])
    if "--wheels" in sys.argv:
        wheels = int(sys.argv[sys.argv.index("--wheels") + 1])

    res = bench(url, runs, wheels)
    if not res:
        print(f"{label}: no frames")
        sys.exit()

    fps = [r["fps"] for r in res]
    drops = [r["over32"] for r in res]
    print(f"{label:26s} runs={len(res)}  fps median={statistics.median(fps):.1f}  "
          f"fps all={[round(x) for x in fps]}  dropped={drops}")
