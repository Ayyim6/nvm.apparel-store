/**
 * checkout-fulfillment.js — pickup vs delivery selection on checkout
 * ---------------------------------------------------------------------
 * Handles:
 *  - switching between "Pickup" and "Delivery"
 *  - showing the pickup-location list (with its own per-location fee)
 *    OR the delivery address fields (flat postage fee), never both
 *  - toggling `required` on the delivery address fields depending on mode
 *  - keeping the "Fulfillment" row and the grand Total in the order
 *    summary in sync with the cart subtotal (via Cart.getSubtotal())
 *
 * NOTE: pickup locations currently all belong to one flat product-wide
 * fee list. Wiring specific pickup options per product (as mentioned
 * for later) will need to happen where products/cart items are
 * defined, not here — this file just reads whichever location/mode is
 * selected on the form.
 */
(function () {
  const DELIVERY_FEE = 7.0;

  // Delivery address fields that are only required when mode = 'delivery'.
  // address-line2 is intentionally excluded — it's always optional.
  const REQUIRED_DELIVERY_FIELD_IDS = [
    "address-line1",
    "address-city",
    "address-postcode",
    "address-state",
  ];

  function money(n) {
    return "RM" + (Math.round(n * 100) / 100).toFixed(2);
  }

  document.addEventListener("DOMContentLoaded", function () {
    const toggle = document.getElementById("fulfillment-toggle");
    const pickupField = document.getElementById("pickup-field");
    const deliveryField = document.getElementById("delivery-field");
    const requiredDeliveryFields = REQUIRED_DELIVERY_FIELD_IDS.map((id) =>
      document.getElementById(id)
    ).filter(Boolean);
    const pickupRadios = document.querySelectorAll('input[name="pickup-location"]');
    const feeLabel = document.getElementById("fulfillment-fee-label");
    const feeValue = document.getElementById("fulfillment-fee-value");
    const totalEl = document.getElementById("checkout-total");

    if (!toggle) return; // checkout form not on this page

    let mode = "pickup"; // 'pickup' | 'delivery'

    function selectedPickup() {
      const checked = document.querySelector('input[name="pickup-location"]:checked');
      return checked
        ? { name: checked.value, fee: Number(checked.dataset.fee) || 0 }
        : { name: "", fee: 0 };
    }

    function currentFee() {
      return mode === "pickup" ? selectedPickup().fee : DELIVERY_FEE;
    }

    function updateSummary() {
      const fee = currentFee();

      if (mode === "pickup") {
        const p = selectedPickup();
        feeLabel.textContent = "Pickup — " + p.name.split(" - ")[0];
        feeValue.textContent = fee === 0 ? "Free" : money(fee);
      } else {
        feeLabel.textContent = "Delivery — Postage";
        feeValue.textContent = money(fee);
      }

      const subtotal = window.Cart ? window.Cart.getSubtotal() : 0;
      if (totalEl) totalEl.textContent = money(subtotal + fee);
    }

    function setMode(newMode) {
      mode = newMode;

      toggle.querySelectorAll(".fulfillment-option").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.mode === mode);
      });

      if (mode === "pickup") {
        pickupField.style.display = "";
        deliveryField.style.display = "none";
        requiredDeliveryFields.forEach((el) => (el.required = false));
      } else {
        pickupField.style.display = "none";
        deliveryField.style.display = "";
        requiredDeliveryFields.forEach((el) => (el.required = true));
      }

      updateSummary();
    }

    toggle.querySelectorAll(".fulfillment-option").forEach((btn) => {
      btn.addEventListener("click", () => setMode(btn.dataset.mode));
    });

    pickupRadios.forEach((radio) => {
      radio.addEventListener("change", updateSummary);
    });

    if (window.Cart) {
      window.Cart.subscribe(updateSummary);
    }

    // Expose the currently selected fulfillment details so checkout.js
    // can read them on submit.
    window.getFulfillmentSelection = function () {
      if (mode === "pickup") {
        const p = selectedPickup();
        return { mode: "pickup", location: p.name, fee: p.fee };
      }
      return {
        mode: "delivery",
        location: null,
        fee: DELIVERY_FEE,
        address: {
          line1: document.getElementById("address-line1")?.value.trim() || "",
          line2: document.getElementById("address-line2")?.value.trim() || "",
          city: document.getElementById("address-city")?.value.trim() || "",
          postcode: document.getElementById("address-postcode")?.value.trim() || "",
          state: document.getElementById("address-state")?.value || "",
        },
      };
    };

    setMode("pickup");
  });
})();
