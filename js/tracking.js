document.addEventListener("DOMContentLoaded", function() {
    const trackBtn = document.getElementById("track-btn");
    const trackInput = document.getElementById("tracking-input");
    const resultDiv = document.getElementById("tracking-result");
    const orderIdEl = document.getElementById("tracking-order-id");
    const timelineEl = document.querySelector(".tracking-timeline");
    const detailsDiv = document.getElementById("tracking-details");

    if (!trackBtn) return;

    const ICONS = {
        pending: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
        confirmed: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
        indelivery: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`,
        pickup: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`,
        success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`,
        unsuccessful: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`
    };

    trackBtn.addEventListener("click", () => {
        const code = trackInput.value.trim().toUpperCase();
        if (!code) return;

        let orders = [];
        if (window.AdminData && window.AdminData.getOrders) {
            orders = window.AdminData.getOrders();
        } else {
            resultDiv.style.display = "block";
            resultDiv.innerHTML = "<p>Tracking system offline.</p>";
            return;
        }

        const order = orders.find(o => o.id === code);

        resultDiv.style.display = "block";

        if (!order) {
            orderIdEl.textContent = "Order not found.";
            timelineEl.innerHTML = "";
            detailsDiv.style.display = "none";
            return;
        }

        orderIdEl.textContent = `Order: ${order.id}`;

        if (order.status === "unsuccessful") {
            timelineEl.innerHTML = `
                <div class="timeline-step active">
                    <div class="timeline-icon" style="border-color:var(--a-red); background:var(--a-red);">${ICONS.unsuccessful}</div>
                    <div class="timeline-label">Order Unsuccessful</div>
                </div>
            `;
            detailsDiv.style.display = "block";
            detailsDiv.innerHTML = `<strong>Status:</strong> Unsuccessful<br>There was an issue verifying your payment. Please contact support.`;
            return;
        }

        const stages = ["pending", "confirmed", "in-delivery", "success"];
        const currentIndex = stages.indexOf(order.status);

        let thirdStageLabel = order.fulfillmentMode === "pickup" ? "Ready for Pickup" : "In Delivery";
        let thirdStageIcon = order.fulfillmentMode === "pickup" ? ICONS.pickup : ICONS.indelivery;

        timelineEl.innerHTML = `
            <div class="timeline-step ${currentIndex >= 0 ? 'active' : ''}">
                <div class="timeline-icon">${ICONS.pending}</div>
                <div class="timeline-label">Order Sent</div>
            </div>
            <div class="timeline-step ${currentIndex >= 1 ? 'active' : ''}">
                <div class="timeline-icon">${ICONS.confirmed}</div>
                <div class="timeline-label">Confirmed</div>
            </div>
            <div class="timeline-step ${currentIndex >= 2 ? 'active' : ''}">
                <div class="timeline-icon">${thirdStageIcon}</div>
                <div class="timeline-label">${thirdStageLabel}</div>
            </div>
            <div class="timeline-step ${currentIndex >= 3 ? 'active' : ''}">
                <div class="timeline-icon">${ICONS.success}</div>
                <div class="timeline-label">Completed</div>
            </div>
        `;

        if (currentIndex >= 2) {
            detailsDiv.style.display = "block";
            if (order.fulfillmentMode === "pickup") {
                // Find PIC details from delivery modes
                let picName = "N/A";
                let picContact = "N/A";
                if (window.AdminData && window.AdminData.DELIVERY_MODES) {
                    const mode = window.AdminData.DELIVERY_MODES.find(m => m.type === "pickup" && m.label.includes(order.pickupLocation));
                    if (mode) {
                        picName = mode.picName || "N/A";
                        picContact = mode.picContact || "N/A";
                    }
                }
                detailsDiv.innerHTML = `<strong>Ready for Pickup at:</strong> ${order.pickupLocation}<br><strong>Person In Charge:</strong> ${picName} (${picContact})`;
            } else {
                detailsDiv.innerHTML = `<strong>Delivery Status:</strong> On the way.<br><strong>Tracking Number:</strong> ${order.trackingNumber || 'Pending Courier Update'}<br><a href="#" style="color:var(--a-blue); text-decoration:underline; font-weight:bold;">Track on Courier Website</a>`;
            }
        } else {
            detailsDiv.style.display = "none";
        }
    });
});
