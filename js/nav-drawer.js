/**
 * nav-drawer.js — mobile nav menu (hamburger → slide-out drawer)
 * -----------------------------------------------------------------
 * Only relevant below the mobile breakpoint (see the .menu-btn /
 * .pill-nav display rules in the max-width:980px media query) — on
 * desktop the pill-nav bar shows normally and this drawer stays
 * unused, hidden and unopened.
 *
 * Rather than hardcoding a second copy of the nav links, this reads
 * whatever's already inside the page's .pill-nav (so it always
 * matches — same links, same "active" page highlighted) and clones
 * it into a slide-out panel. Edit the nav once, in the visible
 * .pill-nav markup, and the drawer stays in sync automatically.
 */
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const menuBtn = document.getElementById("menuToggleBtn");
    const pillNav = document.querySelector(".pill-nav-wrap .pill-nav");
    if (!menuBtn || !pillNav) return;

    const overlay = document.createElement("div");
    overlay.className = "nav-overlay";

    const drawer = document.createElement("aside");
    drawer.className = "nav-drawer";
    drawer.setAttribute("aria-hidden", "true");

    const linksClone = pillNav.cloneNode(true);
    linksClone.removeAttribute("class");
    linksClone.classList.add("nav-drawer-links");

    drawer.innerHTML = `
      <div class="nav-drawer-header">
        <span class="nav-drawer-title">Menu</span>
        <button type="button" class="nav-drawer-close" aria-label="Close menu">✕</button>
      </div>
    `;
    drawer.appendChild(linksClone);

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    const closeBtn = drawer.querySelector(".nav-drawer-close");

    function open() {
      overlay.classList.add("open");
      drawer.classList.add("open");
      drawer.setAttribute("aria-hidden", "false");
      document.body.classList.add("nav-drawer-locked");
    }

    function close() {
      overlay.classList.remove("open");
      drawer.classList.remove("open");
      drawer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("nav-drawer-locked");
    }

    menuBtn.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", close);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    // tapping a link should navigate AND close the drawer, not leave
    // it sitting open underneath the next page's fresh load
    linksClone.addEventListener("click", (e) => {
      if (e.target.closest("a")) close();
    });
  });
})();
