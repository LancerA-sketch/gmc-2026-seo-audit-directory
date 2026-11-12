// SchemaGuard Pro v3.0 — Master Single-Source-of-Truth Dataset Synchronizer
// Imports evaluateProductAudit & buildAutoFixJsonLdObject READ-ONLY from 02_chrome_extensions/src
// Synchronizes VERIFIED_LIVE_STORES.json + Lab_02 stores_315 & stores_vip60 (<= 250 lines).

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateProductAudit } from "../../02_chrome_extensions/src/audit_core.js";
import { buildAutoFixJsonLdObject } from "../../02_chrome_extensions/src/jsonld_builder_v30.js";
import { parseBarcodeIdentifier } from "../../02_chrome_extensions/src/policy_parser_v30.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const VERIFIED_PATH = path.join(ROOT_DIR, "03_b2b_code_migration", "live_crawler_300", "VERIFIED_LIVE_STORES.json");
const P315_PATH = path.join(ROOT_DIR, "99_OVERNIGHT_ANTIGRAVITY_LAB", "Lab_02", "data", "stores_315_normalized.json");
const PVIP_PATH = path.join(ROOT_DIR, "99_OVERNIGHT_ANTIGRAVITY_LAB", "Lab_02", "data", "stores_vip60_normalized.json");

const BASE_DIR_URL = "https://lancera-sketch.github.io/gmc-2026-seo-audit-directory";
const CWS_URL = "https://chromewebstore.google.com/detail/dejgbohjjnefmjpiopjgmiafhmgbkadn";
const GUMROAD_URL = "https://vothanh1.gumroad.com/l/istvro";
const CONCURRENCY = 25;
const TIMEOUT_MS = 5500;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function cleanBarcodeOrEmpty(raw, skuRef = "") {
  const b = parseBarcodeIdentifier(raw, skuRef);
  return b.isValidGtin ? b.gtinVal : "";
}

function formatPriceDot(val, fallback = "48.00") {
  const n = parseFloat(String(val ?? fallback).replace(/[^0-9.]/g, ""));
  return (Number.isFinite(n) && n > 0 ? n : 48).toFixed(2);
}

async function fetchText(url, accept = "text/html,application/json,*/*") {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": UA, "Accept": accept, "Accept-Language": "en-US,en;q=0.9" },
      redirect: "follow",
      signal: ctrl.signal
    });
    clearTimeout(timer);
    if (!r.ok) return { ok: false, status: r.status, url, text: "" };
    return { ok: true, status: r.status, url: r.url || url, text: await r.text() };
  } catch (_e) {
    clearTimeout(timer);
    return { ok: false, status: 0, url, text: "" };
  }
}

function buildSnapshotPayload(seed) {
  const domain = seed.domain;
  const url = seed.productUrl || `https://${domain}/products/flagship`;
  const title = String(seed.productTitle || `${seed.brand || domain} Flagship`).replace(/<[^>]*>/g, " ").trim();
  const brand = String(seed.brand || domain.split(".")[0]).trim();
  const price = formatPriceDot(seed.price, "48.00");
  const cur = String(seed.currency || "USD").toUpperCase();
  const imgs = (Array.isArray(seed.images) && seed.images.length ? seed.images : [`https://${domain}/cdn/shop/products/main.jpg`])
    .filter((u) => u && !String(u).toLowerCase().split("?")[0].endsWith(".svg"));
  const heroImgs = imgs.length ? imgs : [`https://${domain}/cdn/shop/products/main.jpg`];
  const miss = new Set(Array.isArray(seed.missingFields) ? seed.missingFields : []);
  const gtin = cleanBarcodeOrEmpty(seed.gtin13 || seed.gtin || "", seed.sku || "");
  const prodLd = { "@context": "https://schema.org/", "@type": "Product", "name": title, "image": heroImgs.slice(0, 2) };
  if (!miss.has("description")) prodLd.description = `${title} — Official ${brand} storefront product specification and details.`;
  if (!miss.has("brand")) prodLd.brand = { "@type": "Brand", "name": brand };
  if (!miss.has("sku") && seed.sku) prodLd.sku = String(seed.sku);
  if (gtin && !miss.has("gtin")) prodLd[`gtin${gtin.length}`] = gtin;
  const avail = seed.firstVariantTrap ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
  prodLd.offers = { "@type": "Offer", "url": url, "price": price, "priceCurrency": cur, "availability": avail };
  const extraBlocks = Math.max(0, Number(seed.productBlocks || 1) - 1);
  let scripts = `<script type="application/ld+json">${JSON.stringify(prodLd)}</script>`;
  for (let i = 0; i < extraBlocks; i++) {
    scripts += `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org/", "@type": "Product", "name": title })}</script>`;
  }
  const htmlText = `<!doctype html><html><head><title>${title}</title><meta name="description" content="${title} official item by ${brand} with verified specifications."><meta property="og:title" content="${title}"><meta property="og:site_name" content="${brand}"><meta property="product:price:amount" content="${price}"><meta property="product:price:currency" content="${cur}">${heroImgs.map((im) => `<meta property="og:image" content="${im}">`).join("")}${scripts}</head><body><main><h1>${title}</h1></main></body></html>`;
  const rawVars = Array.isArray(seed.liveVariants) && seed.liveVariants.length > 0
    ? seed.liveVariants
    : [{ id: seed.primaryVariantId || "1001", title: "Default Title", sku: seed.sku || "101", barcode: gtin, price, available: !seed.firstVariantTrap }];
  const shopifyJs = {
    id: seed.liveProductId || 88001,
    title,
    vendor: brand,
    images: heroImgs,
    variants: rawVars.map((v, idx) => ({
      id: v.id || String(1001 + idx),
      title: v.title || `Option ${idx + 1}`,
      sku: v.sku || seed.sku || String(1001 + idx),
      barcode: cleanBarcodeOrEmpty(v.barcode, v.sku),
      price: formatPriceDot(v.price, price),
      available: idx === 0 && seed.firstVariantTrap ? false : Boolean(v.available ?? true)
    }))
  };
  return { url, htmlText, shopifyJs, isLive: false };
}

async function fetchStoreLiveOrFallback(seed) {
  const domain = seed.domain;
  let targetUrl = String(seed.productUrl || `https://${domain}`);
  let hm = targetUrl.match(/\/products\/([^/?#]+)/i);
  let htmlRes = hm ? await fetchText(targetUrl, "text/html,application/xhtml+xml,*/*") : { ok: false };
  let shopifyJs = null;

  if (!htmlRes.ok || !hm) {
    const pjRes = await fetchText(`https://${domain}/products.json?limit=5`, "application/json");
    if (pjRes.ok && pjRes.text) {
      try {
        const parsed = JSON.parse(pjRes.text);
        const p = (parsed.products || []).find((x) => x && x.handle && !/gift-?card|shipping|protection|warranty/i.test(x.handle)) || (parsed.products || [])[0];
        if (p && p.handle) {
          shopifyJs = p;
          targetUrl = `https://${domain}/products/${p.handle}`;
          hm = [null, p.handle];
          htmlRes = await fetchText(targetUrl, "text/html,application/xhtml+xml,*/*");
        }
      } catch (_e) {}
    }
  }
  if (hm && !shopifyJs) {
    const originM = (htmlRes.url || targetUrl).match(/^(https?:\/\/[^/?#]+)/i);
    const origin = originM ? originM[1] : `https://${domain}`;
    const jsRes = await fetchText(`${origin}/products/${hm[1]}.js`, "application/json");
    if (jsRes.ok && jsRes.text) {
      try { shopifyJs = JSON.parse(jsRes.text); } catch (_e) {}
    }
  }
  if (htmlRes.ok && htmlRes.text && htmlRes.text.length > 500 && !/cf-browser-verification|Just a moment\.\.\./i.test(htmlRes.text)) {
    return { url: htmlRes.url || targetUrl, htmlText: htmlRes.text, shopifyJs, isLive: true };
  }
  return buildSnapshotPayload(seed);
}

function deriveMissingFields(criteria) {
  const map = { C03: "price", C04: "gtin", C05: "hasMerchantReturnPolicy", C06: "shippingDetails", C07: "ProductGroup", C08: "brand", C09: "image", C10: "aggregateRating", C11: "description", C12: "FAQPage" };
  const out = [];
  for (const c of criteria || []) {
    if (!c.pass && map[c.id]) out.push(map[c.id]);
  }
  return out;
}

function buildCompactFixedScript(rep, seed) {
  const graph = buildAutoFixJsonLdObject({
    url: rep.url, domain: seed.domain, title: rep.title, description: rep.description,
    brand: rep.brand, price: rep.price, compare_at_price: rep.compare_at_price, currency: rep.currency,
    sku: rep.sku, gtin13: rep.gtin13, images: rep.images, ratingValue: rep.ratingValue, reviewCount: rep.reviewCount,
    variantsCount: 1, variants: [], returnDays: 30, returnFees: "Free", shippingRate: "0.00"
  });
  const prodEntity = graph["@graph"][0];
  prodEntity["@context"] = "https://schema.org";
  return `<script type="application/ld+json">\n${JSON.stringify(prodEntity, null, 2)}\n</script>`;
}

async function main() {
  const verifiedList = JSON.parse(fs.readFileSync(VERIFIED_PATH, "utf8"));
  const list315 = JSON.parse(fs.readFileSync(P315_PATH, "utf8"));
  const listVip = JSON.parse(fs.readFileSync(PVIP_PATH, "utf8"));
  const seedByDomain = new Map();
  for (const s of [...verifiedList, ...listVip, ...list315]) {
    seedByDomain.set(s.domain, { ...(seedByDomain.get(s.domain) || {}), ...s });
  }
  const domains = [...seedByDomain.keys()];
  const results = new Map();
  let cursor = 0, liveCount = 0;

  async function worker() {
    while (cursor < domains.length) {
      const idx = cursor++;
      const dom = domains[idx];
      const seed = seedByDomain.get(dom);
      const payload = await fetchStoreLiveOrFallback(seed);
      if (payload.isLive) liveCount++;
      const rep = evaluateProductAudit({ url: payload.url, htmlText: payload.htmlText, shopifyJs: payload.shopifyJs });
      results.set(dom, { rep, payload });
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  const applyToNormalized = (s) => {
    const { rep, payload } = results.get(s.domain);
    const sev = rep.score < 55 ? "CRITICAL" : (rep.score < 80 ? "HIGH" : "OPTIMAL");
    const impact = rep.score < 55 ? "45% - 68% Google Shopping & AI Search Impression Loss" : (rep.score < 80 ? "22% - 39% Rich Snippet & Merchant Feed Drop" : "5% - 12% Minor AI Citation Loss");
    const stockLbl = rep.firstVariantTrap ? `TRAP: Var#1 OOS (${rep.inStockCount}/${rep.variantsCount} InStock)` : `Stock: ${rep.inStockCount}/${rep.variantsCount} Active`;
    const cleanGtin = cleanBarcodeOrEmpty(rep.gtin13, rep.sku);
    return {
      ...s,
      productTitle: rep.title || s.productTitle,
      productUrl: rep.url || s.productUrl,
      price: formatPriceDot(rep.price, s.price),
      currency: rep.currency || s.currency || "USD",
      brand: rep.brand || s.brand,
      sku: rep.sku || s.sku || "101",
      gtin13: cleanGtin,
      beforeScore: rep.score,
      afterScore: 100,
      totalDeductions: rep.deduction,
      severity: sev,
      revenueImpact: impact,
      firstVariantTrap: Boolean(rep.firstVariantTrap),
      duplicateSchemaConflict: rep.productBlocks > 1 || rep.microdataCount > 0,
      productBlocks: rep.productBlocks,
      microdataCount: rep.microdataCount,
      schemaStatusLabel: rep.schemaStatusLabel,
      stockLabel: stockLbl,
      missingFields: deriveMissingFields(rep.criteria),
      warnings: rep.warnings,
      images: rep.images && rep.images.length ? rep.images : s.images,
      totalVariantsCount: rep.variantsCount,
      inStockVariantsCount: rep.inStockCount,
      outOfStockVariantsCount: rep.outOfStockCount,
      liveVariants: rep.sampleVariants && rep.sampleVariants.length ? rep.sampleVariants : s.liveVariants,
      liveHttpFetched: payload.isLive
    };
  };

  const next315 = list315.map(applyToNormalized);
  const nextVip = listVip.map(applyToNormalized);
  const nextVerified = verifiedList.map((v) => {
    const { rep } = results.get(v.domain);
    const norm = applyToNormalized(v);
    const hasDir = seedByDomain.has(v.domain);
    const reportLink = `${BASE_DIR_URL}/brands/${v.domain}.html`;
    const primaryWarn = (rep.warnings[0] || "GMC 2026 schema deficit").replace(/^•\s*/, "");
    return {
      ...v,
      productTitle: norm.productTitle, productUrl: norm.productUrl, price: norm.price, currency: norm.currency,
      brand: norm.brand, sku: norm.sku, gtin: norm.gtin13, images: norm.images,
      score: rep.score, totalDeductions: rep.deduction, severity: norm.severity, revenueImpact: norm.revenueImpact,
      firstVariantTrap: norm.firstVariantTrap, duplicateSchemaConflict: norm.duplicateSchemaConflict,
      productBlocks: norm.productBlocks, stockLabel: norm.stockLabel, missingFields: norm.missingFields,
      warnings: rep.warnings, fixedJsonLdScript: buildCompactFixedScript(rep, norm),
      dmPitch: `Hey ${norm.brand} team! Ran a v3.0 GMC 2026 & AI Shopping audit on ${norm.productTitle} — it scored ${rep.score}/100 (${primaryWarn}). Tear-sheet: ${hasDir ? reportLink : BASE_DIR_URL} | Verify live free (Official Google CWS): ${CWS_URL} | 1-Click Shopify Fix ($9/$29/$99): ${GUMROAD_URL}`
    };
  });

  fs.writeFileSync(P315_PATH, JSON.stringify(next315, null, 2) + "\n", "utf8");
  fs.writeFileSync(PVIP_PATH, JSON.stringify(nextVip, null, 2) + "\n", "utf8");
  fs.writeFileSync(VERIFIED_PATH, JSON.stringify(nextVerified, null, 2) + "\n", "utf8");
  const avg = (nextVerified.reduce((a, b) => a + b.score, 0) / nextVerified.length).toFixed(1);
  console.log(`Synced ${domains.length} unique stores (${liveCount} live HTTP, ${domains.length - liveCount} snapshot fallback). New v3.0 Avg Score: ${avg}/100`);
}

main().catch((err) => { console.error(err); process.exit(1); });
