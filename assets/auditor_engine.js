/**
 * SchemaGuard Pro v3.0 — 12-Criterion GMC 2026 & AI GEO Auditor Engine (Browser + Node)
 * 100% Synchronized Single Source of Truth with Chrome Extension v3.0 (audit_core.js).
 * Strictly <= 250 Lines | Zero Remotely Hosted Code | Zero Fake GTINs
 */
(function (root) {
  'use strict';

  const H = root.SchemaGuardHelpers || (typeof require === 'function' ? require('./auditor_helpers_v30.js') : null);
  const OFFICIAL_CWS_URL = 'https://chromewebstore.google.com/detail/dejgbohjjnefmjpiopjgmiafhmgbkadn';
  const GUMROAD_LINKS = Object.freeze({
    cwsFree: OFFICIAL_CWS_URL,
    extension: 'https://vothanh1.gumroad.com/l/istvro',
    dropInKit: 'https://vothanh1.gumroad.com/l/istvro',
    enterpriseSuite: 'https://vothanh1.gumroad.com/l/istvro'
  });

  function auditProductInput(rawInput, opts) {
    const raw = String(rawInput || '').trim(), domain = (opts && opts.domain) || 'example.com', pj = (opts && opts.shopifyJs) || null;
    const wrappedHtml = (!/<script\b/i.test(raw) && (raw.startsWith('{') || raw.startsWith('['))) ? '<script type="application/ld+json">' + raw + '</script>' : raw;
    const titleTagM = wrappedHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const rawTitleTag = titleTagM ? H.cleanText(titleTagM[1]).split('|')[0].split('–')[0].split('—')[0].split(' - ')[0].trim() : '';
    const ogTitle = H.getMeta(wrappedHtml, 'property', 'og:title') || H.getMeta(wrappedHtml, 'name', 'twitter:title');
    const metaDesc = H.getMeta(wrappedHtml, 'name', 'description') || H.getMeta(wrappedHtml, 'property', 'og:description');
    const ogSite = H.getMeta(wrappedHtml, 'property', 'og:site_name'), ogImg = H.getMeta(wrappedHtml, 'property', 'og:image');
    const ogPriceRaw = H.getMeta(wrappedHtml, 'property', 'og:price:amount') || H.getMeta(wrappedHtml, 'property', 'product:price:amount');
    const ogCur = H.getMeta(wrappedHtml, 'property', 'og:price:currency') || H.getMeta(wrappedHtml, 'property', 'product:price:currency');

    let productBlocks = 0, hasDomGtin = false, hasSchemaBrand = false, hasOfferPrice = false, hasCurrency = false, hasAggregateRating = false;
    let hasProductGroup = false, hasFaqSchema = false, hasSchemaDesc = false, hasInvalidDomGtin = false, domVariantCount = 0, domInStockCount = 0, domFirstVarOos = false;
    let danglingRet = false, danglingShip = false, hasRet = false, hasShip = false, hasStorePrice = false, hasStoreCurrency = false;
    let extractedTitle = rawTitleTag || (ogTitle ? ogTitle.split('|')[0].trim() : ''), extractedDesc = H.cleanText(metaDesc || '');
    let extractedBrand = ogSite || domain.split('.')[0], hasStoreBrand = Boolean(ogSite && ogSite.trim());
    let extractedPrice = '79.95', extractedCurrency = 'USD', extractedSku = '', extractedGtin = '', ratingValue = '', reviewCount = '0';
    const ogP = ogPriceRaw ? parseFloat(ogPriceRaw.replace(/[^0-9.]/g, '')) : NaN;
    if (Number.isFinite(ogP) && ogP > 0) { extractedPrice = ogP.toFixed(2); hasStorePrice = true; }
    if (ogCur && /^[A-Z]{3}$/i.test(ogCur.trim())) { extractedCurrency = ogCur.trim().toUpperCase(); hasStoreCurrency = true; }

    const schemaImagesSet = new Set(), domGs1Set = new Set(), rawImgs = ogImg ? [ogImg] : [], parsedBlocks = [], topProductNodes = [];
    Array.from(wrappedHtml.matchAll(/(<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>)([\s\S]*?)<\/script>/gi)).forEach(function (m) {
      try { parsedBlocks.push(JSON.parse((m[2] || '').trim())); } catch (_e) {}
    });
    const idMap = H.buildIdMap(parsedBlocks);

    const chkPol = function (off) {
      const rRaw = Array.isArray(off.hasMerchantReturnPolicy) ? off.hasMerchantReturnPolicy[0] : off.hasMerchantReturnPolicy, rPol = H.resolveNode(rRaw, idMap);
      if (rPol && typeof rPol === 'object' && (rPol['@type'] || rPol.returnPolicyCategory || rPol.merchantReturnDays !== undefined || rPol.returnFees)) hasRet = true;
      else if (rRaw && typeof rRaw === 'object' && rRaw['@id']) danglingRet = true;
      const sRaw = Array.isArray(off.shippingDetails) ? off.shippingDetails[0] : off.shippingDetails, sDet = H.resolveNode(sRaw, idMap);
      if (sDet && typeof sDet === 'object' && (sDet['@type'] || sDet.shippingRate !== undefined || sDet.deliveryTime || sDet.shippingDestination)) hasShip = true;
      else if (sRaw && typeof sRaw === 'object' && sRaw['@id']) danglingShip = true;
    };
    const inspectOffer = function (offRaw, fbSku) {
      const off = H.resolveNode(offRaw, idMap);
      if (!off || typeof off !== 'object') return;
      const p = off.price !== undefined ? off.price : (off.lowPrice !== undefined ? off.lowPrice : off.highPrice);
      if (p !== undefined && p !== null && String(p).trim() !== '' && parseFloat(String(p).replace(/[^0-9.]/g, '')) > 0) {
        hasOfferPrice = true; hasStorePrice = true; extractedPrice = parseFloat(String(p).replace(/[^0-9.]/g, '')).toFixed(2);
      }
      if (off.priceCurrency && /^[A-Z]{3}$/i.test(String(off.priceCurrency).trim())) {
        hasCurrency = true; hasStoreCurrency = true; extractedCurrency = String(off.priceCurrency).trim().toUpperCase();
      }
      chkPol(off);
      const bc = H.parseBarcode(off.gtin13 || off.gtin12 || off.gtin14 || off.gtin8 || off.gtin, off.sku || fbSku);
      if (bc.isValidGtin) { hasDomGtin = true; domGs1Set.add(bc.gtinVal); if (!extractedGtin) extractedGtin = bc.gtinVal; }
      if (Array.isArray(off.offers)) off.offers.forEach(function (sub) { inspectOffer(sub, fbSku); });
    };
    const inspectProd = function (nodeRaw, isChild) {
      const node = H.resolveNode(nodeRaw, idMap);
      if (!node || typeof node !== 'object') return;
      if (H.normTypes(node['@type']).indexOf('ProductGroup') !== -1 || node.hasVariant || node.productGroupID) hasProductGroup = true;
      if (!isChild && node.name && (!extractedTitle || extractedTitle === rawTitleTag)) extractedTitle = H.cleanText(node.name);
      const d = node.description ? H.cleanText(node.description) : '';
      if (d.length >= 20) { hasSchemaDesc = true; if (!isChild || !extractedDesc) extractedDesc = d; }
      if (node.sku) extractedSku = H.cleanSku(node.sku, extractedSku);
      const bc = H.parseBarcode(node.gtin13 || node.gtin12 || node.gtin14 || node.gtin8 || node.gtin, node.sku || extractedSku);
      if (bc.isValidGtin) { hasDomGtin = true; domGs1Set.add(bc.gtinVal); if (!extractedGtin) extractedGtin = bc.gtinVal; }
      const bObj = H.resolveNode(node.brand, idMap);
      if (bObj) {
        const bName = typeof bObj === 'object' ? (bObj.name || '') : String(bObj);
        if (String(bName).trim()) { if (typeof bObj === 'object') hasSchemaBrand = true; hasStoreBrand = true; extractedBrand = H.cleanText(bName); }
      }
      if (node.image) (Array.isArray(node.image) ? node.image : [node.image]).forEach(function (im) { const u = H.normImg(H.resolveNode(im, idMap)); if (u) { schemaImagesSet.add(u); rawImgs.push(u); } });
      const agg = H.resolveNode(node.aggregateRating, idMap);
      if (agg && typeof agg === 'object' && parseInt(String(agg.reviewCount || agg.ratingCount || '0'), 10) > 0 && parseFloat(String(agg.ratingValue || '0')) > 0) {
        hasAggregateRating = true; ratingValue = String(agg.ratingValue); reviewCount = String(agg.reviewCount || agg.ratingCount);
      }
      chkPol(node);
      const offList = Array.isArray(node.offers) ? node.offers : (node.offers ? [node.offers] : []);
      offList.forEach(function (o) { inspectOffer(o, node.sku || extractedSku); });
      if (node.hasVariant) {
        const vArr = (Array.isArray(node.hasVariant) ? node.hasVariant : [node.hasVariant]).map(function (v) { return H.resolveNode(v, idMap); });
        if (vArr.length > domVariantCount) {
          domVariantCount = vArr.length;
          domInStockCount = vArr.filter(function (v) { const vo = H.resolveNode(Array.isArray(v && v.offers) ? v.offers[0] : (v && v.offers), idMap); return !(vo && vo.availability) || !/OutOfStock/i.test(String(vo.availability)); }).length;
          const fVo = H.resolveNode(Array.isArray(vArr[0] && vArr[0].offers) ? vArr[0].offers[0] : (vArr[0] && vArr[0].offers), idMap);
          domFirstVarOos = Boolean(fVo && fVo.availability && /OutOfStock/i.test(String(fVo.availability)));
        }
        vArr.forEach(function (vNode) { inspectProd(vNode, true); });
      } else if (!isChild && !pj && offList.length > 1 && domVariantCount === 0) {
        const rOffs = offList.map(function (o) { return H.resolveNode(o, idMap); });
        domVariantCount = rOffs.length;
        domInStockCount = rOffs.filter(function (o) { return !(o && o.availability) || !/OutOfStock/i.test(String(o.availability)); }).length;
        domFirstVarOos = Boolean(rOffs[0] && rOffs[0].availability && /OutOfStock/i.test(String(rOffs[0].availability)));
      }
    };
    parsedBlocks.forEach(function (blk) {
      const q = Array.isArray(blk) ? blk.slice() : [blk];
      for (let i = 0; i < q.length; i++) {
        const it = q[i];
        if (!it || typeof it !== 'object') continue;
        if (Array.isArray(it['@graph'])) { Array.prototype.push.apply(q, it['@graph']); continue; }
        const t = H.normTypes(it['@type']);
        if (t.indexOf('FAQPage') !== -1) hasFaqSchema = true;
        if (t.indexOf('Product') !== -1 || t.indexOf('ProductGroup') !== -1) { productBlocks++; inspectProd(it, false); topProductNodes.push(it); }
        else if (it.mainEntity) Array.prototype.push.apply(q, Array.isArray(it.mainEntity) ? it.mainEntity : [it.mainEntity]);
      }
    });

    let variantsCount = domVariantCount > 1 ? domVariantCount : 1, inStockCount = domVariantCount > 1 ? domInStockCount : 1;
    let firstVariantTrap = domVariantCount > 1 && domFirstVarOos && inStockCount > 0, barcodesCount = domGs1Set.size, hasUnexposedGs1 = false;
    if (pj && Array.isArray(pj.variants) && pj.variants.length > 0) {
      variantsCount = pj.variants.length;
      inStockCount = pj.variants.filter(function (v) { return v.available !== false && Boolean(v.available); }).length;
      firstVariantTrap = !pj.variants[0].available && inStockCount > 0;
      const jsGs1 = new Set();
      barcodesCount = pj.variants.filter(function (v) { const b = H.parseBarcode(v.barcode, v.sku); if (b.isValidGtin) jsGs1.add(b.gtinVal); return b.isValidGtin; }).length;
      hasUnexposedGs1 = barcodesCount > 0 && Array.from(jsGs1).some(function (b) { return !domGs1Set.has(b); });
    }
    topProductNodes.forEach(function (p) { if (H.evalMpnSafe(p, variantsCount, idMap).invalidGtin) hasInvalidDomGtin = true; });
    const mpnSafeMode = !hasDomGtin && barcodesCount === 0 && !hasInvalidDomGtin && topProductNodes.some(function (p) { return H.evalMpnSafe(p, variantsCount, idMap).validMpn; });
    const cleanBody = wrappedHtml.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
    const mdMatches = cleanBody.match(/\bitemtype\s*=\s*["'][^"']*schema\.org\/Product(?:Group)?\b[^"']*["']/gi), microdataCount = mdMatches ? mdMatches.length : 0;
    const hasSizeTable = Array.from(cleanBody.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)).some(function (tm) { return /chest|waist|inseam|size|cm|inch/i.test(tm[1] || ''); });
    const isApparel = /shirt|hoodie|pant|legging|bra|jacket|dress|shoe|boot|apparel|sweater|sock/i.test(extractedTitle + ' ' + extractedDesc);
    const noJsonLd = productBlocks === 0, finalImgs = H.dedupeImgs(rawImgs, domain), schemaImgsCnt = schemaImagesSet.size, pageImgsCnt = Math.max(schemaImgsCnt, finalImgs.length);
    const hasValidMeta = Boolean(extractedTitle && extractedTitle.length >= 3 && extractedDesc && extractedDesc.length >= 20);
    const c01 = (productBlocks === 1 && microdataCount === 0) ? 12 : 0, c02 = (noJsonLd ? !firstVariantTrap : (!firstVariantTrap && (!isApparel || hasSizeTable))) ? 12 : 0;
    const c03 = (hasOfferPrice && hasCurrency) ? 10 : ((noJsonLd && hasStorePrice && hasStoreCurrency) ? 5 : 0);
    const c04 = (!hasInvalidDomGtin && !hasUnexposedGs1 && (barcodesCount > 0 ? hasDomGtin : (hasDomGtin || mpnSafeMode))) ? 10 : 0;
    const c05 = (hasRet && !danglingRet) ? 10 : 0, c06 = (hasShip && !danglingShip) ? 10 : 0, c07 = (hasProductGroup || (variantsCount <= 1 && productBlocks === 1)) ? 8 : 0;
    const c08 = (hasSchemaBrand || (noJsonLd && hasStoreBrand)) ? 6 : 0, c09 = (schemaImgsCnt >= 3) ? 6 : ((noJsonLd && pageImgsCnt >= 3) ? 3 : 0);
    const c10 = hasAggregateRating ? 6 : 0, c11 = (hasSchemaDesc || (noJsonLd && hasValidMeta)) ? 5 : 0, c12 = hasFaqSchema ? 5 : 0;
    const criteria = [
      { id: 'C01', weight: 12, earned: c01, pass: c01 === 12, failMsg: (productBlocks === 0 && microdataCount === 0) ? 'CRITICAL (-12): No Product JSON-LD found on page.' : ('CONFLICT (-12): ' + productBlocks + ' Product JSON-LD + ' + microdataCount + ' Microdata blocks.') },
      { id: 'C02', weight: 12, earned: c02, pass: c02 === 12, failMsg: firstVariantTrap ? ('VARIANT TRAP (-12): Variant #1 is OutOfStock while ' + inStockCount + '/' + variantsCount + ' variants are InStock.') : 'GEO APPAREL (-12): Missing semantic <table> size chart for AI Shopping.' },
      { id: 'C03', weight: 10, earned: c03, pass: c03 === 10, failMsg: c03 === 5 ? 'OFFER SCHEMA (-5): Price & currency found in OpenGraph/.js, but Offer JSON-LD is missing.' : 'OFFER PRICE (-10): Missing valid numeric price or 3-letter ISO priceCurrency.' },
      { id: 'C04', weight: 10, earned: c04, pass: c04 === 10, failMsg: hasUnexposedGs1 ? ('UNEXPOSED BARCODE (-10): Unexposed GS1 Barcode in Shopify Inventory (' + barcodesCount + '/' + variantsCount + ' variants in .js omitted from DOM Schema).') : (hasInvalidDomGtin ? 'INVALID GTIN (-10): Invalid non-numeric/alphanumeric or wrong-length gtin* in DOM Schema (route custom codes to mpn instead).' : ('MISSING IDENTIFIERS (-10): Missing valid GS1 barcode or Brand + SKU + MPN across 100% of ' + variantsCount + ' variant(s).')) },
      { id: 'C05', weight: 10, earned: c05, pass: c05 === 10, failMsg: 'GMC 2026 (-10): Missing mandatory hasMerchantReturnPolicy (merchantReturnDays, returnFees).' },
      { id: 'C06', weight: 10, earned: c06, pass: c06 === 10, failMsg: 'GMC 2026 (-10): Missing mandatory shippingDetails (shippingRate, handlingTime, transitTime).' },
      { id: 'C07', weight: 8, earned: c07, pass: c07 === 8, failMsg: 'VARIANT GRAPH (-8): ' + variantsCount + ' variants not linked via ProductGroup / hasVariant.' },
      { id: 'C08', weight: 6, earned: c08, pass: c08 === 6, failMsg: 'BRAND ENTITY (-6): Missing structured @type Brand object.' },
      { id: 'C09', weight: 6, earned: c09, pass: c09 === 6, failMsg: c09 === 3 ? ('SCHEMA IMAGES (-3): ' + pageImgsCnt + ' HD images on page/.js, but 0 attached to Product JSON-LD.') : ('IMAGES (-6): Only ' + schemaImgsCnt + ' schema image(s) found (3+ high-res images required).') },
      { id: 'C10', weight: 6, earned: c10, pass: c10 === 6, failMsg: 'SOCIAL PROOF (-6): 0 customer reviews on product yet (0 fake reviews injected; +6 pts auto-unlocks upon 1st real review).' },
      { id: 'C11', weight: 5, earned: c11, pass: c11 === 5, failMsg: 'METADATA (-5): Missing or thin semantic product description (<20 chars) in Schema.' },
      { id: 'C12', weight: 5, earned: c12, pass: c12 === 5, failMsg: 'GEO CITATION (-5): No FAQPage schema detected for Perplexity / ChatGPT Shopping.' }
    ];
    let score = 0; const deductions = [];
    criteria.forEach(function (c) { score += c.earned; if (!c.pass) deductions.push({ id: c.id, points: -(c.weight - c.earned), message: c.failMsg }); });
    const fixedJsonLd = H.buildFixedJsonLd({ title: extractedTitle, description: extractedDesc, brand: extractedBrand, price: extractedPrice, currency: extractedCurrency, sku: extractedSku, gtin13: extractedGtin, images: finalImgs, ratingValue: ratingValue, reviewCount: reviewCount });
    return { score: score, deduction: 100 - score, severity: score >= 80 ? 'OPTIMAL' : (score >= 55 ? 'HIGH RISK' : 'CRITICAL'), duplicateConflict: productBlocks > 1 || microdataCount > 0, firstVariantTrap: firstVariantTrap, deductions: deductions, criteria: criteria, brokenCode: raw || '<!-- No Product JSON-LD detected -->', fixedJsonLd: fixedJsonLd };
  }

  const api = { OFFICIAL_CWS_URL: OFFICIAL_CWS_URL, GUMROAD_LINKS: GUMROAD_LINKS, buildFixedJsonLd: H.buildFixedJsonLd, auditProductInput: auditProductInput };
  root.SchemaGuardAuditor = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
