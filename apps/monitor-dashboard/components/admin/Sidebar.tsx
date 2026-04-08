"use client";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  BarChart3, 
  Shield, 
  FileText,
  Bell,
  Database,
  Activity,
  ShieldAlert
} from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Activity, label: "Monitoramento", href: "/services" },
  { icon: Shield, label: "Segurança", href: "/security" },
  { icon: ShieldAlert, label: "Eventos", href: "/events" },
  { icon: FileText, label: "Firewall", href: "/firewall" },
  { icon: Settings, label: "Configurações", href: "/settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <aside
      className={`${
        collapsed ? "w-20" : "w-64"
      } transition-all duration-300 glass border-r border-white/5 flex flex-col`}
    >
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-lg font-black glow-accent"
            style={{ background: "linear-gradient(135deg, #3b5bfc, #6c8dff)" }}
          >
            V
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-lg font-bold text-gradient">VPS Monitor</h1>
              <p className="text-xs text-slate-500">Admin Dashboard</p>
            </div>
          )}
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                active
                  ? "bg-linear-to-r from-[#3b5bfc]/20 to-[#6c8dff]/10 text-white border border-[#3b5bfc]/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
        >
          {collapsed ? "→" : "←"}
        </button>
      </div>
    </aside>
  );
}
