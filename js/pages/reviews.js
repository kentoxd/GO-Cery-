App.ready().then(async () => {
  await Components.initLayout('');

  const grid = DOM.$('#reviews-grid');
  if (!grid) return;

  const [reviewsSnap, productsResult] = await Promise.all([
    FirebaseApp.collections.reviews().get(),
    API.catalog.getProducts()
  ]);
  const products = new Map(productsResult.data.map(product => [product.id, product]));
  const reviews = reviewsSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  if (!reviews.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state__icon">★</div><h2>No reviews yet</h2><p>Be the first to review a product.</p></div>';
    return;
  }

  grid.innerHTML = reviews.map(review => {
    const product = products.get(review.productId);
    return `<article class="review-card reviews-page__card">
      <div class="reviews-page__product">
        ${product?.imageUrl
          ? `<img src="${DOM.escapeHtml(product.imageUrl)}" alt="${DOM.escapeHtml(product.name)}">`
          : `<span>${product?.image || '🛒'}</span>`}
        <div>
          <strong>${DOM.escapeHtml(product?.name || 'Product')}</strong>
          <small>${DOM.escapeHtml(product ? Format.currency(Math.min(...product.variants.map(v => v.price))) : '')}</small>
        </div>
      </div>
      <div class="review-card__header">
        <strong>${DOM.escapeHtml(review.userName || 'Customer')}</strong>
        <span class="review-card__rating" aria-label="${review.rating} out of 5 stars">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
      </div>
      <p>${DOM.escapeHtml(review.comment || '')}</p>
      <small class="reviews-page__date">${Format.date(review.date)}${review.verified ? ' · Verified Purchase' : ''}</small>
    </article>`;
  }).join('');
});
