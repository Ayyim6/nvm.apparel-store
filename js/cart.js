// ---------- Shared cart logic (browser-side, using localStorage) ----------
// This cart lives in the browser until checkout — it does NOT touch
// Supabase yet. Only when an order is actually placed do we save
// anything to the database (that comes in a later step).

const CART_KEY = 'nexora_cart';

function getCart() {
  const raw = localStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCountDisplay();
}

function addToCart(product, qty = 1) {
  const cart = getCart();
  const existing = cart.find(item => item.id === product.id);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      qty: qty
    });
  }

  saveCart(cart);
  flashAddedToCart(product.name);
}

function removeFromCart(productId) {
  const cart = getCart().filter(item => item.id !== productId);
  saveCart(cart);
}

function updateQty(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (item) {
    item.qty = qty;
    if (item.qty <= 0) {
      return removeFromCart(productId);
    }
  }
  saveCart(cart);
}

function getCartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

function getCartItemCount() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

// Updates the little "X items" label in the nav, if present on the page
function updateCartCountDisplay() {
  const el = document.getElementById('navCartCount');
  if (el) {
    const count = getCartItemCount();
    el.textContent = `${count} item${count === 1 ? '' : 's'}`;
  }
}

// Small temporary confirmation message when something is added
function flashAddedToCart(productName) {
  const el = document.getElementById('navCartCount');
  if (!el) return;
  const original = el.textContent;
  el.textContent = 'Added ✓';
  setTimeout(() => {
    el.textContent = original;
  }, 1200);
}

// Run on every page load so the nav count is always accurate
document.addEventListener('DOMContentLoaded', updateCartCountDisplay);
