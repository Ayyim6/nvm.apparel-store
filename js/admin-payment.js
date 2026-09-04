(function() {
    const DEFAULT_PAYMENTS = [
        {
            id: "qr_bank",
            title: "QR Code / Bank Transfer",
            logo: "",
            qrImage: "",
            description: "Scan our QR code or transfer to our bank account, then upload your receipt.",
            requireReceipt: true,
            isActive: true,
            comingSoon: false
        },
        {
            id: "tng_spay",
            title: "TNG / SPay Later",
            logo: "",
            qrImage: "",
            description: "Pay via TnG eWallet or SPay Later using the QR code, then upload your receipt.",
            requireReceipt: true,
            isActive: true,
            comingSoon: false
        },
        {
            id: "fpx",
            title: "FPX Online Banking",
            logo: "",
            qrImage: "",
            description: "Pay directly via online banking. Additional charges apply.",
            requireReceipt: false,
            isActive: false,
            comingSoon: true
        }
    ];

    let payments = [];

    function loadPayments() {
        try {
            const stored = localStorage.getItem("nvm_payment_methods");
            if (stored) {
                payments = JSON.parse(stored);
            } else {
                payments = JSON.parse(JSON.stringify(DEFAULT_PAYMENTS));
            }
        } catch (e) {
            payments = JSON.parse(JSON.stringify(DEFAULT_PAYMENTS));
        }
        renderPayments();
    }

function renderPayments() {
        const container = document.getElementById("paymentListContainer");
        container.innerHTML = payments.map(p => `
            <div class="admin-form-card" data-id="${p.id}" style="margin-bottom: 20px;">
                <div class="repeater-item-head" style="border-bottom: 1px dashed var(--a-border); padding-bottom: 14px; margin-bottom: 16px;">
                    <div>
                        <h4 style="font-size: 1.1rem; font-family: 'Archivo Black', sans-serif;">${p.title || 'New Payment Method'}</h4>
                        <span style="font-size:0.75rem; color:var(--a-ink-soft); font-family: 'Space Mono', monospace;">ID: ${p.id}</span>
                    </div>
                    <div style="display:flex; gap:14px; align-items:center;">
                        <button type="button" class="remove-btn remove-payment">Remove</button>
                        <label class="toggle-switch" title="Coming Soon">
                            <span style="font-size:0.8rem; font-weight: 600;">Coming Soon</span>
                            <input type="checkbox" class="coming-soon-toggle" ${p.comingSoon ? 'checked' : ''}>
                            <div class="slider" style="background:#888;"></div>
                        </label>
                        <label class="toggle-switch" title="Active">
                            <span style="font-size:0.8rem; font-weight: 600;">Active</span>
                            <input type="checkbox" class="is-active-toggle" ${p.isActive ? 'checked' : ''}>
                            <div class="slider"></div>
                        </label>
                    </div>
                </div>
                
                <div class="form-row-2 form-field-admin">
                    <div>
                        <label>Title</label>
                        <input type="text" class="p-title" value="${p.title}" placeholder="Payment Name">
                        
                        <label style="margin-top: 14px;">Description (HTML allowed)</label>
                        <textarea class="p-desc" rows="4" placeholder="Instructions for the customer...">${p.description}</textarea>
                        
                        <label class="toggle-switch" style="margin-top: 16px;">
                            <input type="checkbox" class="p-require-receipt" ${p.requireReceipt ? 'checked' : ''}>
                            <div class="slider"></div>
                            <span style="font-size:0.85rem; font-weight: 600; margin-left: 8px;">Require Customer to Upload Receipt</span>
                        </label>
                    </div>
                    
                    <div>
                        <label>Small Logo (Optional)</label>
                        <div class="upload-box upload-logo-btn">
                            Click to upload logo icon
                            <input type="file" accept="image/*" class="p-logo-upload" style="display:none;">
                            ${p.logo ? `<img src="${p.logo}" class="img-preview logo-preview">` : '<img src="" class="img-preview logo-preview" style="display:none;">'}
                        </div>
                        
                        <label style="margin-top:14px; display:block;">QR Code Image (Optional)</label>
                        <div class="upload-box upload-qr-btn">
                            Click to upload QR Code
                            <input type="file" accept="image/*" class="p-qr-upload" style="display:none;">
                            ${p.qrImage ? `<img src="${p.qrImage}" class="img-preview qr-preview">` : '<img src="" class="img-preview qr-preview" style="display:none;">'}
                        </div>
                    </div>
                </div>
            </div>
        `).join("");

        bindEvents();
    }

    function bindEvents() {
        document.querySelectorAll(".remove-payment").forEach(btn => {
            btn.addEventListener("click", e => {
                const id = e.target.closest(".payment-item").dataset.id;
                payments = payments.filter(p => p.id !== id);
                renderPayments();
            });
        });

        // Logo Uploads
        document.querySelectorAll(".upload-logo-btn").forEach(box => {
            box.addEventListener("click", (e) => {
                if (e.target.tagName !== "INPUT") box.querySelector(".p-logo-upload").click();
            });
        });
        document.querySelectorAll(".p-logo-upload").forEach(input => {
            input.addEventListener("change", e => {
                if (!e.target.files.length) return;
                const id = e.target.closest(".payment-item").dataset.id;
                const reader = new FileReader();
                reader.onload = event => {
                    const p = payments.find(x => x.id === id);
                    p.logo = event.target.result;
                    renderPayments();
                };
                reader.readAsDataURL(e.target.files[0]);
            });
        });

        // QR Uploads
        document.querySelectorAll(".upload-qr-btn").forEach(box => {
            box.addEventListener("click", (e) => {
                if (e.target.tagName !== "INPUT") box.querySelector(".p-qr-upload").click();
            });
        });
        document.querySelectorAll(".p-qr-upload").forEach(input => {
            input.addEventListener("change", e => {
                if (!e.target.files.length) return;
                const id = e.target.closest(".payment-item").dataset.id;
                const reader = new FileReader();
                reader.onload = event => {
                    const p = payments.find(x => x.id === id);
                    p.qrImage = event.target.result;
                    renderPayments();
                };
                reader.readAsDataURL(e.target.files[0]);
            });
        });
        
        // Sync text inputs back to model immediately so re-renders don't wipe them
        document.querySelectorAll(".p-title, .p-desc, .p-require-receipt, .is-active-toggle, .coming-soon-toggle").forEach(el => {
            el.addEventListener("change", e => {
                 const id = e.target.closest(".payment-item").dataset.id;
                 const p = payments.find(x => x.id === id);
                 if (e.target.classList.contains("p-title")) p.title = e.target.value;
                 if (e.target.classList.contains("p-desc")) p.description = e.target.value;
                 if (e.target.classList.contains("p-require-receipt")) p.requireReceipt = e.target.checked;
                 if (e.target.classList.contains("is-active-toggle")) p.isActive = e.target.checked;
                 if (e.target.classList.contains("coming-soon-toggle")) p.comingSoon = e.target.checked;
            });
        });
    }

    document.getElementById("addPaymentBtn").addEventListener("click", () => {
        payments.push({
            id: 'pay_' + Math.random().toString(36).substr(2, 6),
            title: "New Payment Method",
            logo: "",
            qrImage: "",
            description: "",
            requireReceipt: false,
            isActive: false,
            comingSoon: false
        });
        renderPayments();
    });

    document.getElementById("savePaymentBtn").addEventListener("click", () => {
        try {
            localStorage.setItem("nvm_payment_methods", JSON.stringify(payments));
            showToast("Payment methods saved successfully.");
        } catch(e) {
            showToast("Failed to save.");
        }
    });

    let toastTimer = null;
    function showToast(message) {
      const toast = document.getElementById("adminToast");
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
    }

    document.addEventListener("DOMContentLoaded", loadPayments);
})();
