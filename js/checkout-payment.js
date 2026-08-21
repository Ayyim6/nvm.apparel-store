/**
 * checkout-payment.js — payment method selection on checkout
 * ---------------------------------------------------------------
 * Handles switching between the 3 payment methods, showing the right
 * detail panel (QR + bank details / QR + links / "coming soon"), and
 * validating the uploaded receipt file type (JPEG or PDF only).
 *
 * Written so a 4th/5th method — or limiting methods per product — is
 * easy to add later: PAYMENT_METHODS below is the single source of
 * truth. To restrict methods per product, filter this array (or swap
 * it) based on the cart contents before rendering, rather than
 * hardcoding logic elsewhere.
 */
(function () {
  const PAYMENT_METHODS = [
    { id: "qr_bank", requiresReceipt: true, disabled: false },
    { id: "tng_spay", requiresReceipt: true, disabled: false },
    { id: "fpx", requiresReceipt: false, disabled: true },
  ];

  const ACCEPTED_RECEIPT_TYPES = ["image/jpeg", "application/pdf"];
  const ACCEPTED_RECEIPT_EXT = [".jpg", ".jpeg", ".pdf"];

  document.addEventListener("DOMContentLoaded", function () {
    const list = document.getElementById("payment-method-list");
    if (!list) return; // not on the checkout page

    const receiptField = document.getElementById("receipt-upload-field");
    const receiptInput = document.getElementById("receipt-upload");
    const paymentError = document.getElementById("payment-error");

    let currentMethod = "qr_bank";
    let receiptFile = null;

    function methodConfig(id) {
      return PAYMENT_METHODS.find((m) => m.id === id);
    }

    function setMethod(id) {
      currentMethod = id;

      PAYMENT_METHODS.forEach((m) => {
        const panel = document.getElementById("payment-details-" + m.id);
        if (panel) panel.style.display = m.id === id ? "" : "none";
      });

      const cfg = methodConfig(id);
      if (cfg && cfg.requiresReceipt) {
        receiptField.style.display = "";
        receiptInput.required = true;
      } else {
        receiptField.style.display = "none";
        receiptInput.required = false;
        receiptInput.value = "";
        receiptFile = null;
      }

      paymentError.textContent = "";
    }

    list.querySelectorAll('input[name="payment-method"]').forEach((radio) => {
      radio.addEventListener("change", () => {
        if (radio.disabled) return;
        setMethod(radio.value);
      });
    });

    receiptInput.addEventListener("change", () => {
      paymentError.textContent = "";
      const file = receiptInput.files[0];
      if (!file) {
        receiptFile = null;
        return;
      }

      const extOk = ACCEPTED_RECEIPT_EXT.some((ext) =>
        file.name.toLowerCase().endsWith(ext)
      );
      const typeOk = ACCEPTED_RECEIPT_TYPES.includes(file.type);

      if (!extOk && !typeOk) {
        paymentError.textContent = "Please upload a JPEG or PDF file only.";
        receiptInput.value = "";
        receiptFile = null;
        return;
      }

      receiptFile = file;
    });

    // Exposed for checkout.js to read on submit.
    window.getPaymentSelection = function () {
      const cfg = methodConfig(currentMethod);
      return {
        method: currentMethod,
        requiresReceipt: cfg ? cfg.requiresReceipt : false,
        receiptFile: receiptFile,
      };
    };

    // Validates the payment step before the order is allowed to submit.
    // Returns true if OK, otherwise shows an error and returns false.
    window.validatePaymentSelection = function () {
      const cfg = methodConfig(currentMethod);
      if (cfg && cfg.disabled) {
        paymentError.textContent = "That payment method isn't available yet — please choose another.";
        return false;
      }
      if (cfg && cfg.requiresReceipt && !receiptFile) {
        paymentError.textContent = "Please upload your payment receipt (JPEG or PDF).";
        return false;
      }
      return true;
    };

    setMethod("qr_bank");
  });
})();
