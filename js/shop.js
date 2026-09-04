document.addEventListener('DOMContentLoaded', async () => {
  const productGrid = document.getElementById('product-grid');
  if (!productGrid) return;

  productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Loading products...</p>';

  // FIX: Check for supabaseClient directly, not window.supabaseClient
  if (typeof supabaseClient === 'undefined') {
      productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Database connection error. Please check your scripts.</p>';
      return;
  }

  // Fetch all products from Supabase
  const { data: products, error } = await supabaseClient.from('products').select('*');

  if (error || !products || products.length === 0) {
      productGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">No products available at the moment.</p>';
      return;
  }

  renderProducts(products);
});

function renderProducts(products) {
  const productGrid = document.getElementById('product-grid');
  productGrid.innerHTML = ''; 

  products.forEach(product => {
    // Read the colors array of objects from the DB
    const colors = (product.colors && product.colors.length > 0) ? product.colors : [{name: "Default", images: []}];
    
    colors.forEach(color => {
        const cardData = {
            id: product.id,
            name: `${product.name} — ${color.name}`,
            description: product.description || "",
            price: product.base_price || 0,
            image_url: (color.images && color.images.length > 0) ? color.images[0] : 'images/placeholder.jpg',
            stock_qty: product.stock_qty || 10,
            href: `product.html?id=${product.id}&color=${encodeURIComponent(color.name)}`
        };

        const card = document.createElement('div');
        card.className = 'featured-card';
        card.innerHTML = buildProductCardHTML(cardData);
        productGrid.appendChild(card);
    });
  });
}

function buildProductCardHTML(data) {
  return `
    <a href="${data.href}" class="card-link" style="text-decoration: none; color: inherit;">
      <div class="card-image-wrapper" style="position: relative; overflow: hidden; border-radius: 12px; background: var(--surface-alt);">
        <img src="${data.image_url}" alt="${data.name}" loading="lazy" style="width: 100%; aspect-ratio: 4/5; object-fit: cover;">
        ${data.stock_qty <= 0 ? '<span class="badge sold-out" style="position: absolute; top: 10px; left: 10px; background: black; color: white; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px;">Sold Out</span>' : ''}
      </div>
      <div class="card-info" style="margin-top: 12px; text-align: left;">
        <h3 style="font-size: 1rem; margin: 0 0 4px 0; font-family: 'Inter', sans-serif;">${data.name}</h3>
        <p class="price" style="font-weight: bold; margin: 0; color: var(--ink);">RM ${parseFloat(data.price).toFixed(2)}</p>
      </div>
    </a>
  `;
}