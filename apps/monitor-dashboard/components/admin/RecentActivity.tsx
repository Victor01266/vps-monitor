"use client";
import { Clock, CheckCircle, AlertCircle, XCircle } from "lucide-react";

const activities = [
  {
    type: "success",
    title: "Deploy realizado com sucesso",
    description: "API v2.1.0 implantada em produção",
    time: "2 min atrás",
    icon: CheckCircle,
  },
  {
    type: "warning",
    title: "Uso de CPU elevado",
    description: "Servidor web-01 atingiu 85% de uso",
    time: "15 min atrás",
    icon: AlertCircle,
  },
  {
    type: "error",
    title: "Tentativa de acesso bloqueada",
    description: "IP 192.168.1.100 bloqueado por Fail2Ban",
    time: "1 hora atrás",
    icon: XCircle,
  },
  {
    type: "success",
    title: "Backup concluído",
    description: "Backup diário executado com sucesso",
    time: "2 horas atrás",
    icon: CheckCircle,
  },
];

export function RecentActivity() {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">Atividade Recente</h2>
        <button className="text-sm text-[#6c8dff] hover:text-[#3b5bfc] transition-colors">
          Ver tudo
        </button>
      </div>

      <div className="space-y-4">
        {activities.map((activity, idx) => {
          const Icon = activity.icon;
          const colors = {
            success: "text-green-400 bg-green-500/10",
            warning: "text-yellow-400 bg-yellow-500/10",
            error: "text-red-400 bg-red-500/10",
          };

          return (
            <div key={idx} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/5 transition-all">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[activity.type as keyof typeof colors]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white mb-1">{activity.title}</h3>
                <p className="text-xs text-slate-400 mb-2">{activity.description}</p>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {activity.time}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
