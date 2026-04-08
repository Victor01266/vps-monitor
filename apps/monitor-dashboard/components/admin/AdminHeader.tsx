"use client";
import { Search, Bell, Settings, User } from "lucide-react";

export function AdminHeader() {
  return (
    <header className="h-16 glass border-b border-white/5 px-6 flex items-center justify-between">
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#3b5bfc]/50 focus:bg-white/10 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl hover:bg-white/5 transition-all">
          <Bell className="w-5 h-5 text-slate-400" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <button className="p-2 rounded-xl hover:bg-white/5 transition-all">
          <Settings className="w-5 h-5 text-slate-400" />
        </button>

        <div className="h-6 w-px bg-white/10"></div>

        <button className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-all">
          <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#3b5bfc] to-[#6c8dff] flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">Admin</p>
            <p className="text-xs text-slate-500">admin@diagonal.ti</p>
          </div>
        </button>
      </div>
    </header>
  );
}
