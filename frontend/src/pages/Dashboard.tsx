import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useDashboard } from "../hooks/useDashboard";
import KpiCard from "../components/ui/KpiCard";
import PageHeader from "../components/ui/PageHeader";
import { DashboardSkeleton } from "../components/ui/Skeleton";

const PIE_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444"];

const cardStyle = {
  background: "#111827",
  border: "1px solid #1A2A40",
  borderRadius: 14,
  padding: "20px 24px",
};

export default function DashboardPage() {
  const { data, loading, error } = useDashboard();

  if (loading) return <DashboardSkeleton />;
  if (error) return <div style={{ color: "#EF4444", padding: 32 }}>Error: {error}</div>;
  if (!data) return null;

  const totalDishes = data.popular_dishes.reduce((s, d) => s + d.count, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader title="Hello, Israel" subtitle="Here is today's operational overview" />

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
        <KpiCard
          title="Total Revenue Today"
          value={`$${data.revenue_today.toLocaleString()}`}
          trend={data.trends.revenue}
          icon={<DollarSign size={18} />}
          color="#3B82F6"
        />
        <KpiCard
          title="Total Orders Today"
          value={String(data.orders_today)}
          trend={data.trends.orders}
          icon={<ShoppingCart size={18} />}
          color="#10B981"
        />
        <KpiCard
          title="Average Order Value"
          value={`$${data.avg_order_value.toFixed(2)}`}
          trend={data.trends.avg_order_value}
          icon={<TrendingUp size={18} />}
          color="#8B5CF6"
        />
        <KpiCard
          title="Active Employees"
          value={String(data.active_employees)}
          trend={0}
          icon={<Users size={18} />}
          color="#F59E0B"
        />
      </div>

      {/* Charts row 1 — Weekly Revenue + Popular Dishes */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        <div style={cardStyle}>
          <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#EFF6FF", fontFamily: "Sora, sans-serif" }}>
            Revenue This Week
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.weekly_revenue}>
              <XAxis dataKey="day" stroke="#8899BB" tick={{ fontSize: 12 }} />
              <YAxis stroke="#8899BB" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#0C1422", border: "1px solid #1A2A40", borderRadius: 8, color: "#EFF6FF" }} />
              <Bar dataKey="amount" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={cardStyle}>
          <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#EFF6FF", fontFamily: "Sora, sans-serif" }}>
            Most Popular Dishes
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.popular_dishes} layout="vertical">
              <XAxis type="number" stroke="#8899BB" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" stroke="#8899BB" tick={{ fontSize: 12 }} width={70} />
              <Tooltip contentStyle={{ background: "#0C1422", border: "1px solid #1A2A40", borderRadius: 8, color: "#EFF6FF" }} />
              <Bar dataKey="count" fill="#10B981" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 — Orders by Dish pie */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16 }}>
        <div style={cardStyle}>
          <p style={{ margin: "0 0 16px", fontSize: 15, fontWeight: 600, color: "#EFF6FF", fontFamily: "Sora, sans-serif" }}>
            Orders by Dish
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={data.popular_dishes} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="count" nameKey="name">
                {data.popular_dishes.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0C1422", border: "1px solid #1A2A40", borderRadius: 8, color: "#EFF6FF" }}
                formatter={(value) => [typeof value === "number" ? value : Number(value ?? 0), "orders"]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
            {data.popular_dishes.map((dish, index) => (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: PIE_COLORS[index % PIE_COLORS.length], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 13, color: "#8899BB" }}>{dish.name}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#EFF6FF" }}>
                  {totalDishes > 0 ? Math.round((dish.count / totalDishes) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
