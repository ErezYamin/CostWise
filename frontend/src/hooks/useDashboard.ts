import { useState, useEffect } from "react";
import { API_BASE } from "../config";
import { getToken } from "../lib/auth";

export interface DashboardData {
  revenue_today: number;
  orders_today: number;
  avg_order_value: number;
  active_employees: number;
  weekly_revenue: { day: string; amount: number }[];
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        const payload = json.body ? JSON.parse(json.body) : json;
        setData(payload);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return { data, loading, error };
}
