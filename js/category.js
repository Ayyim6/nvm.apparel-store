document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    let slug = params.get("category");

    // Fallback if data-category is hardcoded on the body
    if (!slug && document.body.dataset.category) {
        slug = document.body.dataset.category;
    }

    // Find the product grid (using both possible IDs just in case)
    const grid = document.getElementById("categoryProductGrid") || document.getElementById("product-grid");
    if (!grid) return;

    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">Loading collection...</p>';

    if (!slug) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No category specified.</p>';
        return;
    }

    // 1. Fetch Local Admin Settings (Header image & Gallery)
    let siteSettings = { activeNewArrival: "home-jerseys" };
    let gallerySettings = { headers: {}, galleries: {} };
    try {
        const storedSite = localStorage.getItem("nvm_site_settings");
        if (storedSite) siteSettings = JSON.parse(storedSite);
        const storedGallery = localStorage.getItem("nvm_gallery_settings");
        if (storedGallery) gallerySettings = JSON.parse(storedGallery);
    } catch(e) {}

    // Handle "New Arrivals" redirection logic if clicked from homepage
    if (slug === "new-arrivals") {
        slug = siteSettings.activeNewArrival;
    }

    // 2. Setup Page Headers & Background Images
    const formattedTitle = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    document.title = formattedTitle + " — NVM Store";
    
    // Update Text Elements if they exist
    const titleEl = document.getElementById("categoryTitle");
    if (titleEl) titleEl.textContent = formattedTitle;
    
    const gridTitleEl = document.getElementById("categoryGridTitle");
    if (gridTitleEl) gridTitleEl.textContent = "Shop " + formattedTitle;

    // Update the Hero Background image
    const heroEl = document.getElementById("categoryHero");
    if (heroEl) {
        const headerImg = gallerySettings.headers[slug] || 'images/headerbg.jpg';
        heroEl.style.backgroundImage = `url('${headerImg}')`;
    }

    // 3. Fetch Products from Supabase
    if (typeof supabaseClient === 'undefined') {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Database connection error.</p>';
        return;
    }

    const { data: categoryProducts, error } = await supabaseClient
        .from('products')
        .select('*')
        .eq('category', slug); // Exact match for the category slug

    // 4. Render Products as Cards
    if (error || !categoryProducts || categoryProducts.length === 0) {
        grid.innerHTML = `<p style="grid-column: 1/-1; text-align: center; padding: 40px;">No products found in this collection yet.</p>`;
    } else {
        grid.innerHTML = "";
        categoryProducts.forEach(product => {
            // Read colors array or use a default if missing
            const colors = (product.colors && product.colors.length > 0) ? product.colors : [{name: "Default", images: []}];
            
            // Loop through each color variant to create an individual card
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
                
                // Matches the beautiful styling from the Shop page
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

    // 5. Render Shared Category Gallery
    // Look for the gallery wrapper container in your category.html file
    const gallerySection = document.getElementById("categoryGallerySection"); 
    const galleryGrid = document.getElementById("categoryGallery");
    
    const sharedImages = gallerySettings.galleries[`cat_${slug}`] || [];
    
    if (sharedImages.length > 0) {
        // We have images! Show the gallery.
        if (gallerySection) gallerySection.style.display = "block";
        if (galleryGrid) {
            galleryGrid.style.display = "grid"; 
            
            // Add some clean layout CSS to the grid if it doesn't already have it
            galleryGrid.style.gridTemplateColumns = "repeat(auto-fit, minmax(250px, 1fr))";
            galleryGrid.style.gap = "16px";

            galleryGrid.innerHTML = sharedImages.map(src => `
                <div class="category-gallery-item" style="border-radius: 12px; overflow: hidden; aspect-ratio: 4/5;">
                    <img src="${src}" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy">
                </div>
            `).join("");
        }
    } else {
        // No images? Hide the entire gallery section so there are no empty gaps.
        if (gallerySection) gallerySection.style.display = "none";
        if (galleryGrid) galleryGrid.style.display = "none";
        
        // Failsafe: if you just have an <h3> title right above the grid, hide that too.
        if (galleryGrid && galleryGrid.previousElementSibling) {
            galleryGrid.previousElementSibling.style.display = "none";
        }
    }
});