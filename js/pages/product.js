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
    DOM.$('#product-image').innerHTML = product.imageUrl
      ? `<img src="${DOM.escapeHtml(product.imageUrl)}" alt="${DOM.escapeHtml(product.name)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px" onerror="this.style.display='none'">`
      : product.image;

    const el = DOM.$('#product-info');
    el.innerHTML = `
        <h1>${DOM.escapeHtml(product.name)}</h1>
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

  const summaryEl = DOM.$('#reviews-summary');
  if (summaryEl) {
    summaryEl.innerHTML = avgRating > 0
      ? `<span class="reviews-summary__stars">${'★'.repeat(Math.round(avgRating))}${'☆'.repeat(5 - Math.round(avgRating))}</span>
         <span class="reviews-summary__score">${avgRating.toFixed(1)}</span>
         <span class="reviews-summary__count">(${reviews.length} review${reviews.length === 1 ? '' : 's'})</span>`
      : `<span class="reviews-summary__count">No reviews yet</span>`;
  }

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
  const reviewGate = DOM.$('#review-gate');
  if (reviewForm) {
    if (!user) {
      reviewGate.innerHTML = `<p class="review-gate">Please <a href="${DOM.escapeHtml(Components._root())}pages/login.html">log in</a> to write a review.</p>`;
    } else {
      const [eligibleOrder, alreadyReviewed] = await Promise.all([
        API.reviews.getEligibleOrder(user.id, productId),
        API.reviews.hasReviewed(user.id, productId)
      ]);
      if (alreadyReviewed) {
        reviewGate.innerHTML = `<p class="review-gate">You\u2019ve already reviewed this product. Thanks for sharing your feedback!</p>`;
      } else if (!eligibleOrder) {
        reviewGate.innerHTML = `<p class="review-gate">You can review this product once it\u2019s marked <strong>Delivered</strong> on one of your orders.</p>`;
      } else {
        reviewForm.hidden = false;
      }
    }

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
        reviewGate.innerHTML = `<p class="review-gate">You\u2019ve already reviewed this product. Thanks for sharing your feedback!</p>`;
      } else {
        DOM.$('#review-error').textContent = result.error || 'Could not submit review.';
      }
    });
  }

  const relatedEl = DOM.$('#related-products');
  if (relatedEl) {
    const { data: all } = await API.catalog.getProducts({ categoryId: product.categoryId });
    const related = all.filter(p => p.id !== product.id).slice(0, 2);
    relatedEl.innerHTML = await Components.productCardsHtml(related, { showAdd: true });
  }
});
