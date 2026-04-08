"use client";
import { Server, AlertTriangle, Cpu, HardDrive, MemoryStick, Play } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface OverviewData {
  cpu?: string;
  mem?: string;
  disk?: string;
  uptime?: string;
}

interface ServicesData {
  total?: number;
  running?: number;
  healthy?: number;
  unhealthy?: number;
}

interface StatCardsProps {
  overview: OverviewData | null;
  services: ServicesData | null;
  totalAttacks: number;
}

function usageColor(val: number) {
  if (val >= 90) return "usage-crit";
  if (val >= 70) return "usage-warn";
  return "usage-ok";
}


function StatItem({
  icon: Icon,
  label,
  value,
  iconGradient,
  usage,
  sub,
  alert,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  iconGradient: string;
  usage?: number;
  sub?: string;
  alert?: boolean;
}) {
  const isWarn = usage != null && usage >= 70 && usage < 90;
  const isCrit = usage != null && usage >= 90;

  return (
    <Card className="flex flex-col gap-3 stat-enter relative overflow-hidden group hover:border-[#CB3CFF]/30 transition-colors">
      {/* Glow de fundo sutil */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(203,60,255,0.09) 0%, transparent 70%)" }}
      />

      <div className="flex items-center justify-between relative">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: iconGradient }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        {alert && (
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 pulse-dot" />
        )}
      </div>

      <div className="relative min-w-0">
        <p
          className={`text-2xl font-black font-mono tabular-nums leading-none tracking-tight ${
            isCrit ? "text-red-400" : isWarn ? "text-amber-400" : "stat-number"
          }`}
        >
          {value}
        </p>
        <p className="text-[10px] text-[#AEB9E1] uppercase tracking-widest mt-1.5 font-medium">{label}</p>
        {sub && <p className="text-[10px] text-[#AEB9E1]/70 mt-1 truncate">{sub}</p>}
      </div>

      {usage != null && (
        <div className="usage-bar relative">
          <div
            className={`usage-bar-fill ${usageColor(usage)}`}
            style={{ width: `${Math.min(100, usage)}%` }}
          />
        </div>
      )}
    </Card>
  );
}

export function StatCards({ overview, services, totalAttacks }: StatCardsProps) {
  const cpu  = parseFloat(overview?.cpu  ?? "0");
  const mem  = parseFloat(overview?.mem  ?? "0");
  const disk = parseInt(overview?.disk   ?? "0", 10);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
      <StatItem
        icon={Server}
        label="Contêineres"
        value={String(services?.total ?? "—")}
        iconGradient="linear-gradient(135deg,#CB3CFF,#7F25FB)"
        sub={services?.running != null ? `${services.running} ativos` : undefined}
      />
      <StatItem
        icon={Play}
        label="Saudáveis"
        value={String(services?.healthy ?? "—")}
        iconGradient="linear-gradient(135deg,#10b981,#059669)"
      />
      <StatItem
        icon={AlertTriangle}
        label="Unhealthy"
        value={String(services?.unhealthy ?? "—")}
        iconGradient="linear-gradient(135deg,#dc2626,#ef4444)"
        alert={(services?.unhealthy ?? 0) > 0}
      />
      <StatItem
        icon={AlertTriangle}
        label="Ataques"
        value={String(totalAttacks)}
        iconGradient="linear-gradient(135deg,#f59e0b,#fb923c)"
        alert={totalAttacks > 0}
      />
      <StatItem
        icon={Cpu}
        label="CPU"
        value={overview?.cpu ? `${overview.cpu}%` : "—"}
        iconGradient="linear-gradient(135deg,#7F25FB,#CB3CFF)"
        usage={overview?.cpu ? cpu : undefined}
      />
      <StatItem
        icon={MemoryStick}
        label="Memória"
        value={overview?.mem ? `${overview.mem}%` : "—"}
        iconGradient="linear-gradient(135deg,#CB3CFF,#00C2FF)"
        usage={overview?.mem ? mem : undefined}
      />
      <StatItem
        icon={HardDrive}
        label="Disco"
        value={overview?.disk ?? "—"}
        iconGradient="linear-gradient(135deg,#00C2FF,#CB3CFF)"
        usage={overview?.disk ? disk : undefined}
        sub={overview?.uptime ? `up ${overview.uptime.replace(/^up\s+/i, "")}` : undefined}
      />
    </div>
  );
}
