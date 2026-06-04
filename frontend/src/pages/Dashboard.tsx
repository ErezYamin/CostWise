import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useDashboard } from "../hooks/useDashboard";
import KpiCard from "../components/ui/KpiCard";
import PageHeader from "../components/ui/PageHeader";

const revenueData = [
  { day: "Mon", revenue: 1200 },
  { day: "Tue", revenue: 980 },
  { day: "Wed", revenue: 1450 },
  { day: "Thu", revenue: 1100 },
  { day: "Fri", revenue: 1800 },
  { day: "Sat", revenue: 2100 },
  { day: "Sun", revenue: 1600 },
];

const ordersData = [
  { name: "Main Course", value: 45 },
  { name: "Drinks", value: 25 },
  { name: "Desserts", value: 15 },
  { name: "Starters", value: 15 },
];

const PIE_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B"];

const cardStyle = {
  background: "#111827",
  border: "1px solid #1A2A40",
  borderRadius: 14,
  padding: "20px 24px",
};

export default function DashboardPage() {
  const { data, loading, error } = useDashboard();
  if (loading)
    return <div style={{ color: "#EFF6FF", padding: 32 }}>Loading...</div>;
  if (error)
    return (
      <div style={{ color: "#EF4444", padding: 32 }}>
        Error:
        {error}
      </div>
    );
  if (!data) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <PageHeader
        title="Hello, Israel"
        subtitle="Here is today's operational overview"
      />

      {/* KPI Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <KpiCard
          title="Total Revenue Today"
          value={`$${data.revenue_today.toLocaleString()}`}
          trend={12}
          icon={<DollarSign size={18} />}
          color="#3B82F6"
        />
        <KpiCard
          title="Total Orders Today"
          value={String(data.orders_today)}
          trend={8}
          icon={<ShoppingCart size={18} />}
          color="#10B981"
        />
        <KpiCard
          title="Average Order Value"
          value={`$${data.avg_order_value.toFixed(2)}`}
          trend={-2}
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

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
        {/* Bar Chart */}
        <div style={cardStyle}>
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 15,
              fontWeight: 600,
              color: "#EFF6FF",
              fontFamily: "Sora, sans-serif",
            }}
          >
            Revenue This Week
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.weekly_revenue}>
              <XAxis dataKey="day" stroke="#8899BB" tick={{ fontSize: 12 }} />
              <YAxis stroke="#8899BB" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#0C1422",
                  border: "1px solid #1A2A40",
                  borderRadius: 8,
                  color: "#EFF6FF",
                }}
              />
              <Bar dataKey="amount" fill="#3B82F6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div style={cardStyle}>
          <p
            style={{
              margin: "0 0 16px",
              fontSize: 15,
              fontWeight: 600,
              color: "#EFF6FF",
              fontFamily: "Sora, sans-serif",
            }}
          >
            Orders by Category
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={ordersData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
              >
                {ordersData.map((_, index) => (
                  <Cell key={index} fill={PIE_COLORS[index]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#0C1422",
                  border: "1px solid #1A2A40",
                  borderRadius: 8,
                  color: "#EFF6FF",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 16,
            }}
          >
            {ordersData.map((item, index) => (
              <div
                key={index}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: PIE_COLORS[index],
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, fontSize: 13, color: "#8899BB" }}>
                  {item.name}
                </span>
                <span
                  style={{ fontSize: 13, fontWeight: 600, color: "#EFF6FF" }}
                >
                  {item.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
