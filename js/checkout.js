// ---------- Checkout: render order summary + save order to Supabase ----------

const checkoutItemsEl = document.getElementById('checkout-items');
const checkoutTotalEl = document.getElementById('checkout-total');
const checkoutForm = document.getElementById('checkout-form');
const submitBtn = document.getElementById('submit-order-btn');
const formError = document.getElementById('form-error');

function renderOrderSummary() {
  const cart = getCart();

  if (cart.length === 0) {
    // Nothing in cart — send back to shop instead of letting them check out empty
    window.location.href = 'shop.html';
    return;
  }

  checkoutItemsEl.innerHTML = cart.map(item => `
    <div class="checkout-line">
      <span>${item.name} × ${item.qty}</span>
      <span>$${(item.price * item.qty).toFixed(2)}</span>
    </div>
  `).join('');

  checkoutTotalEl.textContent = `$${getCartTotal().toFixed(2)}`;
}

function validateForm(formData) {
  if (!formData.name.trim()) return 'Please enter your name.';
  if (!formData.email.trim() || !formData.email.includes('@')) return 'Please enter a valid email.';
  if (!formData.address.trim()) return 'Please enter your delivery address.';
  return null;
}

checkoutForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  formError.textContent = '';

  const formData = {
    name: document.getElementById('customer-name').value,
    email: document.getElementById('customer-email').value,
    phone: document.getElementById('customer-phone').value,
    address: document.getElementById('customer-address').value,
  };

  const validationError = validateForm(formData);
  if (validationError) {
    formError.textContent = validationError;
    return;
  }

  const cart = getCart();
  const total = getCartTotal();

  submitBtn.disabled = true;
  submitBtn.textContent = 'Placing order...';

  // 1. Insert the order itself
  const { data: order, error: orderError } = await supabaseClient
    .from('orders')
    .insert({
      customer_name: formData.name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      total: total
    })
    .select()
    .single();

  if (orderError) {
    console.error('Order error:', orderError);
    formError.textContent = 'Something went wrong placing your order. Please try again.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place Order';
    return;
  }

  // 2. Insert each cart item, linked to that order
  const orderItems = cart.map(item => ({
    order_id: order.id,
    product_id: item.id,
    product_name: item.name,
    qty: item.qty,
    price_at_purchase: item.price
  }));

  const { error: itemsError } = await supabaseClient
    .from('order_items')
    .insert(orderItems);

  if (itemsError) {
    console.error('Order items error:', itemsError);
    formError.textContent = 'Order saved, but something went wrong recording your items. Please contact us.';
    submitBtn.disabled = false;
    submitBtn.textContent = 'Place Order';
    return;
  }

  // 3. Success — clear the cart and redirect to a confirmation page
  localStorage.removeItem('nexora_cart');
  window.location.href = `order-confirmation.html?order=${order.id}`;
});

renderOrderSummary();
