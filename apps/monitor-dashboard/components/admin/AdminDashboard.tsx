"use client";
import { Sidebar } from "./Sidebar";
import { AdminHeader } from "./AdminHeader";
import { StatsGrid } from "./StatsGrid";
import { RecentActivity } from "./RecentActivity";
import { ServerStatus } from "./ServerStatus";

export function AdminDashboard() {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        <AdminHeader />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-screen-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gradient mb-2">Dashboard</h1>
              <p className="text-slate-400">Visão geral do sistema de monitoramento</p>
            </div>

            <StatsGrid />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ServerStatus />
              </div>
              <div>
                <RecentActivity />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
