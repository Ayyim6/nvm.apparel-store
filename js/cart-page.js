// ---------- Cart page rendering ----------

const cartContainer = document.getElementById('cart-items');
const cartTotalEl = document.getElementById('cart-total');
const cartEmptyEl = document.getElementById('cart-empty');
const checkoutBtn = document.getElementById('checkout-btn');

function renderCartPage() {
  const cart = getCart();

  if (cart.length === 0) {
    cartContainer.innerHTML = '';
    cartEmptyEl.style.display = 'block';
    checkoutBtn.disabled = true;
    cartTotalEl.textContent = '$0.00';
    return;
  }

  cartEmptyEl.style.display = 'none';
  checkoutBtn.disabled = false;

  cartContainer.innerHTML = '';

  cart.forEach(item => {
    const row = document.createElement('div');
    row.className = 'cart-row';

    const thumb = item.image_url
      ? `<img src="${item.image_url}" alt="${item.name}">`
      : `<div class="cart-thumb-placeholder"></div>`;

    row.innerHTML = `
      <div class="cart-row-thumb">${thumb}</div>
      <div class="cart-row-info">
        <h4>${item.name}</h4>
        <div class="cart-row-price">$${Number(item.price).toFixed(2)} each</div>
      </div>
      <div class="cart-row-qty">
        <button class="qty-btn" data-action="decrease" data-id="${item.id}">−</button>
        <span>${item.qty}</span>
        <button class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
      </div>
      <div class="cart-row-subtotal">$${(item.price * item.qty).toFixed(2)}</div>
      <button class="cart-row-remove" data-id="${item.id}" aria-label="Remove">✕</button>
    `;

    cartContainer.appendChild(row);
  });

  // Wire up quantity buttons
  cartContainer.querySelectorAll('.qty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const cart = getCart();
      const item = cart.find(i => i.id === id);
      if (!item) return;

      const newQty = btn.dataset.action === 'increase' ? item.qty + 1 : item.qty - 1;
      updateQty(id, newQty);
      renderCartPage();
    });
  });

  // Wire up remove buttons
  cartContainer.querySelectorAll('.cart-row-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      removeFromCart(btn.dataset.id);
      renderCartPage();
    });
  });

  cartTotalEl.textContent = `$${getCartTotal().toFixed(2)}`;
  const total2 = document.getElementById('cart-total-2');
  if (total2) total2.textContent = `$${getCartTotal().toFixed(2)}`;
}

checkoutBtn.addEventListener('click', () => {
  window.location.href = 'checkout.html';
});

renderCartPage();
