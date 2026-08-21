/**
 * checkout.js — order summary rendering + submission to Supabase
 * -----------------------------------------------------------------
 * Expects (all already loaded before this script):
 *   - window.Cart                        (cart.js)
 *   - window.getFulfillmentSelection()   (checkout-fulfillment.js)
 *   - window.getPaymentSelection()       (checkout-payment.js)
 *   - window.validatePaymentSelection()  (checkout-payment.js)
 *   - supabaseClient                     (supabaseClient.js, global)
 *
 * We're not finalizing the Supabase table shape yet, but for
 * reference this is the payload currently being sent to an "orders"
 * table (adjust column names later once that's settled):
 *   customer_name, customer_email, customer_phone,
 *   fulfillment_mode, pickup_location,
 *   delivery_address_line1, delivery_address_line2, delivery_city,
 *   delivery_postcode, delivery_state,
 *   payment_method,
 *   items, subtotal, fulfillment_fee, total, status
 *
 * Receipt upload: the file is validated (JPEG/PDF) by
 * checkout-payment.js, but it is NOT yet uploaded anywhere — actually
 * storing it in Supabase Storage and attaching its URL to the order
 * is left for later, same as the SQL table itself.
 */
(function () {
  function money(n) {
    return "RM" + (Math.round(n * 100) / 100).toFixed(2);
  }

  // Generates a short, human-readable order code, e.g. "NVM-7K2QXB".
  // This is a stand-in for a real one: it works fine for now, but once
  // the "orders" table exists, moving this generation server-side
  // (a Postgres default/trigger) is the more bulletproof long-term
  // approach, since it avoids any (very unlikely, but non-zero) chance
  // of two orders landing on the same code.
  function generateTrackingCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I to avoid confusion
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return "NVM-" + code;
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("checkout-form");
    if (!form) return; // not on the checkout page

    const itemsEl = document.getElementById("checkout-items");
    const totalEl = document.getElementById("checkout-total");
    const errorEl = document.getElementById("form-error");
    const submitBtn = document.getElementById("submit-order-btn");
    const checkoutWrap = document.querySelector(".checkout-wrap");

    function renderItems() {
      const items = window.Cart.getItems();

      if (!items.length) {
        itemsEl.innerHTML = `<div class="checkout-line">Your cart is empty.</div>`;
        submitBtn.disabled = true;
        return;
      }

      submitBtn.disabled = false;
      itemsEl.innerHTML = items
        .map(
          (it) => `
        <div class="checkout-line">
          <span>${it.name} × ${it.qty}</span>
          <span>${money(it.price * it.qty)}</span>
        </div>
      `
        )
        .join("");
    }

    // checkout-fulfillment.js already updates #checkout-total, but we
    // re-render it here too whenever the cart changes so it reflects
    // the latest subtotal even before fulfillment.js's own listener runs.
    function updateTotal() {
      const subtotal = window.Cart.getSubtotal();
      const fulfillment = window.getFulfillmentSelection
        ? window.getFulfillmentSelection()
        : { fee: 0 };
      totalEl.textContent = money(subtotal + fulfillment.fee);
    }

    function showError(message) {
      errorEl.textContent = message;
    }

    function clearError() {
      errorEl.textContent = "";
    }

    function showConfirmation(order) {
      const fulfillment = window.getFulfillmentSelection();
      const fulfillmentLine =
        fulfillment.mode === "pickup"
          ? `Pickup at ${fulfillment.location}`
          : `Delivery to the address you provided`;

      const email = document.getElementById("customer-email").value.trim();

      // order.id is the raw Supabase row id for now — once payment_status /
      // fulfillment_status / a short order_code column exist, swap this for
      // that generated code instead. Kept here so the page is honest about
      // what actually happens today: nothing is confirmed or emailed yet,
      // it's just been received and is waiting on manual verification.
      checkoutWrap.outerHTML = `
        <div class="confirmation-wrap">
          <div class="confirmation-icon">✓</div>
          <h1>Thank You for Your Order!</h1>
          <p>We're verifying your payment now. Once confirmed, we'll send your invoice to ${email}.</p>
          <p>If there's an issue with your receipt, we'll email you with next steps instead.</p>
          <p>${fulfillmentLine}</p>
          <div class="confirmation-order-id">Order Code: ${order.id}</div>
          <a href="shop.html" class="submit-order-btn" style="display:inline-block; text-decoration:none;">Continue Shopping</a>
        </div>
      `;
    }

    async function submitOrder(e) {
      e.preventDefault();
      clearError();

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      const items = window.Cart.getItems();
      if (!items.length) {
        showError("Your cart is empty.");
        return;
      }

      if (window.validatePaymentSelection && !window.validatePaymentSelection()) {
        return; // checkout-payment.js has already shown the specific error
      }

      const fulfillment = window.getFulfillmentSelection
        ? window.getFulfillmentSelection()
        : { mode: "pickup", location: null, fee: 0 };

      const payment = window.getPaymentSelection
        ? window.getPaymentSelection()
        : { method: null, receiptFile: null };

      const subtotal = window.Cart.getSubtotal();
      const total = subtotal + fulfillment.fee;

      const orderPayload = {
        customer_name: document.getElementById("customer-name").value.trim(),
        customer_email: document.getElementById("customer-email").value.trim(),
        customer_phone: document.getElementById("customer-phone").value.trim(),
        fulfillment_mode: fulfillment.mode,
        pickup_location: fulfillment.mode === "pickup" ? fulfillment.location : null,
        delivery_address_line1: fulfillment.mode === "delivery" ? fulfillment.address.line1 : null,
        delivery_address_line2: fulfillment.mode === "delivery" ? fulfillment.address.line2 : null,
        delivery_city: fulfillment.mode === "delivery" ? fulfillment.address.city : null,
        delivery_postcode: fulfillment.mode === "delivery" ? fulfillment.address.postcode : null,
        delivery_state: fulfillment.mode === "delivery" ? fulfillment.address.state : null,
        payment_method: payment.method,
        // TODO: once Supabase Storage is set up, upload payment.receiptFile
        // there and store its URL instead of skipping it here.
        items: items,
        subtotal: subtotal,
        fulfillment_fee: fulfillment.fee,
        total: total,
        status: "pending",
      };

      submitBtn.disabled = true;
      submitBtn.textContent = "Placing Order...";

      const { data, error } = await supabaseClient
        .from("orders")
        .insert([orderPayload])
        .select()
        .single();

      if (error) {
        console.error("Order submission failed:", error);
        showError("Something went wrong placing your order. Please try again.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Place Order";
        return;
      }

      window.Cart.clear();
      showConfirmation(data);
    }

    renderItems();
    updateTotal();

    window.Cart.subscribe(() => {
      renderItems();
      updateTotal();
    });

    form.addEventListener("submit", submitOrder);
  });
})();
