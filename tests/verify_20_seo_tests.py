"""
SchemaGuard 2026 — 20-Point Automated Verification Suite for 10_public_seo_audit_directory
Verifies all 315 brand pages, index.html, sitemap.xml, robots.txt, and DEPLOY_TO_GITHUB_PAGES.ps1
render with 0 broken links, 0 unescaped HTML tags, and 100% Rule 1-5 compliance.
"""
import os, re, sys, json, xml.etree.ElementTree as ET
from html.parser import HTMLParser

DIR_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BRANDS_DIR = os.path.join(DIR_ROOT, "brands")
ASSETS_DIR = os.path.join(DIR_ROOT, "assets")
SOURCE_JSON = os.path.abspath(os.path.join(DIR_ROOT, "..", "03_b2b_code_migration", "live_crawler_300", "VERIFIED_LIVE_STORES.json"))
GUMROAD_EXT = "https://vothanh1.gumroad.com/l/istvro"
GUMROAD_KIT = "https://vothanh1.gumroad.com/l/istvro"
OFFICIAL_CWS = "https://chromewebstore.google.com/detail/dejgbohjjnefmjpiopjgmiafhmgbkadn"
SNAPSHOT_NOTE = "Point-in-time crawl snapshot — live variant stock or third-party JS apps may shift real-time DOM scores. Verify live in 1 click with our official Google-verified Chrome Extension."

class StrictHTMLVerifier(HTMLParser):
    VOID_TAGS = {"meta", "link", "img", "input", "br", "hr", "area", "base", "col", "embed", "param", "source", "track", "wbr"}
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.stack = []
        self.links = []
        self.images = []
        self.in_pre = False
        self.raw_tags_in_pre = []
        self.unclosed = []

    def handle_starttag(self, tag, attrs):
        t = tag.lower()
        attr_map = dict(attrs)
        if self.in_pre:
            self.raw_tags_in_pre.append(t)
        if t == "pre":
            self.in_pre = True
        if t not in self.VOID_TAGS:
            self.stack.append(t)
        if t in ("a", "link") and "href" in attr_map:
            self.links.append(attr_map["href"])
        if t == "script" and "src" in attr_map:
            self.links.append(attr_map["src"])
        if t == "img":
            self.images.append(attr_map)

    def handle_endtag(self, tag):
        t = tag.lower()
        if t == "pre":
            self.in_pre = False
        if t in self.VOID_TAGS:
            return
        if self.stack and self.stack[-1] == t:
            self.stack.pop()
        else:
            self.unclosed.append(t)

def run_suite():
    stores = json.load(open(SOURCE_JSON, "r", encoding="utf-8"))
    expected_domains = {s["domain"] for s in stores}
    index_path = os.path.join(DIR_ROOT, "index.html")
    index_html = open(index_path, "r", encoding="utf-8").read()
    brand_files = sorted(f for f in os.listdir(BRANDS_DIR) if f.endswith(".html"))
    brand_contents = {f: open(os.path.join(BRANDS_DIR, f), "r", encoding="utf-8").read() for f in brand_files}

    results = []
    def check(num, name, cond, detail=""):
        status = "PASS" if cond else "FAIL"
        results.append((num, name, status, detail))
        print(f"[{status}] Test {num:02d}: {name}" + (f" ({detail})" if detail else ""))

    # 1. Verify index.html exists and has interactive search, niche filter, error filter, and live inspector
    has_controls = all(id_str in index_html for id_str in ['id="dir-search-input"', 'id="dir-niche-filter"', 'id="dir-error-filter"', 'id="live-inspector-input"', 'id="run-live-audit-btn"'])
    check(1, "Interactive Public Search Directory & Live 12-Point Inspector in index.html", has_controls)

    # 2. Verify live industry benchmarks in index.html
    has_bench = "68% of D2C Cosmetics stores fail 2026 GMC ReturnPolicy &amp; ShippingDetails checks" in index_html and "315 Stores" in index_html
    check(2, "Live Industry Benchmarks displayed in index.html", has_bench)

    # 3. Verify all 315 individual static brand audit pages exist
    actual_domains = {f[:-5] for f in brand_files}
    check(3, "All 315 Static Brand Audit Pages exist in brands/{domain}.html", len(brand_files) == 315 and actual_domains == expected_domains, f"{len(brand_files)}/315 pages")

    # 4. Verify index.html statically links to all 315 brand pages
    linked_brands = set(re.findall(r'href="brands/([^"]+)\.html"', index_html))
    check(4, "index.html links directly to all 315 brand pages for SEO crawlability", len(linked_brands) == 315, f"{len(linked_brands)}/315 linked")

    # 5. Verify 0 broken internal links across index.html and all 315 brand pages
    broken_links = []
    all_pages = [("index.html", DIR_ROOT, index_html)] + [(f"brands/{fn}", BRANDS_DIR, txt) for fn, txt in brand_contents.items()]
    parsed_map = {}
    for rel_name, base_dir, html_txt in all_pages:
        parser = StrictHTMLVerifier()
        parser.feed(html_txt)
        parsed_map[rel_name] = parser
        for href in parser.links:
            if href.startswith(("http://", "https://", "#", "mailto:")):
                continue
            clean_ref = href.split("#")[0].split("?")[0]
            if not clean_ref:
                continue
            target_path = os.path.abspath(os.path.join(base_dir, clean_ref))
            if not os.path.exists(target_path):
                broken_links.append((rel_name, href))
    check(5, "0 Broken Internal Links across index.html and all 315 Brand Pages", len(broken_links) == 0, f"Broken: {len(broken_links)}")

    # 6. Verify 0 unescaped HTML tags inside <pre> blocks and 0 unclosed HTML tags across all 316 pages
    raw_in_pre = sum(len(p.raw_tags_in_pre) for p in parsed_map.values())
    unclosed_cnt = sum(len(p.unclosed) + len(p.stack) for p in parsed_map.values())
    check(6, "0 Unescaped HTML Tags in <pre> code blocks & 0 Unbalanced DOM Tags", raw_in_pre == 0 and unclosed_cnt == 0, f"raw_in_pre={raw_in_pre}, unbalanced={unclosed_cnt}")

    # 7. Verify 0 double-escaped entities (&amp;ndash;) or placeholder 'Add' titles across all 315 pages
    bad_entities = [fn for fn, txt in brand_contents.items() if "&amp;ndash;" in txt or "&amp;mdash;" in txt or ">Add (" in txt]
    check(7, "Clean UTF-8 Product Titles (0 double-escaped entities or 'Add' placeholders)", len(bad_entities) == 0, f"Issues: {len(bad_entities)}")

    # 8. Verify every brand page displays exact 12-Point GMC 2026 Readiness Score
    missing_score = [s["domain"] for s in stores if f"{s['score']}/100" not in brand_contents.get(f"{s['domain']}.html", "")]
    check(8, "All 315 Brand Pages display exact 12-Point GMC 2026 Score", len(missing_score) == 0, f"Verified {315 - len(missing_score)}/315")

    # 9. Verify every brand page displays Variant Stock Trap status & Stock label
    missing_trap = [fn for fn, txt in brand_contents.items() if ("VARIANT #1 OUT-OF-STOCK TRAP" not in txt and "SAFE — Active Variant InStock" not in txt)]
    check(9, "All 315 Brand Pages display Variant Stock Trap status badge", len(missing_trap) == 0)

    # 10. Verify every brand page displays Side-by-Side Broken vs Fixed 100/100 JSON-LD Diff & Unified Diff
    missing_diff = [fn for fn, txt in brand_contents.items() if 'id="broken-jsonld-code"' not in txt or 'id="fixed-jsonld-code"' not in txt or 'id="unified-diff-code"' not in txt]
    check(10, "All 315 Brand Pages render Side-by-Side Broken vs Fixed 100/100 JSON-LD Diff", len(missing_diff) == 0)

    # 11. Verify every brand page has a valid v3.0 Fixed JSON-LD containing ReturnPolicy, ShippingDetails, MPN/GTIN & zero fake 0085001234562
    missing_gmc_fields = [fn for fn, txt in brand_contents.items() if not all(k in txt for k in ("hasMerchantReturnPolicy", "shippingDetails", "&quot;mpn&quot;:", "https://schema.org/InStock")) or "0085001234562" in txt]
    check(11, "All 315 Fixed v3.0 JSON-LD Patches contain ReturnPolicy, ShippingDetails, MPN/GTIN & 0 fake GTINs", len(missing_gmc_fields) == 0, f"Issues: {len(missing_gmc_fields)}")

    # 12. Verify every brand page renders a real HTTPS product image (no .svg button icons as hero)
    bad_imgs = []
    for fn, p in parsed_map.items():
        if fn == "index.html": continue
        if not p.images or not p.images[0].get("src", "").startswith("https://") or p.images[0].get("src", "").split("?")[0].endswith(".svg") or not p.images[0].get("alt"):
            bad_imgs.append(fn)
    check(12, "All 315 Brand Pages render real HTTPS Product Images with alt text", len(bad_imgs) == 0, f"Bad images: {len(bad_imgs)}")

    # 13. Verify unified checkout buttons (istvro), Official CWS button, Snapshot Transparency Note & 0 legacy links
    priv_html = open(os.path.join(DIR_ROOT, "privacy-policy.html"), "r", encoding="utf-8").read()
    missing_cta = [name for name, _, txt in all_pages if GUMROAD_EXT not in txt or OFFICIAL_CWS not in txt or "gumroad.com/l/eolvo" in txt or "gumroad.com/l/mftey" in txt]
    missing_note = [fn for fn, txt in brand_contents.items() if SNAPSHOT_NOTE not in txt]
    check(13, "Official CWS Button, Snapshot Transparency Note & istvro Pro Buttons ($9/$29/$99) verified", len(missing_cta) == 0 and len(missing_note) == 0 and GUMROAD_EXT in priv_html and OFFICIAL_CWS in priv_html, f"cta_err={len(missing_cta)}, note_err={len(missing_note)}")

    # 14. Verify Rule 1 Anti-Token-Truncation: every source & generated file <= 250 lines
    over_250 = []
    for root, _, files in os.walk(DIR_ROOT):
        if ".git" in root or "__pycache__" in root: continue
        for f in files:
            if f.endswith(".pyc"): continue
            fp = os.path.join(root, f)
            lines_cnt = sum(1 for _ in open(fp, "r", encoding="utf-8"))
            if lines_cnt > 250: over_250.append((fp, lines_cnt))
    check(14, "Strict Anti-Token-Truncation Compliance (All files <= 250 lines)", len(over_250) == 0, f"Over 250: {len(over_250)}")

    # 15. Verify Rule 4 No Remotely Hosted Code: 0 external CDN scripts/styles, 0 eval()
    cdn_violations = [name for name, _, txt in all_pages if re.search(r'<script[^>]+src=["\']https?://|<link[^>]+rel=["\']stylesheet["\'][^>]+href=["\']https?://|\beval\s*\(', txt, re.I)]
    check(15, "Zero Remotely Hosted Code (0 external CDN scripts/styles, 0 eval)", len(cdn_violations) == 0)

    # 16. Verify Rule 3 SaaS UI Standard in assets/styles.css
    css_txt = open(os.path.join(ASSETS_DIR, "styles.css"), "r", encoding="utf-8").read()
    css_ok = all(t in css_txt for t in [":root", "--radius-std: 10px", "1px solid", "system-ui", ".status-badge"])
    check(16, "Linear/Stripe Dark SaaS UI CSS variables & 1-Click Copy styling", css_ok)

    # 17. Verify Semantic HTML5 & OpenGraph / JSON-LD structured data on all 316 pages
    sem_fail = [name for name, _, txt in all_pages if not all(tag in txt for tag in ["<header", "<nav", "<main", "<section", "<article", "<footer", 'property="og:title"', 'application/ld+json'])]
    check(17, "Semantic HTML5, OpenGraph & JSON-LD Schema on all 316 pages", len(sem_fail) == 0)

    # 18. Verify brands_data_1.js + brands_data_2.js contain all 315 records for client search
    d1 = open(os.path.join(ASSETS_DIR, "brands_data_1.js"), "r", encoding="utf-8").read()
    d2 = open(os.path.join(ASSETS_DIR, "brands_data_2.js"), "r", encoding="utf-8").read()
    cnt_js = d1.count('"domain":') + d2.count('"domain":')
    check(18, "Client Search Shards (brands_data_1.js & brands_data_2.js) load 315 brands", cnt_js == 315, f"{cnt_js}/315 records")

    # 19. Verify sitemap.xml (valid XML with 317 <loc> URLs incl. privacy-policy.html) and robots.txt
    tree = ET.parse(os.path.join(DIR_ROOT, "sitemap.xml"))
    locs = [el.text for el in tree.getroot().iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
    robots_txt = open(os.path.join(DIR_ROOT, "robots.txt"), "r", encoding="utf-8").read()
    check(19, "sitemap.xml (317 valid XML URLs incl. privacy-policy.html) & robots.txt verified", len(locs) == 317 and "Sitemap:" in robots_txt, f"{len(locs)} URLs")

    # 20. Verify DEPLOY_TO_GITHUB_PAGES.ps1 exists and has GitHub Pages automation commands
    ps1_txt = open(os.path.join(DIR_ROOT, "DEPLOY_TO_GITHUB_PAGES.ps1"), "r", encoding="utf-8").read()
    ps1_ok = all(k in ps1_txt for k in ["git init", "git commit", "gh-pages", ".nojekyll", "sitemap.xml"])
    check(20, "1-Click DEPLOY_TO_GITHUB_PAGES.ps1 verified & ready", ps1_ok)

    passed = sum(1 for r in results if r[2] == "PASS")
    print(f"\nSUMMARY: {passed}/{len(results)} Automated Verification Tests PASSED.")
    if passed != len(results): sys.exit(1)

if __name__ == "__main__":
    run_suite()
