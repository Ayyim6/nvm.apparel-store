/**
 * category.js — reusable category shop page
 * -----------------------------------------------------------------
 * Powers category.html (generic — reads ?category=<slug> from the
 * URL) AND new-arrivals.html (pinned — reads <body data-category="
 * new-arrivals">, so its URL stays clean). Same engine either way:
 * look up the slug, fill in the header image/title/description,
 * render the matching products, render the gallery strip.
 *
 * CATEGORIES and MOCK_PRODUCTS below are placeholder data standing
 * in for what should eventually be real Supabase columns:
 *   - a `categories` table (or a `category` text column on
 *     products) holding title/description/header_image per slug
 *   - assigning a product to a category (or multiple) — including a
 *     way to flag "is this a new arrival"
 * Once that exists, swap loadCategory() below for a real query
 * (supabaseClient.from('products').select('*').eq('category', slug))
 * instead of the local lookups — everything else on this page reads
 * from whatever loadCategory() returns, so nothing else needs to
 * change.
 *
 * If a slug doesn't match any known category (a product with no
 * category assigned, or a bad/old link), this redirects to the
 * general shop page rather than showing a broken page.
 */
(function () {
  const CATEGORIES = {
    "home-jerseys": {
      title: "Home Jerseys",
      description: "The core lineup — built for match day and everyday wear alike.",
      headerImage: "images/headerbg.jpg",
      productIds: ["unikl-home"],
      galleryImages: ["images/black-2.jpg", "images/white-2.jpg", "images/black-3.jpg"],
    },
    "away-jerseys": {
      title: "Away Jerseys",
      description: "Dark, sleek, and built to stand out on the road.",
      headerImage: "images/black-2.jpg",
      productIds: [],
      galleryImages: ["images/black-1.jpg", "images/black-3.jpg"],
    },
    "retro-kits": {
      title: "Retro Kits",
      description: "Vintage aesthetics, modern fit.",
      headerImage: "images/retro-1.jpg",
      productIds: ["unikl-retro"],
      galleryImages: ["images/retro-1.jpg"],
    },
    "training-wear": {
      title: "Training Wear",
      description: "Built to move — for the pitch, the gym, or the street.",
      headerImage: "images/black-3.jpg",
      productIds: [],
      galleryImages: [],
    },
    "accessories": {
      title: "Accessories",
      description: "Finish the look.",
      headerImage: "images/white-3.jpg",
      productIds: [],
      galleryImages: [],
    },
    "new-arrivals": {
      title: "New Arrivals",
      description: "The latest drops, fresh off the line. Get them before they sell out.",
      headerImage: "images/headerbg.jpg",
      // placeholder: shows the 2 colourways as separate cards, until an
      // admin page can flag specific products/variants as "new arrival"
      productIds: ["unikl-home-black", "unikl-home-white"],
      galleryImages: ["images/white-1.jpg", "images/black-1.jpg", "images/retro-1.jpg"],
    },
  };

  // Lightweight stand-in for a real product row, shaped to match what
  // buildProductCardHTML() (product-card.js) already expects. Kept as
  // its own small lookup rather than reaching into product.js's
  // module-private PRODUCTS object.
  const MOCK_PRODUCTS = {
    "unikl-home": {
      id: "unikl-home",
      name: "UniKL Home Jersey",
      description: "Relaxed-fit jersey in a soft knit, built for campus days and match days alike.",
      price: 89,
      image_url: "images/black-1.jpg",
      stock_qty: 10,
    },
    "unikl-retro": {
      id: "unikl-retro",
      name: "UniKL Retro Jersey",
      description: "A retro-inspired take on the UniKL jersey with a sport polo collar.",
      price: 99,
      image_url: "images/retro-1.jpg",
      stock_qty: 10,
    },
    // Card-only entries: same underlying product (unikl-home) shown as two
    // separate cards, one per colourway, each deep-linking straight into
    // that colour on the product page via ?color=.
    "unikl-home-black": {
      id: "unikl-home-black",
      name: "UniKL Home Jersey — Black Edition",
      description: "Relaxed-fit jersey in a soft knit, built for campus days and match days alike.",
      price: 89,
      image_url: "images/black-1.jpg",
      stock_qty: 10,
      href: "product.html?id=unikl-home&color=black",
    },
    "unikl-home-white": {
      id: "unikl-home-white",
      name: "UniKL Home Jersey — White Edition",
      description: "Relaxed-fit jersey in a soft knit, built for campus days and match days alike.",
      price: 89,
      image_url: "images/white-1.jpg",
      stock_qty: 10,
      href: "product.html?id=unikl-home&color=white",
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const slug = document.body.dataset.category || params.get("category");
    const category = CATEGORIES[slug];

    if (!category) {
      window.location.replace("shop.html");
      return;
    }

    document.title = category.title + " — NVM Store";
    document.getElementById("categoryTitle").textContent = category.title;
    document.getElementById("categoryDescription").textContent = category.description;
    document.getElementById("categoryHero").style.backgroundImage = `url('${category.headerImage}')`;
    document.getElementById("categoryGridTitle").textContent = "Shop " + category.title;

    const grid = document.getElementById("categoryProductGrid");
    const products = category.productIds.map((id) => MOCK_PRODUCTS[id]).filter(Boolean);

    if (!products.length) {
      grid.innerHTML = `<div class="empty-state">No products in this category yet — check back soon!</div>`;
    } else {
      grid.innerHTML = "";
      products.forEach((product) => {
        const card = document.createElement("div");
        card.className = "featured-card";
        card.innerHTML = buildProductCardHTML(product);
        grid.appendChild(card);
      });
    }

    const galleryEl = document.getElementById("categoryGallery");
    if (category.galleryImages && category.galleryImages.length) {
      galleryEl.innerHTML = category.galleryImages
        .map((src) => `<div class="category-gallery-item"><img src="${src}" alt="${category.title}"></div>`)
        .join("");
    } else {
      galleryEl.style.display = "none";
    }
  });
})();
