import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  BarChart2,
  MessageSquare,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { colors } from "../styles/tokens";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/orders", label: "Order Management", icon: ShoppingCart },
  { to: "/workforce", label: "Workforce Management", icon: Users },
  { to: "/data", label: "Data Analysis", icon: BarChart2 },
  { to: "/chatbot", label: "Chatbot Assistant", icon: MessageSquare },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  return (
    <aside
      style={{
        width: 260,
        minWidth: 260,
        height: "100vh",
        background: colors.sidebar,
        borderRight: `1px solid ${colors.border}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "24px 20px",
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              background: "linear-gradient(135deg, #3B82F6, #10B981)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <BarChart2 size={20} color="white" />
          </div>
          <span
            style={{
              fontFamily: "Sora, sans-serif",
              fontSize: 22,
              fontWeight: 800,
              background:
                "linear-gradient(135deg, #60A5FA, #3B82F6 50%, #10B981)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            CostWise
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            style={({ isActive }) => ({
              display: "flex",
              alignItems: "center",
              padding: "10px 12px",
              borderRadius: 10,
              marginBottom: 4,
              color: isActive ? "#93C5FD" : colors.muted,
              fontSize: isActive ? 15 : 14,
              fontWeight: isActive ? 700 : 500,
              textDecoration: "none",
              background: isActive ? "rgba(59,130,246,0.12)" : "transparent",
              border: isActive
                ? "1px solid rgba(59,130,246,0.15)"
                : "1px solid transparent",
            })}
          >
            <item.icon size={17} style={{ flexShrink: 0 }} />
            <span style={{ marginLeft: 10 }}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div style={{ padding: 16, borderTop: `1px solid ${colors.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Sora, sans-serif",
              fontWeight: 700,
              fontSize: 17,
              color: "white",
              flexShrink: 0,
            }}
          >
            II
          </div>
          <div>
            <p
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: colors.text,
                margin: 0,
              }}
            >
              Israel Israeli
            </p>
            <p style={{ fontSize: 11, color: "#5C7A94", margin: "2px 0 0" }}>
              Restaurant Manager
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
