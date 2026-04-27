import { DollarSign, ShoppingCart, TrendingUp, Users } from "lucide-react";
import KpiCard from "../components/ui/KpiCard";
import PageHeader from "../components/ui/PageHeader";

export default function DashboardPage() {
  return (
    <div>
      <div>
        <PageHeader
          title="Hello,Israel"
          subtitle="Here is today's operational overview"
        />
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
        }}
      >
        <KpiCard
          title="Total Revenue Today"
          value="$8,430"
          trend={12}
          icon={<DollarSign size={18} />}
          color="#3B82F6"
        />
        <KpiCard
          title="Total Orders Today"
          value="214"
          trend={8}
          icon={<ShoppingCart size={18} />}
          color="#10B981"
        />
        <KpiCard
          title="Average Order Value"
          value="$39.40"
          trend={-2}
          icon={<TrendingUp size={18} />}
          color="#8B5CF6"
        />
        <KpiCard
          title="Active Employees"
          value="18"
          trend={0}
          icon={<Users size={18} />}
          color="#F59E0B"
        />
      </div>
    </div>
  );
}
