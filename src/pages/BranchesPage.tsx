import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
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

const BranchesPage: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
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

  const fetchBranches = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get<Branch[]>('/branches');
      setBranches(res.data);
    } catch {
      setBranches([]);
      setError('Error cargando sucursales.');
    } finally {
      setLoading(false);
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
    <Paper sx={{ p: 3, mt: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h5" gutterBottom sx={{ mb: 0 }}>
            Sucursales
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administración de sucursales y acceso multi-sede
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Nueva
          </Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={fetchBranches} disabled={loading}>
            {loading ? 'Cargando...' : 'Refrescar'}
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Dirección</TableCell>
                <TableCell>Uso</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {branches.map((b) => (
                <TableRow key={b.id} hover>
                  <TableCell>{b.name}</TableCell>
                  <TableCell>{b.address ?? '-'}</TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      Planes: {b._count?.plans ?? 0} · Subs: {b._count?.subscriptions ?? 0} · Usuarios: {b._count?.users ?? 0}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" onClick={() => openDetail(b.id)}>
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEdit(b)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Eliminar">
                      <IconButton size="small" onClick={() => openDelete(b)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {branches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary">
                      No hay sucursales registradas.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}

      {/* Dialog detalle */}
      <Dialog open={detailOpen} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle>Detalle de sucursal</DialogTitle>
        <DialogContent dividers>
          {detailLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : detailError ? (
            <Alert severity="error">{detailError}</Alert>
          ) : selectedBranch ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2"><b>ID:</b> {selectedBranch.id}</Typography>
              <Typography variant="body2"><b>Nombre:</b> {selectedBranch.name}</Typography>
              <Typography variant="body2"><b>Dirección:</b> {selectedBranch.address ?? '-'}</Typography>
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sin datos.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDetail}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog create/edit */}
      <Dialog open={formOpen} onClose={closeForm} maxWidth="sm" fullWidth>
        <DialogTitle>{formMode === 'create' ? 'Nueva sucursal' : 'Editar sucursal'}</DialogTitle>
        <DialogContent dividers>
          {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
            {validateForm && <Alert severity="warning">{validateForm}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeForm} disabled={formSaving}>Cancelar</Button>
          <Button variant="contained" onClick={saveForm} disabled={formSaving || !!validateForm}>
            {formSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog delete */}
      <Dialog open={deleteOpen} onClose={closeDelete} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar sucursal</DialogTitle>
        <DialogContent dividers>
          <Alert severity="warning">
            Vas a eliminar <b>{deleteName}</b>. Esta acción no se puede deshacer.
            <br />
            Si la sucursal tiene datos asociados (planes, subs, usuarios, asistencias), el backend la va a bloquear.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDelete} disabled={deleteSaving}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} disabled={deleteSaving}>
            {deleteSaving ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={3500} onClose={closeSnack}>
        <Alert onClose={closeSnack} severity={snack.severity} sx={{ width: '100%' }}>
          {snack.msg}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default BranchesPage;
