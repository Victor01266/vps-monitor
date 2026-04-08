"use client";
import { TrendingUp, TrendingDown, Users, Server, Activity, Shield } from "lucide-react";

const stats = [
  {
    label: "Total de Usuários",
    value: "2,543",
    change: "+12.5%",
    trend: "up",
    icon: Users,
    color: "from-blue-500 to-cyan-500",
  },
  {
    label: "Servidores Ativos",
    value: "48",
    change: "+3",
    trend: "up",
    icon: Server,
    color: "from-purple-500 to-pink-500",
  },
  {
    label: "Uptime Médio",
    value: "99.8%",
    change: "+0.2%",
    trend: "up",
    icon: Activity,
    color: "from-green-500 to-emerald-500",
  },
  {
    label: "Ameaças Bloqueadas",
    value: "1,234",
    change: "-8.3%",
    trend: "down",
    icon: Shield,
    color: "from-orange-500 to-red-500",
  },
];

export function StatsGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <div
          key={idx}
          className="glass rounded-2xl p-6 hover:border-white/10 transition-all card-glow"
        >
          <div className="flex items-start justify-between mb-4">
            <div
              className={`w-12 h-12 rounded-xl bg-linear-to-br ${stat.color} flex items-center justify-center`}
            >
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                stat.trend === "up"
                  ? "bg-green-500/10 text-green-400"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              {stat.trend === "up" ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {stat.change}
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gradient mb-1">{stat.value}</h3>
          <p className="text-sm text-slate-400">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
