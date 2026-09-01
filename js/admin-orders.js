/**
 * admin-orders.js — Orders tab logic
 * -----------------------------------------------------------------
 * Depends on admin-data.js (window.AdminData) and SheetJS (loaded in
 * admin-orders.html).
 *
 * Status changes are applied directly to the in-memory order objects
 * from AdminData.loadOrders() (returned by reference), so they stick
 * for the rest of this session — but reset on page reload since
 * nothing here writes to a real database yet.
 *
 * "Confirmed" and "Unsuccessful" are meant to trigger a real email to
 * the customer (invoice, or a payment-issue notice). That can't
 * actually happen from client-side JS — it needs the Edge Function +
 * email service piece discussed earlier, not built yet. What DOES
 * happen here is honest about that: a toast confirms what *would* be
 * sent, without pretending an email went out.
 */
(function () {
  let ALL_ORDERS = [];
  let pendingTrackingOrderId = null; // order awaiting a tracking number before it can move to in-delivery

  function money(n) {
    return "RM" + (Math.round(n * 100) / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function withinDateRange(dateStr, range) {
    if (range === "all") return true;
    const date = new Date(dateStr);
    const now = new Date();
    const days = { today: 1, "7days": 7, "30days": 30 }[range];
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);
    return date >= cutoff && date <= now;
  }

  function getFilters() {
    return {
      dateRange: document.getElementById("filterDateRange").value,
      category: document.getElementById("filterCategory").value,
      product: document.getElementById("filterProduct").value,
      delivery: document.getElementById("filterDelivery").value,
      status: document.getElementById("filterStatus").value,
    };
  }

  function applyFilters(orders, filters) {
    return orders.filter((o) => {
      if (!withinDateRange(o.date, filters.dateRange)) return false;
      if (filters.category !== "all" && o.category !== filters.category) return false;
      if (filters.product !== "all" && o.productId !== filters.product) return false;
      if (filters.delivery !== "all" && window.AdminData.getOrderDeliveryModeId(o) !== filters.delivery) return false;
      if (filters.status !== "all" && o.status !== filters.status) return false;
      return true;
    });
  }

  function refreshProductOptions() {
    const categorySelect = document.getElementById("filterCategory");
    const productSelect = document.getElementById("filterProduct");
    const selectedCategory = categorySelect.value;

    const productIds = Array.from(new Set(ALL_ORDERS.map((o) => o.productId)));
    const relevant = productIds.filter(
      (id) => selectedCategory === "all" || ALL_ORDERS.find((o) => o.productId === id).category === selectedCategory
    );

    const currentValue = productSelect.value;
    productSelect.innerHTML =
      `<option value="all">All Products</option>` +
      relevant.map((id) => `<option value="${id}">${window.AdminData.PRODUCT_LABELS[id]}</option>`).join("");
    if (relevant.includes(currentValue)) productSelect.value = currentValue;
  }

  // ---------- cards ----------
  function renderCards(filteredOrders) {
    document.getElementById("cardTotalOrders").textContent = filteredOrders.length;
    document.getElementById("cardPickupOrders").textContent = filteredOrders.filter((o) => o.fulfillmentMode === "pickup").length;
    document.getElementById("cardDeliveryOrders").textContent = filteredOrders.filter((o) => o.fulfillmentMode === "delivery").length;
  }

  // ---------- table ----------
  const DELIVERY_ICON = {
    pickup: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`,
    delivery: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="7" width="14" height="10"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="18" cy="19" r="1.6"/></svg>`,
  };

  function renderTable(filteredOrders) {
    const tbody = document.getElementById("ordersTableBody");
    const emptyState = document.getElementById("ordersEmptyState");
    const sorted = filteredOrders.slice().sort((a, b) => (a.date < b.date ? 1 : -1));

    if (!sorted.length) {
      tbody.innerHTML = "";
      emptyState.style.display = "block";
      return;
    }
    emptyState.style.display = "none";

    tbody.innerHTML = sorted
      .map((o) => {
        const deliveryLabel =
          o.fulfillmentMode === "pickup"
            ? `Pickup — ${o.pickupLocation}`
            : o.trackingNumber
            ? `Delivery — ${o.trackingNumber}`
            : "Delivery";

        // "in-delivery" applies to every order, but reads as "Ready for
        // Pickup" for pickup orders — same stage, different meaning
        const statusOptions = Object.entries(window.AdminData.STATUS_LABELS)
          .map(
            ([value, _label]) =>
              `<option value="${value}" ${o.status === value ? "selected" : ""}>${window.AdminData.getStatusLabel(o, value)}</option>`
          )
          .join("");

        return `
        <tr>
          <td>
            <div class="cell-primary">${o.customerName}</div>
            <div class="cell-sub">${o.id} · ${o.date}</div>
          </td>
          <td>
            <div class="cell-primary">${o.productLabel}</div>
            <div class="cell-sub">${o.variant}${o.qty > 1 ? ` · Qty ${o.qty}` : ""}</div>
          </td>
          <td class="cell-price">${money(o.total)}</td>
          <td>
            <span class="delivery-tag">${DELIVERY_ICON[o.fulfillmentMode]} ${deliveryLabel}</span>
            ${o.fulfillmentMode === 'delivery' && o.deliveryAddress ? `<div class="cell-sub" style="margin-top: 6px; line-height: 1.4;">${o.deliveryAddress}</div>` : ''}
          </td>
          <td>${window.AdminData.PAYMENT_LABELS[o.paymentMethod]}</td>
          <td>
            <button type="button" class="receipt-thumb-btn" data-view-receipt="${o.id}">
              <img src="${o.receiptUrl}" alt="Receipt thumbnail">
              View
            </button>
          </td>
          <td>
            <select class="status-select status-${o.status}" data-order-id="${o.id}">
              ${statusOptions}
            </select>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  // ---------- receipt modal ----------
  function wireReceiptModal() {
    const overlay = document.getElementById("receiptModalOverlay");
    const img = document.getElementById("receiptModalImage");

    document.getElementById("ordersTableBody").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view-receipt]");
      if (!btn) return;
      const order = ALL_ORDERS.find((o) => o.id === btn.dataset.viewReceipt);
      img.src = order.receiptUrl;
      overlay.classList.add("open");
    });

    document.getElementById("receiptModalClose").addEventListener("click", () => overlay.classList.remove("open"));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  }

  // ---------- tracking number modal (gate for "in-delivery") ----------
  function wireTrackingModal() {
    const overlay = document.getElementById("trackingModalOverlay");
    const input = document.getElementById("trackingNumberInput");

    function close(revert) {
      overlay.classList.remove("open");
      if (revert && pendingTrackingOrderId) {
        // put the dropdown back to whatever it was before the user picked "In Delivery"
        renderAll();
      }
      pendingTrackingOrderId = null;
      input.value = "";
    }

    document.getElementById("trackingModalClose").addEventListener("click", () => close(true));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close(true);
    });

    document.getElementById("trackingModalConfirm").addEventListener("click", () => {
      if (!input.value.trim()) {
        input.focus();
        return;
      }
      const order = ALL_ORDERS.find((o) => o.id === pendingTrackingOrderId);
      order.trackingNumber = input.value.trim();
      order.status = "in-delivery";
      showToast(`${order.customerName}'s order is now In Delivery — tracking ${order.trackingNumber}.`);
      overlay.classList.remove("open");
      pendingTrackingOrderId = null;
      input.value = "";
      renderAll();
    });
  }

  // ---------- status changes ----------
  function wireStatusChanges() {
    document.getElementById("ordersTableBody").addEventListener("change", (e) => {
      if (!e.target.classList.contains("status-select")) return;
      const orderId = e.target.dataset.orderId;
      const order = ALL_ORDERS.find((o) => o.id === orderId);
      const newStatus = e.target.value;

      // only courier deliveries need a tracking number — pickup orders
      // reaching this same stage go straight to "Ready for Pickup"
      if (newStatus === "in-delivery" && order.fulfillmentMode === "delivery" && !order.trackingNumber) {
        pendingTrackingOrderId = orderId;
        document.getElementById("trackingModalOverlay").classList.add("open");
        document.getElementById("trackingNumberInput").focus();
        return; // don't apply yet — wait for the modal
      }

      order.status = newStatus;

      if (newStatus === "confirmed") {
        showToast(`Invoice generated for ${order.customerName} (${order.id}) — email would be sent once email delivery is wired up.`);
      } else if (newStatus === "unsuccessful") {
        showToast(`${order.customerName} would be notified by email that their payment couldn't be verified.`);
      } else if (newStatus === "in-delivery" && order.fulfillmentMode === "pickup") {
        showToast(`${order.customerName} would be emailed that their order is ready for pickup, with the PIC contact — once Delivery Management is set up.`);
      } else if (newStatus === "success") {
        showToast(`${order.customerName}'s order marked as delivered successfully.`);
      } else {
        showToast(`${order.customerName}'s order set to ${window.AdminData.getStatusLabel(order, newStatus)}.`);
      }

      renderAll();
    });
  }

  // ---------- toast ----------
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById("adminToast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 4000);
  }

  // ---------- export to Excel ----------
  function exportToExcel(filteredOrders) {
    const rows = filteredOrders.map((o) => ({
      "Order Code": o.id,
      Date: o.date,
      Customer: o.customerName,
      Product: o.productLabel,
      Variant: o.variant,
      Qty: o.qty,
      "Total (RM)": o.total,
      Fulfillment:
        o.fulfillmentMode === "pickup" ? "Pickup — " + o.pickupLocation : "Delivery",
      "Delivery Address": o.deliveryAddress || "",
      "Tracking Number": o.trackingNumber || "",
      "Payment Method": window.AdminData.PAYMENT_LABELS[o.paymentMethod],
      Status: window.AdminData.getStatusLabel(o, o.status),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Orders");
    const dateStamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `nvm-store-orders-${dateStamp}.xlsx`);
  }

  // ---------- wire it all together ----------
  function renderAll() {
    const filters = getFilters();
    const filtered = applyFilters(ALL_ORDERS, filters);
    renderCards(filtered);
    renderTable(filtered);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    ALL_ORDERS = await window.AdminData.loadOrders();

    const categorySelect = document.getElementById("filterCategory");
    categorySelect.innerHTML =
      `<option value="all">All Categories</option>` +
      Object.entries(window.AdminData.CATEGORY_LABELS)
        .map(([slug, label]) => `<option value="${slug}">${label}</option>`)
        .join("");

    const deliverySelect = document.getElementById("filterDelivery");
    deliverySelect.innerHTML =
      `<option value="all">All Delivery Types</option>` +
      window.AdminData.DELIVERY_MODES.map((m) => `<option value="${m.id}">${m.label}</option>`).join("");

    refreshProductOptions();
    renderAll();
    wireReceiptModal();
    wireTrackingModal();
    wireStatusChanges();

    ["filterDateRange", "filterDelivery", "filterStatus"].forEach((id) => {
      document.getElementById(id).addEventListener("change", renderAll);
    });
    categorySelect.addEventListener("change", () => {
      refreshProductOptions();
      renderAll();
    });
    document.getElementById("filterProduct").addEventListener("change", renderAll);

    document.getElementById("exportExcelBtn").addEventListener("click", () => {
      exportToExcel(applyFilters(ALL_ORDERS, getFilters()));
    });
  });
})();
