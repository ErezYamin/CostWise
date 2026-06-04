interface PageHeaderProps {
  title: string
  subtitle: string
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#EFF6FF', fontFamily: 'Sora, sans-serif' }}>
        {title}
      </h1>
      <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8899BB' }}>
        {subtitle}
      </p>
    </div>
  )
}
