document.addEventListener("DOMContentLoaded", async function () {
    const grid = document.getElementById("newArrivalsProductGrid");
    if (!grid) return;

    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">Loading new arrivals...</p>';

    // 1. Fetch Local Admin Settings
    let siteSettings = { activeNewArrival: "home-jerseys" };
    let gallerySettings = { headers: {} };
    try {
        const storedSite = localStorage.getItem("nvm_site_settings");
        if (storedSite) siteSettings = JSON.parse(storedSite);
        const storedGallery = localStorage.getItem("nvm_gallery_settings");
        if (storedGallery) gallerySettings = JSON.parse(storedGallery);
    } catch(e) {}

    // Get the category assigned as the active new arrival
    const activeCat = siteSettings.activeNewArrival || "home-jerseys";

    // 2. Setup Page Headers & Background Images
    const formattedTitle = activeCat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Update Page Tab Title
    document.title = "New Arrivals: " + formattedTitle + " — NVM Store";
    
    // Update the Hero Text
    const titleEl = document.getElementById("newArrivalsTitle");
    if (titleEl) titleEl.textContent = "Latest " + formattedTitle;
    
    // Update the sub-heading above the grid
    const gridTitleEl = document.getElementById("newArrivalsGridTitle");
    if (gridTitleEl) gridTitleEl.textContent = "Shop " + formattedTitle;

    // Update the Hero Background image based on admin gallery settings
    const heroEl = document.getElementById("newArrivalsHero");
    if (heroEl) {
        const headerImg = gallerySettings.headers[activeCat] || 'images/headerbg.jpg';
        heroEl.style.backgroundImage = `url('${headerImg}')`;
    }

    // 3. Fetch Products from Supabase
    if (typeof supabaseClient === 'undefined') {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Database connection error.</p>';
        return;
    }

    // Fetch products belonging to the active "New Arrivals" category
    const { data: products, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('category', activeCat) // Exact match for category
        .order('created_at', { ascending: false });

    // 4. Render Products as Cards (Using the shared Shop/Category card design)
    if (error || !products || products.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px;">New arrivals dropping soon.</p>`;
    } else {
        grid.innerHTML = "";
        products.forEach(product => {
            const colors = (product.colors && product.colors.length > 0) ? product.colors : [{name: "Default", images: []}];
            
            colors.forEach(color => {
                const cardData = {
                    id: product.id,
                    name: `${product.name} — ${color.name}`,
                    price: product.base_price || 0,
                    image_url: (color.images && color.images.length > 0) ? color.images[0] : 'images/placeholder.jpg',
                    stock_qty: product.stock_qty || 10,
                    href: `product.html?id=${product.id}&color=${encodeURIComponent(color.name)}`
                };

                const card = document.createElement("div");
                card.className = "featured-card";
                
                card.innerHTML = `
                    <a href="${cardData.href}" class="card-link" style="text-decoration: none; color: inherit;">
                      <div class="card-image-wrapper" style="position: relative; overflow: hidden; border-radius: 12px; background: var(--surface-alt);">
                        <img src="${cardData.image_url}" alt="${cardData.name}" loading="lazy" style="width: 100%; aspect-ratio: 4/5; object-fit: cover; display: block;">
                        ${cardData.stock_qty <= 0 ? '<span class="badge sold-out" style="position: absolute; top: 10px; left: 10px; background: black; color: white; padding: 4px 8px; font-size: 0.75rem; border-radius: 4px;">Sold Out</span>' : ''}
                      </div>
                      <div class="card-info" style="margin-top: 12px; text-align: left;">
                        <h3 style="font-size: 1rem; margin: 0 0 4px 0; font-family: 'Inter', sans-serif;">${cardData.name}</h3>
                        <p class="price" style="font-weight: bold; margin: 0; color: var(--ink);">RM ${parseFloat(cardData.price).toFixed(2)}</p>
                      </div>
                    </a>
                `;
                grid.appendChild(card);
            });
        });
    }
});