/**
 * cart.js — core cart state engine (With Auto-Cleaner)
 */
(function (window) {
  const STORAGE_KEY = "nvm_cart";
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];

      // AUTO-CLEANER MAGIC: Buang data undefined / NaN secara paksa
      let hasCorruptedData = false;
      let cleanData = parsed.filter(item => {
        if (!item || !item.id || String(item.id) === "undefined" || isNaN(item.price)) {
          hasCorruptedData = true;
          return false; // Jangan masukkan dalam troli
        }
        return true;
      });

      if (hasCorruptedData) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
      }

      return cleanData;
    } catch (e) {
      console.error("Cart: failed to read localStorage", e);
      return [];
    }
  }

  function save(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Cart: failed to write localStorage", e);
    }
  }

  let items = load();

  function notify() {
    save(items);
    listeners.forEach((fn) => {
      try { fn(items); } catch (e) { console.error(e); }
    });
    document.dispatchEvent(new CustomEvent("cart:change", { detail: { items } }));
  }

  const Cart = {
    subscribe(fn) {
      listeners.push(fn);
      fn(items);
      return () => {
        const i = listeners.indexOf(fn);
        if (i > -1) listeners.splice(i, 1);
      };
    },
    getItems() { return items.slice(); },
    getCount() { return items.reduce((sum, it) => sum + (it.qty || 1), 0); },
    getSubtotal() { return items.reduce((sum, it) => sum + ((it.price || 0) * (it.qty || 1)), 0); },

    add(product, qty = 1) {
      const existing = items.find((it) => String(it.id) === String(product.id));
      if (existing) {
        existing.qty += qty;
      } else {
        items.push({
          id: product.id,
          name: product.name,
          price: Number(product.price) || 0,
          image: product.image || product.image_url || null,
          qty: qty,
        });
      }
      notify();
    },

    setQty(id, qty) {
      const item = items.find((it) => String(it.id) === String(id));
      if (!item) return;
      if (qty <= 0) {
        this.remove(id);
        return;
      }
      item.qty = qty;
      notify();
    },

    increment(id) {
      const item = items.find((it) => String(it.id) === String(id));
      if (item) this.setQty(id, item.qty + 1);
    },

    decrement(id) {
      const item = items.find((it) => String(it.id) === String(id));
      if (item) this.setQty(id, item.qty - 1);
    },

    remove(id) {
      items = items.filter((it) => String(it.id) !== String(id));
      notify();
    },

    clear() {
      items = [];
      notify();
    },
  };

  window.Cart = Cart;

  window.addToCart = function (product, qty = 1) {
    Cart.add(product, qty);
    if (window.CartDrawer) window.CartDrawer.open();
  };
})(window);
