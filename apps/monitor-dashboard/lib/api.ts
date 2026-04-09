const _cache = new Map<string, { data: unknown; ts: number }>();
function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = _cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return Promise.resolve(hit.data as T);
  return fn().then((data) => {
    _cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

function getApiBase() {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  if (envUrl) return envUrl;
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    if (hostname !== "localhost" && hostname !== "127.0.0.1") {
      return `${protocol}//${hostname}`;
    }
  }
  return "http://localhost:8001";
}

export function fetchServices() {
  return withCache("services", 15000, () =>
    fetch(`${getApiBase()}/stats/services`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("Falha ao buscar serviços"); return r.json(); })
  );
}

export function fetchOverview() {
  return withCache("overview", 10000, () =>
    fetch(`${getApiBase()}/stats/overview`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("Falha ao buscar overview"); return r.json(); })
  );
}

export function fetchWeeklyAccesses() {
  return withCache("weekly", 60000, () =>
    fetch(`${getApiBase()}/stats/weekly-accesses`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("Falha ao buscar acessos semanais"); return r.json(); })
  );
}

export function fetchMonitorHealth() {
  return withCache("health", 15000, () =>
    fetch(`${getApiBase()}/health`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("API offline"); return r.json(); })
  );
}

export function fetchAttacksDaily(days = 30) {
  return withCache(`daily-${days}`, 120000, () =>
    fetch(`${getApiBase()}/security/attacks/daily?days=${days}`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("Falha ao buscar histórico diário"); return r.json(); })
  );
}

export function fetchAttacks(lines = 500) {
  return withCache("attacks", 15000, () => {
    return fetch(`${getApiBase()}/security/attacks?lines=${lines}`, { cache: "no-store" }).then((r) => { 
      if (!r.ok) throw new Error("Falha ao buscar ataques"); 
      return r.json(); 
    });
  });
}

export function fetchAttacksCount() {
  return withCache("attacks-count", 300000, () =>
    fetch(`${getApiBase()}/security/attacks/count`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("Falha ao buscar total"); return r.json(); })
  ) as Promise<{ total: number }>;
}

export function fetchTopAttackersAll(limit = 10) {
  return withCache(`top-all-${limit}`, 300000, () =>
    fetch(`${getApiBase()}/security/attacks/top-all?limit=${limit}`, { cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("Falha ao buscar top atacantes histórico"); return r.json(); })
  ) as Promise<{ top_attackers: { ip: string; attempts: number }[]; total_ips: number }>;
}

export function fetchActiveSessions() {
  return withCache("active-sessions", 15000, () =>
    fetch(`${getApiBase()}/stats/active-sessions`, { cache: "no-store" }).then((r) => r.ok ? r.json() : { active_sessions: 0 })
  ) as Promise<{ active_sessions: number }>;
}

export function fetchServiceAccesses() {
  return withCache("service-accesses", 30000, () =>
    fetch(`${getApiBase()}/stats/service-accesses`, { cache: "no-store" }).then((r) => r.ok ? r.json() : {})
  ) as Promise<Record<string, { users: Array<{ username: string; weekly_accesses: number; last_access: string }>; active_now: number; simultaneous_now: number; weekly_total: number; last_access: string }>>;
}

export function fetchFail2BanStatus() {
  return withCache("fail2ban", 30000, () =>
    fetch(`${getApiBase()}/security/fail2ban/status`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("Falha ao buscar fail2ban"); return r.json(); })
  );
}

export function fetchFirewallRules() {
  return withCache("firewall", 20000, () =>
    fetch(`${getApiBase()}/firewall/rules`, { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("Falha ao buscar regras de firewall"); return r.json(); })
  );
}

export async function firewallAction(ip: string, action: "block" | "unblock") {
  const res = await fetch(`${getApiBase()}/firewall/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ip, action, confirm: true }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
    throw new Error(err.detail ?? "Falha na ação de firewall");
  }
  return res.json();
}

export async function fail2banUnban(jail: string, ip: string) {
  const res = await fetch(`${getApiBase()}/security/fail2ban/unban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jail, ip }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
    throw new Error(err.detail ?? "Falha ao desbanir");
  }
  return res.json();
}

export async function fetchUFWRules() {
  const res = await fetch(`${getApiBase()}/firewall/ufw`, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao buscar regras UFW");
  return res.json();
}

export async function addUFWRule(target: string, action: "allow" | "deny" | "reject") {
  const res = await fetch(`${getApiBase()}/firewall/ufw/rule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target, action }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
    throw new Error(err.detail ?? "Falha ao adicionar regra");
  }
  return res.json();
}

export async function deleteUFWRule(num: number) {
  const res = await fetch(`${getApiBase()}/firewall/ufw/rule/${num}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
    throw new Error(err.detail ?? "Falha ao remover regra");
  }
  return res.json();
}

export function createWebSocket(): WebSocket {
  const wsUrl = getApiBase()
    .replace(/^http/, "ws")
    .replace(/^https/, "wss");
  return new WebSocket(`${wsUrl}/ws/alerts`);
}
