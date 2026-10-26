import importlib.util
import unittest
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://sprintspaces.github.io"
spec = importlib.util.spec_from_file_location("build_locales", ROOT / "tools/build-locales.py")
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.tags = []
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        self.tags.append((tag, dict(attrs)))

    def attrs(self, tag):
        return [attrs for name, attrs in self.tags if name == tag]


class LocalesTest(unittest.TestCase):
    def test_generated_pages_and_runtime_are_current(self):
        build.build(check=True)

    def test_unknown_copy_fails_instead_of_publishing_polish_in_english(self):
        page = build.EnglishPage("index.html", {})
        with self.assertRaisesRegex(ValueError, "Missing English translation"):
            page.feed("<p>Nowa treść</p>")

    def test_all_page_pairs_have_reciprocal_seo_and_accessible_switches(self):
        for pl_file, en_file in build.PAGES.items():
            pl_url = "/" if pl_file == "index.html" else "/brand/" if pl_file == "brand/index.html" else "/" + pl_file
            en_url = build.URLS[pl_url]
            expected = {"pl": ORIGIN + pl_url, "en": ORIGIN + en_url, "x-default": ORIGIN + pl_url}
            for lang, file, url in [("pl", pl_file, pl_url), ("en", en_file, en_url)]:
                with self.subTest(file=file):
                    page = Page(ROOT / file)
                    self.assertEqual(page.attrs("html")[0]["lang"], lang)
                    links = page.attrs("link")
                    self.assertEqual([a["href"] for a in links if a.get("rel") == "canonical"], [ORIGIN + url])
                    self.assertEqual({a["hreflang"]: a["href"] for a in links if a.get("rel") == "alternate"}, expected)
                    switches = [a for a in page.attrs("a") if "data-language-link" in a]
                    self.assertEqual({a["hreflang"]: ORIGIN + a["href"] for a in switches}, {k: v for k, v in expected.items() if k != "x-default"})
                    self.assertEqual([a["lang"] for a in switches if a.get("aria-current") == "page"], [lang])

    def test_local_assets_links_and_fragments_resolve_in_both_languages(self):
        for file in [*build.PAGES, *build.PAGES.values()]:
            page = Page(ROOT / file)
            ids = [attrs["id"] for _, attrs in page.tags if "id" in attrs]
            self.assertEqual(len(ids), len(set(ids)), file)
            for _, attrs in page.tags:
                for key in ["href", "src"]:
                    if key not in attrs:
                        continue
                    url = urlsplit(urljoin(ORIGIN + "/" + file, attrs[key]))
                    if url.netloc != "sprintspaces.github.io":
                        continue
                    target = ROOT / url.path.lstrip("/")
                    if target.is_dir():
                        target /= "index.html"
                    self.assertTrue(target.is_file(), f"{file}: {attrs[key]}")
                    if url.fragment and target.suffix == ".html":
                        target_ids = {a.get("id") for _, a in Page(target).tags}
                        self.assertIn(url.fragment, target_ids, f"{file}: {attrs[key]}")

    def test_demo_and_contact_configuration_match(self):
        pages = [Page(ROOT / file) for file in ["index.html", "en/index.html"]]
        endpoints = [[a["content"] for a in p.attrs("meta") if a.get("name") == "demo-api"] for p in pages]
        self.assertEqual(endpoints[0], endpoints[1])
        forms = [[a for a in p.attrs("form") if a.get("id") == "contact-form"][0] for p in pages]
        self.assertEqual(forms[0]["action"], forms[1]["action"])
        self.assertEqual(forms[0]["method"], "POST")

    def test_sitemap_lists_both_indexable_landing_pages(self):
        sitemap = ElementTree.parse(ROOT / "sitemap.xml")
        locations = {node.text for node in sitemap.findall(".//{*}loc")}
        self.assertEqual(locations, {ORIGIN + "/", ORIGIN + "/en/"})
        for file in ["index.html", "en/index.html"]:
            self.assertFalse(any(a.get("name") == "robots" and "noindex" in a.get("content", "") for a in Page(ROOT / file).attrs("meta")))


if __name__ == "__main__":
    unittest.main()
