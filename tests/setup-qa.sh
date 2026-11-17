#!/usr/bin/env bash
# Restores the QA toolchain. Neither pip packages nor browser binaries
# survive a snapshot, so this runs at the start of any session that needs
# screenshots or frame measurements.
set -e
pip install --quiet playwright
python3 -m playwright install chromium >/dev/null 2>&1
python3 -m playwright install-deps chromium >/dev/null 2>&1
python3 -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(); pg.set_content('<h1>ok</h1>')
    assert pg.inner_text('h1')=='ok'; b.close()
print('QA toolchain ready')
"
