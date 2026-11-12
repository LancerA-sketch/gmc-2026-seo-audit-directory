"""
SchemaGuard Pro v3.0 — Index Directory, Data Shards & Sitemaps Builder
Generates index.html, assets/brands_data_1.js, assets/brands_data_2.js,
sitemap.xml, robots.txt, and .nojekyll (Strictly <= 250 lines).
"""
import os, json, html

BASE_URL = "https://lancera-sketch.github.io/gmc-2026-seo-audit-directory"
CWS_URL = "https://chromewebstore.google.com/detail/dejgbohjjnefmjpiopjgmiafhmgbkadn"
GUMROAD_PRO = "https://vothanh1.gumroad.com/l/istvro"

def esc(val):
    return html.escape(str(val or ""), quote=True)

def write_brand_data_shards(brands, assets_dir):
    os.makedirs(assets_dir, exist_ok=True)
    compact = [{
        "domain": b["domain"], "niche": b["niche"], "title": b["title"], "url": b["url"],
        "price": b["price"], "currency": b["currency"], "score": b["score"], "deduct": b["deduct"],
        "severity": b["severity"], "trap": b["trap"], "dup": b["dup"], "blocks": b["blocks"],
        "stock": b["stock"], "missing": b["missing"], "image": b["image"]
    } for b in brands]

    def format_shard(var_name, items):
        lines = [f"window.{var_name} = ["]
        for i, item in enumerate(items):
            comma = "," if i < len(items) - 1 else ""
            lines.append("  " + json.dumps(item, ensure_ascii=False) + comma)
        lines.append("];")
        return "\n".join(lines) + "\n"

    with open(os.path.join(assets_dir, "brands_data_1.js"), "w", encoding="utf-8") as f:
        f.write(format_shard("BRANDS_PART_1", compact[:160]))
    with open(os.path.join(assets_dir, "brands_data_2.js"), "w", encoding="utf-8") as f:
        f.write(format_shard("BRANDS_PART_2", compact[160:]))

def build_index_html(brands, niches_counter):
    niche_opts = "\n            ".join(
        f'<option value="{esc(n)}">{esc(n)} ({cnt} stores)</option>'
        for n, cnt in sorted(niches_counter.items(), key=lambda kv: -kv[1])
    )
    link_chunks = []
    for i in range(0, len(brands), 8):
        chunk = brands[i:i+8]
        row = " ".join(f'<a href="brands/{esc(b["domain"])}.html">{esc(b["domain"])} ({b["score"]}/100)</a>' for b in chunk)
        link_chunks.append("          " + row)
    crawl_links_html = "\n".join(link_chunks)

    avg_score = round(sum(b["score"] for b in brands) / max(1, len(brands)), 1)
    trap_cnt = sum(1 for b in brands if b["trap"])
    dup_cnt = sum(1 for b in brands if b["dup"])
    ret_cnt = sum(1 for b in brands if "hasMerchantReturnPolicy" in b["missing"])
    ship_cnt = sum(1 for b in brands if "shippingDetails" in b["missing"])
    gtin_cnt = sum(1 for b in brands if "gtin" in b["missing"])

    site_schema = json.dumps({
        "@context": "https://schema.org", "@type": "WebSite",
        "name": "SchemaGuard Pro v3.0 Public GMC Schema Audit Directory (315+ D2C Brands)",
        "url": f"{BASE_URL}/index.html",
        "description": "Search 315+ audited D2C e-commerce brands for 2026 Google Merchant Center & AI GEO Readiness Scores, Variant Stock Traps, and clean JSON-LD patches."
    }, ensure_ascii=False)

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SchemaGuard Pro v3.0 — Public D2C E-Commerce Schema Audit Directory (315+ Brands)</title>
  <meta name="description" content="Search 315+ audited D2C e-commerce brands by domain, niche, or schema error type, or paste live Product HTML/JSON-LD for an instant 12-Point GMC 2026 &amp; AI GEO inspection." />
  <link rel="canonical" href="{BASE_URL}/index.html" />
  <meta property="og:title" content="SchemaGuard Pro v3.0 — Public D2C E-Commerce Schema Audit Directory (315+ Brands)" />
  <meta property="og:description" content="68% of D2C Cosmetics stores fail 2026 GMC ReturnPolicy &amp; ShippingDetails checks. Inspect 315+ audited brands or verify live with our official Chrome Extension." />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="{BASE_URL}/index.html" />
  <meta name="twitter:card" content="summary_large_image" />
  <link rel="stylesheet" href="assets/styles.css" />
  <script type="application/ld+json">{site_schema}</script>
</head>
<body>
  <div class="app-shell">
    <header class="top-header" role="banner">
      <div class="brand-group">
        <a class="brand-mark" href="index.html">SG</a>
        <div><strong>SchemaGuard Pro v3.0 Audit Directory</strong> <span class="status-badge badge-optimal">315 VERIFIED D2C STORES</span></div>
      </div>
      <nav class="nav-links" aria-label="Primary Solutions">
        <a class="btn btn-outline btn-sm" href="#live-inspector-section">12-Point Live Inspector</a>
        <a class="btn btn-outline btn-sm" href="#brand-directory-section">Search 315+ Brands</a>
        <a class="btn btn-outline btn-sm" href="privacy-policy.html">Privacy Policy</a>
        <a class="btn btn-primary btn-sm" href="{CWS_URL}" target="_blank" rel="noopener">Install Free Chrome Extension (Official CWS) ↗</a>
        <a class="btn btn-emerald btn-sm" href="{GUMROAD_PRO}" target="_blank" rel="noopener">Get Pro Suite ($9 / $29 / $99) ↗</a>
      </nav>
    </header>
    <main>
      <section class="hero-banner" aria-labelledby="dir-hero-heading">
        <h1 id="dir-hero-heading">2026 Google Merchant Center &amp; AI GEO Schema Audit Directory (v3.0 Engine)</h1>
        <p>Search across <strong>315+ D2C e-commerce brands</strong> scored with the official 12-criterion SchemaGuard Pro v3.0 engine, paste HTML/JSON-LD below, or <a href="{CWS_URL}" target="_blank" rel="noopener" style="color:#6ee7b7;font-weight:700;">install our free Google-verified Chrome Extension ↗</a> to scan any live Shopify page in 1 click.</p>
      </section>
      <section class="benchmark-strip" aria-label="2026 D2C Industry Schema Benchmarks">
        <div class="benchmark-headline">
          <span class="status-badge badge-critical">2026 INDUSTRY BENCHMARK</span>
          <span>&ldquo;68% of D2C Cosmetics stores fail 2026 GMC ReturnPolicy &amp; ShippingDetails checks&rdquo; — SchemaGuard 315-Store v3.0 Dataset</span>
        </div>
        <div class="benchmark-grid">
          <div class="stat-card"><div class="stat-val">315 Stores</div><div class="stat-lbl">Audited Across 10 D2C E-Commerce Verticals</div></div>
          <div class="stat-card"><div class="stat-val">{avg_score} / 100</div><div class="stat-lbl">Average v3.0 GMC 2026 &amp; GEO Readiness Score</div></div>
          <div class="stat-card"><div class="stat-val">{ret_cnt} / 315</div><div class="stat-lbl">Missing Mandatory ReturnPolicy (-10 pts)</div></div>
          <div class="stat-card"><div class="stat-val">{ship_cnt} / 315</div><div class="stat-lbl">Missing Mandatory ShippingDetails (-10 pts)</div></div>
          <div class="stat-card"><div class="stat-val">{trap_cnt} Stores</div><div class="stat-lbl">Hit Variant #1 Out-Of-Stock Trap (-12 pts)</div></div>
        </div>
      </section>
      <section id="live-inspector-section" class="workspace-grid" aria-label="Interactive 12-Point Product Schema Inspector">
        <article class="saas-card">
          <div class="section-title">
            <span>1. Paste Live Product HTML or JSON-LD (v3.0 Engine)</span>
            <div style="display:flex; gap:6px; flex-wrap:wrap;">
              <button type="button" class="btn btn-outline btn-sm" data-preset="trap">Load Variant Trap Demo</button>
              <button type="button" class="btn btn-outline btn-sm" data-preset="conflict">Load 2x Conflict Demo</button>
              <button type="button" class="btn btn-outline btn-sm" data-preset="optimal">Load 100/100 Demo</button>
            </div>
          </div>
          <textarea id="live-inspector-input" aria-label="Paste Product HTML or JSON-LD" spellcheck="false"></textarea>
          <button id="run-live-audit-btn" type="button" class="btn btn-primary" style="width:100%;">⚡ Run Instant 12-Point GMC 2026 v3.0 Inspection</button>
        </article>
        <article class="saas-card" aria-live="polite">
          <div class="section-title">
            <div><span style="font-size:0.8rem; color:var(--text-secondary); display:block;">12-Point GMC 2026 &amp; GEO Readiness Score</span><strong id="inspector-score" style="font-size:2rem;">22/100</strong></div>
            <div style="display:flex; gap:6px; flex-wrap:wrap;"><span id="inspector-trap-status" class="status-badge badge-critical">VARIANT #1 OOS TRAP (-12 pts)</span><span id="inspector-badge" class="status-badge badge-critical">CRITICAL</span></div>
          </div>
          <div class="progress-track"><div id="inspector-bar" class="progress-fill fill-critical" style="width:22%;"></div></div>
          <ul id="inspector-deductions" style="padding-left:18px; font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px;"></ul>
          <div class="diff-grid" style="margin-bottom:10px; gap:10px;">
            <div><div style="font-size:0.76rem; color:#fda4af; margin-bottom:4px; font-weight:700;">❌ Input Schema</div><pre id="inspector-broken-code" class="code-box broken" style="max-height:135px;"></pre></div>
            <div><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;"><span style="font-size:0.76rem; color:#6ee7b7; font-weight:700;">✅ Clean v3.0 JSON-LD</span><button type="button" class="btn btn-outline btn-sm" data-copy-target="inspector-fixed-code">Copy 1-Click</button></div><pre id="inspector-fixed-code" class="code-box" style="max-height:135px;"></pre></div>
          </div>
          <div class="cta-grid">
            <a class="btn btn-primary" href="{CWS_URL}" target="_blank" rel="noopener">Install Free Chrome Extension (Official CWS) — Scan Live Storefront DOM ↗</a>
            <a class="btn btn-emerald" href="{GUMROAD_PRO}" target="_blank" rel="noopener">Upgrade SchemaGuard Pro v3.0 ($9 Starter | $29 Theme Auto-Patcher | $99 Enterprise GMC Suite) ↗</a>
          </div>
        </article>
      </section>
      <section id="brand-directory-section" class="saas-card" aria-labelledby="directory-heading">
        <div class="section-title">
          <h2 id="directory-heading" style="font-size:1.15rem;">Search 315+ Audited D2C E-Commerce Brands</h2>
          <span id="directory-match-count" class="status-badge badge-optimal">Showing 315 of 315 Audited D2C Brands</span>
        </div>
        <div class="filter-bar" role="search">
          <input type="search" id="dir-search-input" placeholder="Search by domain (e.g. nemoequipment.com), product title, or niche..." aria-label="Search brands by domain, niche, or error" />
          <select id="dir-niche-filter" aria-label="Filter by D2C Niche"><option value="ALL">All 10 D2C Verticals (315 Stores)</option>
            {niche_opts}
          </select>
          <select id="dir-error-filter" aria-label="Filter by Schema Error Type">
            <option value="ALL">All Schema Error Types</option>
            <option value="TRAP">Variant #1 OutOfStock Trap ({trap_cnt} stores)</option>
            <option value="DUP">Duplicate Schema Conflict ({dup_cnt} stores)</option>
            <option value="hasMerchantReturnPolicy">Missing hasMerchantReturnPolicy ({ret_cnt} stores)</option>
            <option value="shippingDetails">Missing shippingDetails ({ship_cnt} stores)</option>
            <option value="gtin">Missing Valid GS1 GTIN / MPN ({gtin_cnt} stores)</option>
            <option value="brand">Missing Brand Entity</option>
          </select>
          <select id="dir-severity-filter" aria-label="Filter by Severity">
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">CRITICAL (&lt;55/100)</option>
            <option value="HIGH">HIGH RISK (55–79/100)</option>
            <option value="OPTIMAL">OPTIMAL (80–100)</option>
          </select>
        </div>
        <div id="directory-brand-grid" class="brand-grid"></div>
      </section>
      <footer class="saas-card" role="contentinfo">
        <div class="section-title">
          <span>Complete Index of All 315 Audited D2C Brand Tear-Sheets</span>
          <div style="display:flex;gap:8px;flex-wrap:wrap;"><a class="btn btn-outline btn-sm" href="privacy-policy.html">Privacy Policy (MV3)</a><a class="btn btn-outline btn-sm" href="sitemap.xml">XML Sitemap (317 URLs)</a></div>
        </div>
        <nav class="seo-crawl-index" aria-label="All 315 Audited Brand Pages">
{crawl_links_html}
        </nav>
      </footer>
    </main>
  </div>
  <script src="assets/auditor_helpers_v30.js"></script>
  <script src="assets/auditor_engine.js"></script>
  <script src="assets/brands_data_1.js"></script>
  <script src="assets/brands_data_2.js"></script>
  <script src="assets/directory_app.js"></script>
</body>
</html>
"""

def write_sitemap_and_robots(brands, out_dir):
    urls = [f"{BASE_URL}/index.html", f"{BASE_URL}/privacy-policy.html"] + [f"{BASE_URL}/brands/{b['domain']}.html" for b in brands]
    xml_lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for i in range(0, len(urls), 2):
        pair = urls[i:i+2]
        line = "  " + " ".join(f"<url><loc>{esc(u)}</loc><lastmod>2026-11-12</lastmod><changefreq>weekly</changefreq><priority>{'1.0' if u.endswith('index.html') else '0.8'}</priority></url>" for u in pair)
        xml_lines.append(line)
    xml_lines.append("</urlset>\n")
    with open(os.path.join(out_dir, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write("\n".join(xml_lines))
    with open(os.path.join(out_dir, "robots.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(["User-agent: *", "Allow: /", "Allow: /brands/", "Allow: /assets/", f"Sitemap: {BASE_URL}/sitemap.xml", ""]))
    with open(os.path.join(out_dir, ".nojekyll"), "w", encoding="utf-8") as f:
        f.write("")
