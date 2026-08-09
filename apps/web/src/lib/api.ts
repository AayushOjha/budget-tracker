export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("pt_token");
}

export { getToken };

export function clearToken(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("pt_token");
}

export function setToken(token: string): void {
  window.localStorage.setItem("pt_token", token);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(0, `Cannot reach the API at ${API_BASE}. Is the backend running?`);
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error ?? `Request failed (${response.status})`;
    throw new ApiError(response.status, message, data?.details);
  }
  return data as T;
}

export const api = {
  signup: (email: string, password: string, name: string) =>
    request<import("@tracker/utils").AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<import("@tracker/utils").AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ user: import("@tracker/utils").UserDto }>("/api/auth/me"),

  categories: () => request<{ categories: import("@tracker/utils").CategoryDto[] }>("/api/categories"),

  createCategory: (name: string) =>
    request<{ category: import("@tracker/utils").CategoryDto }>("/api/categories", {
      method: "POST",
      body: JSON.stringify({ name }),
    }),

  report: (start: string, end: string) =>
    request<import("@tracker/utils").ReportResponse>(`/api/report?start=${start}&end=${end}`),

  plans: (month?: string) =>
    request<{ plans: import("@tracker/utils").PlanDto[] }>(`/api/plans${month ? `?month=${month}` : ""}`),

  savePlan: (categoryId: string, month: string, amount: number) =>
    request<{ plan: import("@tracker/utils").PlanDto }>("/api/plans", {
      method: "PUT",
      body: JSON.stringify({ categoryId, month, amount }),
    }),

  deletePlan: (id: string) =>
    request<{ ok: boolean }>(`/api/plans/${id}`, { method: "DELETE" }),

  actuals: (month?: string, categoryId?: string) => {
    const params = new URLSearchParams();
    if (month) params.set("month", month);
    if (categoryId) params.set("categoryId", categoryId);
    const qs = params.toString();
    return request<{ actuals: import("@tracker/utils").ActualDto[] }>(`/api/actuals${qs ? `?${qs}` : ""}`);
  },

  createActual: (payload: { categoryId: string; month: string; amount: number; note?: string }) =>
    request<{ actual: import("@tracker/utils").ActualDto }>("/api/actuals", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateActual: (id: string, payload: Partial<{ categoryId: string; month: string; amount: number; note: string }>) =>
    request<{ actual: import("@tracker/utils").ActualDto }>(`/api/actuals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  deleteActual: (id: string) =>
    request<{ ok: boolean }>(`/api/actuals/${id}`, { method: "DELETE" }),

  importCsv: (csv: string) =>
    request<import("@tracker/utils").CsvImportResult>("/api/actuals/import", {
      method: "POST",
      body: JSON.stringify({ csv }),
    }),

  locks: () => request<{ locks: import("@tracker/utils").LockDto[] }>("/api/locks"),

  lockMonth: (month: string) =>
    request<{ lock: import("@tracker/utils").LockDto }>("/api/locks", {
      method: "POST",
      body: JSON.stringify({ month }),
    }),

  unlockMonth: (month: string) =>
    request<{ ok: boolean }>(`/api/locks/${month}`, { method: "DELETE" }),
};