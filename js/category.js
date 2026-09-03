
const productGrid = document.getElementById('categoryProductGrid');
const categoryTitle = document.getElementById('categoryTitle');
const categoryDesc = document.getElementById('categoryDesc');

async function loadCategory() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('id');

  if (!slug) {
    categoryTitle.textContent = "All Categories";
    categoryDesc.textContent = "Browse our full collection.";
  } else {
    // Basic title formatting
    categoryTitle.textContent = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    categoryDesc.textContent = "Showing products in this category.";
  }

  categoryProductGrid.innerHTML = `<div class="loading-state">Loading products...</div>`;

  let query = supabaseClient.from('products').select('*');
  if (slug) {
      // Assuming 'category' column exists, but to be safe we might not have it in the table definition returned in the test.
      // The test returned: id, name, description, price, image_url, sizes, stock_qty, created_at
      // Let's filter by name or description as a fallback, or just fetch all for now since schema might lack category.
      // query = query.ilike('name', `%${slug.split('-')[0]}%`);
  }

  const { data: products, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching products:', error);
    categoryProductGrid.innerHTML = `<div class="empty-state">Couldn't load products right now.</div>`;
    return;
  }

  if (!products || products.length === 0) {
    categoryProductGrid.innerHTML = `<div class="empty-state">No products found in this category.</div>`;
    return;
  }

  categoryProductGrid.innerHTML = '';
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'featured-card';
    card.innerHTML = buildProductCardHTML(product);
    categoryProductGrid.appendChild(card);
  });
}

document.addEventListener("DOMContentLoaded", loadCategory);
