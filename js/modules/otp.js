/**
 * EmailJS OTP verification for registration
 */
const OTPService = {
  STORAGE_KEY: 'gocery_pending_registration',
  OTP_TTL_MS: 10 * 60 * 1000,

  isConfigured() {
    return EMAILJS_CONFIG.publicKey &&
      EMAILJS_CONFIG.publicKey !== 'YOUR_PUBLIC_KEY' &&
      EMAILJS_CONFIG.templateId &&
      EMAILJS_CONFIG.templateId !== 'YOUR_TEMPLATE_ID';
  },

  generate() {
    return String(Math.floor(100000 + Math.random() * 900000));
  },

  savePending(profile, otp) {
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify({
      profile,
      otp,
      expiresAt: Date.now() + this.OTP_TTL_MS
    }));
  },

  getPending() {
    const raw = sessionStorage.getItem(this.STORAGE_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw);
    if (Date.now() > data.expiresAt) {
      this.clearPending();
      return null;
    }
    return data;
  },

  verify(inputOtp) {
    const pending = this.getPending();
    if (!pending) {
      return { valid: false, error: 'Verification code expired. Please register again.' };
    }
    if (String(inputOtp).trim() !== pending.otp) {
      return { valid: false, error: 'Invalid verification code. Please try again.' };
    }
    return { valid: true, profile: pending.profile };
  },

  clearPending() {
    sessionStorage.removeItem(this.STORAGE_KEY);
  },

  _ensureEmailJsReady() {
    if (typeof emailjs === 'undefined') {
      throw new Error('EmailJS SDK not loaded');
    }
    if (!emailjs.__goceryInitialized) {
      emailjs.init({ publicKey: EMAILJS_CONFIG.publicKey });
      emailjs.__goceryInitialized = true;
    }
  },

  _formatSendError(err) {
    return err?.text || err?.message || 'Could not send verification email';
  },

  async sendOtp({ email, name, otp }) {
    if (!this.isConfigured()) {
      throw new Error('EmailJS is not configured. Add your template ID and public key in js/config.emailjs.js');
    }

    this._ensureEmailJsReady();

    // 1. Calculate expiration time matching your 10-minute TTL setting
    const expiryDate = new Date(Date.now() + this.OTP_TTL_MS);
    const formattedTime = expiryDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      await emailjs.send(
        EMAILJS_CONFIG.serviceId,
        EMAILJS_CONFIG.templateId,
        {
          // Keep these if your EmailJS setup needs them
          email,
          user_name: name,
          message: `Your Go! Cery verification code is: ${otp}. It expires in 10 minutes.`,
          
          // 2. Map fields to exactly match your HTML template: {{passcode}} and {{time}}
          passcode: otp,      
          time: formattedTime 
        }
      );
    } catch (err) {
      throw new Error(this._formatSendError(err));
    }
  }
};
