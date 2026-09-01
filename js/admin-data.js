/**
 * admin-data.js — shared mock order data (Dashboard + Orders tab)
 * -----------------------------------------------------------------
 * Placeholder standing in for the real Supabase "orders" table.
 * Nothing here is wired to Supabase yet — two things need to happen
 * first: the orders table needs to actually exist, and checkout.js
 * needs to be saving to it again (it currently sends to WhatsApp
 * instead — worth resolving that before connecting these pages for
 * real).
 *
 * Status is the single source of truth for an order's stage — the
 * same 5 values a customer would eventually see on their own
 * order-status-lookup page:
 *   pending      → just submitted, awaiting manual payment check
 *   confirmed    → payment verified against the bank
 *   unsuccessful → receipt didn't match / was invalid
 *   in-delivery  → tracking number assigned, on its way
 *   success      → confirmed arrived
 * "Verified" (for revenue/profit purposes) means anything that got
 * past pending/unsuccessful — confirmed, in-delivery, and success
 * all count, since all three mean the payment cleared.
 *
 * receiptUrl points at a placeholder receipt image (images/mock-
 * receipt.png) generated for this demo — obviously not each
 * customer's real upload. trackingNumber is only set once an order
 * reaches in-delivery or success.
 *
 * profit is a placeholder too: there's no real per-product cost data
 * anywhere yet, so it's estimated here as 35% of total. Swap for a
 * real cost field once products have one.
 */
(function () {
  const PROFIT_MARGIN = 0.35;
  const MOCK_RECEIPT = "images/mock-receipt.png";

  const CATEGORY_LABELS = {
    "home-jerseys": "Home Jerseys",
    "away-jerseys": "Away Jerseys",
    "retro-kits": "Retro Kits",
    "training-wear": "Training Wear",
    "accessories": "Accessories",
  };

  const PAYMENT_LABELS = {
    qr_bank: "QR / Bank Transfer",
    tng_spay: "TNG / SPay Later",
    fpx: "FPX",
  };

  const PRODUCT_LABELS = {
    "unikl-home": "UniKL Home Jersey",
    "unikl-retro": "UniKL Retro Jersey",
  };

  const STATUS_LABELS = {
    pending: "Pending",
    confirmed: "Confirmed",
    unsuccessful: "Unsuccessful",
    "in-delivery": "In Delivery",
    success: "Success",
  };

  // Single source of truth for delivery/pickup modes — used by Add
  // Product's delivery checkboxes and by the Dashboard/Orders filter
  // dropdowns, so there's only one list to ever go out of sync.
  // "keyword" matches against an order's free-text pickupLocation
  // field; once Delivery Management exists, orders should carry this
  // id directly instead of a location string to match against.

  const DEFAULT_DELIVERY_MODES = [
    { id: "pickup-micet", type: "pickup", label: "Pickup — UniKL MICET, Alor Gajah, Melaka", title: "UniKL MICET", city: "Alor Gajah", state: "Melaka", keyword: "MICET", code: "M", picName: "", picContact: "", fee: 0 },
    { id: "pickup-mitec", type: "pickup", label: "Pickup — UniKL MITEC, Masai, Johor", title: "UniKL MITEC", city: "Masai", state: "Johor", keyword: "MITEC", code: "J", picName: "", picContact: "", fee: 1 },
    { id: "pickup-rcmp", type: "pickup", label: "Pickup — UniKL RCMP, Ipoh, Perak", title: "UniKL RCMP", city: "Ipoh", state: "Perak", keyword: "RCMP", code: "I", picName: "", picContact: "", fee: 2 },
    { id: "delivery", type: "delivery", label: "Delivery (Postage)", keyword: null, code: "D", baseFee: 7, maxQty: 10, extraFeePerQty: 1 }
  ];

  function getDeliveryModes() {
    try {
      const stored = localStorage.getItem('nvm_delivery_modes');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Error reading delivery modes from localStorage", e);
    }
    return DEFAULT_DELIVERY_MODES;
  }

  function saveDeliveryModes(modes) {
    try {
      localStorage.setItem('nvm_delivery_modes', JSON.stringify(modes));
    } catch (e) {
      console.error("Error saving delivery modes", e);
    }
  }

  const DELIVERY_MODES = getDeliveryModes();


  // Pickup orders are collected in person, verified against the PIC
  // contact managed in Delivery Management — so they never get a
  // courier tracking number, but they still pass through the same
  // "in-delivery" stage on their way to "success"; it just means
  // something different for them. Use getStatusLabel() below to show
  // the right word for it.
  function getOrderDeliveryModeId(order) {
    if (order.fulfillmentMode === "delivery") return "delivery";
    const mode = DELIVERY_MODES.find((m) => m.keyword && order.pickupLocation && order.pickupLocation.includes(m.keyword));
    return mode ? mode.id : "pickup-other";
  }

  // "in-delivery" is the same lifecycle stage for every order, but it
  // means something different depending on fulfillment: a courier has
  // it (delivery) vs it's sitting at the pickup point waiting for the
  // customer (pickup) — once Delivery Management exists, reaching this
  // stage on a pickup order is what should surface the PIC contact to
  // the customer on their status-lookup page and email them that it's
  // ready to collect.
  function getStatusLabel(order, statusValue) {
    if (statusValue === "in-delivery" && order.fulfillmentMode === "pickup") {
      return "Ready for Pickup";
    }
    return STATUS_LABELS[statusValue];
  }

  // id, date, customer, product, variant, total, fulfillment, pickup
  // location, payment method, status, [qty], [tracking number]
  const ORDERS = [
    o("NVM-100231", "2026-08-02", "Ahmad Faiz", "unikl-home", "Black Edition · Standard · M", 89, "pickup", "UniKL MICET - Alor Gajah, Melaka", "qr_bank", "success", 1, "JNT6620119284"),
    o("NVM-100232", "2026-08-02", "Nur Aisyah", "unikl-retro", "Blue Edition · L", 99, "delivery", null, "tng_spay", "success", 1, "JNT6620119301", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100233", "2026-08-03", "Muhammad Hakim", "unikl-home", "White Edition · Premium · L", 99, "pickup", "UniKL MITEC - Masai, Johor", "qr_bank", "success"),
    o("NVM-100234", "2026-08-04", "Siti Zulaikha", "unikl-home", "Black Edition · Standard · S", 89, "delivery", null, "qr_bank", "pending", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100235", "2026-08-05", "Farid Iskandar", "unikl-retro", "Blue Edition · M", 99, "pickup", "UniKL MICET - Alor Gajah, Melaka", "tng_spay", "success"),
    o("NVM-100236", "2026-08-06", "Nurul Huda", "unikl-home", "White Edition · Standard · XL", 89, "delivery", null, "qr_bank", "success", 2, "JNT6620119355", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100237", "2026-08-08", "Amirul Danish", "unikl-home", "Black Edition · Premium · XXL", 99, "pickup", "UniKL RCMP - Ipoh, Perak", "qr_bank", "success"),
    o("NVM-100238", "2026-08-09", "Wan Nabila", "unikl-retro", "Blue Edition · S", 99, "delivery", null, "tng_spay", "unsuccessful", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100239", "2026-08-10", "Haziq Rayyan", "unikl-home", "Black Edition · Standard · M", 89, "pickup", "UniKL MICET - Alor Gajah, Melaka", "qr_bank", "success"),
    o("NVM-100240", "2026-08-11", "Aina Sofea", "unikl-home", "White Edition · Standard · M", 89, "delivery", null, "qr_bank", "in-delivery", 1, "JNT6620119402", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100241", "2026-08-13", "Danish Adam", "unikl-retro", "Blue Edition · XL", 99, "pickup", "UniKL MITEC - Masai, Johor", "tng_spay", "success", 3),
    o("NVM-100242", "2026-08-14", "Puteri Alya", "unikl-home", "Black Edition · Premium · L", 99, "delivery", null, "qr_bank", "pending", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100243", "2026-08-15", "Irfan Hadi", "unikl-home", "White Edition · Standard · S", 89, "pickup", "UniKL RCMP - Ipoh, Perak", "qr_bank", "confirmed"),
    o("NVM-100244", "2026-08-16", "Nabila Iman", "unikl-retro", "Blue Edition · M", 99, "delivery", null, "tng_spay", "in-delivery", 1, "JNT6620119458", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100245", "2026-08-18", "Zulkarnain Haziq", "unikl-home", "Black Edition · Standard · XL", 89, "pickup", "UniKL MICET - Alor Gajah, Melaka", "qr_bank", "confirmed", 2),
    o("NVM-100246", "2026-08-19", "Farah Diyana", "unikl-home", "White Edition · Premium · M", 99, "delivery", null, "qr_bank", "confirmed", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100247", "2026-08-21", "Idris Firdaus", "unikl-retro", "Blue Edition · L", 99, "pickup", "UniKL MITEC - Masai, Johor", "tng_spay", "unsuccessful"),
    o("NVM-100248", "2026-08-22", "Batrisyia Rania", "unikl-home", "Black Edition · Standard · M", 89, "delivery", null, "qr_bank", "confirmed", 2, "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100249", "2026-08-24", "Adam Haziq", "unikl-home", "White Edition · Standard · L", 89, "pickup", "UniKL RCMP - Ipoh, Perak", "qr_bank", "pending"),
    o("NVM-100250", "2026-08-25", "Sofia Mikhayla", "unikl-retro", "Blue Edition · S", 99, "delivery", null, "tng_spay", "confirmed", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100251", "2026-08-26", "Rayyan Zafri", "unikl-home", "Black Edition · Premium · XL", 99, "pickup", "UniKL MICET - Alor Gajah, Melaka", "qr_bank", "confirmed", 3),
    o("NVM-100252", "2026-08-27", "Qistina Aleesya", "unikl-home", "White Edition · Standard · M", 89, "delivery", null, "qr_bank", "pending", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
    o("NVM-100253", "2026-08-28", "Haiqal Rusydi", "unikl-retro", "Blue Edition · M", 99, "pickup", "UniKL MITEC - Masai, Johor", "tng_spay", "confirmed", 2),
    o("NVM-100254", "2026-08-29", "Nur Ellisya", "unikl-home", "Black Edition · Standard · S", 89, "delivery", null, "qr_bank", "pending", "123 Jalan Contoh, Bandar Baru, 43000, Kajang, Selangor"),
  ];

  function o(id, date, customerName, productId, variant, total, fulfillmentMode, pickupLocation, paymentMethod, status, qty, trackingNumber, deliveryAddress) {
    return {
      id,
      date,
      customerName,
      productId,
      productLabel: PRODUCT_LABELS[productId],
      category: productId === "unikl-retro" ? "retro-kits" : "home-jerseys",
      variant,
      total,
      profit: Math.round(total * PROFIT_MARGIN * 100) / 100,
      qty: qty || 1,
      fulfillmentMode,
      pickupLocation,
      paymentMethod,
      status,
      receiptUrl: MOCK_RECEIPT,
      trackingNumber: trackingNumber || null,
      deliveryAddress: deliveryAddress || null,
    };
  }

  async function loadOrders() {
    // swap for a real supabaseClient.from('orders').select('*') once
    // that table exists and checkout.js is actually writing to it
    return ORDERS;
  }

  window.AdminData = {
    loadOrders,
    CATEGORY_LABELS,
    PAYMENT_LABELS,
    PRODUCT_LABELS,
    STATUS_LABELS,
    DELIVERY_MODES,
    getOrderDeliveryModeId,
    getStatusLabel,
  };
})();
