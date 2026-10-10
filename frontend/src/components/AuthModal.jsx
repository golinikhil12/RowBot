import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User, Building, ArrowRight, ShieldCheck, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { useJob } from '../contexts/JobContext';
import RowBotLogo from './RowBotLogo';
import toast from 'react-hot-toast';

export default function AuthModal({ isOpen, onClose }) {
  const { user, login } = useJob();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGuestAccess = () => {
    login({
      name: 'Guest Analyst',
      email: 'guest@rowbot.local',
      roleTag: 'Guest Workspace',
      isGuest: true,
      avatar: '👤',
    });
    toast.success('Continuing as Guest. Full workspace access unlocked!');
    onClose();
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter a valid work email.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const displayName = mode === 'signup' && fullName.trim() 
        ? fullName.trim() 
        : email.split('@')[0];

      login({
        name: displayName,
        email: email.trim(),
        roleTag: organization.trim() ? `${organization.trim()} · Analyst` : 'Data Specialist',
        isGuest: false,
        avatar: '👤',
      });
      setIsSubmitting(false);
      toast.success(mode === 'signup' ? 'Account created successfully! Welcome to RowBot.' : `Welcome back, ${displayName}!`);
      onClose();
    }, 450);
  };

  const handleSsoLogin = (provider) => {
    setIsSubmitting(true);
    setTimeout(() => {
      login({
        name: `${provider} User`,
        email: `user@${provider.toLowerCase()}.com`,
        roleTag: `${provider} SSO Verified`,
        isGuest: false,
        avatar: '🏢',
      });
      setIsSubmitting(false);
      toast.success(`Successfully authenticated via ${provider} SSO.`);
      onClose();
    }, 400);
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal animate-fadeInUp"
        style={{
          maxWidth: 500,
          width: '100%',
          background: '#ffffff',
          borderRadius: 20,
          border: '1px solid #e2e8f0',
          boxShadow: '0 24px 60px rgba(3, 24, 43, 0.18)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 22px',
            borderBottom: '1px solid #f1f5f9',
            background: '#ffffff',
          }}
        >
          <RowBotLogo size="sm" showText={true} subtitle="Enterprise Workspace" />
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px', color: '#58738d', borderRadius: 8 }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto' }}>
          {/* Guest Access Banner (Option Without Sign Up) */}
          <div
            style={{
              background: 'linear-gradient(135deg, #fff7f4 0%, #fff1ec 100%)',
              border: '1.5px solid rgba(215, 98, 61, 0.35)',
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
              <div style={{ fontWeight: 800, fontSize: '.92rem', color: '#2e1a22' }}>
                ⚡ No Sign-Up Needed
              </div>
              <span
                style={{
                  fontSize: '.72rem',
                  fontWeight: 700,
                  color: '#845162',
                  background: 'rgba(132, 81, 98, 0.1)',
                  padding: '2px 8px',
                  borderRadius: 6,
                }}
              >
                Instant Access
              </span>
            </div>
            <p style={{ fontSize: '.8rem', color: '#58738d', margin: 0, lineHeight: 1.4 }}>
              Want to clean a spreadsheet right away? Skip registration and start immediately as a guest.
            </p>
            <button
              onClick={handleGuestAccess}
              className="btn btn-primary btn-sm"
              style={{
                marginTop: 4,
                width: '100%',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '9px',
              }}
            >
              Continue as Guest (Skip Sign-Up) <ArrowRight size={14} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ fontSize: '.75rem', fontWeight: 700, color: '#8da4b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Or Sign In With Account
            </span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          {/* Tab Switcher: Sign In vs Create Account */}
          <div
            style={{
              display: 'flex',
              background: '#f8fafc',
              padding: 4,
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              marginBottom: 18,
            }}
          >
            <button
              type="button"
              onClick={() => setMode('signin')}
              style={{
                flex: 1,
                padding: '0 12px',
                height: 38,
                minHeight: 38,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: 8,
                fontSize: '.84rem',
                fontWeight: mode === 'signin' ? 800 : 600,
                color: mode === 'signin' ? '#2e1a22' : '#73535d',
                background: mode === 'signin' ? '#ffffff' : 'transparent',
                boxShadow: mode === 'signin' ? '0 2px 6px rgba(132, 81, 98, 0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxSizing: 'border-box',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              style={{
                flex: 1,
                padding: '0 12px',
                height: 38,
                minHeight: 38,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                borderRadius: 8,
                fontSize: '.84rem',
                fontWeight: mode === 'signup' ? 800 : 600,
                color: mode === 'signup' ? '#2e1a22' : '#73535d',
                background: mode === 'signup' ? '#ffffff' : 'transparent',
                boxShadow: mode === 'signup' ? '0 2px 6px rgba(132, 81, 98, 0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxSizing: 'border-box',
              }}
            >
              Create Account
            </button>
          </div>

          {/* Single Sign-On Buttons */}
          <div className="auth-sso-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <button
              type="button"
              onClick={() => handleSsoLogin('Google')}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 38,
                minHeight: 38,
                width: '100%',
                padding: '0 8px',
                boxSizing: 'border-box',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={() => handleSsoLogin('Microsoft')}
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '.8rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                height: 38,
                minHeight: 38,
                width: '100%',
                padding: '0 8px',
                boxSizing: 'border-box',
              }}
            >
              <svg width="15" height="15" viewBox="0 0 21 21">
                <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
              </svg>
              Microsoft
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', margin: '14px 0', gap: 10 }}>
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
            <span style={{ fontSize: '.72rem', color: '#8da4b8' }}>or with email</span>
            <div style={{ flex: 1, height: 1, background: '#f1f5f9' }} />
          </div>

          {/* Credentials Form */}
          <form onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: '.76rem', fontWeight: 700, color: '#1e3a52', marginBottom: 5 }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="#8da4b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="input"
                    style={{ paddingLeft: 34 }}
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: '.76rem', fontWeight: 700, color: '#1e3a52', marginBottom: 5 }}>
                Work Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#8da4b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="input"
                  style={{ paddingLeft: 34 }}
                  required
                />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <label style={{ fontSize: '.76rem', fontWeight: 700, color: '#1e3a52' }}>
                  Password
                </label>
                {mode === 'signin' && (
                  <span
                    style={{ fontSize: '.72rem', color: '#845162', cursor: 'pointer', fontWeight: 600 }}
                    onClick={() => toast('Password reset link sent to your work email.')}
                  >
                    Forgot password?
                  </span>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#8da4b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input"
                  style={{ paddingLeft: 34, paddingRight: 36 }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: 10,
                    background: 'none',
                    border: 'none',
                    color: '#8da4b8',
                    cursor: 'pointer',
                    padding: 2,
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {mode === 'signup' && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: '.76rem', fontWeight: 700, color: '#1e3a52', marginBottom: 5 }}>
                  Organization / Team (Optional)
                </label>
                <div style={{ position: 'relative' }}>
                  <Building size={15} color="#8da4b8" style={{ position: 'absolute', left: 12, top: 12 }} />
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="Acme Analytics"
                    className="input"
                    style={{ paddingLeft: 34 }}
                  />
                </div>
              </div>
            )}

            {/* Remember Device Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '.78rem', color: '#58738d', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: '#845162', cursor: 'pointer' }}
                />
                Remember this device for 30 days
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary"
              style={{
                width: '100%',
                padding: '11px',
                fontWeight: 800,
                fontSize: '.92rem',
                borderRadius: 10,
              }}
            >
              {isSubmitting
                ? 'Authenticating...'
                : mode === 'signup'
                ? 'Create Enterprise Account'
                : 'Sign In to RowBot'}
            </button>
          </form>

          {/* Security & SOC2 Compliance Footer Note */}
          <div
            style={{
              marginTop: 18,
              paddingTop: 12,
              borderTop: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              fontSize: '.72rem',
              color: '#8da4b8',
            }}
          >
            <ShieldCheck size={14} color="#059669" />
            <span>SOC2 Type II Certified · 256-Bit TLS Client-Side Encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
