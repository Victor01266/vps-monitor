"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { useCallback, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { fetchServices } from "@/lib/api";
import {
  RefreshCw, Box, Globe, Bot, Workflow, CreditCard,
  BarChart2, MessageSquare, Database, Monitor, Layers,
  MessageCircle, Server, CheckCircle2, AlertTriangle,
  Activity, Zap, GitBranch, Cloud, Hash, ArrowDownUp,
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
  if (n.includes("nginx") || n.includes("web")) return Globe;
  if (n.includes("glpi")) return Hash;
  if (n.includes("n8n")) return Workflow;
  if (n.includes("bot") || n.includes("cobra")) return Bot;
  if (n.includes("credit") || n.includes("cadas")) return CreditCard;
  if (n.includes("rank") || n.includes("meta")) return BarChart2;
  if (n.includes("evol") || n.includes("evo")) return MessageSquare;
  if (n.includes("postgres") || n.includes("redis") || n.includes("mysql") || n.includes("mongo") || n.includes("db")) return Database;
  if (n.includes("monitor")) return Monitor;
  if (n.includes("chat")) return MessageCircle;
  if (n.includes("api") || n.includes("backend")) return Zap;
  if (n.includes("git")) return GitBranch;
  if (n.includes("proxy") || n.includes("traefik")) return Cloud;
  return Box;
}

function getServiceAccent(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("nginx") || n.includes("web") || n.includes("proxy")) return "#3b82f6";
  if (n.includes("n8n") || n.includes("workflow")) return "#f59e0b";
  if (n.includes("bot") || n.includes("cobra")) return "#8b5cf6";
  if (n.includes("credit") || n.includes("cadas")) return "#10b981";
  if (n.includes("rank") || n.includes("meta")) return "#ec4899";
  if (n.includes("evol") || n.includes("evo")) return "#06b6d4";
  if (n.includes("postgres") || n.includes("redis") || n.includes("mysql") || n.includes("mongo") || n.includes("db")) return "#f97316";
  if (n.includes("monitor")) return "#cb3cff";
  if (n.includes("glpi")) return "#14b8a6";
  if (n.includes("chat")) return "#22d3ee";
  return "#6366f1";
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
    label: "Offline", color: "#6b7280",
    bg: "rgba(107,114,128,0.10)", border: "rgba(107,114,128,0.25)",
    glow: "", pulse: false,
  };
  if (isUnhealthy) return {
    label: "Unhealthy", color: "#ef4444",
    bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)",
    glow: "0 0 24px rgba(239,68,68,0.12)", pulse: true,
  };
  if (isHealthy) return {
    label: "Healthy", color: "#10b981",
    bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)",
    glow: "0 0 24px rgba(16,185,129,0.08)", pulse: true,
  };
  return {
    label: container.virtual ? "Online" : "Running", color: "#00c2ff",
    bg: "rgba(0,194,255,0.10)", border: "rgba(0,194,255,0.30)",
    glow: "0 0 24px rgba(0,194,255,0.08)", pulse: true,
  };
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Todos" },
  { id: "running", label: "Ativos" },
  { id: "stopped", label: "Parados" },
];

function CardGrid({ items, startIndex = 0 }: { items: Container[]; startIndex?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
      {items.map((container, i) => {
        const st = getStatusInfo(container);
        const accent = getServiceAccent(container.name);
        const Icon = getServiceIcon(container.name);
        const uptime = parseUptime(container.status);
        const imageParts = container.image.split(":");
        const imageBase = imageParts[0].split("/").pop() ?? imageParts[0];
        const imageTag  = imageParts[1] ?? "latest";
        const isActive  = container.status.toLowerCase().includes("up");

        return (
          <div
            key={container.name}
            className="card-glow stat-enter"
            style={{ animationDelay: `${(startIndex + i) * 0.04}s`, position: "relative", zIndex: 0 }}
          >
            <div
              style={{
                background: isActive ? "var(--surface)" : "rgba(8,16,40,0.6)",
                borderRadius: "var(--radius)",
                border: isActive ? `1px solid ${accent}28` : "1px solid #1e2a4a",
                padding: "18px 20px",
                position: "relative",
                zIndex: 1,
                boxShadow: st.glow || undefined,
                transition: "border-color 0.25s, box-shadow 0.25s",
                opacity: isActive ? 1 : 0.65,
              }}
            >
              {isActive && (
                <div style={{
                  position: "absolute", top: 0, left: 20, right: 20, height: 2,
                  background: `linear-gradient(90deg, ${accent}99, ${accent}22)`,
                  borderRadius: "0 0 4px 4px",
                }} />
              )}

              {container.virtual && (
                <span style={{
                  position: "absolute", top: 12, right: 12,
                  fontSize: 9, fontWeight: 600, letterSpacing: "0.06em",
                  padding: "2px 7px", borderRadius: 20,
                  background: "rgba(0,194,255,0.08)",
                  border: "1px solid rgba(0,194,255,0.20)",
                  color: "#00c2ff",
                }}>
                  HOST
                </span>
              )}

              <div style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 14 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: isActive ? `${accent}20` : "rgba(107,114,128,0.10)",
                  border: `1px solid ${isActive ? accent : "#343B4F"}28`,
                }}>
                  <Icon size={19} color={isActive ? accent : "#6b7280"} />
                </div>
                <div style={{ flex: 1, minWidth: 0, paddingRight: container.virtual ? 42 : 0 }}>
                  <p style={{ color: isActive ? "white" : "#6b7280", fontWeight: 600, fontSize: 14, lineHeight: "1.3", marginBottom: 3 }}>
                    {container.name}
                  </p>
                  <p
                    className="font-data"
                    style={{ color: "var(--foreground-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={container.image}
                  >
                    {imageBase}
                    <span style={{ color: "#343B4F", margin: "0 3px" }}>:</span>
                    <span style={{ color: isActive ? "#00c2ff" : "#4b5563" }}>{imageTag}</span>
                  </p>
                </div>
              </div>

              <div style={{ height: 1, background: "#343B4F28", marginBottom: 12 }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  background: st.bg, border: `1px solid ${st.border}`,
                  borderRadius: 20, padding: "3px 9px", flexShrink: 0,
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

              {container.ports && (
                <p
                  className="font-data"
                  style={{
                    marginTop: 9, paddingTop: 9,
                    borderTop: "1px solid #343B4F1a",
                    color: "rgba(174,185,225,0.45)",
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
  );
}

export default function ServicesPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const servicesFetcher = useCallback(
    () => (fetchServices() as Promise<ServicesResponse>).then((d) => { setLastUpdated(new Date()); return d; }),
    []
  );

  const { data, loading, refetch } = usePolling(servicesFetcher, 15000);

  const containers: Container[] = data?.containers ?? [];
  const totalCount    = containers.length;
  const runningCount  = containers.filter((c) => c.status.toLowerCase().includes("up")).length;
  const healthyCount  = containers.filter((c) => { const s = c.status.toLowerCase(); return s.includes("healthy") && !s.includes("unhealthy"); }).length;
  const degradedCount = containers.filter((c) => c.status.toLowerCase().includes("unhealthy")).length;
  const stoppedCount  = containers.filter((c) => !c.status.toLowerCase().includes("up")).length;

  const filtered = containers
    .filter((c) => {
      if (filter === "running") return c.status.toLowerCase().includes("up");
      if (filter === "stopped") return !c.status.toLowerCase().includes("up");
      return true;
    })
    .sort((a, b) => {
      const aUp = a.status.toLowerCase().includes("up");
      const bUp = b.status.toLowerCase().includes("up");
      if (aUp !== bUp) return aUp ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const activeFiltered  = filtered.filter((c) => c.status.toLowerCase().includes("up"));
  const stoppedFiltered = filtered.filter((c) => !c.status.toLowerCase().includes("up"));

  const summaryStats = [
    { label: "Total", value: totalCount, color: "#AEB9E1", Icon: Layers },
    { label: "Ativos", value: runningCount, color: "#00c2ff", Icon: Activity },
    { label: "Healthy", value: healthyCount, color: "#10b981", Icon: CheckCircle2 },
    { label: "Degradados", value: degradedCount + stoppedCount, color: "#ef4444", Icon: AlertTriangle },
  ];

  return (
    <MainLayout>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap" style={{ flexShrink: 0 }}>
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

        {/* ── Stats ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ flexShrink: 0 }}>
          {summaryStats.map(({ label, value, color, Icon }, i) => (
            <div
              key={label}
              className="stat-enter"
              style={{
                animationDelay: `${i * 0.07}s`,
                background: "var(--surface)",
                border: "1px solid #343B4F",
                borderRadius: "var(--radius)",
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 11,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: `${color}18`,
              }}>
                <Icon size={17} color={color} />
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

        {/* ── Filters ────────────────────────────────────────── */}
        <div className="flex items-center gap-2 flex-wrap" style={{ flexShrink: 0 }}>
          {FILTERS.map(({ id, label }) => {
            const isActive = filter === id;
            const counts: Record<Filter, number> = { all: totalCount, running: runningCount, stopped: stoppedCount };
            return (
              <button
                key={id}
                onClick={() => setFilter(id)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer"
                style={{
                  background: isActive ? "linear-gradient(135deg,#cb3cff 20%,#7f25fb 68%)" : "transparent",
                  border: "1px solid",
                  borderColor: isActive ? "transparent" : "#343B4F",
                  color: isActive ? "#fff" : "var(--foreground-muted)",
                  boxShadow: isActive ? "0 0 14px rgba(203,60,255,0.35)" : "none",
                }}
              >
                {label}
                {counts[id] > 0 && (
                  <span className="ml-1.5 font-data text-xs" style={{ opacity: isActive ? 0.8 : 0.5 }}>
                    {counts[id]}
                  </span>
                )}
              </button>
            );
          })}

          <div className="flex items-center gap-1.5 ml-auto">
            <ArrowDownUp size={12} style={{ color: "var(--foreground-muted)" }} />
            <span className="text-xs" style={{ color: "var(--foreground-muted)" }}>Ativos primeiro</span>
          </div>
        </div>

        {/* ── Scrollable card area ────────────────────────────── */}
        <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, minHeight: 0 }}>
          {loading && !data ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1e2a4a" }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ height: 12, borderRadius: 6, background: "#1e2a4a", width: "55%" }} />
                      <div style={{ height: 9, borderRadius: 6, background: "#1e2a4a40", width: "75%" }} />
                    </div>
                  </div>
                  <div style={{ height: 1, background: "#343B4F", marginBottom: 12 }} />
                  <div style={{ height: 9, borderRadius: 6, background: "#1e2a4a40", width: "35%" }} />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center rounded-xl"
              style={{ border: "1px dashed #343B4F", height: 200 }}
            >
              <Server size={28} style={{ color: "var(--foreground-muted)", marginBottom: 10 }} />
              <p className="text-sm" style={{ color: "var(--foreground-muted)" }}>
                {filter === "all"
                  ? "Nenhum serviço encontrado."
                  : `Nenhum serviço ${filter === "running" ? "ativo" : "parado"} no momento.`}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 8 }}>
              {/* Active group */}
              {activeFiltered.length > 0 && filter !== "stopped" && (
                <div>
                  {filter === "all" && (
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", display: "inline-block" }} className="pulse-dot" />
                      <span className="text-xs font-semibold" style={{ color: "#10b981", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        Ativos — {activeFiltered.length}
                      </span>
                      <div style={{ flex: 1, height: 1, background: "rgba(16,185,129,0.15)" }} />
                    </div>
                  )}
                  <CardGrid items={activeFiltered} startIndex={0} />
                </div>
              )}

              {/* Stopped group */}
              {stoppedFiltered.length > 0 && filter !== "running" && (
                <div>
                  {filter === "all" && (
                    <div className="flex items-center gap-2 mb-3">
                      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#6b7280", display: "inline-block" }} />
                      <span className="text-xs font-semibold" style={{ color: "#6b7280", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                        Parados — {stoppedFiltered.length}
                      </span>
                      <div style={{ flex: 1, height: 1, background: "rgba(107,114,128,0.15)" }} />
                    </div>
                  )}
                  <CardGrid items={stoppedFiltered} startIndex={activeFiltered.length} />
                </div>
              )}

              {/* Single group (filtered) */}
              {filter !== "all" && (
                <CardGrid items={filtered} startIndex={0} />
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
