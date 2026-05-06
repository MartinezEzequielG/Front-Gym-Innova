import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { createUser, listBranches, listUsers, type CreateUserPayload, type UserRole } from '../../api/users';

type Branch = { id: string; name: string };

export default function UsersPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const isGlobalAdmin = user.role === 'ADMIN' && user.branchId === null;
  if (!isGlobalAdmin) return <Navigate to="/dashboard" replace />;

  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<CreateUserPayload>({
    email: '',
    name: '',
    role: 'EMPLOYEE',
    branchId: null,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listUsers(), listBranches()])
      .then(([u, b]) => {
        setUsers(u);
        setBranches(b);
      })
      .catch((e) => setError(String(e?.message ?? e)));
  }, []);

  const canSubmit = useMemo(() => {
    return form.email.trim().length > 3 && !!form.role;
  }, [form.email, form.role]);

  async function onCreate() {
    setError(null);
    try {
      const created = await createUser({
        ...form,
        email: form.email.trim().toLowerCase(),
        name: form.name?.trim() || undefined,
      });
      setUsers((prev) => [created, ...prev]);
      setForm({ email: '', name: '', role: 'EMPLOYEE', branchId: null });
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h2>Usuarios</h2>

      {error && <div style={{ color: 'crimson', marginBottom: 12 }}>{error}</div>}

      <div style={{ display: 'grid', gap: 8, maxWidth: 520, marginBottom: 16 }}>
        <input
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
        />
        <input
          placeholder="Nombre"
          value={form.name ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />

        <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}>
          <option value="ADMIN">ADMIN</option>
          <option value="EMPLOYEE">EMPLOYEE</option>
          <option value="ACCOUNTANT">ACCOUNTANT</option>
          <option value="CLIENT">CLIENT</option>
        </select>

        <select
          value={form.branchId ?? ''}
          onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value ? e.target.value : null }))}
        >
          <option value="">(Global) branchId = null</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <button disabled={!canSubmit} onClick={onCreate}>
          Crear usuario
        </button>
      </div>

      <h3>Listado</h3>
      <ul>
        {users.map((u) => (
          <li key={u.id}>
            {u.email} — {u.role} — branchId: {u.branchId ?? 'null'}
          </li>
        ))}
      </ul>
    </div>
  );
}