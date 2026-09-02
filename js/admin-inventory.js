(function () {
  const LOW_STOCK_THRESHOLD = 5;
  let inventory = {};

  function loadInventory() {
    inventory = window.AdminInventoryData.getInventory();
    renderInventory();
  }

  function getStock(key) {
    return inventory[key] || 0;
  }

  function setStock(key, value) {
    const val = Math.max(0, parseInt(value, 10) || 0);
    inventory[key] = val;
    window.AdminInventoryData.saveInventory(inventory);
    return val;
  }

  function renderInventory(searchQuery = "") {
    const container = document.getElementById("inventoryContainer");
    const q = searchQuery.toLowerCase();

    const filtered = window.AdminInventoryData.PRODUCTS.filter(p => {
      return p.name.toLowerCase().includes(q) || p.skuPrefix.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align:center; padding: 40px; color: var(--a-ink-soft);">No products match your search.</div>`;
      return;
    }

    container.innerHTML = filtered.map(p => {
      // Build variants list
      const variants = [];
      const colors = p.colors.length ? p.colors : [null];
      const types = p.types.length ? p.types : [null];
      const sizes = p.sizes.length ? p.sizes : [null];

      colors.forEach(c => {
        types.forEach(t => {
          sizes.forEach(s => {
            variants.push({ color: c, type: t, size: s });
          });
        });
      });

      const rows = variants.map(v => {
        const key = window.AdminInventoryData.getVariantKey(p.id, v.color, v.type, v.size);
        const stock = getStock(key);
        const isLow = stock > 0 && stock <= LOW_STOCK_THRESHOLD;
        const outOfStock = stock === 0;

        const labelParts = [v.color, v.type, v.size].filter(Boolean);
        const variantLabel = labelParts.length > 0 ? labelParts.join(" · ") : "Default";

        return `
          <tr class="${isLow || outOfStock ? 'low-stock' : ''}">
            <td>${variantLabel} <span class="low-stock-badge">${outOfStock ? 'Out of Stock' : 'Low Stock'}</span></td>
            <td>
              <div class="stock-input-wrap">
                <button class="stock-btn decrement" data-key="${key}">-</button>
                <input type="number" class="stock-val" data-key="${key}" value="${stock}" min="0">
                <button class="stock-btn increment" data-key="${key}">+</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      return `
        <div class="inventory-product-card">
          <div class="inv-header">
            <img src="${p.images[0] || ''}" class="inv-thumb" alt="${p.name}">
            <div class="inv-info">
              <div class="inv-title">${p.name}</div>
              <div class="inv-sku">SKU Prefix: ${p.skuPrefix}</div>
            </div>
          </div>
          <table class="inv-variants-table">
            <thead>
              <tr>
                <th>Variant</th>
                <th style="width: 150px;">Stock Qty</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      `;
    }).join("");
  }

  // Handle Interactions
  document.getElementById("inventoryContainer").addEventListener("click", e => {
    if (e.target.classList.contains("increment")) {
      const key = e.target.dataset.key;
      const input = document.querySelector(`input.stock-val[data-key="${key}"]`);
      const newVal = setStock(key, parseInt(input.value) + 1);
      input.value = newVal;
      checkRowStatus(input, newVal);
      showToast("Stock updated");
    } else if (e.target.classList.contains("decrement")) {
      const key = e.target.dataset.key;
      const input = document.querySelector(`input.stock-val[data-key="${key}"]`);
      const newVal = setStock(key, parseInt(input.value) - 1);
      input.value = newVal;
      checkRowStatus(input, newVal);
      showToast("Stock updated");
    }
  });

  document.getElementById("inventoryContainer").addEventListener("change", e => {
    if (e.target.classList.contains("stock-val")) {
      const key = e.target.dataset.key;
      const newVal = setStock(key, e.target.value);
      e.target.value = newVal;
      checkRowStatus(e.target, newVal);
      showToast("Stock updated");
    }
  });

  function checkRowStatus(inputEl, val) {
    const tr = inputEl.closest("tr");
    const badge = tr.querySelector(".low-stock-badge");
    if (val === 0) {
      tr.classList.add("low-stock");
      if (badge) badge.textContent = "Out of Stock";
    } else if (val <= LOW_STOCK_THRESHOLD) {
      tr.classList.add("low-stock");
      if (badge) badge.textContent = "Low Stock";
    } else {
      tr.classList.remove("low-stock");
    }
  }

  document.getElementById("invSearch").addEventListener("input", e => {
    renderInventory(e.target.value);
  });

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById("adminToast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
  }

  document.addEventListener("DOMContentLoaded", loadInventory);
})();
