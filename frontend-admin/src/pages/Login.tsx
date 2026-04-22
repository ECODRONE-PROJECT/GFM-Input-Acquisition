import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  initiateAdminLogin,
  saveAdminSession,
  verifyAdminOtp,
} from '../lib/adminAuth';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [showOtp, setShowOtp] = useState(false);
  const [isSubmittingCredentials, setIsSubmittingCredentials] = useState(false);
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [deliveryMode, setDeliveryMode] = useState('');
  const [targetHint, setTargetHint] = useState('');
  const [expiresInMinutes, setExpiresInMinutes] = useState<number | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  const handleInitialSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !password) {
      setError('Provide both email and password.');
      return;
    }
    setIsSubmittingCredentials(true);
    try {
      const challenge = await initiateAdminLogin(normalizedEmail, password);
      setEmail(normalizedEmail);
      setChallengeId(challenge.challenge_id);
      setDeliveryMode(challenge.delivery_mode);
      setTargetHint(challenge.target_hint);
      setExpiresInMinutes(challenge.expires_in_minutes);
      setOtp('');
      setShowOtp(true);
      setResendCooldown(45);
      if (challenge.delivery_mode === 'sms') {
        setNotice(`Code sent via SMS to ${challenge.target_hint}.`);
      } else if (challenge.delivery_mode === 'log') {
        setNotice(
          'SMS gateway is not configured. OTP is available in backend logs (ADMIN_OTP_DEV_ONLY). Enter it below.'
        );
      } else {
        setNotice(`OTP challenge created via ${challenge.delivery_mode}. Enter the received code below.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid admin credentials.');
    } finally {
      setIsSubmittingCredentials(false);
    }
  };

  const handleOtpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanOtp = otp.replace(/\D/g, '');
    if (!cleanOtp || cleanOtp.length !== 6) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    if (!challengeId) {
      setError('OTP challenge is missing. Restart login.');
      return;
    }
    setIsSubmittingOtp(true);
    try {
      const session = await verifyAdminOtp(email, challengeId, cleanOtp);
      saveAdminSession(session);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify admin OTP.');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setError('');
    setNotice('');
    if (!email || !password) {
      setError('Restart login to resend OTP.');
      return;
    }
    setIsSubmittingCredentials(true);
    try {
      const challenge = await initiateAdminLogin(email, password);
      setChallengeId(challenge.challenge_id);
      setDeliveryMode(challenge.delivery_mode);
      setTargetHint(challenge.target_hint);
      setExpiresInMinutes(challenge.expires_in_minutes);
      setOtp('');
      setResendCooldown(45);
      if (challenge.delivery_mode === 'sms') {
        setNotice(`A new code was sent to ${challenge.target_hint}.`);
      } else if (challenge.delivery_mode === 'log') {
        setNotice(
          'SMS gateway is not configured. New OTP is available in backend logs (ADMIN_OTP_DEV_ONLY).'
        );
      } else {
        setNotice(`A new OTP challenge was created via ${challenge.delivery_mode}.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend OTP.');
    } finally {
      setIsSubmittingCredentials(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-screen flex items-center justify-center p-4">
      {/* Background Landscape */}
      <div className="fixed inset-0 z-0">
        <div className="w-full h-full bg-stone-200"></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-surface to-transparent"></div>
      </div>

      <main className="relative z-10 w-full max-w-md">
        <div className="bg-surface-container-low rounded-xl shadow-sm p-1">
          <div className="bg-surface-container-lowest rounded-xl p-8 md:p-10 flex flex-col gap-8">
            
            <header className="flex flex-col items-center text-center pb-2">
              <img src="/gfm_logo.png" alt="Grow For Me Logo" className="h-12 object-contain mix-blend-multiply mb-3" />
              <p className="font-body text-sm text-on-surface-variant tracking-wide font-medium">
                  ADMIN MANAGEMENT PORTAL
              </p>
            </header>

            {error && (
              <div className="bg-error-container text-on-error-container p-3 rounded text-sm text-center font-bold">
                {error}
              </div>
            )}
            {notice && (
              <div className="bg-surface-container-high text-on-surface p-3 rounded text-sm text-center font-medium ring-1 ring-outline-variant">
                {notice}
              </div>
            )}

            {!showOtp ? (
              <form className="flex flex-col gap-6" onSubmit={handleInitialSubmit}>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest ml-1" htmlFor="email">
                        Email Address
                    </label>
                    <input 
                      id="email" 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="admin@gfm.ia" 
                      className="w-full h-12 px-4 bg-surface-container-highest border-none rounded-lg focus:ring-2 focus:ring-primary-container transition-all text-on-surface font-medium placeholder:text-outline-variant outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-label text-xs font-semibold text-on-surface-variant uppercase tracking-widest ml-1" htmlFor="password">
                        Password
                    </label>
                    <div className="relative">
                      <input 
                        id="password" 
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="••••••••" 
                        className="w-full h-12 px-4 bg-surface-container-highest border-none rounded-lg focus:ring-2 focus:ring-primary-container transition-all text-on-surface font-medium placeholder:text-outline-variant outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingCredentials}
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold rounded-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                      {isSubmittingCredentials ? 'Starting secure login...' : 'Secure Log In'}
                      <span className="material-symbols-outlined text-xl">login</span>
                  </button>
                  <a href="#" className="block text-center text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">
                      Forgot your administrative password?
                  </a>
                </div>
              </form>
            ) : (
              <form className="flex flex-col gap-6" onSubmit={handleOtpSubmit}>
                <div className="bg-surface-container-low p-6 rounded-lg space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">sms</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-on-surface leading-tight">SMS OTP Verification</p>
                      <p className="text-xs text-on-surface-variant">
                        {deliveryMode === 'sms'
                          ? `Enter the 6-digit code sent to ${targetHint} via mNotify SMS.`
                          : deliveryMode === 'log'
                            ? 'SMS is not configured. Check backend logs for ADMIN_OTP_DEV_ONLY and enter the OTP.'
                            : `Enter the OTP delivered via ${deliveryMode || 'configured channel'}.`}
                        {expiresInMinutes ? ` Expires in ${expiresInMinutes} minutes.` : ''}
                      </p>
                    </div>
                  </div>
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    required
                    placeholder="Enter 6-digit OTP"
                    className="w-full h-12 px-4 tracking-[0.35em] text-center text-xl font-bold bg-surface-container-lowest border-none rounded-lg ring-1 ring-outline-variant focus:ring-2 focus:ring-primary-container outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isSubmittingCredentials || resendCooldown > 0}
                    className="text-xs font-semibold text-primary hover:underline transition-all disabled:opacity-60 disabled:no-underline"
                  >
                    {isSubmittingCredentials
                      ? 'Resending...'
                      : resendCooldown > 0
                        ? `Resend Code (${resendCooldown}s)`
                        : 'Resend Code'}
                  </button>
                </div>
                <div className="space-y-4 pt-2">
                  <button
                    type="submit"
                    disabled={isSubmittingOtp}
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary-container text-on-primary font-headline font-bold rounded-lg shadow-md hover:shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmittingOtp ? 'Verifying OTP...' : 'Verify and Enter'}
                    <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                  </button>
                </div>
              </form>
            )}

            <footer className="mt-4 pt-6 border-t border-surface-container-highest flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5 opacity-60">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">Enterprise Secure</span>
              </div>
              <div className="h-3 w-px bg-surface-container-highest"></div>
              <div className="flex items-center gap-1.5 opacity-60">
                <span className="material-symbols-outlined text-sm">eco</span>
                <span className="text-[10px] font-bold uppercase tracking-widest">v2.4.0 Agronomy</span>
              </div>
            </footer>
          </div>
        </div>

        <p className="text-center mt-8 text-on-surface-variant/70 text-xs font-medium">
            © 2024 Grow For Me. Cultivating Precision Agriculture.
        </p>
      </main>

    </div>
  );
}
