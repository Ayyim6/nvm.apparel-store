
(function () {
    let payments = [];

    function loadPayments() {
        try {
            const stored = localStorage.getItem("nvm_payment_methods");
            if (stored) {
                payments = JSON.parse(stored);
            } else {
                payments = [
                    { id: "qr_bank", title: "QR Code / Bank Transfer", description: "Scan our QR code or transfer to our bank account, then upload your receipt.", requireReceipt: true, isActive: true },
                    { id: "tng_spay", title: "TNG / SPay Later", description: "Pay via TnG eWallet or SPay Later.", requireReceipt: true, isActive: true },
                    { id: "fpx", title: "FPX Online Banking", description: "Pay directly via online banking.", requireReceipt: false, isActive: false, comingSoon: true }
                ];
            }
        } catch(e) {}
        renderPayments();
    }

    function renderPayments() {
        const container = document.getElementById("dynamic-payment-container");
        if (!container) return;

        let allowedPayments = null;
        if (window.Cart && window.AdminInventoryData) {
            const items = window.Cart.getItems();
            if (items.length > 0) {
                 const product = window.AdminInventoryData.PRODUCTS.find(p => String(p.id) === String(items[0].id));
                 if (product && product.allowedPayments) {
                     allowedPayments = product.allowedPayments;
                 }
            }
        }

        let html = '<div class="payment-method-list" id="payment-method-list">';

        payments.forEach((p, idx) => {
            const isAllowed = !allowedPayments || allowedPayments.includes(p.id);
            const isDisabled = !p.isActive || p.comingSoon || !isAllowed;
            const checked = (idx === 0 && !isDisabled) ? 'checked' : '';

            html += `
              <label class="payment-method-option ${isDisabled ? 'disabled' : ''}" data-method="${p.id}">
                <input type="radio" name="payment-method" value="${p.id}" ${checked} ${isDisabled ? 'disabled' : ''}>
                <div class="payment-method-body">
                  <span class="payment-method-name">
                    ${p.logo ? `<img src="${p.logo}" style="height:20px; vertical-align:middle; margin-right:8px; border-radius:4px;">` : ''}
                    ${p.title}
                    ${p.comingSoon ? '<span class="badge-soon">Coming soon</span>' : ''}
                  </span>
                  <span class="payment-method-desc">${p.description}</span>
                </div>
              </label>
            `;
        });

        html += '</div>'; // End list

        // Add detail sections
        payments.forEach(p => {
             html += `
             <div class="payment-method-details" id="payment-details-${p.id}" style="display:none;">
                 ${p.qrImage ? `<img src="${p.qrImage}" style="max-width:100%; max-height:200px; display:block; margin: 0 auto 14px; border-radius:8px; border:1px solid var(--border);">` : ''}
                 ${p.requireReceipt ? `
                 <div class="form-field receipt-upload-field">
                    <label>Upload Payment Receipt</label>
                    <input type="file" class="receipt-upload" accept=".jpg,.jpeg,.png,.pdf">
                    <span class="field-hint">Accepted formats: JPEG, PNG or PDF.</span>
                 </div>
                 ` : ''}
             </div>
             `;
        });

        container.innerHTML = html;
        bindPaymentEvents();

        // Initialize display
        const activeRadio = document.querySelector('input[name="payment-method"]:checked');
        if (activeRadio) {
            const method = activeRadio.value;
            const details = document.getElementById("payment-details-" + method);
            if (details) details.style.display = "block";
        }
    }

    function bindPaymentEvents() {
        const radios = document.querySelectorAll('input[name="payment-method"]');
        radios.forEach(radio => {
            radio.addEventListener("change", (e) => {
                // Hide all
                document.querySelectorAll('.payment-method-details').forEach(el => el.style.display = "none");
                // Show active
                const method = e.target.value;
                const details = document.getElementById("payment-details-" + method);
                if (details) details.style.display = "block";
            });
        });
    }

    window.validatePaymentSelection = function () {
      const selected = document.querySelector('input[name="payment-method"]:checked');
      if (!selected) {
        showError("Please select a payment method.");
        return false;
      }
      const methodId = selected.value;
      const details = document.getElementById("payment-details-" + methodId);

      if (details) {
          const fileInput = details.querySelector(".receipt-upload");
          if (fileInput && !fileInput.files.length) {
              showError("Please upload your payment receipt.");
              return false;
          }
      }
      return true;
    };

    window.getPaymentSelection = function () {
      const selected = document.querySelector('input[name="payment-method"]:checked');
      return {
        method: selected ? selected.value : null,
        // Mock receipt data, normally we'd parse the file
        receiptFile: "mock-receipt.png"
      };
    };

    function showError(msg) {
        const el = document.getElementById("payment-error");
        if (el) el.textContent = msg;
    }

    document.addEventListener("DOMContentLoaded", loadPayments);
})();
