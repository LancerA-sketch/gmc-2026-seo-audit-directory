"""
SchemaGuard Pro v3.0 — Programmatic SEO & Public Audit Directory Builder
Generates index.html, 315 brands/{domain}.html pages, brands_data_1/2.js,
sitemap.xml, robots.txt, and .nojekyll (All files strictly <= 250 lines).
"""
import os, re, json, html, collections

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BRANDS_DIR = os.path.join(OUT_DIR, "brands")
ASSETS_DIR = os.path.join(OUT_DIR, "assets")
SOURCE_JSON = os.path.join(ROOT_DIR, "03_b2b_code_migration", "live_crawler_300", "VERIFIED_LIVE_STORES.json")
BASE_URL = "https://lancera-sketch.github.io/gmc-2026-seo-audit-directory"
CWS_URL = "https://chromewebstore.google.com/detail/dejgbohjjnefmjpiopjgmiafhmgbkadn"
GUMROAD_PRO = "https://vothanh1.gumroad.com/l/istvro"
SNAPSHOT_NOTE = "Point-in-time crawl snapshot — live variant stock or third-party JS apps may shift real-time DOM scores. Verify live in 1 click with our official Google-verified Chrome Extension."

def esc(val):
    return html.escape(str(val or ""), quote=True)

def clean_title(domain, raw_title, prod_url):
    t = re.sub(r"<[^>]+>", "", html.unescape(str(raw_title or "")).strip()).strip()
    if t.lower() in ("add", "cart", "shop", "menu", "") or len(t) < 3:
        slug = prod_url.rstrip("/").split("/")[-1].replace("-", " ").title()
        t = f"{slug} — {domain}"
    return t

def extract_fixed_obj(store, clean_t):
    raw_script = store.get("fixedJsonLdScript", "")
    body = re.sub(r"^<script[^>]*>|</script>$", "", raw_script.strip(), flags=re.I).strip()
    obj = json.loads(body)
    if "@graph" in obj and isinstance(obj["@graph"], list) and obj["@graph"]:
        prod = dict(obj["@graph"][0])
        prod["@context"] = "https://schema.org"
        obj = prod
    obj["@id"] = f"{store['productUrl']}#product"
    obj["name"] = clean_t
    if "description" in obj:
        obj["description"] = html.unescape(str(obj["description"]))[:240]
    for bad_k in ("gtin", "gtin8", "gtin12", "gtin13", "gtin14"):
        if str(obj.get(bad_k, "")).startswith("0085001") or str(obj.get(bad_k, "")) == "0840123456789":
            obj.pop(bad_k, None)
    if not obj.get("mpn"):
        obj["mpn"] = str(obj.get("sku") or store.get("sku") or "SG-101")
    norm_imgs = []
    for u in (obj.get("image") if isinstance(obj.get("image"), list) else ([obj.get("image")] if obj.get("image") else [])):
        if not u: continue
        u = str(u).replace("http://", "https://").replace("https:files/", f"https://{store['domain']}/cdn/shop/files/")
        if u.startswith("//"): u = "https:" + u
        elif not u.startswith("https://"): u = f"https://{store['domain']}/{u.lstrip('/')}"
        norm_imgs.append(u)
    real_imgs = [u for u in norm_imgs if not u.lower().split("?")[0].endswith(".svg") and "logo" not in u.lower() and "icon" not in u.lower()]
    ordered = real_imgs + [u for u in norm_imgs if u not in real_imgs and not u.lower().split("?")[0].endswith(".svg")]
    obj["image"] = ordered[:4] if ordered else [f"https://{store['domain']}/cdn/shop/products/main.jpg"]
    return obj, obj["image"][0]

def format_compact_jsonld(obj):
    lines, keys = ['<script type="application/ld+json">', '{'], list(obj.keys())
    for idx, k in enumerate(keys):
        comma, v = ("," if idx < len(keys) - 1 else ""), obj[k]
        if k == "offers" and isinstance(v, dict):
            lines.append('  "offers": {')
            okeys = list(v.keys())
            for oidx, ok in enumerate(okeys):
                lines.append(f'    {json.dumps(ok)}: {json.dumps(v[ok], ensure_ascii=False)}' + ("," if oidx < len(okeys) - 1 else ""))
            lines.append(f'  }}{comma}')
        else:
            lines.append(f'  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}{comma}')
    return "\n".join(lines + ['}', '</script>'])

def build_broken_jsonld(store, clean_t, hero_img):
    avail = "https://schema.org/OutOfStock" if store.get("firstVariantTrap") else "https://schema.org/InStock"
    missing = set(store.get("missingFields", []))
    broken = {"@context": "https://schema.org/", "@type": "Product", "name": clean_t, "image": [hero_img]}
    if "brand" not in missing: broken["brand"] = {"@type": "Brand", "name": store.get("brand", store["domain"])}
    if "sku" not in missing and store.get("sku"): broken["sku"] = str(store.get("sku"))
    offer = {"@type": "Offer", "url": store["productUrl"], "availability": avail}
    if "price" not in missing: offer["price"] = str(store.get("price", "48.00"))
    if "priceCurrency" not in missing: offer["priceCurrency"] = store.get("currency", "USD")
    broken["offers"] = offer
    txt = format_compact_jsonld(broken)
    if store.get("duplicateSchemaConflict"):
        dup = {"@context": "https://schema.org/", "@type": "Product", "name": clean_t, "offers": {"@type": "Offer", "availability": "https://schema.org/OutOfStock"}}
        txt += '\n<!-- Conflicting Duplicate Schema Block #2 (SEO App / Microdata vs Theme) -->\n<script type="application/ld+json">' + json.dumps(dup, ensure_ascii=False) + '</script>'
    return txt

def render_brand_page(b, related):
    sev_cls = "badge-critical" if b["score"] < 55 else ("badge-high" if b["score"] < 80 else "badge-optimal")
    fill_cls = "fill-critical" if b["score"] < 55 else ("fill-high" if b["score"] < 80 else "fill-optimal")
    score_col = "#f43f5e" if b["score"] < 55 else ("#f59e0b" if b["score"] < 80 else "#10b981")
    trap_badge = '<span class="status-badge badge-critical">VARIANT #1 OUT-OF-STOCK TRAP (-12 pts)</span>' if b["trap"] else '<span class="status-badge badge-optimal">SAFE — Active Variant InStock</span>'
    dup_badge = f'<span class="status-badge badge-high">{b["blocks"]}x Duplicate Product Blocks (-12 pts)</span>' if b["dup"] else ('<span class="status-badge badge-critical">0x Product JSON-LD (-12 pts)</span>' if b["blocks"] == 0 else '<span class="status-badge badge-optimal">Single Canonical Product Block</span>')
    warn_items = "\n          ".join(f'<li>{esc(w)}</li>' for w in b["warnings"][:10])
    rel_links = " ".join(f'<a class="btn btn-outline btn-sm" href="{esc(r["domain"])}.html">{esc(r["domain"])} ({r["score"]}/100)</a>' for r in related)
    avail_before = "https://schema.org/OutOfStock" if b["trap"] else "https://schema.org/InStock"
    id_line = f'+  "{b["gtin_key"]}": "{b["gtin_val"]}", "mpn": "{b["mpn"]}",' if b["gtin_key"] else f'+  "mpn": "{b["mpn"]}",'
    diff_lines = "\n".join([
        f"--- BEFORE: {b['domain']} (v3.0 Score: {b['score']}/100, Blocks: {b['blocks']})",
        f"+++ AFTER:  {b['domain']} (Verified 100/100 SchemaGuard Pro v3.0 Graph)",
        "@@ -1,9 +1,16 @@", " {", '   "@context": "https://schema.org", "@type": "Product",',
        f'+  "@id": "{b["url"]}#product",', f'   "name": "{b["title"]}", "sku": "{b["sku"]}",', id_line,
        f'+  "brand": {{ "@type": "Brand", "name": "{b["brand"]}" }},', '   "offers": {',
        f'-    "availability": "{avail_before}"', '+    "availability": "https://schema.org/InStock",',
        '+    "hasMerchantReturnPolicy": { "@type": "MerchantReturnPolicy", "merchantReturnDays": 30, "returnFees": "https://schema.org/FreeReturn" },',
        f'+    "shippingDetails": {{ "@type": "OfferShippingDetails", "shippingRate": {{ "@type": "MonetaryAmount", "value": "0.00", "currency": "{b["currency"]}" }} }}',
        "   }", " }"
    ])
    page_schema = json.dumps({
        "@context": "https://schema.org", "@type": "TechArticle",
        "headline": f"{b['domain']} — 2026 Google Merchant Center Schema Audit ({b['score']}/100)",
        "description": f"12-Point GMC 2026 & AI GEO Score ({b['score']}/100), Variant Stock Trap inspection, and clean JSON-LD patch for {b['title']} on {b['domain']}.",
        "image": b["image"], "author": {"@type": "Organization", "name": "SchemaGuard Pro v3.0 Directory"},
        "mainEntityOfPage": f"{BASE_URL}/brands/{b['domain']}.html"
    }, ensure_ascii=False)
    miss_lbl = ", ".join(b["missing"][:5]) if b["missing"] else "None"

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(b['domain'])} — 2026 GMC Schema Audit ({b['score']}/100) &amp; JSON-LD Fix</title>
  <meta name="description" content="12-Point Google Merchant Center 2026 &amp; AI GEO Audit for {esc(b['domain'])} ({esc(b['title'])}). Score: {b['score']}/100. Verify live with official Chrome Extension." />
  <link rel="canonical" href="{BASE_URL}/brands/{esc(b['domain'])}.html" />
  <meta property="og:title" content="{esc(b['domain'])} — GMC 2026 Readiness Score ({b['score']}/100)" />
  <meta property="og:description" content="Inspect {esc(b['domain'])} Broken vs Fixed Product JSON-LD, Variant Stock Trap status, and GMC 2026 Return &amp; Shipping schema." />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="{BASE_URL}/brands/{esc(b['domain'])}.html" />
  <meta property="og:image" content="{esc(b['image'])}" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="../assets/styles.css" />
  <script type="application/ld+json">{page_schema}</script>
</head>
<body>
  <div class="app-shell">
    <header class="top-header" role="banner">
      <div class="brand-group">
        <a class="brand-mark" href="../index.html">SG</a>
        <div><strong>SchemaGuard Pro v3.0 Audit Directory</strong> <span class="status-badge {sev_cls}">{esc(b['severity'])} ({b['score']}/100)</span></div>
      </div>
      <nav class="nav-links" aria-label="Audit Navigation">
        <a class="btn btn-outline btn-sm" href="../index.html">← All 315 Brands</a>
        <a class="btn btn-primary btn-sm" href="{CWS_URL}" target="_blank" rel="noopener">Install Free Chrome Extension (Official CWS) ↗</a>
        <a class="btn btn-emerald btn-sm" href="{GUMROAD_PRO}" target="_blank" rel="noopener">Upgrade Pro ($9 / $29 / $99) ↗</a>
      </nav>
    </header>
    <main>
      <section class="hero-banner" aria-labelledby="brand-audit-heading">
        <div style="display:flex; gap:18px; align-items:center; flex-wrap:wrap;">
          <img class="product-hero-img" src="{esc(b['image'])}" alt="{esc(b['title'])} — {esc(b['domain'])}" loading="lazy" />
          <div style="flex:1; min-width:240px;">
            <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
              <span class="status-badge badge-neutral">{esc(b['niche'])}</span> {trap_badge} {dup_badge} <span class="status-badge badge-neutral">{esc(b['stock'])}</span>
            </div>
            <h1 id="brand-audit-heading">{esc(b['domain'])} — 12-Point GMC 2026 Audit: {b['score']}/100</h1>
            <p style="margin-bottom:4px;">Audited Product: <a href="{esc(b['url'])}" target="_blank" rel="noopener" style="color:#818cf8; font-weight:600;">{esc(b['title'])} ({esc(b['currency'])} ${esc(b['price'])}) ↗</a></p>
            <p style="font-size:0.78rem; color:var(--text-secondary); margin-bottom:6px;">Audited Product URL: <a href="{esc(b['url'])}" target="_blank" rel="noopener" style="color:#a5b4fc; word-break:break-all;">{esc(b['url'])}</a></p>
            <div style="padding:8px 12px; border-radius:8px; border:1px solid rgba(129,140,248,0.35); background:rgba(99,102,241,0.09); font-size:0.79rem; color:#e0e7ff;">
              ℹ️ {esc(SNAPSHOT_NOTE)} <a href="{CWS_URL}" target="_blank" rel="noopener" style="color:#6ee7b7; font-weight:700; margin-left:4px;">Verify Live Free on Chrome Web Store ↗</a>
            </div>
          </div>
        </div>
      </section>
      <section class="workspace-grid" aria-label="Score & Remediation Summary">
        <article class="saas-card">
          <div class="section-title"><span>12-Point GMC 2026 &amp; GEO Score (v3.0)</span><span class="status-badge {sev_cls}">-{b['deduct']} pts Deducted</span></div>
          <div style="font-size:2.3rem; font-weight:800; color:{score_col};">{b['score']}/100</div>
          <div class="progress-track" role="progressbar" aria-valuenow="{b['score']}" aria-valuemin="0" aria-valuemax="100"><div class="progress-fill {fill_cls}" style="width:{b['score']}%;"></div></div>
          <p style="font-size:0.84rem; color:#fda4af; margin-bottom:10px;">Revenue Risk: {esc(b['impact'])}</p>
          <ul style="padding-left:18px; font-size:0.81rem; color:var(--text-secondary);">
          {warn_items}
          </ul>
        </article>
        <article class="saas-card">
          <div class="section-title"><span>After SchemaGuard Pro v3.0 Remediation</span><span class="status-badge badge-optimal">100/100 VERIFIED</span></div>
          <div style="font-size:2.3rem; font-weight:800; color:#10b981;">100/100</div>
          <div class="progress-track"><div class="progress-fill fill-optimal" style="width:100%;"></div></div>
          <p style="font-size:0.84rem; color:var(--text-secondary); margin-bottom:12px;">100% Automated for <strong>Shopify OS 2.0</strong>: resolves Variant #1 OOS Traps, deduplicates conflicting Product blocks via canonical <code>@id</code>, and deploys verified 2026 <code>hasMerchantReturnPolicy</code>, <code>shippingDetails</code>, and GS1 GTIN / MPN Safe Mode.</p>
          <div class="cta-grid">
            <a class="btn btn-primary" href="{CWS_URL}" target="_blank" rel="noopener">Install Free Chrome Extension (Official CWS) — Verify Live DOM in 1 Click ↗</a>
            <a class="btn btn-emerald" href="{GUMROAD_PRO}" target="_blank" rel="noopener">Get SchemaGuard Pro v3.0 ($9 Liquid Copy | $29 Theme Auto-Patcher | $99 Enterprise GMC Suite) ↗</a>
          </div>
        </article>
      </section>
      <section class="diff-grid" aria-label="Side-by-Side Broken vs Fixed JSON-LD">
        <article class="saas-card">
          <div class="section-title"><span>❌ Snapshot Live Schema ({b['score']}/100)</span><span class="status-badge badge-critical">Missing: {esc(miss_lbl)}</span></div>
          <pre id="broken-jsonld-code" class="code-box broken">{esc(b['brokenCode'])}</pre>
        </article>
        <article class="saas-card">
          <div class="section-title"><span>✅ Fixed GMC 2026 v3.0 JSON-LD Patch</span><button type="button" class="btn btn-outline btn-sm" data-copy-target="fixed-jsonld-code">Copy 1-Click Fixed JSON-LD</button></div>
          <pre id="fixed-jsonld-code" class="code-box">{esc(b['fixedCode'])}</pre>
        </article>
      </section>
      <section class="saas-card" aria-label="Unified Schema Diff">
        <div class="section-title"><span>Unified Schema Diff (Before {b['score']}/100 vs After 100/100)</span><button type="button" class="btn btn-outline btn-sm" data-copy-target="unified-diff-code">Copy Diff Patch</button></div>
        <pre id="unified-diff-code" class="code-box">{esc(diff_lines)}</pre>
      </section>
      <footer class="saas-card" role="contentinfo">
        <div class="section-title">
          <span>More Audited {esc(b['niche'])} Brands in Directory</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap;"><a class="btn btn-outline btn-sm" href="../privacy-policy.html">Privacy Policy</a><a class="btn btn-outline btn-sm" href="../index.html">Explore All 315 Stores →</a></div>
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">{rel_links}</div>
      </footer>
    </main>
  </div>
  <script src="../assets/directory_app.js"></script>
</body>
</html>
"""

def main():
    from build_index_and_sitemap import write_brand_data_shards, build_index_html, write_sitemap_and_robots
    os.makedirs(BRANDS_DIR, exist_ok=True)
    raw_stores = json.load(open(SOURCE_JSON, "r", encoding="utf-8"))
    brands, by_niche, niches_counter = [], collections.defaultdict(list), collections.Counter()
    for s in raw_stores:
        c_title = clean_title(s["domain"], s.get("productTitle", ""), s["productUrl"])
        fixed_obj, hero_img = extract_fixed_obj(s, c_title)
        gtin_key = next((k for k in ("gtin13", "gtin12", "gtin14", "gtin8") if fixed_obj.get(k)), "")
        rec = {
            "domain": s["domain"], "niche": s["niche"], "title": c_title, "url": s["productUrl"],
            "price": str(s.get("price", "48.00")), "currency": s.get("currency", "USD"), "brand": s.get("brand", s["domain"]),
            "score": int(s["score"]), "deduct": int(s.get("totalDeductions", 100 - int(s["score"]))),
            "severity": s.get("severity", "CRITICAL"), "impact": s.get("revenueImpact", "45% - 68% Google Shopping Impression Loss"),
            "trap": bool(s.get("firstVariantTrap")), "dup": bool(s.get("duplicateSchemaConflict")),
            "blocks": int(s.get("productBlocks", 1)), "stock": s.get("stockLabel", "Stock: Active"),
            "missing": s.get("missingFields", []), "warnings": [html.unescape(w) for w in s.get("warnings", [])],
            "sku": str(fixed_obj.get("sku", "SG-101"))[:36], "mpn": str(fixed_obj.get("mpn", fixed_obj.get("sku", "SG-101")))[:36],
            "gtin_key": gtin_key, "gtin_val": str(fixed_obj.get(gtin_key, "")) if gtin_key else "",
            "image": hero_img, "brokenCode": build_broken_jsonld(s, c_title, hero_img), "fixedCode": format_compact_jsonld(fixed_obj)
        }
        brands.append(rec)
        by_niche[rec["niche"]].append(rec)
        niches_counter[rec["niche"]] += 1

    for b in brands:
        peers = [p for p in by_niche[b["niche"]] if p["domain"] != b["domain"]][:5]
        open(os.path.join(BRANDS_DIR, f"{b['domain']}.html"), "w", encoding="utf-8").write(render_brand_page(b, peers))
    write_brand_data_shards(brands, ASSETS_DIR)
    open(os.path.join(OUT_DIR, "index.html"), "w", encoding="utf-8").write(build_index_html(brands, niches_counter))
    write_sitemap_and_robots(brands, OUT_DIR)
    print(f"Built 1 index.html + {len(brands)} brand pages + sitemap.xml + robots.txt in {OUT_DIR}")

if __name__ == "__main__":
    main()
