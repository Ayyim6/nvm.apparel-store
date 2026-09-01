/**
 * admin-sidebar.js — shared sidebar, injected into every admin page
 * -----------------------------------------------------------------
 * Single source of truth for the sidebar nav. Each admin page just
 * needs `<aside class="admin-sidebar" id="adminSidebarMount"></aside>`
 * and this script — the "active" tab is worked out automatically from
 * the current filename, so no page has to remember to set it, and
 * there's nowhere for the tabs to drift out of sync with each other.
 */
(function () {
  const NAV_ITEMS = [
    {
      href: "admin.html",
      label: "Dashboard",
      icon: `<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>`,
    },
    {
      href: "admin-product-addition.html",
      label: "Add Product",
      icon: `<path d="M12 5v14M5 12h14"/>`,
    },
    {
      label: "Inventory",
      soon: true,
      icon: `<path d="M3 7l9-4 9 4-9 4-9-4z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>`,
    },
    {
      label: "Product Management",
      soon: true,
      icon: `<path d="M4 4h16v4H4z"/><path d="M4 8v12h16V8"/><path d="M9 12h6"/>`,
    },
    {
      label: "Delivery Management",
      soon: true,
      icon: `<rect x="1" y="7" width="14" height="10"/><path d="M15 10h4l3 3v4h-7z"/><circle cx="6" cy="19" r="1.6"/><circle cx="18" cy="19" r="1.6"/>`,
    },
    {
      href: "admin-orders.html",
      label: "Orders",
      icon: `<path d="M5 3h11l3 3v15H5z"/><path d="M9 9h6M9 13h6M9 17h3"/><circle cx="17" cy="16" r="4" fill="#0b0b0c"/><path d="M15.5 16l1 1 2-2" stroke="#fff"/>`,
    },
    {
      label: "Customer",
      soon: true,
      icon: `<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>`,
    },
  ];

  function currentPage() {
    return window.location.pathname.split("/").pop() || "admin.html";
  }

  function render() {
    const mount = document.getElementById("adminSidebarMount");
    if (!mount) return;

    const page = currentPage();
    const itemsHtml = NAV_ITEMS.map((item) => {
      const isActive = item.href === page;
      const tag = item.href ? "a" : "span";
      const hrefAttr = item.href ? `href="${item.href}"` : "";
      return `
        <${tag} class="admin-nav-item${isActive ? " active" : ""}" ${hrefAttr}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${item.icon}</svg>
          ${item.label}
          ${item.soon ? '<span class="soon">Soon</span>' : ""}
        </${tag}>
      `;
    }).join("");

    mount.innerHTML = `
      <div class="admin-logo">
        <div class="admin-logo-icon">N</div>
        <span class="admin-logo-text">NVM Admin</span>
      </div>
      ${itemsHtml}
      <div class="admin-sidebar-foot">
        NVM Store Admin<br>Uses placeholder data — not yet connected to Supabase.
      </div>
    `;
  }

  document.addEventListener("DOMContentLoaded", render);
})();
