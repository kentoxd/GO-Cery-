App.ready().then(async () => {
  await Components.initLayout('');

  DOM.$('#register-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    if (fd.get('password') !== fd.get('confirmPassword')) {
      DOM.$('#register-error').textContent = 'Passwords do not match';
      return;
    }
    const result = await API.user.register({
      name: fd.get('name'),
      email: fd.get('email'),
      password: fd.get('password'),
      phone: fd.get('phone')
    });
    if (result.success) {
      Components.toast('Account created! Welcome to Go! Cery!');
      window.location.href = 'account.html';
    } else {
      DOM.$('#register-error').textContent = result.error;
    }
  });
});
