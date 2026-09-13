"""Probe real model/audio playback in a running native WebView (no speech mocks)."""
import argparse
import json
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

parser = argparse.ArgumentParser()
parser.add_argument('--cdp', required=True)
parser.add_argument('--output', required=True)
args = parser.parse_args()
with sync_playwright() as p:
    browser = p.chromium.connect_over_cdp(args.cdp)
    page = browser.contexts[0].pages[0]
    page.reload()
    page.wait_for_load_state('networkidle')
    page.locator('select').nth(0).select_option('example')
    expect(page.locator('select').nth(1)).to_have_value('demo.txt')
    page.get_by_role('button', name='开始学习').click()
    expect(page.locator('.word-card')).to_be_visible()
    page.evaluate('''() => {
      window.audioProbe = [];
      const originalPlay = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        window.audioProbe.push({event:'play', source: this.src});
        this.addEventListener('ended', () => window.audioProbe.push({event:'ended', duration:this.duration}), {once:true});
        return originalPlay.apply(this, args);
      };
    }''')
    start = time.monotonic()
    page.get_by_role('button', name='听发音').click()
    timed_out = False
    try:
        expect(page.get_by_role('button', name='听发音')).to_be_visible(timeout=240000)
    except AssertionError:
        timed_out = True
    report = {'url': page.url, 'word': page.locator('.card-front .word').inner_text(), 'engine': page.locator('.engine-pill').inner_text(), 'elapsed_seconds': round(time.monotonic() - start, 1), 'timed_out': timed_out, 'audio': page.evaluate('window.audioProbe'), 'errors': page.locator('.audio-error').all_inner_texts()}
    Path(args.output).write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
    if timed_out:
        page.get_by_role('button', name='返回词库').click()
    browser.close()
