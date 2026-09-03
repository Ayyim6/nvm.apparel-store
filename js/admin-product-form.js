/**
 * admin-product-form.js — Add Product form logic
 * -----------------------------------------------------------------
 * Not wired to Supabase yet — there's no products schema that
 * supports colours/types/sizes/add-ons/promotions/SKU/delivery
 * assignment yet (categories alone would need real columns; this
 * needs quite a few more). Submitting the form gathers everything
 * into one structured object and shows it back as a preview, so the
 * capture logic is provably correct — swapping the preview step for
 * a real supabaseClient insert is the only change needed once that
 * schema exists.
 *
 * Delivery Options mirrors what's actually live at checkout right
 * now (checkout-fulfillment.js's 3 pickup spots + delivery) with a
 * placeholder single-letter SKU code per mode. Once Delivery
 * Management is built, this list (and its codes) should be read
 * from there instead of hardcoded here. For now it reads the same
 * shared list admin-data.js exposes, so it can't drift from what
 * the Dashboard/Orders filters use.
 */
(function () {
  const DELIVERY_MODES = window.AdminData.DELIVERY_MODES;

  const SIZE_LIST = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"];

  const NEW_CATEGORY_VALUE = "__new__";

  // Same mock catalog product.js uses for the live site — kept as its own
  // small copy here (rather than reaching into product.js's private
  // PRODUCTS object) purely so "Load Existing Product" has something real
  // to pre-fill from. Swap for a real Supabase products query once that
  // table exists; "Update Product" on Save would then write back to it
  // instead of just re-showing the preview.
  const EXISTING_PRODUCTS = {
    "unikl-home": {
      category: "home-jerseys",
      categoryLabel: "Home Jerseys",
      hasSizing: true,
      sizes: [
        { id: "S", priceAddition: 0 },
        { id: "M", priceAddition: 0 },
        { id: "L", priceAddition: 0 },
        { id: "XL", priceAddition: 0 },
        { id: "XXL", priceAddition: 5 },
      ],
      colors: [
        { name: "Black", swatch: "#0b0b0c" },
        { name: "White", swatch: "#f4f4f1" },
      ],
      typeGroups: [
        {
          name: "Type",
          category: "material",
          options: [
            { name: "Standard", priceAddition: 0 },
            { name: "Premium", priceAddition: 10 },
          ],
        },
      ],
      description:
        "Relaxed-fit jersey in a soft knit, built for campus days and match days alike.",
    },
    "unikl-retro": {
      category: "retro-kits",
      categoryLabel: "Retro Kits",
      hasSizing: true,
      sizes: [
        { id: "S", priceAddition: 0 },
        { id: "M", priceAddition: 0 },
        { id: "L", priceAddition: 0 },
        { id: "XL", priceAddition: 0 },
      ],
      colors: [{ name: "Blue", swatch: "#2fb8c9" }],
      typeGroups: [],
      description:
        "A retro-inspired take on the UniKL jersey with a sport polo collar.",
    },
  };

  let colorCounter = 0;
  let typeGroupCounter = 0;
  let optionCounter = 0;
  let addonCounter = 0;
  let promoCounter = 0;
  let editingProductId = null;

  // ---------- Load Existing Product ----------
  function populateExistingProducts() {
    const select = document.getElementById("loadExistingProduct");
    Object.entries(EXISTING_PRODUCTS).forEach(([id, p]) => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = `${p.categoryLabel} — ${p.colors.map((c) => c.name).join(" / ")}`;
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
    document.getElementById("newCategoryGroup").style.display = "none";
    document.getElementById("colorVariantsList").innerHTML = "";
    document.getElementById("typeGroupsList").innerHTML = "";
    colorCounter = 0;
    typeGroupCounter = 0;
    addColorVariant();
    refreshSizePriceInputs();
  }

  function loadProductForEdit(id) {
    const p = EXISTING_PRODUCTS[id];
    if (!p) return;
    editingProductId = id;
    document.getElementById("saveProductBtn").textContent = "Update Product";

    document.getElementById("productCategory").value = p.category;
    document.getElementById("newCategoryGroup").style.display = "none";

    document.querySelector(`input[name="hasSizing"][value="${p.hasSizing ? "yes" : "no"}"]`).checked = true;
    document.getElementById("sizingFieldsGroup").style.display = p.hasSizing ? "" : "none";
    document.querySelectorAll(".size-checkbox").forEach((cb) => {
      cb.checked = p.sizes.some((s) => s.id === cb.value);
    });
    refreshSizePriceInputs();
    p.sizes.forEach((s) => {
      const input = document.querySelector(`[data-size-price="${s.id}"] input`);
      if (input) input.value = s.priceAddition;
    });

    document.getElementById("colorVariantsList").innerHTML = "";
    colorCounter = 0;
    p.colors.forEach((c) => {
      addColorVariant();
      const block = document.querySelector("#colorVariantsList .repeater-item:last-child");
      block.querySelector(".color-name").value = c.name;
      block.querySelector(".color-swatch").value = c.swatch;
    });

    document.getElementById("typeGroupsList").innerHTML = "";
    typeGroupCounter = 0;
    p.typeGroups.forEach((g) => {
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

    document.getElementById("productDescription").value = p.description;
    updateAllColorPreviews();
  }

  // ---------- Basic Info / Category ----------
  function getCurrentCategoryLabel() {
    const select = document.getElementById("productCategory");
    if (select.value === NEW_CATEGORY_VALUE) {
      return document.getElementById("newCategoryName").value || "New Category";
    }
    return select.options[select.selectedIndex] ? select.options[select.selectedIndex].text : "";
  }

  function updateAllColorPreviews() {
    document.querySelectorAll("#colorVariantsList .repeater-item").forEach((block) => {
      const nameInput = block.querySelector(".color-name");
      const preview = block.querySelector(".color-name-preview");
      const colorName = nameInput.value || "Colour";
      preview.textContent = `Card name: ${getCurrentCategoryLabel()} - ${colorName}`;
    });
  }

  // ---------- Basic Info ----------
  function populateCategories() {
    const select = document.getElementById("productCategory");
    select.innerHTML =
      Object.entries(window.AdminData.CATEGORY_LABELS)
        .map(([slug, label]) => `<option value="${slug}">${label}</option>`)
        .join("") + `<option value="${NEW_CATEGORY_VALUE}">+ Create New Category</option>`;

    select.addEventListener("change", () => {
      document.getElementById("newCategoryGroup").style.display =
        select.value === NEW_CATEGORY_VALUE ? "" : "none";
      updateAllColorPreviews();
    });
    document.getElementById("newCategoryName").addEventListener("input", updateAllColorPreviews);
  }

  // ---------- Stock Type ----------
  function wireStockType() {
    document.querySelectorAll('input[name="stockType"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const isPreorder = document.querySelector('input[name="stockType"]:checked').value === "preorder";
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
    row.innerHTML = SIZE_LIST.map(
      (s) => `
      <label class="size-chip">
        <input type="checkbox" class="size-checkbox" value="${s}">
        ${s}
      </label>
    `
    ).join("");
  }

  function refreshSizePriceInputs() {
    const checked = Array.from(document.querySelectorAll(".size-checkbox:checked")).map((c) => c.value);
    const container = document.getElementById("sizePriceInputs");
    const existing = {};
    container.querySelectorAll("[data-size-price]").forEach((el) => {
      existing[el.dataset.sizePrice] = el.querySelector("input").value;
    });
    container.innerHTML = checked
      .map(
        (s) => `
      <div class="size-price-item" data-size-price="${s}">
        <label>${s}</label>
        <input type="number" step="0.01" placeholder="0.00" value="${existing[s] || ""}">
      </div>
    `
      )
      .join("");
  }

  function wireSizing() {
    document.querySelectorAll('input[name="hasSizing"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        const hasSizing = document.querySelector('input[name="hasSizing"]:checked').value === "yes";
        document.getElementById("sizingFieldsGroup").style.display = hasSizing ? "" : "none";
      });
    });
    document.getElementById("sizeCheckboxRow").addEventListener("change", refreshSizePriceInputs);
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

    addColorVariant(); // start with one colour block, since most products have at least one
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
    addTypeOption(wrap); // start each group with one option
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
      <label style="display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:600; margin-top:4px;">
        <input type="checkbox" class="addon-required" style="width:16px; height:16px;">
        Required (customer must fill this in)
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
              // fallback mock
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
    list.innerHTML = DELIVERY_MODES.map(
      (mode) => `
      <div class="delivery-option-row">
        <input type="checkbox" class="delivery-checkbox" value="${mode.id}" data-code="${mode.code}">
        <div class="delivery-info">
          <div class="delivery-name">${mode.label}</div>
          <div class="delivery-code">SKU letter: ${mode.code}</div>
        </div>
        <input type="number" step="0.01" class="delivery-extra-fee" placeholder="+RM 0.00">
      </div>
    `
    ).join("");
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
    const prefix = (document.getElementById("skuPrefix").value || "----").toUpperCase();
    const checkedCodes = Array.from(document.querySelectorAll(".delivery-checkbox:checked")).map((c) => c.dataset.code);
    const preview = document.getElementById("skuPreview");
    if (!checkedCodes.length) {
      preview.textContent = `Preview: ${prefix}-1234X  (select a delivery option to see the real letter)`;
    } else {
      preview.textContent =
        "Preview: " + checkedCodes.map((code) => `${prefix}-1234${code}`).join("  or  ");
    }
  }

  function wireSku() {
    const input = document.getElementById("skuPrefix");
    input.addEventListener("input", () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z]/g, "");
      updateSkuPreview();
    });
  }

  // ---------- Save / Preview ----------
  function gatherFormData() {
    const categoryLabel = getCurrentCategoryLabel();
    const categorySelect = document.getElementById("productCategory");
    const isNewCategory = categorySelect.value === NEW_CATEGORY_VALUE;
    const categorySlug = isNewCategory
      ? categoryLabel
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
      : categorySelect.value;

    const colors = Array.from(document.querySelectorAll("#colorVariantsList .repeater-item")).map((el) => {
      const colorName = el.querySelector(".color-name").value;
      return {
        name: colorName,
        cardName: `${categoryLabel} - ${colorName || "Colour"}`,
        swatch: el.querySelector(".color-swatch").value,
        thumbnailAttached: !!el.querySelector(".thumb-file").files.length,
        galleryImageCount: el.querySelector(".gallery-files").files.length,
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

    const hasSizing = document.querySelector('input[name="hasSizing"]:checked').value === "yes";
    const sizes = hasSizing
      ? Array.from(document.querySelectorAll(".size-checkbox:checked")).map((cb) => ({
          id: cb.value,
          priceAddition:
            Number(document.querySelector(`[data-size-price="${cb.value}"] input`).value) || 0,
        }))
      : [];

    const stockType = document.querySelector('input[name="stockType"]:checked').value;

    return {
      editingProductId,
      category: categorySlug,
      categoryLabel,
      isNewCategory,
      stockType,
      preorderDeadline: stockType === "preorder" ? document.getElementById("preorderDeadline").value : null,
      hasSizing,
      sizes,
      sizingChart: hasSizing ? document.getElementById("sizingChartSelect").value : null,
      colors,
      typeGroups,
      addons,
      allowedPayments,
      deliveryOptions,
      isNewArrival,
      collection,
      description: document.getElementById("productDescription").value,
      promotions,
      skuPrefix: document.getElementById("skuPrefix").value.toUpperCase(),
    };
  }

  function renderPreview(data) {
    const panel = document.getElementById("productPreviewPanel");
    const content = document.getElementById("productPreviewContent");
    const heading = panel.querySelector("h3");
    heading.textContent = data.editingProductId ? "Product Updated ✓" : "Product Captured ✓";
    content.textContent = JSON.stringify(data, null, 2);
    panel.style.display = "block";
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }


  async function wireSave() {
    document.getElementById("saveProductBtn").addEventListener("click", async () => {
      const data = gatherFormData();
      if (!data) return; // validation failed

      const submitBtn = document.getElementById("saveProductBtn");
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving to Database...";

      if (typeof supabaseClient === "undefined") {
          alert("Supabase client not connected.");
          submitBtn.disabled = false;
          submitBtn.textContent = "Save Product";
          return;
      }

      const payload = {
          name: data.name,
          description: data.description,
          price: data.basePrice,
          sizes: data.sizes.map(s => s.id),
          stock_qty: data.stockType === "unlimited" || data.stockType === "preorder" ? 999 : 0
      };

      const { data: result, error } = await supabaseClient.from('products').insert([payload]);

      submitBtn.disabled = false;
      submitBtn.textContent = "Save Product";

      if (error) {
          console.error("Failed to save to Supabase", error);
          alert("Failed to save product to database.");
      } else {
          alert("Product saved successfully to Supabase!");
          // Reload the page or clear form
          window.location.reload();
      }
    });
  }


  document.addEventListener("DOMContentLoaded", function () {
    populateCategories();
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
