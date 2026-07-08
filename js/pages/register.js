App.ready().then(async () => {
  await Components.initLayout('');
  PasswordToggle.init();

  const registerStep = DOM.$('#register-step');
  const otpStep = DOM.$('#otp-step');
  const registerForm = DOM.$('#register-form');
  const registerError = DOM.$('#register-error');
  const registerSubmit = DOM.$('#register-submit');
  const otpForm = DOM.$('#otp-form');
  const otpError = DOM.$('#otp-error');
  const otpSubmit = DOM.$('#otp-submit');
  const otpEmailDisplay = DOM.$('#otp-email-display');

  function setLoading(button, loading, label) {
    button.disabled = loading;
    button.textContent = loading ? label : button.dataset.defaultLabel || button.textContent;
  }

  registerSubmit.dataset.defaultLabel = registerSubmit.textContent;
  otpSubmit.dataset.defaultLabel = otpSubmit.textContent;

  function showOtpStep(email) {
    registerStep.hidden = true;
    otpStep.hidden = false;
    otpEmailDisplay.textContent = email;
    otpError.textContent = '';
    DOM.$('input[name="otp"]', otpForm).value = '';
    DOM.$('input[name="otp"]', otpForm).focus();
  }

  function showRegisterStep() {
    otpStep.hidden = true;
    registerStep.hidden = false;
    registerError.textContent = '';
    OTPService.clearPending();
  }

  async function startEmailVerification(profile) {
    const otp = OTPService.generate();
    OTPService.savePending(profile, otp);
    await OTPService.sendOtp({
      email: profile.email,
      name: profile.name,
      otp
    });
    showOtpStep(profile.email);
    Components.toast('Verification code sent to your email');
  }

  registerForm.addEventListener('submit', async e => {
    e.preventDefault();
    registerError.textContent = '';

    const fd = new FormData(e.target);
    if (fd.get('password') !== fd.get('confirmPassword')) {
      registerError.textContent = 'Passwords do not match';
      return;
    }

    const profile = {
      name: fd.get('name'),
      email: fd.get('email'),
      password: fd.get('password'),
      phone: fd.get('phone')
    };

    setLoading(registerSubmit, true, 'Sending code...');
    try {
      await startEmailVerification(profile);
    } catch (err) {
      registerError.textContent = err.message || 'Could not send verification email';
      OTPService.clearPending();
    } finally {
      setLoading(registerSubmit, false);
      registerSubmit.textContent = registerSubmit.dataset.defaultLabel;
    }
  });

  otpForm.addEventListener('submit', async e => {
    e.preventDefault();
    otpError.textContent = '';

    const fd = new FormData(e.target);
    const verification = OTPService.verify(fd.get('otp'));
    if (!verification.valid) {
      otpError.textContent = verification.error;
      return;
    }

    setLoading(otpSubmit, true, 'Creating account...');
    const result = await API.user.register(verification.profile);
    setLoading(otpSubmit, false);
    otpSubmit.textContent = otpSubmit.dataset.defaultLabel;

    if (result.success) {
      OTPService.clearPending();
      Components.toast('Account verified! Welcome to Go! Cery!');
      window.location.href = 'account.html';
      return;
    }

    otpError.textContent = result.error;
  });

  DOM.$('#otp-resend').addEventListener('click', async () => {
    const pending = OTPService.getPending();
    if (!pending) {
      otpError.textContent = 'Session expired. Please go back and register again.';
      return;
    }

    otpError.textContent = '';
    const resendBtn = DOM.$('#otp-resend');
    resendBtn.disabled = true;
    try {
      const otp = OTPService.generate();
      OTPService.savePending(pending.profile, otp);
      await OTPService.sendOtp({
        email: pending.profile.email,
        name: pending.profile.name,
        otp
      });
      Components.toast('New verification code sent');
    } catch (err) {
      otpError.textContent = err.message || 'Could not resend verification code';
    } finally {
      resendBtn.disabled = false;
    }
  });

  DOM.$('#otp-back').addEventListener('click', showRegisterStep);

  DOM.$('#google-register').addEventListener('click', async () => {
    registerError.textContent = '';
    const btn = DOM.$('#google-register');
    btn.disabled = true;
    const result = await API.user.loginWithGoogle();
    btn.disabled = false;

    if (result.success) {
      Components.toast('Welcome to Go! Cery!');
      window.location.href = 'account.html';
    } else if (result.error !== 'Google sign-in was cancelled') {
      registerError.textContent = result.error;
    }
  });

  const pending = OTPService.getPending();
  if (pending?.profile?.email) {
    showOtpStep(pending.profile.email);
  }
});
