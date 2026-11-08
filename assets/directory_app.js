/**
 * SchemaGuard 2026 — Public Search Directory & Live Inspector Controller
 * Strictly <= 250 Lines | Zero Remotely Hosted Code | Safe DOM Construction
 */
(function () {
  'use strict';

  const PRESETS = {
    trap: '{\n  "@context": "https://schema.org/",\n  "@type": "Product",\n  "name": "Pastel Pup Eyeshadow Palette",\n  "offers": [\n    { "@type": "Offer", "price": "36.00", "priceCurrency": "USD", "availability": "https://schema.org/OutOfStock" },\n    { "@type": "Offer", "price": "52.00", "priceCurrency": "USD", "availability": "https://schema.org/InStock" }\n  ]\n}',
    conflict: '<script type="application/ld+json">\n{ "@context": "https://schema.org/", "@type": "Product", "name": "Immersion Serum Concentrate", "offers": { "@type": "Offer", "price": "70.00", "priceCurrency": "USD" } }\n</script>\n<script type="application/ld+json">\n{ "@context": "https://schema.org/", "@type": "Product", "name": "Immersion Serum", "offers": { "@type": "Offer", "price": "70.00", "availability": "https://schema.org/OutOfStock" } }\n</script>',
    optimal: ''
  };

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }

  function bindCopyButtons() {
    const btns = document.querySelectorAll('[data-copy-target]');
    btns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        const targetId = btn.getAttribute('data-copy-target');
        const targetEl = document.getElementById(targetId);
        if (!targetEl) return;
        const text = targetEl.textContent || '';
        const origLabel = btn.getAttribute('data-orig-label') || btn.textContent;
        btn.setAttribute('data-orig-label', origLabel);
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).catch(function () {});
        }
        btn.textContent = 'Copied 100/100 JSON-LD ✓';
        setTimeout(function () { btn.textContent = origLabel; }, 1800);
      });
    });
  }

  function runLiveInspector() {
    const inputEl = document.getElementById('live-inspector-input');
    if (!inputEl || !window.SchemaGuardAuditor) return;
    const res = window.SchemaGuardAuditor.auditProductInput(inputEl.value);

    const scoreEl = document.getElementById('inspector-score');
    const badgeEl = document.getElementById('inspector-badge');
    const barEl = document.getElementById('inspector-bar');
    const trapEl = document.getElementById('inspector-trap-status');
    const deductList = document.getElementById('inspector-deductions');
    const brokenPre = document.getElementById('inspector-broken-code');
    const fixedPre = document.getElementById('inspector-fixed-code');

    if (scoreEl) scoreEl.textContent = res.score + '/100';
    if (badgeEl) {
      badgeEl.textContent = res.severity;
      badgeEl.className = 'status-badge ' + (res.score >= 80 ? 'badge-optimal' : (res.score >= 55 ? 'badge-high' : 'badge-critical'));
    }
    if (barEl) {
      barEl.style.width = res.score + '%';
      barEl.className = 'progress-fill ' + (res.score >= 80 ? 'fill-optimal' : (res.score >= 55 ? 'fill-high' : 'fill-critical'));
    }
    if (trapEl) {
      trapEl.textContent = res.firstVariantTrap
        ? 'VARIANT #1 OUT-OF-STOCK TRAP DETECTED (-5 pts)'
        : (res.duplicateConflict ? 'DUPLICATE PRODUCT BLOCK CONFLICT (-6 pts)' : 'Variant Stock & Canonical Block Verified');
      trapEl.className = 'status-badge ' + ((res.firstVariantTrap || res.duplicateConflict) ? 'badge-critical' : 'badge-optimal');
    }
    if (deductList) {
      while (deductList.firstChild) deductList.removeChild(deductList.firstChild);
      if (res.deductions.length === 0) {
        const li = el('li', '', '✔ All 12 Google Merchant Center 2026 Readiness Checks Passed (100/100).');
        li.style.color = '#6ee7b7';
        deductList.appendChild(li);
      } else {
        res.deductions.forEach(function (d) {
          const li = el('li', '', '• ' + d.message);
          li.style.marginBottom = '4px';
          deductList.appendChild(li);
        });
      }
    }
    if (brokenPre) brokenPre.textContent = res.brokenCode;
    if (fixedPre) fixedPre.textContent = '<script type="application/ld+json">\n' + res.fixedJsonLd + '\n</script>';
  }

  function renderBrandCard(b) {
    const card = el('article', 'brand-card');
    const top = el('div', '');
    top.style.display = 'flex';
    top.style.gap = '12px';
    top.style.alignItems = 'center';

    const img = document.createElement('img');
    img.className = 'brand-thumb';
    img.src = b.image;
    img.alt = b.title + ' — ' + b.domain;
    img.loading = 'lazy';
    top.appendChild(img);

    const headInfo = el('div', '');
    headInfo.style.flex = '1';
    headInfo.style.minWidth = '0';

    const domainRow = el('div', '');
    domainRow.style.display = 'flex';
    domainRow.style.justifyContent = 'space-between';
    domainRow.style.alignItems = 'center';
    domainRow.style.gap = '6px';

    const link = el('a', '', b.domain);
    link.href = 'brands/' + b.domain + '.html';
    link.style.color = '#818cf8';
    link.style.fontWeight = '700';
    link.style.textDecoration = 'none';
    link.style.fontSize = '0.94rem';

    const scoreBadge = el('span', 'status-badge ' + (b.score < 55 ? 'badge-critical' : 'badge-high'), b.score + '/100');
    domainRow.appendChild(link);
    domainRow.appendChild(scoreBadge);

    const prodTitle = el('div', '', b.title + ' ($' + b.price + ')');
    prodTitle.style.fontSize = '0.8rem';
    prodTitle.style.color = '#9ca3b8';
    prodTitle.style.whiteSpace = 'nowrap';
    prodTitle.style.overflow = 'hidden';
    prodTitle.style.textOverflow = 'ellipsis';

    headInfo.appendChild(domainRow);
    headInfo.appendChild(prodTitle);
    top.appendChild(headInfo);
    card.appendChild(top);

    const tagsRow = el('div', '');
    tagsRow.style.display = 'flex';
    tagsRow.style.flexWrap = 'wrap';
    tagsRow.style.gap = '6px';
    tagsRow.appendChild(el('span', 'status-badge badge-neutral', b.niche));
    if (b.trap) tagsRow.appendChild(el('span', 'status-badge badge-critical', 'Variant #1 OOS Trap'));
    if (b.dup) tagsRow.appendChild(el('span', 'status-badge badge-high', b.blocks + 'x Duplicate Schema'));
    if (b.missing.indexOf('hasMerchantReturnPolicy') !== -1) tagsRow.appendChild(el('span', 'status-badge badge-neutral', 'No ReturnPolicy'));
    if (b.missing.indexOf('gtin') !== -1) tagsRow.appendChild(el('span', 'status-badge badge-neutral', 'No GTIN-13'));
    card.appendChild(tagsRow);

    const foot = el('div', '');
    foot.style.display = 'flex';
    foot.style.justifyContent = 'space-between';
    foot.style.alignItems = 'center';
    foot.style.marginTop = '4px';

    const stockSpan = el('span', '', b.stock);
    stockSpan.style.fontSize = '0.76rem';
    stockSpan.style.color = b.trap ? '#fda4af' : '#6ee7b7';

    const btnAudit = el('a', 'btn btn-outline btn-sm', 'View 12-Point Audit & Fix →');
    btnAudit.href = 'brands/' + b.domain + '.html';
    foot.appendChild(stockSpan);
    foot.appendChild(btnAudit);
    card.appendChild(foot);
    return card;
  }

  function initDirectorySearch() {
    const allBrands = (window.BRANDS_PART_1 || []).concat(window.BRANDS_PART_2 || []);
    window.ALL_AUDITED_BRANDS = allBrands;
    const gridEl = document.getElementById('directory-brand-grid');
    const countEl = document.getElementById('directory-match-count');
    const searchInput = document.getElementById('dir-search-input');
    const nicheSelect = document.getElementById('dir-niche-filter');
    const errorSelect = document.getElementById('dir-error-filter');
    const sevSelect = document.getElementById('dir-severity-filter');
    if (!gridEl || allBrands.length === 0) return;

    function applyFilters() {
      const q = (searchInput ? searchInput.value : '').trim().toLowerCase();
      const niche = nicheSelect ? nicheSelect.value : 'ALL';
      const errType = errorSelect ? errorSelect.value : 'ALL';
      const sev = sevSelect ? sevSelect.value : 'ALL';

      const filtered = allBrands.filter(function (b) {
        if (niche !== 'ALL' && b.niche !== niche) return false;
        if (sev === 'CRITICAL' && b.score >= 55) return false;
        if (sev === 'HIGH' && (b.score < 55 || b.score >= 80)) return false;
        if (errType === 'TRAP' && !b.trap) return false;
        if (errType === 'DUP' && !b.dup) return false;
        if (errType !== 'ALL' && errType !== 'TRAP' && errType !== 'DUP' && b.missing.indexOf(errType) === -1) return false;
        if (!q) return true;
        const hay = (b.domain + ' ' + b.title + ' ' + b.niche + ' ' + b.missing.join(' ') + (b.trap ? ' variant trap outofstock' : '') + (b.dup ? ' duplicate conflict' : '')).toLowerCase();
        return hay.indexOf(q) !== -1;
      });

      if (countEl) countEl.textContent = 'Showing ' + filtered.length + ' of ' + allBrands.length + ' Audited D2C Brands';
      while (gridEl.firstChild) gridEl.removeChild(gridEl.firstChild);
      filtered.forEach(function (b) { gridEl.appendChild(renderBrandCard(b)); });
    }

    [searchInput, nicheSelect, errorSelect, sevSelect].forEach(function (ctrl) {
      if (ctrl) {
        ctrl.addEventListener('input', applyFilters);
        ctrl.addEventListener('change', applyFilters);
      }
    });
    applyFilters();
  }

  document.addEventListener('DOMContentLoaded', function () {
    bindCopyButtons();
    initDirectorySearch();
    const inputEl = document.getElementById('live-inspector-input');
    if (inputEl && window.SchemaGuardAuditor) {
      PRESETS.optimal = '<script type="application/ld+json">\n' + window.SchemaGuardAuditor.buildFixedJsonLd({ title: 'Pastel Pup Eyeshadow Palette — 2026 Verified Edition' }) + '\n</script>';
      inputEl.value = PRESETS.trap;
      runLiveInspector();
      const runBtn = document.getElementById('run-live-audit-btn');
      if (runBtn) runBtn.addEventListener('click', runLiveInspector);
      document.querySelectorAll('[data-preset]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const k = btn.getAttribute('data-preset');
          if (PRESETS[k]) { inputEl.value = PRESETS[k]; runLiveInspector(); }
        });
      });
    }
  });
})();
