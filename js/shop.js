// ---------- Shop page: fetch products from Supabase and render them ----------

const productGrid = document.getElementById('product-grid');

async function loadProducts() {
  productGrid.innerHTML = `<div class="loading-state">Loading products...</div>`;

  const { data: products, error } = await supabaseClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    productGrid.innerHTML = `<div class="empty-state">Couldn't load products right now. Please try again shortly.</div>`;
    return;
  }

  if (!products || products.length === 0) {
    productGrid.innerHTML = `<div class="empty-state">No products yet — check back soon!</div>`;
    return;
  }

  renderProducts(products);
}

function renderProducts(products) {
  productGrid.innerHTML = ''; // clear loading state

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'featured-card';

    // Use the product image if it has one, otherwise a simple placeholder icon
    const thumbContent = product.image_url
      ? `<img src="${product.image_url}" alt="${product.name}">`
      : `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
           <rect x="20" y="30" width="60" height="60" rx="10" fill="#8558e0"/>
           <circle cx="50" cy="20" r="14" fill="#e9c9a8"/>
           <rect x="36" y="4" width="28" height="16" rx="8" fill="#241c2e"/>
         </svg>`;

    const outOfStock = product.stock_qty <= 0;

    card.innerHTML = `
      <div class="featured-label">${outOfStock ? 'Out of Stock' : 'In Stock'}</div>
      <div class="featured-thumb">${thumbContent}</div>
      <h4>${product.name}</h4>
      <div class="sub">${product.description || ''}</div>
      <button class="card-cta" ${outOfStock ? 'disabled' : ''} data-id="${product.id}">
        ${outOfStock ? 'Sold Out' : `$${Number(product.price).toFixed(2)}`}
      </button>
    `;

    if (!outOfStock) {
      const btn = card.querySelector('.card-cta');
      btn.addEventListener('click', () => addToCart(product));
    }

    productGrid.appendChild(card);
  });
}

// Load the products as soon as the page opens
loadProducts();
