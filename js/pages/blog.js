App.ready().then(async () => {
  await Components.initLayout('blog');
  DOM.$('#blog-grid').innerHTML = '<div class="skeleton skeleton--row"></div>'.repeat(3);

  const posts = await API.cms.getRecipes();
  const productsResult = await API.catalog.getProducts();
  const products = new Map(productsResult.data.map(p => [p.id, p]));

  function findVariant(ing) {
    const product = products.get(ing.productId);
    if (!product) return null;
    const variant = product.variants.find(v => v.id === ing.variantId)
      || product.variants.find(v => v.stock > 0)
      || product.variants[0];
    return { product, variant };
  }

  // Use the recipe image, else the first ingredient's product photo, else the emoji.
  function recipeImageUrl(post) {
    if (String(post.image || '').startsWith('http')) return post.image;
    for (const ing of (post.ingredients || [])) {
      const found = findVariant(ing);
      if (found && found.product.imageUrl) return found.product.imageUrl;
    }
    return '';
  }
  function recipeEmoji(post) {
    return String(post.image || '').startsWith('http') ? '🍲' : (post.image || '🍲');
  }
  function imageHtml(post, imgStyle) {
    const url = recipeImageUrl(post);
    const emoji = recipeEmoji(post);
    if (!url) return `<span class="recipe-emoji">${emoji}</span>`;
    return `<img src="${DOM.escapeHtml(url)}" alt="${DOM.escapeHtml(post.title)}" ${imgStyle ? `style="${imgStyle}"` : ''}
      onerror="this.outerHTML='<span class=&quot;recipe-emoji&quot;>${emoji}</span>'">`;
  }

  function getFavorites() {
    return Storage.get(CONFIG.storageKeys.recipeFavorites, []);
  }
  function isFavorite(id) {
    return getFavorites().includes(id);
  }
  function toggleFavorite(id) {
    const favs = getFavorites();
    const next = favs.includes(id) ? favs.filter(f => f !== id) : [...favs, id];
    Storage.set(CONFIG.storageKeys.recipeFavorites, next);
  }

  function renderFavorites() {
    const favs = getFavorites();
    const favPosts = posts.filter(p => favs.includes(p.id));
    DOM.$('#favorites-list').innerHTML = favPosts.length
      ? favPosts.map(p => `
          <li class="recipes-favorites__item">
            <button class="recipe-fav-btn recipe-fav-btn--active" data-id="${p.id}" title="Remove from favorites">♥</button>
            <a href="#" class="favorite-recipe-link" data-id="${p.id}">${DOM.escapeHtml(p.title)}</a>
          </li>`).join('')
      : '<li class="recipes-favorites__empty">Tap the heart on a recipe to save it here.</li>';

    DOM.$$('.recipes-favorites__list .recipe-fav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleFavorite(btn.dataset.id);
        renderFavorites();
        renderGrid();
      });
    });
    DOM.$$('.favorite-recipe-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        openRecipe(link.dataset.id);
      });
    });
  }

  function renderGrid() {
    DOM.$('#blog-grid').innerHTML = posts.map(p => {
      const favorited = isFavorite(p.id);
      return `
        <article class="recipe-row" data-id="${p.id}">
          <div class="recipe-row__image">${imageHtml(p)}</div>
          <div class="recipe-row__body">
            <h3 class="recipe-row__title">${DOM.escapeHtml(p.title)}</h3>
            <p class="recipe-row__excerpt">${DOM.escapeHtml(p.excerpt)}</p>
            <div class="recipe-row__actions">
              <button class="btn btn--primary btn--sm read-more" data-id="${p.id}">View Recipe</button>
              <button class="recipe-fav-btn ${favorited ? 'recipe-fav-btn--active' : ''}" data-id="${p.id}" title="${favorited ? 'Remove from favorites' : 'Save to favorites'}">${favorited ? '♥' : '♡'}</button>
            </div>
          </div>
        </article>`;
    }).join('');

    DOM.$$('.recipe-row .recipe-fav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        toggleFavorite(btn.dataset.id);
        btn.classList.toggle('recipe-fav-btn--active');
        btn.textContent = btn.classList.contains('recipe-fav-btn--active') ? '♥' : '♡';
        renderFavorites();
      });
    });
    DOM.$$('.read-more').forEach(btn => {
      btn.addEventListener('click', () => openRecipe(btn.dataset.id));
    });
  }

  function closeModal() { DOM.$('#blog-modal').innerHTML = ''; document.body.style.overflow = ''; }
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && DOM.$('#modal-overlay')) closeModal();
  });

  async function addIngredients(list, label) {
    const user = API.user.getCurrent();
    let added = 0;
    let skipped = 0;
    for (const ing of list) {
      const found = findVariant(ing);
      if (!found || found.variant.stock <= 0) { skipped++; continue; }
      await API.cart.add(user?.id || null, found.product.id, found.variant.id, ing.qty || 1);
      added++;
    }
    Components.updateCartBadge();
    if (added) {
      if (list.length > 1) Components.openMiniCart(`Ingredients for ${label}`);
      Components.toast(`Added ${added} item${added === 1 ? '' : 's'} for ${label} to your cart!` + (skipped ? ` (${skipped} out of stock)` : ''));
    } else {
      Components.toast('Those items are out of stock right now.', 'error');
    }
  }

  function openRecipe(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    const ingredients = post.ingredients || [];
    const steps = post.steps || [];
    const tips = post.tips || [];
    const orderable = ingredients.filter(i => {
      const f = findVariant(i);
      return f && f.variant.stock > 0;
    });
    const orderTotal = orderable.reduce((sum, i) => {
      const f = findVariant(i);
      return sum + f.variant.price * (i.qty || 1);
    }, 0);

    const meta = [
      post.prepTime ? `<div><small>Prep</small><strong>${DOM.escapeHtml(post.prepTime)}</strong></div>` : '',
      post.cookTime ? `<div><small>Cook</small><strong>${DOM.escapeHtml(post.cookTime)}</strong></div>` : '',
      post.servings ? `<div><small>Serves</small><strong>${DOM.escapeHtml(String(post.servings))}</strong></div>` : '',
      post.difficulty ? `<div><small>Level</small><strong>${DOM.escapeHtml(post.difficulty)}</strong></div>` : ''
    ].join('');

    DOM.$('#blog-modal').innerHTML = `
      <div class="recipe-modal" id="modal-overlay">
        <div class="recipe-modal__box" role="dialog" aria-modal="true" aria-label="${DOM.escapeHtml(post.title)}">
          <button class="recipe-modal__x" id="close-modal-x" aria-label="Close">×</button>
          <div class="recipe-modal__image">${imageHtml(post)}</div>
          <span class="blog-card__tag">${DOM.escapeHtml(post.category || 'Recipes')}</span>
          <h2>${DOM.escapeHtml(post.title)}</h2>
          <p class="blog-card__date">${post.date ? Format.date(post.date) : ''}</p>
          ${meta ? `<div class="recipe-meta">${meta}</div>` : ''}
          <p class="recipe-modal__intro">${DOM.escapeHtml(post.content || post.excerpt || '')}</p>

          ${ingredients.length ? `
            <h3>Ingredients</h3>
            <ul class="recipe-ingredients">
              ${ingredients.map((ing, idx) => {
                const f = findVariant(ing);
                const inStock = f && f.variant.stock > 0;
                return `
                <li class="recipe-ingredient">
                  <div class="recipe-ingredient__info">
                    <strong>${DOM.escapeHtml(ing.name)}</strong>
                    <small>${DOM.escapeHtml(ing.amount || '')}</small>
                  </div>
                  ${f ? `
                    <div class="recipe-ingredient__buy">
                      <small>${ing.qty > 1 ? ing.qty + ' × ' : ''}${Format.unitLabel(f.variant.unit)} · ${Format.currency(f.variant.price * (ing.qty || 1))}</small>
                      <button class="btn btn--outline btn--sm add-one" data-idx="${idx}" ${inStock ? '' : 'disabled'}>${inStock ? 'Add' : 'Sold out'}</button>
                    </div>` : '<small class="recipe-ingredient__pantry">Pantry item</small>'}
                </li>`;
              }).join('')}
            </ul>
            ${orderable.length ? `
              <button class="btn btn--primary btn--lg recipe-order-btn" id="order-all">
                🛒 Order ingredients (${orderable.length} item${orderable.length === 1 ? '' : 's'} · ${Format.currency(orderTotal)})
              </button>` : ''}
          ` : ''}

          ${steps.length ? `
            <h3>${ingredients.length ? 'Instructions' : 'Steps'}</h3>
            <ol class="recipe-steps">${steps.map(st => `<li>${DOM.escapeHtml(st)}</li>`).join('')}</ol>` : ''}

          ${tips.length ? `
            <h3>Tips</h3>
            <ul class="recipe-tips">${tips.map(t => `<li>${DOM.escapeHtml(t)}</li>`).join('')}</ul>` : ''}

          <button class="btn btn--outline" style="margin-top:1.25rem" id="close-modal">Close</button>
        </div>
      </div>`;
    document.body.style.overflow = 'hidden';

    DOM.$('#close-modal-x').focus();
    DOM.$('#close-modal').addEventListener('click', closeModal);
    DOM.$('#close-modal-x').addEventListener('click', closeModal);
    DOM.$('#modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') closeModal();
    });
    DOM.$('#order-all')?.addEventListener('click', () => addIngredients(orderable, post.title));
    DOM.$$('.add-one').forEach(btn => {
      btn.addEventListener('click', () => {
        const ing = ingredients[parseInt(btn.dataset.idx, 10)];
        addIngredients([ing], ing.name);
      });
    });
  }

  renderFavorites();
  renderGrid();
});
