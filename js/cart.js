/**
 * cart.js — core cart state engine
 * ---------------------------------
 * This is a self-contained, localStorage-backed cart store. It's a
 * placeholder implementation written to unblock the new slide-out
 * cart drawer (see cart-drawer.js) since the original cart.js /
 * cart-page.js / shop.js / checkout.js files weren't available to
 * merge against. If you already have Supabase-backed cart logic
 * (stock checks, saved carts per user, etc.), swap the body of
 * these functions for your real implementation — keep the same
 * function names/shapes and the drawer keeps working unchanged.
 *
 * Item shape: { id, name, price (number), image (url, optional), qty }
 */
(function (window) {
  const STORAGE_KEY = "nvm_cart";
  const listeners = [];

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
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
      try {
        fn(items);
      } catch (e) {
        console.error("Cart: listener error", e);
      }
    });
    document.dispatchEvent(new CustomEvent("cart:change", { detail: { items } }));
  }

  const Cart = {
    /** Subscribe to cart changes. Returns an unsubscribe function. */
    subscribe(fn) {
      listeners.push(fn);
      fn(items);
      return () => {
        const i = listeners.indexOf(fn);
        if (i > -1) listeners.splice(i, 1);
      };
    },

    getItems() {
      return items.slice();
    },

    getCount() {
      return items.reduce((sum, it) => sum + it.qty, 0);
    },

    getSubtotal() {
      return items.reduce((sum, it) => sum + it.price * it.qty, 0);
    },

    /** Add a product to the cart, or bump qty if it's already in there. */
    add(product, qty = 1) {
      const existing = items.find((it) => it.id === product.id);
      if (existing) {
        existing.qty += qty;
      } else {
        items.push({
          id: product.id,
          name: product.name,
          price: Number(product.price) || 0,
          image: product.image || product.image_url || null,
          qty,
        });
      }
      notify();
    },

    setQty(id, qty) {
      const item = items.find((it) => it.id === id);
      if (!item) return;
      if (qty <= 0) {
        this.remove(id);
        return;
      }
      item.qty = qty;
      notify();
    },

    increment(id) {
      const item = items.find((it) => it.id === id);
      if (item) this.setQty(id, item.qty + 1);
    },

    decrement(id) {
      const item = items.find((it) => it.id === id);
      if (item) this.setQty(id, item.qty - 1);
    },

    remove(id) {
      items = items.filter((it) => it.id !== id);
      notify();
    },

    clear() {
      items = [];
      notify();
    },
  };

  window.Cart = Cart;

  // Bridge for existing page code that calls a global addToCart(product)
  // directly (e.g. shop.js's "Add to Cart" button handler) instead of
  // Cart.add(product). Opens the drawer afterwards so the add is visible.
  window.addToCart = function (product, qty = 1) {
    Cart.add(product, qty);
    if (window.CartDrawer) window.CartDrawer.open();
  };
})(window);
