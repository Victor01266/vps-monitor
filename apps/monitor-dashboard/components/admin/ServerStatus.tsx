"use client";
import { Server, Cpu, HardDrive, MemoryStick } from "lucide-react";

const servers = [
  {
    name: "Web Server 01",
    status: "online",
    cpu: 45,
    memory: 62,
    disk: 38,
    uptime: "99.9%",
  },
  {
    name: "Database Server",
    status: "online",
    cpu: 78,
    memory: 85,
    disk: 72,
    uptime: "99.8%",
  },
  {
    name: "API Server",
    status: "online",
    cpu: 32,
    memory: 48,
    disk: 25,
    uptime: "100%",
  },
  {
    name: "Cache Server",
    status: "warning",
    cpu: 88,
    memory: 92,
    disk: 45,
    uptime: "98.5%",
  },
];

export function ServerStatus() {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-white">Status dos Servidores</h2>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full pulse-dot"></div>
          <span className="text-xs text-slate-400">Todos operacionais</span>
        </div>
      </div>

      <div className="space-y-4">
        {servers.map((server, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-linear-to-br from-[#3b5bfc] to-[#6c8dff] flex items-center justify-center">
                  <Server className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{server.name}</h3>
                  <p className="text-xs text-slate-500">Uptime: {server.uptime}</p>
                </div>
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  server.status === "online"
                    ? "bg-green-500/10 text-green-400"
                    : "bg-yellow-500/10 text-yellow-400"
                }`}
              >
                {server.status === "online" ? "Online" : "Atenção"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Cpu className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-400">CPU</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        server.cpu > 80 ? "bg-red-500" : server.cpu > 60 ? "bg-yellow-500" : "bg-green-500"
                      }`}
                      style={{ width: `${server.cpu}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-semibold text-white">{server.cpu}%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <MemoryStick className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-400">RAM</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        server.memory > 80 ? "bg-red-500" : server.memory > 60 ? "bg-yellow-500" : "bg-green-500"
                      }`}
                      style={{ width: `${server.memory}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-semibold text-white">{server.memory}%</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-1 mb-1">
                  <HardDrive className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-400">Disco</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        server.disk > 80 ? "bg-red-500" : server.disk > 60 ? "bg-yellow-500" : "bg-green-500"
                      }`}
                      style={{ width: `${server.disk}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-semibold text-white">{server.disk}%</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
