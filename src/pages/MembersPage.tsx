// src/pages/MembersPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import QuickRegisterDialog from '../components/QuickRegisterDialog';
import { api } from '../context/AuthContext';

interface Client {
  id: string;
  name: string;
  email: string;
  dni: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  status?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  subscriptionStatus?: string;
  subscriptionEnd?: string | null;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

type ClientsResponse = {
  items: Client[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    q?: string;
    branchId?: string;
  };
};

const statusOptions = ['activo', 'inactivo'] as const;

function nfDateShort(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' }).format(d);
}

function SubChip({ status }: { status?: string }) {
  if (!status) return <Typography variant="body2">—</Typography>;

  const cfg =
    status === 'VIGENTE'
      ? { bg: alpha('#10b981', 0.12), fg: '#0f766e', label: 'VIGENTE' }
      : status === 'PENDIENTE_PAGO'
        ? { bg: alpha('#f59e0b', 0.14), fg: '#b45309', label: 'PENDIENTE' }
        : status === 'VENCIDA'
          ? { bg: alpha('#ef4444', 0.12), fg: '#b91c1c', label: 'VENCIDA' }
          : { bg: alpha('#111827', 0.06), fg: alpha('#111827', 0.85), label: status };

  return (
    <Chip
      size="small"
      label={cfg.label}
      sx={{
        borderRadius: 999,
        fontWeight: 900,
        backgroundColor: cfg.bg,
        color: cfg.fg,
      }}
    />
  );
}

function StatusChip({ status }: { status?: string }) {
  return (
    <Chip
      size="small"
      label={status ? status.toUpperCase() : '—'}
      sx={{
        borderRadius: 999,
        fontWeight: 900,
        backgroundColor: status === 'activo' ? alpha('#10b981', 0.12) : alpha('#111827', 0.06),
        color: status === 'activo' ? '#0f766e' : alpha('#111827', 0.85),
      }}
    />
  );
}

function ClientCard({
  client,
  onDelete,
  deleting,
  onEdit,
  onView,
}: {
  client: Client;
  onDelete: (id: string) => void;
  deleting?: boolean;
  onEdit: (client: Client) => void;
  onView: (client: Client) => void;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 4,
        p: 2.25,
        borderColor: 'rgba(0,0,0,0.08)',
        boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.88))',
      }}
    >
      <Stack spacing={1.25}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, letterSpacing: -0.2 }} noWrap>
              {client.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {client.email || '—'}
            </Typography>
          </Box>

          <SubChip status={client.subscriptionStatus} />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Box sx={{ borderRadius: 2.5, px: 1.25, py: 0.8, backgroundColor: alpha('#111827', 0.06) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              DNI
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {client.dni}
            </Typography>
          </Box>
          <Box sx={{ borderRadius: 2.5, px: 1.25, py: 0.8, backgroundColor: alpha('#111827', 0.06) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              Teléfono
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {client.phone || '—'}
            </Typography>
          </Box>
        </Box>

        <Divider />

        <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <StatusChip status={client.status} />

          <Stack direction="row" gap={1}>
            <Button
              size="small"
              onClick={() => onView(client)}
              sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
            >
              Ver
            </Button>

            <Button
              color="primary"
              size="small"
              onClick={() => onEdit(client)}
              sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
            >
              Editar
            </Button>

            <Button
              color="error"
              size="small"
              onClick={() => onDelete(client.id)}
              disabled={deleting}
              sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
            >
              Eliminar
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Paper>
  );
}

function ClientRow({
  client,
  onDelete,
  deleting,
  onEdit,
  onView,
}: {
  client: Client;
  onDelete: (id: string) => void;
  deleting?: boolean;
  onEdit: (client: Client) => void;
  onView: (client: Client) => void;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        borderRadius: 3.5,
        p: 1.5,
        borderColor: 'rgba(0,0,0,0.08)',
        boxShadow: '0 10px 28px rgba(0,0,0,0.05)',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(255,255,255,0.9))',
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" gap={1.5}>
        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 900 }} noWrap>
            {client.name}
          </Typography>

          <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
            DNI: {client.dni} • {client.phone || '—'} • {client.email || '—'}
          </Typography>

          <Stack direction="row" gap={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
            <SubChip status={client.subscriptionStatus} />
            <StatusChip status={client.status} />
            {client.birthDate && (
              <Chip
                size="small"
                label={`Nac: ${nfDateShort(client.birthDate)}`}
                sx={{ borderRadius: 999, fontWeight: 900 }}
              />
            )}
          </Stack>
        </Box>

        <Stack direction="row" gap={1} flexShrink={0}>
          <Button
            size="small"
            onClick={() => onView(client)}
            sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
          >
            Ver
          </Button>
          <Button
            size="small"
            onClick={() => onEdit(client)}
            sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
          >
            Editar
          </Button>
          <Button
            size="small"
            color="error"
            onClick={() => onDelete(client.id)}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
          >
            Eliminar
          </Button>
        </Stack>
      </Stack>
    </Paper>
  );
}

function clampLimit(n: number) {
  if (!Number.isFinite(n)) return 20;
  return Math.min(100, Math.max(1, Math.floor(n)));
}

const MembersPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // xs
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg')); // sm..md
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg')); // lg+

  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string>('');

  const [clients, setClients] = useState<Client[]>([]);
  const [quickOpen, setQuickOpen] = useState(false);

  // dialog crear/editar
  const [openCreate, setOpenCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  // dialog detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<Client | null>(null);

  // confirm delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // filters (UI)
  const [q, setQ] = useState('');
  const [subFilter, setSubFilter] = useState<string>(''); // '', 'VIGENTE', 'PENDIENTE_PAGO', 'VENCIDA'
  const [statusFilter, setStatusFilter] = useState<string>(''); // '', 'activo', 'inactivo'

  // server pagination
  const [page, setPage] = useState(1); // 1-based
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // debounce para q
  const [qDebounced, setQDebounced] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const [form, setForm] = useState({
    name: '',
    email: '',
    dni: '',
    phone: '',
    birthDate: '',
    address: '',
    status: '',
    notes: '',
  });

  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const loading = status === 'loading';

  const loadClients = async (opts?: { resetPage?: boolean }) => {
    const nextPage = opts?.resetPage ? 1 : page;

    setStatus('loading');
    setError('');

    try {
      const res = await api.get<ClientsResponse>('/clients', {
        params: {
          page: nextPage,
          limit: clampLimit(limit),
          q: qDebounced?.trim() ? qDebounced.trim() : undefined,
        },
        headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache', Expires: '0' },
      });

      setClients(res.data.items || []);
      setTotal(res.data.meta?.total ?? 0);
      setTotalPages(res.data.meta?.totalPages ?? 1);

      if (opts?.resetPage) setPage(1);

      setStatus('success');
    } catch {
      setStatus('error');
      setError('Error cargando clientes.');
      setClients([]);
      setTotal(0);
      setTotalPages(1);
    }
  };

  // carga inicial + cuando cambia qDebounced, page o limit
  useEffect(() => {
    loadClients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, qDebounced]);

  const handleOpenEdit = (client: Client) => {
    setEditingClient(client);
    setForm({
      name: client.name,
      email: client.email,
      dni: client.dni,
      phone: client.phone ?? '',
      birthDate: client.birthDate ? String(client.birthDate).slice(0, 10) : '',
      address: client.address ?? '',
      status: client.status ?? '',
      notes: client.notes ?? '',
    });
    setOpenCreate(true);
  };

  const handleOpenCreate = () => {
    setEditingClient(null);
    setForm({ name: '', email: '', dni: '', phone: '', birthDate: '', address: '', status: '', notes: '' });
    setOpenCreate(true);
  };

  const handleView = (client: Client) => {
    setDetailClient(client);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailClient(null);
  };

  // Crear/Editar cliente
  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        birthDate: form.birthDate ? new Date(form.birthDate).toISOString() : undefined,
      };

      if (editingClient) {
        await api.patch<Client>(`/clients/${editingClient.id}`, payload);
      } else {
        await api.post<Client>('/clients', payload);
      }

      setOpenCreate(false);
      setForm({ name: '', email: '', dni: '', phone: '', birthDate: '', address: '', status: '', notes: '' });
      setEditingClient(null);

      // ✅ refrescar desde server (no intentar mutar lista local, porque ahora es paginado)
      await loadClients({ resetPage: !editingClient });
    } catch (err: any) {
      if (err?.response?.data?.message?.includes('dni')) setError('Ya existe un cliente con ese DNI.');
      else setError('Error al guardar el cliente.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/clients/${deleteId}`);
      setDeleteId(null);

      // refrescar y, si era el último de la página, retroceder una página si corresponde
      const isLastOnPage = clients.length === 1 && page > 1;
      if (isLastOnPage) setPage((p) => Math.max(1, p - 1));
      else await loadClients();
    } catch {
      setError('Error al eliminar cliente.');
    } finally {
      setDeleting(false);
    }
  };

  const selectedDelete = useMemo(() => clients.find((c) => c.id === deleteId) ?? null, [clients, deleteId]);

  /**
   * ⚠️ Los filtros Sub/Estado ahora filtran SOLO lo que vino en esta página.
   * Si querés filtro global real, se implementa en backend y se envía como params.
   */
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();

    return clients.filter((c) => {
      // Q server-side (qDebounced) ya filtra, esto es un “extra” local por si querés mantenerlo igual
      const matchesQ =
        !needle ||
        c.name?.toLowerCase().includes(needle) ||
        c.email?.toLowerCase().includes(needle) ||
        c.dni?.toLowerCase().includes(needle) ||
        c.phone?.toLowerCase().includes(needle);

      const matchesSub = !subFilter || c.subscriptionStatus === subFilter;
      const matchesStatus = !statusFilter || c.status === statusFilter;

      return matchesQ && matchesSub && matchesStatus;
    });
  }, [clients, q, subFilter, statusFilter]);

  // stats (sobre la página actual para ser consistentes con paginado)
  const totalOnPage = filtered.length;
  const vigenteOnPage = filtered.filter((c) => c.subscriptionStatus === 'VIGENTE').length;
  const pendOnPage = filtered.filter((c) => c.subscriptionStatus === 'PENDIENTE_PAGO').length;

  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1250, mx: 'auto' }}>
      {/* Header estilo Caja */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: { xs: 2, md: 2.5 },
          mb: 3,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
          background:
            'radial-gradient(1200px 200px at 10% 0%, rgba(25,118,210,0.14) 0%, rgba(255,255,255,0) 60%), linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ md: 'center' }} justifyContent="space-between" gap={2}>
          <Stack spacing={0.5}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
              Clientes
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Gestión de miembros, estado y suscripción actual.
            </Typography>

            <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip label={`Total: ${total}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip
                label={`En página: ${totalOnPage}`}
                sx={{ fontWeight: 900, borderRadius: 999, backgroundColor: alpha('#111827', 0.06) }}
              />
              <Chip
                label={`Vigentes: ${vigenteOnPage}`}
                sx={{ fontWeight: 900, borderRadius: 999, backgroundColor: alpha('#10b981', 0.12), color: '#0f766e' }}
              />
              <Chip
                label={`Pendientes: ${pendOnPage}`}
                sx={{ fontWeight: 900, borderRadius: 999, backgroundColor: alpha('#f59e0b', 0.14), color: '#b45309' }}
              />
              {loading && <CircularProgress size={18} />}
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Página {page} de {totalPages}
            </Typography>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}>
            <Button
              variant="contained"
              onClick={handleOpenCreate}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Crear cliente
            </Button>

            <Button
              variant="outlined"
              onClick={() => setQuickOpen(true)}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Alta rápida
            </Button>

            <Button
              onClick={() => loadClients()}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Actualizar
            </Button>

            <Stack direction="row" gap={1}>
              <Button
                variant="outlined"
                onClick={goPrev}
                disabled={loading || page <= 1}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
              >
                ◀
              </Button>
              <Button
                variant="outlined"
                onClick={goNext}
                disabled={loading || page >= totalPages}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
              >
                ▶
              </Button>
            </Stack>
          </Stack>
        </Stack>

        {status === 'error' && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {/* Filtros */}
      <Paper
        variant="outlined"
        sx={{
          borderRadius: 4,
          p: 2.25,
          mb: 2.5,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} gap={1.25} alignItems={{ md: 'center' }}>
          <TextField
            label="Buscar"
            placeholder="Nombre, email, DNI o teléfono…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1); // ✅ al buscar, reset page
            }}
            size="small"
            fullWidth
          />

          <TextField
            select
            label="Suscripción"
            value={subFilter}
            onChange={(e) => setSubFilter(String(e.target.value))}
            size="small"
            sx={{ minWidth: { xs: '100%', md: 220 } }}
          >
            <MenuItem value="">
              <em>Todas</em>
            </MenuItem>
            <MenuItem value="VIGENTE">VIGENTE</MenuItem>
            <MenuItem value="PENDIENTE_PAGO">PENDIENTE</MenuItem>
            <MenuItem value="VENCIDA">VENCIDA</MenuItem>
          </TextField>

          <TextField
            select
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(String(e.target.value))}
            size="small"
            sx={{ minWidth: { xs: '100%', md: 180 } }}
          >
            <MenuItem value="">
              <em>Todos</em>
            </MenuItem>
            {statusOptions.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Filas"
            value={limit}
            onChange={(e) => {
              setLimit(clampLimit(Number(e.target.value)));
              setPage(1);
            }}
            size="small"
            sx={{ minWidth: { xs: '100%', md: 140 } }}
          >
            {[10, 20, 50, 100].map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </TextField>

          <Chip
            label={`${filtered.length} resultado${filtered.length === 1 ? '' : 's'} (página)`}
            sx={{ borderRadius: 999, fontWeight: 900, alignSelf: { xs: 'flex-start', md: 'center' } }}
          />
        </Stack>
      </Paper>

      {/* EMPTY STATE */}
      {!loading && filtered.length === 0 && (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 4,
            p: 2.25,
            borderColor: 'rgba(0,0,0,0.08)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No hay clientes para mostrar con los filtros actuales.
          </Typography>
        </Paper>
      )}

      {/* MOBILE: Cards */}
      {isMobile && filtered.length > 0 && (
        <Stack spacing={1.5}>
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              onDelete={(id) => setDeleteId(id)}
              deleting={deleting}
              onEdit={handleOpenEdit}
              onView={handleView}
            />
          ))}
        </Stack>
      )}

      {/* TABLET: Lista compacta */}
      {isTablet && !isMobile && filtered.length > 0 && (
        <Stack spacing={1}>
          {filtered.map((c) => (
            <ClientRow
              key={c.id}
              client={c}
              onDelete={(id) => setDeleteId(id)}
              deleting={deleting}
              onEdit={handleOpenEdit}
              onView={handleView}
            />
          ))}
        </Stack>
      )}

      {/* DESKTOP: Tabla completa (lg+) */}
      {isDesktop && filtered.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 4,
            borderColor: 'rgba(0,0,0,0.08)',
            boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}
        >
          <TableContainer sx={{ maxHeight: 620 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Nombre</TableCell>
                  <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>DNI</TableCell>
                  <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Teléfono</TableCell>
                  {/* <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Nacimiento</TableCell> */}
                  {/* <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Estado</TableCell> */}
                  <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Suscripción</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    Acciones
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filtered.map((client, idx) => (
                  <TableRow
                    key={client.id}
                    hover
                    sx={{
                      '& td': { borderBottomColor: 'rgba(0,0,0,0.06)' },
                      backgroundColor: idx % 2 === 0 ? 'rgba(0,0,0,0.012)' : 'transparent',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 900 }}>{client.name}</TableCell>
                    <TableCell>{client.email || '—'}</TableCell>
                    <TableCell sx={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}>
                      {client.dni}
                    </TableCell>
                    <TableCell>{client.phone || '—'}</TableCell>
                    {/* <TableCell>{client.birthDate ? nfDateShort(client.birthDate) : '—'}</TableCell> */}
                    {/* <TableCell>
                      <StatusChip status={client.status} />
                    </TableCell> */}
                    <TableCell>
                      <SubChip status={client.subscriptionStatus} />
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        onClick={() => handleView(client)}
                        sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                      >
                        Ver
                      </Button>

                      <Button
                        color="primary"
                        size="small"
                        onClick={() => handleOpenEdit(client)}
                        sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                      >
                        Editar
                      </Button>

                      <Button
                        color="error"
                        size="small"
                        onClick={() => setDeleteId(client.id)}
                        disabled={deleting}
                        sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Paginación MUI (desktop) */}
          <TablePagination
            component="div"
            count={total}
            page={page - 1} // MUI es 0-based
            onPageChange={(_, nextPageZero) => setPage(nextPageZero + 1)}
            rowsPerPage={limit}
            onRowsPerPageChange={(e) => {
              setLimit(clampLimit(Number(e.target.value)));
              setPage(1);
            }}
            rowsPerPageOptions={[10, 20, 50, 100]}
            labelRowsPerPage="Filas"
            labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          />
        </Paper>
      )}

      {/* Dialog DETALLE */}
      <Dialog open={detailOpen} onClose={closeDetail} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>Detalle de cliente</DialogTitle>
        <DialogContent dividers>
          {!detailClient ? (
            <Typography variant="body2" color="text.secondary">
              Sin datos.
            </Typography>
          ) : (
            <Stack spacing={1.25}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 900 }} noWrap>
                    {detailClient.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap>
                    {detailClient.email || '—'}
                  </Typography>
                </Box>

                <SubChip status={detailClient.subscriptionStatus} />
              </Stack>

              <Divider />

              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.25 }}>
                <Paper variant="outlined" sx={{ borderRadius: 3, p: 1.25, borderColor: 'rgba(0,0,0,0.08)' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    DNI
                  </Typography>
                  <Typography sx={{ fontWeight: 900 }}>{detailClient.dni}</Typography>
                </Paper>

                <Paper variant="outlined" sx={{ borderRadius: 3, p: 1.25, borderColor: 'rgba(0,0,0,0.08)' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    Teléfono
                  </Typography>
                  <Typography sx={{ fontWeight: 900 }}>{detailClient.phone || '—'}</Typography>
                </Paper>

                <Paper variant="outlined" sx={{ borderRadius: 3, p: 1.25, borderColor: 'rgba(0,0,0,0.08)' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    Nacimiento
                  </Typography>
                  <Typography sx={{ fontWeight: 900 }}>
                    {detailClient.birthDate ? nfDateShort(detailClient.birthDate) : '—'}
                  </Typography>
                </Paper>

                <Paper variant="outlined" sx={{ borderRadius: 3, p: 1.25, borderColor: 'rgba(0,0,0,0.08)' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                    Estado
                  </Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <StatusChip status={detailClient.status} />
                  </Box>
                </Paper>
              </Box>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  p: 1.25,
                  borderColor: 'rgba(0,0,0,0.08)',
                  backgroundColor: alpha('#111827', 0.02),
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  Dirección
                </Typography>
                <Typography sx={{ fontWeight: 900 }}>{detailClient.address || '—'}</Typography>
              </Paper>

              <Paper
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  p: 1.25,
                  borderColor: 'rgba(0,0,0,0.08)',
                  backgroundColor: alpha('#111827', 0.02),
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 800 }}>
                  Notas
                </Typography>
                <Typography sx={{ fontWeight: 900, whiteSpace: 'pre-wrap' }}>{detailClient.notes || '—'}</Typography>
              </Paper>

              <Typography variant="caption" color="text.secondary">
                Creado: {detailClient.createdAt ? nfDateShort(detailClient.createdAt) : '—'} • Actualizado:{' '}
                {detailClient.updatedAt ? nfDateShort(detailClient.updatedAt) : '—'}
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDetail} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cerrar
          </Button>
          {detailClient && (
            <Button
              onClick={() => {
                closeDetail();
                handleOpenEdit(detailClient);
              }}
              variant="contained"
              sx={{ textTransform: 'none', fontWeight: 900 }}
            >
              Editar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Dialog crear/editar cliente */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 900 }}>{editingClient ? 'Editar cliente' : 'Crear nuevo cliente'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Nombre completo"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="DNI"
              value={form.dni}
              onChange={(e) => setForm((f) => ({ ...f, dni: e.target.value }))}
              required
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Fecha de nacimiento"
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Dirección"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Estado"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              fullWidth
              select
              required
            >
              {statusOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Notas"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              fullWidth
              multiline
              minRows={2}
            />
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCreate(false)} disabled={saving} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={saving} variant="contained" sx={{ textTransform: 'none', fontWeight: 900 }}>
            {saving ? 'Guardando…' : editingClient ? 'Guardar cambios' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={Boolean(deleteId)} onClose={() => setDeleteId(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Eliminar cliente</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Esta acción no se puede deshacer.
          </Typography>
          <Paper
            variant="outlined"
            sx={{
              mt: 2,
              p: 2,
              borderRadius: 3,
              borderColor: 'rgba(0,0,0,0.08)',
              background: alpha('#ef4444', 0.04),
            }}
          >
            <Typography sx={{ fontWeight: 900 }}>{selectedDelete?.name ?? '—'}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              DNI: {selectedDelete?.dni ?? '—'}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteId(null)} disabled={deleting} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 900 }}
          >
            {deleting ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <QuickRegisterDialog
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onSuccess={async () => {
          setQuickOpen(false);
          // al dar de alta, volvemos a página 1 para ver el nuevo arriba (según order)
          setPage(1);
          await loadClients({ resetPage: true });
        }}
      />
    </Box>
  );
};

export default MembersPage;
