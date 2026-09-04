/**
 * product.js — product detail page
 * -----------------------------------------------------------------
 */
(function () {
  const PRODUCTS = {}; // Mock fallback

  function money(n) {
    return "RM" + (Math.round(n * 100) / 100).toFixed(2);
  }

  function normalizeSupabaseProduct(row) {
    const colors = Array.isArray(row.colors) && row.colors.length > 0
      ? row.colors.map(c => ({
          id: c.name,
          label: c.name,
          swatch: c.swatch || '#000',
          images: c.images || []
        }))
      : [{ id: "default", label: "Default", swatch: "#000", images: [] }];

    let types = [];
    if (Array.isArray(row.type_groups) && row.type_groups.length > 0) {
       types = row.type_groups[0].options.map(opt => ({
           id: opt.name,
           label: opt.name,
           note: row.type_groups[0].name,
           priceDelta: Number(opt.priceAddition) || 0
       }));
    }

    const sizes = Array.isArray(row.sizes) && row.sizes.length > 0
      ? row.sizes.map(s => ({
          id: s.id,
          label: s.id,
          priceDelta: Number(s.priceAddition) || 0
      }))
      : [];

    return {
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description || "",
      details: [],
      basePrice: Number(row.base_price) || 0,
      colors,
      types,
      sizes,
      sizeGuideImage: row.size_guide_image || "images/sizing-guide.png",
      outOfStock: Number(row.stock_qty) <= 0
    };
  }

  async function loadProduct(requestedId) {
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

    const requestedColor = params.get("color");
    let selectedColor = product.colors.find((c) => c.id === requestedColor) || product.colors[0] || null;
    let selectedType = product.types[0] || null; 
    let selectedSize = null; 
    let slideIndex = 0;

    // ---------- static text ----------
    document.getElementById("productName").textContent = product.name;
    document.getElementById("productDesc").textContent = product.description;
    document.title = product.name + " — NVM Store";

    const detailsList = document.getElementById("productDetailsList");
    detailsList.innerHTML = (product.details || []).map((d) => `<li>${d}</li>`).join("");

    document.getElementById("sizeGuideImage").src = product.sizeGuideImage;

    // ---------- gallery ----------
    const track = document.getElementById("galleryTrack");
    const floatingThumbnails = document.getElementById("floatingThumbnails");

    function getGalleryImages() {
      const allImages = selectedColor.images || [];
      // SEPARATE THUMBNAIL: If more than 1 image, skip index 0. Otherwise, use what is available.
      return allImages.length > 1 ? allImages.slice(1) : allImages;
    }

    function renderGallery() {
      const galleryImages = getGalleryImages();
      slideIndex = 0;

      if (!galleryImages || galleryImages.length === 0) {
        track.innerHTML = `<div class="gallery-slide gallery-slide-empty">No image yet</div>`;
        floatingThumbnails.innerHTML = "";
        floatingThumbnails.style.display = "none";
        track.style.transform = "translateX(0)";
        return;
      }

      track.innerHTML = galleryImages
        .map((src) => `<img class="gallery-slide" src="${src}" alt="${product.name}">`)
        .join("");
        
      floatingThumbnails.innerHTML = galleryImages
        .map((src, i) => `<img src="${src}" class="thumb-pill-img${i === 0 ? " active" : ""}" data-index="${i}" alt="Thumb ${i}">`)
        .join("");
        
      const multi = galleryImages.length > 1;
      floatingThumbnails.style.display = multi ? "flex" : "none";
      goToSlide(0);
    }

    function goToSlide(i) {
      const galleryImages = getGalleryImages();
      if (!galleryImages || !galleryImages.length) return;
      
      slideIndex = (i + galleryImages.length) % galleryImages.length;
      track.style.transform = `translateX(-${slideIndex * 100}%)`;
      
      floatingThumbnails.querySelectorAll(".thumb-pill-img").forEach((thumb, idx) => {
        thumb.classList.toggle("active", idx === slideIndex);
      });
    }

    floatingThumbnails.addEventListener("click", (e) => {
      const thumb = e.target.closest(".thumb-pill-img");
      if (thumb) goToSlide(Number(thumb.dataset.index));
    });

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
      if (selectedColor && selectedColor.label !== "Default") parts.push(selectedColor.label);
      if (selectedType) parts.push(selectedType.label);
      if (selectedSize) parts.push("Size " + selectedSize.label);

      const variantId = [
        product.id,
        selectedColor && selectedColor.id,
        selectedType && selectedType.id,
        selectedSize && selectedSize.id,
      ].filter(Boolean).join("-");

      const typeDelta = selectedType ? selectedType.priceDelta : 0;
      const sizeDelta = selectedSize ? selectedSize.priceDelta : 0;

      // Always pass the thumbnail (images[0]) to the cart, not the gallery images
      const thumbImage = selectedColor && selectedColor.images && selectedColor.images.length > 0 
          ? selectedColor.images[0] 
          : null;

      return {
        id: variantId,
        productId: product.id,
        name: parts.join(" · "),
        price: product.basePrice + typeDelta + sizeDelta,
        image: thumbImage,
        qty: 1
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
      
      const item = buildCartItem();
      let cart = [];
      try { cart = JSON.parse(localStorage.getItem('nvm_cart')) || []; } catch(e){}

      const existingIndex = cart.findIndex(i => i.id === item.id);
      if (existingIndex > -1) {
          cart[existingIndex].qty += 1;
      } else {
          cart.push(item);
      }

      localStorage.setItem('nvm_cart', JSON.stringify(cart));
      window.dispatchEvent(new Event('cartUpdated'));
      
      if (typeof openCartDrawer === 'function') openCartDrawer();
      else alert("Added to cart!");
    });

    document.getElementById("buyNowBtn").addEventListener("click", () => {
      if (!validateSelection()) return;
      // Handle Buy Now logic (you can route to checkout.html here)
      alert("Proceeding to checkout..."); 
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