(function() {
    let FETCHED_PRODUCTS = [];
    let siteSettings = { 
        activeNewArrival: "", 
        categoryVisibility: {} 
    };

    async function initManagePage() {
        // 1. Load Storefront Settings from LocalStorage
        try {
            const stored = localStorage.getItem("nvm_site_settings");
            if (stored) siteSettings = { ...siteSettings, ...JSON.parse(stored) };
        } catch (e) { console.error(e); }

        // 2. Fetch Products from Supabase
        const tableBody = document.getElementById("manageProductTableBody");
        if (typeof supabaseClient === 'undefined') {
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Database connection error.</td></tr>`;
            return;
        }

        const { data, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
        
        if (error) {
            console.error(error);
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Failed to load products.</td></tr>`;
            return;
        }

        FETCHED_PRODUCTS = (data || []).map(p => {
            if (p.colors && Array.isArray(p.colors)) {
                p.colors = p.colors.map(c => typeof c === 'string' ? { name: c, images: [] } : c);
            }
            return p;
        });

        renderStorefrontSettings();
        renderProductTable();
        
        document.getElementById("saveStorefrontBtn").addEventListener("click", saveStorefrontSettings);
    }

    // --- STOREFRONT SETTINGS ---
    function renderStorefrontSettings() {
        const uniqueCategories = [...new Set(FETCHED_PRODUCTS.map(p => p.category).filter(Boolean))];
        
        // Render New Arrival Select
        const select = document.getElementById("newArrivalSelect");
        if (select) {
            select.innerHTML = uniqueCategories.map(cat => {
                const label = cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                return `<option value="${cat}" ${siteSettings.activeNewArrival === cat ? 'selected' : ''}>${label}</option>`;
            }).join("") || `<option value="">No categories found</option>`;
            
            // Set default if empty
            if (!siteSettings.activeNewArrival && uniqueCategories.length > 0) {
                siteSettings.activeNewArrival = uniqueCategories[0];
                select.value = uniqueCategories[0];
            }
        }

        // Render Visibility Toggles
        const visList = document.getElementById("categoryVisibilityList");
        if (visList) {
            if (uniqueCategories.length === 0) {
                visList.innerHTML = `<p style="font-size:0.8rem; color:var(--a-ink-soft);">No categories found in database.</p>`;
                return;
            }

            visList.innerHTML = uniqueCategories.map(cat => {
                const label = cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const isVisible = siteSettings.categoryVisibility[cat] !== false;
                
                // Pure, clean label - no double text!
                return `
                    <div class="visibility-row">
                        <strong style="font-size: 0.95rem;">${label}</strong>
                        <label class="toggle-switch">
                            <input type="checkbox" class="vis-toggle" data-cat="${cat}" ${isVisible ? 'checked' : ''}>
                            <div class="slider"></div>
                        </label>
                    </div>
                `;
            }).join("");
        }
    }

    function saveStorefrontSettings() {
        siteSettings.activeNewArrival = document.getElementById("newArrivalSelect").value;
        
        document.querySelectorAll(".vis-toggle").forEach(toggle => {
            siteSettings.categoryVisibility[toggle.dataset.cat] = toggle.checked;
        });

        try {
            localStorage.setItem("nvm_site_settings", JSON.stringify(siteSettings));
            showToast("Storefront settings saved!");
        } catch (e) {
            showToast("Failed to save settings.");
        }
    }

    // --- PRODUCT TABLE & DELETION ---
    function renderProductTable() {
        const tbody = document.getElementById("manageProductTableBody");
        if (!tbody) return;

        if (FETCHED_PRODUCTS.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">No products found in database.</td></tr>`;
            return;
        }

        tbody.innerHTML = FETCHED_PRODUCTS.map(p => {
            let thumbUrl = "images/placeholder.jpg";
            if (p.colors && p.colors.length > 0 && p.colors[0].images && p.colors[0].images.length > 0) {
                thumbUrl = p.colors[0].images[0];
            }

            // Extract all color names into badges
            const colorBadges = (p.colors && p.colors.length > 0) 
                ? p.colors.map(c => `<span class="color-badge">${c.name || 'Unnamed'}</span>`).join("") 
                : `<span class="color-badge">Default</span>`;

            const catLabel = (p.category || "").replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const price = parseFloat(p.base_price || 0).toFixed(2);
            
            return `
                <tr>
                    <td><img src="${thumbUrl}" alt="Thumb"></td>
                    <td style="font-weight: 600;">${p.name || 'Untitled'}</td>
                    <td>${colorBadges}</td> <!-- NEW COLORS COLUMN -->
                    <td>${catLabel}</td>
                    <td>RM ${price}</td>
                    <td><span class="status-badge">${(p.stock_type || 'regular')}</span></td>
                    <td>
                        <button class="remove-btn delete-product-btn" data-id="${p.id}" style="padding: 6px 12px; font-family: 'Inter', sans-serif;">Delete</button>
                    </td>
                </tr>
            `;
        }).join("");

        document.querySelectorAll(".delete-product-btn").forEach(btn => {
            btn.addEventListener("click", handleDeleteProduct);
        });
    }

    async function handleDeleteProduct(e) {
        const productId = e.target.dataset.id;
        const product = FETCHED_PRODUCTS.find(p => p.id === productId);
        if (!product) return;

        const confirmMsg = `WARNING: Are you sure you want to permanently delete "${product.name}"?\n\nThis will remove the product from the database AND delete all its images from storage. This cannot be undone.`;
        if (!confirm(confirmMsg)) return;

        e.target.textContent = "Deleting...";
        e.target.disabled = true;

        try {
            let urlsToDelete = [];
            if (product.colors) {
                product.colors.forEach(c => {
                    if (c.images) urlsToDelete.push(...c.images);
                });
            }

            if (urlsToDelete.length > 0) {
                const pathsToDelete = urlsToDelete.map(url => {
                    const parts = url.split('/product-images/');
                    return parts.length > 1 ? parts[1] : null;
                }).filter(Boolean);

                if (pathsToDelete.length > 0) {
                    await supabaseClient.storage.from('product-images').remove(pathsToDelete);
                    console.log("Deleted images:", pathsToDelete);
                }
            }

            const { error } = await supabaseClient.from('products').delete().eq('id', productId);
            if (error) throw error;

            FETCHED_PRODUCTS = FETCHED_PRODUCTS.filter(p => p.id !== productId);
            renderStorefrontSettings(); 
            renderProductTable();
            showToast("Product deleted successfully.");

        } catch (err) {
            console.error(err);
            alert("Failed to delete product: " + err.message);
            e.target.textContent = "Delete";
            e.target.disabled = false;
        }
    }

    // --- UTILS ---
    let toastTimer = null;
    function showToast(message) {
      const toast = document.getElementById("adminToast");
      if(!toast) return;
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2500);
    }

    document.addEventListener("DOMContentLoaded", initManagePage);
})();