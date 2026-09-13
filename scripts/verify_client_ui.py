"""Exercise the actual browser/WebView application with a dedicated test profile."""
import argparse
import json
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--url', default='http://127.0.0.1:5177')
parser.add_argument('--cdp')
parser.add_argument('--output', default='frontend/test-results/ui')
args = parser.parse_args()
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(args.cdp) if args.cdp else p.chromium.launch(headless=True)
    context = browser.contexts[0] if args.cdp else browser.new_context(viewport={'width': 1180, 'height': 840})
    page = context.pages[0] if args.cdp else context.new_page()
    if not args.cdp:
        page.goto(args.url)
    page.wait_for_load_state('networkidle')
    errors = []
    requests = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.on('request', lambda request: requests.append(request.url))
    # This verifier is only run against newly created test profiles, never user data.
    page.evaluate('localStorage.clear()')
    page.reload()
    page.wait_for_load_state('networkidle')
    expect(page.locator('select').nth(1).locator('option')).to_have_count(128)
    page.screenshot(path=str(out / 'selection.png'), full_page=True, animations='disabled')

    def start_demo():
        page.locator('select').nth(0).select_option('example')
        expect(page.locator('select').nth(1)).to_have_value('demo.txt')
        page.get_by_role('button', name='开始学习').click()
        expect(page.locator('.word-card')).to_be_visible()

    start_demo()
    expect(page.locator('.count')).to_have_text('0 / 10')
    expect(page.get_by_role('button', name='认识', exact=True)).to_be_disabled()
    page.get_by_role('button', name='查看释义').click()
    page.get_by_role('button', name='认识', exact=True).click()
    expect(page.locator('.count')).to_have_text('1 / 10')
    page.reload()
    page.wait_for_load_state('networkidle')
    start_demo()
    expect(page.locator('.count')).to_have_text('1 / 10')
    page.get_by_role('button', name='查看释义').click()
    expect(page.get_by_role('button', name='认识', exact=True)).to_be_enabled()
    page.screenshot(path=str(out / 'learning.png'), full_page=True, animations='disabled')
    for count in range(1, 10):
        if not page.locator('.word-card').evaluate("e=>e.classList.contains('flipped')"):
            page.get_by_role('button', name='查看释义').click()
        page.get_by_role('button', name='认识', exact=True).click()
        if count < 9:
            expect(page.locator('.count')).to_have_text(f'{count + 1} / 10')
    expect(page.get_by_text('恭喜完成学习！')).to_be_visible()
    expect(page.locator('.stat-value').first).to_have_text('10')
    page.get_by_role('button', name='开始新一轮').click()
    expect(page.locator('.count')).to_have_text('0 / 10')
    page.get_by_role('button', name='返回词库').click()
    expect(page.get_by_role('button', name='开始学习')).to_be_visible()
    expect(page.locator('select').nth(0)).to_have_value('大学版')
    expect(page.locator('select').nth(1).locator('option')).to_have_count(128)
    expect(page.locator('select').nth(1).locator('option[value="demo.txt"]')).to_have_count(0)

    if not args.cdp:
        page.set_viewport_size({'width': 390, 'height': 844})
        page.screenshot(path=str(out / 'mobile-selection.png'), full_page=True, animations='disabled')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile horizontal overflow'
        page.locator('select').nth(0).select_option('大学版')
        page.locator('select').nth(1).select_option('01单向表达.txt')
        page.get_by_role('button', name='开始学习').click()
        page.get_by_role('button', name='查看释义').click()
        expect(page.get_by_role('button', name='认识', exact=True)).to_be_enabled()
        page.screenshot(path=str(out / 'mobile-learning.png'), full_page=True, animations='disabled')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'mobile card overflow'

    assert not errors, errors
    assert not any(':7860' in url or '/gradio_api/' in url for url in requests), requests
    report = {'url': page.url, 'native_webview': bool(args.cdp), 'catalog_decks': 128, 'completion': '10/10', 'reload_restored': '1/10', 'restart': '0/10', 'return_catalog_matches_folder': True, 'page_errors': errors, 'data_server_requests': 0}
    (out / 'verification.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
    browser.close()
