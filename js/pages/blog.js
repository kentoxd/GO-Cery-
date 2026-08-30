App.ready().then(async () => {
  await Components.initLayout('blog');

  const posts = await API.cms.getRecipes();

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
          <div class="recipe-row__image">${String(p.image || '').startsWith('http')
            ? `<img src="${DOM.escapeHtml(p.image)}" alt="${DOM.escapeHtml(p.title)}">`
            : p.image || '🍲'}</div>
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

  function openRecipe(id) {
    const post = posts.find(p => p.id === id);
    if (!post) return;
    DOM.$('#blog-modal').innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:200;display:flex;align-items:center;justify-content:center;padding:1rem" id="modal-overlay">
        <div style="background:#fff;border-radius:var(--radius-lg);padding:2rem;max-width:600px;width:100%;max-height:80vh;overflow-y:auto">
          ${String(post.image || '').startsWith('http')
            ? `<img src="${DOM.escapeHtml(post.image)}" alt="${DOM.escapeHtml(post.title)}" style="max-width:100%;max-height:180px;object-fit:contain">`
            : `<span style="font-size:3rem">${post.image || '🍲'}</span>`}
          <span class="blog-card__tag">${DOM.escapeHtml(post.category)}</span>
          <h2>${DOM.escapeHtml(post.title)}</h2>
          <p class="blog-card__date">${Format.date(post.date)}</p>
          <p style="margin-top:1rem">${DOM.escapeHtml(post.content)}</p>
          <button class="btn btn--primary" style="margin-top:1rem" id="close-modal">Close</button>
        </div>
      </div>`;
    DOM.$('#close-modal').addEventListener('click', () => DOM.$('#blog-modal').innerHTML = '');
    DOM.$('#modal-overlay').addEventListener('click', e => {
      if (e.target.id === 'modal-overlay') DOM.$('#blog-modal').innerHTML = '';
    });
  }

  renderFavorites();
  renderGrid();
});
