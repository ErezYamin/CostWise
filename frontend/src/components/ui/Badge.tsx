interface BadgeProps {
  label: string
  color: string
}

export default function Badge({ label, color }: BadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
      color: color,
      background: `${color}22`,
      border: `1px solid ${color}44`,
    }}>
      {label}
    </span>
  )
}
