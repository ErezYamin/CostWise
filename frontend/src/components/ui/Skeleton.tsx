const shimmerStyle: React.CSSProperties = {
  background: "linear-gradient(90deg, #1A2A40 25%, #243447 50%, #1A2A40 75%)",
  backgroundSize: "200% 100%",
  animation: "shimmer 1.4s infinite",
}

export const skimmerKeyframes = `@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`

export function SkeletonBlock({
  width = "100%",
  height = 16,
  radius = 8,
}: {
  width?: string | number
  height?: number
  radius?: number
}) {
  return (
    <div style={{ width, height, borderRadius: radius, flexShrink: 0, ...shimmerStyle }} />
  )
}

const cardStyle: React.CSSProperties = {
  background: "#111827",
  border: "1px solid #1A2A40",
  borderRadius: 14,
  padding: "20px 24px",
}

export function DashboardSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{skimmerKeyframes}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SkeletonBlock width={200} height={24} />
        <SkeletonBlock width={280} height={14} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <SkeletonBlock width={36} height={36} radius={10} />
              <SkeletonBlock width={48} height={20} radius={20} />
            </div>
            <SkeletonBlock width="60%" height={28} />
            <SkeletonBlock width="80%" height={12} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {[160, 140].map((w, i) => (
          <div key={i} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
            <SkeletonBlock width={w} height={16} />
            <SkeletonBlock width="100%" height={220} radius={10} />
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonBlock width={140} height={16} />
          <SkeletonBlock width="100%" height={220} radius={10} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {[...Array(4)].map((_, i) => <SkeletonBlock key={i} width="100%" height={12} />)}
          </div>
        </div>
      </div>
    </div>
  )
}

export function OrdersSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <style>{skimmerKeyframes}</style>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <SkeletonBlock width={200} height={24} />
        <SkeletonBlock width={320} height={14} />
      </div>

      {/* Prediction factors */}
      <div style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
        <SkeletonBlock width={160} height={16} />
        <div style={{ display: "flex", gap: 10 }}>
          {[120, 100, 110, 130].map((w, i) => (
            <SkeletonBlock key={i} width={w} height={34} radius={20} />
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        {[...Array(3)].map((_, i) => (
          <div key={i} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <SkeletonBlock width={36} height={36} radius={10} />
              <SkeletonBlock width={48} height={20} radius={20} />
            </div>
            <SkeletonBlock width="60%" height={28} />
            <SkeletonBlock width="80%" height={12} />
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={cardStyle}>
        <SkeletonBlock width={140} height={16} />
        <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 12, paddingBottom: 12, borderBottom: "1px solid #1A2A40" }}>
            {[...Array(6)].map((_, i) => <SkeletonBlock key={i} width="70%" height={11} />)}
          </div>
          {[...Array(6)].map((_, row) => (
            <div key={row} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 12, padding: "14px 0", borderBottom: "1px solid #1A2A4044" }}>
              {[...Array(6)].map((_, col) => (
                <SkeletonBlock key={col} width={col === 5 ? 80 : "70%"} height={14} radius={col === 5 ? 7 : 8} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
