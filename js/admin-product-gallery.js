(function() {
    let settings = {
        headers: {},
        galleries: {},
        sizingCharts: [
            { id: "chart_1", name: "Standard T-Shirt Fit", url: "images/sizing-guide.png" }
        ]
    };

    function loadSettings() {
        try {
            const stored = localStorage.getItem("nvm_gallery_settings");
            if (stored) {
                settings = JSON.parse(stored);
            }
        } catch (e) {
            console.error(e);
        }

        populateProductSelect();
        renderSizingCharts();

        // Listeners
        document.getElementById("headerCollectionSelect").addEventListener("change", updateHeaderPreview);
        document.getElementById("galleryProductSelect").addEventListener("change", populateVariantSelect);
        document.getElementById("galleryVariantSelect").addEventListener("change", renderGalleryGrid);

        // Simulate uploads
        document.getElementById("uploadHeaderBox").addEventListener("click", () => document.getElementById("headerImageUpload").click());
        document.getElementById("headerImageUpload").addEventListener("change", handleHeaderUpload);

        document.getElementById("uploadGalleryBox").addEventListener("click", () => document.getElementById("galleryImageUpload").click());
        document.getElementById("galleryImageUpload").addEventListener("change", handleGalleryUpload);

        updateHeaderPreview();
    }

    // --- Collection Headers ---
    function updateHeaderPreview() {
        const col = document.getElementById("headerCollectionSelect").value;
        const img = document.getElementById("headerPreview");
        if (settings.headers[col]) {
            img.src = settings.headers[col];
            img.style.display = "block";
        } else {
            img.style.display = "none";
        }
    }

    function handleHeaderUpload(e) {
        if (!e.target.files.length) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            const col = document.getElementById("headerCollectionSelect").value;
            settings.headers[col] = event.target.result; // Data URL
            updateHeaderPreview();
        };
        reader.readAsDataURL(file);
    }

    // --- Product Gallery ---
    function populateProductSelect() {
        if (!window.AdminInventoryData) return;
        const select = document.getElementById("galleryProductSelect");
        select.innerHTML = window.AdminInventoryData.PRODUCTS.map(p => `<option value="${p.id}">${p.name}</option>`).join("");
        populateVariantSelect();
    }

    function populateVariantSelect() {
        if (!window.AdminInventoryData) return;
        const pId = document.getElementById("galleryProductSelect").value;
        const product = window.AdminInventoryData.PRODUCTS.find(p => p.id === pId);
        const select = document.getElementById("galleryVariantSelect");

        if (product && product.colors.length > 0) {
            select.innerHTML = product.colors.map(c => `<option value="${c}">${c}</option>`).join("");
        } else {
            select.innerHTML = `<option value="default">Default Variant</option>`;
        }
        renderGalleryGrid();
    }

    function renderGalleryGrid() {
        const pId = document.getElementById("galleryProductSelect").value;
        const vId = document.getElementById("galleryVariantSelect").value;
        const key = `${pId}_${vId}`;
        const container = document.getElementById("galleryGrid");

        // initialize array if empty
        if (!settings.galleries[key]) {
             // Try to pre-fill from mock data if it's new
             const p = window.AdminInventoryData.PRODUCTS.find(x => x.id === pId);
             if (p && p.images && p.images.length > 0) {
                 settings.galleries[key] = [...p.images];
             } else {
                 settings.galleries[key] = [];
             }
        }

        const images = settings.galleries[key];

        if (images.length === 0) {
            container.innerHTML = `<p style="font-size:0.8rem; color:var(--a-ink-soft); grid-column: 1 / -1;">No images uploaded for this variant.</p>`;
            return;
        }

        container.innerHTML = images.map((imgUrl, i) => `
            <div class="gallery-item">
                <img src="${imgUrl}">
                <button class="remove-img" data-index="${i}">x</button>
                ${i === 0 ? '<div class="thumb-label">Thumbnail</div>' : ''}
            </div>
        `).join("");

        container.querySelectorAll(".remove-img").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const idx = parseInt(e.target.dataset.index);
                settings.galleries[key].splice(idx, 1);
                renderGalleryGrid();
            });
        });
    }

    function handleGalleryUpload(e) {
        if (!e.target.files.length) return;
        const pId = document.getElementById("galleryProductSelect").value;
        const vId = document.getElementById("galleryVariantSelect").value;
        const key = `${pId}_${vId}`;

        Array.from(e.target.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(event) {
                if (!settings.galleries[key]) settings.galleries[key] = [];
                settings.galleries[key].push(event.target.result); // Append to sequence
                renderGalleryGrid();
            };
            reader.readAsDataURL(file);
        });
    }

    // --- Sizing Charts ---
    function renderSizingCharts() {
        const list = document.getElementById("sizingChartList");
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
                ${chart.url.startsWith('data:') || chart.url.startsWith('images/') ? `<img src="${chart.url}" style="height:60px; margin-top:10px; border-radius:6px;">` : ''}
            </div>
        `).join("");

        // Bind listeners
        list.querySelectorAll(".remove-chart").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const id = e.target.closest(".repeater-item").dataset.id;
                settings.sizingCharts = settings.sizingCharts.filter(c => c.id !== id);
                renderSizingCharts();
            });
        });

        list.querySelectorAll(".chart-name-input").forEach(input => {
            input.addEventListener("input", (e) => {
                const id = e.target.closest(".repeater-item").dataset.id;
                const chart = settings.sizingCharts.find(c => c.id === id);
                if (chart) chart.name = e.target.value;
            });
        });

        list.querySelectorAll(".chart-file-input").forEach(input => {
            input.addEventListener("change", (e) => {
                if (!e.target.files.length) return;
                const file = e.target.files[0];
                const id = e.target.closest(".repeater-item").dataset.id;
                const chart = settings.sizingCharts.find(c => c.id === id);
                const reader = new FileReader();
                reader.onload = function(event) {
                    if (chart) chart.url = event.target.result;
                    renderSizingCharts();
                };
                reader.readAsDataURL(file);
            });
        });
    }

    document.getElementById("addChartBtn").addEventListener("click", () => {
        settings.sizingCharts.push({
            id: 'chart_' + Math.random().toString(36).substr(2, 9),
            name: "New Sizing Chart",
            url: ""
        });
        renderSizingCharts();
    });

    // --- Save ---
    function saveSettings() {
        try {
            localStorage.setItem("nvm_gallery_settings", JSON.stringify(settings));
            showToast("Media settings saved successfully!");
        } catch (e) {
            showToast("Failed to save media settings.");
            console.error(e);
        }
    }

    let toastTimer = null;
    function showToast(message) {
      const toast = document.getElementById("adminToast");
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
    }

    document.getElementById("saveGallerySettings").addEventListener("click", saveSettings);
    document.addEventListener("DOMContentLoaded", loadSettings);
})();
