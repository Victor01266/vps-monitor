"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { 
  ShieldAlert, 
  Activity, 
  Clock, 
  Cpu, 
  Flame, 
  HardDrive, 
  MemoryStick, 
  Server, 
  ShieldBan, 
  CheckCircle2, 
  XCircle,
  Users,
  Circle 
} from "lucide-react";
import AttackTrends from "./AttackTrends";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useWebSocket } from "@/hooks/useWebSocket";
import { usePolling } from "@/hooks/usePolling";
import {
  fetchServices,
  fetchOverview,
  fetchAttacks,
  fetchAttacksDaily,
  fetchAttacksCount,
  fetchFail2BanStatus,
  fetchFirewallRules,
  fetchActiveSessions,
  // fetchMonitorHealth, // Não utilizado - status fixo
  fetchServiceAccesses,
} from "@/lib/api";
import { Badge } from "@/components/ui/Badge";

interface Container {
  name: string;
  image: string;
  ports: string;
  status: string;
  state?: string;
}

interface ServicesData {
  containers: Container[];
  total: number;
  healthy: number;
  unhealthy: number;
  running: number;
  infra_map?: {
    containers: Container[];
  };
}

interface OverviewData {
  cpu?: string;
  mem?: string;
  disk?: string;
  uptime?: string;
}

interface Attack {
  type: "brute_force" | "invalid_user" | "accepted";
  timestamp: string;
  user?: string;
  ip?: string;
  source?: string;
}

interface AttacksData {
  total_attacks: number;
  attacks: Attack[];
  accepted_logins: Attack[];
  top_attackers: { ip: string; attempts: number }[];
}

interface Fail2banData {
  jails: { jail: string; total_banned: number; currently_banned: number; banned_ips: string[] }[];
}

// interface FirewallData {
//   blocked_ips: { ip: string; rule: string }[];
// } // Não utilizado - dados mock

function sanitizeText(value?: string, fallback = "—") {
  if (!value) return fallback;
  return value.replace(/[<>"'%;()&+]/g, "").slice(0, 120);
}

function formatNumber(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatUptime(raw: string): string {
  const s = raw.replace(/\s*\(.*\)/, "").trim();
  const m = s.match(/^Up\s+(\d+)\s+(second|minute|hour|day|week|month)s?$/i);
  if (!m) return s === "Up" ? "online" : sanitizeText(s);
  const n = parseInt(m[1]);
  const unit = m[2].toLowerCase();
  const labels: Record<string, string> = {
    second: `${n}s`, minute: `${n} min`,
    hour: n === 1 ? "1 hora" : `${n} horas`,
    day: n === 1 ? "1 dia" : `${n} dias`,
    week: n === 1 ? "1 semana" : `${n} semanas`,
    month: n === 1 ? "1 mês" : `${n} meses`,
  };
  return `há ${labels[unit] ?? s}`;
}

function hourFromTimestamp(timestamp: string): number | null {
  const asDate = new Date(timestamp);
  if (!Number.isNaN(asDate.getTime())) return asDate.getHours();

  const hhmm = timestamp.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
  if (!hhmm) return null;

  const hour = Number(hhmm[1]);
  return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function hourLabel(hour: number) {
  const suffix = hour >= 12 ? "PM" : "AM";
  const normalized = hour % 12 === 0 ? 12 : hour % 12;
  return `${normalized} ${suffix}`;
}

function buildHourlySeries(attacks: Attack[]) {
  const buckets = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: hourLabel(h),
    brute: 0,
    invalid: 0,
  }));

  for (const attack of attacks) {
    const hour = hourFromTimestamp(attack.timestamp);
    if (hour == null) continue;
    if (attack.type === "brute_force") buckets[hour].brute += 1;
    if (attack.type === "invalid_user") buckets[hour].invalid += 1;
  }

  return buckets;
}

const CHART_RANGES = ["24h", "7d", "30d", "90d"] as const;


export function DashboardClient() {
  const { alerts } = useWebSocket();
  const chartsReady = true; // Forçar gráficos a renderizarem sempre

  const servicesFetcher      = useCallback(() => fetchServices() as Promise<ServicesData>, []);
  const overviewFetcher      = useCallback(() => fetchOverview() as Promise<OverviewData>, []);
  const attacksFetcher       = useCallback(() => fetchAttacks(5000) as Promise<AttacksData>, []);
  const fail2banFetcher      = useCallback(() => fetchFail2BanStatus() as Promise<Fail2banData>, []);
  const firewallFetcher   = useCallback(() => fetchFirewallRules() as Promise<{ blocked_ips?: { ip: string; rule: string }[] }>, []);
  // const weeklyFetcher    = useCallback(() => fetchWeeklyAccesses() as Promise<Record<string, number>>, []); // Não utilizado
  // const monitorHltFetcher = useCallback(() => fetchMonitorHealth() as Promise<{ status: string }>, []); // Não utilizado - status fixo
  const dailyFetcher         = useCallback(() => fetchAttacksDaily(90) as Promise<{ days: number; data: { date: string; brute: number; invalid: number; total: number }[] }>, []);
  const attacksCountFetcher  = useCallback(() => fetchAttacksCount(), []);
  const activeSessionsFetcher = useCallback(() => fetchActiveSessions(), []);
  const serviceAccessesFetcher = useCallback(() => fetchServiceAccesses(), []);

  const { data: servicesData } = usePolling(servicesFetcher, 15000);
  const { data: overviewData, loading: overviewLoading } = usePolling(overviewFetcher, 10000);
  const { data: attacksData } = usePolling(attacksFetcher, 20000);
  const { data: fail2banData } = usePolling(fail2banFetcher, 30000);
  const { data: firewallData } = usePolling(firewallFetcher, 20000);
  // const { data: weeklyData } = usePolling(weeklyFetcher, 60000); // Não utilizado
  // const { data: monitorHealthData } = usePolling(monitorHltFetcher, 30000); // Não utilizado - status fixo
  const { data: dailyData } = usePolling(dailyFetcher, 120000);
  const { data: attacksCountData } = usePolling(attacksCountFetcher, 300000);
  const { data: activeSessionsData } = usePolling(activeSessionsFetcher, 15000);
  const { data: serviceAccessesData } = usePolling(serviceAccessesFetcher, 30000);

  const [chartRange, setChartRange] = useState<"24h" | "7d" | "30d" | "90d">("90d");
  const [autoCycle, setAutoCycle] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

    
  useEffect(() => {
    if (!autoCycle) return;
    const id = setInterval(() => {
      // Inicia transição de esmaecimento
      setIsTransitioning(true);
      
      // Muda o período após um breve delay
      setTimeout(() => {
        setChartRange((prev: "24h" | "7d" | "30d" | "90d") => {
          const i = CHART_RANGES.indexOf(prev);
          return CHART_RANGES[(i + 1) % CHART_RANGES.length];
        });
        
        // Remove o efeito de esmaecimento após a mudança
        setTimeout(() => {
          setIsTransitioning(false);
        }, 300);
      }, 300);
    }, 20000); // Muda a cada 20 segundos
    return () => clearInterval(id);
  }, [autoCycle]);

  const attacks = useMemo(() => {
    return attacksData?.attacks ?? [];
  }, [attacksData]);
  const hourlySeries = useMemo(() => buildHourlySeries(attacks), [attacks]);

  const activeBans = useMemo(() => {
    return (fail2banData?.jails ?? []).reduce((sum, jail) => sum + jail.currently_banned, 0);
  }, [fail2banData?.jails]);

  const liveAlerts = alerts.filter((a: { event: string }) => a.event === "brute_force" || a.event === "invalid_user").length;

  const totalContainers = servicesData?.total ?? 0;
  const totalAttacks = attacksData?.total_attacks ?? attacks.length;
  const totalFirewallBlocks = (firewallData as { blocked_ips?: { ip: string; rule: string }[] } | null)?.blocked_ips?.length ?? 0;

  const summaryCards = [
    {
      label: "Containers",
      value: totalContainers,
      sub: `${servicesData?.running ?? 0} rodando`,
      icon: Server,
      iconBg: "from-[#7F25FB] to-[#CB3CFF]",
      accent: "#CB3CFF",
    },
    {
      label: "Eventos de Segurança",
      value: totalAttacks,
      sub: `${liveAlerts} em tempo real`,
      icon: ShieldAlert,
      iconBg: "from-[#f59e0b] to-[#ef4444]",
      accent: "#ef4444",
      alert: totalAttacks > 0,
    },
    {
      label: "Bans Ativos",
      value: activeBans,
      sub: "via fail2ban",
      icon: ShieldBan,
      iconBg: "from-[#CB3CFF] to-[#00C2FF]",
      accent: "#00C2FF",
    },
    {
      label: "IPs Bloqueados",
      value: totalFirewallBlocks,
      sub: "pelo firewall",
      icon: Flame,
      iconBg: "from-[#ef4444] to-[#f97316]",
      accent: "#f97316",
      alert: totalFirewallBlocks > 0,
    },
  ];

  const serviceCards = [
    { name: "GLPI App",           search: "glpi-app",       weeklyKey: "glpi" },
    { name: "Cadascredito",       search: "cadascredito",   weeklyKey: "cadascredito" },
    { name: "Cobrabot",           search: "cobrabot",       weeklyKey: "cobrabot" },
    { name: "Diagotools V1",      search: "ranking_vendas", weeklyKey: "ranking_vendas" },
    { name: "Evolution API",      search: "evolution_api",  weeklyKey: "evolution" },
    { name: "Monitor API",        search: "",               weeklyKey: "monitor", isLocal: true },
  ];

  const cpu = parseFloat(overviewData?.cpu ?? "0") || 0;
  const mem = parseFloat(overviewData?.mem ?? "0") || 0;
  const disk = parseFloat(String(overviewData?.disk ?? "0").replace("%", "")) || 0;

  function resourceBarColor(val: number) {
    if (val >= 90) return "from-red-500 to-red-400";
    if (val >= 70) return "from-amber-500 to-amber-400";
    return "from-[#CB3CFF] to-[#00C2FF]";
  }

  return (
    <div className="space-y-5">
      {/* Summary cards: icon + number + label on same row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="rounded-xl bg-[#0B1739] border border-[#343B4F] px-5 py-4 relative overflow-hidden group hover:border-opacity-60 transition-colors"
              style={{ borderColor: item.alert ? `${item.accent}40` : undefined }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: `radial-gradient(ellipse at 80% 0%, ${item.accent}14 0%, transparent 65%)` }}
              />
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-linear-to-br ${item.iconBg} shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="text-[30px] leading-none font-bold text-white tabular-nums shrink-0">{item.value}</p>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-[#AEB9E1] font-medium truncate">{item.label}</p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: item.accent }}>{item.sub}</p>
                </div>
                {item.alert && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />}
              </div>
            </div>
          );
        })}
      </div>

      {/* Service cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {serviceCards.map((svc) => {
          const isLocal = "isLocal" in svc && svc.isLocal;
          const matchedContainers = svc.search
            ? (servicesData?.containers ?? []).filter((c: Container) => c.name.includes(svc.search))
            : [];
          const container: Container | undefined = isLocal
            ? { name: "monitor-api", image: "fastapi localhost:8001", ports: "localhost:8001", status: "Up (healthy)", state: "running" }
            : matchedContainers[0];
                    const isUp = !!(container?.state?.toLowerCase() === "running" || container?.status?.toLowerCase().startsWith("up") || container?.status?.toLowerCase().includes("up"));
          const isUnhealthy = container?.status?.toLowerCase().includes("unhealthy");
          const uptimeRaw = container?.status;
          const portsRaw = container?.ports;
          const activeSessions = (activeSessionsData as { active_sessions?: number })?.active_sessions ?? 0;
          const isSsh = svc.name.toLowerCase().includes("ssh") || svc.name.toLowerCase() === "sshd";
          const hasActiveSessions = isSsh && activeSessions > 0;
          
          // Dados de usuários por serviço
          const serviceAccess = serviceAccessesData?.[svc.search] as { users?: { username: string; weekly_accesses: number; last_access: string }[], active_now: number, simultaneous_now: number, weekly_total: number, last_access: string } ?? {};
          const weeklyUsers = serviceAccess.users?.length ?? 0;
          const activeNow = serviceAccess.active_now ?? 0;
          const simultaneousNow = serviceAccess.simultaneous_now ?? 0;
          const hasActiveUsers = activeNow > 0;
          
          const badgeVariant = (isUnhealthy ? "danger" : hasActiveUsers || hasActiveSessions ? "default" : isUp ? "success" : "muted") as "default" | "danger" | "success" | "muted";
          const StatusIcon = isUnhealthy ? XCircle : isUp ? CheckCircle2 : Circle;
          const statusLabel = isUnhealthy ? "Unhealthy" : hasActiveUsers ? `Ativo (${activeNow})` : hasActiveSessions ? `Ativo (${activeSessions})` : isUp ? "Running" : "Offline";
          const dotColor = isUnhealthy ? "bg-red-400" : hasActiveUsers || hasActiveSessions ? "bg-[#CB3CFF]" : isUp ? "bg-emerald-400" : "bg-[#AEB9E1]";
          return (
            <div
              key={svc.name}
              className="rounded-xl bg-[#0B1739] border border-[#343B4F] p-4 relative group cursor-default transition-colors"
              style={{ borderColor: isUnhealthy ? "rgba(239,68,68,0.3)" : isUp ? undefined : "rgba(174,185,225,0.15)" }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
                style={{ background: isUnhealthy ? "radial-gradient(ellipse at 50% 0%, rgba(239,68,68,0.07) 0%, transparent 60%)" : isUp ? "radial-gradient(ellipse at 50% 0%, rgba(0,194,255,0.06) 0%, transparent 60%)" : "none" }}
              />
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor} ${(isUp && !isUnhealthy) || hasActiveSessions ? "shadow-[0_0_6px_1px_currentColor]" : ""}`} />
                  <p className="font-semibold text-white truncate text-sm" title={svc.name}>{svc.name}</p>
                </div>
                <span className="relative shrink-0 ml-2 group/tip">
                  <Badge variant={badgeVariant}>
                    <StatusIcon className="w-3 h-3" />
                    {statusLabel}
                  </Badge>
                  {container?.status && (
                    <span className="pointer-events-none absolute bottom-full right-0 mb-1.5 hidden group-hover/tip:block z-50 px-2.5 py-1.5 text-[10px] leading-snug bg-[#0A1330] border border-[#343B4F] rounded-lg text-[#AEB9E1] whitespace-nowrap shadow-xl">
                      {container.status}
                    </span>
                  )}
                </span>
              </div>
              <p className="text-[11px] font-mono text-[#AEB9E1] truncate mt-1" title={container?.image}>
                {container?.image ? sanitizeText(container.image) : "—"}
              </p>
              <div className="flex items-center gap-3 border-t border-[#343B4F]/50 pt-3 min-w-0 mt-3">
                <div className="flex items-center gap-1 min-w-0 flex-1" title={uptimeRaw ?? "N/A"}>
                  <Clock className="w-3 h-3 text-[#AEB9E1] shrink-0" />
                  <span className="text-[11px] text-[#AEB9E1] truncate">{uptimeRaw ? formatUptime(uptimeRaw) : "—"}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0" title={portsRaw ?? "N/A"}>
                  <Activity className="w-3 h-3 text-[#AEB9E1] shrink-0" />
                  <span className="text-[11px] text-[#AEB9E1] font-mono">{portsRaw ? sanitizeText(portsRaw) : "—"}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0" title={`${weeklyUsers} usuários únicos na semana`}>
                  <Users className="w-3 h-3 text-[#CB3CFF] shrink-0" />
                  <span className="text-[11px] text-[#AEB9E1] tabular-nums">{weeklyUsers}</span>
                  <span className="text-[9px] text-[#AEB9E1]/60">users/7d</span>
                </div>
                <div className="flex items-center gap-1 shrink-0" title={`${simultaneousNow} acessos simultâneos agora`}>
                  <Activity className="w-3 h-3 text-[#00C2FF] shrink-0" />
                  <span className="text-[11px] text-[#AEB9E1] tabular-nums">{simultaneousNow}</span>
                  <span className="text-[9px] text-[#AEB9E1]/60">now</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Activity + Server Resources */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <section 
          className="xl:col-span-8 flex flex-col rounded-xl bg-[#0B1739] border border-[#343B4F] overflow-hidden" 
          style={{ padding: '12px 12px 0px' }}
        >
          <div className="flex items-center justify-between mb-2 shrink-0">
            <div>
              <h3 className="text-base font-medium">Security Activity</h3>
              <p className="text-[11px] text-[#AEB9E1] mt-0.5">
                <span className="text-white font-medium">{servicesData?.running ?? 0}</span> ativos
                <span className="mx-1.5 text-[#343B4F]">·</span>
                <span className="text-white font-medium">{activeBans}</span> banidos
                <span className="mx-1.5 text-[#343B4F]">·</span>
                <span className="text-white font-medium">
                  {chartRange === "24h"
                    ? (attacksData?.total_attacks ?? 0)
                    : (dailyData?.data ?? [])
                        .slice(chartRange === "7d" ? -7 : chartRange === "30d" ? -30 : -90)
                        .reduce((s, d) => s + d.total, 0)}
                  {chartRange === "90d" && attacksCountData && (
                    <span className="text-[10px] text-[#AEB9E1] font-normal ml-1">
                      ({(attacksCountData as { total?: number })?.total?.toLocaleString("pt-BR") || "0"} total histórico)
                    </span>
                  )}
                </span> tentativas ({chartRange})
              </p>
            </div>
            <div className="flex items-center gap-1 bg-[#0A1330] border border-[#343B4F] rounded-lg p-0.5">
              {autoCycle && (
                <div className="flex items-center gap-1 px-2 text-[10px] text-emerald-400">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Auto
                </div>
              )}
              {CHART_RANGES.map((r) => (
                <button
                  key={r}
                  onClick={() => { setAutoCycle(false); setChartRange(r); }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    chartRange === r ? "bg-[#343B4F] text-white" : "text-[#AEB9E1] hover:text-white"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className={`flex-1 w-full min-h-[200px] relative transition-opacity duration-300 ${isTransitioning ? 'opacity-30' : 'opacity-100'}`}>
            {chartsReady ? (
              <ResponsiveContainer width="100%" height="100%" minHeight={250}>
                <AreaChart
                  data={(() => {
                    if (chartRange === "24h") return hourlySeries;
                    const slice = chartRange === "7d" ? -7 : chartRange === "30d" ? -30 : chartRange === "90d" ? -90 : -180;
                    const raw = (dailyData?.data ?? []).slice(slice);
                    // Remove apenas dias completamente vazios no início e fim
                    let start = 0;
                    let end = raw.length - 1;
                    while (start < raw.length && raw[start].total === 0) start++;
                    while (end > start && raw[end].total === 0) end--;
                    // Remove 1 dia vazio extra apenas se houver dados suficientes
                    if (end - start + 1 > 7 && chartRange === "7d") {
                      if (raw[start].total === 0) start++;
                      if (raw[end].total === 0) end--;
                    }
                    // Se não há nenhum dado, exibe tudo (evita gráfico em branco)
                    if (start > end) {
                      start = 0;
                      end = raw.length - 1;
                    }
                    // Para 90d: mostra todos os dias com label compacto (dia/mês)
                    const data = raw.slice(start, end + 1).map((h, i) => {
                      let label = `${i + 1}`;
                      if (h.date) {
                        const [, month, day] = h.date.split('-');
                        label = `${day}/${month}`;
                      }
                      return { hour: i, label, brute: h.brute, invalid: h.invalid, total: h.total };
                    });
                    return data;
                  })()}
                  margin={{ top: 10, right: 25, left: -20, bottom: 20 }}
                >
                  <defs>
                    <linearGradient id="gradBrute" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#CB3CFF" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#CB3CFF" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradInvalid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#575DFF" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#575DFF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(174,185,225,0.07)" strokeDasharray="4 4" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#AEB9E1", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval={chartRange === "24h" ? 2 : chartRange === "90d" ? 14 : "preserveStartEnd"}
                    minTickGap={6}
                    tickMargin={5}
                    height={20}
                  />
                  <YAxis
                    tick={{ fill: "#AEB9E1", fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0B1739",
                      border: "1px solid #343B4F",
                      borderRadius: 10,
                      color: "#fff",
                      fontSize: 12,
                      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    }}
                    itemStyle={{ color: "#fff" }}
                    cursor={{ stroke: "rgba(174,185,225,0.2)", strokeWidth: 1 }}
                    labelFormatter={(label, payload) => {
                      if (payload?.[0]?.payload?.fullDate) return payload[0].payload.fullDate;
                      return label;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="brute"
                    name="Brute force"
                    stroke="#CB3CFF"
                    strokeWidth={2}
                    fill="url(#gradBrute)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#CB3CFF", stroke: "#0B1739", strokeWidth: 2 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="invalid"
                    name="Invalid user"
                    stroke="#575DFF"
                    strokeWidth={2}
                    fill="url(#gradInvalid)"
                    dot={false}
                    activeDot={{ r: 4, fill: "#575DFF", stroke: "#0B1739", strokeWidth: 2 }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingBottom: 4 }}
                    formatter={(value) => <span style={{ color: "#AEB9E1" }}>{value}</span>}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full rounded-lg border border-[#343B4F] bg-[#0A1330]" />
            )}
          </div>
        </section>

        <div className="xl:col-span-4 space-y-4">
          <section className="rounded-xl bg-[#0B1739] border border-[#343B4F] p-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-[#AEB9E1] uppercase tracking-wider">Server Resources</p>
                <p className="text-sm text-white font-medium mt-0.5">
                  {overviewLoading ? "Carregando..." : overviewData?.uptime ? sanitizeText(overviewData.uptime) : "—"}
                </p>
              </div>
              <Badge variant="success">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Online
              </Badge>
            </div>

            {[
              { label: "CPU", value: cpu, raw: overviewData?.cpu, Icon: Cpu, color: resourceBarColor(cpu) },
              { label: "Memória", value: mem, raw: overviewData?.mem, Icon: MemoryStick, color: resourceBarColor(mem) },
              { label: "Disco", value: disk, raw: overviewData?.disk, Icon: HardDrive, color: resourceBarColor(disk) },
            ].map((resource) => (
              <div key={resource.label} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <resource.Icon className="w-3.5 h-3.5 text-[#AEB9E1]" />
                    <span className="text-xs text-[#AEB9E1]">{resource.label}</span>
                  </div>
                  <span className={`text-xs font-semibold tabular-nums ${resource.value >= 90 ? "text-red-400" : resource.value >= 70 ? "text-amber-400" : "text-white"}`}>
                    {resource.raw ? `${resource.value.toFixed(1)}%` : "—"}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#081028] overflow-hidden">
                  <div
                    className={`h-full rounded-full bg-linear-to-r ${resource.color} transition-all duration-700`}
                    style={{ width: `${Math.min(100, resource.value || 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </section>

          <section
            className="p-4 flex flex-col"
            style={{
              background: "#0B1739",
              boxShadow: "1px 1px 1px rgba(15.62, 24.73, 52.06, 0.40)",
              borderRadius: 12,
              outline: "0.60px #0B1739 solid",
              outlineOffset: "-0.30px",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <p className="text-xs text-[#AEB9E1] flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Attack Trends
                </p>
                <p className="text-2xl font-bold text-white tabular-nums mt-0.5">
                  {(() => {
                    const value = chartRange === "24h" 
                      ? attacksData?.total_attacks ?? 0
                      : (() => {
                          const slice = chartRange === "7d" ? -7 : chartRange === "30d" ? -30 : -90;
                          const raw = (dailyData?.data ?? []).slice(slice);
                          return raw.reduce((s, d) => s + d.total, 0);
                        })();
                    
                    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                    if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
                    return value.toString();
                  })()}
                </p>
              </div>
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-[120px] flex items-center justify-center">
              {(() => {
                const slice = chartRange === "7d" ? -7 : chartRange === "30d" ? -30 : -90;
                const rows  = chartRange === "24h" ? null : (dailyData?.data ?? []).slice(slice);
                const gaugeAccepted = (attacksData?.accepted_logins ?? []).length;
                const gaugeInvalid  = chartRange === "24h"
                  ? (attacksData?.attacks ?? []).filter(a => a.type === "invalid_user").length
                  : (rows ?? []).reduce((s, d) => s + (d.invalid ?? 0), 0);
                const gaugeBrute = chartRange === "24h"
                  ? (attacksData?.attacks ?? []).filter(a => a.type === "brute_force").length
                  : (rows ?? []).reduce((s, d) => s + (d.brute ?? 0), 0);
                return (
                  <AttackTrends
                    accepted={gaugeAccepted}
                    invalid={gaugeInvalid}
                    brute={gaugeBrute}
                  />
                );
              })()}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#343B4F]/50">
              <span className="text-[11px] text-[#AEB9E1]">
                {attacksData?.total_attacks ?? 0} tentativas (24h)
              </span>
              <span className="text-[11px] font-medium" style={{ color: "#CB3CFF" }}>
                {chartRange}
              </span>
            </div>
          </section>
        </div>
      </div>


      <footer className="border-t border-[#343B4F] pt-4 mt-1 flex items-center justify-between gap-2 flex-wrap">
        <span className="text-xs text-[#AEB9E1]">VPS Monitor</span>
        <span className="text-[10px] text-[#AEB9E1] uppercase tracking-wider">
          Uptime {sanitizeText(overviewData?.uptime, "indisponível")}
        </span>
      </footer>
    </div>
  );
}
