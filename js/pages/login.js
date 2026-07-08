App.ready().then(async () => {
  await Components.initLayout('');

  DOM.$('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const params = DOM.getQueryParams();
    const redirect = params.redirect || '../index.html';
    const result = await API.user.login(fd.get('email'), fd.get('password'));
    if (result.success) {
      Components.toast('Welcome back, Suki!');
      window.location.href = redirect;
    } else {
      DOM.$('#login-error').textContent = result.error;
    }
  });
});
