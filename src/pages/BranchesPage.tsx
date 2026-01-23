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
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';

import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { api } from '../context/AuthContext';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  _count?: {
    plans?: number;
    subscriptions?: number;
    users?: number;
    attendances?: number;
  };
}

type BranchFormMode = 'create' | 'edit';
type Status = 'idle' | 'loading' | 'success' | 'error';

function BranchCard({ b }: { b: Branch }) {
  const plans = b._count?.plans ?? 0;
  const subs = b._count?.subscriptions ?? 0;
  const users = b._count?.users ?? 0;

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
            <Typography sx={{ fontWeight: 900 }} noWrap>
              {b.name}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }} noWrap>
              {b.address ?? 'Dirección —'}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={`Usuarios: ${users}`}
            sx={{
              borderRadius: 999,
              fontWeight: 900,
              backgroundColor: alpha('#111827', 0.06),
            }}
          />
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
          <Box sx={{ borderRadius: 2.5, px: 1.25, py: 0.9, backgroundColor: alpha('#111827', 0.06) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              Planes
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {plans}
            </Typography>
          </Box>

          <Box sx={{ borderRadius: 2.5, px: 1.25, py: 0.9, backgroundColor: alpha('#111827', 0.06) }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
              Suscripciones
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 900 }}>
              {subs}
            </Typography>
          </Box>
        </Box>
      </Stack>
    </Paper>
  );
}

const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  // detalle
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [detailError, setDetailError] = useState('');

  // form create/edit
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<BranchFormMode>('create');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [formId, setFormId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  // delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState<string>('');

  // snackbar
  const [snack, setSnack] = useState<{ open: boolean; msg: string; severity: 'success' | 'error' }>({
    open: false,
    msg: '',
    severity: 'success',
  });

  const closeSnack = () => setSnack((s) => ({ ...s, open: false }));

  const loading = status === 'loading';

  const stats = useMemo(() => {
    let plans = 0, subs = 0, users = 0;
    for (const b of branches) {
      plans += b._count?.plans ?? 0;
      subs += b._count?.subscriptions ?? 0;
      users += b._count?.users ?? 0;
    }
    return { count: branches.length, plans, subs, users };
  }, [branches]);

  const fetchBranches = async () => {
    setStatus('loading');
    setError('');
    try {
      const res = await api.get<Branch[]>('/branches');
      setBranches(res.data);
      setStatus('success');
    } catch {
      setBranches([]);
      setStatus('error');
      setError('No se pudieron cargar las sucursales.');
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError('');
    setSelectedBranch(null);

    try {
      const res = await api.get<Branch>(`/branches/${id}`);
      setSelectedBranch(res.data);
    } catch {
      setDetailError('Error cargando el detalle de la sucursal.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setSelectedBranch(null);
    setDetailError('');
  };

  const openCreate = () => {
    setFormMode('create');
    setFormId(null);
    setName('');
    setAddress('');
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (b: Branch) => {
    setFormMode('edit');
    setFormId(b.id);
    setName(b.name ?? '');
    setAddress(b.address ?? '');
    setFormError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    if (formSaving) return;
    setFormOpen(false);
  };

  const validateForm = useMemo(() => {
    const n = name.trim();
    if (!n) return 'El nombre es obligatorio.';
    if (n.length > 80) return 'El nombre no puede superar 80 caracteres.';
    if (address.trim().length > 200) return 'La dirección no puede superar 200 caracteres.';
    return '';
  }, [name, address]);

  const saveForm = async () => {
    const v = validateForm;
    if (v) {
      setFormError(v);
      return;
    }

    setFormSaving(true);
    setFormError('');
    try {
      if (formMode === 'create') {
        await api.post('/branches', { name: name.trim(), address: address.trim() || undefined });
        setSnack({ open: true, msg: 'Sucursal creada correctamente.', severity: 'success' });
      } else {
        await api.patch(`/branches/${formId}`, { name: name.trim(), address: address.trim() || undefined });
        setSnack({ open: true, msg: 'Sucursal actualizada correctamente.', severity: 'success' });
      }
      setFormOpen(false);
      await fetchBranches();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        (formMode === 'create' ? 'Error creando sucursal.' : 'Error actualizando sucursal.');
      setFormError(String(msg));
      setSnack({ open: true, msg: String(msg), severity: 'error' });
    } finally {
      setFormSaving(false);
    }
  };

  const openDelete = (b: Branch) => {
    setDeleteId(b.id);
    setDeleteName(b.name);
    setDeleteOpen(true);
  };

  const closeDelete = () => {
    if (deleteSaving) return;
    setDeleteOpen(false);
    setDeleteId(null);
    setDeleteName('');
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteSaving(true);
    try {
      await api.delete(`/branches/${deleteId}`);
      setSnack({ open: true, msg: 'Sucursal eliminada.', severity: 'success' });
      setDeleteOpen(false);
      await fetchBranches();
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'No se pudo eliminar la sucursal.';
      setSnack({ open: true, msg: String(msg), severity: 'error' });
    } finally {
      setDeleteSaving(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1250, mx: 'auto' }}>
      {/* Header estilo Payments */}
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
          <Stack spacing={0.5} sx={{ minWidth: 0 }}>
            <Typography variant="h5" sx={{ fontWeight: 900, letterSpacing: -0.4 }}>
              Sucursales
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Administración de sucursales y operación multi-sede.
            </Typography>

            <Stack direction="row" gap={1} alignItems="center" sx={{ mt: 1, flexWrap: 'wrap' }}>
              <Chip label={`Registros: ${stats.count}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip label={`Planes: ${stats.plans}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip label={`Subs: ${stats.subs}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              <Chip label={`Usuarios: ${stats.users}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
              {loading && <CircularProgress size={18} />}
            </Stack>
          </Stack>

          <Stack direction={{ xs: 'column', sm: 'row' }} gap={1.25} alignItems={{ sm: 'center' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Nueva sucursal
            </Button>

            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchBranches}
              disabled={loading}
              sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 900 }}
            >
              Actualizar
            </Button>
          </Stack>
        </Stack>

        {status === 'error' && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 3 }}>
            {error || 'Error cargando sucursales.'}
          </Alert>
        )}
      </Paper>

      {/* Superficie “tabla/cards” */}
      {/* MOBILE: Cards */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        <Stack spacing={1.5}>
          {!loading && branches.length === 0 && (
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
                No hay sucursales registradas.
              </Typography>
            </Paper>
          )}

          {branches.map((b) => (
            <Stack key={b.id} spacing={1}>
              <BranchCard b={b} />
              <Stack direction="row" gap={1} justifyContent="flex-end">
                <Button
                  size="small"
                  onClick={() => openDetail(b.id)}
                  sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                >
                  Ver
                </Button>
                <Button
                  size="small"
                  onClick={() => openEdit(b)}
                  sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                >
                  Editar
                </Button>
                <Button
                  size="small"
                  color="error"
                  onClick={() => openDelete(b)}
                  sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 2.5 }}
                >
                  Eliminar
                </Button>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* DESKTOP: Table */}
      <Paper
        variant="outlined"
        sx={{
          display: { xs: 'none', md: 'block' },
          borderRadius: 4,
          borderColor: 'rgba(0,0,0,0.08)',
          boxShadow: '0 14px 40px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        <TableContainer sx={{ maxHeight: 620, overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Dirección</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }}>Uso</TableCell>
                <TableCell sx={{ fontWeight: 900, backgroundColor: 'rgba(0,0,0,0.02)' }} align="right">
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {!loading && branches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      No hay sucursales registradas.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {branches.map((b, idx) => (
                <TableRow
                  key={b.id}
                  hover
                  sx={{
                    '& td': { borderBottomColor: 'rgba(0,0,0,0.06)' },
                    backgroundColor: idx % 2 === 0 ? 'rgba(0,0,0,0.012)' : 'transparent',
                  }}
                >
                  <TableCell sx={{ fontWeight: 900 }}>{b.name}</TableCell>
                  <TableCell>{b.address ?? '—'}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      Planes: {b._count?.plans ?? 0} · Subs: {b._count?.subscriptions ?? 0} · Usuarios: {b._count?.users ?? 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" onClick={() => openDetail(b.id)} sx={{ borderRadius: 2 }}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(b)} sx={{ borderRadius: 2 }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Eliminar">
                      <IconButton size="small" onClick={() => openDelete(b)} sx={{ borderRadius: 2 }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {loading && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ py: 4 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                      <CircularProgress />
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Dialog detalle */}
      <Dialog open={detailOpen} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Detalle de sucursal</DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : detailError ? (
            <Alert severity="error" sx={{ borderRadius: 3 }}>
              {detailError}
            </Alert>
          ) : selectedBranch ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2"><b>ID:</b> {selectedBranch.id}</Typography>
              <Typography variant="body2"><b>Nombre:</b> {selectedBranch.name}</Typography>
              <Typography variant="body2"><b>Dirección:</b> {selectedBranch.address ?? '—'}</Typography>

              <Divider sx={{ my: 1.5 }} />

              <Stack direction="row" gap={1} flexWrap="wrap">
                <Chip label={`Planes: ${selectedBranch._count?.plans ?? 0}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                <Chip label={`Subs: ${selectedBranch._count?.subscriptions ?? 0}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                <Chip label={`Usuarios: ${selectedBranch._count?.users ?? 0}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                {typeof selectedBranch._count?.attendances === 'number' && (
                  <Chip label={`Asistencias: ${selectedBranch._count.attendances}`} sx={{ fontWeight: 900, borderRadius: 999 }} />
                )}
              </Stack>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sin datos.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDetail} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog create/edit */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>{formMode === 'create' ? 'Nueva sucursal' : 'Editar sucursal'}</DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {formError && (
            <Alert severity="error" sx={{ borderRadius: 3 }}>
              {formError}
            </Alert>
          )}

          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            fullWidth
            inputProps={{ maxLength: 80 }}
          />

          <TextField
            label="Dirección"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 200 }}
          />

          {!!validateForm && (
            <Alert severity="warning" sx={{ borderRadius: 3 }}>
              {validateForm}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeForm} disabled={formSaving} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={saveForm}
            disabled={formSaving || !!validateForm}
            sx={{ textTransform: 'none', fontWeight: 900 }}
          >
            {formSaving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog delete */}
      <Dialog open={deleteOpen} onClose={closeDelete} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Eliminar sucursal</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning" sx={{ borderRadius: 3 }}>
            Vas a eliminar <b>{deleteName}</b>. Esta acción no se puede deshacer.
            <br />
            Si la sucursal tiene datos asociados (planes, subs, usuarios, asistencias), el backend la va a bloquear.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDelete} disabled={deleteSaving} sx={{ textTransform: 'none', fontWeight: 900 }}>
            Cancelar
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={confirmDelete}
            disabled={deleteSaving}
            sx={{ textTransform: 'none', fontWeight: 900 }}
          >
            {deleteSaving ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={closeSnack}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ width: '100%', borderRadius: 3 }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default BranchesPage;