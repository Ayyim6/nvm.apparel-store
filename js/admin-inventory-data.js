/**
 * admin-inventory-data.js
 * Exposes a shared mock catalog and inventory state management.
 */
(function() {
  const PRODUCTS = [
    {
      id: "unikl-home",
      name: "UniKL Home Jersey",
      category: "Jerseys",
      skuPrefix: "UKLH",
      images: ["images/black-1.jpg", "images/white-1.jpg"],
      colors: ["Black Edition", "White Edition"],
      types: ["Standard", "Premium"],
      sizes: ["S", "M", "L", "XL", "XXL"]
    },
    {
      id: "unikl-retro",
      name: "UniKL Retro Jersey",
      category: "Jerseys — Retro Collection",
      skuPrefix: "UKLR",
      images: ["images/retro-1.jpg"],
      colors: ["Blue Edition"],
      types: [],
      sizes: ["S", "M", "L", "XL"]
    }
  ];

  // Helper to generate a unique variant key
  function getVariantKey(productId, color, type, size) {
    return [productId, color, type, size].filter(Boolean).join("::");
  }

  // Get current inventory state from localStorage
  function getInventory() {
    try {
      const stored = localStorage.getItem('nvm_inventory');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch(e) {
      console.error("Failed to load inventory from local storage", e);
    }
    return {}; // Empty map means stock is undefined / assumed infinite or 0 depending on logic.
               // For admin, we will treat undefined as 0 for simplicity.
  }

  function saveInventory(inventoryData) {
    try {
      localStorage.setItem('nvm_inventory', JSON.stringify(inventoryData));
    } catch(e) {
      console.error("Failed to save inventory to local storage", e);
    }
  }

  window.AdminInventoryData = {
    PRODUCTS,
    getVariantKey,
    getInventory,
    saveInventory
  };
})();
