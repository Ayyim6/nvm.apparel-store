/**
 * cart-drawer.js — slide-out cart panel
 * --------------------------------------
 * Injects the drawer + overlay markup once per page, wires up every
 * .cart-btn (the nav trigger present on every page) to open it, and
 * re-renders whenever Cart state changes (see cart.js).
 *
 * Include this AFTER cart.js on every page. No page-specific markup
 * is required — it builds its own DOM.
 */
(function () {
  function money(n) {
    return "$" + (Math.round(n * 100) / 100).toFixed(2);
  }

  function buildDrawer() {
    const overlay = document.createElement("div");
    overlay.className = "cart-overlay";
    overlay.id = "cartOverlay";

    const drawer = document.createElement("aside");
    drawer.className = "cart-drawer";
    drawer.id = "cartDrawer";
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <div class="cart-drawer-header">
        <h3>Your Cart</h3>
        <button type="button" class="cart-drawer-close" id="cartDrawerClose" aria-label="Close cart">✕</button>
      </div>
      <div class="cart-drawer-body" id="cartDrawerBody"></div>
      <div class="cart-drawer-footer" id="cartDrawerFooter">
        <div class="cart-summary-row">
          <span>Subtotal</span>
          <span id="cartDrawerSubtotal">$0.00</span>
        </div>
        <div class="cart-summary-total">
          <span>Total</span>
          <span id="cartDrawerTotal">$0.00</span>
        </div>
        <button type="button" class="checkout-btn" id="cartDrawerCheckout">Proceed to Checkout</button>
      </div>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);
    return { overlay, drawer };
  }

  function renderItem(item) {
    const thumb = item.image
      ? `<div class="drawer-item-thumb"><img src="${item.image}" alt="${item.name}"></div>`
      : `<div class="drawer-item-thumb-placeholder"></div>`;

    return `
      <div class="drawer-item" data-id="${item.id}">
        ${thumb}
        <div class="drawer-item-info">
          <h4>${item.name}</h4>
          <div class="drawer-item-price">${money(item.price)}</div>
          <div class="drawer-item-qty">
            <button type="button" class="qty-btn" data-action="decrement" aria-label="Decrease quantity">−</button>
            <span>${item.qty}</span>
            <button type="button" class="qty-btn" data-action="increment" aria-label="Increase quantity">+</button>
            <span class="drawer-item-subtotal">${money(item.price * item.qty)}</span>
          </div>
        </div>
        <button type="button" class="drawer-item-remove" data-action="remove" aria-label="Remove item">✕</button>
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (!window.Cart) {
      console.error("cart-drawer.js requires cart.js to be loaded first.");
      return;
    }

    const { overlay, drawer } = buildDrawer();
    const body = drawer.querySelector("#cartDrawerBody");
    const subtotalEl = drawer.querySelector("#cartDrawerSubtotal");
    const totalEl = drawer.querySelector("#cartDrawerTotal");
    const checkoutBtn = drawer.querySelector("#cartDrawerCheckout");
    const closeBtn = drawer.querySelector("#cartDrawerClose");

    function open() {
      overlay.classList.add("open");
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
      document.body.classList.add("cart-drawer-locked");
    }

    function close() {
      overlay.classList.remove("open");
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("cart-drawer-locked");
    }

    function toggle() {
      drawer.classList.contains("open") ? close() : open();
    }

    function render(items) {
      if (!items.length) {
        body.innerHTML = `<div class="cart-drawer-empty">Your cart is empty. <a href="shop.html">Browse the shop →</a></div>`;
      } else {
        body.innerHTML = items.map(renderItem).join("");
      }

      const subtotal = window.Cart.getSubtotal();
      subtotalEl.textContent = money(subtotal);
      totalEl.textContent = money(subtotal);
      checkoutBtn.disabled = items.length === 0;

      const count = window.Cart.getCount();
      document.querySelectorAll("#navCartCount, .cart-count-badge").forEach((el) => {
        el.textContent = count;
      });
    }

    // Wire up every cart trigger button present on the page (nav icon button).
    document.querySelectorAll(".cart-btn, [data-cart-open]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        open();
      });
    });

    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });

    body.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const id = btn.closest(".drawer-item").dataset.id;
      if (btn.dataset.action === "increment") window.Cart.increment(id);
      if (btn.dataset.action === "decrement") window.Cart.decrement(id);
      if (btn.dataset.action === "remove") window.Cart.remove(id);
    });

    checkoutBtn.addEventListener("click", () => {
      if (checkoutBtn.disabled) return;
      window.location.href = "checkout.html";
    });

    window.Cart.subscribe(render);

    window.CartDrawer = { open, close, toggle };
  });
})();
