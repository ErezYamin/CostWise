import { signIn, confirmSignIn } from 'aws-amplify/auth'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign } from 'lucide-react'

const inputStyle = {
  padding: '12px 16px',
  borderRadius: 10,
  border: '1px solid #1E2F4A',
  background: '#0D1526',
  color: '#EFF6FF',
  fontSize: 14,
  outline: 'none',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [needsNewPassword, setNeedsNewPassword] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin() {
    setError('')
    try {
      const { isSignedIn, nextStep } = await signIn({ username: email, password })
      if (isSignedIn) {
        navigate('/')
      } else if (nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        setNeedsNewPassword(true)
      } else {
        setError(`Unexpected step: ${nextStep.signInStep}`)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function handleNewPassword() {
    setError('')
    try {
      const { isSignedIn } = await confirmSignIn({ challengeResponse: newPassword })
      if (isSignedIn) {
        navigate('/')
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div style={{ height: '100vh', background: '#080E1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 440, background: '#111827', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 22, padding: '48px 44px', boxShadow: '0 40px 80px rgba(0,0,0,0.55)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{ width: 46, height: 46, background: 'linear-gradient(135deg, #3B82F6, #10B981)', borderRadius: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(59,130,246,0.35)' }}>
            <DollarSign size={24} color="white" />
          </div>
          <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 32, fontWeight: 800, background: 'linear-gradient(135deg, #60A5FA, #3B82F6 45%, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '-1.5px' }}>
            CostWise
          </span>
        </div>

        <h2 style={{ textAlign: 'center', fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 600, color: '#EFF6FF', margin: '0 0 6px' }}>
          {needsNewPassword ? 'Set New Password' : 'Welcome back'}
        </h2>
        <p style={{ textAlign: 'center', color: '#6B8099', fontSize: 14, margin: '0 0 36px' }}>
          {needsNewPassword ? 'Choose a permanent password to continue' : 'Sign in to your restaurant dashboard'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!needsNewPassword ? (
            <>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email address" style={inputStyle} />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" style={inputStyle} />
              {error && <p style={{ margin: 0, color: '#EF4444', fontSize: 13 }}>{error}</p>}
              <button onClick={handleLogin} style={{ padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
                Sign in
              </button>
            </>
          ) : (
            <>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" style={inputStyle} />
              {error && <p style={{ margin: 0, color: '#EF4444', fontSize: 13 }}>{error}</p>}
              <button onClick={handleNewPassword} style={{ padding: '13px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #3B82F6, #2563EB)', color: 'white', fontSize: 15, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}>
                Set Password & Sign in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
