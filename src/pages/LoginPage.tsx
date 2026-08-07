import { useState, useEffect, type FormEvent } from 'react'
import { LogIn, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const { login, loading } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    setError('')
    const u = username.trim()
    const p = password.trim()
    if (!u) { setError('Username is required.'); return }
    if (!p) { setError('Password is required.'); return }

    login(u, p, false).then((result) => {
      if (result.error) setError(result.error)
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        fontFamily: 'var(--font-sans)',
        background: '#fff',
      }}
    >
      {/* ========== LEFT PANEL ========== */}
      <div
        className="login-left"
        style={{
          flex: '0 0 45%',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '32px 48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* subtle decorative circles */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.03)' }} />
        <div style={{ position: 'absolute', bottom: -120, left: -60, width: 400, height: 400, borderRadius: '50%', background: 'rgba(255,255,255,0.02)' }} />

        {/* top: logo + app name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#fff',
              color: '#0f172a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            P
          </div>
          <span style={{ color: '#fff', fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em' }}>
            Packing Order
          </span>
        </div>

        {/* headline */}
        <div style={{ marginTop: 12 }}>
          <h1
            style={{
              color: '#fff',
              fontSize: 28,
              fontWeight: 700,
              lineHeight: 1.3,
              letterSpacing: '-0.02em',
              margin: 0,
              maxWidth: 360,
            }}
          >
            Pallet Tag System
          </h1>
          <p
            style={{
              color: 'rgba(255,255,255,0.6)',
              fontSize: 14,
              marginTop: 8,
              lineHeight: 1.6,
              maxWidth: 380,
            }}
          >
            Print Pallet ID Tag
          </p>
        </div>

        {/* center: illustration */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}>
          <div
            style={{
              maxWidth: 380,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4), 0 8px 20px rgba(0,0,0,0.2)',
              transform: 'rotate(-1.5deg)',
              transition: 'transform 0.3s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'rotate(0deg) scale(1.01)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'rotate(-1.5deg)' }}
          >
            <img
              src="/login-illustration.png"
              alt="Dashboard preview"
              style={{ width: '100%', height: 'auto', display: 'block' }}
            />
          </div>
        </div>

        {/* bottom: copyright */}
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, margin: 0, visibility: 'hidden' }}>
          © Maxter Glove Manufacturing (M) Sdn Bhd
        </p>
      </div>

      {/* ========== RIGHT PANEL ========== */}
      <div
        style={{
          flex: '0 0 55%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          background: '#fff',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(12px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}
        >
          {/* Logo badge */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#0f172a',
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                marginBottom: 20,
              }}
            >
              P
            </div>
            <h1
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: '#18181b',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              Sign in to Packing Order
            </h1>
            <p
              style={{
                fontSize: 13,
                color: '#71717a',
                marginTop: 6,
                marginBottom: 0,
              }}
            >
              Sign in to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                fontSize: 13,
                marginBottom: 20,
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Username */}
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#71717a',
                  marginBottom: 6,
                  letterSpacing: '0.02em',
                }}
              >
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                autoComplete="username"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  border: '1.5px solid #e4e4e7',
                  borderRadius: 10,
                  fontSize: 14,
                  outline: 'none',
                  background: '#fafafa',
                  color: '#18181b',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,23,42,0.08)'; e.currentTarget.style.background = '#fff' }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e4e4e7'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#fafafa' }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#71717a',
                  marginBottom: 6,
                  letterSpacing: '0.02em',
                }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '11px 40px 11px 14px',
                    border: '1.5px solid #e4e4e7',
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                    background: '#fafafa',
                    color: '#18181b',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = '#0f172a'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(15,23,42,0.08)'; e.currentTarget.style.background = '#fff' }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = '#e4e4e7'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.background = '#fafafa' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#a1a1aa',
                    padding: 4,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: loading ? '#1e293b' : '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease, box-shadow 0.15s ease',
                boxShadow: '0 4px 14px rgba(15,23,42,0.25)',
              }}
              onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(15,23,42,0.35)' } }}
              onMouseLeave={(e) => { if (!loading) { e.currentTarget.style.background = '#0f172a'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(15,23,42,0.25)' } }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign in
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: '#a1a1aa',
            marginTop: 40,
          }}
        >
          Packing Order Sheet v2.0
        </p>
        <p
          style={{
            textAlign: 'center',
            fontSize: 11,
            color: '#a1a1aa',
            marginTop: 8,
          }}
        >
          © Maxter Glove Manufacturing (M) Sdn Bhd
        </p>
      </div>

      {/* Mobile responsive */}
      <style>{`
        @media (max-width: 767px) {
          .login-left { display: none !important; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
