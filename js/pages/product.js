App.ready().then(async () => {
  await Components.initLayout('shop');

  const params = DOM.getQueryParams();
  const productId = params.id;
  if (!productId) { window.location.href = 'shop.html'; return; }

  const result = await API.catalog.getProduct(productId);
  if (!result.success) {
    DOM.$('#product-detail').innerHTML = '<div class="empty-state"><h3>Product not found</h3></div>';
    return;
  }

  const product = result.data;
  let selectedVariant = product.variants.find(v => v.stock > 0) || product.variants[0];
  let quantity = 1;

  const reviewsResult = await API.reviews.getByProduct(productId);
  const reviews = reviewsResult.data;
  const avgRating = await API.reviews.getAverageRating(productId);
  const category = CONFIG.categories.find(c => c.id === product.categoryId);

  function render() {
    const el = DOM.$('#product-detail');
    el.innerHTML = `
      <div class="product-detail__image">${product.imageUrl
        ? `<img src="${DOM.escapeHtml(product.imageUrl)}" alt="${DOM.escapeHtml(product.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px" onerror="this.style.display='none'">`
        : product.image}</div>
      <div class="product-detail__info">
        <span class="product-card__category">${category ? category.icon + ' ' + category.name : ''}</span>
        <h1>${DOM.escapeHtml(product.name)}</h1>
        <div class="product-detail__meta">
          ${avgRating > 0 ? `<span class="product-card__rating">${'★'.repeat(Math.round(avgRating))} ${avgRating.toFixed(1)} (${reviews.length} reviews)</span> · ` : ''}
          Origin: ${DOM.escapeHtml(product.origin)}
        </div>
        <p>${DOM.escapeHtml(product.description)}</p>
        <div class="product-detail__price" id="detail-price">${Format.currency(selectedVariant.price)}</div>
        <small style="color:var(--color-text-muted)">${Format.unitLabel(selectedVariant.unit)}</small>

        <div class="variant-selector" id="variant-selector">
          ${product.variants.map(v => `
            <button class="variant-btn ${v.id === selectedVariant.id ? 'active' : ''} ${v.stock <= 0 ? 'disabled' : ''}"
              data-id="${v.id}" ${v.stock <= 0 ? 'disabled' : ''}>
              ${Format.unitLabel(v.unit)} – ${Format.currency(v.price)}
            </button>
          `).join('')}
        </div>

        <p class="stock-status ${selectedVariant.stock > 0 ? 'stock-status--in' : 'stock-status--out'}">
          ${selectedVariant.stock > 0 ? `✅ In Stock (${selectedVariant.stock} available)` : '❌ Sold Out'}
        </p>

        <div class="product-actions">
          <div class="qty-stepper">
            <button id="qty-minus">−</button>
            <input type="number" id="qty-input" value="${quantity}" min="1" max="${selectedVariant.stock}" readonly>
            <button id="qty-plus">+</button>
          </div>
          <button class="btn btn--primary btn--lg" id="add-to-cart" ${selectedVariant.stock <= 0 ? 'disabled' : ''}>Add to Cart</button>
        </div>
      </div>`;

    DOM.$('#variant-selector').addEventListener('click', e => {
      const btn = e.target.closest('.variant-btn');
      if (!btn || btn.disabled) return;
      selectedVariant = product.variants.find(v => v.id === btn.dataset.id);
      quantity = 1;
      render();
    });

    DOM.$('#qty-minus').addEventListener('click', () => {
      if (quantity > 1) { quantity--; DOM.$('#qty-input').value = quantity; }
    });
    DOM.$('#qty-plus').addEventListener('click', () => {
      if (quantity < selectedVariant.stock) { quantity++; DOM.$('#qty-input').value = quantity; }
    });

    DOM.$('#add-to-cart').addEventListener('click', async () => {
      const user = API.user.getCurrent();
      await API.cart.add(user?.id || null, product.id, selectedVariant.id, quantity);
      Components.toast(`Added ${quantity}x ${product.name} to cart!`);
      Components.updateCartBadge();
    });
  }

  render();

  const reviewsEl = DOM.$('#reviews-list');
  if (reviewsEl) {
    reviewsEl.innerHTML = reviews.length
      ? reviews.map(r => `
          <div class="review-card">
            <div class="review-card__header">
              <strong>${DOM.escapeHtml(r.userName)}</strong>
              <span class="review-card__rating">${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)}</span>
            </div>
            <p>${DOM.escapeHtml(r.comment)}</p>
            <small style="color:var(--color-text-muted)">${Format.date(r.date)}${r.verified ? ' · Verified Purchase' : ''}</small>
          </div>
        `).join('')
      : '<p style="color:var(--color-text-muted)">No reviews yet. Be the first!</p>';
  }

  const user = API.user.getCurrent();
  const reviewForm = DOM.$('#review-form');
  if (reviewForm && user) {
    reviewForm.hidden = false;
    reviewForm.addEventListener('submit', async e => {
      e.preventDefault();
      const rating = parseInt(DOM.$('#review-rating').value, 10);
      const comment = DOM.$('#review-comment').value.trim();
      if (!rating || !comment) return;
      const result = await API.reviews.add({
        productId,
        userId: user.id,
        userName: user.name,
        rating,
        comment
      });
      if (result.success) {
        Components.toast('Review submitted');
        reviewForm.reset();
        reviewForm.hidden = true;
      } else {
        DOM.$('#review-error').textContent = result.error || 'Could not submit review.';
      }
    });
  }

  const relatedEl = DOM.$('#related-products');
  if (relatedEl) {
    const { data: all } = await API.catalog.getProducts({ categoryId: product.categoryId });
    const related = all.filter(p => p.id !== product.id).slice(0, 4);
    relatedEl.innerHTML = await Components.productCardsHtml(related, { showAdd: true });
  }
});
