App.ready().then(async () => {
  await Components.initLayout('');
  PasswordToggle.init();

  const params = DOM.getQueryParams();
  const redirect = params.redirect || '../index.html';

  DOM.$('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const result = await API.user.login(fd.get('email'), fd.get('password'));
    if (result.success) {
      Components.toast('Welcome back, Suki!');
      window.location.href = redirect;
    } else {
      DOM.$('#login-error').textContent = result.error;
    }
  });

  DOM.$('#google-login').addEventListener('click', async () => {
    const errorEl = DOM.$('#login-error');
    errorEl.textContent = '';
    const btn = DOM.$('#google-login');
    btn.disabled = true;

    const result = await API.user.loginWithGoogle();
    btn.disabled = false;

    if (result.success) {
      Components.toast('Welcome back, Suki!');
      window.location.href = redirect;
    } else if (result.error !== 'Google sign-in was cancelled') {
      errorEl.textContent = result.error;
    }
  });
});
