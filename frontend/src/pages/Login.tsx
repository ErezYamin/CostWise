import { signIn } from 'aws-amplify/auth'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DollarSign } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin() {
    try {
      await signIn({ username: email, password })
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div style={{
      height: '100vh',
      background: '#080E1A',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Card */}
      <div style={{
        width: 440,
        background: '#111827',
        border: '1px solid rgba(59,130,246,0.18)',
        borderRadius: 22,
        padding: '48px 44px',
        boxShadow: '0 40px 80px rgba(0,0,0,0.55)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 46,
            height: 46,
            background: 'linear-gradient(135deg, #3B82F6, #10B981)',
            borderRadius: 13,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(59,130,246,0.35)',
          }}>
            <DollarSign size={24} color="white" />
          </div>
          <span style={{
            fontFamily: 'Sora, sans-serif',
            fontSize: 32,
            fontWeight: 800,
            background: 'linear-gradient(135deg, #60A5FA, #3B82F6 45%, #10B981)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1.5px',
          }}>
            CostWise
          </span>
        </div>

        {/* Subtitle */}
        <h2 style={{ textAlign: 'center', fontFamily: 'Sora, sans-serif', fontSize: 22, fontWeight: 600, color: '#EFF6FF', margin: '0 0 6px' }}>
          Welcome back
        </h2>
        <p style={{ textAlign: 'center', color: '#6B8099', fontSize: 14, margin: '0 0 36px' }}>
          Sign in to your restaurant dashboard
        </p>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid #1E2F4A',
              background: '#0D1526',
              color: '#EFF6FF',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid #1E2F4A',
              background: '#0D1526',
              color: '#EFF6FF',
              fontSize: 14,
              outline: 'none',
            }}
          />

          {error && (
            <p style={{ margin: 0, color: '#EF4444', fontSize: 13 }}>{error}</p>
          )}

          <button
            onClick={handleLogin}
            style={{
              padding: '13px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: 4,
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  )
}
