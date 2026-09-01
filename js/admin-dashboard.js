/**
 * admin-dashboard.js — dashboard tab logic
 * -----------------------------------------------------------------
 * Depends on admin-data.js (window.AdminData), Chart.js and SheetJS
 * (both loaded via CDN in admin.html).
 */
(function () {
  let ALL_ORDERS = [];
  let chart = null;
  let chartPeriod = "daily"; // 'daily' | 'monthly'
  let chartMetric = "rm"; // 'rm' | 'qty'

  // Chart.js renders text on a <canvas>, which CSS can't touch at all —
  // without this it silently falls back to its own default font (Arial/
  // Helvetica), which is why the axis numbers looked out of place next
  // to the rest of the page's Inter/Space Mono type.
  if (window.Chart) {
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = "#57544c";
  }

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
    };
  }

  function applyFilters(orders, filters) {
    return orders.filter((o) => {
      if (!withinDateRange(o.date, filters.dateRange)) return false;
      if (filters.category !== "all" && o.category !== filters.category) return false;
      if (filters.product !== "all" && o.productId !== filters.product) return false;
      if (filters.delivery !== "all" && window.AdminData.getOrderDeliveryModeId(o) !== filters.delivery) return false;
      return true;
    });
  }

  // ---------- product dropdown depends on selected category ----------
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

    // keep the previous selection if it's still valid for this category
    if (relevant.includes(currentValue)) productSelect.value = currentValue;
  }

  // "Verified" for revenue/chart purposes: anything that got past
  // pending/unsuccessful means the payment cleared.
  const VERIFIED_STATUSES = ["confirmed", "in-delivery", "success"];

  // ---------- stat cards (verified orders only) ----------
  function renderCards(filteredOrders) {
    const approved = filteredOrders.filter((o) => VERIFIED_STATUSES.includes(o.status));
    const revenue = approved.reduce((sum, o) => sum + o.total, 0);
    const profit = approved.reduce((sum, o) => sum + o.profit, 0);

    document.getElementById("cardRevenue").textContent = money(revenue);
    document.getElementById("cardOrders").textContent = approved.length;
    document.getElementById("cardProfit").textContent = money(profit);
  }

  // ---------- sales chart ----------
  function formatChartLabel(key, period, omitYear) {
    if (period === "monthly") {
      const [y, m] = key.split("-");
      const d = new Date(Number(y), Number(m) - 1, 1);
      const month = d.toLocaleDateString("en-US", { month: "short" });
      return omitYear ? month : `${month} ${y}`;
    }
    const d = new Date(key + "T00:00:00");
    const month = d.toLocaleDateString("en-US", { month: "short" });
    return omitYear ? `${month} ${d.getDate()}` : `${month} ${d.getDate()}, ${d.getFullYear()}`;
  }

  function groupForChart(approvedOrders, period, metric) {
    const buckets = {};
    approvedOrders.forEach((o) => {
      const key = period === "monthly" ? o.date.slice(0, 7) : o.date; // YYYY-MM or YYYY-MM-DD
      const value = metric === "qty" ? o.qty : o.total;
      buckets[key] = (buckets[key] || 0) + value;
    });
    const keys = Object.keys(buckets).sort();

    // Only show the year in each label when the data actually spans more
    // than one year — otherwise it's just repeated, unnecessary noise.
    const years = new Set(keys.map((k) => k.slice(0, 4)));
    const omitYear = years.size <= 1;

    return {
      labels: keys.map((k) => formatChartLabel(k, period, omitYear)),
      values: keys.map((k) => buckets[k]),
    };
  }

  function renderChart(filteredOrders) {
    const approved = filteredOrders.filter((o) => VERIFIED_STATUSES.includes(o.status));
    const { labels, values } = groupForChart(approved, chartPeriod, chartMetric);
    const ctx = document.getElementById("salesChart").getContext("2d");
    const isRM = chartMetric === "rm";

    if (chart) chart.destroy();
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels.length ? labels : ["No data"],
        datasets: [
          {
            label: isRM ? "Sales (RM)" : "Units Sold",
            data: values.length ? values : [0],
            borderColor: "#000000",
            backgroundColor: "rgba(0,0,0,0.06)",
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointBackgroundColor: "#000000",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (v) => (isRM ? "RM" + v : v),
              precision: isRM ? undefined : 0,
              font: { family: "'Space Mono', monospace" },
            },
          },
          x: { grid: { display: false } },
        },
      },
    });
  }

  // ---------- order table (all statuses, with status badge) ----------
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
          o.fulfillmentMode === "pickup" ? `Pickup — ${o.pickupLocation}` : "Delivery";
        return `
        <tr>
          <td>
            <div class="cell-primary">${o.customerName}</div>
            <div class="cell-sub">${o.id} · ${o.date}</div>
          </td>
          <td>
            <div class="cell-primary">${o.productLabel}</div>
            <div class="cell-sub">${o.variant}</div>
          </td>
          <td class="cell-price">${money(o.total)}</td>
          <td>
            <span class="delivery-tag">${DELIVERY_ICON[o.fulfillmentMode]} ${deliveryLabel}</span>
          </td>
          <td>${window.AdminData.PAYMENT_LABELS[o.paymentMethod]}</td>
          <td><span class="status-badge status-${o.status}">${window.AdminData.getStatusLabel(o, o.status)}</span></td>
        </tr>
      `;
      })
      .join("");
  }

  // ---------- export to Excel (SheetJS) ----------
  function exportToExcel(filteredOrders) {
    const rows = filteredOrders.map((o) => ({
      "Order ID": o.id,
      Date: o.date,
      Customer: o.customerName,
      Product: o.productLabel,
      Variant: o.variant,
      "Total (RM)": o.total,
      Fulfillment:
        o.fulfillmentMode === "pickup" ? "Pickup — " + o.pickupLocation : "Delivery",
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
    renderChart(filtered);
    renderTable(filtered);
  }

  document.addEventListener("DOMContentLoaded", async function () {
    ALL_ORDERS = await window.AdminData.loadOrders();

    // populate category filter
    const categorySelect = document.getElementById("filterCategory");
    categorySelect.innerHTML =
      `<option value="all">All Categories</option>` +
      Object.entries(window.AdminData.CATEGORY_LABELS)
        .map(([slug, label]) => `<option value="${slug}">${label}</option>`)
        .join("");

    // populate delivery filter — each pickup location its own option, not just a Pickup/Delivery split
    const deliverySelect = document.getElementById("filterDelivery");
    deliverySelect.innerHTML =
      `<option value="all">All Delivery Types</option>` +
      window.AdminData.DELIVERY_MODES.map((m) => `<option value="${m.id}">${m.label}</option>`).join("");

    refreshProductOptions();
    renderAll();

    ["filterDateRange", "filterDelivery"].forEach((id) => {
      document.getElementById(id).addEventListener("change", renderAll);
    });
    categorySelect.addEventListener("change", () => {
      refreshProductOptions();
      renderAll();
    });
    document.getElementById("filterProduct").addEventListener("change", renderAll);

    document.getElementById("chartDaily").addEventListener("click", () => {
      chartPeriod = "daily";
      document.getElementById("chartDaily").classList.add("active");
      document.getElementById("chartMonthly").classList.remove("active");
      renderAll();
    });
    document.getElementById("chartMonthly").addEventListener("click", () => {
      chartPeriod = "monthly";
      document.getElementById("chartMonthly").classList.add("active");
      document.getElementById("chartDaily").classList.remove("active");
      renderAll();
    });

    document.getElementById("chartMetricRM").addEventListener("click", () => {
      chartMetric = "rm";
      document.getElementById("chartMetricRM").classList.add("active");
      document.getElementById("chartMetricQty").classList.remove("active");
      renderAll();
    });
    document.getElementById("chartMetricQty").addEventListener("click", () => {
      chartMetric = "qty";
      document.getElementById("chartMetricQty").classList.add("active");
      document.getElementById("chartMetricRM").classList.remove("active");
      renderAll();
    });

    document.getElementById("exportExcelBtn").addEventListener("click", () => {
      const filtered = applyFilters(ALL_ORDERS, getFilters());
      exportToExcel(filtered);
    });
  });
})();
