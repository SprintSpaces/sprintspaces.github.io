#!/usr/bin/env python3
"""Generate crawlable English HTML from the Polish pages, without dependencies.

Polish HTML is the shared layout; locales/en.json translates text and accessible
labels. Missing translations fail the build instead of publishing mixed copy.
Run with --check in CI to detect stale output, or without it to regenerate.
"""
import argparse
import json
import re
from html import escape, unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://sprintspaces.github.io"
PAGES = {
    "index.html": "en/index.html",
    "prywatnosc.html": "en/privacy.html",
    "brand/index.html": "en/brand/index.html",
}
URLS = {"/": "/en/", "/index.html": "/en/", "/prywatnosc.html": "/en/privacy.html",
        "/brand/": "/en/brand/", "/brand/index.html": "/en/brand/"}
LABELS = {"alt", "aria-label", "title", "placeholder", "data-zoom"}


class EnglishPage(HTMLParser):
    def __init__(self, source, translations):
        super().__init__(convert_charrefs=False)
        self.base = ORIGIN + "/" + source
        self.translations = translations
        self.output = []

    def translate(self, value):
        text = unescape(value).strip()
        if not any(c.isalpha() for c in text):
            return value
        if text not in self.translations:
            raise ValueError(f"Missing English translation: {text}")
        return re.sub(r"\S(?:[\s\S]*\S)?", lambda _: self.translations[text], unescape(value), count=1)

    def link(self, value):
        if not value or value.startswith("#"):
            return value
        url = urlsplit(urljoin(self.base, value))
        if f"{url.scheme}://{url.netloc}" != ORIGIN:
            return value
        localized = urlunsplit(("", "", URLS.get(url.path, url.path), url.query, url.fragment))
        return ORIGIN + localized if value.startswith(ORIGIN) else localized

    def start(self, tag, attrs, ending):
        original = dict(attrs)
        result = []
        for key, value in attrs:
            if value is None:
                result.append(key)
                continue
            if key in LABELS or (key == "content" and (
                original.get("name") == "description" or original.get("property") in {"og:title", "og:description", "og:image:alt"}
            )) or (key == "value" and original.get("name") == "_subject"):
                value = self.translate(value)
            elif tag == "html" and key == "lang":
                value = "en"
            elif key in {"href", "src"} and not (
                original.get("rel") == "alternate" or "data-language-link" in original
            ):
                value = self.link(value)
            elif key == "content" and original.get("property") == "og:url":
                value = self.link(value)
            elif key == "content" and original.get("property") == "og:image":
                value = ORIGIN + "/assets/social-card-en.png?v=20261026"
            elif key == "content" and original.get("property") in {"og:locale", "og:locale:alternate"}:
                value = "en_GB" if original["property"] == "og:locale" else "pl_PL"
            elif key == "value" and original.get("name") == "source":
                value = self.link(value)
            elif key == "aria-current" and "data-language-link" in original:
                continue
            result.append(f'{key}="{escape(value, quote=True)}"')
        if original.get("data-language-link") == "en":
            result.append('aria-current="page"')
        self.output.append("<" + tag + (" " + " ".join(result) if result else "") + ending)

    def handle_starttag(self, tag, attrs):
        self.start(tag, attrs, ">")

    def handle_startendtag(self, tag, attrs):
        self.start(tag, attrs, "/>")

    def handle_endtag(self, tag):
        self.output.append(f"</{tag}>")

    def handle_data(self, data):
        self.output.append(escape(self.translate(data), quote=False))

    def handle_decl(self, decl):
        self.output.append(f"<!{decl}>")

    def handle_comment(self, data):
        self.output.append(f"<!--{data}-->")

    def handle_entityref(self, name):
        self.output.append(f"&{name};")

    def handle_charref(self, name):
        self.output.append(f"&#{name};")


def build(check=False):
    translations = json.loads((ROOT / "locales/en.json").read_text())
    # Validate every page before writing any output.
    outputs = {}
    # Runtime calls use literal t('…') keys. The two existing public constants
    # below are also translated at the display boundary. Ship only these strings.
    runtime_keys = set()
    for source in ["app.js", "demo.js", "demo-core.mjs"]:
        runtime_keys.update(re.findall(r"\bt\('([^'\n]+)'", (ROOT / source).read_text()))
    core = (ROOT / "demo-core.mjs").read_text().split("export const FIRST_LOGIN = {", 1)[1].split("};", 1)[0]
    runtime_keys.update(re.findall(r": '([^']+)'", core))
    runtime_keys.add(re.search(r"LAUNCH_ESTIMATE = '([^']+)'", (ROOT / "demo-launch.mjs").read_text())[1])
    runtime = {key: translations[key] for key in sorted(runtime_keys)}
    outputs["locales/runtime-en.mjs"] = "// Generated by tools/build-locales.py; edit locales/en.json.\nexport default " + json.dumps(runtime, ensure_ascii=False, indent=2) + ";\n"
    for source, target in PAGES.items():
        page = EnglishPage(source, translations)
        page.feed((ROOT / source).read_text())
        outputs[target] = "<!-- Generated by tools/build-locales.py; edit Polish HTML and locales/en.json. -->\n" + "".join(page.output)
    for target, html in outputs.items():
        path = ROOT / target
        if check:
            if not path.exists() or path.read_text() != html:
                raise ValueError(f"Stale {target}; run python3 tools/build-locales.py")
        else:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(html)
    print(f"{'Checked' if check else 'Generated'} {len(PAGES)} English pages and runtime translations.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    build(args.check)
