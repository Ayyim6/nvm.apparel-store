/**
 * admin-product-form.js — Add Product form logic
 */
(function () {
  const DELIVERY_MODES = (window.AdminData && window.AdminData.DELIVERY_MODES) ? window.AdminData.DELIVERY_MODES : [];
  const SIZE_LIST = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

  let FETCHED_PRODUCTS = {};
  let colorCounter = 0;
  let typeGroupCounter = 0;
  let optionCounter = 0;
  let addonCounter = 0;
  let promoCounter = 0;
  let editingProductId = null;

  // ---------- Load Existing Product ----------
  async function populateExistingProducts() {
    const select = document.getElementById("loadExistingProduct");
    if (!select) return;
    
    if (typeof supabaseClient !== 'undefined') {
        const { data, error } = await supabaseClient.from('products').select('*');
        if (!error && data) {
            data.forEach(p => { FETCHED_PRODUCTS[p.id] = p; });
        }
    }

    select.innerHTML = `<option value="">— Create New Product —</option>`;
    Object.values(FETCHED_PRODUCTS).forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.id;
      const colorNames = p.colors ? p.colors.map(c => c.name).join(" / ") : "";
      opt.textContent = `${p.name} — ${colorNames}`;
      select.appendChild(opt);
    });
    
    select.addEventListener("change", () => {
      if (select.value) loadProductForEdit(select.value);
      else resetFormToNew();
    });
  }

  function resetFormToNew() {
    editingProductId = null;
    document.getElementById("saveProductBtn").textContent = "Save Product";
    document.getElementById("productForm").reset();
    
    document.getElementById("productTitle").value = "";
    document.getElementById("basePrice").value = ""; 
    document.getElementById("productDescription").value = "";
    document.getElementById("skuPrefix").value = "";
    document.getElementById("preorderDeadlineGroup").style.display = "none";
    
    document.getElementById("colorVariantsList").innerHTML = "";
    document.getElementById("typeGroupsList").innerHTML = "";
    document.getElementById("addonsList").innerHTML = "";
    document.getElementById("promotionsList").innerHTML = "";
    
    document.querySelectorAll(".delivery-checkbox").forEach(cb => {
        cb.checked = false;
        const feeInput = cb.closest(".delivery-option-row").querySelector(".delivery-extra-fee");
        if (feeInput) feeInput.value = "";
    });
    
    colorCounter = 0;
    typeGroupCounter = 0;
    addonCounter = 0;
    promoCounter = 0;
    
    addColorVariant();
    refreshSizePriceInputs();
    updateSkuPreview();
  }

  function loadProductForEdit(id) {
    const p = FETCHED_PRODUCTS[id];
    if (!p) return;
    editingProductId = id;
    document.getElementById("saveProductBtn").textContent = "Update Product";

    // Basic Info
    document.getElementById("productTitle").value = p.name || "";
    document.getElementById("basePrice").value = p.base_price || 0;
    document.getElementById("productDescription").value = p.description || "";

    // Stock & Preorder
    const stockRadio = document.querySelector(`input[name="stockType"][value="${p.stock_type || 'regular'}"]`);
    if(stockRadio) stockRadio.checked = true;
    document.getElementById("preorderDeadlineGroup").style.display = p.stock_type === "preorder" ? "" : "none";
    if(p.preorder_deadline) {
        document.getElementById("preorderDeadline").value = p.preorder_deadline.split('T')[0];
    }

    // SKU
    document.getElementById("skuPrefix").value = p.sku_prefix || "";

    // Sizing
    const sizeRadio = document.querySelector(`input[name="hasSizing"][value="${p.has_sizing ? "yes" : "no"}"]`);
    if(sizeRadio) sizeRadio.checked = true;
    
    document.getElementById("sizingFieldsGroup").style.display = p.has_sizing ? "" : "none";
    document.querySelectorAll(".size-checkbox").forEach((cb) => {
      cb.checked = p.sizes && p.sizes.some((s) => s.id === cb.value);
    });
    refreshSizePriceInputs();
    
    if(p.sizes) {
      p.sizes.forEach((s) => {
        const input = document.querySelector(`[data-size-price="${s.id}"] input`);
        if (input) input.value = s.priceAddition || 0;
      });
    }

    const chartEl = document.getElementById("sizingChartSelect");
    if(chartEl && p.size_guide_image) chartEl.value = p.size_guide_image;

    // Colors & Images
    document.getElementById("colorVariantsList").innerHTML = "";
    colorCounter = 0;
    if(p.colors && p.colors.length > 0) {
      p.colors.forEach((c) => {
        addColorVariant();
        const block = document.querySelector("#colorVariantsList .repeater-item:last-child");
        block.querySelector(".color-name").value = c.name;
        block.querySelector(".color-swatch").value = c.swatch;
        
        // Repopulate Images in Preview UI
        if(c.images && c.images.length > 0) {
            const thumbImg = block.querySelector(".thumb-preview");
            thumbImg.src = c.images[0];
            thumbImg.style.display = "block";
            
            const galleryRow = block.querySelector(".gallery-preview-row");
            const galleryImages = c.images.slice(1);
            galleryRow.innerHTML = galleryImages.map(url => `<img src="${url}">`).join("");
        }
      });
    }

    // Type Groups
    document.getElementById("typeGroupsList").innerHTML = "";
    typeGroupCounter = 0;
    if(p.type_groups) {
      p.type_groups.forEach((g) => {
        addTypeGroup();
        const groupEl = document.querySelector("#typeGroupsList .repeater-item:last-child");
        groupEl.querySelector(".group-name").value = g.name;
        groupEl.querySelector(".group-category").value = g.category;
        groupEl.querySelector(".type-options-list").innerHTML = "";
        g.options.forEach((opt) => {
          addTypeOption(groupEl);
          const optRow = groupEl.querySelector(".type-options-list .repeater-row:last-child");
          optRow.querySelector(".type-option-name").value = opt.name;
          optRow.querySelector(".type-option-price").value = opt.priceAddition;
        });
      });
    }

    // Addons
    document.getElementById("addonsList").innerHTML = "";
    addonCounter = 0;
    if(p.addons) {
        p.addons.forEach(a => {
            addAddon();
            const addonEl = document.querySelector("#addonsList .repeater-item:last-child");
            addonEl.querySelector(".addon-name").value = a.name || "";
            addonEl.querySelector(".addon-price").value = a.priceAddition || 0;
            addonEl.querySelector(".addon-maxlen").value = a.maxLength || "";
            addonEl.querySelector(".addon-required").checked = !!a.required;
        });
    }

    // Payments
    if(p.allowed_payments) {
        document.querySelectorAll(".product-payment-checkbox").forEach(cb => {
            cb.checked = p.allowed_payments.includes(cb.value);
        });
    }

    // Delivery Options
    if(p.delivery_options) {
        document.querySelectorAll(".delivery-checkbox").forEach(cb => {
            const matched = p.delivery_options.find(d => d.id === cb.value);
            cb.checked = !!matched;
            if(matched) {
                const feeInput = cb.closest(".delivery-option-row").querySelector(".delivery-extra-fee");
                if (feeInput) feeInput.value = matched.extraFee || 0;
            }
        });
    }

    // Promos
    document.getElementById("promotionsList").innerHTML = "";
    promoCounter = 0;
    if(p.promotions) {
        p.promotions.forEach(pr => {
            addPromotion();
            const promoEl = document.querySelector("#promotionsList .repeater-item:last-child");
            promoEl.querySelector(".promo-trigger").value = pr.trigger || "";
            promoEl.querySelector(".promo-threshold").value = pr.threshold || 0;
            promoEl.querySelector(".promo-discount-type").value = pr.discountType || "";
            promoEl.querySelector(".promo-discount-value").value = pr.discountValue || 0;
        });
    }

    updateAllColorPreviews();
    updateSkuPreview();
  }

  // ---------- Basic Info ----------
  function getCurrentCategoryLabel() {
    return document.getElementById("productTitle").value || "Product";
  }

  function updateAllColorPreviews() {
    document.querySelectorAll("#colorVariantsList .repeater-item").forEach((block) => {
      const nameInput = block.querySelector(".color-name");
      const preview = block.querySelector(".color-name-preview");
      if(preview) {
        const colorName = nameInput.value || "Colour";
        preview.textContent = `Card name: ${getCurrentCategoryLabel()} - ${colorName}`;
      }
    });
  }

  // ---------- Stock Type ----------
  function wireStockType() {
    document.querySelectorAll('input[name="stockType"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const checked = document.querySelector('input[name="stockType"]:checked');
        const isPreorder = checked && checked.value === "preorder";
        document.getElementById("preorderDeadlineGroup").style.display = isPreorder ? "" : "none";
      });
    });
  }

  // ---------- Sizing ----------
  function populateSizingCharts() {
      const select = document.getElementById("sizingChartSelect");
      if (!select) return;
      try {
          const stored = localStorage.getItem("nvm_gallery_settings");
          if (stored) {
              const settings = JSON.parse(stored);
              select.innerHTML = '<option value="">-- No Sizing Chart --</option>' + 
                                 settings.sizingCharts.map(c => `<option value="${c.url}">${c.name}</option>`).join("");
              return;
          }
      } catch (e) {}
      select.innerHTML = '<option value="images/sizing-guide.png">Standard T-Shirt Fit</option><option value="">-- No Sizing Chart --</option>';
  }

  function renderSizeCheckboxes() {
    const row = document.getElementById("sizeCheckboxRow");
    if(!row) return;
    row.innerHTML = SIZE_LIST.map((s) => `<label class="size-chip"><input type="checkbox" class="size-checkbox" value="${s}">${s}</label>`).join("");
  }

  function refreshSizePriceInputs() {
    const checked = Array.from(document.querySelectorAll(".size-checkbox:checked")).map((c) => c.value);
    const container = document.getElementById("sizePriceInputs");
    if(!container) return;
    
    const existing = {};
    container.querySelectorAll("[data-size-price]").forEach((el) => {
      existing[el.dataset.sizePrice] = el.querySelector("input").value;
    });
    container.innerHTML = checked.map((s) => `
      <div class="size-price-item" data-size-price="${s}">
        <label>${s}</label>
        <input type="number" step="0.01" placeholder="0.00" value="${existing[s] || ""}">
      </div>`).join("");
  }

  function wireSizing() {
    document.querySelectorAll('input[name="hasSizing"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const checked = document.querySelector('input[name="hasSizing"]:checked');
        const hasSizing = checked && checked.value === "yes";
        document.getElementById("sizingFieldsGroup").style.display = hasSizing ? "" : "none";
      });
    });
    const sizeRow = document.getElementById("sizeCheckboxRow");
    if(sizeRow) sizeRow.addEventListener("change", refreshSizePriceInputs);
  }

  // ---------- Colour Variants ----------
  function addColorVariant() {
    colorCounter++;
    const id = colorCounter;
    const wrap = document.createElement("div");
    wrap.className = "repeater-item";
    wrap.dataset.colorId = id;
    wrap.innerHTML = `
      <div class="repeater-item-head">
        <span class="tag">Colour</span>
        <button type="button" class="remove-btn" data-remove-color="${id}">Remove</button>
      </div>
      <div class="repeater-row">
        <div>
          <label>Colour Name</label>
          <input type="text" class="color-name" placeholder="e.g. Black">
        </div>
        <div>
          <label>Swatch</label>
          <input type="color" class="color-swatch" value="#000000">
        </div>
      </div>
      <div class="color-name-preview field-note"></div>
      <div class="repeater-row">
        <div>
          <label>Thumbnail</label>
          <div class="image-upload-row">
            <div class="image-upload-slot"><img class="thumb-preview" style="display:none;"></div>
            <input type="file" class="thumb-file" accept="image/*">
          </div>
        </div>
      </div>
      <div class="repeater-row">
        <div>
          <label>Gallery Images (product slider)</label>
          <input type="file" class="gallery-files" accept="image/*" multiple>
          <div class="gallery-preview-row"></div>
        </div>
      </div>
    `;
    document.getElementById("colorVariantsList").appendChild(wrap);
    updateAllColorPreviews();
  }

  function wireColorVariants() {
    document.getElementById("addColorBtn").addEventListener("click", addColorVariant);
    const list = document.getElementById("colorVariantsList");
    const titleInput = document.getElementById("productTitle");
    if(titleInput) titleInput.addEventListener("input", updateAllColorPreviews);

    list.addEventListener("click", (e) => {
      const removeId = e.target.dataset.removeColor;
      if (removeId) list.querySelector(`[data-color-id="${removeId}"]`).remove();
    });

    list.addEventListener("input", (e) => {
      if (e.target.classList.contains("color-name")) updateAllColorPreviews();
    });

    list.addEventListener("change", (e) => {
      if (e.target.classList.contains("thumb-file")) {
        const file = e.target.files[0];
        const img = e.target.closest(".repeater-item").querySelector(".thumb-preview");
        if (file) {
          img.src = URL.createObjectURL(file);
          img.style.display = "block";
        }
      }
      if (e.target.classList.contains("gallery-files")) {
        const files = Array.from(e.target.files);
        const previewRow = e.target.closest(".repeater-item").querySelector(".gallery-preview-row");
        previewRow.innerHTML = files.map((f) => `<img src="${URL.createObjectURL(f)}">`).join("");
      }
    });

    addColorVariant(); 
  }

  // ---------- Type Variant Groups ----------
  function addTypeOption(groupEl) {
    optionCounter++;
    const id = optionCounter;
    const row = document.createElement("div");
    row.className = "repeater-row";
    row.dataset.optionId = id;
    row.innerHTML = `
      <div>
        <label>Option Name</label>
        <input type="text" class="type-option-name" placeholder="e.g. Crew Neck">
      </div>
      <div>
        <label>Price Addition (RM)</label>
        <input type="number" step="0.01" class="type-option-price" placeholder="0.00">
      </div>
      <div style="display:flex; align-items:flex-end;">
        <button type="button" class="remove-btn" data-remove-option="${id}">Remove</button>
      </div>
    `;
    groupEl.querySelector(".type-options-list").appendChild(row);
  }

  function addTypeGroup() {
    typeGroupCounter++;
    const id = typeGroupCounter;
    const wrap = document.createElement("div");
    wrap.className = "repeater-item";
    wrap.dataset.groupId = id;
    wrap.innerHTML = `
      <div class="repeater-item-head">
        <span class="tag">Variant Group</span>
        <button type="button" class="remove-btn" data-remove-group="${id}">Remove Group</button>
      </div>
      <div class="repeater-row">
        <div>
          <label>Group Name</label>
          <input type="text" class="group-name" placeholder="e.g. Collar Type">
        </div>
        <div>
          <label>Group Category</label>
          <select class="group-category">
            <option value="collar">Collar</option>
            <option value="material">Material</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      <div class="type-options-list"></div>
      <button type="button" class="add-option-btn" data-add-option>+ Add Option</button>
    `;
    document.getElementById("typeGroupsList").appendChild(wrap);
    addTypeOption(wrap);
  }

  function wireTypeGroups() {
    document.getElementById("addTypeGroupBtn").addEventListener("click", addTypeGroup);
    const list = document.getElementById("typeGroupsList");

    list.addEventListener("click", (e) => {
      if (e.target.dataset.removeGroup) {
        list.querySelector(`[data-group-id="${e.target.dataset.removeGroup}"]`).remove();
      }
      if (e.target.dataset.removeOption) {
        e.target.closest("[data-option-id]").remove();
      }
      if (e.target.hasAttribute("data-add-option")) {
        addTypeOption(e.target.closest(".repeater-item"));
      }
    });
  }

  // ---------- Add-ons ----------
  function addAddon() {
    addonCounter++;
    const id = addonCounter;
    const wrap = document.createElement("div");
    wrap.className = "repeater-item";
    wrap.dataset.addonId = id;
    wrap.innerHTML = `
      <div class="repeater-item-head">
        <span class="tag">Add-on</span>
        <button type="button" class="remove-btn" data-remove-addon="${id}">Remove</button>
      </div>
      <div class="repeater-row">
        <div>
          <label>Add-on Name</label>
          <input type="text" class="addon-name" placeholder="e.g. Custom Name Printing">
        </div>
        <div>
          <label>Price Addition (RM)</label>
          <input type="number" step="0.01" class="addon-price" placeholder="0.00">
        </div>
        <div>
          <label>Max Characters</label>
          <input type="number" class="addon-maxlen" placeholder="e.g. 12">
        </div>
      </div>
      <label class="toggle-switch" style="margin-top:12px;">
        <input type="checkbox" class="addon-required">
        <div class="slider"></div>
        <span style="font-size:0.82rem; font-weight:600; margin-left:8px;">Required (customer must fill this in)</span>
      </label>
    `;
    document.getElementById("addonsList").appendChild(wrap);
  }

  function wireAddons() {
    document.getElementById("addAddonBtn").addEventListener("click", addAddon);
    document.getElementById("addonsList").addEventListener("click", (e) => {
      if (e.target.dataset.removeAddon) {
        document.querySelector(`[data-addon-id="${e.target.dataset.removeAddon}"]`).remove();
      }
    });
  }

  // ---------- Delivery Options ----------
  function renderPaymentOptions() {
      let payments = [];
      try {
          const stored = localStorage.getItem("nvm_payment_methods");
          if (stored) {
              payments = JSON.parse(stored);
          } else {
              payments = [
                  {id: "qr_bank", title: "QR Code / Bank Transfer", isActive: true},
                  {id: "tng_spay", title: "TNG / SPay Later", isActive: true},
                  {id: "fpx", title: "FPX Online Banking", isActive: false, comingSoon: true}
              ];
          }
      } catch(e) {}
      
      const container = document.getElementById("productPaymentOptionsList");
      if (!container) return;
      
      container.innerHTML = payments.map(p => `
          <label class="size-chip" style="min-width: 150px; justify-content:center;">
              <input type="checkbox" class="product-payment-checkbox" value="${p.id}" checked>
              ${p.title} ${p.comingSoon ? '(Soon)' : ''}
          </label>
      `).join("");
  }

  function renderDeliveryOptions() {
    const list = document.getElementById("deliveryOptionsList");
    if(!list) return;
    list.innerHTML = DELIVERY_MODES.map((mode) => `
      <div class="delivery-option-row">
        <label class="toggle-switch">
          <input type="checkbox" class="delivery-checkbox" value="${mode.id}" data-code="${mode.code}">
          <div class="slider"></div>
        </label>
        <div class="delivery-info" style="margin-left: 12px;">
          <div class="delivery-name">${mode.label}</div>
          <div class="delivery-code">SKU letter: ${mode.code}</div>
        </div>
        <input type="number" step="0.01" class="delivery-extra-fee" placeholder="+RM 0.00">
      </div>
    `).join("");
    list.addEventListener("change", updateSkuPreview);
  }

  // ---------- Promotions ----------
  function addPromotion() {
    promoCounter++;
    const id = promoCounter;
    const wrap = document.createElement("div");
    wrap.className = "repeater-item";
    wrap.dataset.promoId = id;
    wrap.innerHTML = `
      <div class="repeater-item-head">
        <span class="tag">Promotion Rule</span>
        <button type="button" class="remove-btn" data-remove-promo="${id}">Remove</button>
      </div>
      <div class="repeater-row">
        <div>
          <label>Trigger</label>
          <select class="promo-trigger">
            <option value="colour-count">Buy X different colours</option>
            <option value="quantity">Buy X quantity</option>
          </select>
        </div>
        <div>
          <label>Quantity Threshold</label>
          <input type="number" class="promo-threshold" placeholder="e.g. 2" min="2">
        </div>
      </div>
      <div class="repeater-row">
        <div>
          <label>Discount Type</label>
          <select class="promo-discount-type">
            <option value="fixed">Fixed amount off (RM)</option>
            <option value="percent">Percentage off (%)</option>
          </select>
        </div>
        <div>
          <label>Discount Value</label>
          <input type="number" step="0.01" class="promo-discount-value" placeholder="e.g. 10">
        </div>
      </div>
    `;
    document.getElementById("promotionsList").appendChild(wrap);
  }

  function wirePromotions() {
    document.getElementById("addPromotionBtn").addEventListener("click", addPromotion);
    document.getElementById("promotionsList").addEventListener("click", (e) => {
      if (e.target.dataset.removePromo) {
        document.querySelector(`[data-promo-id="${e.target.dataset.removePromo}"]`).remove();
      }
    });
  }

  // ---------- SKU ----------
  function updateSkuPreview() {
    const prefixInput = document.getElementById("skuPrefix");
    if(!prefixInput) return;
    const prefix = (prefixInput.value || "----").toUpperCase();
    const checkedCodes = Array.from(document.querySelectorAll(".delivery-checkbox:checked")).map((c) => c.dataset.code);
    const preview = document.getElementById("skuPreview");
    if (!checkedCodes.length) {
      preview.textContent = `Preview: ${prefix}-1234X  (select a delivery option to see the real letter)`;
    } else {
      preview.textContent = "Preview: " + checkedCodes.map((code) => `${prefix}-1234${code}`).join("  or  ");
    }
  }

  function wireSku() {
    const input = document.getElementById("skuPrefix");
    if(!input) return;
    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z]/g, "");
      updateSkuPreview();
    });
  }

  // ---------- Gather Data ----------
  function gatherFormData() {
    const productTitle = document.getElementById("productTitle").value.trim();
    // Auto-generate a slug from the title (e.g. "Home Jersey" -> "home-jersey")
    const categorySlug = productTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const basePriceEl = document.getElementById("basePrice");
    const basePrice = basePriceEl ? (Number(basePriceEl.value) || 0) : 0;

    const colors = Array.from(document.querySelectorAll("#colorVariantsList .repeater-item")).map((el) => {
      return {
        name: el.querySelector(".color-name").value,
        swatch: el.querySelector(".color-swatch").value,
        // We temporarily grab the UI preview src so we know if an image exists 
        // when we loop through this in wireSave() later.
        _existingThumbSrc: el.querySelector(".thumb-preview").getAttribute("src"),
        _existingGallerySrcs: Array.from(el.querySelectorAll(".gallery-preview-row img")).map(i => i.getAttribute("src"))
      };
    });

    const typeGroups = Array.from(document.querySelectorAll("#typeGroupsList .repeater-item")).map((el) => ({
      name: el.querySelector(".group-name").value,
      category: el.querySelector(".group-category").value,
      options: Array.from(el.querySelectorAll(".type-options-list .repeater-row")).map((row) => ({
        name: row.querySelector(".type-option-name").value,
        priceAddition: Number(row.querySelector(".type-option-price").value) || 0,
      })),
    }));

    const addons = Array.from(document.querySelectorAll("#addonsList .repeater-item")).map((el) => ({
      name: el.querySelector(".addon-name").value,
      priceAddition: Number(el.querySelector(".addon-price").value) || 0,
      maxLength: Number(el.querySelector(".addon-maxlen").value) || null,
      required: el.querySelector(".addon-required").checked,
    }));

    const allowedPayments = Array.from(document.querySelectorAll(".product-payment-checkbox:checked")).map(cb => cb.value);
    const deliveryOptions = Array.from(document.querySelectorAll(".delivery-checkbox:checked")).map((cb) => ({
      id: cb.value,
      code: cb.dataset.code,
      extraFee: Number(cb.closest(".delivery-option-row").querySelector(".delivery-extra-fee").value) || 0,
    }));

    const promotions = Array.from(document.querySelectorAll("#promotionsList .repeater-item")).map((el) => ({
      trigger: el.querySelector(".promo-trigger").value,
      threshold: Number(el.querySelector(".promo-threshold").value) || 0,
      discountType: el.querySelector(".promo-discount-type").value,
      discountValue: Number(el.querySelector(".promo-discount-value").value) || 0,
    }));

    const sizeChecked = document.querySelector('input[name="hasSizing"]:checked');
    const hasSizing = sizeChecked && sizeChecked.value === "yes";
    
    const sizes = hasSizing
      ? Array.from(document.querySelectorAll(".size-checkbox:checked")).map((cb) => {
          const inputEl = document.querySelector(`[data-size-price="${cb.value}"] input`);
          return {
            id: cb.value,
            priceAddition: inputEl ? (Number(inputEl.value) || 0) : 0,
          };
        })
      : [];

    const stockTypeEl = document.querySelector('input[name="stockType"]:checked');
    const stockType = stockTypeEl ? stockTypeEl.value : "regular";

    const preorderEl = document.getElementById("preorderDeadline");
    const skuEl = document.getElementById("skuPrefix");
    const chartEl = document.getElementById("sizingChartSelect");

    return {
      editingProductId,
      productTitle,
      categorySlug,
      basePrice,
      stockType,
      preorderDeadline: stockType === "preorder" && preorderEl ? preorderEl.value : null,
      hasSizing,
      sizes,
      sizingChart: hasSizing && chartEl ? chartEl.value : null,
      colors,
      typeGroups,
      addons,
      allowedPayments,
      deliveryOptions,
      description: document.getElementById("productDescription") ? document.getElementById("productDescription").value : "",
      promotions,
      skuPrefix: skuEl ? skuEl.value.toUpperCase() : "",
    };
  }

  // ---------- Supabase Image Upload & Save ----------
  async function uploadImage(file, path) {
    if (typeof supabaseClient === 'undefined') throw new Error("Supabase client not loaded.");
    const { data, error } = await supabaseClient.storage
      .from('product-images')
      .upload(path, file, { cacheControl: '3600', upsert: true });
    
    if (error) throw error;
    
    const { data: publicUrlData } = supabaseClient.storage
      .from('product-images')
      .getPublicUrl(path);
      
    return publicUrlData.publicUrl;
  }

  function wireSave() {
    const form = document.getElementById("productForm");
    const saveBtn = document.getElementById("saveProductBtn");

    if (!form || !saveBtn) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      saveBtn.disabled = true;
      saveBtn.textContent = "Uploading Images & Saving...";

      try {
        const data = gatherFormData();
        const productId = data.editingProductId || `${data.categorySlug}-${Date.now()}`;

        // Upload images for each color variant OR preserve existing ones
        const colorBlocks = document.querySelectorAll("#colorVariantsList .repeater-item");
        for (let i = 0; i < colorBlocks.length; i++) {
          const block = colorBlocks[i];
          const thumbFile = block.querySelector(".thumb-file").files[0];
          const galleryFiles = Array.from(block.querySelector(".gallery-files").files);
          
          const finalImages = []; 

          // 1. Handle Thumbnail
          if (thumbFile) {
            const thumbPath = `${productId}/${data.colors[i].name}/thumb_${Date.now()}`;
            const thumbUrl = await uploadImage(thumbFile, thumbPath);
            finalImages.push(thumbUrl);
          } else if (data.colors[i]._existingThumbSrc && !data.colors[i]._existingThumbSrc.startsWith("blob:")) {
            // Keep the old image from Supabase if we didn't upload a new one
            finalImages.push(data.colors[i]._existingThumbSrc);
          }

          // 2. Handle Gallery Images
          if (galleryFiles.length > 0) {
            for (let j = 0; j < galleryFiles.length; j++) {
              const galPath = `${productId}/${data.colors[i].name}/gallery_${j}_${Date.now()}`;
              const galUrl = await uploadImage(galleryFiles[j], galPath);
              finalImages.push(galUrl);
            }
          } else if (data.colors[i]._existingGallerySrcs) {
            // Keep existing gallery images
            data.colors[i]._existingGallerySrcs.forEach(src => {
                if(src && !src.startsWith("blob:")) finalImages.push(src);
            });
          }
          
          data.colors[i].images = finalImages;
          
          // Cleanup temporary preview properties before DB insertion
          delete data.colors[i]._existingThumbSrc;
          delete data.colors[i]._existingGallerySrcs;
        }

        if (typeof supabaseClient === 'undefined') {
            alert("No Supabase connection found! Check supabaseClient.js.");
            return;
        }

        const { error } = await supabaseClient
          .from('products')
          .upsert({
            id: productId,
            name: data.productTitle,
            category: data.categorySlug,
            description: data.description,
            base_price: data.basePrice,
            stock_type: data.stockType,
            preorder_deadline: data.preorderDeadline || null,
            sku_prefix: data.skuPrefix,
            colors: data.colors,
            type_groups: data.typeGroups,
            has_sizing: data.hasSizing,
            sizes: data.sizes,
            size_guide_image: data.sizingChart,
            addons: data.addons,
            allowed_payments: data.allowedPayments,
            delivery_options: data.deliveryOptions,
            promotions: data.promotions
          });

        if (error) throw error;
        // --- STORAGE CLEANUP ---
        // If updating an existing product, delete the old images from the Supabase bucket 
        // if they are no longer in the updated product payload.
        if (data.editingProductId && FETCHED_PRODUCTS[data.editingProductId]) {
            const oldProduct = FETCHED_PRODUCTS[data.editingProductId];
            let oldUrls = [];
            if (oldProduct.colors) {
                oldProduct.colors.forEach(c => { if(c.images) oldUrls.push(...c.images); });
            }
            
            let newUrls = [];
            data.colors.forEach(c => { if(c.images) newUrls.push(...c.images); });

            const toDeleteUrls = oldUrls.filter(url => !newUrls.includes(url));
            if (toDeleteUrls.length > 0) {
                const pathsToDelete = toDeleteUrls.map(url => {
                    const parts = url.split('/product-images/');
                    return parts.length > 1 ? parts[1] : null;
                }).filter(Boolean);

                if (pathsToDelete.length > 0) {
                    await supabaseClient.storage.from('product-images').remove(pathsToDelete);
                    console.log("Cleaned up orphaned images:", pathsToDelete);
                }
            }
        }
        // --- END STORAGE CLEANUP ---

        alert("Product saved successfully to database!");
        
        // Refresh the dropdown and clear the form so the new item shows up
        await populateExistingProducts();
        resetFormToNew();

      } catch (err) {
        console.error("Save Error:", err);
        alert("Failed to save product: " + err.message);
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Save Product";
      }
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    populateExistingProducts();
    wireStockType();
    populateSizingCharts();
    renderSizeCheckboxes();
    wireSizing();
    wireColorVariants();
    wireTypeGroups();
    wireAddons();
    renderPaymentOptions();
    renderDeliveryOptions();
    wirePromotions();
    wireSku();
    wireSave();
  });
})();