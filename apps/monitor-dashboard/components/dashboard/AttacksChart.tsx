"use client";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { TrendingUp, CircleDot } from "lucide-react";
import { useMemo } from "react";

interface Attack {
  timestamp: string;
  type: string;
  ip?: string;
}

interface AttacksChartProps {
  attacks: Attack[];
}

function buildHourlyData(attacks: Attack[]) {
  const buckets: Record<string, { brute_force: number; invalid_user: number }> = {};
  const now = new Date();

  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 3600_000);
    const label = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    buckets[label] = { brute_force: 0, invalid_user: 0 };
  }

  for (const atk of attacks) {
    const ts = atk.timestamp;
    const parsed = ts.match(/(\d{2}:\d{2})/);
    if (!parsed) continue;
    const hourKey = Object.keys(buckets).find((k) => k.startsWith(parsed[1].substring(0, 2)));
    if (hourKey) {
      if (atk.type === "brute_force") buckets[hourKey].brute_force++;
      else if (atk.type === "invalid_user") buckets[hourKey].invalid_user++;
    }
  }

  return Object.entries(buckets).map(([hora, vals]) => ({ hora, ...vals }));
}

interface TooltipPayloadItem {
  name: string;
  value: number;
  color: string;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === "brute_force" ? "Força bruta" : "Usuário inválido"}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export function AttacksChart({ attacks }: AttacksChartProps) {
  const data = useMemo(() => buildHourlyData(attacks), [attacks]);
  const total = attacks.length;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>
          <TrendingUp className="w-4 h-4 text-blue-400" />
          Tentativas de Login
        </CardTitle>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1" style={{ color: "#CB3CFF" }}>
              <CircleDot className="w-2.5 h-2.5" /> Força bruta
            </span>
            <span className="flex items-center gap-1" style={{ color: "#00C2FF" }}>
              <CircleDot className="w-2.5 h-2.5" /> Usuário inválido
            </span>
          </div>
          <span className="text-xs font-mono tabular-nums" style={{ color: "#AEB9E1" }}>{total}x</span>
        </div>
      </CardHeader>
      <div className="h-60 min-h-[240px] w-full min-w-0 relative overflow-hidden rounded-xl">
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            width: "100%",
            height: "100%",
            opacity: 0.2,
            background: "linear-gradient(180deg, #575DFF 0%, rgba(87, 93, 255, 0) 100%)",
          }}
        />
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={240}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gBrute" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#CB3CFF" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#CB3CFF" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gInvalid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00C2FF" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#00C2FF" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(174,185,225,0.12)" />
            <XAxis
              dataKey="hora"
              tick={{ fill: "#AEB9E1", fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval={5}
            />
            <YAxis
              tick={{ fill: "#AEB9E1", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="brute_force"
              stroke="#CB3CFF"
              strokeWidth={2}
              fill="url(#gBrute)"
              name="brute_force"
            />
            <Area
              type="monotone"
              dataKey="invalid_user"
              stroke="#00C2FF"
              strokeWidth={2}
              fill="url(#gInvalid)"
              name="invalid_user"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
