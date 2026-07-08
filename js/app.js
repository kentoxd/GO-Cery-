/**
 * Go! Cery – Application Bootstrap (Firebase)
 */
const App = {
  _ready: null,

  ready() {
    if (!this._ready) {
      this._ready = FirebaseApp.init().catch(err => {
        console.error('[Go! Cery] Firebase init failed:', err);
        this._showFirebaseError(err);
        throw err;
      });
    }
    return this._ready;
  },

  _showFirebaseError(err) {
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:#fff;padding:1rem;text-align:center;z-index:99999;font-size:0.9rem';
    banner.innerHTML = `Firebase connection failed. Check js/config.firebase.js — ${DOM.escapeHtml(err.message)}`;
    document.body.prepend(banner);
  },

  showPageLoader() {
    if (DOM.$('#app-loader')) return;
    const loader = DOM.create('div', {
      id: 'app-loader',
      className: 'app-loader',
      innerHTML: '<div class="app-loader__spinner"></div><p>Loading palengke-fresh…</p>'
    });
    document.body.prepend(loader);
  },

  hidePageLoader() {
    DOM.$('#app-loader')?.remove();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.showPageLoader();
  App.ready().finally(() => App.hidePageLoader());
});
