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
          <a href="shop.html" class="confirmation-cta">Continue Shopping</a>
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


      // Generate custom Order ID: [SKU]-[4DIGIT]-[ACRONYM]
      const firstItem = items[0];
      const skuCode = firstItem && firstItem.id ? firstItem.id.toString().toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8) : 'NVM';
      const random4 = Math.floor(1000 + Math.random() * 9000);

      let acronym = 'D'; // Default to Delivery
      if (fulfillment.mode === 'pickup') {
          // Attempt to extract acronym from location string based on admin-data.js logic
          if (fulfillment.location && fulfillment.location.includes('MICET')) acronym = 'M';
          else if (fulfillment.location && fulfillment.location.includes('MITEC')) acronym = 'J';
          else if (fulfillment.location && fulfillment.location.includes('RCMP')) acronym = 'I';
          else acronym = 'P'; // Generic pickup
      }

      const orderId = `${skuCode}-${random4}-${acronym}`;
      const date = new Date().toLocaleString();
      const dateIso = new Date().toISOString().split('T')[0];

      let itemsHtml = '';
      items.forEach(item => {
          itemsHtml += `<tr>
              <td>${item.name} <strong>(x${item.qty})</strong></td>
              <td style="text-align: right;">RM ${parseFloat(item.price * item.qty).toFixed(2)}</td>
          </tr>`;
      });

      document.getElementById('invoiceContentArea').innerHTML = `
          <h2 style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px; font-family:'Archivo Black', sans-serif;">NVM STORE - INVOIS</h2>
          <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 0.95rem;">
              <div>
                  <p><strong>Order ID:</strong> ${orderId}</p>
                  <p><strong>Tarikh:</strong> ${date}</p>
                  <p><strong>Nama:</strong> ${orderPayload.customer_name}</p>
                  <p><strong>No. Tel:</strong> ${orderPayload.customer_phone}</p>
              </div>
              <div style="text-align: right;">
                  <p><strong>Fulfillment:</strong> ${orderPayload.fulfillment_mode.toUpperCase()}</p>
                  <p><strong>Bayaran:</strong> ${orderPayload.payment_method}</p>
              </div>
          </div>
          <table class="invoice-table">
              <thead>
                  <tr><th>Item</th><th style="text-align: right;">Harga</th></tr>
              </thead>
              <tbody>
                  ${itemsHtml}
                  <tr style="background: #fafafa;">
                      <td><strong>Caj Tambahan</strong></td>
                      <td style="text-align: right;"><strong>RM ${parseFloat(fulfillment.fee).toFixed(2)}</strong></td>
                  </tr>
              </tbody>
          </table>
          <h3 style="text-align: right; margin-top: 20px; font-size: 1.3rem;">Jumlah: RM ${parseFloat(total).toFixed(2)}</h3>
      `;

      submitBtn.disabled = false;
      submitBtn.textContent = "Place Order";
      window.currentOrderData = { orderId, total, items, orderPayload, fulfillment };
      document.getElementById('invoiceModal').classList.add('active');

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


window.sendToWhatsApp = function() {
    if (!window.currentOrderData) return;
    const { orderId, total, items, orderPayload, fulfillment } = window.currentOrderData;
    const adminPhone = "601111111111"; 
    
    let message = `Hi NVM Store! Saya ingin mengesahkan pesanan saya:%0A%0A*ORDER ID: ${orderId}*%0A%0A*Maklumat Pelanggan:*%0ANama: ${orderPayload.customer_name}%0ATel: ${orderPayload.customer_phone}%0AFulfillment: ${orderPayload.fulfillment_mode.toUpperCase()}%0A%0A*Senarai Item:*%0A`;
    
    items.forEach((item, index) => {
        message += `${index + 1}. *${item.name}* (x${item.qty}) - RM ${parseFloat(item.price * item.qty).toFixed(2)}%0A`;
    });
    
    message += `+ Caj Tambahan: RM ${parseFloat(fulfillment.fee).toFixed(2)}%0A`;
    message += `%0A💰 *Total Keseluruhan: RM ${parseFloat(total).toFixed(2)}*%0A%0A`;
    
    // Save to localStorage so admin-data.js and order-tracking.js can read it
    const existingOrders = JSON.parse(localStorage.getItem('nvm_database_orders')) || [];

    // Check if productId and category exist for admin tracking
    const firstItem = items[0] || {};
    let productId = firstItem.id || 'unknown';
    let productLabel = firstItem.name || 'Unknown Product';

    const newOrder = {
        id: orderId,
        date: new Date().toISOString().split('T')[0],
        customerName: orderPayload.customer_name,
        customerPhone: orderPayload.customer_phone,
        customerEmail: orderPayload.customer_email,
        productId: productId,
        productLabel: productLabel,
        category: "home-jerseys", // default category
        variant: firstItem.selectedSize || "Standard",
        qty: firstItem.qty || 1,
        total: total,
        fulfillmentMode: orderPayload.fulfillment_mode,
        pickupLocation: orderPayload.pickup_location,
        deliveryAddress: orderPayload.fulfillment_mode === 'delivery' ?
            `${orderPayload.delivery_address_line1}, ${orderPayload.delivery_postcode} ${orderPayload.delivery_city}, ${orderPayload.delivery_state}` : null,
        paymentMethod: orderPayload.payment_method,
        status: "pending",
        receiptUrl: "images/mock-receipt.png",
        trackingNumber: null,
        items: items
    };

    existingOrders.push(newOrder);
    localStorage.setItem('nvm_database_orders', JSON.stringify(existingOrders));

    window.open(`https://wa.me/${adminPhone}?text=${message}`, '_blank');
    
    window.Cart.clear();
    document.getElementById('invoiceModal').classList.remove('active');
    window.location.href = 'index.html';
};
