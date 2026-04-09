"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import {
  Activity,
  Bell,
  Search,
  Shield,
  User,
  Wifi,
  WifiOff,
  Server,
  Lock,
  ShieldAlert,
  X,
  Menu,
  LayoutDashboard,
} from "lucide-react";
import { ShieldLogo } from "@/components/ui/ShieldLogo";
import { Badge } from "@/components/ui/Badge";
import { useWebSocket } from "@/hooks/useWebSocket";

const sidebarItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Serviços", icon: Server, href: "/services" },
  { label: "Firewall", icon: Shield, href: "/firewall" },
  { label: "Segurança", icon: Lock, href: "/security" },
  { label: "Eventos", icon: ShieldAlert, href: "/events" },
  { label: "Configurações", icon: Activity, href: "/settings" },
];

export function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { connected, alerts } = useWebSocket();
  const [showAlerts, setShowAlerts] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setShowAlerts(false);
      }
    }
    if (showAlerts) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showAlerts]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSidebarOpen(false);
    };
    if (sidebarOpen) document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [sidebarOpen]);

  const unread = alerts.length;

  const eventLabel: Record<string, string> = {
    brute_force: "Brute force",
    invalid_user: "Invalid user",
    accepted_login: "Login aceito",
    fail2ban_ban: "Banido",
    fail2ban_unban: "Desbanido",
  };

  return (
    <div className="h-screen overflow-hidden bg-[#081028] text-white">
      <div className="flex h-full">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setSidebarOpen(false)}>
            <div className="fixed inset-0 bg-black/50" />
          </div>
        )}

        {/* Sidebar */}
        <aside className={`fixed top-0 left-0 z-50 w-[280px] h-screen bg-[#081028] border-r border-[#0B1739] shadow-[0px_8px_28px_0px_rgba(1,5,17,0.30)] transform transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}>
          {/* Mobile sidebar content */}
          <div className="flex flex-col h-full px-6 py-6">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <ShieldLogo size={28} />
                <h1 className="text-xl font-semibold">Dash VPS</h1>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-[#AEB9E1] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="space-y-2 flex-1">
              {sidebarItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`px-3 py-3 rounded-md border flex items-center gap-2 transition-colors ${
                      isActive
                        ? "bg-[#0A1330] border-[#343B4F]"
                        : "bg-transparent border-transparent hover:bg-[#0A1330]/50"
                    } w-full text-left`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-[#AEB9E1]"}`} />
                    <span className={`text-sm ${isActive ? "text-white" : "text-[#AEB9E1]"}`}>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-[#0B1739]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#CB3CFF] flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm text-white">VPS Operator</p>
                  <p className="text-xs text-[#AEB9E1]">Account settings</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Desktop sidebar */}
        <aside className={`hidden xl:flex shrink-0 flex-col border-r border-[#0B1739] bg-[#081028] shadow-[0px_8px_28px_0px_rgba(1,5,17,0.30)] py-8 transition-all duration-300 overflow-hidden ${
          sidebarCollapsed ? "w-[72px] px-3" : "w-[300px] px-7"
        }`}>
          <div className={`flex items-center mb-10 ${sidebarCollapsed ? "flex-col gap-3" : "justify-between"}`}>
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? "hidden" : ""}`}>
              <ShieldLogo size={28} />
              <h1 className="text-xl font-semibold">Dash VPS</h1>
            </div>
            {sidebarCollapsed && <ShieldLogo size={28} />}
            <button
              onClick={() => setSidebarCollapsed(v => !v)}
              title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
              className="p-1.5 rounded-md text-[#AEB9E1] hover:text-white hover:bg-[#0B1739] transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {!sidebarCollapsed && (
            <div className="mb-8 rounded-md border border-[#343B4F] bg-[#0B1739] px-3 py-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#AEB9E1]" />
              <span className="text-xs text-[#AEB9E1]">Search for...</span>
            </div>
          )}

          <nav className="space-y-1 flex-1">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              if (isActive) {
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    title={sidebarCollapsed ? item.label : undefined}
                    style={{ position: 'relative', display: 'flex', width: '100%', height: 42, alignItems: 'center' }}
                  >
                    {/* bg base */}
                    <span style={{ position: 'absolute', inset: 0, background: '#0A1330', borderRadius: 4, border: '0.6px solid #0A1330' }} />
                    {/* overlay */}
                    <span style={{ position: 'absolute', inset: 0, background: 'rgba(126,137,172,0.18)', borderRadius: 4 }} />
                    {/* barra roxa esquerda */}
                    <span style={{ position: 'absolute', left: 0, top: -1, width: 3.2, height: 44, background: '#CB3CFF', borderRadius: '2px 0 0 2px' }} />
                    {/* conteúdo */}
                    <span style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, paddingLeft: sidebarCollapsed ? 0 : 14, width: '100%', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
                      <item.icon className="w-4 h-4 shrink-0 text-white" />
                      {!sidebarCollapsed && (
                        <span style={{ color: 'white', fontSize: 14, fontWeight: 500, lineHeight: '14px' }}>{item.label}</span>
                      )}
                    </span>
                  </Link>
                );
              }
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={`flex items-center gap-2 rounded-md transition-colors hover:bg-[#0A1330]/50 w-full text-[#AEB9E1] hover:text-white ${sidebarCollapsed ? "justify-center px-0 py-2.5" : "px-3.5 py-2.5"}`}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="mt-8 pt-6 border-t border-[#0B1739]">
            <div className={`flex items-center gap-3 mb-4 ${sidebarCollapsed ? "justify-center" : ""}`}>
              <div className="w-9 h-9 rounded-full bg-[#CB3CFF] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
              {!sidebarCollapsed && (
                <div>
                  <p className="text-sm text-white">VPS Operator</p>
                  <p className="text-xs text-[#AEB9E1]">Account settings</p>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <header className="sticky top-0 z-20 bg-[#081028]/95 backdrop-blur border-b border-[#0B1739] px-4 md:px-8 py-4">
            <div className="w-full mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Mobile: abre drawer */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="xl:hidden p-2 rounded-md text-[#AEB9E1] hover:text-white hover:bg-[#0B1739] transition-colors"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl md:text-2xl font-semibold">VPS Central Monitor</h2>
                  <p className="text-xs text-[#AEB9E1] mt-1 hidden md:block">Monitoramento em tempo real da infraestrutura e segurança da VPS.</p>
                </div>
              </div>

              <div className="flex items-center gap-2 relative" ref={panelRef}>
                <button
                  onClick={() => setShowAlerts((v) => !v)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[#AEB9E1] hover:text-white hover:bg-[#0B1739] transition-colors border border-transparent hover:border-[#343B4F]"
                >
                  <Bell className="w-3.5 h-3.5" />
                  Alertas
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-0.5">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </button>

                <Badge variant={connected ? "success" : "danger"}>
                  {connected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {connected ? "Live" : "Offline"}
                </Badge>

                {showAlerts && (
                  <div className="absolute top-full right-0 mt-2 w-80 rounded-xl bg-[#0B1739] border border-[#343B4F] shadow-2xl z-50 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-[#343B4F]">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-[#CB3CFF]" />
                        <span className="text-xs font-semibold text-white">Alertas em Tempo Real</span>
                      </div>
                      <button onClick={() => setShowAlerts(false)} className="text-[#AEB9E1] hover:text-white">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                      {alerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 gap-2">
                          <Wifi className="w-6 h-6 text-[#343B4F]" />
                          <p className="text-xs text-[#AEB9E1]">{connected ? "Sem alertas recentes" : "Aguardando conexão..."}</p>
                        </div>
                      ) : (
                        alerts.slice(0, 50).map((alert, i) => (
                          <div
                            key={i}
                            className="px-4 py-2.5 border-b border-[#343B4F]/50 hover:bg-[#0A1330] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className={`text-[11px] font-medium ${
                                alert.event === "accepted_login" || alert.event === "fail2ban_unban"
                                  ? "text-emerald-400"
                                  : alert.event === "fail2ban_ban"
                                  ? "text-amber-400"
                                  : "text-red-400"
                              }`}>
                                {eventLabel[alert.event] ?? alert.event}
                              </span>
                              <span className="text-[9px] text-[#AEB9E1] font-mono shrink-0">
                                {new Date(alert.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </span>
                            </div>
                            {alert.ip && (
                              <p className="text-[10px] font-mono text-[#AEB9E1] mt-0.5">{alert.ip}{alert.user ? ` · ${alert.user}` : ""}</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="px-4 py-2 border-t border-[#343B4F] flex items-center justify-between">
                      <span className="text-[10px] text-[#AEB9E1]">{alerts.length} evento{alerts.length !== 1 ? "s" : ""} na sessão</span>
                      <div className="flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
                        <span className="text-[10px] text-[#AEB9E1]">{connected ? "Conectado" : "Desconectado"}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 min-h-0 overflow-y-auto w-full mx-auto px-4 md:px-8 py-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
