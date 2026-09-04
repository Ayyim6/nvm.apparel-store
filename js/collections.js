document.addEventListener("DOMContentLoaded", async function() {
    const list = document.getElementById("dynamicCollectionsList");
    if (!list) return;

    list.innerHTML = '<p style="text-align: center; padding: 40px;">Loading collections...</p>';

    // 1. Fetch Admin Settings (Visibility, Sequence Order, and Headers)
    let siteSettings = { categoryVisibility: {} };
    let gallerySettings = { headers: {}, collectionOrder: [] };
    try {
        const storedSite = localStorage.getItem("nvm_site_settings");
        if (storedSite) siteSettings = JSON.parse(storedSite);
        
        const storedGallery = localStorage.getItem("nvm_gallery_settings");
        if (storedGallery) gallerySettings = JSON.parse(storedGallery);
    } catch(e) {}

    // 2. Fetch products
    if (typeof supabaseClient === 'undefined') {
        list.innerHTML = '<p style="text-align: center; padding: 40px;">Database connection error.</p>';
        return;
    }
    
    const { data: products, error } = await supabaseClient.from('products').select('category');
    
    if (error || !products) {
        list.innerHTML = '<p style="text-align: center; padding: 40px;">Failed to load collections.</p>';
        return;
    }

    // 3. Find unique categories
    const dbCategories = [...new Set(products.map(p => p.category).filter(Boolean))];

    if (dbCategories.length === 0) {
        list.innerHTML = '<p style="text-align: center; padding: 40px;">No collections available yet.</p>';
        return;
    }

    // 4. Merge DB categories with the custom sequence order
    let displayOrder = [];
    if (gallerySettings.collectionOrder && gallerySettings.collectionOrder.length > 0) {
        gallerySettings.collectionOrder.forEach(cat => {
            if (dbCategories.includes(cat)) displayOrder.push(cat);
        });
    }
    dbCategories.forEach(cat => {
        if (!displayOrder.includes(cat)) displayOrder.push(cat);
    });

    // 5. Render Collection Rows
    list.innerHTML = "";
    let visibleCount = 0;

    displayOrder.forEach((catSlug) => {
        if (siteSettings.categoryVisibility[catSlug] === false) return;

        visibleCount++;
        const title = catSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const bgImage = gallerySettings.headers[catSlug] || 'images/headerbg.jpg';

        const row = document.createElement("div");
        row.className = "collection-row";
        
        // CSS to push content to the bottom-center
        row.style.cssText = `
            position: relative;
            height: 550px; 
            overflow: hidden;
            display: flex;
            align-items: flex-end; /* Pushes content to the bottom */
            justify-content: center; /* Horizontally centers content */
            padding: 40px; /* Gives space from the bottom edge */
            /* Gradient overlay is heavier at the bottom to protect the text */
            background-image: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 50%), url('${bgImage}');
            background-size: cover;
            background-position: center;
        `;
        
        row.innerHTML = `
            <div class="collection-info" data-aos="fade-up" style="text-align: center; z-index: 2; position: relative; width: 100%;">
              <h2 style="font-size: 1.8rem; margin-bottom: 16px; font-family: 'Archivo Black', sans-serif; color: #fff; text-shadow: 0 2px 8px rgba(0,0,0,0.6);">
                 ${title}
              </h2>
              
              <!-- SMALLER GLASS BUTTON -->
              <a href="category.html?category=${catSlug}" class="btn-glass" style="
                display: inline-block;
                padding: 10px 22px; /* Smaller padding */
                font-size: 0.85rem; /* Smaller text */
                font-weight: 600;
                color: #fff;
                text-decoration: none;
                background: rgba(255, 255, 255, 0.15); 
                backdrop-filter: blur(12px); 
                -webkit-backdrop-filter: blur(12px);
                border: 1px solid rgba(255, 255, 255, 0.3);
                border-radius: 50px;
                transition: all 0.3s ease;
              " onmouseover="this.style.background='rgba(255, 255, 255, 0.25)'" onmouseout="this.style.background='rgba(255, 255, 255, 0.15)'">
                 Explore Collection
              </a>
            </div>
        `;
        
        list.appendChild(row);
    });

    if (visibleCount === 0) {
        list.innerHTML = '<p style="text-align: center; padding: 40px;">All collections are currently hidden.</p>';
    }

    // 6. Refresh the animations AFTER the database renders the HTML
    setTimeout(() => {
        if (typeof AOS !== 'undefined') {
            AOS.refreshHard();
        }
    }, 100);
});