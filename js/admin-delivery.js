(function () {
  let deliveryModes = [];

  function loadModes() {
    deliveryModes = window.AdminData.DELIVERY_MODES.slice();
    renderPickups();
    renderDeliverySettings();
  }

  function renderPickups() {
    const pickups = deliveryModes.filter(m => m.type === "pickup");
    const container = document.getElementById("pickupList");
    container.innerHTML = pickups.map(p => `
      <div class="repeater-item" data-id="${p.id}">
        <div class="repeater-item-head">
          <span class="tag">Pickup Location</span>
          <button type="button" class="remove-btn" data-remove-pickup="${p.id}">Remove</button>
        </div>
        <div class="repeater-row" style="grid-template-columns: 2fr 1fr 1fr;">
          <div>
            <label>Place Title</label>
            <input type="text" class="p-title" value="${p.title || ''}" placeholder="e.g. UniKL MITEC" required>
          </div>
          <div>
            <label>City</label>
            <input type="text" class="p-city" value="${p.city || ''}" placeholder="e.g. Masai" required>
          </div>
          <div>
            <label>State</label>
            <input type="text" class="p-state" value="${p.state || ''}" placeholder="e.g. Johor" required>
          </div>
        </div>
        <div class="repeater-row" style="grid-template-columns: 1fr 1fr 1fr 1fr;">
          <div>
            <label>Acronym Letter</label>
            <input type="text" class="p-code" value="${p.code || ''}" maxlength="1" placeholder="e.g. J" required>
          </div>
          <div>
            <label>PIC Name</label>
            <input type="text" class="p-picname" value="${p.picName || ''}" placeholder="e.g. Ali">
          </div>
          <div>
            <label>PIC Contact</label>
            <input type="text" class="p-piccontact" value="${p.picContact || ''}" placeholder="e.g. 0123456789">
          </div>
          <div>
            <label>Base Fee (RM)</label>
            <input type="number" class="p-fee" step="0.01" value="${p.fee || 0}" min="0">
          </div>
        </div>
      </div>
    `).join("");
  }

  function renderDeliverySettings() {
    const delivery = deliveryModes.find(m => m.type === "delivery");
    if (delivery) {
      document.getElementById("delBaseFee").value = delivery.baseFee || 7;
      document.getElementById("delMaxQty").value = delivery.maxQty || 10;
      document.getElementById("delExtraFee").value = delivery.extraFeePerQty || 1;
    }
  }

  function generateId() {
    return 'pickup-' + Math.random().toString(36).substr(2, 9);
  }

  document.getElementById("addPickupBtn").addEventListener("click", () => {
    deliveryModes.push({
      id: generateId(),
      type: "pickup",
      label: "",
      title: "",
      city: "",
      state: "",
      keyword: "",
      code: "",
      picName: "",
      picContact: "",
      fee: 0
    });
    renderPickups();
  });

  document.getElementById("pickupList").addEventListener("click", (e) => {
    if (e.target.dataset.removePickup) {
      const id = e.target.dataset.removePickup;
      deliveryModes = deliveryModes.filter(m => m.id !== id);
      renderPickups();
    }
  });

  function saveSettings() {
    // Collect pickups
    const newPickups = [];
    document.querySelectorAll("#pickupList .repeater-item").forEach(el => {
      const id = el.dataset.id;
      const title = el.querySelector(".p-title").value.trim();
      const city = el.querySelector(".p-city").value.trim();
      const state = el.querySelector(".p-state").value.trim();
      const label = `Pickup — ${title}, ${city}, ${state}`;
      newPickups.push({
        id: id,
        type: "pickup",
        title: title,
        city: city,
        state: state,
        label: label,
        keyword: title.split(" ")[1] || title,
        code: el.querySelector(".p-code").value.trim().toUpperCase(),
        picName: el.querySelector(".p-picname").value.trim(),
        picContact: el.querySelector(".p-piccontact").value.trim(),
        fee: Number(el.querySelector(".p-fee").value) || 0
      });
    });

    // Collect delivery
    const baseFee = Number(document.getElementById("delBaseFee").value) || 0;
    const maxQty = Number(document.getElementById("delMaxQty").value) || 1;
    const extraFee = Number(document.getElementById("delExtraFee").value) || 0;
    
    let existingDelivery = deliveryModes.find(m => m.type === "delivery");
    if (!existingDelivery) {
        existingDelivery = { id: "delivery", type: "delivery", label: "Delivery (Postage)", keyword: null, code: "D" };
    }
    existingDelivery.baseFee = baseFee;
    existingDelivery.maxQty = maxQty;
    existingDelivery.extraFeePerQty = extraFee;

    const finalModes = [...newPickups, existingDelivery];
    
    try {
      localStorage.setItem('nvm_delivery_modes', JSON.stringify(finalModes));
      // Update the shared object in memory for this session
      window.AdminData.DELIVERY_MODES.length = 0;
      window.AdminData.DELIVERY_MODES.push(...finalModes);
      showToast("Delivery settings saved successfully.");
    } catch(e) {
      showToast("Error saving settings.");
      console.error(e);
    }
  }

  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById("adminToast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
  }

  document.getElementById("saveDeliverySettingsBtn").addEventListener("click", saveSettings);

  document.addEventListener("DOMContentLoaded", loadModes);
})();
