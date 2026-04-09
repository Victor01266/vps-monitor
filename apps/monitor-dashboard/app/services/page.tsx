"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { useCallback, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { fetchServices } from "@/lib/api";
import {
  RefreshCw, Box, Globe, Bot, Workflow, CreditCard,
  BarChart2, MessageSquare, Database, Monitor, Layers,
  MessageCircle, Server, CheckCircle2, AlertTriangle,
  Activity,
} from "lucide-react";

interface Container {
  name: string;
  image: string;
  ports: string;
  status: string;
  state?: string;
  virtual?: boolean;
}

interface ServicesResponse {
  containers: Container[];
  total: number;
  healthy: number;
  unhealthy: number;
  running: number;
}

type Filter = "all" | "running" | "stopped";

function getServiceIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("nginx") || n.includes("glpi")) return Globe;
  if (n.includes("bot") || n.includes("cobra")) return Bot;
  if (n.includes("n8n") || n.includes("workflow")) return Workflow;
  if (n.includes("credit") || n.includes("cadas")) return CreditCard;
  if (n.includes("rank") || n.includes("meta")) return BarChart2;
  if (n.includes("evol") || n.includes("evo")) return MessageSquare;
  if (n.includes("db") || n.includes("postgres") || n.includes("redis") || n.includes("mysql") || n.includes("mongo")) return Database;
  if (n.includes("monitor")) return Monitor;
  if (n.includes("chat")) return MessageCircle;
  return Box;
}

function parseUptime(status: string): string {
  const m = status.match(/Up\s+([\w\s]+?)(?:\s*\(|$)/i);
  return m ? m[1].trim() : "";
}

function getStatusInfo(container: Container) {
  const s = container.status.toLowerCase();
  const isUp = s.includes("up");
  const isUnhealthy = isUp && s.includes("unhealthy");
  const isHealthy = isUp && s.includes("healthy") && !isUnhealthy;

  if (!isUp) return {
    label: "Offline", color: "#AEB9E1",
    bg: "rgba(174,185,225,0.10)", border: "rgba(174,185,225,0.20)",
    glow: "", pulse: false,
  };
  if (isUnhealthy) return {
    label: "Unhealthy", color: "#ef4444",
    bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.30)",
    glow: "0 0 28px rgba(239,68,68,0.14)", pulse: true,
  };
  if (isHealthy) return {
    label: "Healthy", color: "#10b981",
    bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.30)",
    glow: "0 0 28px rgba(16,185,129,0.10)", pulse: true,
  };
  return {
    label: container.virtual ? "Online" : "Running", color: "#00c2ff",
    bg: "rgba(0,194,255,0.10)", border: "rgba(0,194,255,0.28)",
    glow: "0 0 28px rgba(0,194,255,0.10)", pulse: true,
  };
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "running", label: "Ativos" },
  { id: "stopped", label: "Parados" },
];

export default function ServicesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const servicesFetcher = useCallback(
    () => (fetchServices() as Promise<ServicesResponse>).then((d) => { setLastUpdated(new Date()); return d; }),
    []
  );

  const { data, loading, refetch } = usePolling(servicesFetcher, 15000);

  const containers: Container[] = data?.containers ?? [];
  const totalCount   = containers.length;
  const runningCount = containers.filter((c) => c.status.toLowerCase().includes("up")).length;
  const healthyCount = containers.filter((c) => { const s = c.status.toLowerCase(); return s.includes("healthy") && !s.includes("unhealthy"); }).length;
  const degradedCount = containers.filter((c) => c.status.toLowerCase().includes("unhealthy")).length;

  const filtered = containers.filter((c) => {
    if (filter === "running") return c.status.toLowerCase().includes("up");
    if (filter === "stopped") return !c.status.toLowerCase().includes("up");
    return true;
  });

  const summaryStats = [
    { label: "Total", value: totalCount, color: "#AEB9E1", Icon: Layers },
    { label: "Ativos", value: runningCount, color: "#00c2ff", Icon: Activity },
    { label: "Healthy", value: healthyCount, color: "#10b981", Icon: CheckCircle2 },
    { label: "Degradados", value: degradedCount, color: "#ef4444", Icon: AlertTriangle },
  ];

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* ── Page header ───────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-semibold text-white">Serviços</h2>
            <p className="text-sm mt-1" style={{ color: "var(--foreground-muted)" }}>
              Status em tempo real de todos os containers e processos na VPS.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="font-data text-xs" style={{ color: "var(--foreground-muted)" }}>
                {lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            <button
              onClick={refetch}
              disabled={loading}
              aria-label="Atualizar serviços"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
              style={{ background: "rgba(203,60,255,0.10)", border: "1px solid rgba(203,60,255,0.25)", color: "var(--accent)" }}
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>

        {/* ── Summary stats ─────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {summaryStats.map(({ label, value, color, Icon }, i) => (
            <div
              key={label}
              className="stat-enter"
              style={{
                animationDelay: `${i * 0.07}s`,
                background: "var(--surface)",
                border: "1px solid #343B4F",
                borderRadius: "var(--radius)",
                padding: "16px 20px",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${color}18`,
              }}>
                <Icon size={18} color={color} />
              </div>
              <div>
                <p className="font-data text-xl font-bold" style={{ color, lineHeight: 1 }}>
                  {loading && !data ? "—" : value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--foreground-muted)" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ───────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className="px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer"
              style={
                filter === id
                  ? { background: "linear-gradient(135deg,#cb3cff 20%,#7f25fb 68%)", color: "#fff", boxShadow: "0 0 14px rgba(203,60,255,0.35)" }
                  : { background: "transparent", border: "1px solid #343B4F", color: "var(--foreground-muted)" }
              }
            >
              {label}
              {id === "all" && totalCount > 0 && (
                <span className="ml-1.5 font-data text-xs opacity-60">{totalCount}</span>
              )}
            </button>
          ))}
        </div>

        {/* ── Cards ─────────────────────────────────────────── */}
        {loading && !data ? (
          /* Skeleton */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="fade-in"
                style={{
                  animationDelay: `${i * 0.06}s`,
                  background: "var(--surface)",
                  border: "1px solid #343B4F",
                  borderRadius: "var(--radius)",
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
                  <div style={{ width: 42, height: 42, borderRadius: 10, background: "#1e2a4a" }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ height: 13, borderRadius: 6, background: "#1e2a4a", width: "55%" }} />
                    <div style={{ height: 9, borderRadius: 6, background: "#1e2a4a40", width: "75%" }} />
                  </div>
                </div>
                <div style={{ height: 1, background: "#343B4F", marginBottom: 14 }} />
                <div style={{ height: 9, borderRadius: 6, background: "#1e2a4a40", width: "35%" }} />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          /* Empty state */
          <div
            className="flex flex-col items-center justify-center py-16 rounded-xl"
            style={{ border: "1px dashed #343B4F" }}
          >
            <Server size={32} style={{ color: "var(--foreground-muted)", marginBottom: 12 }} />
            <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
              {filter === "all"
                ? "Nenhum serviço encontrado."
                : `Nenhum serviço ${filter === "running" ? "ativo" : "parado"} no momento.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((container, i) => {
              const st = getStatusInfo(container);
              const Icon = getServiceIcon(container.name);
              const uptime = parseUptime(container.status);
              const imageParts = container.image.split(":");
              const imageBase = (imageParts[0].split("/").pop() ?? imageParts[0]);
              const imageTag  = imageParts[1] ?? "latest";

              return (
                <div
                  key={container.name}
                  className="card-glow stat-enter"
                  style={{ animationDelay: `${i * 0.04}s`, position: "relative", zIndex: 0 }}
                >
                  <div
                    style={{
                      background: "var(--surface)",
                      borderRadius: "var(--radius)",
                      border: "1px solid #343B4F",
                      padding: "20px",
                      position: "relative",
                      zIndex: 1,
                      boxShadow: st.glow || undefined,
                      transition: "border-color 0.25s, box-shadow 0.25s",
                    }}
                  >
                    {/* HOST badge */}
                    {container.virtual && (
                      <span
                        className="absolute"
                        style={{
                          top: 12, right: 12,
                          fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
                          padding: "2px 7px", borderRadius: 20,
                          background: "rgba(0,194,255,0.08)",
                          border: "1px solid rgba(0,194,255,0.20)",
                          color: "#00c2ff",
                        }}
                      >
                        HOST
                      </span>
                    )}

                    {/* Service header */}
                    <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 16 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 11, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        background: `${st.color}18`, border: `1px solid ${st.color}28`,
                      }}>
                        <Icon size={20} color={st.color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingRight: container.virtual ? 40 : 0 }}>
                        <p style={{ color: "white", fontWeight: 600, fontSize: 15, lineHeight: "1.3", marginBottom: 3 }}>
                          {container.name}
                        </p>
                        <p
                          className="font-data"
                          style={{ color: "var(--foreground-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          title={container.image}
                        >
                          {imageBase}
                          <span style={{ color: "#343B4F", margin: "0 3px" }}>:</span>
                          <span style={{ color: "var(--accent-2)" }}>{imageTag}</span>
                        </p>
                      </div>
                    </div>

                    {/* Divider */}
                    <div style={{ height: 1, background: "#343B4F28", marginBottom: 14 }} />

                    {/* Status + uptime row */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: st.bg, border: `1px solid ${st.border}`,
                        borderRadius: 20, padding: "4px 10px", flexShrink: 0,
                      }}>
                        <span
                          className={st.pulse ? "pulse-dot" : ""}
                          style={{ width: 6, height: 6, borderRadius: "50%", background: st.color, flexShrink: 0, display: "inline-block" }}
                        />
                        <span style={{ color: st.color, fontSize: 11, fontWeight: 600 }}>{st.label}</span>
                      </span>

                      {uptime && (
                        <span className="font-data" style={{ color: "var(--foreground-muted)", fontSize: 10, flexShrink: 0 }}>
                          ↑ {uptime}
                        </span>
                      )}
                    </div>

                    {/* Ports */}
                    {container.ports && (
                      <p
                        className="font-data"
                        style={{
                          marginTop: 10, paddingTop: 10,
                          borderTop: "1px solid #343B4F28",
                          color: "rgba(174,185,225,0.5)",
                          fontSize: 9,
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                        title={container.ports}
                      >
                        {container.ports}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
