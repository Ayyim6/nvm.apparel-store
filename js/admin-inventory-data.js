/**
 * admin-inventory-data.js
 * Exposes a shared mock catalog and inventory state management.
 */
(function() {

  const DEFAULT_PRODUCTS = [
    {
      id: "unikl-home",
      name: "UniKL Home Jersey",
      category: "Jerseys",
      skuPrefix: "UKLH",
      images: ["images/black-1.jpg", "images/white-1.jpg"],
      colors: ["Black Edition", "White Edition"],
      types: ["Standard", "Premium"],
      sizes: ["S", "M", "L", "XL", "XXL"],
      allowedPayments: ["qr_bank", "tng_spay"]
    },
    {
      id: "unikl-retro",
      name: "UniKL Retro Jersey",
      category: "Jerseys — Retro Collection",
      skuPrefix: "UKLR",
      images: ["images/retro-1.jpg"],
      colors: ["Blue Edition"],
      types: [],
      sizes: ["S", "M", "L", "XL"],
      allowedPayments: ["qr_bank", "tng_spay"]
    }
  ];


  let PRODUCTS = [];

  async function getProducts() {
      if (typeof supabaseClient === "undefined") {
          console.error("Supabase client not loaded");
          return [];
      }

      const { data, error } = await supabaseClient.from('products').select('*').order('created_at', { ascending: false });
      if (error) {
          console.error("Error fetching products from Supabase:", error);
          return [];
      }

      // Map to internal format so rest of admin panel doesn't break
      PRODUCTS = data.map(p => ({
          id: p.id,
          name: p.name,
          category: "Catalog", // Fallback if missing
          skuPrefix: "SKU",
          images: p.image_url ? [p.image_url] : [],
          colors: [],
          types: [],
          sizes: p.sizes && p.sizes.length > 0 ? p.sizes : ["Standard"],
          allowedPayments: ["qr_bank", "tng_spay"],
          price: p.price,
          stock_qty: p.stock_qty,
          description: p.description
      }));

      window.AdminInventoryData.PRODUCTS = PRODUCTS;
      return PRODUCTS;
  }

  async function deleteProduct(id) {
      if (typeof supabaseClient === "undefined") return;
      const { error } = await supabaseClient.from('products').delete().eq('id', id);
      if (error) {
          console.error("Failed to delete from Supabase", error);
      }
  }

  // Admin inventory updates stock manually via LocalStorage for now since we lack variant rows in Supabase,
  // but if we were just updating the root product:
  // supabaseClient.from('products').update({stock_qty: val}).eq('id', id)
)();
