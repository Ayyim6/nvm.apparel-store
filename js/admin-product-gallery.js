(function() {
    let FETCHED_PRODUCTS = [];
    let settings = {
        collectionOrder: [], 
        headers: {},
        galleries: {},
        sizingCharts: [
            { id: "chart_1", name: "Standard T-Shirt Fit", url: "images/sizing-guide.png" }
        ]
    };

    async function loadSettings() {
        try {
            const stored = localStorage.getItem("nvm_gallery_settings");
            if (stored) settings = { ...settings, ...JSON.parse(stored) };
        } catch (e) { console.error(e); }
        
        if (typeof supabaseClient !== 'undefined') {
            const { data } = await supabaseClient.from('products').select('*');
            if (data) {
                // Normalize old database data so it doesn't crash the script
                FETCHED_PRODUCTS = data.map(p => {
                    if (p.colors && Array.isArray(p.colors)) {
                        p.colors = p.colors.map(c => {
                            // If the color is an old simple string, convert it to an object
                            if (typeof c === 'string') return { name: c, swatch: '#000000', images: [] };
                            return c;
                        });
                    }
                    return p;
                });
            }
        }
        
        syncCollectionSequence();
        renderCollectionSequence();
        populateCategorySelects();
        populateProductSelect();
        renderSizingCharts(); // This is what crashed it before! Now the function is included below.
        
        updateHeaderPreview();
        renderCatGalleryGrid();
        
        // Listeners
        document.getElementById("headerCollectionSelect").addEventListener("change", updateHeaderPreview);
        document.getElementById("uploadHeaderBox").addEventListener("click", () => document.getElementById("headerImageUpload").click());
        document.getElementById("headerImageUpload").addEventListener("change", handleHeaderUpload);
        document.getElementById("removeHeaderBtn").addEventListener("click", removeHeaderImage);
        
        document.getElementById("catGallerySelect").addEventListener("change", renderCatGalleryGrid);
        document.getElementById("uploadCatGalleryBox").addEventListener("click", () => document.getElementById("catGalleryImageUpload").click());
        document.getElementById("catGalleryImageUpload").addEventListener("change", handleCatGalleryUpload);

        document.getElementById("galleryProductSelect").addEventListener("change", populateVariantSelect);
        document.getElementById("galleryVariantSelect").addEventListener("change", renderGalleryGrid);
        document.getElementById("uploadGalleryBox").addEventListener("click", () => document.getElementById("galleryImageUpload").click());
        document.getElementById("galleryImageUpload").addEventListener("change", handleGalleryUpload);
        
        document.getElementById("addChartBtn").addEventListener("click", () => {
            settings.sizingCharts.push({ id: 'chart_' + Date.now(), name: "New Sizing Chart", url: "" });
            renderSizingCharts();
        });
        
        document.getElementById("saveGallerySettings").addEventListener("click", () => {
            saveSettings();
            showToast("Local media settings saved!");
        });
    }

    // --- COLLECTION SEQUENCE LOGIC ---
    function syncCollectionSequence() {
        const uniqueCategories = [...new Set(FETCHED_PRODUCTS.map(p => p.category).filter(Boolean))];
        settings.collectionOrder = (settings.collectionOrder || []).filter(c => uniqueCategories.includes(c));
        uniqueCategories.forEach(c => {
            if (!settings.collectionOrder.includes(c)) settings.collectionOrder.push(c);
        });
    }

    function renderCollectionSequence() {
        const list = document.getElementById("collectionOrderList");
        if (!list) return;

        if (settings.collectionOrder.length === 0) {
            list.innerHTML = `<p style="font-size:0.8rem; color:var(--a-ink-soft);">No collections found.</p>`;
            return;
        }

        list.innerHTML = settings.collectionOrder.map((cat, index) => {
            const label = cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `
                <div class="repeater-item" style="display:flex; justify-content:space-between; align-items:center; padding: 12px; margin-bottom: 0; background: var(--a-bg);">
                    <div style="font-weight:600;">${label} <span style="font-size:0.75rem; font-weight:normal; color:var(--a-ink-soft); font-family:monospace; margin-left:8px;">(${cat})</span></div>
                    <div style="display:flex; gap:6px;">
                        <button type="button" class="move-cat-btn" data-dir="-1" data-index="${index}" style="background:var(--a-border); border:none; padding:4px 10px; border-radius:4px; cursor:pointer;" ${index === 0 ? 'disabled style="opacity:0.3;"' : ''}>&uarr;</button>
                        <button type="button" class="move-cat-btn" data-dir="1" data-index="${index}" style="background:var(--a-border); border:none; padding:4px 10px; border-radius:4px; cursor:pointer;" ${index === settings.collectionOrder.length - 1 ? 'disabled style="opacity:0.3;"' : ''}>&darr;</button>
                    </div>
                </div>
            `;
        }).join("");

        list.querySelectorAll(".move-cat-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt(e.target.dataset.index);
                const dir = parseInt(e.target.dataset.dir);
                const temp = settings.collectionOrder[idx];
                settings.collectionOrder[idx] = settings.collectionOrder[idx + dir];
                settings.collectionOrder[idx + dir] = temp;
                
                saveSettings();
                renderCollectionSequence();
                populateCategorySelects(); 
            });
        });
    }

    function populateCategorySelects() {
        const headerSelect = document.getElementById("headerCollectionSelect");
        const catSelect = document.getElementById("catGallerySelect");
        if (!headerSelect || !catSelect) return;

        const optionsHtml = settings.collectionOrder.map(cat => {
            const label = cat.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `<option value="${cat}">${label}</option>`;
        }).join("");

        headerSelect.innerHTML = optionsHtml || `<option value="">No categories found</option>`;
        catSelect.innerHTML = optionsHtml || `<option value="">No categories found</option>`;
    }
    
    // --- Collection Headers (Supabase) ---
    function updateHeaderPreview() {
        const selectEl = document.getElementById("headerCollectionSelect");
        const container = document.getElementById("headerPreviewContainer");
        const img = document.getElementById("headerPreview");
        if (!selectEl) return;
        
        const col = selectEl.value;
        if (settings.headers[col]) {
            img.src = settings.headers[col];
            container.style.display = "block";
        } else {
            container.style.display = "none";
        }
    }
    
    async function handleHeaderUpload(e) {
        if (!e.target.files.length) return;
        const file = e.target.files[0];
        const col = document.getElementById("headerCollectionSelect").value;
        
        if (typeof supabaseClient === 'undefined') return;
        
        showToast("Uploading header to database...");
        try {
            const path = `headers/${col}_${Date.now()}`;
            const { error } = await supabaseClient.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: true });
            if (error) throw error;
            
            const { data } = supabaseClient.storage.from('product-images').getPublicUrl(path);
            settings.headers[col] = data.publicUrl; 
            saveSettings(); 
            updateHeaderPreview();
            showToast("Header replaced successfully!");
        } catch (err) {
            console.error(err);
            showToast("Error: " + err.message);
        } finally {
            e.target.value = ""; 
        }
    }

    function removeHeaderImage() {
        const col = document.getElementById("headerCollectionSelect").value;
        if(confirm("Remove this header image?")) {
            delete settings.headers[col];
            saveSettings();
            updateHeaderPreview();
            showToast("Header removed.");
        }
    }

    // --- Category / Collection Gallery (Supabase) ---
    function renderCatGalleryGrid() {
        const selectEl = document.getElementById("catGallerySelect");
        if (!selectEl) return;

        const catId = selectEl.value;
        const key = `cat_${catId}`;
        const container = document.getElementById("catGalleryGrid");
        
        if (!settings.galleries[key]) settings.galleries[key] = [];
        
        container.innerHTML = settings.galleries[key].map((imgUrl, i) => `
            <div class="gallery-item">
                <img src="${imgUrl}">
                <button class="remove-img" data-cat-index="${i}">x</button>
            </div>
        `).join("");
        
        container.querySelectorAll(".remove-img").forEach(btn => {
            btn.addEventListener("click", (e) => {
                settings.galleries[key].splice(parseInt(e.target.dataset.catIndex), 1);
                saveSettings(); 
                renderCatGalleryGrid();
            });
        });
    }

    async function handleCatGalleryUpload(e) {
        if (!e.target.files.length) return;
        const col = document.getElementById("catGallerySelect").value;
        const key = `cat_${col}`;
        
        if (typeof supabaseClient === 'undefined') return;
        
        showToast("Uploading collection images...");
        try {
            if (!settings.galleries[key]) settings.galleries[key] = [];

            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                const path = `collection_galleries/${col}_${Date.now()}_${i}`;
                
                const { error } = await supabaseClient.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: true });
                if (error) throw error;
                
                const { data } = supabaseClient.storage.from('product-images').getPublicUrl(path);
                settings.galleries[key].push(data.publicUrl);
            }
            saveSettings(); 
            renderCatGalleryGrid();
            showToast("Images uploaded!");
        } catch (err) {
            console.error(err);
            showToast("Upload Error: " + err.message);
        } finally {
            e.target.value = "";
        }
    }
    
    // --- Product Gallery (SQL) ---
    function populateProductSelect() {
        const select = document.getElementById("galleryProductSelect");
        if (!select) return;
        if (FETCHED_PRODUCTS.length === 0) {
            select.innerHTML = `<option value="">No products found</option>`;
            return;
        }
        
        select.innerHTML = FETCHED_PRODUCTS.map(p => {
            const colors = p.colors && p.colors.length ? p.colors.map(c=>c.name).join(" / ") : "No Colors";
            return `<option value="${p.id}">${p.name} — ${colors}</option>`;
        }).join("");
        populateVariantSelect();
    }
    
    function populateVariantSelect() {
        const pId = document.getElementById("galleryProductSelect").value;
        const product = FETCHED_PRODUCTS.find(p => p.id === pId);
        const select = document.getElementById("galleryVariantSelect");
        if (!select) return;
        
        if (product && product.colors && product.colors.length > 0) {
            select.innerHTML = product.colors.map((c, idx) => `<option value="${idx}">${c.name || 'Default'}</option>`).join("");
        } else {
            select.innerHTML = `<option value="0">Default</option>`;
        }
        renderGalleryGrid();
    }
    
    function renderGalleryGrid() {
        const pId = document.getElementById("galleryProductSelect").value;
        const cIdx = document.getElementById("galleryVariantSelect").value;
        const container = document.getElementById("galleryGrid");
        if (!container) return;
        
        const product = FETCHED_PRODUCTS.find(p => p.id === pId);
        if (!product || !product.colors || !product.colors[cIdx]) {
            container.innerHTML = `<p style="font-size:0.8rem; color:var(--a-ink-soft); grid-column: 1 / -1;">No product selected.</p>`;
            return;
        }

        const images = product.colors[cIdx].images || [];
        
        if (images.length === 0) {
            container.innerHTML = `<p style="font-size:0.8rem; color:var(--a-ink-soft); grid-column: 1 / -1;">No images uploaded for this variant.</p>`;
            return;
        }
        
        container.innerHTML = images.map((imgUrl, i) => `
            <div class="gallery-item">
                <img src="${imgUrl}">
                <div style="position:absolute; top:4px; left:4px; display:flex; gap:4px;">
                    ${i > 0 ? `<button class="move-img" data-dir="-1" data-index="${i}" style="background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:4px; cursor:pointer; padding: 2px 6px;">&larr;</button>` : ''}
                    ${i < images.length - 1 ? `<button class="move-img" data-dir="1" data-index="${i}" style="background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:4px; cursor:pointer; padding: 2px 6px;">&rarr;</button>` : ''}
                </div>
                <button class="remove-img" data-index="${i}">x</button>
                ${i === 0 ? '<div class="thumb-label">Thumbnail</div>' : ''}
            </div>
        `).join("");
        
        container.querySelectorAll(".remove-img").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                if(!confirm("Remove this image from the database?")) return;
                const idx = parseInt(e.target.dataset.index);
                images.splice(idx, 1);
                await supabaseClient.from('products').update({ colors: product.colors }).eq('id', product.id);
                renderGalleryGrid();
            });
        });

        container.querySelectorAll(".move-img").forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const idx = parseInt(e.target.dataset.index);
                const dir = parseInt(e.target.dataset.dir);
                const temp = images[idx];
                images[idx] = images[idx + dir];
                images[idx + dir] = temp;
                await supabaseClient.from('products').update({ colors: product.colors }).eq('id', product.id);
                renderGalleryGrid();
            });
        });
    }

    async function handleGalleryUpload(e) {
        if (!e.target.files.length) return;
        const pId = document.getElementById("galleryProductSelect").value;
        const cIdx = document.getElementById("galleryVariantSelect").value;
        const product = FETCHED_PRODUCTS.find(p => p.id === pId);
        
        if (!product || !product.colors || !product.colors[cIdx]) return;
        
        showToast("Uploading images to database...");
        
        try {
            if (!product.colors[cIdx].images) product.colors[cIdx].images = [];

            for (let i = 0; i < e.target.files.length; i++) {
                const file = e.target.files[i];
                const colorName = product.colors[cIdx].name || 'default';
                const safeColor = colorName.replace(/[^a-zA-Z0-9]/g, '_');
                const path = `${product.id}/${safeColor}/gallery_append_${Date.now()}_${i}`;
                
                const { error } = await supabaseClient.storage.from('product-images').upload(path, file, { cacheControl: '3600', upsert: true });
                if (error) throw error;
                
                const { data } = supabaseClient.storage.from('product-images').getPublicUrl(path);
                product.colors[cIdx].images.push(data.publicUrl);
            }
            
            const { error: dbError } = await supabaseClient.from('products').update({ colors: product.colors }).eq('id', product.id);
            if (dbError) throw dbError;
            
            renderGalleryGrid();
            showToast("Images uploaded and saved.");
        } catch (err) {
            console.error(err);
            showToast("Upload Error: " + err.message);
        } finally {
            e.target.value = "";
        }
    }

    // --- SIZING CHARTS (Now Properly Included) ---
    function renderSizingCharts() {
        const list = document.getElementById("sizingChartList");
        if (!list) return;
        
        list.innerHTML = settings.sizingCharts.map(chart => `
            <div class="repeater-item" data-id="${chart.id}">
                <div class="repeater-item-head">
                  <span class="tag">Sizing Chart</span>
                  <button type="button" class="remove-btn remove-chart">Remove</button>
                </div>
                <div class="repeater-row" style="grid-template-columns: 2fr 1fr;">
                    <div>
                        <label>Chart Name</label>
                        <input type="text" class="chart-name-input" value="${chart.name}">
                    </div>
                    <div>
                        <label>Image Upload</label>
                        <input type="file" class="chart-file-input" accept="image/*">
                    </div>
                </div>
                ${chart.url ? `<img src="${chart.url}" style="height:60px; margin-top:10px; border-radius:6px;">` : ''}
            </div>
        `).join("");
        
        list.querySelectorAll(".remove-chart").forEach(btn => {
            btn.addEventListener("click", (e) => {
                settings.sizingCharts = settings.sizingCharts.filter(c => c.id !== e.target.closest(".repeater-item").dataset.id);
                renderSizingCharts();
            });
        });
        
        list.querySelectorAll(".chart-name-input").forEach(input => {
            input.addEventListener("input", (e) => {
                const chart = settings.sizingCharts.find(c => c.id === e.target.closest(".repeater-item").dataset.id);
                if (chart) chart.name = e.target.value;
            });
        });
        
        list.querySelectorAll(".chart-file-input").forEach(input => {
            input.addEventListener("change", (e) => {
                if (!e.target.files.length) return;
                const chart = settings.sizingCharts.find(c => c.id === e.target.closest(".repeater-item").dataset.id);
                const reader = new FileReader();
                reader.onload = function(event) {
                    if (chart) chart.url = event.target.result;
                    renderSizingCharts();
                };
                reader.readAsDataURL(e.target.files[0]);
            });
        });
    }

    // --- Save Local Settings ---
    function saveSettings() {
        try {
            localStorage.setItem("nvm_gallery_settings", JSON.stringify(settings));
        } catch (e) { console.error(e); }
    }

    let toastTimer = null;
    function showToast(message) {
      const toast = document.getElementById("adminToast");
      if(!toast) return;
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
    }
    
    document.addEventListener("DOMContentLoaded", loadSettings);
})();