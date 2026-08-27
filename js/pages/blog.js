App.ready().then(async () => {
  await Components.initLayout('blog');

  const posts = await API.cms.getRecipes();
  DOM.$('#blog-grid').innerHTML = posts.map(p => `
    <article class="blog-card">
      <div class="blog-card__image">${String(p.image || '').startsWith('http')
        ? `<img src="${DOM.escapeHtml(p.image)}" alt="${DOM.escapeHtml(p.title)}">`
        : p.image || '🍲'}</div>
      <div class="blog-card__body">
        <span class="blog-card__tag">${DOM.escapeHtml(p.category)}</span>
        <h3>${DOM.escapeHtml(p.title)}</h3>
        <p class="blog-card__date">${Format.date(p.date)}</p>
        <p>${DOM.escapeHtml(p.excerpt)}</p>
        <button class="btn btn--outline btn--sm read-more" data-id="${p.id}">Read More</button>
      </div>
    </article>
  `).join('');

  DOM.$$('.read-more').forEach(btn => {
    btn.addEventListener('click', () => {
      const post = posts.find(p => p.id === btn.dataset.id);
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
    });
  });
});
