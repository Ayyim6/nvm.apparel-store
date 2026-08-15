// ---------- Landing page interactions ----------

// Like button toggle
const likeBtn = document.getElementById('likeBtn');
if (likeBtn) {
  likeBtn.addEventListener('click', () => {
    likeBtn.classList.toggle('liked');
  });
}

// Add to cart button feedback (visual only for now — real cart logic comes later)
const cartBtn = document.getElementById('addToCartBtn');
if (cartBtn) {
  const cartLabel = document.getElementById('cartBtnLabel');
  const originalLabel = cartLabel.textContent;
  cartBtn.addEventListener('click', () => {
    cartLabel.textContent = 'Added ✓';
    cartBtn.style.background = '#2f8f5b';
    setTimeout(() => {
      cartLabel.textContent = originalLabel;
      cartBtn.style.background = '';
    }, 1400);
  });
}

// Explore Now smooth scroll
const exploreBtn = document.getElementById('exploreBtn');
if (exploreBtn) {
  exploreBtn.addEventListener('click', () => {
    document.querySelector('.lower-strip').scrollIntoView({ behavior: 'smooth' });
  });
}
