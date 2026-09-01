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
    card.innerHTML = buildProductCardHTML(product);
    productGrid.appendChild(card);
  });
}

// Load the products as soon as the page opens
loadProducts();
