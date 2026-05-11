import { useState, useEffect } from "react"
import { Package, DollarSign, Clock } from "lucide-react"
import PageHeader from "../components/ui/PageHeader"
import KpiCard from "../components/ui/KpiCard"
import { API_BASE } from "../config"
import { getToken } from "../lib/auth"

const FACTORS = ["🎉 Holiday Next Week", "🎪 Local Event", "🌧 Bad Weather", "📅 Weekend Rush"]

interface OrderItem {
  item_id: string
  name: string
  current_stock: number
  predicted_need: number
  suggested_order: number
  cost: number
  status: "pending" | "approved" | "rejected"
}

const cardStyle = {
  background: "#111827",
  border: "1px solid #1A2A40",
  borderRadius: 14,
  padding: "20px 24px",
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFactors, setActiveFactors] = useState<string[]>([])
  const [customFactor, setCustomFactor] = useState("")

  useEffect(() => {
    async function fetchOrders() {
      try {
        const token = await getToken()
        const res = await fetch(`${API_BASE}/orders`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (!data.items) throw new Error('Unauthorized')
        setOrders(data.items)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  const toggleFactor = (f: string) =>
    setActiveFactors(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    )

  const approveItem = async (item: OrderItem) => {
    const token = await getToken()
    await fetch(`${API_BASE}/orders/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ item_id: item.item_id, approved: true, suggested_order: item.suggested_order }),
    })
    setOrders(prev => prev.map(o => o.item_id === item.item_id ? { ...o, status: "approved" as const } : o))
  }

  const rejectItem = (item: OrderItem) => {
    setOrders(prev => prev.map(o => o.item_id === item.item_id ? { ...o, status: "rejected" as const } : o))
  }

  const approveAll = async () => {
    const token = await getToken()
    const pending = orders.filter(o => o.status === "pending")
    await fetch(`${API_BASE}/orders/approve-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: pending }),
    })
    setOrders(prev => prev.map(o => o.status === "pending" ? { ...o, status: "approved" as const } : o))
  }

  const totalItems = orders.filter(o => o.suggested_order > 0).length
  const estimatedCost = orders.reduce((sum, o) => sum + o.cost, 0)
  const pendingCount = orders.filter(o => o.status === "pending").length

  if (loading) return <div style={{ color: "#EFF6FF", padding: 32 }}>Loading...</div>

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="Order Management" subtitle="AI-suggested inventory orders based on sales history" />
      <div style={cardStyle}>
        <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "#EFF6FF", fontFamily: "Sora, sans-serif" }}>Prediction Factors</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {FACTORS.map(f => (
            <button key={f} onClick={() => toggleFactor(f)} style={{ padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${activeFactors.includes(f) ? "#3B82F6" : "#1A2A40"}`, background: activeFactors.includes(f) ? "#3B82F622" : "transparent", color: activeFactors.includes(f) ? "#3B82F6" : "#8899BB", transition: "all 0.15s" }}>{f}</button>
          ))}
          <input value={customFactor} onChange={e => setCustomFactor(e.target.value)} placeholder="+ Add custom factor" style={{ padding: "7px 14px", borderRadius: 20, fontSize: 13, border: "1px solid #1A2A40", background: "transparent", color: "#EFF6FF", outline: "none", width: 180 }} />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <KpiCard title="Total Items to Order" value={String(totalItems)} trend={0} icon={<Package size={18} />} color="#3B82F6" />
        <KpiCard title="Estimated Cost" value={`$${estimatedCost.toFixed(2)}`} trend={0} icon={<DollarSign size={18} />} color="#10B981" />
        <KpiCard title="Orders Pending Approval" value={String(pendingCount)} trend={0} icon={<Clock size={18} />} color="#F59E0B" />
      </div>
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#EFF6FF", fontFamily: "Sora, sans-serif" }}>AI Suggestions</p>
          {pendingCount > 0 && <button onClick={approveAll} style={{ padding: "9px 20px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none", background: "#3B82F6", color: "#ffffff" }}>Approve All</button>}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #1A2A40" }}>
              {["Ingredient", "Current Stock", "Predicted Need", "Suggested Order", "Cost", "Actions"].map(h => (
                <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#8899BB", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map(item => (
              <tr key={item.item_id} style={{ borderBottom: "1px solid #1A2A4066" }}>
                <td style={{ padding: "14px 12px", color: "#EFF6FF", fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: "14px 12px", color: "#8899BB" }}>{item.current_stock} kg</td>
                <td style={{ padding: "14px 12px", color: "#8899BB" }}>{item.predicted_need} kg</td>
                <td style={{ padding: "14px 12px", color: "#EFF6FF", fontWeight: 600 }}>{item.suggested_order} kg</td>
                <td style={{ padding: "14px 12px", color: "#10B981", fontWeight: 600 }}>${item.cost.toFixed(2)}</td>
                <td style={{ padding: "14px 12px" }}>
                  {item.status === "approved" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#10B981", background: "#10B98122", border: "1px solid #10B98144" }}>✓ Approved</span>
                  ) : item.status === "rejected" ? (
                    <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#EF4444", background: "#EF444422", border: "1px solid #EF444444" }}>✗ Rejected</span>
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => approveItem(item)} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#10B981", color: "#fff" }}>Approve</button>
                      <button onClick={() => rejectItem(item)} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#EF4444", color: "#fff" }}>Reject</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
