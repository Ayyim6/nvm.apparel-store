(function() {
    document.addEventListener('DOMContentLoaded', () => {
        const form = document.getElementById('tracking-form');
        const input = document.getElementById('trackingCodeInput');
        const resultCard = document.getElementById('tracking-result-card');
        
        if (!form) return;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const orderId = input.value.trim().toUpperCase();
            if (!orderId) return;
            
            // Look up in localStorage first
            let orders = JSON.parse(localStorage.getItem('nvm_database_orders')) || [];
            let order = orders.find(o => o.id === orderId);
            
            if (!order) {
                // If admin-data.js is loaded, check mock data
                if (window.AdminData) {
                    window.AdminData.loadOrders().then(mockOrders => {
                        const allOrders = [...orders, ...mockOrders];
                        const foundOrder = allOrders.find(o => o.id === orderId);
                        renderResult(foundOrder, orderId);
                    });
                } else {
                    renderResult(null, orderId);
                }
            } else {
                renderResult(order, orderId);
            }
        });
        
        function renderResult(order, searchId) {
            resultCard.style.display = 'block';
            
            if (!order) {
                resultCard.innerHTML = `<h3 style="color: red;">Order Not Found</h3><p>We couldn't find an order with ID: <strong>${searchId}</strong>.</p><p>Please check the code and try again.</p>`;
                return;
            }
            
            const isPickup = order.fulfillment_mode === 'pickup' || order.fulfillmentMode === 'pickup';
            const status = order.status || 'pending';
            
            // Define stages
            const stages = ['pending', 'confirmed', 'in-delivery', 'success'];
            
            // Unsuccessful logic
            if (status === 'unsuccessful') {
                resultCard.innerHTML = `
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3>Order: ${order.id}</h3>
                        <span style="background: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 20px; font-weight: bold; font-size: 0.85rem;">Unsuccessful</span>
                    </div>
                    <p style="margin-top:15px; color:var(--ink-soft);">Your payment couldn't be verified. Please contact our support team via WhatsApp for assistance.</p>
                `;
                return;
            }
            
            let currentStageIndex = stages.indexOf(status);
            if (currentStageIndex === -1) currentStageIndex = 0;
            
            const getIcon = (index) => {
                if (index < currentStageIndex) return '✓';
                if (index === currentStageIndex) return '●';
                return '○';
            };
            
            const getClass = (index) => {
                if (index < currentStageIndex) return 'completed';
                if (index === currentStageIndex) return 'active';
                return '';
            };
            
            const thirdStageLabel = isPickup ? 'Ready for Pickup' : 'In Delivery';
            
            let detailsHtml = '';
            if (status === 'in-delivery' || status === 'success') {
                if (isPickup) {
                    const location = order.pickup_location || order.pickupLocation || 'Unknown Location';
                    detailsHtml = `
                        <div class="status-details">
                            <h4>Ready for Collection</h4>
                            <p><strong>Location:</strong> ${location}</p>
                            <p><strong>PIC Contact:</strong> <a href="https://wa.me/601111111111" target="_blank" style="text-decoration:underline;">+60 11-1111 1111</a></p>
                            <p>Please bring your ID and this Order Code for verification.</p>
                        </div>
                    `;
                } else {
                    const tracking = order.trackingNumber || 'Pending Tracking Info';
                    detailsHtml = `
                        <div class="status-details">
                            <h4>Delivery Information</h4>
                            <p><strong>Courier Tracking:</strong> ${tracking}</p>
                            <p>Track your parcel at <a href="#" style="text-decoration:underline; font-weight:bold;">PosLaju/J&T Track</a></p>
                        </div>
                    `;
                }
            } else if (status === 'confirmed') {
                 detailsHtml = `
                    <div class="status-details">
                        <h4>Payment Verified</h4>
                        <p>We are currently preparing your order.</p>
                    </div>
                `;
            } else {
                 detailsHtml = `
                    <div class="status-details">
                        <h4>Awaiting Verification</h4>
                        <p>Your order has been received and we are checking the payment.</p>
                    </div>
                `;
            }
            
            resultCard.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                    <h3>Order: ${order.id}</h3>
                    <span style="font-weight: bold; color: var(--ink-soft);">${order.date || new Date().toISOString().split('T')[0]}</span>
                </div>
                
                <div class="status-timeline">
                    <div class="status-step ${getClass(0)}">
                        <div class="step-icon">${getIcon(0)}</div>
                        <div class="step-label">Pending</div>
                    </div>
                    <div class="status-step ${getClass(1)}">
                        <div class="step-icon">${getIcon(1)}</div>
                        <div class="step-label">Confirmed</div>
                    </div>
                    <div class="status-step ${getClass(2)}">
                        <div class="step-icon">${getIcon(2)}</div>
                        <div class="step-label">${thirdStageLabel}</div>
                    </div>
                    <div class="status-step ${getClass(3)}">
                        <div class="step-icon">${getIcon(3)}</div>
                        <div class="step-label">Success</div>
                    </div>
                </div>
                
                ${detailsHtml}
            `;
        }
    });
})();
