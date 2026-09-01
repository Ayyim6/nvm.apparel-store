/**
 * product.js — product detail page
 * -----------------------------------------------------------------
 * PRODUCTS below is example/mock data standing in for a future
 * Supabase table (something like: products, product_colors,
 * product_types, product_sizes — each color/type/size row belonging
 * to a product, each with its own images/price_delta). None of that
 * is wired yet — this file just demonstrates the shape so the UI is
 * ready to swap onto real data later without a rewrite:
 *
 *   - "colors" = same garment, different colourway. Swapping colour
 *     swaps the gallery images. A product can have 1 colour (the
 *     swatch row then just doesn't render) or several.
 *   - "types" = collar/material variants — optional per product.
 *     Leave the array empty and the whole Type section disappears
 *     ("it also can be no assign"). Each type can carry a
 *     priceDelta.
 *   - "sizes" = required. Each size can also carry its own
 *     priceDelta (e.g. XXL costing more fabric).
 *
 * The page reads ?id=<product id> from the URL (e.g.
 * product.html?id=unikl-retro) and falls back to the first product
 * if missing/unknown — this is how it'll eventually be linked from
 * shop.js product cards once that's wired to real product IDs.
 */
(function () {
  const PRODUCTS = {
    "unikl-home": {
      id: "unikl-home",
      name: "UniKL Home Jersey",
      category: "Jerseys",
      description:
        "The official University Kuala Lumpur home jersey — an oversized, relaxed-fit tee in a soft knit built for campus days and match days alike. Raglan sleeves, contrast side panel, and an all-over wordmark print.",
      details: [
        "Relaxed, oversized fit",
        "Raglan sleeve construction",
        "Machine washable, cold",
      ],
      basePrice: 89,
      colors: [
        {
          id: "black",
          label: "Black Edition",
          swatch: "#0b0b0c",
          images: ["images/black-1.jpg", "images/black-2.jpg", "images/black-3.jpg"],
        },
        {
          id: "white",
          label: "White Edition",
          swatch: "#f4f4f1",
          border: true,
          images: ["images/white-1.jpg", "images/white-2.jpg", "images/white-3.jpg"],
        },
      ],
      types: [
        { id: "standard", label: "Standard", note: "Crew neck · Polyester", priceDelta: 0 },
        { id: "premium", label: "Premium", note: "Crew neck · Cotton blend", priceDelta: 10 },
      ],
      sizes: [
        { id: "S", label: "S", priceDelta: 0 },
        { id: "M", label: "M", priceDelta: 0 },
        { id: "L", label: "L", priceDelta: 0 },
        { id: "XL", label: "XL", priceDelta: 0 },
        { id: "XXL", label: "XXL", priceDelta: 5 },
      ],
      sizeGuideImage: "images/sizing-guide.png",
    },

    "unikl-retro": {
      id: "unikl-retro",
      name: "UniKL Retro Jersey",
      category: "Jerseys — Retro Collection",
      description:
        "A retro-inspired take on the UniKL jersey with a sport polo collar and a subtle tonal geometric print. Slightly heavier premium cotton feel, finished with contrast trims.",
      details: [
        "Sport polo collar",
        "Premium cotton-blend fabric",
        "Contrast cuff and hem trim",
      ],
      basePrice: 99,
      colors: [
        {
          id: "blue",
          label: "Blue Edition",
          swatch: "#2fb8c9",
          images: ["images/retro-1.jpg"],
        },
      ],
      types: [], // none assigned for this product — Type section won't render
      sizes: [
        { id: "S", label: "S", priceDelta: 0 },
        { id: "M", label: "M", priceDelta: 0 },
        { id: "L", label: "L", priceDelta: 0 },
        { id: "XL", label: "XL", priceDelta: 0 },
      ],
      sizeGuideImage: "images/sizing-guide.png",
    },
  };

  const DEFAULT_SIZES = [
    { id: "S", label: "S", priceDelta: 0 },
    { id: "M", label: "M", priceDelta: 0 },
    { id: "L", label: "L", priceDelta: 0 },
    { id: "XL", label: "XL", priceDelta: 0 },
  ];

  function money(n) {
    return "RM" + (Math.round(n * 100) / 100).toFixed(2);
  }

  // Turns a row from Supabase's "products" table into the shape the
  // render code below expects. Reads optional jsonb columns — colors,
  // types, sizes, size_guide_image — if they exist on the row; falls
  // back to the current single-image / generic-size behavior for any
  // product that doesn't have them set yet, so this keeps working
  // exactly as before until you start filling those columns in.
  function normalizeSupabaseProduct(row) {
    const colors =
      Array.isArray(row.colors) && row.colors.length
        ? row.colors
        : [
            {
              id: "default",
              label: null,
              swatch: null,
              images: row.image_url ? [row.image_url] : [],
            },
          ];

    const types = Array.isArray(row.types) ? row.types : [];

    const sizes =
      Array.isArray(row.sizes) && row.sizes.length ? row.sizes : DEFAULT_SIZES;

    return {
      id: row.id,
      name: row.name,
      category: "NVM Store",
      description: row.description || "",
      details: [],
      basePrice: Number(row.price) || 0,
      colors,
      types,
      sizes,
      sizeGuideImage: row.size_guide_image || "images/sizing-guide.png",
      outOfStock: Number(row.stock_qty) <= 0,
    };
  }

  // Mock ids (unikl-home / unikl-retro) resolve locally; anything else is
  // looked up in Supabase by its real product id.
  async function loadProduct(requestedId) {
    if (!requestedId) return PRODUCTS["unikl-home"];
    if (PRODUCTS[requestedId]) return PRODUCTS[requestedId];

    if (typeof supabaseClient === "undefined") return null;

    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", requestedId)
      .single();

    if (error || !data) {
      console.error("Product lookup failed:", error);
      return null;
    }

    return normalizeSupabaseProduct(data);
  }

  function showNotFound() {
    document.querySelector(".product-wrap").innerHTML = `
      <div style="grid-column:1/-1; text-align:center; padding:80px 24px; color:var(--ink-soft);">
        We couldn't find that product.<br>
        <a href="shop.html" style="color:var(--shade-900); font-weight:700; text-decoration:underline;">Back to shop</a>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const requestedId = params.get("id");
    const product = await loadProduct(requestedId);

    if (!product) {
      showNotFound();
      return;
    }

    // ---------- state ----------
    // ?color=<id> lets a card (e.g. New Arrivals showing Black/White as
    // separate cards) deep-link straight into that colorway instead of
    // always landing on the first one.
    const requestedColor = params.get("color");
    let selectedColor =
      product.colors.find((c) => c.id === requestedColor) || product.colors[0] || null;
    let selectedType = product.types[0] || null; // may be undefined if none
    let selectedSize = null; // user must actively pick a size
    let slideIndex = 0;

    // ---------- static text ----------
    document.getElementById("productCategory").textContent = product.category;
    document.getElementById("productName").textContent = product.name;
    document.getElementById("productDesc").textContent = product.description;
    document.getElementById("productCrumbName").textContent = product.name;
    document.title = product.name + " — NVM Store";

    const detailsList = document.getElementById("productDetailsList");
    detailsList.innerHTML = (product.details || []).map((d) => `<li>${d}</li>`).join("");

    document.getElementById("sizeGuideImage").src = product.sizeGuideImage;

    // ---------- gallery ----------
    const track = document.getElementById("galleryTrack");
    const dotsWrap = document.getElementById("galleryDots");
    const prevBtn = document.getElementById("galleryPrev");
    const nextBtn = document.getElementById("galleryNext");

    function renderGallery() {
      const images = selectedColor.images && selectedColor.images.length
        ? selectedColor.images
        : null;
      slideIndex = 0;

      if (!images) {
        track.innerHTML = `<div class="gallery-slide gallery-slide-empty">No image yet</div>`;
        dotsWrap.innerHTML = "";
        prevBtn.style.display = "none";
        nextBtn.style.display = "none";
        dotsWrap.style.display = "none";
        track.style.transform = "translateX(0)";
        return;
      }

      track.innerHTML = images
        .map((src) => `<img class="gallery-slide" src="${src}" alt="${product.name}${selectedColor.label ? " — " + selectedColor.label : ""}">`)
        .join("");
      dotsWrap.innerHTML = images
        .map((_, i) => `<button type="button" class="gallery-dot${i === 0 ? " active" : ""}" data-index="${i}" aria-label="Image ${i + 1}"></button>`)
        .join("");
      const multi = images.length > 1;
      prevBtn.style.display = multi ? "" : "none";
      nextBtn.style.display = multi ? "" : "none";
      dotsWrap.style.display = multi ? "" : "none";
      goToSlide(0);
    }

    function goToSlide(i) {
      const images = selectedColor.images;
      if (!images || !images.length) return;
      slideIndex = (i + images.length) % images.length;
      track.style.transform = `translateX(-${slideIndex * 100}%)`;
      dotsWrap.querySelectorAll(".gallery-dot").forEach((dot, idx) => {
        dot.classList.toggle("active", idx === slideIndex);
      });
    }

    prevBtn.addEventListener("click", () => goToSlide(slideIndex - 1));
    nextBtn.addEventListener("click", () => goToSlide(slideIndex + 1));
    dotsWrap.addEventListener("click", (e) => {
      const dot = e.target.closest(".gallery-dot");
      if (dot) goToSlide(Number(dot.dataset.index));
    });

    // basic swipe support
    let touchStartX = null;
    track.addEventListener("touchstart", (e) => (touchStartX = e.touches[0].clientX));
    track.addEventListener("touchend", (e) => {
      if (touchStartX === null) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 40) goToSlide(slideIndex + (dx < 0 ? 1 : -1));
      touchStartX = null;
    });

    // ---------- colour swatches ----------
    const colorGroup = document.getElementById("colorGroup");
    const colorSwatches = document.getElementById("colorSwatches");
    const selectedColorLabel = document.getElementById("selectedColorLabel");

    function renderColors() {
      if (product.colors.length <= 1) {
        colorGroup.style.display = "none";
        return;
      }
      colorGroup.style.display = "";
      colorSwatches.innerHTML = product.colors
        .map(
          (c) => `
        <button type="button" class="swatch${c.id === selectedColor.id ? " active" : ""}${c.border ? " swatch-bordered" : ""}"
          style="background:${c.swatch};" data-id="${c.id}" aria-label="${c.label}"></button>
      `
        )
        .join("");
      selectedColorLabel.textContent = selectedColor.label;
    }

    colorSwatches.addEventListener("click", (e) => {
      const btn = e.target.closest(".swatch");
      if (!btn) return;
      selectedColor = product.colors.find((c) => c.id === btn.dataset.id);
      renderColors();
      renderGallery();
      updatePrice();
    });

    // ---------- type (collar / material) ----------
    const typeGroup = document.getElementById("typeGroup");
    const typeOptions = document.getElementById("typeOptions");

    function renderTypes() {
      if (!product.types || product.types.length === 0) {
        typeGroup.style.display = "none";
        return;
      }
      typeGroup.style.display = "";
      typeOptions.innerHTML = product.types
        .map(
          (t) => `
        <button type="button" class="type-btn${t.id === selectedType.id ? " active" : ""}" data-id="${t.id}">
          <span class="type-btn-label">${t.label}</span>
          <span class="type-btn-note">${t.note}${t.priceDelta ? " · +" + money(t.priceDelta) : ""}</span>
        </button>
      `
        )
        .join("");
    }

    typeOptions.addEventListener("click", (e) => {
      const btn = e.target.closest(".type-btn");
      if (!btn) return;
      selectedType = product.types.find((t) => t.id === btn.dataset.id);
      renderTypes();
      updatePrice();
    });

    // ---------- size ----------
    const sizeOptions = document.getElementById("sizeOptions");
    const selectedSizeLabel = document.getElementById("selectedSizeLabel");
    const sizeError = document.getElementById("sizeError");

    function renderSizes() {
      sizeOptions.innerHTML = product.sizes
        .map(
          (s) => `
        <button type="button" class="size-btn${selectedSize && s.id === selectedSize.id ? " active" : ""}" data-id="${s.id}">
          ${s.label}${s.priceDelta ? `<span class="delta">+${money(s.priceDelta)}</span>` : ""}
        </button>
      `
        )
        .join("");
    }

    sizeOptions.addEventListener("click", (e) => {
      const btn = e.target.closest(".size-btn");
      if (!btn) return;
      selectedSize = product.sizes.find((s) => s.id === btn.dataset.id);
      sizeError.textContent = "";
      selectedSizeLabel.textContent = selectedSize.label;
      renderSizes();
      updatePrice();
    });

    // ---------- sizing guide dropdown ----------
    const guideToggle = document.getElementById("sizeGuideToggle");
    const guidePanel = document.getElementById("sizeGuidePanel");
    guideToggle.addEventListener("click", () => {
      const open = guidePanel.classList.toggle("open");
      guideToggle.classList.toggle("open", open);
    });

    // ---------- price ----------
    const priceEl = document.getElementById("productPrice");
    function updatePrice() {
      const typeDelta = selectedType ? selectedType.priceDelta : 0;
      const sizeDelta = selectedSize ? selectedSize.priceDelta : 0;
      priceEl.textContent = money(product.basePrice + typeDelta + sizeDelta);
    }

    // ---------- add to cart / checkout ----------
    function buildCartItem() {
      const parts = [product.name];
      if (selectedColor) parts.push(selectedColor.label);
      if (selectedType) parts.push(selectedType.label);
      if (selectedSize) parts.push("Size " + selectedSize.label);

      const variantId = [
        product.id,
        selectedColor && selectedColor.id,
        selectedType && selectedType.id,
        selectedSize && selectedSize.id,
      ]
        .filter(Boolean)
        .join("-");

      const typeDelta = selectedType ? selectedType.priceDelta : 0;
      const sizeDelta = selectedSize ? selectedSize.priceDelta : 0;

      return {
        id: variantId,
        name: parts.join(" · "),
        price: product.basePrice + typeDelta + sizeDelta,
        image: selectedColor ? selectedColor.images[0] : null,
      };
    }

    function validateSelection() {
      if (!selectedSize) {
        sizeError.textContent = "Please select a size.";
        document.getElementById("sizeGroup").scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
      return true;
    }

    document.getElementById("addCartBtn").addEventListener("click", () => {
      if (!validateSelection()) return;
      window.addToCart(buildCartItem());
    });

    document.getElementById("buyNowBtn").addEventListener("click", () => {
      if (!validateSelection()) return;
      window.Cart.add(buildCartItem());
      window.location.href = "checkout.html";
    });

    if (product.outOfStock) {
      const addBtn = document.getElementById("addCartBtn");
      const buyBtn = document.getElementById("buyNowBtn");
      addBtn.disabled = true;
      buyBtn.disabled = true;
      addBtn.textContent = "Sold Out";
      buyBtn.textContent = "Sold Out";
    }

    // ---------- initial render ----------
    renderColors();
    renderGallery();
    renderTypes();
    renderSizes();
    updatePrice();
  });
})();
