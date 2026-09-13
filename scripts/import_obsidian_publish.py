#!/usr/bin/env python3
"""Import a public Obsidian Publish thesaurus into the project's word files.

The importer accepts a starting page, follows same-site links, and extracts
word/meaning pairs from tables, list items, and Markdown-like paragraphs.
It deliberately writes a new output tree and a manifest instead of touching
an existing data directory.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import sys
import time
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from pathlib import Path
from typing import Iterable
from urllib.parse import quote, unquote, urldefrag, urljoin, urlparse
from urllib.request import Request, urlopen

PAIR_RE = re.compile(r"^\s*([^|:：\-–—]{1,80})\s*(?:\||:|：|\s+[–—-]\s+|\t)\s*(.{1,240})\s*$")
WORD_RE = re.compile(r"^[A-Za-z][A-Za-z'’.·-]{1,48}$")
RICH_PAIR_RE = re.compile(
    r'<font[^>]*color=["\']sky blue["\'][^>]*>\s*\*\*([^*]+)\*\*\s*</font>'
    r"\s*(?:\[[^\]]*\])?\s*<font[^>]*color=[\"']orange[\"'][^>]*>(.*?)</font>",
    flags=re.IGNORECASE | re.DOTALL,
)


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []
        self.blocks: list[str] = []
        self._href: str | None = None
        self._buffer: list[str] = []
        self._tag_stack: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self._tag_stack.append(tag)
        if tag == "a":
            self._href = dict(attrs).get("href")
        if tag in {"li", "p", "h1", "h2", "h3", "h4", "td", "th"}:
            self._buffer = []

    def handle_data(self, data: str) -> None:
        text = re.sub(r"\s+", " ", data).strip()
        if text:
            self._buffer.append(text)

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._href:
            self.links.append(self._href)
            self._href = None
        if tag in {"li", "p", "h1", "h2", "h3", "h4", "td", "th"} and self._buffer:
            self.blocks.append(" ".join(self._buffer))
            self._buffer = []
        if self._tag_stack:
            self._tag_stack.pop()


def normalize_publish_source(url: str, source: str) -> tuple[str, str]:
    """Resolve the Markdown preload URL emitted by an Obsidian Publish shell."""
    match = re.search(r'window\.preloadPage=f\("([^"]+\.md)"\)', source)
    return (match.group(1), "text/markdown") if match else (url, "text/html")


def encode_url_path(url: str) -> str:
    """Percent-encode Unicode and spaces in a URL path before HTTP access."""
    parsed = urlparse(url)
    return parsed._replace(path=quote(parsed.path, safe="/%:@-._~!$&'()*+,;=%")).geturl()


def fetch(url: str, timeout: int) -> tuple[str, str]:
    request = Request(url, headers={"User-Agent": "learn-english-words-thesaurus-importer/1.0"})
    with urlopen(request, timeout=timeout) as response:
        raw = response.read()
        charset = response.headers.get_content_charset() or "utf-8"
        return raw.decode(charset, errors="replace"), response.headers.get("Content-Type", "")


def fetch_retry(url: str, timeout: int, attempts: int = 4) -> tuple[str, str]:
    """Retry transient CDN connection resets while keeping hard failures visible."""
    last_error: Exception | None = None
    for attempt in range(attempts):
        try:
            return fetch(url, timeout)
        except Exception as exc:  # noqa: BLE001 - retry network-level failures
            last_error = exc
            if attempt + 1 < attempts:
                time.sleep(0.25 * (attempt + 1))
    assert last_error is not None
    raise last_error


def extract_pairs(blocks: Iterable[str]) -> list[tuple[str, str]]:
    result: list[tuple[str, str]] = []
    for block in blocks:
        text = html.unescape(block).strip(" \t•·")
        match = PAIR_RE.match(text)
        if not match:
            continue
        word, meaning = (part.strip(" \t.;") for part in match.groups())
        if WORD_RE.match(word) and meaning and meaning.lower() != word.lower():
            result.append((word.lower(), meaning))
    return result


def extract_markdown_pairs(source: str) -> list[tuple[str, str]]:
    result: list[tuple[str, str]] = []
    for line in source.splitlines():
        text = re.sub(r"^\s*[-*+]\s+", "", line).strip()
        if text.startswith("|"):
            cells = [cell.strip() for cell in text.strip("|").split("|")]
            if len(cells) >= 2 and not all(set(cell) <= {"-", ":", " "} for cell in cells):
                candidate = f"{cells[0]}|{cells[1]}"
            else:
                continue
        else:
            candidate = text
        match = PAIR_RE.match(candidate)
        if not match:
            continue
        word, meaning = (part.strip(" \t.;") for part in match.groups())
        if WORD_RE.match(word) and meaning and meaning.lower() != word.lower():
            result.append((word.lower(), meaning))
    return result


def extract_rich_pairs(source: str) -> list[tuple[str, str]]:
    """Extract the word/definition blocks used by the published word pages."""
    result: list[tuple[str, str]] = []
    for match in RICH_PAIR_RE.finditer(source):
        word = html.unescape(re.sub(r"\s+", " ", match.group(1))).strip().lower()
        meaning = html.unescape(re.sub(r"<[^>]+>", " ", match.group(2)))
        meaning = re.sub(r"\s+", " ", meaning).strip(" \t.;：:，,")
        if WORD_RE.match(word) and meaning and meaning.lower() != word:
            result.append((word, meaning))
    return result


def extract_wikilinks(source: str) -> list[str]:
    return [match.group(1).strip() for match in re.finditer(r"\[\[([^\]|#]+)(?:\|[^\]]+)?\]\]", source)]


def safe_name(text: str) -> str:
    text = re.sub(r"[^\w\u4e00-\u9fff-]+", "_", text, flags=re.UNICODE).strip("_.")
    return (text or "category")[:80]


def load_publish_cache(host: str, uid: str, timeout: int) -> dict[str, object]:
    source, _ = fetch(f"https://{host}/cache/{uid}", timeout)
    return json.loads(source)


def cache_page_url(host: str, uid: str, key: str) -> str:
    return encode_url_path(f"https://{host}/access/{uid}/{key}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url", help="Obsidian Publish index URL")
    parser.add_argument("--output", default="data/大学版", help="new output directory")
    parser.add_argument("--manifest", default="data/大学版/manifest.json")
    parser.add_argument("--max-pages", type=int, default=2000)
    parser.add_argument("--timeout", type=int, default=20)
    parser.add_argument("--delay", type=float, default=0.05)
    parser.add_argument("--workers", type=int, default=8, help="parallel page downloads when the public cache is available")
    args = parser.parse_args()

    start = urldefrag(args.url)[0]
    origin = urlparse(start).netloc
    allowed_hosts = {origin, "publish-01.obsidian.md"}
    queue: deque[str] = deque([start])
    seen: set[str] = set()
    pages: list[dict] = []
    categories: dict[str, set[tuple[str, str]]] = defaultdict(set)

    # Obsidian Publish exposes a complete public page index. Prefer it over
    # resolving wiki links as relative URLs: wiki links are vault-global and
    # commonly point outside the current folder.
    cache_keys: list[str] = []
    try:
        shell, _ = fetch(start, args.timeout)
        site_match = re.search(r'window\.siteInfo=\{"uid":"([^"]+)"[^}]*"host":"([^"]+)"', shell)
        if site_match:
            uid, host = site_match.groups()
            options_source, _ = fetch(f"https://{host}/options/{uid}", args.timeout)
            index_file = json.loads(options_source).get("indexFile", "")
            vault_prefix = index_file.split("/", 1)[0]
            cache = load_publish_cache(host, uid, args.timeout)
            cache_keys = [
                key for key in cache
                if key.startswith(vault_prefix + "/")
                and key.endswith(".md")
                and "/英语词根词缀分类数据库/" not in key
            ]
            cache_keys = sorted(cache_keys)[: args.max_pages]
            queue.clear()
            queue.extend(cache_page_url(host, uid, key) for key in cache_keys)
    except Exception as exc:  # noqa: BLE001 - recursive fallback remains usable
        print(f"cache index unavailable, falling back to links: {exc}", file=sys.stderr)

    def process(url: str) -> tuple[str, dict, list[tuple[str, str]], str]:
        source, content_type = fetch_retry(url, args.timeout)
        source_url, resolved_type = normalize_publish_source(url, source)
        source_url = encode_url_path(source_url)
        if source_url != url:
            source, content_type = fetch_retry(source_url, args.timeout)
            url = source_url
        parser_state = PageParser()
        parser_state.feed(source)
        pairs = list(dict.fromkeys(extract_pairs(parser_state.blocks) + extract_markdown_pairs(source) + extract_rich_pairs(source)))
        relative = unquote(urlparse(url).path).split("/access/", 1)[-1]
        key = relative.split("/", 1)[-1] if "/" in relative else relative
        category = safe_name(Path(key).parent.name or Path(key).stem)
        record = {"url": url, "status": "ok", "content_type": resolved_type or content_type, "pairs": len(pairs), "category": category, "sha256": hashlib.sha256(source.encode()).hexdigest()}
        return url, record, pairs, category

    if cache_keys:
        with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
            futures = {executor.submit(process, url): url for url in queue}
            for future in as_completed(futures):
                try:
                    url, record, pairs, category = future.result()
                    seen.add(url)
                    categories[category].update(pairs)
                    pages.append(record)
                except Exception as exc:  # noqa: BLE001 - preserve per-page crawl progress
                    url = futures[future]
                    seen.add(url)
                    pages.append({"url": url, "status": "error", "error": str(exc)})
    while queue and not cache_keys and len(seen) < args.max_pages:
        url = encode_url_path(queue.popleft())
        if url in seen:
            continue
        seen.add(url)
        try:
            source, content_type = fetch(url, args.timeout)
            source_url, resolved_type = normalize_publish_source(url, source)
            source_url = encode_url_path(source_url)
            if source_url != url:
                source, content_type = fetch(source_url, args.timeout)
                url = source_url
            content_type = resolved_type or content_type
        except Exception as exc:  # noqa: BLE001 - preserve per-page crawl progress
            pages.append({"url": url, "status": "error", "error": str(exc)})
            continue
        parser_state = PageParser()
        parser_state.feed(source)
        pairs = extract_pairs(parser_state.blocks) + extract_markdown_pairs(source)
        pairs = list(dict.fromkeys(pairs))
        headings = re.findall(r"^#{1,4}\s+(.+)$", source, flags=re.MULTILINE)
        page_name = Path(unquote(urlparse(url).path)).stem
        title = (headings[0].strip() if headings else next((block for block in parser_state.blocks if len(block) <= 100), page_name or "未命名分类"))
        category = safe_name(title)
        for pair in pairs:
            categories[category].add(pair)
        pages.append({"url": url, "status": "ok", "content_type": content_type, "pairs": len(pairs), "category": category, "sha256": hashlib.sha256(source.encode()).hexdigest()})
        hrefs = parser_state.links + extract_wikilinks(source)
        for href in hrefs:
            if href.startswith("http://") or href.startswith("https://"):
                target = urldefrag(href)[0]
            else:
                target = urldefrag(urljoin(url, href if href.endswith(".md") else f"{href}.md"))[0]
            target = encode_url_path(target)
            parsed = urlparse(target)
            if parsed.scheme in {"http", "https"} and parsed.netloc in allowed_hosts and target not in seen:
                queue.append(target)
        if args.delay:
            time.sleep(args.delay)

    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    total = 0
    all_pairs: set[tuple[str, str]] = set()
    all_words: set[str] = set()
    for category, pairs in sorted(categories.items()):
        if not pairs:
            continue
        path = output / f"{category}.txt"
        with path.open("w", encoding="utf-8", newline="\n") as handle:
            for word, meaning in sorted(pairs):
                handle.write(f"{word}|{meaning}\n")
        total += len(pairs)
        all_pairs.update(pairs)
        all_words.update(word for word, _ in pairs)

    manifest = {
        "source": start,
        "pages": pages,
        "categories": len(categories),
        "words": total,
        "unique_words": len(all_words),
        "unique_pairs": len(all_pairs),
        "duplicate_pair_rows": total - len(all_pairs),
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    manifest_path = Path(args.manifest)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"pages={len(pages)} categories={len(categories)} words={total} output={output}")
    return 0 if total else 2


if __name__ == "__main__":
    sys.exit(main())
