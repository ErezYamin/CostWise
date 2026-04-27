import React from 'react'

interface KpiCardProps {
  title: string
  value: string
  trend: number
  icon: React.ReactNode
  color: string
}

export default function KpiCard({ title, value, trend, icon, color }: KpiCardProps) {
  const trendColor = trend > 0 ? '#10B981' : trend < 0 ? '#EF4444' : '#8899BB'
  const trendArrow = trend > 0 ? '↑' : trend < 0 ? '↓' : ''

  return (
    <div style={{
      background: '#111827',
      border: '1px solid #1A2A40',
      borderRadius: 14,
      padding: '20px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      borderTop: `3px solid ${color}`,
    }}>
      {/* Top row: icon + trend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}22`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color,
        }}>
          {icon}
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: trendColor }}>
          {trendArrow} {Math.abs(trend)}%
        </span>
      </div>

      {/* Value */}
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#EFF6FF', fontFamily: 'Sora, sans-serif' }}>
        {value}
      </p>

      {/* Title */}
      <p style={{ margin: 0, fontSize: 13, color: '#8899BB', fontWeight: 500 }}>
        {title}
      </p>
    </div>
  )
}
