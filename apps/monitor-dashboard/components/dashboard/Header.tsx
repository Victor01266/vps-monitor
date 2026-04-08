"use client";
import { useState, useEffect } from "react";
import { Shield, Activity, Wifi, WifiOff, Clock } from "lucide-react";

interface HeaderProps {
  connected: boolean;
  alertCount: number;
  uptime?: string;
}

export function Header({ connected, alertCount, uptime }: HeaderProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = now
    ? now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "--:--:--";
  const dateStr = now
    ? now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
    : "---";

  return (
    <header className="sticky top-0 z-40 px-4 pt-4 pb-2">
      <div className="navbar-pill max-w-screen-2xl mx-auto rounded-2xl px-5 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #CB3CFF 20%, #7F25FB 68%)" }}
            >
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span
              className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-[#08101e] pulse-dot"
              style={{ background: connected ? "#10b981" : "#ef4444" }}
            />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">
              <span className="text-gradient">Dashdark X</span>
            </h1>
            <p className="text-[9px] tracking-widest uppercase" style={{ color: "#AEB9E1" }}>Reports overview</p>
          </div>
        </div>

        {/* Centro */}
        <div className="hidden md:flex items-center gap-5">
          {uptime && (
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" style={{ color: "#AEB9E1" }} />
              <span className="text-[10px] font-mono" style={{ color: "#AEB9E1" }}>{uptime}</span>
            </div>
          )}
          <div className="flex flex-col items-center">
            <span className="text-sm font-mono text-white/80 tabular-nums tracking-widest">{timeStr}</span>
            <span className="text-[9px] capitalize tracking-wider" style={{ color: "#AEB9E1" }}>{dateStr}</span>
          </div>
        </div>

        {/* Direita */}
        <div className="flex items-center gap-2">
          {alertCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl glass-danger">
              <Activity className="w-3 h-3 text-red-400 pulse-dot" />
              <span className="text-xs font-bold text-red-300 font-mono">{alertCount}</span>
            </div>
          )}

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              connected
                ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}
          >
            {connected ? (
              <Wifi className="w-3 h-3" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {connected ? "Live" : "Offline"}
          </div>
        </div>
      </div>
    </header>
  );
}
