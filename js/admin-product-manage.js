(function() {
    let settings = {
        newArrivalsVisible: true,
        collectionsVisible: true,
        productOverrides: {}
    };

    function loadSettings() {
        try {
            const stored = localStorage.getItem("nvm_site_settings");
            if (stored) {
                settings = JSON.parse(stored);
            }
        } catch (e) {
            console.error(e);
        }

        document.getElementById("toggleNewArrivals").checked = settings.newArrivalsVisible !== false;
        document.getElementById("toggleCollections").checked = settings.collectionsVisible !== false;

        renderProducts();
    }

    function renderProducts() {
        const tbody = document.getElementById("productManageTableBody");
        if (!window.AdminInventoryData) return;

        const products = window.AdminInventoryData.PRODUCTS;

        tbody.innerHTML = products.map(p => {
            const override = settings.productOverrides[p.id] || { isNewArrival: false, isVisible: true };

            return `
                <tr data-id="${p.id}">
                    <td><strong>${p.name}</strong><br><span style="font-size:0.75rem; color:var(--a-ink-soft);">${p.id}</span></td>
                    <td>${p.category}</td>
                    <td>
                        <label class="toggle-switch">
                            <input type="checkbox" class="is-new-arrival" ${override.isNewArrival ? 'checked' : ''}>
                            <div class="slider"></div>
                        </label>
                    </td>
                    <td>
                        <label class="toggle-switch">
                            <input type="checkbox" class="is-visible" ${override.isVisible ? 'checked' : ''}>
                            <div class="slider"></div>
                        </label>
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="remove-btn delete-product" data-id="${p.id}" style="color: var(--a-red); font-size: 1.1rem; padding: 4px;" title="Delete Product">&times;</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function saveSettings() {
        settings.newArrivalsVisible = document.getElementById("toggleNewArrivals").checked;
        settings.collectionsVisible = document.getElementById("toggleCollections").checked;

        const rows = document.querySelectorAll("#productManageTableBody tr");
        rows.forEach(row => {
            const id = row.dataset.id;
            settings.productOverrides[id] = {
                isNewArrival: row.querySelector(".is-new-arrival").checked,
                isVisible: row.querySelector(".is-visible").checked
            };
        });

        try {
            localStorage.setItem("nvm_site_settings", JSON.stringify(settings));
            showToast("Settings saved successfully!");
        } catch (e) {
            showToast("Failed to save settings.");
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


    document.getElementById("productManageTableBody").addEventListener("click", e => {
        if (e.target.classList.contains("delete-product")) {
            const id = e.target.dataset.id;
            if (confirm("Are you sure you want to permanently delete this product?")) {
                let products = window.AdminInventoryData.getProducts();
                products = products.filter(p => p.id !== id);
                window.AdminInventoryData.saveProducts(products);

                // Remove from settings override as well
                delete settings.productOverrides[id];
                localStorage.setItem("nvm_site_settings", JSON.stringify(settings));

                renderProducts();
                showToast("Product deleted successfully.");
            }
        }
    });

    document.getElementById("saveManageSettings").addEventListener("click", saveSettings);
    document.addEventListener("DOMContentLoaded", loadSettings);
})();
