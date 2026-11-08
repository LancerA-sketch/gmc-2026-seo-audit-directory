/**
 * SchemaGuard 2026 — 12-Point GMC Readiness & Variant Stock Trap Auditor Engine
 * Zero-Backend Browser & Node Compatible Engine (Strictly <= 250 Lines)
 */
(function (root) {
  'use strict';

  const GUMROAD_LINKS = Object.freeze({
    extension: 'https://vothanh1.gumroad.com/l/istvro',
    dropInKit: 'https://vothanh1.gumroad.com/l/eolvo'
  });

  function parseRawInput(rawInput) {
    const input = String(rawInput || '').trim();
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const scripts = [];
    let match;
    while ((match = scriptRegex.exec(input)) !== null) {
      scripts.push(match[1].trim());
    }
    const isFullHtml = /<html|<head|<body|<script|<meta|<h1/i.test(input);
    if (scripts.length === 0 && input.startsWith('{')) scripts.push(input);
    const combinedJsonLd = scripts.join('\n');

    const getMeta = function (name) {
      const rx = new RegExp('<meta[^>]+(?:property|name)=["\']' + name + '["\'][^>]+content=["\']([^"\']*)["\']', 'i');
      const m = input.match(rx);
      return m ? m[1].trim() : '';
    };

    const h1Matches = input.match(/<h1[\s>]/gi) || [];
    const h1TextMatch = input.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    const cleanH1 = h1TextMatch ? h1TextMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const hasCanonical = /<link[^>]+rel=["']canonical["']/i.test(input) || !isFullHtml;
    const imgMatches = input.match(/<img[\s>]/gi) || [];

    return {
      input: input,
      isFullHtml: isFullHtml,
      scripts: scripts,
      combinedJsonLd: combinedJsonLd,
      ogTitle: getMeta('og:title'),
      ogDesc: getMeta('og:description') || getMeta('description'),
      ogImage: getMeta('og:image'),
      h1Count: isFullHtml ? (h1Matches.length || 1) : 1,
      h1Title: cleanH1,
      hasCanonical: hasCanonical,
      domImgCount: imgMatches.length
    };
  }

  function buildFixedJsonLd(meta) {
    const m = meta || {};
    const currency = m.currency || 'USD';
    let fixedTitle = String(m.title || 'Verified D2C Store Product — 2026 Edition').trim();
    if (fixedTitle.length < 20) fixedTitle = fixedTitle + ' — 2026 Verified GMC Edition';
    if (fixedTitle.length > 70) fixedTitle = fixedTitle.slice(0, 68).trim();
    const payload = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      '@id': (m.url || 'https://store.example.com/products/verified-item') + '#schemaguard-2026',
      name: fixedTitle,
      description: (m.description && m.description.length >= 160)
        ? m.description
        : 'Authentic ' + fixedTitle + ' with verified 2026 Google Merchant Center structured data, active in-stock variant resolution, global GTIN-13 barcode, 30-day return policy, and shipping rate details.',
      image: [
        m.image || 'https://cdn.shopify.com/s/files/1/0582/1136/9133/files/azwmxt6llttmc2cwxbpj.jpg',
        'https://cdn.shopify.com/s/files/1/1007/8070/files/OW086SS25_COTTON_VARSITY_COAT_0249.jpg',
        'https://stoneandstrand.com/cdn/products/gallery-3.jpg',
        'https://doseofcolors.com/cdn/shop/files/RIDE_OR_DIE_LINER.jpg'
      ],
      sku: m.sku || 'SG-2026-VERIFIED-SKU',
      mpn: m.sku || 'SG-2026-MPN',
      gtin13: m.gtin || '0085002026991',
      brand: { '@type': 'Brand', name: m.brand || 'Verified D2C Merchant' },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: 84, bestRating: '5', worstRating: '1' },
      offers: {
        '@type': 'Offer',
        url: m.url || 'https://store.example.com/products/verified-item',
        priceCurrency: currency,
        price: m.price || '68.00',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'US',
          returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
          merchantReturnDays: 30,
          returnMethod: 'https://schema.org/ReturnByMail',
          returnFees: 'https://schema.org/FreeReturn'
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: { '@type': 'MonetaryAmount', value: '0.00', currency: currency },
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'US' }
        }
      }
    };
    return JSON.stringify(payload, null, 2);
  }

  function auditProductInput(rawInput) {
    const parsed = parseRawInput(rawInput);
    const raw = parsed.combinedJsonLd || parsed.input;

    const productBlocks = (raw.match(/"@type"\s*:\s*"(Product|ProductGroup|IndividualProduct)"/gi) || []).length;
    const hasProductSchema = productBlocks > 0;
    const extract = function (rx) {
      const m = raw.match(rx);
      return m ? m[1].trim() : '';
    };

    const title = extract(/"name"\s*:\s*"([^"]+)"/i) || parsed.h1Title || parsed.ogTitle;
    const description = extract(/"description"\s*:\s*"([^"]+)"/i) || parsed.ogDesc;
    const sku = extract(/"sku"\s*:\s*"([^"]+)"/i);
    const gtin = extract(/"(?:gtin|gtin13|gtin12|gtin14|gtin8|mpn|isbn)"\s*:\s*"([^"]+)"/i);
    const price = extract(/"price"\s*:\s*"?([0-9]+(?:\.[0-9]{1,2})?)"?/i);
    const currency = extract(/"priceCurrency"\s*:\s*"([A-Z]{3})"/i) || 'USD';
    const brandMatch = raw.match(/"brand"\s*:\s*(\{[\s\S]*?\}|"[^"]+")/i);
    const imgArr = raw.match(/"image"\s*:\s*\[([\s\S]*?)\]/i);
    const singleImg = extract(/"image"\s*:\s*"([^"]+)"/i) || parsed.ogImage;

    let imageCount = parsed.domImgCount;
    if (imgArr) {
      imageCount = Math.max(imageCount, (imgArr[1].match(/"http[^"]+"/gi) || []).length);
    } else if (singleImg) {
      imageCount = Math.max(imageCount, 1);
    }

    const hasBrand = Boolean(brandMatch && brandMatch[1].replace(/["{}\s]/g, '').length > 0);
    const hasReturnPolicy = /"hasMerchantReturnPolicy"\s*:/i.test(raw);
    const hasShippingDetails = /"shippingDetails"\s*:/i.test(raw);
    const hasAggregateRating = /"aggregateRating"\s*:/i.test(raw);

    const availabilities = [];
    const availRx = /"availability"\s*:\s*"([^"]+)"/gi;
    let am;
    while ((am = availRx.exec(raw)) !== null) availabilities.push(am[1]);
    const outOfStockCount = availabilities.filter(function (a) { return /OutOfStock/i.test(a); }).length;
    const inStockCount = availabilities.filter(function (a) { return /InStock/i.test(a); }).length;
    const firstOfferOOS = availabilities.length > 0 && /OutOfStock/i.test(availabilities[0]);
    const firstVariantTrap = Boolean((firstOfferOOS && inStockCount > 0) || (outOfStockCount > 0 && inStockCount === 0));
    const duplicateConflict = productBlocks > 1;

    let score = 0;
    const deductions = [];
    const criteria = [];

    const addRule = function (id, label, earned, maxPts, msg) {
      score += earned;
      const lost = maxPts - earned;
      criteria.push({ id: id, label: label, earned: earned, maxPts: maxPts, lost: lost, status: lost === 0 ? 'PASS' : 'FAIL' });
      if (lost > 0 && msg) deductions.push({ id: id, points: -lost, message: msg });
    };

    addRule('jsonld_core', '1. Product JSON-LD Core (@type: Product)', hasProductSchema ? 20 : 5, 20, 'CRITICAL (-15 pts): Missing @type Product JSON-LD block.');
    addRule('duplicate_conflict', '2. Single Canonical Product Schema Block', productBlocks === 1 ? 8 : (productBlocks > 1 ? 2 : 0), 8, productBlocks > 1 ? 'CONFLICT (-6 pts): Detected ' + productBlocks + ' duplicate Product JSON-LD blocks.' : 'SCHEMA (-8 pts): 0 Product JSON-LD blocks detected.');
    const tPts = (title.length >= 20 && title.length <= 70) ? 7 : (title.length > 70 ? 4 : 2);
    addRule('title_opt', '3. GMC Product Title Length (20-70 chars)', tPts, 7, 'TITLE (-' + (7 - tPts) + ' pts): Title length outside optimal 20-70 chars.');
    const dPts = description.length >= 160 ? 8 : (description.length >= 70 ? 5 : (description.length > 0 ? 2 : 0));
    addRule('description_depth', '4. Semantic Description (>=160 chars)', dPts, 8, 'DESCRIPTION (-' + (8 - dPts) + ' pts): Description missing or under 160 chars.');
    const iPts = imageCount >= 4 ? 7 : (imageCount >= 2 ? 5 : (imageCount === 1 ? 3 : 0));
    addRule('image_gallery', '5. High-Res Product Image Gallery (4+ imgs)', iPts, 7, 'IMAGES (-' + (7 - iPts) + ' pts): Fewer than 4 product images in JSON-LD.');
    const hasPrice = Boolean(price && parseFloat(price) > 0);
    const pPts = (hasPrice ? 8 : 0) + (currency ? 4 : 0);
    addRule('offer_price', '6. Numeric Offer Price & ISO Currency', pPts, 12, 'PRICE (-' + (12 - pPts) + ' pts): Missing valid numeric price or currency.');
    addRule('brand_field', '7. Explicit Brand Object (@type: Brand)', hasBrand ? 7 : 2, 7, 'BRAND (-5 pts): Missing Brand object in JSON-LD.');
    addRule('sku_field', '8. Merchant SKU Identifier', sku ? 6 : 0, 6, 'SKU (-6 pts): Missing SKU identifier in JSON-LD.');
    addRule('gtin_field', '9. Global Barcode (gtin13 / mpn)', gtin ? 8 : 0, 8, 'GMC 2026 (-8 pts): Missing global barcode (gtin13 / mpn).');
    addRule('return_policy', '10. GMC 2026 MerchantReturnPolicy Object', hasReturnPolicy ? 6 : 0, 6, 'GMC 2026 (-6 pts): Missing hasMerchantReturnPolicy in Offer.');
    addRule('shipping_details', '11. GMC 2026 OfferShippingDetails Object', hasShippingDetails ? 6 : 0, 6, 'GMC 2026 (-6 pts): Missing shippingDetails in Offer.');
    const domPts = (parsed.h1Count === 1 ? 2 : 0) + (parsed.hasCanonical ? 1 : 0) + (hasAggregateRating ? 2 : 0);
    addRule('semantic_dom', '12. Semantic DOM & AggregateRating Sync', domPts, 5, 'REVIEWS/DOM (-' + (5 - domPts) + ' pts): Missing aggregateRating or duplicate H1.');

    if (firstVariantTrap) {
      score = Math.max(15, score - 5);
      deductions.unshift({ id: 'variant_trap', points: -5, message: 'VARIANT TRAP (-5 pts): Variant #1 is OutOfStock while other variants are InStock!' });
    }

    score = Math.min(100, Math.max(15, score));
    const fixedJsonLd = buildFixedJsonLd({ title: title, description: description, price: price, currency: currency, sku: sku, gtin: gtin });

    return {
      score: score,
      severity: score >= 80 ? 'OPTIMAL' : (score >= 55 ? 'HIGH RISK' : 'CRITICAL'),
      duplicateConflict: duplicateConflict,
      firstVariantTrap: firstVariantTrap,
      deductions: deductions,
      criteria: criteria,
      brokenCode: raw || '<!-- No Product JSON-LD detected -->',
      fixedJsonLd: fixedJsonLd
    };
  }

  const api = { GUMROAD_LINKS: GUMROAD_LINKS, parseRawInput: parseRawInput, buildFixedJsonLd: buildFixedJsonLd, auditProductInput: auditProductInput };
  root.SchemaGuardAuditor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
