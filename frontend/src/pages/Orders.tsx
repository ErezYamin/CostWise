import { useState } from "react"
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
  priority?: "high" | "medium" | "low"
  reasoning?: string
  price_per_unit?: number
}

interface ReasoningPopup {
  name: string
  reasoning: string
}

const cardStyle = {
  background: "#111827",
  border: "1px solid #1A2A40",
  borderRadius: 14,
  padding: "20px 24px",
}

const priorityColor = {
  high:   "#EF4444",
  medium: "#F59E0B",
  low:    "#10B981",
}

export default function OrdersPage() {
  const [orders,        setOrders]        = useState<OrderItem[]>([])
  const [calculating,   setCalculating]   = useState(false)
  const [calculated,    setCalculated]    = useState(false)
  const [activeFactors, setActiveFactors] = useState<string[]>([])
  const [note,          setNote]          = useState("")
  const [quantities,    setQuantities]    = useState<Record<string, number>>({})
  const [popup,         setPopup]         = useState<ReasoningPopup | null>(null)

  const toggleFactor = (f: string) =>
    setActiveFactors(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    )

  const handleCalculate = async () => {
    setCalculating(true)
    try {
      const token  = await getToken()
      const params = new URLSearchParams()
      if (activeFactors.length > 0) params.set('factors', activeFactors.join(','))
      if (note.trim())              params.set('note', note.trim())

      const res  = await fetch(`${API_BASE}/orders?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const raw  = await res.json()
      const data = raw.body ? JSON.parse(raw.body) : raw
      if (!data.items) throw new Error('Unauthorized')
      setOrders(data.items)
      setQuantities(Object.fromEntries(data.items.map((i: OrderItem) => [i.item_id, i.suggested_order])))
      setCalculated(true)
    } catch (err) {
      console.error(err)
    } finally {
      setCalculating(false)
    }
  }

  const updateQuantity = (item_id: string, val: number) => {
    setQuantities(prev => ({ ...prev, [item_id]: Math.max(0, val) }))
  }

  const getCost = (item: OrderItem) => {
    const qty          = quantities[item.item_id] ?? item.suggested_order
    const pricePerUnit = item.price_per_unit ?? item.cost / (item.suggested_order || 1)
    return qty * pricePerUnit
  }

  const approveItem = async (item: OrderItem) => {
    const qty   = quantities[item.item_id] ?? item.suggested_order
    const token = await getToken()
    await fetch(`${API_BASE}/orders/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ item_id: item.item_id, approved: true, suggested_order: qty }),
    })
    setOrders(prev => prev.map(o => o.item_id === item.item_id ? { ...o, status: "approved" as const } : o))
  }

  const rejectItem = (item: OrderItem) => {
    setOrders(prev => prev.map(o => o.item_id === item.item_id ? { ...o, status: "rejected" as const } : o))
  }

  const approveAll = async () => {
    const token   = await getToken()
    const pending = orders.filter(o => o.status === "pending")
    await fetch(`${API_BASE}/orders/approve-all`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ items: pending }),
    })
    setOrders(prev => prev.map(o => o.status === "pending" ? { ...o, status: "approved" as const } : o))
  }

  const totalItems    = orders.filter(o => (quantities[o.item_id] ?? o.suggested_order) > 0).length
  const estimatedCost = orders.reduce((sum, o) => sum + getCost(o), 0)
  const pendingCount  = orders.filter(o => o.status === "pending").length

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="Order Management" subtitle="Configure prediction factors, then let the AI calculate your optimal orders" />

      {/* ── Reasoning popup ── */}
      {popup && (
        <div
          onClick={() => setPopup(null)}
          style={{
            position: "fixed", inset: 0, background: "#00000088",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#111827", border: "1px solid #1A2A40", borderRadius: 14,
              padding: "28px 32px", maxWidth: 480, width: "90%"
            }}
          >
            <p style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 600, color: "#3B82F6", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              AI Reasoning
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 700, color: "#EFF6FF" }}>
              {popup.name}
            </p>
            <p style={{ margin: "0 0 24px", fontSize: 14, color: "#8899BB", lineHeight: 1.7 }}>
              {popup.reasoning}
            </p>
            <button
              onClick={() => setPopup(null)}
              style={{ padding: "8px 20px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#1A2A40", color: "#EFF6FF" }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Factors & Calculate panel ── */}
      <div style={cardStyle}>
        <p style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 600, color: "#EFF6FF", fontFamily: "Sora, sans-serif" }}>
          Prediction Factors
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 16 }}>
          {FACTORS.map(f => (
            <button
              key={f}
              onClick={() => toggleFactor(f)}
              style={{
                padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                cursor: "pointer",
                border:     `1px solid ${activeFactors.includes(f) ? "#3B82F6" : "#1A2A40"}`,
                background: activeFactors.includes(f) ? "#3B82F622" : "transparent",
                color:      activeFactors.includes(f) ? "#3B82F6" : "#8899BB",
                transition: "all 0.15s"
              }}
            >
              {f}
            </button>
          ))}
        </div>

        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a custom note for the AI — e.g. 'big catering event Saturday, expect 2x covers'"
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 9, fontSize: 13,
            border: "1px solid #1A2A40", background: "#0D1624", color: "#EFF6FF",
            outline: "none", boxSizing: "border-box", marginBottom: 16
          }}
        />

        <button
          onClick={handleCalculate}
          disabled={calculating}
          style={{
            padding: "10px 28px", borderRadius: 9, fontSize: 14, fontWeight: 700,
            cursor: calculating ? "not-allowed" : "pointer",
            border: "none",
            background: calculating ? "#1A2A40" : "#3B82F6",
            color:      calculating ? "#8899BB" : "#ffffff",
            transition: "all 0.15s"
          }}
        >
          {calculating ? "AI is analyzing your inventory..." : calculated ? "⟳ Recalculate" : "Calculate Order Suggestions"}
        </button>
      </div>

      {/* ── Results ── */}
      {calculated && !calculating && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            <KpiCard title="Total Items to Order"    value={String(totalItems)}             trend={0} icon={<Package size={18} />}     color="#3B82F6" />
            <KpiCard title="Estimated Cost"          value={`$${estimatedCost.toFixed(2)}`} trend={0} icon={<DollarSign size={18} />} color="#10B981" />
            <KpiCard title="Orders Pending Approval" value={String(pendingCount)}           trend={0} icon={<Clock size={18} />}       color="#F59E0B" />
          </div>

          <div style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#EFF6FF", fontFamily: "Sora, sans-serif" }}>
                AI Suggestions
              </p>
              {pendingCount > 0 && (
                <button
                  onClick={approveAll}
                  style={{ padding: "9px 20px", borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: "pointer", border: "none", background: "#3B82F6", color: "#ffffff" }}
                >
                  Approve All
                </button>
              )}
            </div>

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1A2A40" }}>
                  {["Ingredient", "Current Stock", "Predicted Need", "Order Qty (kg)", "Cost", "Priority", "Actions"].map(h => (
                    <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#8899BB", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...orders].sort((a, b) => {
                  const rank = { high: 0, medium: 1, low: 2 }
                  return (rank[a.priority ?? 'low'] ?? 2) - (rank[b.priority ?? 'low'] ?? 2)
                }).map(item => {
                  const qty  = quantities[item.item_id] ?? item.suggested_order
                  const cost = getCost(item)
                  return (
                    <tr key={item.item_id} style={{ borderBottom: "1px solid #1A2A4066" }}>
                      <td style={{ padding: "14px 12px", color: "#EFF6FF", fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: "14px 12px", color: "#8899BB" }}>{item.current_stock} kg</td>
                      <td style={{ padding: "14px 12px", color: "#8899BB" }}>{item.predicted_need} kg</td>
                      <td style={{ padding: "14px 12px" }}>
                        {item.status === "pending" ? (
                          <input
                            type="number"
                            min={0}
                            value={qty}
                            onChange={e => updateQuantity(item.item_id, parseFloat(e.target.value) || 0)}
                            style={{
                              width: 80, padding: "6px 10px", borderRadius: 7, fontSize: 14,
                              fontWeight: 600, border: "1px solid #1A2A40", background: "#0D1624",
                              color: "#EFF6FF", outline: "none", textAlign: "center"
                            }}
                          />
                        ) : (
                          <span style={{ color: "#EFF6FF", fontWeight: 600 }}>{qty} kg</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 12px", color: "#10B981", fontWeight: 600 }}>${cost.toFixed(2)}</td>
                      <td style={{ padding: "14px 12px" }}>
                        {item.priority && (
                          <span style={{
                            display: "inline-block", padding: "3px 10px", borderRadius: 20,
                            fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                            color:      priorityColor[item.priority],
                            background: priorityColor[item.priority] + "22",
                            border:     `1px solid ${priorityColor[item.priority]}44`,
                          }}>
                            {item.priority}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: "14px 12px" }}>
                        {item.status === "approved" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#10B981", background: "#10B98122", border: "1px solid #10B98144" }}>✓ Approved</span>
                        ) : item.status === "rejected" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#EF4444", background: "#EF444422", border: "1px solid #EF444444" }}>✗ Rejected</span>
                        ) : (
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <button onClick={() => approveItem(item)} style={{ padding: "6px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#10B981", color: "#fff" }}>Approve</button>
                            <button onClick={() => rejectItem(item)}  style={{ padding: "6px 14px", borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none", background: "#EF4444", color: "#fff" }}>Reject</button>
                            {item.reasoning && (
                              <button
                                onClick={() => setPopup({ name: item.name, reasoning: item.reasoning! })}
                                style={{ padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: "pointer", border: "1px solid #1A2A40", background: "transparent", color: "#8899BB" }}
                              >
                                Why?
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
