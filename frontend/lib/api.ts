const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ads_checker_token");
}

export function setToken(token: string): void {
  localStorage.setItem("ads_checker_token", token);
}

export function clearToken(): void {
  localStorage.removeItem("ads_checker_token");
}

export async function fetchApi<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v) url.searchParams.set(k, v);
    });
  }
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(url.toString(), { cache: "no-store", headers });
  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Authentication required");
  }
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function checkAuthRequired(): Promise<boolean> {
  const res = await fetch(`${API_BASE}/api/auth-status`);
  const data = await res.json();
  return data.auth_required;
}

export async function login(password: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error("パスワードが正しくありません");
  const data = await res.json();
  return data.token;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("ja-JP").format(n);
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 }).format(n);
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export function getDefaultDates(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 29);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}
