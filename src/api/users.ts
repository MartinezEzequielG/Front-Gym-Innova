export type UserRole = 'ADMIN' | 'EMPLOYEE' | 'ACCOUNTANT' | 'CLIENT';

export type CreateUserPayload = {
  email: string;
  name?: string;
  role: UserRole;
  branchId: string | null; // null => usuario global
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include', // importante (JWT en cookie)
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(msg || `HTTP ${res.status}`);
  }

  return (await res.json()) as T;
}

export function listUsers() {
  return http<any[]>('/users');
}

export function createUser(payload: CreateUserPayload) {
  return http<any>('/users', { method: 'POST', body: JSON.stringify(payload) });
}

export function listBranches() {
  return http<Array<{ id: string; name: string }>>('/branches');
}