/**
 * product-card.js — shared product card markup
 * -----------------------------------------------------------------
 * Used by shop.js and category.js so both render the exact same
 * card. Cards only ever link to the product page now — no direct
 * "add to cart" from a grid, on purpose: adding straight from a
 * card skips size/type selection, which is how items were ending up
 * incomplete in the cart. Every add now goes through product.html,
 * which already requires a size before it'll let you add.
 *
 * Accepts either shape:
 *   - a real Supabase row: { id, name, description, price, stock_qty, image_url }
 *   - a lightweight mock entry: { id, name, description, price, image_url, stock_qty }
 * (category.js's mock catalog already matches the Supabase shape so
 * this needs no branching — same function either way.)
 */
function buildProductCardHTML(product) {
  const thumbContent = product.image_url
    ? `<img src="${product.image_url}" alt="${product.name}">`
    : `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
         <rect x="20" y="30" width="60" height="60" rx="10" fill="#8558e0"/>
         <circle cx="50" cy="20" r="14" fill="#e9c9a8"/>
         <rect x="36" y="4" width="28" height="16" rx="8" fill="#241c2e"/>
       </svg>`;

  const outOfStock = Number(product.stock_qty) <= 0;
  const href = product.href || `product.html?id=${product.id}`;

  return `
    <div class="featured-label">${outOfStock ? 'Out of Stock' : 'In Stock'}</div>
    <a class="card-link" href="${href}">
      <div class="featured-thumb">${thumbContent}</div>
      <h4>${product.name}</h4>
      <div class="sub">${product.description || ''}</div>
      <div class="card-bottom-row">
        <span class="card-price">${outOfStock ? 'Sold Out' : 'RM' + Number(product.price).toFixed(2)}</span>
        <span class="card-shopnow">${outOfStock ? '' : 'Shop Now →'}</span>
      </div>
    </a>
  `;
}

window.buildProductCardHTML = buildProductCardHTML;
